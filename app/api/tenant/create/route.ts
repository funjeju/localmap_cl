import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { calculateGeoHash } from '@/lib/geo/hash';
import { createErrorResponse, AppError } from '@/lib/errors';
import { seedRegistry } from '@/lib/seed/registry';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: Request) {
  try {
    const { name, address, latitude, longitude, radius, locale, userId } = await req.json();

    if (!name || !address) {
      throw new AppError(
        'validation/invalid-input',
        'Name and address are required',
        '학교 이름과 주소를 모두 입력해주세요.',
        400
      );
    }

    let lat: number;
    let lng: number;

    // 1. Use provided coordinates or geocode the address using Kakao Local API
    if (latitude && longitude) {
      lat = parseFloat(latitude);
      lng = parseFloat(longitude);
    } else {
      const kakaoApiKey = process.env.KAKAO_REST_API_KEY;
      if (!kakaoApiKey) {
        throw new AppError(
          'server/error',
          'KAKAO_REST_API_KEY is not configured',
          '서버 설정 오류가 발생했습니다. 관리자에게 문의해주세요.',
          500
        );
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
        throw new AppError(
          'geocoding/failed',
          `Address not found: ${address}`,
          '입력한 주소를 찾을 수 없습니다. 도로명 주소로 다시 입력해주세요.',
          400
        );
      }

      const location = geoData.documents[0];
      lat = parseFloat(location.y);
      lng = parseFloat(location.x);
    }

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

    // 4. Run Auto-Seed Pipeline
    const seedResults = await seedRegistry.seedTenant('elementary_school', { lat, lng }, radius || 500);

    seedResults.forEach((result) => {
      result.pins.forEach((seedPin) => {
        const pinRef = tenantRef.collection('pins').doc();
        const layerId = layerMap[seedPin.layerId] || layerMap['public_facility'];

        batch.set(pinRef, {
          id: pinRef.id,
          layerId: layerId,
          name: seedPin.name,
          location: seedPin.location,
          description: seedPin.description || { ko: '공공데이터 자동 추가' },
          descriptionSource: 'seed_data',
          source: {
            ...seedPin.source,
            adapter: result.adapter,
          },
          externalIds: {},
          status: 'active',
          version: 0,
          createdBy: 'system',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
    });

    // 5. Add user as teacher if userId provided (dual-write for Security Rules)
    if (userId) {
      // users/{uid}/tenantMemberships/{tenantId} — for client queries
      const userMemberRef = adminDb.collection('users').doc(userId).collection('tenantMemberships').doc(tenantId);
      batch.set(userMemberRef, {
        tenantId,
        role: 'teacher',
        joinedAt: FieldValue.serverTimestamp(),
        status: 'active',
      });

      // tenants/{tenantId}/members/{uid} — for Security Rules
      const tenantMemberRef = tenantRef.collection('members').doc(userId);
      batch.set(tenantMemberRef, {
        userId,
        role: 'teacher',
        joinedAt: FieldValue.serverTimestamp(),
        status: 'active',
      });
    }

    // Commit the batch
    await batch.commit();

    return NextResponse.json({ success: true, tenantId });

  } catch (error: any) {
    console.error('Tenant Creation Error:', error);
    const errorResponse = createErrorResponse(
      error instanceof AppError
        ? error
        : new AppError('tenant/creation-failed', error?.message || 'Unknown error', '학교 등록에 실패했습니다. 다시 시도해주세요.', 500)
    );
    return NextResponse.json(
      { error: errorResponse.error, message: errorResponse.message },
      { status: errorResponse.statusCode }
    );
  }
}
