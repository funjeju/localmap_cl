# LocalMap — To-Do / Unimplemented Features

**Status**: As of 2026-05-24

This document lists all features, endpoints, and functionality described in the documentation that have not yet been implemented.

---

## Phase 1: MVP Foundation (Core Map Functionality)

### Tenant Management
- [ ] **Tenant Creation & Registration**
  - Location: `app/api/tenant/create` (route stub needed)
  - Frontend: Tenant creation form with address input, school type selection
  - Backend: Geopoint calculation, automatic system layer generation
  - Seeding: Trigger seed job pipeline (but actual seeding in Phase 2)
  - Firestore schema: Create tenants/{tenantId} document

- [ ] **Tenant Settings Panel**
  - Admin-only interface for branding, radius, feature flags
  - Endpoint: PATCH `/api/tenant/:id/settings`
  - UI: Settings modal/page in admin dashboard

- [ ] **Tenant Seed Status Polling**
  - Endpoint: GET `/api/tenant/:id/seedStatus`
  - Return job status and progress percentage
  - Real-time update UI while seeding

### Pin Management (Core CRUD)
- [ ] **Pin Creation**
  - Endpoint: POST `/api/pin`
  - Frontend: Click-on-map context menu → edit panel
  - Auto-calculate geohash
  - Status: 'active' (teacher) or 'pending_review' (student)
  - Firestore write + history auto-trigger

- [ ] **Pin Update**
  - Endpoint: PATCH `/api/pin/:id`
  - Field changes tracked in history/{versionId}
  - Real-time sync to map

- [ ] **Pin Delete (Logical)**
  - Endpoint: DELETE `/api/pin/:id`
  - Set status: 'archived' (no physical deletion)

- [ ] **Pin Search**
  - Endpoint: GET `/api/pin/search`
  - Query params: tenantId, bounds, layerIds, status, projectId
  - GeoHash-based spatial filtering
  - Return max 500 results with clustering info

- [ ] **Pin History Endpoint**
  - Endpoint: GET `/api/pin/:id/history`
  - Return array of PinHistory documents
  - Used for timeline UI

### Student Pin Validation Queue
- [ ] **Student Pin Submission**
  - Students can create pins with status 'pending_review'
  - Cannot directly create 'active' pins
  - Firestore: `tenants/{id}/pins/{id}` with status field

- [ ] **Validation Queue UI (Teacher)**
  - Component: `components/queue/PinValidationQueue.tsx`
  - List of pending_review pins
  - Show student name, class, photo, description
  - Actions: Approve, Reject (with reason), Edit & Approve
  - Batch approval checkbox

- [ ] **Pin Approval Endpoint**
  - Endpoint: POST `/api/pin/:id/approve`
  - Change status 'pending_review' → 'active'
  - Trigger student notification

- [ ] **Pin Rejection Endpoint**
  - Endpoint: POST `/api/pin/:id/reject`
  - Require rejection reason
  - Trigger student notification with feedback

### Authentication
- [ ] **Firebase Auth Setup**
  - Email/password + Google/Apple Sign-in
  - Custom Claims for role-based access

- [ ] **Teacher Login**
  - Email + password or social sign-in
  - Dashboard redirect

- [ ] **Student Temporary Code Login**
  - Teacher generates class code (e.g., "ABC-123")
  - Student enters code + name
  - Firebase anonymous auth + Custom Claims
  - Code expires after 24h or teacher revokes

- [ ] **Parent Login**
  - Parent code (from teacher) + email
  - Links to child tenantMemberships

### Layer Management
- [ ] **System Layers Auto-generation**
  - Tenant creation triggers creation of 6 system layers:
    - `public_facility` (🏛️ 공공기관)
    - `landmark` (🌳 명소)
    - `commerce` (🏪 상점)
    - `safety` (🛡️ 안전)
    - `heritage` (🏯 문화재)
    - `nature` (🌲 자연)

- [ ] **Custom Layer Creation**
  - Endpoint: POST `/api/layer`
  - User input: name (LocalizedText), icon, color, order
  - Firestore: `tenants/{id}/layers/{layerId}`

- [ ] **Layer Update**
  - Endpoint: PATCH `/api/layer/:id`
  - Modify name, icon, color, order, visibility

- [ ] **Layer Delete (Logical)**
  - Endpoint: DELETE `/api/layer/:id`
  - Set isVisible: false (preserve data)

- [ ] **Layer Visibility Endpoint**
  - Endpoint: POST `/api/layer/:id/visibility`
  - Server-side toggle (for "오늘의 수업" mode)

### User & Membership
- [ ] **User Creation from Invite**
  - Endpoint: POST `/api/user/invite`
  - Batch invite teachers/students/parents
  - Generate temporary codes for students
  - Send invite emails to teachers

- [ ] **Class Code Login**
  - Endpoint: POST `/api/user/joinByCode`
  - Student enters class code
  - System creates user + tenantMembership

- [ ] **Current User Endpoint**
  - Endpoint: GET `/api/user/me`
  - Return user + all tenantMemberships
  - Update Custom Claims if needed

- [ ] **Membership Lifecycle**
  - Track joinedAt, status ('active'/'invited'/'removed')
  - Auto-archive after 1 year inactivity

---

## Phase 2: Automation & Completeness (AI + Export + Parent Portal)

### AI Features
- [ ] **Description Generation (AI Describe)**
  - Endpoint: POST `/api/ai/describe`
  - Input: tenantId, pinId, locale, targetGrade
  - Output: AI-generated 2-3 sentence description (초등 수준)
  - System prompt: Friendly, simple language, no marketing
  - Caching: Cache by (pinId, locale)
  - Cost guard: Check tenant's monthly quota
  - Response: Cached or freshly generated text
  - Fallback: Template text if API fails

- [ ] **Photo Classification (AI Classify)**
  - Endpoint: POST `/api/ai/classify`
  - Input: imageUrl, tenantId
  - Claude Vision: Analyze photo → suggest layer + confidence
  - Output: suggestedLayerId, confidence (0-1), alternatives
  - Reject inappropriate images (faces, private space, etc.)
  - Auto-delete rejected photos

- [ ] **Auto-translation (Translate)**
  - Endpoint: POST `/api/ai/translate`
  - Input: text (LocalizedText), targetLocales
  - Output: Translated LocalizedText
  - Premium feature: Auto-fill missing locales after pin save
  - Context-aware (e.g., "주민센터" → "Hakdong Community Center" not just direct translation)

- [ ] **AI Quota System**
  - Track monthly AI calls per tenant
  - Enforce plan limits (Trial: 50, Basic: 200, Standard: 1,000, Premium: 5,000)
  - UI: Show usage meter ("이번 달 AI 사용량: 234 / 1,000회")
  - Prevent calls when limit exceeded

- [ ] **AI Result Caching**
  - Store describe/translate results in pins document
  - Check cache before API call
  - Force regeneration with `force: true` flag

### PDF Export
- [ ] **Export Queue System**
  - Endpoint: POST `/api/export/pdf`
  - Input: tenantId, projectId, templateKey, locale, options
  - Create exports/{exportId} document with status 'queued'
  - Cloud Function trigger: onWrite → render PDF
  - Response: { exportId, status: 'queued' }

- [ ] **Export Status Polling**
  - Endpoint: GET `/api/export/:id`
  - Return: { status, downloadUrl?, expiresAt? }
  - Client polls every 5s until 'completed'

- [ ] **Yearbook Template ("우리 동네 책")**
  - 32-64 pages PDF
  - Pages:
    - Cover (학교명, 학년, 연도)
    - Greeting (교사 작성 또는 AI 초안)
    - Overview map (학교 중심, 모든 핀, 통계)
    - Layer sections (6+ pages each, 핀당 1-2p with photos)
    - Timeline (변경 이력, 신규/폐지 장소)
    - Contributors (학생별 기여도)
    - Closing page
  - Render map using Playwright → PNG → embed in PDF
  - React-PDF layout with Tenant branding colors
  - Font: Pretendard (ko), Noto Sans JP (ja), Inter (en)
  - Souvenir time: 60-120 seconds

- [ ] **A3 Poster Template**
  - Single-page printable poster
  - Large map + pins + category legend
  - Student names in small grid (optional)
  - Color/B&W option
  - Export formats: A3, A2, A1
  - Time: 15-30 seconds

- [ ] **Worksheet Template**
  - Curriculum-aligned (사회 3-1-1, etc.)
  - Blank map + fill-in activities
  - B&W for printing
  - 예: "우리 고장의 장소 표시하기", "카테고리별 칠하기"
  - Pre-built template library by grade

- [ ] **School Evaluation Report**
  - Admin-only export
  - Metrics: Active teachers/students, total pins, student-created pins, category distribution
  - Charts: Monthly activity (Recharts), change history, AI usage
  - 5-10 pages, professional design
  - Time: 10-20 seconds

- [ ] **Parent Newsletter**
  - A4 1-2 pages
  - Semester summary + QR to parent portal
  - Student photo gallery (if public)
  - Auto-send or teacher-triggered
  - Localized template per locale

- [ ] **Export Caching**
  - Cache by (projectId, templateKey, locale)
  - Invalidate cache on pin/project changes
  - Instant delivery on re-request

### Parent Portal
- [ ] **Public Pin Listing**
  - Endpoint: GET `/api/public/tenant/:slug/pins`
  - Return pins with isPublic: true
  - No auth required

- [ ] **Tenant Public Info**
  - Endpoint: GET `/api/public/tenant/:slug`
  - Return name, location, public description
  - No auth required

- [ ] **Parent Portal UI**
  - Route: `/public/[slug]` or `/parent/[parentCode]`
  - Display child's pins + public pins
  - Photo gallery
  - Share via KakaoTalk / Email
  - Slideshow mode for parents

- [ ] **Parent QR Code**
  - Generate QR → `/public/tenant/[slug]`
  - Share in parent letter/class portal
  - No authentication needed

### Change History & Timeline
- [ ] **History Auto-recording**
  - Cloud Function: onDocumentUpdated(pins/{id})
  - Compute diff between before/after
  - Create history/{versionId} document
  - Track: changeType, changedFields, changedBy, changedAt

- [ ] **Pin History UI**
  - Component: `components/pin/PinHistoryTimeline.tsx`
  - Show vertical timeline of changes
  - "2026.05.10 | 위치 이동" → "옆 건물로 이전됨"
  - Filter by change type
  - Show author and timestamp

- [ ] **Town Changes Timeline**
  - Global view of all pin changes in Tenant
  - Group by month/year
  - Filter: date range, change type, category
  - Export as PDF/slides for history lessons

### Search & Filtering
- [ ] **Global Pin Search (cmd+K)**
  - Frontend: shadcn Command component
  - Input: Search text
  - Return: Recent searches, category breakdown
  - Quick access to pins by name/description

- [ ] **Pin Filter Panel**
  - Filter by: Layer (multi), status, source, project, student, date range
  - Real-time list update
  - Show matching pin count

- [ ] **Batch Operations**
  - Select multiple pins → bulk actions
  - Actions: Change category, archive, assign to project, export
  - CSV export/import for bulk pin management

---

## Phase 3: Internationalization & Multi-Vertical

### i18n Infrastructure
- [ ] **next-intl Integration**
  - Middleware: `middleware.ts` with next-intl
  - Route structure: `/[locale]/(public)/(auth)/(tenant)/...`
  - Locale prefix always (e.g., `/ko/...`)

- [ ] **Message Catalogs**
  - Files: `messages/{ko,ja,en}.json`
  - Namespace structure: common.save, tenant.create.title, etc.
  - ICU MessageFormat for plurals/numbers
  - Build-time validation script

- [ ] **Component Translation**
  - Server: `getTranslations()` hook
  - Client: `useTranslations()` hook
  - No hardcoded strings
  - Absolute ban on `locale === 'ko' ? '...' : '...'` patterns

- [ ] **LocalizedText Everywhere**
  - Data model: All user strings in { ko?, ja?, en? } format
  - Firestore: Store and retrieve correctly
  - Helper: `pickLocalized(text, userLocale, tenantLocale)`
  - UI: Show ✨ badge when translation missing

- [ ] **Font Management**
  - Tailwind config: font-ko, font-ja, font-en
  - Auto-apply based on locale
  - PDF fonts: Pretendard, Noto Sans JP, Inter
  - Fallback: Noto Sans CJK

- [ ] **Date/Number Formatting**
  - date-fns locale per user locale
  - Intl.NumberFormat for currency
  - 예: "2026년 5월 22일" (ko) vs "2026年5月22日" (ja)

- [ ] **Address Formatting**
  - Locale-aware address parts assembly
  - 예: "강남구 학동로" (ko) vs "東京都渋谷区" (ja)

- [ ] **School Year Calendar**
  - Korea: Start March (학년도 = 3월~2월)
  - Japan: Start April (令和8年度 = 4月~3月)
  - Selector by tenant locale

### Multi-Vertical Strategy
- [ ] **Vertical Strategy Pattern**
  - Abstract interface: `VerticalStrategy`
  - Implementations: `ElementarySchoolKR`, `TourismKR`, `ChurchKR`, `CommunityKR`, `ElementarySchoolJA`, etc.
  - Scope: Seed adapters, layer defaults, validation rules, UI customization

- [ ] **Elementary School Vertical**
  - Extract all school-specific logic into strategy
  - Default layers: Public facility, Landmark, Commerce, Safety, Heritage, Nature
  - Features: Student mode, parent portal, curriculum tags

- [ ] **Tourism Vertical**
  - Different layer schema: Tourist attractions, restaurants, museums, etc.
  - Multi-language QR signage export
  - Tourist viewer mode (no auth)
  - Course recommendation (routing)

- [ ] **Church Vertical**
  - Privacy-focused: No student/minor data
  - Fellowship/group tours
  - Service locations, community events

- [ ] **Documentation: "Adding a New Vertical"**
  - Guide with step-by-step instructions
  - Example: Empty shell strategy template

### Seed Adapters (Phase 3+)
- [ ] **Korea: Public Facilities (행안부)**
  - Endpoint: POST `/api/seed/publicFacility`
  - Data source: Public data portal
  - Adapter class: `PublicFacilityAdapter`
  - Creates pins with source: 'public_api'

- [ ] **Korea: Cultural Heritage (문화재청)**
  - Endpoint: POST `/api/seed/culturalHeritage`
  - Data source: Cultural Heritage API
  - Adapter: `CulturalHeritageAdapter`

- [ ] **Korea: Safety Facilities**
  - Endpoint: POST `/api/seed/safety`
  - Data source: Safety data (어린이보호구역, AED, etc.)
  - Adapter: `SafetyAdapter`

- [ ] **Japan: GSI Geocoding**
  - Endpoint: Uses Kakao equivalent
  - Adapter: `GSIGeocoder`
  - API: 国土地理院 地名検索

- [ ] **Japan: Public Facilities (KSJ)**
  - Endpoint: POST `/api/seed/ksjPublicFacility`
  - Data: 国土数値情報 (GIS format)
  - Adapter: `KSJAdapter`

- [ ] **Japan: Cultural Heritage (オンライン)**
  - Data: 文化財オンライン
  - Adapter: `JapaneseHeritageAdapter`

- [ ] **OSM Fallback**
  - Overpass API querying
  - Adapter: `OSMAdapter`
  - Used when regional APIs unavailable

- [ ] **Seed Job Queue Management**
  - Cloud Scheduler for daily retry
  - Status tracking: queued → running → completed/failed/partial
  - Error logging + email alerts

### Geolocation & Address
- [ ] **Kakao Local Geocoding**
  - Helper: `geocodeKakao(address)`
  - Returns: GeoPoint { lat, lng, geohash }
  - Used in: Tenant creation, pin manual placement

- [ ] **GSI Geocoding (Japan)**
  - Helper: `geocodeGSI(address)`
  - Alternative for Japanese addresses

- [ ] **Fallback to Nominatim**
  - Helper: `geocodeNominatim(address)`
  - Used if primary geocoder fails

- [ ] **Reverse Geocoding**
  - Helper: `reverseGeocode(lat, lng)` → Address string
  - Used for: "Your location: ..." display

---

## Phase 4: Business Expansion

### Billing & Payments
- [ ] **Stripe Integration**
  - Setup: Stripe account + API keys
  - Endpoint: POST `/api/billing/checkout`
  - Webhook: POST `/api/billing/webhook/stripe`
  - Card + Apple Pay + Google Pay

- [ ] **토스페이먼츠 Integration**
  - Endpoint: POST `/api/billing/checkout` (toss channel)
  - Webhook: POST `/api/billing/webhook/toss`
  - 간편결제 (네이버페이, 카카오페이, etc.)

- [ ] **S2B 학교장터 Integration**
  - Manual: Submit product to 학교장터
  - Webhook: POST `/api/billing/webhook/s2b`
  - Track: Order → Invoice → Payment → License issuance

- [ ] **Usage Tracking**
  - Document: `tenants/{id}/usage/{yyyymm}`
  - Track: pinsCreated, pinsEdited, aiCalls, exports, storage, activeTeachers, activeStudents
  - Endpoint: GET `/api/billing/usage/:tenantId`

- [ ] **Plan Management**
  - Update tenant.plan on payment
  - Enable/disable features based on plan
  - Feature flags: ai_description, parent_portal, pdf_export, audio_recording, etc.

- [ ] **Billing Webhooks**
  - Parse payment success → Auto-activate license
  - Auto-renewal tracking
  - Churn detection

### Admin Dashboard
- [ ] **Superadmin Panel**
  - View all tenants
  - Impersonate tenant for support
  - Usage aggregate across platform
  - Feature flag toggles globally

- [ ] **School Admin Dashboard**
  - Member management (add/remove/assign roles)
  - Usage current month
  - Plan details + renewal date
  - Activity metrics (pins created, exports generated)
  - Billing history

### Collaboration Features
- [ ] **Real-time Collaborative Editing**
  - Detect: Multiple users editing same pin
  - UI: "다른 사용자가 편집 중..." banner
  - Implement: Last-Write-Wins + optimization

- [ ] **Cursor Sharing (Premium)**
  - Show other users' mouse positions
  - Realtime Database: Store active cursors
  - Fallback: Poll if WebSocket unavailable

- [ ] **Comments on Pins**
  - Firestore: `tenants/{id}/pins/{id}/comments/{commentId}`
  - UI: Comment thread in pin details
  - Notifications: New comment → all contributors

- [ ] **Audio Recording**
  - Record student interview (max 60 seconds)
  - Store in Firebase Storage
  - Transcribe (future: Claude API)
  - Embed in pin details

### Analytics & Monitoring
- [ ] **Analytics Event Pipeline**
  - Logging all user actions (map.opened, pin.created, etc.)
  - Send to analytics backend (Google Analytics / Mixpanel / custom)
  - Endpoint: Could be `/api/analytics/event` or client-side SDK

- [ ] **Event Taxonomy**
  - Define all events per feature doc
  - Examples: pin.created, export.completed, ai.quota.exceeded, etc.

- [ ] **Usage Dashboard**
  - School: See monthly usage trends
  - Platform: Aggregate metrics across schools
  - Charts: Monthly pin creation, export counts, feature usage

---

## Infrastructure & DevOps

### API Infrastructure
- [ ] **Rate Limiting**
  - Pin CRUD: 30 calls/min per user
  - AI endpoints: Monthly quota per tenant
  - Export: 10/day per tenant
  - Public APIs: 60/min per IP
  - Implementation: Upstash or Vercel KV

- [ ] **Error Handling**
  - Standardize response format: `{ ok: true, data } | { ok: false, error }`
  - Error codes: AUTH_REQUIRED, TENANT_QUOTA_EXCEEDED, PIN_NOT_FOUND, etc.
  - Consistent error messages across all endpoints

- [ ] **Idempotency**
  - Mutating APIs accept `Idempotency-Key` header
  - Prevent duplicate operations from retries
  - Store key → result mapping

- [ ] **API Documentation**
  - Swagger/OpenAPI spec (optional)
  - Endpoint reference in code comments

### Cloud Functions
- [ ] **Seed Job Orchestrator**
  - Cloud Function: Triggered by tenant creation
  - Spawn N seed jobs based on tenant.type + locale
  - Track progress in seedJobs collection
  - Handle retries + partial failures

- [ ] **PDF Generation Worker**
  - Cloud Function: Triggered by export creation
  - Dependencies: Playwright, React-PDF
  - Fetch tenant + pin data
  - Render map image (Playwright)
  - Generate PDF → Upload to Storage
  - Update export document status

- [ ] **History Recording Trigger**
  - Cloud Function: onDocumentUpdated(pins/{id})
  - Compute diff + infer changeType
  - Create history/{versionId}
  - Update pin.version counter

- [ ] **User Notification Service**
  - Cloud Function: Send emails on events
  - Events: Pin approved, rejected, new export ready, quota exceeded
  - Template: i18n messages

### Monitoring & Logging
- [ ] **Structured Logging**
  - Log all API calls with: endpoint, userId, duration, status
  - Centralized logging (Cloud Logging / Sentry)
  - Alert on: 5xx errors, slow queries, quota breaches

- [ ] **Health Checks**
  - Endpoint: GET `/api/health`
  - Check: Firebase connectivity, API dependencies, storage
  - Return: { status: 'ok'|'degraded'|'error' }

---

## Testing

### Unit Tests
- [ ] **AI Feature Tests**
  - Mock Claude API
  - Test prompt generation
  - Test caching logic

- [ ] **Store Tests (Zustand)**
  - Test layer toggle state transitions
  - Test map mode switching

- [ ] **Utility Tests**
  - GeoHash encoding/decoding
  - LocalizedText polyfill logic
  - Address formatting by locale

### Integration Tests
- [ ] **E2E Flows**
  - Create tenant → Register teacher → Create layer → Add pin → Export PDF
  - Student flow: Join → Add pin → Teacher approves
  - Parent flow: QR access → View pins → Share

- [ ] **API Tests**
  - POST /api/pin → Verify Firestore write
  - GET /api/pin/search → Verify bounds filtering
  - POST /api/ai/describe → Verify caching

### Visual Regression Tests
- [ ] **Component Snapshot Tests**
  - Prevent unintended UI changes
  - Tool: Chromatic or Percy
  - Focus: Multi-locale rendering

---

## Documentation & Guides

### Developer Guides
- [ ] **Adding a New Vertical** (Detailed instructions)
- [ ] **Adding a New Seed Adapter** (Template + walkthrough)
- [ ] **Extending LocalizedText** (Locale setup guide)
- [ ] **API Integration Guide** (For schools' own systems)

### User Documentation
- [ ] **Teacher Handbook** (Korean / Japanese)
- [ ] **Student Guide** (Simple, visual)
- [ ] **Parent Guide** (Portal features)
- [ ] **Admin Setup Guide** (Tenant creation, member mgmt)

### Legal
- [ ] **Terms of Service** (Multiple locales)
- [ ] **Privacy Policy** (Multiple locales)
  - GDPR compliance
  - Japan 個人情報保護法 compliance
  - Children's privacy (COPPA-equivalent)
- [ ] **Data Processing Agreement** (For schools)

---

## Security & Compliance

### Security
- [ ] **Firebase Security Rules**
  - Fine-grained read/write permissions
  - Role-based access in rules
  - Test: All rule scenarios

- [ ] **API Authentication**
  - All endpoints require Firebase ID token (except public)
  - Validate token in middleware
  - Test: Invalid/expired tokens rejected

- [ ] **Data Encryption**
  - At-rest: Firebase default (AES-256)
  - In-transit: HTTPS only
  - Optional: Enable Firestore CMEK

- [ ] **Image Handling**
  - Scan uploads for malware (Cloud Scan or similar)
  - Auto-blur faces in student photos (optional)
  - Virus scanning integration

### Compliance
- [ ] **PIPA (Korea)**
  - Under-14 parental consent
  - Data residency: asia-northeast1 (Seoul region)
  - Audit trail for data access

- [ ] **APPI (Japan)**
  - Under-16 parental consent (recommended)
  - Data residency: asia-northeast1 (Tokyo)
  - Data cross-border notification

- [ ] **GDPR (If EU expansion)**
  - Right to be forgotten (full data deletion)
  - Data portability export
  - Consent management

---

## Nice-to-Have / Future Ideas

- [ ] **Audio Interview Transcription** (Claude Opus + long context)
- [ ] **AI Quiz Generation** (Auto-generate assessment from pin data)
- [ ] **Recommendation Engine** (Suggest similar pins)
- [ ] **Mobile App** (React Native / Flutter)
- [ ] **Offline Mode** (Service Worker + IndexedDB)
- [ ] **3D Map Visualization** (Cesium.js / Mapbox 3D)
- [ ] **Social Features** (Friend network, peer reviews)
- [ ] **Gamification Expansion** (Achievements, leaderboards)
- [ ] **Video Interviews** (Embedded student videos)
- [ ] **360° Photo Panorama** (Immersive pin experience)
- [ ] **AR Navigation** (Augmented Reality directions)
- [ ] **Integration with School Portal** (LMS hookups)
- [ ] **Webhook Subscriptions** (For enterprise integrations)
- [ ] **Bulk Data Import** (CSV → pins auto-create)
- [ ] **Custom Pricing Tiers** (Dynamic per school)

---

## Migration Tasks (When Implementing)

- [ ] Migrate `description: string` → `description: LocalizedText` in all pins
- [ ] Create indices for composite queries (status + createdAt, etc.)
- [ ] Backfill descriptionSource field for existing pins
- [ ] Migrate user roles to Custom Claims structure
- [ ] Test all Firestore Rules on staging environment

---

**Last Updated**: 2026-05-24
**Priority**: See `docs/roadmap.md` for phase-based prioritization
**Estimated Team Capacity**: 1-2 full-stack developers, 1 part-time designer

