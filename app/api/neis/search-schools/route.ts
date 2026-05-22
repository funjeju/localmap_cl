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

    const url = new URL('https://dapi.kakao.com/v2/local/search/address.json');
    url.searchParams.append('query', address);

    const response = await fetch(url.toString(), {
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

    console.log('[NEIS] Search query:', query);

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ schools: [] });
    }

    // NEIS API endpoint for school information
    const neisApiKey = process.env.NEIS_API_KEY;
    console.log('[NEIS] API Key configured:', !!neisApiKey);

    if (!neisApiKey) {
      const msg = 'NEIS_API_KEY not configured in environment';
      console.error('[NEIS]', msg);
      return NextResponse.json(
        { error: msg, schools: [] },
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

    console.log('[NEIS] Fetching from NEIS...');

    try {
      const neisResponse = await fetch(neisUrl.toString(), {
        signal: AbortSignal.timeout(10000),
      });

      console.log('[NEIS] Response status:', neisResponse.status);

      if (!neisResponse.ok) {
        console.warn('[NEIS] API error:', neisResponse.status);
        return NextResponse.json({ schools: [] });
      }

      const neisData = await neisResponse.json();
      console.log('[NEIS] Response received, schoolInfo exists:', !!neisData.schoolInfo);

      // Parse NEIS response
      const schools: NEISSchool[] = [];

      // NEIS API returns data in format: { schoolInfo: [{ head: [...] }, { row: [...] }] }
      if (neisData.schoolInfo && neisData.schoolInfo.length > 1 && neisData.schoolInfo[1].row) {
        const schoolList = Array.isArray(neisData.schoolInfo[1].row)
          ? neisData.schoolInfo[1].row
          : [neisData.schoolInfo[1].row];

        console.log('[NEIS] Found', schoolList.length, 'schools');

        for (const school of schoolList) {
          // Get coordinates from address (prioritize road address)
          const address = school.ORG_RDADDR || school.ORG_ADDRESS || '';
          const coords = await geocodeAddress(address);

          schools.push({
            schoolName: school.SCHUL_NM || '',
            schoolAddress: address || `${school.LCTN_SC_NM || ''} ${school.ADDR || ''}`,
            latitude: coords?.lat || 37.5665, // Default to Seoul if geocoding fails
            longitude: coords?.lng || 126.9780,
            phone: school.ORG_TELNO || '',
          });
        }
      }

      console.log('[NEIS] Returning', schools.length, 'schools');
      return NextResponse.json({ schools });
    } catch (apiError) {
      const errorMsg = apiError instanceof Error ? apiError.message : String(apiError);
      console.error('[NEIS] Fetch error:', errorMsg);
      return NextResponse.json(
        { error: `NEIS fetch failed: ${errorMsg}`, schools: [] },
        { status: 500 }
      );
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[NEIS] General error:', errorMsg);
    return NextResponse.json(
      { error: `Failed to search schools: ${errorMsg}`, schools: [] },
      { status: 500 }
    );
  }
}
