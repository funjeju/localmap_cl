import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { calculateGeoHash } from '@/lib/geo/hash';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: Request) {
  try {
    const { name, address, radius, locale, userId } = await req.json();

    if (!name || !address) {
      return NextResponse.json({ error: 'Name and address are required' }, { status: 400 });
    }

    // 1. Geocode the address using Kakao Local API
    const kakaoApiKey = process.env.KAKAO_REST_API_KEY;
    if (!kakaoApiKey) {
      throw new Error('KAKAO_REST_API_KEY is not configured');
    }

    const geocodeRes = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
      {
        headers: {
          Authorization: `KakaoAK ${kakaoApiKey}`,
        },
      }
    );

    const geoData = await geocodeRes.json();
    if (!geoData.documents || geoData.documents.length === 0) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    const location = geoData.documents[0];
    const lat = parseFloat(location.y);
    const lng = parseFloat(location.x);
    const geohash = calculateGeoHash(lat, lng);

    // 2. Prepare the Tenant document
    const tenantRef = adminDb.collection('tenants').doc();
    const tenantId = tenantRef.id;

    const tenantData = {
      id: tenantId,
      type: 'elementary_school', // Assuming elementary_school as default for MVP
      name: { ko: name },
      shortName: { ko: name },
      address: address,
      addressLocale: 'KR',
      center: { lat, lng, geohash },
      radius: radius || 500,
      locale: locale || 'ko-KR',
      supportedLocales: ['ko-KR', 'en-US', 'ja-JP'],
      plan: 'trial',
      features: ['multi_year_archive'],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: userId || 'system',
    };

    // 3. Prepare System Layers
    const layers = [
      { key: 'public_facility', name: '공공기관', icon: '🏛️', color: '#3b82f6', order: 1 },
      { key: 'landmark', name: '명소', icon: '🌳', color: '#10b981', order: 2 },
      { key: 'commerce', name: '상점·시설', icon: '🏪', color: '#f59e0b', order: 3 },
      { key: 'safety', name: '안전 시설', icon: '🛡️', color: '#ef4444', order: 4 },
      { key: 'heritage', name: '문화재', icon: '📜', color: '#8b5cf6', order: 5 },
      { key: 'nature', name: '자연환경', icon: '🌿', color: '#84cc16', order: 6 },
    ];

    const batch = adminDb.batch();
    batch.set(tenantRef, tenantData);

    const layerMap: Record<string, string> = {};

    layers.forEach((layer) => {
      const layerRef = tenantRef.collection('layers').doc();
      layerMap[layer.key] = layerRef.id;
      batch.set(layerRef, {
        id: layerRef.id,
        tenantId: tenantId,
        name: { ko: layer.name },
        icon: layer.icon,
        color: layer.color,
        order: layer.order,
        curriculumTags: [],
        isVisible: true,
        visibleToRoles: ['teacher', 'student', 'parent'],
        source: 'system',
        systemKey: layer.key,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    // 4. Generate Mock Auto-Seed Pins (Phase 2 Preview)
    const mockSeedData = [
      { key: 'public_facility', name: '우리동네 행정복지센터', desc: '주민 등록 등본을 발급하고 민원을 처리하는 곳입니다.' },
      { key: 'public_facility', name: '안전 우체국', desc: '편지와 소포를 보내고 예금 업무를 하는 곳입니다.' },
      { key: 'public_facility', name: '119 안전센터', desc: '화재나 응급 상황 발생 시 출동하는 곳입니다.' },
      { key: 'landmark', name: '솔내음 근린공원', desc: '주민들이 산책하고 배드민턴을 칠 수 있는 넓은 공원입니다.' },
      { key: 'landmark', name: '푸른마을 도서관', desc: '다양한 책을 읽고 빌릴 수 있는 지식의 창고입니다.' },
      { key: 'commerce', name: '싱싱 마트', desc: '우리 동네 주민들이 신선한 식재료를 사는 큰 마트입니다.' },
      { key: 'commerce', name: '전통 골목시장', desc: '오래된 정취를 느낄 수 있는 지역 상인들의 터전입니다.' },
      { key: 'safety', name: '어린이보호구역 (스쿨존)', desc: '학교 앞 30km 이하로 서행해야 하는 안전 구역입니다.' },
      { key: 'safety', name: '안전지킴이집', desc: '위험한 일이 있을 때 어린이가 대피할 수 있는 가게입니다.' },
      { key: 'heritage', name: '보호수 (500년 된 느티나무)', desc: '마을을 지켜온 아주 오래된 큰 나무입니다.' },
      { key: 'heritage', name: '옛 서당 터', desc: '과거에 조상들이 공부하던 옛터의 흔적입니다.' },
      { key: 'nature', name: '도토리 뒷산 등산로', desc: '가을이면 도토리가 많이 떨어져 청설모를 볼 수 있는 산길입니다.' },
      { key: 'nature', name: '맑은샘 하천 생태길', desc: '오리벌레와 작은 물고기들을 관찰할 수 있는 생태 하천입니다.' },
    ];

    mockSeedData.forEach((seed) => {
      if (!layerMap[seed.key]) return;
      
      const pinRef = tenantRef.collection('pins').doc();
      // Random offset approx +/- 300~500m
      const offsetLat = (Math.random() - 0.5) * 0.008;
      const offsetLng = (Math.random() - 0.5) * 0.008;
      const pinLat = lat + offsetLat;
      const pinLng = lng + offsetLng;
      
      batch.set(pinRef, {
        id: pinRef.id,
        layerId: layerMap[seed.key],
        name: { ko: seed.name },
        location: {
          lat: pinLat,
          lng: pinLng,
          geohash: calculateGeoHash(pinLat, pinLng)
        },
        description: { ko: seed.desc },
        descriptionSource: 'ai_generated', // Marking as AI / System generated
        source: {
          type: 'public_api', // Mocking public api seed
          apiName: '행정안전부 공공데이터 시뮬레이션',
          fetchedAt: FieldValue.serverTimestamp()
        },
        externalIds: {},
        status: 'active',
        version: 0,
        createdBy: 'system',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    // Commit the batch
    await batch.commit();

    return NextResponse.json({ success: true, tenantId });

  } catch (error: any) {
    console.error('Tenant Creation Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
