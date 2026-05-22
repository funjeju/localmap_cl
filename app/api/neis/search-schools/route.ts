import { NextRequest, NextResponse } from 'next/server';

interface NEISSchool {
  schoolName: string;
  schoolAddress: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
}

// Geocoding helper using Kakao Maps API (or similar)
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    // Using Kakao Maps REST API for geocoding
    const kakaoKey = process.env.KAKAO_REST_API_KEY;
    if (!kakaoKey) {
      console.warn('KAKAO_REST_API_KEY not set, returning null coordinates');
      return null;
    }

    const response = await fetch('https://dapi.kakao.com/v2/local/search/address.json', {
      method: 'GET',
      headers: {
        'Authorization': `KakaoAK ${kakaoKey}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.warn('Kakao geocoding failed:', response.status);
      return null;
    }

    const data = await response.json();
    if (data.documents && data.documents.length > 0) {
      const coords = data.documents[0];
      return {
        lat: parseFloat(coords.y),
        lng: parseFloat(coords.x),
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ schools: [] });
    }

    // NEIS API endpoint for school information
    const neisApiKey = process.env.NEIS_API_KEY;
    if (!neisApiKey) {
      return NextResponse.json(
        { error: 'NEIS API key not configured' },
        { status: 500 }
      );
    }

    // Search using NEIS API
    // API: https://open.neis.go.kr/hub/schoolInfo
    const neisUrl = new URL('https://open.neis.go.kr/hub/schoolInfo');
    neisUrl.searchParams.append('KEY', neisApiKey);
    neisUrl.searchParams.append('Type', 'json');
    neisUrl.searchParams.append('SCHUL_NM', query);
    neisUrl.searchParams.append('pIndex', '1');
    neisUrl.searchParams.append('pSize', '20');

    try {
      const neisResponse = await fetch(neisUrl.toString(), {
        signal: AbortSignal.timeout(10000),
      });

      if (!neisResponse.ok) {
        console.warn('NEIS API error:', neisResponse.status);
        return NextResponse.json({ schools: [] });
      }

      const neisData = await neisResponse.json();

      // Parse NEIS response
      const schools: NEISSchool[] = [];

      // NEIS API returns data in format: { schoolInfo: [{ head: [...] }, { row: [...] }] }
      if (neisData.schoolInfo && neisData.schoolInfo.length > 1 && neisData.schoolInfo[1].row) {
        const schoolList = Array.isArray(neisData.schoolInfo[1].row)
          ? neisData.schoolInfo[1].row
          : [neisData.schoolInfo[1].row];

        for (const school of schoolList) {
          // Get coordinates from address (prioritize road address)
          const address = school.ORG_RDADDR || school.ORG_ADDRESS || '';
          const coords = await geocodeAddress(address);

          schools.push({
            schoolName: school.SCHUL_NM || '',
            schoolAddress: address,
            latitude: coords?.lat,
            longitude: coords?.lng,
            phone: school.ORG_TELNO || '',
          });
        }
      }

      return NextResponse.json({ schools });
    } catch (apiError) {
      console.error('NEIS fetch error:', apiError);
      return NextResponse.json({ schools: [] });
    }
  } catch (error) {
    console.error('School search error:', error);
    return NextResponse.json(
      { error: 'Failed to search schools', details: (error as Error).message },
      { status: 500 }
    );
  }
}
