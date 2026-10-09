// ============================================================
// POST /api/media/upload — Secure Photo & Media Upload Backend
// Enforces MIME type whitelisting, 5MB file size limits,
// and cryptographically safe unique object naming.
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FILE_MISSING',
            message: 'No file provided in form data under "file" field',
          },
        },
        { status: 400 }
      );
    }

    // Validate MIME type
    const mimeType = file.type.toLowerCase();
    const extension = ALLOWED_MIME_TYPES[mimeType];

    if (!extension) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_MIME_TYPE',
            message: `Unsupported file type "${file.type}". Allowed types: JPEG, PNG, WebP, GIF`,
          },
        },
        { status: 415 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File exceeds maximum allowed size of 5 MB (received ${(file.size / (1024 * 1024)).toFixed(2)} MB)`,
          },
        },
        { status: 413 }
      );
    }

    // Generate safe unique filename
    const safeFilename = `${uuidv4()}.${extension}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, safeFilename);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${safeFilename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: safeFilename,
      mimeType,
      sizeBytes: file.size,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Media upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: 'An internal error occurred during file upload',
        },
      },
      { status: 500 }
    );
  }
}
