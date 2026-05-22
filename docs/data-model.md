# Data Model — Firestore 스키마 전체

> 이 문서는 모든 컬렉션/문서/필드의 진실의 원천입니다. 새 필드 추가 시 반드시 이 문서를 먼저 갱신하세요.

## 1. 컬렉션 트리

```
/tenants/{tenantId}
  /layers/{layerId}
  /pins/{pinId}
    /history/{versionId}
    /comments/{commentId}
  /projects/{projectId}
  /invitations/{inviteId}
  /usage/{yyyymm}                 사용량 집계 (요금/한도용)

/users/{userId}
  /tenantMemberships/{tenantId}   사용자가 속한 Tenant 목록

/seedJobs/{jobId}                 시드 파이프라인 작업 큐

/billingAccounts/{accountId}      결제 단위 (Tenant N:1 가능)
```

## 2. 핵심 도큐먼트 스키마

### 2.1 `tenants/{tenantId}`

조직 단위. 학교, 교회, 관광지역 등 모든 도메인이 이 추상으로 들어옵니다.

```typescript
interface Tenant {
  id: string;                              // 자동 생성 또는 슬러그
  type: TenantType;                        // 아래 enum 참고
  name: LocalizedText;                     // { ko, ja, en }
  shortName: LocalizedText;
  
  address: string;                         // 원본 주소
  addressLocale: 'KR' | 'JP' | 'US';      // 주소 형식
  center: GeoPoint;                        // { lat, lng, geohash }
  radius: number;                          // meters, default 500
  bounds?: GeoBounds;                      // 자동 계산된 경계 박스
  
  locale: 'ko-KR' | 'ja-JP' | 'en-US';   // UI 기본 언어
  supportedLocales: string[];              // 다국어 활성화 목록
  
  plan: 'trial' | 'basic' | 'standard' | 'premium' | 'enterprise';
  features: FeatureFlag[];                 // 활성화된 기능 플래그
  
  branding?: {
    logoUrl?: string;
    primaryColor?: string;                 // Hex, Tenant 컬러
  };
  
  billing?: {
    accountId: string;                     // billingAccounts 참조
    seatsAllowed: number;                  // 교사 수 한도
  };
  
  parentTenantId?: string;                 // 교육청-학교 관계 등
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;                       // userId
}

type TenantType = 
  | 'elementary_school'
  | 'middle_school'
  | 'high_school'
  | 'church'
  | 'tourism'
  | 'community'
  | 'demo';

type FeatureFlag =
  | 'ai_description'
  | 'parent_portal'
  | 'pdf_export'
  | 'audio_recording'
  | 'student_collaboration'
  | 'multi_year_archive'
  | 'custom_branding';

interface GeoPoint {
  lat: number;
  lng: number;
  geohash: string;                         // 9자리 권장
}

interface LocalizedText {
  ko?: string;
  ja?: string;
  en?: string;
}
```

**인덱스**

- `(type, plan)` — 광역 어드민용
- `(parentTenantId)` — 교육청 산하 학교 목록

### 2.2 `tenants/{tenantId}/layers/{layerId}`

카테고리 그룹. 사용자가 자유롭게 추가/편집 가능.

```typescript
interface Layer {
  id: string;
  tenantId: string;
  
  name: LocalizedText;                     // "공공기관" / "公共機関"
  icon: string;                            // 이모지 또는 아이콘 키
  color: string;                           // Hex
  order: number;                           // UI 정렬 순서
  
  // 교과/커리큘럼 연계 태그
  curriculumTags: string[];                // ["사회3-1-1", "사회3-1-2"]
  
  // 표시 제어
  isVisible: boolean;                      // 전역 토글
  visibleToRoles: Role[];                  // ['teacher', 'student', 'parent']
  
  // 시드 출처 (자동 생성 레이어 vs 사용자 생성)
  source: 'system' | 'seed' | 'custom';
  systemKey?: string;                      // 시스템 레이어 식별자
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**시스템 레이어 키 (한국 초등 기준)**

- `public_facility` — 행정·공공관청
- `landmark` — 지역 명소·랜드마크
- `commerce` — 주민 생활·경제 시설
- `safety` — 안전 시설 (어린이보호구역, AED)
- `heritage` — 문화재
- `nature` — 자연환경

### 2.3 `tenants/{tenantId}/pins/{pinId}`

지도 위 단일 장소.

```typescript
interface Pin {
  id: string;
  tenantId: string;
  layerId: string;
  
  name: LocalizedText;
  location: GeoPoint;
  
  description: LocalizedText;
  descriptionSource: 'manual' | 'public_api' | 'ai_generated' | 'translated';
  
  // 미디어
  images: MediaRef[];                      // 최대 5개
  audioNotes: MediaRef[];                  // 학생 인터뷰
  
  // 메타데이터
  source: SourceInfo;                      // 어디서 왔는가
  externalIds?: Record<string, string>;    // 공공 API 원본 ID
  
  // 협업/검증
  status: 'active' | 'pending_review' | 'archived' | 'rejected';
  createdBy: string;                       // userId
  verifiedBy?: string;                     // 교사 userId (학생 입력 검증)
  verifiedAt?: Timestamp;
  
  // 변경 추적
  version: number;                         // history 길이와 동기화
  
  // 프로젝트 귀속
  projectId?: string;                      // 어느 학년도/시즌 활동 산출물인가
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface MediaRef {
  url: string;                             // Firebase Storage URL
  thumbnailUrl?: string;
  caption?: LocalizedText;
  uploadedBy: string;
  uploadedAt: Timestamp;
}

interface SourceInfo {
  type: 'public_api' | 'teacher' | 'student' | 'parent' | 'osm' | 'ai_generated';
  apiName?: string;                        // "행안부공공시설" 등
  fetchedAt?: Timestamp;
}
```

**인덱스**

- `(tenantId, status, layerId)` — 지도 렌더링
- `(tenantId, projectId, status)` — 프로젝트별 산출물
- `(tenantId, status, createdAt)` — 최근 핀 피드
- `(tenantId, geohash_prefix)` — 공간 검색

### 2.4 `tenants/{tenantId}/pins/{pinId}/history/{versionId}`

핀의 변경 이력. **삭제 금지, append-only.**

```typescript
interface PinHistory {
  id: string;
  pinId: string;
  version: number;
  
  changeType: ChangeType;
  changedFields: Partial<Pin>;             // before → after diff
  previousSnapshot?: Partial<Pin>;
  
  reason?: string;                         // "주민센터가 옆 건물로 이전"
  
  changedBy: string;
  changedAt: Timestamp;
}

type ChangeType =
  | 'created'
  | 'edited'
  | 'moved'
  | 'closed'           // 폐업/철거
  | 'reopened'
  | 'archived'
  | 'restored';
```

### 2.5 `tenants/{tenantId}/projects/{projectId}`

학년도 또는 시즌 단위. 다년 자산 상속의 기본 단위.

```typescript
interface Project {
  id: string;
  tenantId: string;
  
  name: LocalizedText;                     // "2026학년도 3학년 우리 동네 아카이브"
  
  schoolYear?: number;                     // 2026
  grade?: number;                          // 3 (학교 vertical)
  season?: string;                         // 관광 vertical용
  
  activeUnits: string[];                   // 진행 중인 단원 키
  participantGroups: string[];             // "3-1", "3-2", "3-3"
  
  inheritsFrom?: string;                   // 이전 프로젝트 ID
  inheritedPinIds: string[];               // 상속받은 핀 (참조용)
  
  status: 'planning' | 'active' | 'completed' | 'archived';
  
  startDate: Timestamp;
  endDate?: Timestamp;
  
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 2.6 `users/{userId}`

```typescript
interface User {
  id: string;                              // Firebase Auth uid
  email?: string;
  displayName?: string;
  photoURL?: string;
  
  locale: string;                          // 'ko' | 'ja' | 'en'
  
  // 글로벌 역할 (Tenant 무관)
  isSuperAdmin?: boolean;
  
  createdAt: Timestamp;
  lastSeenAt: Timestamp;
}
```

### 2.7 `users/{userId}/tenantMemberships/{tenantId}`

사용자-Tenant 다대다 관계.

```typescript
interface TenantMembership {
  tenantId: string;
  role: Role;                              // 'teacher' | 'student' | 'parent' | 'admin'
  
  // 학교 컨텍스트
  classId?: string;                        // "3-1"
  grade?: number;
  
  // 학생-학부모 연결
  parentOf?: string[];                     // 학생 userId 배열 (학부모용)
  
  joinedAt: Timestamp;
  status: 'active' | 'invited' | 'removed';
}

type Role = 'admin' | 'teacher' | 'student' | 'parent' | 'viewer';
```

### 2.8 `seedJobs/{jobId}`

학교 등록 시 백그라운드 시드 작업 추적.

```typescript
interface SeedJob {
  id: string;
  tenantId: string;
  adapter: string;                         // 'korea_elementary' 등
  source: string;                          // 'publicFacility', 'culturalHeritage'
  
  status: 'queued' | 'running' | 'completed' | 'failed' | 'partial';
  
  pinsCreated: number;
  pinsFailed: number;
  errors: Array<{ message: string; at: Timestamp }>;
  
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  
  triggeredBy: string;                     // userId
  createdAt: Timestamp;
}
```

### 2.9 `tenants/{tenantId}/usage/{yyyymm}`

월별 사용량. 요금제 한도 체크용.

```typescript
interface MonthlyUsage {
  yearMonth: string;                       // "2026-05"
  
  pinsCreated: number;
  pinsEdited: number;
  aiCallsCount: number;
  exportsGenerated: number;
  storageBytes: number;
  
  activeTeachers: number;
  activeStudents: number;
  
  lastUpdatedAt: Timestamp;
}
```

## 3. Security Rules 원칙

상세 규칙은 별도 파일이지만, 원칙만 명시.

```javascript
// /tenants/{tenantId}/pins/{pinId}
// 읽기: tenant 멤버이면서 status가 active이거나, 본인이 만든 핀
// 쓰기: teacher 이상, 또는 student가 자기 핀(pending_review 상태) 수정

// /tenants/{tenantId}/pins/{pinId}/history
// 읽기: tenant teacher 이상
// 쓰기: Cloud Functions만 (클라이언트 직접 쓰기 금지)
```

## 4. 데이터 마이그레이션 정책

- 모든 도큐먼트는 `schemaVersion: number` 필드 권장 (필요 시점에 추가).
- 마이그레이션은 Cloud Functions의 일괄 처리로.
- **삭제는 항상 논리 삭제** (`status: 'archived'`). 물리 삭제는 GDPR/개인정보 요청 시에만.

## 5. 다국어 필드 처리 규칙

`LocalizedText` 객체는 다음 우선순위로 폴백:

1. 사용자 locale의 값
1. tenant.locale의 값
1. ‘ko’ → ‘en’ → ‘ja’ 순으로 존재하는 첫 값
1. 빈 문자열

이 로직은 `lib/i18n/localizedText.ts`에 단일 헬퍼로 구현. 컴포넌트는 직접 분기 금지.