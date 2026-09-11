// 샘플 데이터 - 사업장과 탐지 이벤트
import type { DetectionEvent, Site } from '../types';

export const CURRENT_TIMESTAMP = '2026.09.08.(화) 14:30:25';

export const sites: Site[] = [
  {
    id: 'site-1',
    name: '사업장 1',
    status: 'normal',
    aiLabel: 'bee',
    aiConfidence: 95,
    door: 'open',
    lastAnalyzedAt: '방금 전',
    photoTone: 'green',
  },
  {
    id: 'site-2',
    name: '사업장 2',
    status: 'normal',
    aiLabel: 'bee',
    aiConfidence: 92,
    door: 'open',
    lastAnalyzedAt: '방금 전',
    photoTone: 'teal',
  },
  {
    id: 'site-3',
    name: '사업장 3',
    status: 'danger',
    aiLabel: 'wasp',
    aiConfidence: 97,
    door: 'closed',
    lastAnalyzedAt: '방금 전',
    photoTone: 'amber',
  },
];

export const detectionEvents: DetectionEvent[] = [
  {
    id: 'evt-1',
    time: '14:31:05',
    siteName: '사업장 3',
    kind: 'danger',
    label: '자동 제어',
    aiClassification: 'wasp',
    aiConfidence: 96,
    doorState: 'closed',
  },
  {
    id: 'evt-2',
    time: '14:31:02',
    siteName: '사업장 3',
    kind: 'door',
    label: '사용자 문 열기',
    aiClassification: 'wasp',
    aiConfidence: 96,
    doorState: 'open',
  },
  {
    id: 'evt-3',
    time: '14:30:25',
    siteName: '사업장 3',
    kind: 'danger',
    label: '말벌 감지',
    aiClassification: 'wasp',
    aiConfidence: 97,
    doorState: 'closed',
  },
  {
    id: 'evt-4',
    time: '11:05:12',
    siteName: '사업장 2',
    kind: 'door',
    label: '사용자 문 닫기',
    aiClassification: 'bee',
    aiConfidence: 91,
    doorState: 'closed',
  },
];

export const recentDashboardEvents = [
  { time: '14:31:05', siteName: '사업장 3', label: '자동 제어', status: 'danger' as const },
  { time: '14:31:02', siteName: '사업장 3', label: '사용자 문 열기', status: 'normal' as const },
  { time: '14:30:25', siteName: '사업장 3', label: '말벌 감지', status: 'danger' as const },
];
