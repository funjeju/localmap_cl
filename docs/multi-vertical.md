# Business: Multi-Vertical Expansion

> `tenant.type` 한 필드로 학교/관광/교회/마을공동체를 한 코드베이스에서 운영하는 설계. 처음부터 박아둬야 나중에 갈아엎지 않는다.

## 1. 추상화의 4 계층

```
┌─────────────────────────────────────────┐
│ 공통 코어 (모든 vertical 공유)            │
│ - Tenant, Pin, Layer, Project, History  │
│ - Auth, Billing, Export                 │
└─────────────────────────────────────────┘
              ▲
              │
┌─────────────────────────────────────────┐
│ Vertical 어댑터                          │
│ - 시드 어댑터 (Tenant Type별 데이터 소스)  │
│ - 기본 레이어 템플릿                       │
│ - AI 프롬프트 톤                          │
└─────────────────────────────────────────┘
              ▲
              │
┌─────────────────────────────────────────┐
│ Locale 어댑터                            │
│ - 지오코딩 API                           │
│ - 공공 데이터 API                         │
│ - 주소 포맷, 좌표계                       │
└─────────────────────────────────────────┘
              ▲
              │
┌─────────────────────────────────────────┐
│ Plan & Branding                          │
│ - 기능 플래그, 가격                       │
│ - 색상/로고                              │
└─────────────────────────────────────────┘
```

## 2. 지원 Vertical 목록

|Tenant Type                  |도메인             |주력 시장      |진출 우선순위       |
|-----------------------------|----------------|-----------|--------------|
|`elementary_school`          |초등 사회과 + 마을 아카이브|한국         |**1차 (현재)**   |
|`middle_school`              |중등 사회·진로        |한국         |2차 (1년차 말)    |
|`high_school`                |고등 사회·진로        |한국         |2차            |
|`tourism`                    |로컬 관광 큐레이션      |한국 지자체 → 일본|2차            |
|`church`                     |교회 교구·심방 지도     |한국 → 글로벌   |3차            |
|`community`                  |마을공동체 자원 매핑     |한국 행안부 사업  |3차            |
|`elementary_school` + `ja-JP`|일본 초등           |일본         |**2차 (특별 우선)**|

## 3. Vertical별 핵심 차이

### 3.1 elementary_school (한국 초등)

- **시드**: 행안부 공공시설, 문화재청, 어린이보호구역
- **기본 레이어**: 공공기관, 명소, 상점, 안전, 문화재, 자연
- **AI 톤**: 초등 3학년 눈높이 친근체
- **출력**: 학습지, 우리 동네 책, 학교평가 리포트
- **사용자**: 교사, 학생, 학부모
- **결제**: S2B + 토스 + 체더스

### 3.2 secondary_school (한국 중·고)

- **추가 시드**: 대학, 직업체험관, 진로지원센터
- **추가 레이어**: 직업·진로, 교통
- **AI 톤**: 중학생 ~ 고등학생 수준
- **출력**: 진로 프로젝트북, 자유학기 산출물
- **결제**: 동일

### 3.3 tourism (로컬 관광)

- **시드**: 한국관광공사 TourAPI, Kakao Local, OSM tourism
- **기본 레이어**: 필수 방문지, 맛집, 카페, 포토스팟, 숨겨진 이야기
- **AI 톤**: 가이드북 톤 (호기심 자극, 스토리텔링)
- **출력**: 관광 코스 PDF, QR 안내판, 다국어 브로셔
- **사용자**: 지자체 운영자, 큐레이터, 관광객 (viewer)
- **결제**: 지자체 직접 계약 (수천만원~억 단위)
- **특수 기능**: 코스 동선 자동 추천, 다국어 번역 의무, GPS 안내

### 3.4 church (교회)

- **시드**: 거의 없음. 수동 입력 중심.
- **기본 레이어**: 성도 가정, 소그룹, 심방지역, 전도지역, 교회 시설
- **AI 톤**: 사용 안 함 (개인정보 민감)
- **출력**: 심방 동선표, 구역별 명단 (오프라인 인쇄용)
- **사용자**: 목회자, 구역장, 성도
- **결제**: 직접 계약 또는 카드 정기결제
- **특수 기능**: 개인정보 보호 강화 (성도 정보 암호화), 익명 모드, Premium 한정

### 3.5 community (마을공동체)

- **시드**: 행안부 마을자치 데이터, 지자체 데이터
- **기본 레이어**: 마을 자원, 인물, 행사, 빈집·유휴공간
- **AI 톤**: 동네 소식지 톤
- **출력**: 마을 자산 지도 책자, 행안부 보고서
- **사용자**: 마을활동가, 주민, 공무원
- **결제**: 지자체 위탁사업 단위

### 3.6 elementary_school × ja-JP (일본 초등)

- **시드**: KSJ, e-Stat, 문화재 온라인
- **기본 레이어**: 한국과 동일 구조, 일본어 라벨
- **AI 톤**: 일본 초등 (やさしい日本語)
- **출력**: 일본 학습지도요령에 맞춘 워크북
- **결제**: Stripe + 일본 인보이스
- **특수 고려**: 한국 정부 데이터 사용 금지, 개인정보 보호 더 엄격

## 4. 코드에서 vertical 분기하는 표준 패턴

### 4.1 Strategy 패턴 활용

```typescript
// lib/verticals/types.ts
export interface VerticalStrategy {
  type: TenantType;
  
  defaultLayers(): LayerTemplate[];
  seedAdapters(): string[];
  defaultFeatures(): FeatureFlag[];
  exportTemplates(): string[];
  aiPersona(): string;
}

// lib/verticals/elementarySchool.ts
export const elementarySchoolStrategy: VerticalStrategy = {
  type: 'elementary_school',
  defaultLayers: () => [/* ... */],
  seedAdapters: () => ['korea.publicFacility', 'korea.culturalHeritage', ...],
  defaultFeatures: () => ['ai_description', 'parent_portal', 'pdf_export'],
  exportTemplates: () => ['yearbook', 'poster_a3', 'worksheet'],
  aiPersona: () => 'elementary_grade3_friendly'
};

// lib/verticals/registry.ts
export const VERTICAL_REGISTRY: Record<TenantType, VerticalStrategy> = {
  elementary_school: elementarySchoolStrategy,
  middle_school: middleSchoolStrategy,
  tourism: tourismStrategy,
  church: churchStrategy,
  // ...
};

export function strategyFor(tenant: Tenant): VerticalStrategy {
  return VERTICAL_REGISTRY[tenant.type];
}
```

### 4.2 컴포넌트 분기

UI 일부는 vertical별로 달라야 함. shadcn 컴포넌트는 공유, 일부 wrapper만 분기.

```typescript
// components/onboarding/TenantOnboardingForm.tsx
export function TenantOnboardingForm({ type }: { type: TenantType }) {
  const fields = ONBOARDING_FIELDS[type];   // type별 입력 필드 다름
  return <Form>{fields.map(renderField)}</Form>;
}
```

### 4.3 AI 프롬프트 분기

```typescript
// lib/ai/personas.ts
export const PERSONAS = {
  elementary_grade3_friendly: { ... },
  middle_school_neutral: { ... },
  tourism_guide: { ... },
  community_neighborhood: { ... },
};

// 호출 시
const persona = PERSONAS[strategy.aiPersona()];
```

## 5. 새 Vertical 추가 체크리스트

1. `TenantType`에 새 타입 추가 (`docs/architecture/data-model.md` 갱신).
1. `lib/verticals/{name}.ts` 작성 (`VerticalStrategy` 구현).
1. `VERTICAL_REGISTRY`에 등록.
1. `LAYER_TEMPLATES`에 기본 레이어 추가.
1. 필요한 시드 어댑터 작성 (`docs/integrations/seed-adapters.md` 참조).
1. AI 페르소나 정의.
1. Export 템플릿 추가.
1. 가격 모델 결정 (`docs/business/pricing.md` 갱신).
1. 온보딩 UI 필드 정의.
1. 통합 테스트.

**핵심: 코드 본체는 거의 안 건드린다.** Strategy + Registry 패턴 덕분에 추가는 항상 새 파일 작성 + 등록만.

## 6. Vertical 간 데이터 격리

### 6.1 기본 격리

- 모든 데이터는 `tenantId`로 분리.
- Tenant 간 데이터 공유 없음.

### 6.2 광역 부모-자식 관계 (Federation)

교육청 ↔ 학교 같은 관계:

```typescript
// 교육청 Tenant
{
  id: "seoul_edu_office",
  type: "education_authority",
  ...
}

// 산하 학교
{
  id: "hakdong_es",
  type: "elementary_school",
  parentTenantId: "seoul_edu_office",
  ...
}
```

교육청 어드민은 산하 학교 대시보드 열람 가능. 단, 학교 내 핀 직접 수정은 불가 (학교 자치).

### 6.3 크로스 Tenant 공유

명시적 옵션. 예: 자매학교 핀 공유.

```typescript
// pin.sharedWith: ['otherTenantId1', 'otherTenantId2']
```

기본은 비활성, Premium 기능.

## 7. Locale × Vertical 매트릭스

|                 |ko-KR|ja-JP|en-US|
|-----------------|-----|-----|-----|
|elementary_school|✓ 메인 |✓ 2차 |향후   |
|middle_school    |✓    |✓    |향후   |
|high_school      |✓    |✓    |향후   |
|tourism          |✓    |✓    |✓ 필요 |
|church           |✓    |가능   |가능   |
|community        |✓    |향후   |-    |

해당 조합이 활성화되려면 두 가지 모두 준비:

- Vertical Strategy (어댑터, 레이어 등)
- Locale 어댑터 (지오코딩, 공공 API)

## 8. 시장 우선순위 로드맵

|시기                  |Vertical                      |Locale          |목표                    |
|--------------------|------------------------------|----------------|----------------------|
|Phase 1 (Month 1-3) |elementary_school             |ko-KR           |시범 학교 5곳, MVP         |
|Phase 2 (Month 4-6) |elementary_school             |ko-KR           |Standard 학교 30곳, 매출 검증|
|Phase 3 (Month 7-12)|+ middle_school, high_school  |ko-KR           |교육청 1곳 진입             |
|Phase 4 (Year 2)    |+ tourism, + elementary_school|ko-KR, **ja-JP**|일본 진출, 관광 지자체 1곳      |
|Phase 5 (Year 3)    |+ church, + community         |다국어             |글로벌 확장                |

## 9. Vertical별 GTM 채널

|Vertical|주요 채널                   |
|--------|------------------------|
|초·중·고   |S2B, 인디스쿨, 체더스, 교육청 직영업 |
|관광      |지자체 입찰, 한국관광공사 협력       |
|교회      |기독교 미디어, 목회자 컨퍼런스, 추천   |
|마을공동체   |행안부 마을공동체 사업 입찰, 지자체    |
|일본 학교   |일본 EdTech 박람회, 자매학교 네트워크|

## 10. 위험 요소

- **Vertical 확장 욕심**: 너무 많은 vertical을 동시 추진하면 어느 것도 깊이 못 감.
- **공통 코어 부패**: vertical별 특수 로직이 공통 코어로 새어들어가는 것 경계. PR 리뷰 시 명시 체크.
- **AI 톤 일관성**: vertical 늘어날수록 AI 페르소나 관리 비용 증가. 페르소나는 5개 이내 유지.