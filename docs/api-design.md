# API Design — Vercel API Routes 전체 명세

> 모든 API는 `/app/api/` 하위의 Next.js Route Handler로 구현. Edge Runtime 우선, 무거운 작업은 Node Runtime + Cloud Functions로 위임.

## 1. 공통 규칙

### 1.1 인증

- 모든 API는 Firebase ID 토큰 검증.
- 헤더: `Authorization: Bearer <idToken>`
- 공개 API (학부모 포털 QR 진입 등)는 명시적으로 `// PUBLIC` 주석.

### 1.2 응답 포맷

```typescript
// 성공
{ "ok": true, "data": <T> }

// 실패
{ "ok": false, "error": { "code": "...", "message": "...", "details": {...} } }
```

### 1.3 에러 코드 컨벤션

- `AUTH_REQUIRED`, `AUTH_FORBIDDEN`
- `TENANT_NOT_FOUND`, `TENANT_QUOTA_EXCEEDED`
- `PIN_NOT_FOUND`, `PIN_VALIDATION_FAILED`
- `SEED_FAILED`, `EXTERNAL_API_ERROR`
- `AI_RATE_LIMITED`, `AI_GENERATION_FAILED`

### 1.4 Idempotency

Mutating API는 `Idempotency-Key` 헤더 지원. Cloud Functions 트리거 시 중복 방지.

## 2. Tenant API

### POST `/api/tenant/create`

학교/조직 등록. **자동 시드 파이프라인 트리거 지점.**

**Request**

```typescript
{
  type: TenantType,
  name: LocalizedText,
  address: string,
  addressLocale: 'KR' | 'JP' | 'US',
  locale: 'ko-KR' | 'ja-JP' | 'en-US',
  radius?: number,                         // default 500
  plan: 'trial' | 'basic' | ...
}
```

**처리 흐름**

1. 지오코딩: 주소 → `{ lat, lng, geohash }` (locale별 다른 어댑터)
1. `tenants/{newId}` 도큐먼트 생성
1. 기본 시스템 레이어 자동 생성 (`type` 따라 다름)
1. 시드 작업 큐 등록 (`seedJobs` 컬렉션에 작업 N개 추가)
1. Cloud Functions가 백그라운드에서 시드 실행
1. 즉시 응답 (시드는 비동기)

**Response**

```typescript
{
  tenantId: string,
  status: 'seeding',
  seedJobIds: string[]
}
```

### GET `/api/tenant/:id`

Tenant 정보 + 멤버십 + 현재 활성 프로젝트.

### PATCH `/api/tenant/:id/settings`

브랜딩, 반경, 기능 플래그 등 수정. `admin` 역할만.

### GET `/api/tenant/:id/seedStatus`

시드 진행 상황 폴링용 (3초 간격 권장).

```typescript
{
  jobs: Array<{
    adapter: string,
    status: 'queued' | 'running' | 'completed' | 'failed',
    pinsCreated: number
  }>,
  overallProgress: number                  // 0.0 ~ 1.0
}
```

## 3. Seed API

### POST `/api/seed/publicFacility`

행안부 공공시설 API로 핀 시드. 내부 호출용 (Cloud Functions에서만).

**Request**

```typescript
{
  tenantId: string,
  center: GeoPoint,
  radius: number,
  locale: string
}
```

**처리**

1. 행안부 API 호출 (반경 내 시설 조회)
1. 각 시설을 Pin 도큐먼트로 변환
1. `descriptionSource: 'public_api'`로 저장
1. 옵션: `aiDescribe`로 후속 호출하여 초등 눈높이 설명 생성

### POST `/api/seed/culturalHeritage`

### POST `/api/seed/safety`

### POST `/api/seed/osmPois`

같은 구조. 출처만 다름.

### POST `/api/seed/aiDescribe`

기존 핀들에 AI 설명글 일괄 생성. 비용 가드 필수.

## 4. Pin API

### POST `/api/pin`

**Request**

```typescript
{
  tenantId: string,
  layerId: string,
  name: LocalizedText,
  location: { lat: number, lng: number },  // geohash는 서버에서 계산
  description?: LocalizedText,
  projectId?: string
}
```

**처리**

1. 권한 체크: 사용자 역할에 따라 상태 결정
- `teacher`/`admin` → `status: 'active'`
- `student` → `status: 'pending_review'`
1. `geohash` 자동 계산 후 저장
1. Cloud Function이 `history/v1` 자동 생성

### PATCH `/api/pin/:id`

수정. 모든 필드 변경은 `history` 자동 기록.

```typescript
{
  changes: Partial<Pin>,
  reason?: string                          // "주민센터 이전"
}
```

### DELETE `/api/pin/:id`

**논리 삭제만.** `status: 'archived'`로 변경.

### GET `/api/pin/search`

**Query Params**

- `tenantId` (필수)
- `bounds`: `lat1,lng1,lat2,lng2` (지도 뷰포트)
- `layerIds`: 카테고리 필터
- `status`: default `active`
- `projectId`: 프로젝트 필터

**처리**

- GeoHash prefix 매칭 + bounds 정확 필터링.
- 최대 500개 반환. 더 많으면 클러스터링 권장.

### POST `/api/pin/:id/approve`

학생 입력 핀 승인 (`pending_review` → `active`). 교사 전용.

### POST `/api/pin/:id/reject`

거부. 사유 필수.

### GET `/api/pin/:id/history`

변경 이력 조회. 동네 변천사 타임라인용.

## 5. Layer API

### POST `/api/layer`

### PATCH `/api/layer/:id`

### DELETE `/api/layer/:id` (논리 삭제)

### POST `/api/layer/:id/visibility`

레이어 토글. 클라이언트 상태로도 충분하지만, 교사가 학생에게 “오늘은 이 레이어만 보이게” 강제 설정할 때 서버 저장.

## 6. AI API

### POST `/api/ai/describe`

핀에 초등 눈높이 설명글 생성.

**Request**

```typescript
{
  tenantId: string,                        // 비용 가드
  pinId: string,
  locale: 'ko' | 'ja' | 'en',
  targetGrade?: number                     // 3 (초3 수준 톤)
}
```

**System Prompt (요지)**

```
당신은 {grade}학년 학생이 이해할 수 있게
장소를 2~3문장으로 설명하는 도우미입니다.
어려운 한자어를 피하고, 친근한 말투를 사용하세요.
```

**비용 가드**

- Tenant 월 호출 한도 체크.
- 같은 핀 + 같은 locale 재호출 시 캐시.
- 실패 시 폴백: 카테고리 기반 템플릿 문장.

### POST `/api/ai/classify`

사진 → 레이어 자동 추천. Claude Vision 사용.

```typescript
{
  imageUrl: string,
  tenantId: string
}

// Response
{
  suggestedLayerId: string,
  confidence: number,
  alternatives: Array<{ layerId, confidence }>
}
```

### POST `/api/ai/translate`

`LocalizedText` 필드의 누락된 언어 자동 채움.

## 7. Export API

### POST `/api/export/pdf`

연말 “우리 동네 책” PDF 생성. 시간 오래 걸리므로 비동기.

**Request**

```typescript
{
  tenantId: string,
  projectId: string,
  templateKey: 'yearbook' | 'poster_a3' | 'simple_handout',
  locale: string,
  options?: {
    includeStudentNames?: boolean,
    coverImageUrl?: string
  }
}
```

**처리 흐름**

1. 작업 큐 등록 → `exports/{exportId}` 생성
1. Cloud Function이 React-PDF로 렌더링
1. Firebase Storage에 업로드
1. 클라이언트는 `GET /api/export/:id` 폴링

**Response (즉시)**

```typescript
{ exportId: string, status: 'queued' }
```

### GET `/api/export/:id`

```typescript
{
  status: 'queued' | 'rendering' | 'completed' | 'failed',
  downloadUrl?: string,
  expiresAt?: Timestamp
}
```

### POST `/api/export/report`

학교평가용 활동 리포트. 핀 수, 참여 학생 수, 카테고리 분포 등.

## 8. User & Membership API

### POST `/api/user/invite`

학교에 교사/학생 일괄 초대.

```typescript
{
  tenantId: string,
  invitations: Array<{
    email?: string,
    displayName: string,
    role: Role,
    classId?: string
  }>
}
```

### POST `/api/user/joinByCode`

학생용 임시 코드 로그인.

### GET `/api/user/me`

현재 사용자 + 모든 멤버십.

## 9. Billing API

### POST `/api/billing/checkout`

결제 세션 생성.

```typescript
{
  tenantId: string,
  plan: 'standard' | 'premium',
  channel: 'stripe' | 'toss' | 's2b',
  seats?: number
}

// Response
{
  redirectUrl: string                      // 결제 페이지 URL
}
```

### POST `/api/billing/webhook/stripe`

### POST `/api/billing/webhook/toss`

### POST `/api/billing/webhook/s2b`

각 PG 웹훅. 서명 검증 필수.

### GET `/api/billing/usage/:tenantId`

현재 월 사용량 + 한도 + 청구 예정 금액.

## 10. Admin API (Superadmin / 교육청)

### GET `/api/admin/tenants`

다중 Tenant 조회. 교육청 광역 운영용.

### GET `/api/admin/usage/aggregate`

학교별 사용량 집계. 광역 대시보드.

### POST `/api/admin/tenant/:id/impersonate`

기술 지원용 임시 접근. 모든 행동 로깅.

## 11. Public API (인증 불필요)

### GET `/api/public/tenant/:slug`

학부모 QR 진입용. Tenant 공개 정보만 반환.

### GET `/api/public/tenant/:slug/pins`

`isPublic: true` 표시된 핀만. 학부모/방문자 뷰.

## 12. Rate Limiting

|엔드포인트 군                |한도                  |
|-----------------------|--------------------|
|`/api/pin` (POST/PATCH)|사용자당 분당 30          |
|`/api/ai/*`            |Tenant당 월 한도 (플랜 의존)|
|`/api/seed/*`          |Tenant당 1회/날 (재시드)  |
|`/api/export/pdf`      |Tenant당 일 10회       |
|공개 API                 |IP당 분당 60           |

Upstash Ratelimit 또는 Vercel KV 사용. `lib/ratelimit.ts`에 통합.

## 13. Webhooks (외부 발신)

학교가 자체 시스템과 연동할 수 있도록 (Enterprise 플랜).

- `pin.created`
- `pin.approved`
- `project.completed`
- `export.ready`

`/api/webhooks/outbound/configure`로 등록.