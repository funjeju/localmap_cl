import { GoogleGenAI } from '@google/genai';

const MODEL = 'gemini-3.1-flash-image-preview';

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (client) return client;
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY (or GOOGLE_AI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY) is not configured'
    );
  }
  client = new GoogleGenAI({ apiKey });
  return client;
}

export interface GenerateSketchMapInput {
  imageBase64: string;
  mimeType?: string;
  style?: 'illustration' | 'watercolor' | 'sketch' | 'cartoon';
  extraPrompt?: string;
}

const STYLE_PROMPTS: Record<NonNullable<GenerateSketchMapInput['style']>, string> = {
  illustration:
    'Redraw this map as a charming hand-drawn illustration in a warm, friendly travel-journal style. Use soft pastel colors, clear road outlines, and simplified building shapes. Keep the same geographic layout and major landmarks recognizable. Make it look like a tourist map illustration.',
  watercolor:
    'Redraw this map in a soft watercolor painting style. Use gentle washes of color, slightly blurred edges, and an artistic, dreamy feel while preserving the road network and major landmarks.',
  sketch:
    'Redraw this map as a black-and-white pencil sketch with crisp ink lines, subtle hatching for shading, and a hand-drawn cartographic feel. Preserve roads and key landmarks.',
  cartoon:
    'Redraw this map as a fun, colorful cartoon-style illustration with bold outlines, bright flat colors, and slightly exaggerated landmark icons. Keep the layout and roads recognizable.',
};

export async function generateSketchMap({
  imageBase64,
  mimeType = 'image/png',
  style = 'illustration',
  extraPrompt,
}: GenerateSketchMapInput): Promise<{ imageBase64: string; mimeType: string }> {
  const ai = getClient();

  const styleText = STYLE_PROMPTS[style];
  const promptText = extraPrompt ? `${styleText}\n\nAdditional direction: ${extraPrompt}` : styleText;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      { text: promptText },
      { inlineData: { mimeType, data: imageBase64 } },
    ],
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      return {
        imageBase64: part.inlineData.data,
        mimeType: part.inlineData.mimeType || 'image/png',
      };
    }
  }

  throw new Error('Gemini did not return an image');
}
