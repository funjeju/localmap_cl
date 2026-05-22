# Feature: Map & Layers

> 백지도 렌더링과 카테고리 레이어 토글. 제품의 시각적 정체성이 결정되는 화면.

## 1. 핵심 원칙

1. **백지도는 노이즈가 없어야 한다.** 도로/하천/경계만 보이고 상업 시설/POI 텍스트는 다 숨긴다.
1. **카테고리는 한눈에 켜고 끌 수 있어야 한다.** 클릭 1회로 즉시 반영.
1. **학생 모드는 교사가 선택한 레이어만 보인다.** 학습 목표 집중.

## 2. 지도 렌더링 스택

```
MapLibre GL JS
  ├─ Base Tiles: Protomaps (.pmtiles, Vercel Blob 호스팅)
  ├─ Style JSON: /public/map-styles/{locale}.json
  └─ Pin Layer: Firestore 데이터를 MapLibre Source로 주입
```

### 2.1 Protomaps 설정

- 한국 영역: `kr.pmtiles` (~50MB)
- 일본 영역: `jp.pmtiles` (~80MB)
- Vercel Blob에 업로드 후 CDN URL 환경변수로 주입.

### 2.2 백지도 스타일 (style.json)

핵심: 다음 레이어만 표시, 나머지 모두 숨김.

**표시 레이어**

- `roads` (회색 단순 선)
- `water` (옅은 파랑)
- `landuse_school` (학교 부지 강조)
- `boundaries_admin` (행정경계, 점선)
- `place_labels_minimal` (동/마을 이름만, 가게 이름 X)

**숨김 레이어**

- POI 전체 (`poi_*`)
- 상업 시설 (`commerce_*`)
- 빌딩 라벨

스타일 JSON은 `/public/map-styles/ko.json`에서 직접 관리. 디자이너가 색상 토큰 변경 시 여기만 수정.

### 2.3 컴포넌트 구조

```
components/map/
├── MapCanvas.tsx              MapLibre 인스턴스 + ref 노출
├── PinLayer.tsx               Firestore 데이터 → GeoJSON Source
├── PinMarker.tsx              개별 핀 렌더 (이모지/아이콘)
├── PinCluster.tsx             줌 아웃 시 클러스터링
├── RadiusOverlay.tsx          학교 반경 시각화
├── LayerToggle.tsx            카테고리 on/off UI
├── LayerFilterPanel.tsx       사이드바 컨테이너
└── MapTopbar.tsx              줌/리셋/스크린샷 버튼
```

## 3. 카테고리 레이어 시스템

### 3.1 레이어 데이터 모델

데이터는 `docs/architecture/data-model.md`의 `Layer` 인터페이스 참조.

### 3.2 클라이언트 상태 (Zustand)

```typescript
// stores/mapStore.ts
interface MapState {
  visibleLayerIds: Set<string>;
  highlightedLayerId: string | null;
  studentMode: boolean;
  todayLayers: string[];       // 교사가 학생에게 노출할 레이어
  
  toggleLayer: (id: string) => void;
  setStudentMode: (on: boolean) => void;
  setTodayLayers: (ids: string[]) => void;
}
```

### 3.3 토글 동작

1. 사용자가 체크박스 클릭
1. Zustand 상태 갱신
1. MapLibre Source에 `setFilter()` 호출하여 즉시 반영
1. URL 쿼리스트링도 동기화 (`?layers=public,heritage`) — 공유/북마크용

### 3.4 “오늘의 수업” 모드

교사가 미리 설정 → 학생 화면에서는 그 레이어만 보임.

```
[교사 패널]
오늘 보여줄 레이어:
☑ 공공기관
☐ 명소
☐ 상점
☑ 안전 시설
☐ 문화재
☐ 자연환경

[적용 → 학생 모드 시작]
```

학생 화면에서는 레이어 토글 UI 자체가 숨겨짐. 집중 환경 보장.

## 4. UI 상세

### 4.1 데스크탑 레이아웃 (교사 메인)

```
┌────────────────────────────────────────────────────────┐
│ [학동초] ▼   2026학년도 ▼      [🔔][⚙️][프로필]        │
├──────┬─────────────────────────────────────┬───────────┤
│ 레이어│                                     │  속성패널  │
│      │                                     │           │
│ ☑ 🏛️ │       (지도)                         │  ─        │
│   공공│         🏛️    🌳                    │  핀을     │
│ ☑ 🌳 │              📍                     │  선택     │
│   명소│         🏪         🏥               │  하세요   │
│ ☐ 🏪 │                                     │           │
│   상점│      ◯ 500m 반경                    │           │
│ ☐ 🛡️ │                                     │           │
│   안전│                                     │           │
│      │                                     │           │
│ + 레이어│                                   │           │
│      │                                     │           │
├──────┴─────────────────────────────────────┴───────────┤
│ [핀 추가] [AI 설명] [PDF 출력] [학생 모드] [공유]       │
└────────────────────────────────────────────────────────┘
```

### 4.2 태블릿/모바일 레이아웃

- 사이드바는 `Sheet` (좌측 슬라이드).
- 속성 패널은 하단 `Drawer`.
- 지도 전체화면 우선.

### 4.3 학생 모드 UI

- 레이어 토글 숨김.
- 핀 추가 버튼은 큰 FAB (Floating Action Button).
- 색상 강조, 큰 글씨, 단순한 워딩 (“우리 동네에 새 장소 알려주기”).

## 5. 핀 표시 로직

### 5.1 줌 레벨별 동작

|줌 레벨 |동작           |
|-----|-------------|
|0~10 |핀 숨김 (너무 멀음) |
|11~14|클러스터 (숫자만 표시)|
|15~18|개별 핀 + 이모지   |
|19+  |핀 + 이름 라벨    |

### 5.2 핀 스타일

- 모양: 원형 배지 + 이모지 또는 SVG 아이콘.
- 색상: `layer.color` 사용.
- 학생 입력 대기 중인 핀: 점선 테두리.

### 5.3 핀 클릭 동작

- 데스크탑: 우측 속성 패널 열림.
- 모바일: 하단 시트 슬라이드 업.
- 더블클릭: 편집 모드.

## 6. 반경 오버레이

학교 중심에서 `tenant.radius` 반경을 원형으로 시각화.

- 색상: tenant.branding.primaryColor || 기본 파랑.
- 반경 밖 영역은 약간 어둡게 (vignette).
- 토글 가능 (기본 표시).

## 7. 성능 고려사항

### 7.1 핀 수 폭발 방지

- 단일 Tenant당 핀 5,000개 소프트 한도.
- 초과 시 클러스터링 강제 + 우선순위 낮은 레이어 lazy load.

### 7.2 타일 캐싱

- Vercel Edge에서 `.pmtiles` 청크 무한 캐싱.
- 클라이언트 IndexedDB에 최근 본 타일 저장.

### 7.3 Firestore 쿼리 최적화

- 뷰포트 변경 시 디바운스 300ms.
- GeoHash prefix 검색으로 불필요한 핀 페치 방지.
- 레이어 visible 변경은 클라이언트 필터링 (재요청 X).

## 8. 접근성

- 모든 핀은 키보드 Tab으로 순회 가능.
- 색맹 대응: 색상 외 모양(이모지)으로도 카테고리 구분.
- 화면 낭독기 ARIA 라벨: 핀 이름 + 카테고리 + “상세보기”.

## 9. 엣지 케이스

|케이스                 |처리                                     |
|--------------------|---------------------------------------|
|인터넷 연결 끊김           |마지막 본 타일 + 핀으로 fallback. “오프라인 모드” 배너. |
|사용자가 반경 밖으로 스크롤     |허용하되, 핀은 반경 안에만. UI에 “반경 밖을 보고 있어요” 표시.|
|일본 Tenant인데 위치가 한국  |시드 어댑터 자동 감지 + 경고 모달.                  |
|백지도 .pmtiles 다운로드 실패|OSM 폴백 타일로 자동 전환.                      |

## 10. 분석 이벤트

- `map.opened`
- `layer.toggled` (props: layerId, visible)
- `pin.clicked` (props: pinId, layerId, fromCluster)
- `studentMode.enabled` / `studentMode.disabled`