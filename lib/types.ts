// LocalizedText: 다국어 텍스트 객체
export interface LocalizedText {
  ko?: string;
  ja?: string;
  en?: string;
}

// GeoPoint: 지리 좌표 + GeoHash
export interface GeoPoint {
  lat: number;
  lng: number;
  geohash: string;
}

// Role: 사용자 역할
export type Role = 'admin' | 'teacher' | 'student' | 'parent' | 'viewer';

// TenantType: 조직 유형
export type TenantType =
  | 'elementary_school'
  | 'middle_school'
  | 'high_school'
  | 'church'
  | 'tourism'
  | 'community'
  | 'demo';

// FeatureFlag: 기능 플래그
export type FeatureFlag =
  | 'ai_description'
  | 'parent_portal'
  | 'pdf_export'
  | 'audio_recording'
  | 'student_collaboration'
  | 'multi_year_archive'
  | 'custom_branding';

// Tenant: 조직 단위
export interface Tenant {
  id: string;
  type: TenantType;
  name: LocalizedText;
  shortName: LocalizedText;

  address: string;
  addressLocale: 'KR' | 'JP' | 'US';
  center: GeoPoint;
  radius: number;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };

  locale: 'ko-KR' | 'ja-JP' | 'en-US';
  supportedLocales: string[];

  plan: 'trial' | 'basic' | 'standard' | 'premium' | 'enterprise';
  features: FeatureFlag[];

  branding?: {
    logoUrl?: string;
    primaryColor?: string;
  };

  billing?: {
    accountId: string;
    seatsAllowed: number;
  };

  parentTenantId?: string;

  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// Layer: 카테고리 그룹
export interface Layer {
  id: string;
  tenantId: string;
  name: LocalizedText;
  icon: string;
  color: string;
  order: number;
  curriculumTags: string[];
  isVisible: boolean;
  visibleToRoles: Role[];
  source: 'system' | 'seed' | 'custom';
  systemKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

// MediaRef: 미디어 참조
export interface MediaRef {
  url: string;
  thumbnailUrl?: string;
  caption?: LocalizedText;
  uploadedBy: string;
  uploadedAt: Date;
}

// SourceInfo: 출처 정보
export interface SourceInfo {
  type: 'public_api' | 'teacher' | 'student' | 'parent' | 'osm' | 'ai_generated';
  apiName?: string;
  fetchedAt?: Date;
}

// Pin: 지도 위 장소
export interface Pin {
  id: string;
  tenantId: string;
  layerId: string;
  name: LocalizedText;
  location: GeoPoint;
  description: LocalizedText;
  descriptionSource: 'manual' | 'public_api' | 'ai_generated' | 'translated';
  images: MediaRef[];
  audioNotes: MediaRef[];
  source: SourceInfo;
  externalIds?: Record<string, string>;
  status: 'active' | 'pending_review' | 'archived' | 'rejected';
  createdBy: string;
  verifiedBy?: string;
  verifiedAt?: Date;
  version: number;
  projectId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// PinHistory: 핀 변경 이력
export type ChangeType =
  | 'created'
  | 'edited'
  | 'moved'
  | 'closed'
  | 'reopened'
  | 'archived'
  | 'restored';

export interface PinHistory {
  id: string;
  pinId: string;
  version: number;
  changeType: ChangeType;
  changedFields: Partial<Pin>;
  previousSnapshot?: Partial<Pin>;
  reason?: string;
  changedBy: string;
  changedAt: Date;
}

// Project: 학년도/시즌 단위 활동
export interface Project {
  id: string;
  tenantId: string;
  name: LocalizedText;
  schoolYear?: number;
  grade?: number;
  season?: string;
  activeUnits: string[];
  participantGroups: string[];
  inheritsFrom?: string;
  inheritedPinIds: string[];
  status: 'planning' | 'active' | 'completed' | 'archived';
  startDate: Date;
  endDate?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// User: 사용자
export interface User {
  id: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  locale: string;
  isSuperAdmin?: boolean;
  createdAt: Date;
  lastSeenAt: Date;
}

// TenantMembership: 사용자-Tenant 관계
export interface TenantMembership {
  tenantId: string;
  role: Role;
  classId?: string;
  grade?: number;
  parentOf?: string[];
  joinedAt: Date;
  status: 'active' | 'invited' | 'removed';
}

// SeedJob: 시드 작업 큐
export interface SeedJob {
  id: string;
  tenantId: string;
  adapter: string;
  source: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'partial';
  pinsCreated: number;
  pinsFailed: number;
  errors: Array<{ message: string; at: Date }>;
  startedAt?: Date;
  completedAt?: Date;
  triggeredBy: string;
  createdAt: Date;
}

// API Response 포맷
export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
