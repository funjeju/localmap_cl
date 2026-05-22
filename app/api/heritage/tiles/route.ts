import { NextRequest, NextResponse } from 'next/server';

// 문화재청 WMS 서버 설정
const HERITAGE_WMS_URL = 'https://gis-heritage.go.kr/arcgis/rest/services/NHSS/MapServer';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const x = searchParams.get('x');
    const y = searchParams.get('y');
    const z = searchParams.get('z');

    if (!x || !y || !z) {
      return NextResponse.json(
        { error: 'Missing tile coordinates' },
        { status: 400 }
      );
    }

    // XYZ 타일을 WGS84 좌표로 변환
    const n = Math.pow(2, parseInt(z));
    const lng = (parseInt(x) / n) * 360 - 180;
    const lat = Math.atan(Math.sinh(Math.PI * (1 - (2 * parseInt(y)) / n))) * 180 / Math.PI;

    // 약간의 패딩을 추가하여 경계 조정
    const padding = 360 / n / 4;
    const bbox = `${lng - padding},${lat - padding},${lng + padding},${lat + padding}`;

    // ArcGIS 타일 서버로부터 이미지 요청
    const params = new URLSearchParams({
      bbox,
      size: '256,256',
      dpi: '96',
      format: 'png32',
      transparent: 'true',
      f: 'image',
    });

    const url = `${HERITAGE_WMS_URL}/export?${params.toString()}`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn(`Heritage tile fetch failed: ${response.status}`);
      // 빈 이미지 반환
      return new Response(Buffer.alloc(0), {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=604800', // 1주일 캐시
        },
      });
    }

    const buffer = await response.arrayBuffer();

    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=604800', // 1주일 캐시
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Heritage tile error:', error);
    // 에러 시에도 빈 타일 반환 (지도가 깨지지 않도록)
    return new Response(Buffer.alloc(0), {
      headers: {
        'Content-Type': 'image/png',
      },
    });
  }
}
