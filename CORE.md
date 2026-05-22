# CORE.md — Hyperlocal Mapping Platform

> **이 문서를 가장 먼저 읽으세요.** 프로젝트의 정체성, 전체 구조, 그리고 각 세부 문서가 어디에 어떤 내용을 담고 있는지의 인덱스입니다. Claude Code를 비롯한 모든 AI 코딩 도구는 작업 시작 전 이 파일을 반드시 로드합니다.

-----

## 1. 프로젝트 한 줄 정의

**학교 주소 하나만 입력하면 학교 반경 500m의 디지털 백지도와 카테고리별 시설 데이터가 자동으로 생성되고, 교사와 학생이 1년 동안 핀을 누적·수정하며 우리 동네 아카이브를 만들어가는 하이퍼로컬 매핑 SaaS.**

## 2. 우리가 만드는 것이 아닌 것 (Non-Goals)

오해를 막기 위해 명시합니다.

- **네이버/카카오 지도의 클론이 아닙니다.** 상업 시설을 다 보여주는 만능 지도가 아니라, 노이즈를 걷어낸 교육용 백지도입니다.
- **단발성 수업 도구가 아닙니다.** 한 단원 끝나면 버려지는 활동지가 아니라, 학교의 1년치 + 다년치 자산 아카이브입니다.
- **개인용 앱이 아닙니다.** 학교/교회/관광 등 조직(Tenant) 단위로 운영되는 B2B SaaS입니다.
- **공공 무료 서비스가 아닙니다.** SGIS 에듀가 채우지 못하는 UX·자동화·산출물 영역에서 유료로 가치를 만듭니다.

## 3. 핵심 비즈니스 가설 (요약)

|항목    |내용                                                         |
|------|-----------------------------------------------------------|
|1차 타겟 |한국 초등학교 3학년 사회과 (전국 약 6,000개교)                             |
|교과 진입점|3학년 1학기 사회 1단원 “우리 고장의 모습” — 백지도에 주요 장소 표시 활동이 교과서에 명시되어 있음|
|가격 모델 |학교 연간 라이선스 200~300만원 / 교육청 광역 도입 학교당 60~80만원               |
|결제 채널 |S2B 학교장터, 체더스(개별 교사), 직접 계약(교육청)                           |
|핵심 차별점|자동 시드 + AI 설명글 + 다년 누적 자산 + 출력 산출물                         |
|확장 경로 |중·고등 → 일본 학교 → 로컬 관광 → 교회/마을공동체                            |

상세 내용은 `docs/business/pricing.md`, `docs/business/multi-vertical.md` 참조.

## 4. 기술 스택 한눈에

|레이어    |기술                                                  |이유                               |
|-------|----------------------------------------------------|---------------------------------|
|프론트엔드  |**Next.js 14 (App Router) + TypeScript**            |Vercel 친화, RSC로 SEO/속도           |
|UI 컴포넌트|**shadcn/ui + Tailwind CSS**                        |디자인 토큰 일관성, 커스터마이징 자유            |
|지도 렌더링 |**MapLibre GL JS + Protomaps (자체 호스팅 .pmtiles)**    |라이선스 제약 없음, 백지도 스타일 자유           |
|호스팅    |**Vercel**                                          |Edge Functions, ISR, Blob Storage|
|인증     |**Firebase Auth**                                   |소셜/이메일/SSO 한 번에                  |
|DB     |**Firestore**                                       |실시간 협업, GeoHash 기반 공간 검색         |
|파일 저장  |**Firebase Storage**                                |학생 사진/음성 인터뷰                     |
|백엔드 로직 |**Vercel API Routes + Cloud Functions for Firebase**|외부 API 호출, 시드 파이프라인              |
|AI     |**Anthropic Claude API**                            |설명글 생성, 사진 분류, 번역                |
|국제화    |**next-intl**                                       |ko / ja / en                     |
|결제     |**Stripe (국제) + 토스페이먼츠/S2B (국내)**                   |듀얼 채널                            |

상세 내용은 `docs/architecture/tech-stack.md`.

## 5. 문서 구조 인덱스

```
hyperlocal-platform/
├── CORE.md                                 ← 지금 이 파일
├── docs/
│   ├── architecture/
│   │   ├── tech-stack.md                   기술 선택 근거와 대안
│   │   ├── data-model.md                   Firestore 스키마 전체
│   │   └── api-design.md                   API 라우트 전체 명세
│   ├── features/
│   │   ├── tenant-onboarding.md            학교 등록 + 자동 시드
│   │   ├── map-and-layers.md               백지도 + 카테고리 레이어 토글
│   │   ├── pin-management.md               핀 CRUD + 실시간 협업 + 이력
│   │   ├── ai-features.md                  AI 설명글/분류/번역
│   │   ├── export.md                       PDF/포스터/리포트 출력
│   │   └── user-roles.md                   교사/학생/학부모/관리자
│   ├── integrations/
│   │   ├── external-apis.md                공공데이터, 지오코딩, 지도 타일
│   │   └── seed-adapters.md                Vertical별 시드 어댑터 패턴
│   ├── business/
│   │   ├── pricing.md                      가격 모델, 결제 채널
│   │   ├── multi-vertical.md               학교/관광/교회 확장 설계
│   │   └── i18n.md                         다국어 + 일본 진출
│   └── operations/
│       └── roadmap.md                      Phase별 개발 로드맵 + 비용
```

## 6. 각 문서 한 줄 요약

세부 문서를 안 읽고도 어디에 뭐가 있는지 알 수 있도록.

### Architecture

- **tech-stack.md** — Vercel + Firebase + shadcn 조합의 선택 근거, 지리공간 쿼리 한계와 보완책, 향후 마이그레이션 옵션.
- **data-model.md** — Firestore의 `tenants`, `layers`, `pins`, `pins/history`, `projects`, `users` 전체 스키마와 인덱스.
- **api-design.md** — `/api/tenant`, `/api/seed`, `/api/pin`, `/api/ai`, `/api/export`, `/api/billing` 라우트 전체 명세.

### Features

- **tenant-onboarding.md** — 학교 주소 입력 → 지오코딩 → 백지도 생성 → 공공 API 시드까지의 자동화 파이프라인.
- **map-and-layers.md** — Protomaps 백지도 스타일링, 카테고리 레이어 on/off 토글, “오늘의 수업 모드”.
- **pin-management.md** — 핀 추가/수정/삭제, 학생 입력 검증 큐, 실시간 협업, 변경 이력 자동 기록.
- **ai-features.md** — Claude API로 초등 눈높이 설명글 생성, 사진 → 카테고리 자동 분류, 다국어 번역.
- **export.md** — 연말 “우리 동네 책” PDF 자동 생성, A3 포스터, 학교평가용 활동 리포트.
- **user-roles.md** — 4가지 역할(교사/학생/학부모/관리자)의 권한 매트릭스와 UI 모드 분기.

### Integrations

- **external-apis.md** — 카카오 지오코딩, VWorld, 공공데이터포털, 문화재청, OSM, Protomaps 연동 명세.
- **seed-adapters.md** — `tenant.type`별로 갈아끼우는 시드 어댑터 패턴. 한국 초등/일본 초등/관광/교회 어댑터.

### Business

- **pricing.md** — 학교 베이직/스탠다드/프리미엄 3티어, 교육청 광역, 결제 채널, 갱신 전략.
- **multi-vertical.md** — `tenant.type` 한 필드로 학교/관광/교회/마을공동체를 한 코드베이스에서 운영하는 설계.
- **i18n.md** — next-intl 구조, 데이터 모델의 `{ko, ja, en}` 필드, 일본 진출 시 시드 데이터 소스.

### Operations

- **roadmap.md** — Phase 1~4 개발 일정, 마일스톤별 산출물, 인프라 비용 추정, 마진 분석.

## 7. 개발 시작 시 체크리스트

새 기능을 구현할 때 반드시 다음 순서를 따릅니다.

1. **CORE.md를 다시 읽는다** — 프로젝트 정체성을 재확인.
1. **해당 기능의 features/*.md를 읽는다** — 명세와 엣지 케이스를 파악.
1. **data-model.md와 api-design.md를 교차 확인** — 스키마/API 일관성 확보.
1. **multi-vertical.md를 의식한다** — “이 코드가 일본 학교/교회에도 동작하는가?” 자문.
1. **i18n.md의 다국어 원칙을 준수** — 하드코딩된 한국어 텍스트 금지.

## 8. 절대 어기지 않는 원칙

- **Tenant 추상 우선**: “학교” 대신 항상 “Tenant”로 명명. 코드 어디에도 `school` 하드코딩 금지.
- **i18n 우선**: 모든 사용자 노출 텍스트는 `{ ko, ja, en }` 다국어 객체 또는 번역 키.
- **공간 데이터는 GeoHash 동반**: `location` 저장 시 항상 `geohash` 필드 함께 저장.
- **변경은 이력으로**: 핀의 모든 변경은 `pins/{id}/history` 서브컬렉션에 자동 스냅샷.
- **학생 입력은 검증 큐 경유**: `student` 역할 입력은 `status: pending_review`로 시작, 교사 승인 후 `active`.
- **AI 출력은 출처 명시**: AI 생성 콘텐츠는 `descriptionSource: "ai_generated"` 표기.

## 9. 용어 사전

|용어            |정의                                                               |
|--------------|-----------------------------------------------------------------|
|**Tenant**    |플랫폼을 사용하는 조직 단위. 학교 / 교회 / 관광지역 등.                               |
|**Pin**       |지도 위에 표시되는 단일 장소 오브젝트.                                           |
|**Layer**     |핀들을 묶는 카테고리 그룹. 공공기관/명소/안전 등.                                    |
|**Project**   |한 학년도(또는 한 시즌)의 활동 단위. 다년 자산 상속의 기본 단위.                          |
|**Seed**      |학교 등록 직후 외부 API에서 자동으로 채워지는 초기 핀 데이터.                            |
|**Vertical**  |`tenant.type`으로 구분되는 도메인. elementary_school / tourism / church 등.|
|**Base Layer**|도로/하천/경계만 남긴 디지털 백지도. Protomaps 스타일로 렌더.                         |

## 10. 컨택트 / 거버넌스

- 이 문서가 진실의 원천(Single Source of Truth)입니다.
- 세부 문서와 충돌이 생기면 **CORE.md를 우선**하되, 즉시 세부 문서를 동기화하세요.
- 새 기능 추가 시 (1) 해당 features/*.md 작성 → (2) CORE.md의 인덱스 갱신 → (3) 코드 작성 순서를 지킵니다.