# 개발 가이드 — LocalMap Project

> **모든 개발은 CORE.md를 먼저 읽고 시작하세요.**

## 1. 프로젝트 구조

```
/
├── CORE.md                          ← 프로젝트 정체성 (필독)
├── app/                              Next.js App Router
│   ├── [locale]/                     i18n 동적 세그먼트 (ko, ja, en)
│   │   ├── (public)/                 공개 페이지
│   │   ├── (auth)/                   로그인/회원가입
│   │   └── (tenant)/[tenantId]/      Tenant 콘텍스트
│   └── api/
│       ├── tenant/
│       ├── seed/
│       ├── pin/
│       ├── ai/
│       └── export/
├── components/
│   ├── ui/                           shadcn 컴포넌트
│   ├── map/                          MapLibre 래퍼
│   ├── pin/                          핀 편집/리스트
│   └── layout/                       사이드바, 헤더
├── lib/
│   ├── firebase/                     Firebase 초기화 + 헬퍼
│   ├── geo/                          GeoHash, 반경 계산
│   ├── seedAdapters/                 Vertical별 시드 어댑터
│   ├── ai/                           Claude API 호출
│   ├── export/                       PDF 생성
│   ├── types.ts                      TypeScript 타입 정의
│   └── i18n/                         번역 헬퍼
├── i18n/
│   └── config.ts                     next-intl 설정
├── messages/
│   ├── ko.json                       한국어 메시지
│   ├── ja.json                       일본어 메시지
│   └── en.json                       영어 메시지
├── functions/                        Cloud Functions (별도 배포)
├── docs/                             설계 문서들
├── public/                           정적 자산
├── .env.local                        환경 변수
├── package.json
└── tailwind.config.ts
```

## 2. 핵심 개발 원칙

### 2.1 Tenant 추상 우선

```typescript
// ❌ 금지
const schoolName = tenant.name;

// ✅ 권장
const organizationName = tenant.name;  // 학교도, 교회도, 관광지도 처리 가능
```

### 2.2 i18n 우선

모든 사용자 노출 텍스트는 다국어 객체 또는 번역 키:

```typescript
// ❌ 금지
const label = "학교 이름";

// ✅ 권장 (메시지 파일)
const label = t('onboarding.schoolName');

// ✅ 또는 데이터 모델
const tenant: Tenant = {
  name: { ko: "학동초등학교", ja: "学堂小学校", en: "Hakdo Elementary School" },
  // ...
};
```

### 2.3 공간 데이터는 GeoHash 동반

```typescript
// ❌ 금지
const pin = { location: { lat, lng } };

// ✅ 권장
const pin = {
  location: {
    lat,
    lng,
    geohash: geohashFromCoords(lat, lng),  // lib/geo에서 import
  },
};
```

### 2.4 변경은 이력으로

핀의 모든 변경은 자동으로 `pins/{id}/history` 저장:

```typescript
// Cloud Function 또는 API Route에서
await recordPinHistory(pinId, changeType, changedFields);
```

### 2.5 학생 입력은 검증 큐

```typescript
// 학생이 추가한 핀은 자동으로 pending_review
const newPin = {
  status: createdBy === 'student' ? 'pending_review' : 'active',
  // ...
};
```

### 2.6 AI 출력은 출처 명시

```typescript
const pin = {
  description: { ko: "..." },
  descriptionSource: 'ai_generated',  // 필수
  // ...
};
```

## 3. 개발 시작 체크리스트

새 기능 구현 전:

1. ✅ CORE.md를 **다시** 읽는다
2. ✅ 해당 기능의 `docs/features/*.md`를 읽는다
3. ✅ `lib/types.ts`의 타입을 확인한다
4. ✅ `docs/data-model.md`와 `docs/api-design.md`를 교차 확인한다
5. ✅ 이 코드가 일본 학교/관광/교회에도 동작하는지 자문한다
6. ✅ 모든 텍스트가 번역 키를 사용하는지 확인한다

## 4. 로컬 개발

### 4.1 설치 및 실행

```bash
npm install
npm run dev
```

브라우저: http://localhost:3000

### 4.2 환경 변수

`.env.local`에 Firebase, API 키 필요. 파일 참조.

### 4.3 Firebase Emulator (선택)

```bash
firebase emulators:start
```

## 5. 문서 작업 흐름

새 기능 추가 시:

1. `docs/features/feature-name.md` 작성 (명세)
2. `docs/data-model.md` 갱신 (스키마)
3. `docs/api-design.md` 갱신 (API)
4. `CORE.md` 인덱스 갱신
5. 코드 작성

## 6. 커밋 규칙

- **feat**: 새 기능 (`feat: add pin CRUD API`)
- **fix**: 버그 수정 (`fix: geohash calculation in seed`)
- **refactor**: 구조 개선 (`refactor: extract map component`)
- **docs**: 문서만 (`docs: update data-model.md`)

## 7. 자주 하는 실수

| 실수 | 올바른 방법 |
|-----|----------|
| `tenant.school` 하드코딩 | 항상 `Tenant` 타입 사용 |
| 한국어만 작성 | `messages/*.json` + `LocalizedText` 객체 |
| GeoHash 없이 좌표 저장 | 항상 `geohash` 필드 함께 저장 |
| 클라이언트에서 직접 history 쓰기 | Cloud Functions만 (Security Rules) |
| 학생 입력 바로 active | `pending_review` 상태로 시작 |
| AI 내용을 수동 데이터로 표시 | `descriptionSource: 'ai_generated'` 명시 |

## 8. 도움말

- **CORE.md**: 프로젝트 정체성, 구조, 용어
- **docs/**: 각 기능별 상세 명세
- **lib/types.ts**: 모든 데이터 타입
- **.env.local**: API 키, Firebase 설정
