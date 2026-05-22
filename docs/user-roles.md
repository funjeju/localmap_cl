# Feature: User Roles & Permissions

> 4가지 역할 (admin / teacher / student / parent) 의 권한, UI 분기, 인증 방식.

## 1. 역할 정의

|역할       |정의                          |예시                      |
|---------|----------------------------|------------------------|
|`admin`  |Tenant 전체 관리. 결제, 멤버 초대, 설정.|학교 정보부장, 교무부장, 교회 관리자   |
|`teacher`|핀 생성/승인, 프로젝트 운영, 출력.       |담임/전담 교사, 관광 큐레이터, 교회 리더|
|`student`|핀 제안 (검증 큐 경유), 자기 핀 편집.    |초·중·고 학생                |
|`parent` |자녀가 만든 핀 + 공개 핀 열람.         |학부모                     |
|`viewer` |공개 핀만 열람 (인증 불필요).          |학교 방문자, 관광객             |

추가 역할:

- `superadmin` — 플랫폼 운영자. 모든 Tenant 접근. (Anthropic 직원 비유)

## 2. 권한 매트릭스 (마스터)

|리소스 / 작업             |superadmin|admin|teacher|student|parent|viewer|
|---------------------|----------|-----|-------|-------|------|------|
|Tenant 생성            |✓         |-    |-      |-      |-     |-     |
|Tenant 설정 변경         |✓         |✓    |-      |-      |-     |-     |
|Tenant 결제            |✓         |✓    |-      |-      |-     |-     |
|멤버 초대/제거             |✓         |✓    |✓ (학생만)|-      |-     |-     |
|Layer 생성/수정          |✓         |✓    |✓      |-      |-     |-     |
|Pin 조회 (active)      |✓         |✓    |✓      |✓      |공개만   |공개만   |
|Pin 조회 (pending)     |✓         |✓    |✓      |본인만    |-     |-     |
|Pin 생성 (즉시 active)   |✓         |✓    |✓      |-      |-     |-     |
|Pin 생성 (pending)     |-         |-    |-      |✓      |-     |-     |
|Pin 수정 (타인)          |✓         |✓    |✓      |-      |-     |-     |
|Pin 수정 (본인 pending)  |✓         |✓    |✓      |✓      |-     |-     |
|Pin 승인/거부            |✓         |✓    |✓      |-      |-     |-     |
|Pin 아카이브             |✓         |✓    |✓      |-      |-     |-     |
|이력 조회                |✓         |✓    |✓      |-      |-     |-     |
|AI 호출                |✓         |✓    |✓      |제한적    |-     |-     |
|Export 생성 (학습지/포스터/책)|✓         |✓    |✓      |-      |-     |-     |
|Export 생성 (학교평가 리포트) |✓         |✓    |-      |-      |-     |-     |
|사용량 조회               |✓         |✓    |본인 한도만 |-      |-     |-     |
|학부모 포털 접근            |✓         |✓    |✓      |-      |✓     |-     |

## 3. 인증 방식

### 3.1 교사 / 관리자

**이메일 + 비밀번호** 또는 **소셜 로그인** (Google, Apple).

향후 Enterprise:

- NEIS SSO (한국)
- Microsoft Entra ID (학교 도메인)
- Google Workspace for Education

### 3.2 학생

**임시 코드 로그인** 권장. 이메일 수집은 개인정보 부담.

```
[교사] 학급 코드 생성 → "ABC-123" 표시
[학생] 앱 접속 → "코드 입력" → "ABC-123" + 이름
[시스템] 익명 사용자 생성 + Custom Claim (role: student, tenantId, classId)
```

- 코드는 24시간 유효 또는 교사가 명시 만료.
- 학생 계정은 학교 졸업 시 자동 익명화/아카이브.

### 3.3 학부모

**자녀 코드 + 본인 이메일**.

```
[교사] 학기 초 학생별 학부모 코드 발급 → 가정통신문으로 전달
[학부모] 앱 접속 → 코드 + 이메일 입력
[시스템] parent 역할 + parentOf: [studentId] 자동 연결
```

### 3.4 공개 진입 (viewer)

QR 또는 URL → 인증 없이 공개 핀만 열람.

## 4. Firebase Auth Custom Claims 구조

```typescript
// 사용자 생성/멤버십 변경 시 Cloud Function이 자동 설정
{
  tenantMemberships: {
    "tenantId1": { role: "teacher", classIds: ["3-1", "3-2"] },
    "tenantId2": { role: "viewer" }
  },
  isSuperAdmin: false
}
```

토큰 크기 한도 (1000 bytes) 주의. 5개 이상 Tenant 멤버십을 가진 사용자는 별도 처리.

## 5. Security Rules 패턴

```javascript
// firestore.rules (요지)

function isTenantMember(tenantId) {
  return request.auth != null
    && request.auth.token.tenantMemberships[tenantId] != null;
}

function hasRole(tenantId, role) {
  return isTenantMember(tenantId)
    && request.auth.token.tenantMemberships[tenantId].role == role;
}

function hasAnyRole(tenantId, roles) {
  return isTenantMember(tenantId)
    && request.auth.token.tenantMemberships[tenantId].role in roles;
}

match /tenants/{tenantId}/pins/{pinId} {
  allow read: if 
    resource.data.status == "active" 
      && isTenantMember(tenantId)
    || resource.data.status == "pending_review"
      && (hasAnyRole(tenantId, ["teacher", "admin"]) 
          || resource.data.createdBy == request.auth.uid);
  
  allow create: if hasAnyRole(tenantId, ["teacher", "admin"])
    && request.resource.data.status == "active"
    || hasRole(tenantId, "student")
      && request.resource.data.status == "pending_review";
  
  allow update: if hasAnyRole(tenantId, ["teacher", "admin"])
    || (hasRole(tenantId, "student") 
        && resource.data.createdBy == request.auth.uid
        && resource.data.status == "pending_review");
  
  allow delete: if false;  // 항상 논리 삭제만
}
```

## 6. UI 모드 분기

### 6.1 교사 UI

기본 Map Studio. 모든 기능 노출. `docs/features/map-and-layers.md` 참조.

### 6.2 학생 UI

- 큰 버튼, 간단한 워딩.
- 레이어 토글 숨김 (교사가 설정한 “오늘의 레이어”만).
- 핀 추가는 FAB.
- 자신의 pending 핀 상태 명확히 표시.

### 6.3 학부모 UI

- 자녀가 만든 핀 모음 + 공개 핀.
- 사진/음성 인터뷰 갤러리.
- “공유하기” 버튼 (카톡, 메일).
- 학예회 슬라이드 모드.

### 6.4 관리자 UI

- 멤버 관리 페이지.
- 사용량 대시보드.
- 결제 및 플랜.
- Tenant 설정 (브랜딩, 반경 등).

### 6.5 광역 어드민 UI (교육청)

- 산하 학교 목록.
- 학교별 활동량 대시보드.
- 일괄 라이선스 관리.
- `docs/business/multi-vertical.md` 참조.

## 7. 멤버십 라이프사이클

### 7.1 학기 시작 / 종료

- 학년이 바뀔 때 `classId`, `grade` 자동 업데이트 (관리자가 일괄).
- 졸업생은 `status: 'removed'` + Custom Claim 제거.

### 7.2 교사 이동

- 다른 학교로 전근 시 새 Tenant 가입 절차.
- 본인이 만든 산출물은 원 Tenant에 남음.

### 7.3 비활성 사용자

90일 미접속 시 알림. 1년 미접속 시 아카이브.

## 8. 개인정보 처리

### 8.1 최소 수집

- 학생: 이름 + 학급. 이메일/생년월일 X.
- 학부모: 이메일만.
- 사진에 얼굴 노출 시 자동 블러 옵션.

### 8.2 만 14세 미만

한국 개인정보보호법 + 일본 「子どものデジタル個人情報」 가이드라인 준수.

- 학교를 통한 법정대리인 동의 절차.
- 학교가 수집/처리 동의 → 플랫폼은 수탁자 역할.

### 8.3 데이터 삭제 요청

- 본인 또는 법정대리인 요청 시 30일 내 처리.
- 삭제 시 작성한 핀은 익명화 (작성자 필드만 null화, 데이터는 학교 자산으로 유지).

## 9. 엣지 케이스

|케이스                |처리                        |
|-------------------|--------------------------|
|학생이 본인 핀 신고 거부 (편향)|교사 결정 우선, 학생 의견은 코멘트로     |
|학부모가 자녀 핀 부적절 신고   |검토 큐로, 교사가 판단             |
|같은 이메일로 다른 학교 가입   |멀티 멤버십 허용                 |
|교사가 다른 학급 학생 핀 수정  |같은 Tenant 내에서는 허용 (협업)    |
|학생이 졸업 후 자기 핀 접근   |졸업 후 60일까지 읽기 가능, 이후 학교 자산|

## 10. 분석 이벤트

- `user.signedUp` (props: role)
- `user.invited`
- `user.joined`
- `user.classCode.used`
- `parent.qrAccessed`
- `viewer.publicPinViewed`