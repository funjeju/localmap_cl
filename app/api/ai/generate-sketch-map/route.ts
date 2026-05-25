import { NextResponse } from 'next/server';
import { generateSketchMap } from '@/lib/ai/gemini';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { imageBase64, mimeType, style, extraPrompt } = await req.json();

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json(
        { error: 'imageBase64 is required' },
        { status: 400 }
      );
    }

    const result = await generateSketchMap({
      imageBase64,
      mimeType,
      style,
      extraPrompt,
    });

    return NextResponse.json({
      imageDataUrl: `data:${result.mimeType};base64,${result.imageBase64}`,
    });
  } catch (err: any) {
    console.error('generate-sketch-map error', err);
    return NextResponse.json(
      { error: err?.message || '약도 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}
