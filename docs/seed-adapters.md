# Integrations: Seed Adapters

> Vertical별로 갈아끼우는 시드 어댑터 패턴. 새 vertical 추가 시 **이 파일과 어댑터 구현체만 작성하면 된다.**

## 1. 핵심 원칙

- `tenant.type`이 결정되면 그에 매핑된 어댑터 세트가 자동 실행.
- 모든 어댑터는 동일한 `SeedAdapter` 인터페이스 구현.
- 어댑터는 **상태가 없고**, 입력(Tenant 정보)을 받아 핀 데이터를 출력만 한다.

## 2. 인터페이스

```typescript
// lib/seedAdapters/types.ts
export interface SeedAdapter {
  /** 어댑터 고유 키. seedJobs.adapter 필드와 매칭. */
  key: string;
  
  /** 어떤 Tenant type에 적용 가능한가 */
  supportedTenantTypes: TenantType[];
  
  /** 어떤 locale에서 동작하는가 */
  supportedLocales: string[];
  
  /** 생성할 핀의 기본 레이어 키 */
  targetLayerKey: string;
  
  /** 우선순위 (낮을수록 먼저 실행) */
  priority: number;
  
  /** 다른 어댑터에 의존하는가 */
  dependsOn?: string[];
  
  /**
   * 실제 시드 실행. 핀 데이터를 yield하거나 배치 반환.
   */
  run(context: SeedContext): AsyncGenerator<PinSeed> | Promise<PinSeed[]>;
}

export interface SeedContext {
  tenant: Tenant;
  layers: Record<string, Layer>;   // systemKey → Layer
  signal: AbortSignal;             // 취소 지원
  logger: Logger;
}

export interface PinSeed {
  layerKey: string;
  name: LocalizedText;
  location: { lat: number; lng: number };
  description?: LocalizedText;
  externalId: string;              // 원본 ID
  source: SourceInfo;
  metadata?: Record<string, any>;
}
```

## 3. 어댑터 등록 레지스트리

```typescript
// lib/seedAdapters/registry.ts
import { koreaPublicFacility } from './korea/publicFacility';
import { koreaCulturalHeritage } from './korea/culturalHeritage';
import { koreaSafety } from './korea/safety';
import { koreaElementarySchool } from './korea/elementarySchool';
import { japanPublicFacility } from './japan/publicFacility';
import { osmPoiFallback } from './global/osmPoi';
import { aiDescribeAll } from './ai/describeAll';

export const ADAPTER_REGISTRY: SeedAdapter[] = [
  koreaPublicFacility,
  koreaCulturalHeritage,
  koreaSafety,
  japanPublicFacility,
  osmPoiFallback,
  aiDescribeAll,
  // ... 새 어댑터 추가
];

export function resolveAdaptersFor(tenant: Tenant): SeedAdapter[] {
  return ADAPTER_REGISTRY
    .filter(a => a.supportedTenantTypes.includes(tenant.type))
    .filter(a => a.supportedLocales.includes(tenant.locale))
    .sort((a, b) => a.priority - b.priority);
}
```

## 4. 어댑터별 명세

### 4.1 한국 초등학교 어댑터 세트

|어댑터 키                   |targetLayer      |priority|데이터 출처       |
|------------------------|-----------------|--------|-------------|
|`korea.publicFacility`  |`public_facility`|1       |행안부 공공시설 데이터 |
|`korea.culturalHeritage`|`heritage`       |1       |문화재청 API     |
|`korea.safety`          |`safety`         |1       |어린이보호구역 + AED|
|`korea.education`       |`landmark`       |2       |학교/유치원/도서관   |
|`global.osmPoiFallback` |자동 분류            |3       |OSM Overpass |
|`ai.describeAll`        |(description 채움) |9       |Claude API   |

### 4.2 한국 중·고등학교 어댑터 세트

대부분 초등과 동일. 차이:

- `targetLayerKey`: 진로 시설 추가 (`career`)
- 추가 어댑터: `korea.universities`, `korea.publicTransport`

### 4.3 일본 초등학교 어댑터 세트

|어댑터 키                  |targetLayer      |priority|데이터 출처      |
|-----------------------|-----------------|--------|------------|
|`japan.publicFacility` |`public_facility`|1       |KSJ + e-Stat|
|`japan.heritage`       |`heritage`       |1       |文化財オンライン    |
|`japan.evacuation`     |`safety`         |1       |避難所データ      |
|`japan.naturalLandmark`|`nature`         |2       |KSJ 지형 데이터  |
|`global.osmPoiFallback`|자동 분류            |3       |OSM         |
|`ai.describeAll`       |(description 채움) |9       |Claude API  |

### 4.4 관광 (Tourism) 어댑터 세트

|어댑터 키                   |targetLayer   |priority|데이터 출처         |
|------------------------|--------------|--------|---------------|
|`korea.tourapi`         |`must_visit`  |1       |한국관광공사 TourAPI |
|`kakao.placesByCategory`|`food`, `cafe`|2       |카카오 Local API  |
|`global.osmTourism`     |`attraction`  |3       |OSM `tourism=*`|
|`ai.tourismDescribe`    |(description) |9       |Claude (관광 톤)  |

### 4.5 교회 (Church) 어댑터 세트

|어댑터 키                  |targetLayer       |priority|데이터 출처          |
|-----------------------|------------------|--------|----------------|
|`church.parishBoundary`|`boundary`        |1       |사용자 업로드 또는 수동   |
|`church.facilities`    |`church_facility` |1       |사용자 입력          |
|`global.osmReligious`  |`nearby_religious`|2       |OSM `religion=*`|

교회는 자동 시드가 거의 없음. 수동 입력 의존. 어댑터는 최소.

## 5. 구현 예시 — 한국 공공시설 어댑터

```typescript
// lib/seedAdapters/korea/publicFacility.ts
export const koreaPublicFacility: SeedAdapter = {
  key: 'korea.publicFacility',
  supportedTenantTypes: ['elementary_school', 'middle_school', 'high_school'],
  supportedLocales: ['ko-KR'],
  targetLayerKey: 'public_facility',
  priority: 1,
  
  async *run(ctx) {
    const { center, radius } = ctx.tenant;
    
    // 자체 인덱스에서 반경 검색 (월 1회 일괄 갱신된 데이터)
    const facilities = await searchFacilitiesByGeohash({
      center,
      radius,
      categories: ['주민센터', '보건소', '도서관', '우체국', '소방서', '경찰서']
    });
    
    for (const f of facilities) {
      yield {
        layerKey: 'public_facility',
        name: { ko: f.name },
        location: { lat: f.lat, lng: f.lng },
        externalId: `kr-mois-${f.id}`,
        source: {
          type: 'public_api',
          apiName: '행정안전부 공공시설',
          fetchedAt: Timestamp.now()
        },
        metadata: {
          category: f.category,
          phone: f.phone,
          address: f.address
        }
      };
    }
  }
};
```

## 6. 실행 오케스트레이션

### 6.1 Cloud Function 트리거

```typescript
// functions/seed/orchestrator.ts
export const onSeedJobCreated = onDocumentCreated(
  'seedJobs/{jobId}',
  async (event) => {
    const job = event.data.data() as SeedJob;
    const adapter = ADAPTER_REGISTRY.find(a => a.key === job.adapter);
    
    if (!adapter) {
      await updateJob(job.id, { status: 'failed', errors: ['Unknown adapter'] });
      return;
    }
    
    // 의존성 체크
    if (adapter.dependsOn) {
      const deps = await fetchJobs(job.tenantId, adapter.dependsOn);
      if (deps.some(d => d.status !== 'completed')) {
        await scheduleRetry(job.id, 60); // 60초 후 재시도
        return;
      }
    }
    
    await updateJob(job.id, { status: 'running', startedAt: Timestamp.now() });
    
    const ctx: SeedContext = {
      tenant: await fetchTenant(job.tenantId),
      layers: await fetchSystemLayers(job.tenantId),
      signal: createTimeoutSignal(120_000),
      logger: createLogger(job.id)
    };
    
    let pinsCreated = 0;
    let pinsFailed = 0;
    
    try {
      for await (const pinSeed of adapter.run(ctx)) {
        try {
          await createPinFromSeed(job.tenantId, pinSeed, ctx.layers);
          pinsCreated++;
        } catch (e) {
          pinsFailed++;
          ctx.logger.error(e);
        }
      }
      
      await updateJob(job.id, {
        status: pinsFailed > 0 ? 'partial' : 'completed',
        pinsCreated,
        pinsFailed,
        completedAt: Timestamp.now()
      });
    } catch (e) {
      await updateJob(job.id, { 
        status: 'failed', 
        errors: [{ message: e.message, at: Timestamp.now() }] 
      });
    }
  }
);
```

### 6.2 핀 생성 시 중복 방지

```typescript
async function createPinFromSeed(tenantId: string, seed: PinSeed, layers: Layers) {
  // externalId로 기존 핀 조회
  const existing = await firestore
    .collection(`tenants/${tenantId}/pins`)
    .where('externalIds.publicApi', '==', seed.externalId)
    .limit(1)
    .get();
  
  if (!existing.empty) {
    // 이미 시드된 핀: 좌표 업데이트만 (이전 변경 추적)
    await existing.docs[0].ref.update({ 
      location: seed.location,
      'externalIds.publicApi': seed.externalId,
      updatedAt: Timestamp.now()
    });
    return;
  }
  
  // 새 핀 생성
  const layerId = layers[seed.layerKey].id;
  await firestore.collection(`tenants/${tenantId}/pins`).add({
    layerId,
    name: seed.name,
    location: { ...seed.location, geohash: encodeGeohash(seed.location.lat, seed.location.lng) },
    description: seed.description,
    descriptionSource: seed.description ? 'public_api' : 'manual',
    source: seed.source,
    externalIds: { publicApi: seed.externalId },
    status: 'active',
    version: 0,
    createdBy: 'system',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
}
```

## 7. 새 어댑터 추가 체크리스트

새 vertical 또는 새 데이터 소스 추가 시:

1. `lib/seedAdapters/{group}/{name}.ts` 파일 생성, `SeedAdapter` 구현
1. `lib/seedAdapters/registry.ts`의 `ADAPTER_REGISTRY`에 추가
1. 필요 시 `LAYER_TEMPLATES`에 새 시스템 레이어 추가
1. 환경 변수 추가 (API 키)
1. `docs/integrations/external-apis.md`에 외부 API 명세 추가
1. 통합 테스트: 가짜 Tenant로 어댑터 단독 실행
1. 모니터링 대시보드에 새 어댑터 지표 추가

## 8. 어댑터 테스트 전략

### 8.1 단위 테스트

- 모의 SeedContext 주입.
- 외부 API는 MSW로 모킹.
- 출력 PinSeed 검증.

### 8.2 통합 테스트

- Firestore Emulator에 가짜 Tenant 생성.
- 어댑터 1개 실행.
- 결과 핀 도큐먼트 검증.

### 8.3 골든 테스트

- 실제 학교 주소 5개에 대한 시드 결과를 기준 데이터로 저장.
- 회귀 방지.

## 9. 성능 가이드라인

- **단일 어댑터당 최대 핀 수**: 200개. 그 이상은 거부.
- **단일 어댑터 실행 시간**: 60초 이내.
- **배치 쓰기**: Firestore `writeBatch`로 500개씩 묶기.
- **외부 API 호출 제한**: 어댑터 내 동시 호출 최대 5개 (Promise.all 분할).

## 10. 자주 사용되는 헬퍼

```typescript
// lib/seedAdapters/_helpers.ts
export function isWithinRadius(point: GeoPoint, center: GeoPoint, radiusMeters: number): boolean;
export function buildLocalizedText(text: string, locale: string): LocalizedText;
export function normalizePhone(raw: string, country: string): string;
export function inferCategory(name: string, hints: string[]): string;
```