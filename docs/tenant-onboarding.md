# Feature: Tenant Onboarding & Auto-Seed

> 학교 주소 입력 한 번으로 백지도와 카테고리별 핀이 자동 생성되는 핵심 기능. 이 흐름의 매끄러움이 곧 제품의 첫인상이다.

## 1. 사용자 시나리오

**교사 김OO** — “학동초등학교 사회 담당. 학교 주소 입력하고 60초 안에 우리 학교 주변 지도와 주요 시설이 자동으로 표시되는 화면을 본다.”

## 2. 전체 흐름

```
[1] 교사가 회원가입 → Tenant 생성 페이지 진입
       │
       ▼
[2] 폼 입력: 학교명, 주소, 반경(기본 500m), 다국어
       │
       ▼
[3] POST /api/tenant/create
       │
       ├─→ 지오코딩 (주소 → 좌표) ← Kakao / Geocoder
       │
       ├─→ Firestore: tenants/{id} 생성
       │
       ├─→ 시스템 레이어 6종 자동 생성
       │
       └─→ seedJobs 큐에 5개 작업 등록
              │
              ▼ (Cloud Functions 비동기 실행)
       [공공시설] [문화재] [안전] [OSM POI] [AI 설명]
              │
              ▼
       Firestore에 핀 도큐먼트 누적
              │
              ▼
[4] 클라이언트는 /api/tenant/:id/seedStatus 폴링
[5] 백지도가 먼저 렌더, 핀은 도착 순서대로 fade-in
[6] 시드 완료 시 토스트: "X개 장소가 자동으로 추가되었어요"
```

**전체 소요 시간 목표: 60초 이내 (핀 80% 이상 도착)**

## 3. 화면 설계

### 3.1 가입 → Tenant 생성 페이지

```
┌──────────────────────────────────────────────────┐
│  우리 학교 등록하기                                │
│                                                  │
│  학교 이름 ─────────────────────────────────       │
│  [ 학동초등학교                          ]         │
│                                                  │
│  주소 ─────────────────────────────────────       │
│  [ 서울시 강남구 학동로 ...           [검색] ]      │
│  ✓ 도로명 주소가 확인되었어요                       │
│                                                  │
│  반경 ─────────────────────────────────────       │
│  [●─────] 500m  (300m ~ 1500m)                  │
│                                                  │
│  주 사용 언어 ────────────────────────────         │
│  ( ) 한국어  ( ) 日本語  ( ) English              │
│                                                  │
│  [   다음: 자동으로 우리 동네 만들기   ]            │
└──────────────────────────────────────────────────┘
```

shadcn 컴포넌트: `Form`, `Input`, `Slider`, `RadioGroup`, `Button`.

### 3.2 시드 진행 화면

```
┌──────────────────────────────────────────────────┐
│           우리 동네를 그리고 있어요...             │
│                                                  │
│   ┌──────────────────────────────────┐           │
│   │                                  │           │
│   │   (백지도가 먼저 나타남)          │           │
│   │   ●  ←  핀이 하나씩 fade-in       │           │
│   │      ●                           │           │
│   │   ●        ●                     │           │
│   └──────────────────────────────────┘           │
│                                                  │
│  ✓ 학교 주변 도로와 경계를 그렸어요                 │
│  ✓ 공공기관 12개를 찾았어요                        │
│  ⏳ 문화재를 찾는 중...                            │
│  ⏳ 안전 시설을 찾는 중...                         │
│                                                  │
│  [  잠시만 기다려주세요. 곧 끝나요!  ]              │
└──────────────────────────────────────────────────┘
```

shadcn: `Progress`, `Card`, 커스텀 체크리스트 컴포넌트.

### 3.3 시드 완료 첫 화면 (Map Studio)

핀이 모두 도착하면 정식 Map Studio로 라우팅. `docs/features/map-and-layers.md` 참조.

## 4. 핵심 구현 포인트

### 4.1 지오코딩 어댑터 분기

```typescript
// lib/geocoding/index.ts
export async function geocode(
  address: string, 
  locale: 'KR' | 'JP' | 'US'
): Promise<GeoPoint> {
  switch (locale) {
    case 'KR': return geocodeKakao(address);
    case 'JP': return geocodeGsi(address);     // 일본 국토지리원
    case 'US': return geocodeMapbox(address);  // 폴백
  }
}
```

상세 어댑터는 `docs/integrations/external-apis.md`.

### 4.2 시스템 레이어 자동 생성

`tenant.type`에 따라 다른 기본 레이어 세트.

```typescript
const LAYER_TEMPLATES: Record<TenantType, LayerTemplate[]> = {
  elementary_school: [
    { systemKey: 'public_facility', name: {ko:'공공기관',ja:'公共機関'}, ... },
    { systemKey: 'landmark', name: {ko:'명소',ja:'名所'}, ... },
    { systemKey: 'commerce', name: {ko:'상점·시설',ja:'お店・施設'}, ... },
    { systemKey: 'safety', name: {ko:'안전 시설',ja:'安全施設'}, ... },
    { systemKey: 'heritage', name: {ko:'문화재',ja:'文化財'}, ... },
    { systemKey: 'nature', name: {ko:'자연환경',ja:'自然環境'}, ... },
  ],
  tourism: [
    { systemKey: 'must_visit', name: {ko:'필수 방문',ja:'必見'}, ... },
    { systemKey: 'food', name: {ko:'맛집',ja:'グルメ'}, ... },
    { systemKey: 'photo_spot', name: {ko:'포토 스팟',ja:'撮影スポット'}, ... },
    { systemKey: 'story', name: {ko:'이야기',ja:'物語'}, ... },
  ],
  church: [
    { systemKey: 'member_household', name: {ko:'성도 가정'}, ... },
    { systemKey: 'small_group', name: {ko:'소그룹'}, ... },
    { systemKey: 'mission_field', name: {ko:'전도지역'}, ... },
  ],
  // ...
};
```

### 4.3 시드 작업 큐

```typescript
// 시드 작업은 의존성을 가질 수 있음
const SEED_PLAN: Record<TenantType, SeedStep[]> = {
  elementary_school: [
    { adapter: 'korea_public_facility', priority: 1 },
    { adapter: 'korea_cultural_heritage', priority: 1 },
    { adapter: 'korea_safety_zones', priority: 1 },
    { adapter: 'osm_pois_fallback', priority: 2 },
    { adapter: 'ai_describe_all', priority: 3, dependsOn: [1,2] },
  ],
  // ...
};
```

Cloud Function: `onCreate(seedJobs/{id})` 트리거 → priority 1부터 순차 실행, 같은 priority는 병렬.

### 4.4 핀 도착 실시간 표시

클라이언트는 Firestore `onSnapshot`으로 `tenants/{id}/pins` 구독.

```typescript
// components/map/PinStream.tsx
useEffect(() => {
  const unsub = onSnapshot(
    query(
      collection(db, 'tenants', tenantId, 'pins'),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
      limit(500)
    ),
    (snap) => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added') animatePinIn(change.doc);
      });
    }
  );
  return unsub;
}, [tenantId]);
```

### 4.5 시드 실패 회복

- 일부 API 실패는 부분 성공으로 처리. `seedJobs.status: 'partial'`.
- 사용자에게는 “공공기관 시드 실패했습니다. 다시 시도하기” 버튼 노출.
- 24시간 후 자동 재시도 (Cloud Scheduler).

## 5. 권한 및 보안

- Tenant 생성은 인증된 사용자 누구나 가능 (트라이얼).
- 단, 같은 주소로 이미 Tenant가 있으면 “기존 학교에 가입 신청” UI로 전환.
- 학교 인증 (NEIS 연동 등)은 Enterprise 플랜 기능. 초기 MVP에서는 생략.

## 6. 분석 이벤트

다음 시점에 Analytics 이벤트 발사:

- `tenant.create.started`
- `tenant.create.geocoded`
- `tenant.create.completed`
- `seed.completed` (per adapter, 시간 측정)
- `onboarding.first_pin_view` (시드 첫 핀 표시 시각)

## 7. 엣지 케이스

|케이스               |처리                        |
|------------------|--------------------------|
|주소가 유효하지 않음       |지오코딩 실패 → 사용자에게 도로명 주소 안내 |
|같은 주소 Tenant 이미 존재|“기존 학교에 가입” 플로우로 분기       |
|공공 API 일시 장애      |시드 부분 실패 → 백지도 + 수동 추가 안내 |
|일본 주소 + 한국 API 호출 |어댑터 매칭 실패 → 적합한 어댑터로 자동 폴백|
|학교가 아닌 일반 주소 입력   |경고: “학교 주소가 맞나요?” 확인 모달   |
|반경 1500m 초과 요청    |거부. 성능 보호 (핀 수 폭발 방지)     |

## 8. 향후 개선 아이디어

- **2차 온보딩**: 학교 등록 후 첫 1주일 동안 “오늘의 가이드” 형식 워크스루.
- **음성 입력**: “여기는 학동초등학교야”로 학생 등록.
- **사진 기반 등록**: 학교 정문 사진 → AI가 학교명 자동 인식.