# Feature: AI Features

> Claude API를 활용한 설명글 생성, 사진 분류, 번역. AI는 “교사의 텍스트 수정 부담”을 제거하는 핵심 차별화 포인트.

## 1. AI가 해결하는 진짜 문제

공공 API에서 받은 데이터는 “학동주민센터, 도로명주소: …” 같은 무미건조한 행정 데이터입니다. 초3 학생에게는 무의미합니다. 교사가 일일이 “여기는 우리 동네 어른들이 민원을 보러 가는 곳이에요”로 다시 써야 한다면 제품 가치가 절반으로 깎입니다.

**AI 설명글 자동 생성이 곧 시간 절감 = WTP의 원천입니다.**

## 2. 3가지 AI 기능

### 2.1 설명글 자동 생성 (Describe)

### 2.2 사진 분류 (Classify)

### 2.3 다국어 번역 (Translate)

## 3. Describe: 초등 눈높이 설명글 생성

### 3.1 입력

```typescript
{
  pinName: "학동주민센터",
  category: "공공기관",
  address?: "서울시 강남구 학동로 ...",
  context?: "학교 반경 500m, 초등학교 3학년 수업",
  locale: "ko",
  targetGrade: 3
}
```

### 3.2 시스템 프롬프트 (한국어 초3 기준)

```
당신은 초등학교 {targetGrade}학년 학생이 이해할 수 있게 
장소를 친절하게 설명하는 도우미입니다.

규칙:
1. 2~3문장으로 짧게 씁니다.
2. 어려운 한자어는 피하고 쉬운 우리말을 사용합니다.
3. "~해요/~예요" 같은 친근한 말투를 씁니다.
4. 학생이 가본 적이 있다고 가정하지 않습니다.
5. 시설의 역할을 한 가지 핵심으로 설명합니다.
6. 자랑하거나 추측하는 표현을 쓰지 않습니다 ("아주 멋진", "유명한" 등 금지).
7. 광고성 표현 금지.

장소 정보:
- 이름: {pinName}
- 카테고리: {category}
- 주소: {address}

위 장소를 설명해주세요.
```

### 3.3 출력 예시

|핀 이름     |카테고리 |AI 출력                                               |
|---------|-----|----------------------------------------------------|
|학동주민센터   |공공기관 |“우리 동네 어른들이 민원을 보러 가는 곳이에요. 등본을 떼거나 동네 일을 의논할 때 가요.”|
|학동도서관    |명소   |“책을 빌릴 수 있는 곳이에요. 조용히 책을 읽거나 공부도 할 수 있어요.”          |
|학동119안전센터|안전 시설|“불이 났을 때 출동하는 소방관 아저씨, 아주머니들이 일하는 곳이에요.”            |

### 3.4 일본어 시스템 프롬프트

```
あなたは小学校{targetGrade}年生が理解できるように
場所を親しみやすく説明する助手です。

ルール:
1. 2〜3文で簡潔に書きます。
2. 難しい漢語を避け、やさしい言葉を使います。
3. 「〜です/〜ます」の丁寧な口調を使います。
...
```

### 3.5 비용 가드

**플랜별 AI 호출 한도**

|플랜        |월 AI 호출 한도|
|----------|----------|
|Trial     |50회       |
|Basic     |200회      |
|Standard  |1,000회    |
|Premium   |5,000회    |
|Enterprise|협의        |

**한도 초과 시**

- UI에 “이번 달 AI 한도를 다 썼어요” 안내.
- 교사 수동 입력으로 안내.
- 다음 달 자동 리셋.

**중복 호출 방지**

- 같은 (pinId, locale)은 결과 캐싱.
- 재생성은 명시적 요청만 (`force: true`).

### 3.6 출처 표기

생성된 설명은 `descriptionSource: "ai_generated"`로 저장. UI에 작게 ✨ 표시 노출. 교사가 수동 편집하면 `descriptionSource: "manual"`로 변경.

## 4. Classify: 사진 → 카테고리 자동 분류

### 4.1 활용 시나리오

학생이 사진을 찍어 핀을 추가할 때:

1. 사진 업로드
1. Claude Vision이 “이건 분식집이네 → 상점 레이어 추천”
1. 학생은 확인만 (탭 1회)

### 4.2 호출

```typescript
// POST /api/ai/classify
{
  imageUrl: "https://...",
  tenantId: "...",
  availableLayers: [               // 해당 Tenant의 활성 레이어
    { id: "public_facility", name: "공공기관" },
    { id: "commerce", name: "상점·시설" },
    ...
  ]
}
```

### 4.3 시스템 프롬프트

```
당신은 사진을 보고 어떤 종류의 장소인지 분류합니다.

다음 카테고리 중 하나를 골라주세요:
{availableLayers를 리스트로 나열}

응답은 JSON 형식으로:
{
  "suggestedLayerId": "...",
  "confidence": 0.0 ~ 1.0,
  "reasoning": "한 문장 설명",
  "alternatives": [{"layerId": "...", "confidence": ...}]
}

확신이 없으면 confidence를 낮추세요.
부적절한 사진(인물 사진, 사적 공간, 부적절 콘텐츠)이면 "rejected"로 응답.
```

### 4.4 부적절 콘텐츠 처리

`rejected` 응답 시:

- 사진 자동 삭제 (Storage)
- 교사에게 알림 (학생 식별)
- 학생에게 “다른 사진을 골라줘”

## 5. Translate: 다국어 자동 번역

### 5.1 활용 시나리오

- 한국 교사가 핀 이름/설명을 한국어로만 입력 → 일본 자매학교에 공유 시 자동 번역.
- 일본 관광 Tenant → 한국·영어 관광객용 자동 번역.

### 5.2 호출

```typescript
// POST /api/ai/translate
{
  text: { ko: "학동주민센터" },
  targetLocales: ["ja", "en"],
  context: "공공기관 이름"
}

// Response
{
  ja: "ハクドン住民センター",
  en: "Hakdong Community Center"
}
```

### 5.3 컨텍스트 인지

단순 직역이 아니라 카테고리/맥락을 시스템 프롬프트에 주입.

- 고유명사는 발음 표기 + 영문 의역 병기.
- 한국 고유 시설 (주민센터, 보건소 등)은 일본어 대응 표현 사용.

## 6. AI 호출 인프라

### 6.1 추상화 레이어

```typescript
// lib/ai/client.ts
export class AIClient {
  async describe(input: DescribeInput): Promise<DescribeOutput>;
  async classify(input: ClassifyInput): Promise<ClassifyOutput>;
  async translate(input: TranslateInput): Promise<TranslateOutput>;
}

// 구현체
export class ClaudeAIClient implements AIClient { ... }
export class MockAIClient implements AIClient { ... }   // 테스트용
```

향후 다른 모델로 교체 가능. 핵심 비즈니스 로직은 인터페이스에만 의존.

### 6.2 호출 위치

|호출처                           |트리거                              |
|------------------------------|---------------------------------|
|`/api/ai/describe`            |사용자 명시 요청                        |
|Cloud Function `seedJobs/{id}`|시드 완료 후 자동 배치 (옵션)               |
|`/api/ai/classify`            |사진 업로드 후 즉시                      |
|`/api/ai/translate`           |핀 저장 시 누락된 locale 자동 채움 (Premium)|

### 6.3 에러 처리

- API 장애: 폴백 템플릿 (“이 장소는 우리 동네의 {카테고리}입니다.”)
- Rate limit: 5초 후 재시도, 3회 실패 시 사용자 통지.
- 비용 가드 트리거: 즉시 차단, 결제 페이지 안내.

### 6.4 로깅과 평가

모든 AI 호출은 다음 로그:

- 입력 (개인정보 마스킹)
- 출력
- 소요 시간
- 비용 (토큰 수)
- 사용자 피드백 (👍/👎)

월간 품질 리뷰 데이터로 활용.

## 7. 사용자 통제

### 7.1 AI 기능 토글

Tenant 설정에서 AI 기능 전체 on/off 가능. 일부 학교는 AI 사용을 꺼릴 수 있음.

### 7.2 사용자 피드백

생성된 설명 옆에 👍/👎 버튼. 👎 클릭 시 재생성 + 사유 수집.

### 7.3 투명성

설정 페이지에 “이번 달 AI 사용량: 234 / 1,000회” 표시.

## 8. 향후 AI 확장 아이디어

- **음성 인터뷰 자동 요약**: 학생이 동네 어른과 한 인터뷰 → 핀 설명에 자동 인용.
- **AI 가이드 모드**: 학생이 핀 클릭 → AI가 음성으로 설명 (TTS).
- **퀴즈 자동 생성**: 핀 데이터 → 평가용 문제지 자동 생성.
- **유사 핀 추천**: “이 핀과 비슷한 장소가 동네에 또 있어요” 발견 학습.

## 9. 분석 이벤트

- `ai.describe.requested`
- `ai.describe.completed` (props: cached, duration, locale)
- `ai.describe.feedback` (props: thumbsUp/Down)
- `ai.classify.requested`
- `ai.classify.rejected` (부적절 콘텐츠)
- `ai.quota.exceeded`