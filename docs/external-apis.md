# Integrations: External APIs

> 자동 시드와 지오코딩에 필요한 모든 외부 API의 명세, 비용, 폴백 전략.

## 1. 카테고리별 API 매핑

|용도       |한국              |일본                 |폴백 (글로벌)                     |
|---------|----------------|-------------------|-----------------------------|
|지오코딩     |Kakao Local     |GSI 지명검색 / Geocoder|Mapbox / OSM Nominatim       |
|공공시설     |행정안전부 공공시설      |e-Stat (정부통계)      |OSM                          |
|문화재      |문화재청 (국가유산청)    |文化財オンライン           |OSM `historic=*`             |
|안전 시설    |어린이보호구역 공공데이터   |公園・避難所データ          |OSM `amenity=*`              |
|행정경계     |VWorld (브이월드)   |国土数値情報             |OSM `boundary=administrative`|
|도로/하천 베이스|Protomaps (자체)  |Protomaps (자체)     |Protomaps (자체)               |
|AI       |Anthropic Claude|Anthropic Claude   |Anthropic Claude             |

## 2. 한국 API 상세

### 2.1 Kakao Local API (지오코딩)

- **엔드포인트**: `https://dapi.kakao.com/v2/local/search/address.json`
- **인증**: `Authorization: KakaoAK {REST_API_KEY}`
- **요금**: 일 30만회 무료
- **응답 좌표계**: WGS84

```typescript
// lib/integrations/kakao.ts
export async function geocodeKakao(address: string): Promise<GeoPoint> {
  const res = await fetch(
    `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
    { headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` } }
  );
  const data = await res.json();
  const first = data.documents[0];
  if (!first) throw new Error('GEOCODE_NOT_FOUND');
  return {
    lat: parseFloat(first.y),
    lng: parseFloat(first.x),
    geohash: encodeGeohash(parseFloat(first.y), parseFloat(first.x), 9),
  };
}
```

**중요**: Kakao Maps SDK (지도 렌더) 사용 금지. 지오코딩 API만 사용 (라이선스 안전).

### 2.2 공공데이터포털 — 행정안전부 공공시설

- **URL**: `https://www.data.go.kr/data/15001168/openapi.do` (예시)
- **인증**: 서비스 키 발급 (개발용 무료, 운영용 신청)
- **응답**: XML 또는 JSON
- **데이터**: 주민센터, 보건소, 도서관, 동사무소 등 위경도 포함

**호출 패턴**

```typescript
// 학교 좌표 기준 반경 검색은 직접 지원 X
// → 전국 데이터 일괄 다운로드 후 자체 공간 인덱싱 권장
```

**권장 운영 방식**

1. 매월 1회 전국 공공시설 데이터 일괄 다운로드 (Cloud Scheduler).
1. PostGIS 또는 GeoHash 인덱스로 저장 (Firestore + GeoHash로 충분).
1. Tenant 시드 시 자체 DB에서 반경 검색.

API 직접 호출보다 자체 데이터 캐시가 안정적.

### 2.3 문화재청 (국가유산청) API

- **URL**: `https://www.cha.go.kr/cha/openapi/`
- **데이터**: 국가지정문화재, 시도지정문화재 + 좌표
- **처리**: 위와 동일 (일괄 다운로드 → 자체 인덱스)

### 2.4 어린이보호구역 공공데이터

- **데이터**: 전국 학교/유치원 주변 어린이보호구역 폴리곤
- **활용**: `safety` 레이어 자동 시드
- **추가 데이터**: AED 설치 위치, 안전 비상벨 등

### 2.5 VWorld (브이월드)

- **URL**: `https://api.vworld.kr/`
- **데이터**: 행정경계, 도로명주소, 지적도
- **용도**: 행정동 경계 폴리곤 (학교 반경에 어떤 행정동이 걸치는지)
- **인증**: API 키 발급 (무료)

## 3. 일본 API 상세

### 3.1 GSI (国土地理院) — 지오코딩

- **URL**: `https://msearch.gsi.go.jp/address-search/AddressSearch`
- **무료**, 일본 정부 운영
- **응답 좌표계**: JGD2011 (WGS84 호환)

### 3.2 e-Stat (政府統計の総合窓口) API

- **URL**: `https://www.e-stat.go.jp/api/`
- **데이터**: 일본 정부 통계, 공공시설 일부
- **인증**: 무료 API 키

### 3.3 国土数値情報 (KSJ)

- **URL**: `https://nlftp.mlit.go.jp/ksj/`
- **데이터**: GIS 데이터 일괄 다운로드 (Shapefile, GeoJSON)
- **활용**: 행정경계, 학교, 공공시설, 문화재
- **운영**: 한국 방식과 동일 (일괄 다운로드 → 자체 인덱스)

### 3.4 OpenStreetMap 일본

- 일본은 OSM 데이터가 한국보다 풍부.
- 공공시설 폴백으로 OSM `amenity=*` 활용.

## 4. 글로벌 폴백 API

### 4.1 OSM Nominatim (지오코딩)

- **URL**: `https://nominatim.openstreetmap.org/`
- **무료**, 단 사용량 제한 (초당 1회).
- **운영**: 자체 호스팅 권장 (Photon 또는 Nominatim Docker).

### 4.2 Overpass API (POI 검색)

- **URL**: `https://overpass-api.de/api/interpreter`
- **무료**, OSM 데이터 검색.
- **용도**: 시드 시 OSM POI 폴백.

## 5. Claude API

### 5.1 모델 선택

|작업       |모델                    |이유           |
|---------|----------------------|-------------|
|설명글 생성   |Claude Haiku          |짧은 텍스트, 비용 효율|
|사진 분류    |Claude Sonnet (Vision)|정확도 우선       |
|번역       |Claude Haiku          |단순 작업        |
|음성 인터뷰 요약|Claude Sonnet         |긴 컨텍스트       |

### 5.2 비용 추정

- Describe 1회: 평균 200 input + 100 output 토큰 ≈ $0.0001
- Classify 1회 (Vision): 약 $0.003
- Tenant 월 1,000회 사용 시 ≈ $1~3

마진 충분.

### 5.3 호출 래퍼

```typescript
// lib/ai/claude.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generateDescription(input: DescribeInput): Promise<string> {
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    system: buildSystemPrompt(input.locale, input.targetGrade),
    messages: [{ role: "user", content: buildUserPrompt(input) }],
  });
  return extractText(msg);
}
```

## 6. Protomaps (지도 타일)

### 6.1 셋업

1. [Protomaps](https://protomaps.com/) 에서 영역 추출 (한국, 일본 각각).
1. `.pmtiles` 파일 생성 (한국 ~50MB, 일본 ~80MB).
1. Vercel Blob에 업로드.
1. 환경변수로 URL 주입.

### 6.2 클라이언트 사용

```typescript
// components/map/MapCanvas.tsx
import { Protocol } from 'pmtiles';
import maplibregl from 'maplibre-gl';

const protocol = new Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);

const map = new maplibregl.Map({
  container: 'map',
  style: '/map-styles/ko.json',
  center: [tenant.center.lng, tenant.center.lat],
  zoom: 15,
});
```

스타일 JSON 안에 `"sources": { "protomaps": { "url": "pmtiles://..." } }` 형태.

## 7. 결제 API

### 7.1 Stripe (국제)

- 카드 정기결제, Apple/Google Pay.
- 일본/관광/교회 등 글로벌 확장 시 메인.

### 7.2 토스페이먼츠 (국내 개인)

- 개별 교사 월 구독.
- 간편결제 (네이버페이, 카카오페이) 지원.

### 7.3 S2B 학교장터 (국내 학교)

- 입점 절차: 신청 → 심사 (1~2일) → 상품 등록.
- 행정 결제이므로 자동화 어려움. 별도 영업 채널.
- 자세한 등록 절차는 별도 문서.

## 8. API 호출 관리

### 8.1 공통 클라이언트 패턴

```typescript
// lib/integrations/_base.ts
export abstract class ExternalAPIClient {
  abstract baseUrl: string;
  abstract apiName: string;
  
  protected async fetch<T>(path: string, init?: RequestInit): Promise<T> {
    const start = performance.now();
    try {
      const res = await fetch(this.baseUrl + path, {
        ...init,
        headers: { ...this.authHeaders(), ...init?.headers },
      });
      if (!res.ok) throw new Error(`${this.apiName}: ${res.status}`);
      return res.json();
    } catch (e) {
      this.logFailure(e, performance.now() - start);
      throw e;
    } finally {
      this.recordMetric(this.apiName, performance.now() - start);
    }
  }
}
```

### 8.2 모니터링

- 모든 외부 API 호출은 메트릭 기록.
- 실패율, 평균 응답시간을 대시보드에.
- 임계치 초과 시 Slack/이메일 알림.

### 8.3 재시도 전략

- 멱등 GET: 5초 → 15초 → 60초 백오프.
- 비멱등 POST: 재시도 안 함 (Idempotency-Key 필수).

## 9. 환경 변수 정리

```env
# 한국
KAKAO_REST_API_KEY=
DATA_GO_KR_API_KEY=
CHA_GO_KR_API_KEY=
VWORLD_API_KEY=

# 일본
GSI_API_KEY=  # 일부 무료
E_STAT_API_KEY=

# 글로벌
OSM_NOMINATIM_URL=https://nominatim.openstreetmap.org
MAPBOX_TOKEN=  # 폴백 지오코딩용

# AI
ANTHROPIC_API_KEY=

# 지도
PROTOMAPS_TILES_KO_URL=
PROTOMAPS_TILES_JA_URL=

# 결제
STRIPE_SECRET_KEY=
TOSS_SECRET_KEY=
```

## 10. 라이선스 컴플라이언스

- **OSM 사용 시**: 어트리뷰션 표시 의무 (“© OpenStreetMap contributors”).
- **공공데이터**: 출처 표시 + 영리 이용 가능 (대부분 공공누리 1-4유형).
- **Kakao Local API**: 지도 SDK 미사용 조건에서 영리 이용 가능. 약관 정기 확인.
- **Protomaps**: 오픈소스 라이선스. 자체 호스팅 시 제약 없음.