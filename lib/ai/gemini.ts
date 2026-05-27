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

export type SketchStyle =
  | 'illustration'
  | 'watercolor'
  | 'sketch'
  | 'cartoon'
  | 'simplified'
  | 'minimal';

export interface GenerateSketchMapInput {
  imageBase64: string;
  mimeType?: string;
  style?: SketchStyle;
  extraPrompt?: string;
  /** When true, AI adds Korean place-name labels over major landmarks. */
  addLabels?: boolean;
}

const STYLE_PROMPTS: Record<SketchStyle, string> = {
  illustration:
    'Redraw this map as a charming hand-drawn illustration in a warm, friendly travel-journal style. Use soft pastel colors, clear road outlines, and simplified building shapes. Keep the same geographic layout and major landmarks recognizable. Make it look like a tourist map illustration.',
  watercolor:
    'Redraw this map in a soft watercolor painting style. Use gentle washes of color, slightly blurred edges, and an artistic, dreamy feel while preserving the road network and major landmarks.',
  sketch:
    'Redraw this map as a black-and-white pencil sketch with crisp ink lines, subtle hatching for shading, and a hand-drawn cartographic feel. Preserve roads and key landmarks.',
  cartoon:
    'Redraw this map as a fun, colorful cartoon-style illustration with bold outlines, bright flat colors, and slightly exaggerated landmark icons. Keep the layout and roads recognizable.',
  simplified:
    "Redraw this as a clean simplified guide map (안내도/약도) — like the kind printed at park entrances or in tourist brochures. Flat solid colors, clear thick road lines, simplified building footprints as rounded rectangles, generous white space. Roads in light gray or white, buildings in soft beige/pale colors, parks and fields in muted green, water in soft blue. No textures, no shadows, no satellite detail — pure schematic clarity. Keep the overall layout faithful to the original.",
  minimal:
    'Redraw this as an extremely minimalist schematic map. Only the essential structure: a few key roads as thin clean lines, the most important blocks as simple geometric shapes (rounded rectangles or circles), and large areas of empty white space. Use a very limited palette — maximum 3 colors, prefer black/gray lines on white with one accent color. No textures, no shading, no detailed outlines. Think of a wayfinding sign or an IKEA-style icon map. Keep only the bare minimum needed to understand the place.',
};

export async function generateSketchMap({
  imageBase64,
  mimeType = 'image/png',
  style = 'illustration',
  extraPrompt,
  addLabels = false,
}: GenerateSketchMapInput): Promise<{ imageBase64: string; mimeType: string }> {
  const ai = getClient();

  const styleText = STYLE_PROMPTS[style] ?? STYLE_PROMPTS.illustration;

  const labelInstruction = addLabels
    ? '\n\nIMPORTANT — Add Korean place-name labels (한글 지명/시설명) over the major landmarks you can identify from the satellite imagery. Examples of typical labels: "운동장" (sports field/playground), "솔밭공원" (pine-grove park), "공원" (park), "주차장" (parking lot), "체육관" (gymnasium), "본관" (main building), "정문" (front gate), "후문" (back gate), "도서관" (library), "급식실" (cafeteria), "텃밭" (garden), "놀이터" (playground), "산책로" (walking path), "광장" (plaza). Infer reasonable Korean names from visual cues — a large open green field next to a school is likely "운동장", a cluster of trees is likely "솔밭" or "숲", a building cluster is likely "본관" or "교사동", etc. Place each label CLEARLY OVER the corresponding area in legible Korean hangul. Use a readable typeface with a subtle white outline or soft halo so the text stands out from the artwork. Keep labels concise (1-4 hangul characters where possible). Do NOT label every single thing — focus on 4-8 most prominent areas. Labels MUST be in Korean (한글), not romanized.'
    : '';

  const promptText = extraPrompt
    ? `${styleText}${labelInstruction}\n\nAdditional direction: ${extraPrompt}`
    : `${styleText}${labelInstruction}`;

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
