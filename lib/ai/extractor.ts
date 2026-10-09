// ============================================================
// CityPulse AI — AI Extraction: Gemini Provider + Fallback
// ============================================================
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiExtractionSchema } from './schema';
import { AiExtraction, IncidentType } from '../types';

const SYSTEM_PROMPT = `You extract structured fields from a citizen-submitted city incident report. Do not decide whether the report is true, verified, or authoritative. Do not invent coordinates, dates, causes, casualties, or facts. Use null for missing values. Distinguish what the user stated from any uncertain inference. Return only valid JSON matching the supplied schema. Use controlled incident types: waterlogging, road_damage, temporary_obstruction, traffic_disruption, broken_streetlight, accident_report, cleanliness_issue, other. Suggest severity 1-5 only from the content, and add a short uncertainty note if evidence is insufficient. The final map location will be confirmed by the user.

Return ONLY a JSON object with this exact structure:
{
  "incidentType": "<one of the controlled types>",
  "summary": "<concise summary of the report>",
  "locationText": "<location mentioned in the text, or null>",
  "observedAt": "<ISO timestamp if the user mentions when, or null>",
  "severitySuggested": <1-5 or null>,
  "uncertainties": ["<list of uncertain inferences>"],
  "needsUserConfirmation": ["<list of items needing confirmation>"]
}`;

/**
 * Extract structured incident data using Google Gemini API.
 */
export async function extractWithGemini(text: string): Promise<AiExtraction> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: `${SYSTEM_PROMPT}\n\nUser report:\n"${text}"` }],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 500,
    },
  });

  const responseText = result.response.text();
  
  // Extract JSON from potential markdown code blocks
  let jsonStr = responseText;
  const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr);
  const validated = AiExtractionSchema.parse(parsed);
  return validated as AiExtraction;
}

/**
 * Deterministic fallback extractor when AI is unavailable.
 * Uses keyword matching to classify the report.
 */
export function extractWithFallback(text: string): AiExtraction {
  const lower = text.toLowerCase();

  let incidentType: IncidentType = 'other';
  let severity: number | null = null;

  const typeMap: { keywords: string[]; type: IncidentType; defaultSeverity: number }[] = [
    { keywords: ['waterlog', 'flood', 'water', 'rain', 'puddle', 'submerge'], type: 'waterlogging', defaultSeverity: 3 },
    { keywords: ['pothole', 'road damage', 'crack', 'broken road', 'crumbl'], type: 'road_damage', defaultSeverity: 3 },
    { keywords: ['block', 'obstruct', 'barricade', 'construction', 'encroach', 'vendor'], type: 'temporary_obstruction', defaultSeverity: 2 },
    { keywords: ['traffic', 'congestion', 'jam', 'signal', 'slow'], type: 'traffic_disruption', defaultSeverity: 3 },
    { keywords: ['streetlight', 'lamp', 'dark', 'light not working', 'no light'], type: 'broken_streetlight', defaultSeverity: 2 },
    { keywords: ['accident', 'collision', 'crash', 'hit'], type: 'accident_report', defaultSeverity: 4 },
    { keywords: ['garbage', 'trash', 'waste', 'dirty', 'smell', 'overflow'], type: 'cleanliness_issue', defaultSeverity: 2 },
  ];

  for (const entry of typeMap) {
    if (entry.keywords.some(k => lower.includes(k))) {
      incidentType = entry.type;
      severity = entry.defaultSeverity;
      break;
    }
  }

  // Extract location hints
  const locationPatterns = [
    /near\s+([\w\s]+(?:road|street|lane|chowk|bridge|junction|wada|baug|park|temple|stop|gate))/i,
    /on\s+([\w\s]+(?:road|street|lane|chowk|bridge|junction))/i,
    /at\s+([\w\s]+(?:road|street|lane|chowk|bridge|junction|stop|gate))/i,
  ];

  let locationText: string | null = null;
  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match) {
      locationText = match[1].trim();
      break;
    }
  }

  const summary = text.length > 150
    ? text.substring(0, 147) + '...'
    : text;

  return {
    incidentType,
    summary: `${incidentType.replace(/_/g, ' ')} reported: ${summary}`,
    locationText,
    observedAt: null,
    severitySuggested: severity,
    uncertainties: [
      'Extracted using keyword-based fallback (AI unavailable)',
      'Severity is a default estimate based on incident type',
    ],
    needsUserConfirmation: ['location', 'severity'],
  };
}

/**
 * Main extraction function — tries AI first, falls back to deterministic.
 */
export async function extractIncidentData(text: string): Promise<{
  extraction: AiExtraction;
  method: 'ai' | 'fallback';
}> {
  try {
    const extraction = await extractWithGemini(text);
    return { extraction, method: 'ai' };
  } catch (error) {
    console.warn('AI extraction failed, using deterministic fallback:', error);
    const extraction = extractWithFallback(text);
    return { extraction, method: 'fallback' };
  }
}
