import { NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function POST(req: Request) {
  try {
    const { pinName, location, category } = await req.json();

    if (!pinName) {
      return NextResponse.json(
        { message: '핀 이름이 필요합니다.' },
        { status: 400 }
      );
    }

    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `당신은 초등학생을 위한 탐방 프로그램 설명을 작성하는 교육 전문가입니다.

다음 정보를 바탕으로 초등학생 수준의 재미있고 교육적인 설명을 한글과 영어로 각각 100자 이내로 작성해주세요.

핀 이름: ${pinName}
카테고리: ${category}
위치: 위도 ${location.lat.toFixed(4)}, 경도 ${location.lng.toFixed(4)}

출력 형식 (JSON):
{
  "descriptionKo": "한글 설명",
  "descriptionEn": "English description"
}

매우 짧고 재미있게 작성하세요.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse Claude response as JSON');
    }

    const result = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      descriptionKo: result.descriptionKo || '',
      descriptionEn: result.descriptionEn || '',
    });
  } catch (error: any) {
    console.error('AI description generation error:', error);
    return NextResponse.json(
      {
        message: error?.message || 'AI 설명 생성에 실패했습니다.',
      },
      { status: 500 }
    );
  }
}
