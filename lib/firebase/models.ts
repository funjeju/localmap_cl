import { Timestamp, GeoPoint } from "firebase/firestore";

export type TenantType = 
  | 'elementary_school'
  | 'middle_school'
  | 'high_school'
  | 'church'
  | 'tourism'
  | 'community'
  | 'demo';

export type FeatureFlag =
  | 'ai_description'
  | 'parent_portal'
  | 'pdf_export'
  | 'audio_recording'
  | 'student_collaboration'
  | 'multi_year_archive'
  | 'custom_branding';

export interface LocalizedText {
  ko?: string;
  ja?: string;
  en?: string;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  geohash: string;
}

export interface GeoBounds {
  northeast: GeoLocation;
  southwest: GeoLocation;
}

export interface Tenant {
  id: string;
  type: TenantType;
  name: LocalizedText;
  shortName: LocalizedText;
  
  address: string;
  addressLocale: 'KR' | 'JP' | 'US';
  center: GeoLocation;
  radius: number; // meters, default 500
  bounds?: GeoBounds;
  
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
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export type Role = 'admin' | 'teacher' | 'student' | 'parent' | 'viewer';

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
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MediaRef {
  url: string;
  thumbnailUrl?: string;
  caption?: LocalizedText;
  uploadedBy: string;
  uploadedAt: Timestamp;
}

export interface SourceInfo {
  type: 'public_api' | 'teacher' | 'student' | 'parent' | 'osm' | 'ai_generated';
  apiName?: string;
  fetchedAt?: Timestamp;
}

export interface Pin {
  id: string;
  tenantId: string;
  layerId: string;
  
  name: LocalizedText;
  location: GeoLocation;
  
  description: LocalizedText;
  descriptionSource: 'manual' | 'public_api' | 'ai_generated' | 'translated';
  
  images: MediaRef[];
  audioNotes: MediaRef[];
  
  source: SourceInfo;
  externalIds?: Record<string, string>;
  
  status: 'active' | 'pending_review' | 'archived' | 'rejected';
  createdBy: string;
  verifiedBy?: string;
  verifiedAt?: Timestamp;
  
  version: number;
  projectId?: string;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
