// 공통 타입 - 사업장과 탐지 및 분류 데이터
export type SiteStatus = 'normal' | 'danger';
export type DoorState = 'open' | 'closed';
export type Classification = 'wasp' | 'bee' | 'other';

export interface Site {
  id: string;
  name: string;
  status: SiteStatus;
  aiLabel: Classification;
  aiConfidence: number;
  door: DoorState;
  lastAnalyzedAt: string;
  photoTone: 'green' | 'amber' | 'teal';
}

export type EventKind = 'danger' | 'door' | 'detection';

export interface DetectionEvent {
  id: string;
  time: string;
  siteName: string;
  kind: EventKind;
  label: string;
  aiClassification: Classification;
  aiConfidence: number;
  doorState: DoorState;
}

export interface ClassificationBreakdown {
  wasp: number;
  bee: number;
  other: number;
}
