# Feature: Pin Management

> 핀 추가/수정/삭제, 실시간 협업, 변경 이력 추적. 제품의 일상적 사용성이 결정되는 영역.

## 1. 핀 라이프사이클

```
[생성]
  │
  ├─ 교사가 직접 추가 → status: active (즉시 표시)
  ├─ 학생이 추가 → status: pending_review (검증 대기)
  ├─ 공공 API 시드 → status: active, source: public_api
  └─ AI 분류 추천 → 사용자 확정 후 active
       │
       ▼
[검증]
  │
  ├─ 교사 승인 → active
  └─ 교사 거부 → rejected (사유 필수)
       │
       ▼
[수정] (반복 가능)
  │
  └─ 모든 변경은 history 서브컬렉션에 자동 스냅샷
       │
       ▼
[보관/삭제]
  │
  ├─ archived (논리 삭제, 복구 가능)
  └─ 물리 삭제는 GDPR 요청 시에만
```

## 2. 핀 추가 흐름

### 2.1 교사 추가 (지도 클릭 방식)

1. 교사가 지도 위 위치 클릭
1. 컨텍스트 메뉴 또는 즉시 편집 패널 오픈
1. 카테고리 선택 → 이름 입력 → 저장
1. 옵션: “AI 설명 자동 생성” 토글
1. Firestore 저장 → 다른 사용자에게 실시간 표시

### 2.2 학생 추가 (간소화 UI)

1. 큰 FAB “여기에 알려주기” 탭
1. 위치 확인 화면 → 드래그로 미세 조정
1. 사진 촬영 (선택)
1. 이름 입력 (음성도 가능)
1. 교사 검증 큐로 자동 진입

### 2.3 사진 기반 추가 (AI 활용)

1. 학생이 사진 업로드
1. Claude Vision → 카테고리 자동 추천
1. 위치는 GPS 또는 학생이 지도에서 지정
1. 검증 큐로

## 3. 편집 패널 UI

```
┌─────────────────────────────────────────┐
│  주민센터          [⋯ 더보기]   [닫기]    │
├─────────────────────────────────────────┤
│  [공공기관 ▼]                            │
│                                         │
│  이름                                    │
│  [ 학동주민센터                       ]   │
│                                         │
│  설명                                    │
│  [ 우리 동네 사람들이 민원을 보러     ]   │
│  [ 가는 곳이에요. 등본도 떼고...      ]   │
│  ✨ AI가 도와드릴까요? [생성]             │
│                                         │
│  사진 (3/5)                              │
│  [📷] [📷] [📷] [+]                     │
│                                         │
│  음성 메모                               │
│  [🎙 녹음 시작]                          │
│                                         │
│  변경 이력 (3건)  >                      │
│                                         │
│  [저장]  [취소]  [삭제]                   │
└─────────────────────────────────────────┘
```

shadcn: `Sheet`, `Select`, `Textarea`, `Button`, `Badge`.

## 4. 실시간 협업

### 4.1 동시 편집 처리

- 동시 편집 시 Last Write Wins (Firestore 기본).
- 단, UI에서 “다른 사용자가 이 핀을 편집 중입니다” 배너 표시.
- 구현: `tenants/{id}/pins/{id}/editing` 임시 도큐먼트 + 30초 TTL.

### 4.2 실시간 핀 도착 표시

다른 학생이 추가한 핀이 내 지도에 fade-in으로 나타남.

```typescript
// components/map/PinStream.tsx (재인용)
onSnapshot(query, (snap) => {
  snap.docChanges().forEach(change => {
    switch (change.type) {
      case 'added': animatePinIn(change.doc); break;
      case 'modified': updatePin(change.doc); break;
      case 'removed': animatePinOut(change.doc); break;
    }
  });
});
```

### 4.3 커서/포인터 공유 (선택 기능)

- 같은 Tenant + 같은 프로젝트의 다른 사용자 마우스 위치 표시.
- Realtime Database (Firestore 아닌) 사용. 비용/성능 고려.
- Premium 플랜 기능.

## 5. 학생 입력 검증 큐

### 5.1 큐 화면 (교사용)

```
┌──────────────────────────────────────────┐
│  검증 대기 중인 학생 입력 (12)            │
├──────────────────────────────────────────┤
│                                          │
│ ┌────────────────────────────────────┐   │
│ │ [3-2반] 김OO이 추가한 핀           │   │
│ │ 분식집 "맛나분식"                   │   │
│ │ [지도에서 보기]                     │   │
│ │ 📷 사진 1장                         │   │
│ │ "여기 떡볶이가 맛있어요"             │   │
│ │                                    │   │
│ │ [✓ 승인]  [✗ 거부]  [✏ 수정 후 승인] │   │
│ └────────────────────────────────────┘   │
│                                          │
│ ┌────────────────────────────────────┐   │
│ │ [3-1반] 박OO이 추가한 핀           │   │
│ │ ...                                │   │
│ └────────────────────────────────────┘   │
└──────────────────────────────────────────┘
```

### 5.2 일괄 승인

여러 학생 핀을 체크박스로 일괄 승인. 자주 사용되는 패턴.

### 5.3 학생 알림

- 승인 시: “당신의 핀이 우리 동네 지도에 추가되었어요! 🎉”
- 거부 시: 사유 메시지 + 재시도 가이드.

## 6. 변경 이력 (History)

### 6.1 자동 기록

모든 PATCH 작업은 Cloud Function `onUpdate(pins/{id})`가 자동으로 history 생성.

```typescript
// functions/pins/onUpdate.ts
export const recordPinHistory = onDocumentUpdated(
  'tenants/{tenantId}/pins/{pinId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const diff = computeDiff(before, after);
    
    if (Object.keys(diff).length === 0) return;
    
    await db.collection(`tenants/${event.params.tenantId}/pins/${event.params.pinId}/history`)
      .add({
        version: (after.version || 0) + 1,
        changeType: inferChangeType(diff),
        changedFields: diff,
        previousSnapshot: pickFields(before, Object.keys(diff)),
        changedBy: after.lastModifiedBy,
        changedAt: FieldValue.serverTimestamp()
      });
  }
);
```

### 6.2 변천사 타임라인 UI

핀 우측 패널의 “변경 이력” 클릭 시:

```
┌──────────────────────────────────────┐
│  학동주민센터의 변화                 │
├──────────────────────────────────────┤
│  ⬤ 2026.05.10 | 위치 이동             │
│    "옆 건물로 이전됨"                │
│    by 김선생                         │
│  │                                   │
│  ⬤ 2025.11.02 | 설명 추가             │
│    by 박선생                         │
│  │                                   │
│  ⬤ 2025.03.15 | 생성                  │
│    공공 API에서 자동 추가             │
└──────────────────────────────────────┘
```

### 6.3 동네 변천사 (전체)

Tenant 단위로 모든 핀의 변경을 시간순으로 보는 화면. “역사 수업” 자료로 활용.

- 필터: 기간, 변경 유형, 카테고리.
- Export: PDF 또는 슬라이드.

## 7. 핀 검색 및 필터링

### 7.1 검색

상단 검색바 (cmd+K).

```
┌──────────────────────────────────────┐
│ 🔍 핀 검색  ───────────  [cmd+K]      │
├──────────────────────────────────────┤
│  최근 검색                            │
│  • 분식집                             │
│  • 도서관                             │
│                                      │
│  카테고리                             │
│  • 공공기관 (12)                      │
│  • 명소 (8)                           │
└──────────────────────────────────────┘
```

shadcn `Command` 컴포넌트.

### 7.2 필터

- 레이어 (다중)
- 상태 (active / pending_review / archived)
- 출처 (manual / public_api / student)
- 프로젝트 (학년도)
- 생성자 (학급/개인)
- 기간

## 8. 일괄 작업

교사용 기능.

- 일괄 카테고리 변경
- 일괄 아카이브
- 일괄 프로젝트 귀속
- CSV/Excel 가져오기/내보내기

## 9. 코멘트

핀에 코멘트 다는 기능. 학생-교사 피드백 채널.

```typescript
// tenants/{id}/pins/{id}/comments/{commentId}
{
  text: string,
  author: userId,
  createdAt: Timestamp,
  resolved: boolean
}
```

Premium 기능.

## 10. 권한 매트릭스

|작업              |admin|teacher|student    |parent|viewer|
|----------------|-----|-------|-----------|------|------|
|핀 조회 (active)   |✓    |✓      |✓          |공개만   |공개만   |
|핀 조회 (pending)  |✓    |✓      |본인만        |✗     |✗     |
|핀 생성 (즉시 active)|✓    |✓      |✗          |✗     |✗     |
|핀 생성 (pending)  |-    |-      |✓          |✗     |✗     |
|핀 수정            |✓    |✓      |본인 pending만|✗     |✗     |
|핀 승인/거부         |✓    |✓      |✗          |✗     |✗     |
|핀 아카이브          |✓    |✓      |✗          |✗     |✗     |
|이력 조회           |✓    |✓      |✗          |✗     |✗     |
|일괄 작업           |✓    |✓      |✗          |✗     |✗     |

## 11. 엣지 케이스

|케이스               |처리                                            |
|------------------|----------------------------------------------|
|학생이 같은 위치에 중복 핀 추가|반경 10m 내 동일 카테고리 핀 존재 시 경고 모달                 |
|부적절한 사진 업로드       |Cloud Function에서 Claude Vision으로 자동 필터 + 교사 알림|
|음성 메모 너무 김        |최대 60초 제한                                     |
|핀 위치가 반경 밖        |저장 거부 (서버 검증)                                 |
|동시 편집 충돌          |LWW + UI에 “다른 사용자가 편집 중” 배너                   |
|시드 핀을 학생이 잘못 수정   |원본 보존 (history) + 복구 버튼                       |

## 12. 분석 이벤트

- `pin.created` (props: source, layerId, hasImage, hasAudio)
- `pin.approved`, `pin.rejected`
- `pin.edited` (props: changedFields)
- `pin.archived`
- `student.pinSubmitted`, `student.pinApproved`