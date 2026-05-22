# Tech Stack — 기술 선택 근거와 대안

## 1. 전체 구성도

```
┌─────────────────────────────────────────────────────┐
│  Browser (Desktop + Tablet 우선, Mobile 호환)        │
└──────────────┬──────────────────────────────────────┘
               │ HTTPS
┌──────────────▼──────────────────────────────────────┐
│  Vercel Edge Network                                │
│  - Next.js 14 (App Router, RSC)                     │
│  - shadcn/ui + Tailwind                             │
│  - MapLibre GL JS                                   │
│  - next-intl (ko / ja / en)                         │
│  - API Routes (Edge + Node Runtime)                 │
│  - Vercel Blob (Protomaps .pmtiles 호스팅)          │
└──┬────────────────────────┬─────────────────────────┘
   │                        │
   │ Firebase SDK           │ Server-side fetch
   │                        │
┌──▼──────────────────┐  ┌──▼──────────────────────────┐
│ Firebase (BaaS)     │  │ External APIs               │
│ - Auth              │  │ - Kakao / Naver 지오코딩     │
│ - Firestore         │  │ - 공공데이터포털             │
│ - Storage           │  │ - VWorld (브이월드)          │
│ - Cloud Functions   │  │ - 문화재청                   │
│ - App Check         │  │ - Anthropic Claude          │
│ - Hosting (불사용)  │  │ - Stripe / 토스페이먼츠      │
└─────────────────────┘  └─────────────────────────────┘
```

## 2. 레이어별 선택 근거

### 2.1 프론트엔드: Next.js 14 App Router

**왜**

- Vercel의 1급 시민. 배포 1클릭, ISR/SSR/RSC를 자유롭게 섞을 수 있음.
- 학교별 페이지를 동적 라우트로 처리 (`/[tenantId]/map`).
- 학부모 QR 진입 페이지는 공개 RSC로 SEO/속도 최적화.

**대안 검토**

- *Vite + React Router*: 단순 SPA지만 학부모 공개 페이지 SEO가 약함. 탈락.
- *Remix*: Next.js만큼 Vercel 친화적이지 않음. 탈락.

### 2.2 UI: shadcn/ui + Tailwind

**왜**

- 컴포넌트 코드를 직접 소유 → 다국어/다도메인에 맞게 자유 커스텀.
- 디자인 토큰을 `tailwind.config.ts`에서 일관 관리. Tenant 브랜딩 주입 용이.
- Radix 기반이라 접근성(a11y) 우수. 학교 도입 시 정부 접근성 기준 통과에 유리.

**금지 사항**

- Material UI, Ant Design 등 무거운 디자인 시스템 도입 금지.
- shadcn 컴포넌트는 항상 `components/ui/` 폴더에 격리.

### 2.3 지도: MapLibre GL JS + Protomaps

**왜**

- **MapLibre**: 오픈소스, 라이선스 제약 없음. 일본/해외 배포 시 카카오/네이버 SDK는 사용 불가.
- **Protomaps**: `.pmtiles` 단일 파일로 벡터 타일 자체 호스팅. Vercel Blob에 올려두면 무료로 운영 가능.
- 백지도 스타일링이 자유로움 → 도로/하천/경계만 남기고 상업 시설 제거.

**대안 검토**

- *Mapbox GL JS*: 유료. 학교당 비용 누적 시 마진 압박. 탈락.
- *Kakao Maps SDK*: 상업적 SaaS 재배포 라이선스 불명. 일본 진출 시 사용 불가. 탈락.
- *Google Maps*: 비싸고 백지도 스타일 자유도 낮음. 탈락.
- *OpenStreetMap 타일 직접 사용*: 무료지만 자체 호스팅 권장. Protomaps가 더 깔끔.

**셋업 노트**

- 한국 .pmtiles: Protomaps에서 한국 영역만 추출해 Vercel Blob에 업로드.
- 일본 .pmtiles: 별도 파일로 분리. `tenant.locale`에 따라 다른 .pmtiles 로드.

### 2.4 인증: Firebase Auth

**왜**

- 이메일/소셜/익명 인증 한 SDK로 처리.
- Custom Claims로 역할(teacher/student/parent/admin) 관리.
- 향후 학교 SSO (NEIS 연동 등) 시 OIDC 커스텀 프로바이더 추가 가능.

**역할 부여 방식**

- Cloud Function이 사용자 생성 시 `tenantId` + `role` Custom Claim 자동 부여.
- 학생 계정은 교사가 일괄 생성 (이메일 X, 임시 코드 로그인).

### 2.5 DB: Firestore + GeoHash

**왜**

- 실시간 리스너로 학생들의 동시 핀 입력이 즉시 반영.
- 서브컬렉션 구조가 핀 변경 이력 저장에 적합.
- Cloud Functions와 1급 통합.

**지리공간 쿼리 한계와 대응**

- Firestore는 PostGIS 같은 진짜 공간 인덱스 없음.
- `geofire-common` 라이브러리로 GeoHash 기반 반경 검색 구현.
- 학교 반경 500m 내 핀 조회는 충분. 향후 행정동 폴리곤 검색이 필요해지면:
  - 옵션 A: Algolia GeoSearch 추가 (월 $50~)
  - 옵션 B: Typesense 자체 호스팅
  - 옵션 C: Supabase + PostGIS로 핀 데이터만 마이그레이션

**필수 인덱스**

- `pins`: `(tenantId, layerId, status)` 복합 인덱스.
- `pins`: `(tenantId, geohash_prefix)` 공간 검색용.

### 2.6 파일 저장: Firebase Storage

**왜**

- 학생 사진/음성 인터뷰 업로드.
- Firebase Auth와 통합된 Security Rules로 권한 제어.
- 이미지 리사이즈는 Cloud Functions의 Sharp 사용.

**버킷 구조**

```
/tenants/{tenantId}/pins/{pinId}/images/{uuid}.webp
/tenants/{tenantId}/pins/{pinId}/audio/{uuid}.mp3
/tenants/{tenantId}/exports/{projectId}/book-{year}.pdf
```

### 2.7 백엔드 로직: Vercel API Routes + Cloud Functions

**역할 분담**

- **Vercel API Routes**: 짧고 빠른 요청 (지오코딩, AI 호출, PDF 미리보기).
- **Cloud Functions**: 트리거 기반 + 장시간 작업 (시드 파이프라인, PDF 생성, 이미지 리사이즈, 이력 기록).

**왜 둘 다 쓰는가**

- Vercel Edge는 cold start 빠르지만 실행 시간 제한.
- Firestore 쓰기 트리거는 Cloud Functions만 가능.

### 2.8 AI: Anthropic Claude API

**왜**

- 한국어 + 일본어 + 영어 품질 우수.
- 초등 눈높이 설명글 생성에 적합 (system prompt로 톤 강제).
- Vision 모델로 사진 → 카테고리 자동 분류 가능.

**호출 정책**

- 핀 1개당 설명글 생성 1회 → 결과 캐싱.
- 재생성은 교사 명시 요청 시에만.
- 비용 가드: tenant당 월 호출 한도 설정.

### 2.9 국제화: next-intl

**왜**

- App Router 친화적. Server Component에서 자연스럽게 동작.
- 메시지 카탈로그 + ICU MessageFormat 지원.

**구조**

```
/messages/
  ├── ko.json
  ├── ja.json
  └── en.json
```

UI 텍스트는 `messages/*.json`, 데이터 모델은 `{ ko, ja, en }` 객체로 이중 처리. 상세는 `docs/business/i18n.md`.

### 2.10 결제: Stripe + 토스페이먼츠 + S2B

**듀얼 채널**

- **국내 개별 교사 구독**: 토스페이먼츠 (정기결제).
- **국내 학교 단위**: S2B 학교장터 입점 (대량 행정 결제).
- **국제 (일본/관광)**: Stripe.

상세는 `docs/business/pricing.md`.

## 3. 폴더 구조 컨벤션

```
/
├── app/                          Next.js App Router
│   ├── [locale]/                 i18n 동적 세그먼트
│   │   ├── (public)/             공개 페이지 (학부모 포털 등)
│   │   ├── (auth)/               로그인/회원가입
│   │   └── (tenant)/[tenantId]/  Tenant 콘텍스트 진입
│   │       ├── map/
│   │       ├── pins/
│   │       ├── export/
│   │       └── settings/
│   └── api/
│       ├── tenant/
│       ├── seed/
│       ├── pin/
│       ├── ai/
│       ├── export/
│       └── billing/
├── components/
│   ├── ui/                       shadcn 컴포넌트
│   ├── map/                      MapLibre 래퍼 + 레이어
│   ├── pin/                      핀 편집/리스트
│   └── layout/                   사이드바, 헤더
├── lib/
│   ├── firebase/                 Firebase 초기화 + 헬퍼
│   ├── geo/                      GeoHash, 반경 계산
│   ├── seedAdapters/             Vertical별 시드 어댑터
│   ├── ai/                       Claude 호출 래퍼
│   ├── export/                   PDF 생성
│   └── i18n/                     번역 헬퍼
├── messages/                     번역 카탈로그
├── functions/                    Cloud Functions (별도 배포)
└── docs/                         모든 설계 문서
```

## 4. 환경 변수

`.env.local` 필수 키 목록 (실제 값은 Vercel/CI에 별도 주입):

```
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
FIREBASE_ADMIN_PRIVATE_KEY=
FIREBASE_ADMIN_CLIENT_EMAIL=

# 외부 API
KAKAO_REST_API_KEY=
VWORLD_API_KEY=
DATA_GO_KR_API_KEY=
ANTHROPIC_API_KEY=

# 지도
PROTOMAPS_TILES_KO_URL=
PROTOMAPS_TILES_JA_URL=

# 결제
STRIPE_SECRET_KEY=
TOSS_SECRET_KEY=

# Auth
NEXTAUTH_SECRET=
```

## 5. 향후 마이그레이션 옵션

Firestore의 한계가 명확해지는 시점에 대비한 출구 전략.

|트리거 조건           |마이그레이션 대상                                         |영향 범위                           |
|-----------------|--------------------------------------------------|--------------------------------|
|핀 10만개+ 폴리곤 검색 필요|Supabase + PostGIS                                |`lib/firebase/pins.ts` 인터페이스만 교체|
|실시간 사용자 1만+ 동시 접속|Firestore 그대로 (확장 자동)                             |변경 없음                           |
|일본 데이터 주권 요구     |Firebase asia-northeast1 리전 + 일본 Firestore 인스턴스 분리|Tenant 라우팅 로직 추가                |
|AI 비용 급증         |자체 임베딩 캐시 + 로컬 모델 폴백                              |`lib/ai/` 내부 변경만                |

핵심 원칙: **모든 Firestore 접근은 `lib/firebase/` 헬퍼 경유**. 직접 호출 금지. 마이그레이션 시 헬퍼만 갈아끼우면 됨.