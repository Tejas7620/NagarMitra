// POST /api/reset — Resets in-memory store to initial demo state
import { NextResponse } from 'next/server';
import { resetStore } from '@/lib/repositories/store';

export async function POST() {
  try {
    resetStore();
    return NextResponse.json({
      success: true,
      message: 'Demo store reset to seed state',
      dataMode: 'demo_reset',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Reset store failed:', error);
    return NextResponse.json(
      { error: 'Failed to reset store', dataMode: 'error' },
      { status: 500 }
    );
  }
}
