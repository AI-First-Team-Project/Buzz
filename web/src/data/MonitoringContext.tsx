// 모니터링 - 사업장 상태, 위험 알림, 출입문 및 설정 공유
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { sites as initialSites, detectionEvents as initialEvents } from './mockData';
import type { Classification, DetectionEvent, DoorState, Site } from '../types';

const defaultSettings = { waspAlert: true, vibration: true, autoClose: true, autoCloseThreshold: 85 };
type Settings = typeof defaultSettings;
const storageKey = 'buzz-web-settings-v1';
function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (saved && ['waspAlert', 'vibration', 'autoClose'].every((key) => typeof saved[key] === 'boolean') &&
      Number.isFinite(saved.autoCloseThreshold) && saved.autoCloseThreshold >= 60 && saved.autoCloseThreshold <= 99) return saved;
  } catch { /* 저장소를 사용할 수 없으면 기본 설정 사용 */ }
  return defaultSettings;
}
interface Monitoring {
  sites: Site[];
  detectionEvents: DetectionEvent[];
  settings: Settings;
  saveSettings: (settings: Settings) => boolean;
  setDoor: (id: string, door: DoorState) => void;
  detect: (id: string, label: Classification, confidence: number) => void;
}
const Context = createContext<Monitoring | null>(null);
export function MonitoringProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState({ sites: initialSites, detectionEvents: initialEvents });
  const [settings, setSettings] = useState(loadSettings);
  const [dangerDeadlines, setDangerDeadlines] = useState<Record<string, number>>({});
  useEffect(() => {
    const timers = Object.entries(dangerDeadlines).map(([id, deadline]) =>
      window.setTimeout(() => {
        detect(id, 'wasp', 97);
      }, Math.max(0, deadline - Date.now())),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [dangerDeadlines, settings]);
  const makeEvent = (site: Site, kind: DetectionEvent['kind'], label: string): DetectionEvent => ({
    id: crypto.randomUUID(), time: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
    siteName: site.name, kind, label, aiClassification: site.aiLabel,
    aiConfidence: site.aiConfidence, doorState: site.door,
  });
  const shouldClose = (site: Site) => settings.autoClose && site.status === 'danger' && site.aiLabel === 'wasp' && site.aiConfidence >= settings.autoCloseThreshold;
  function setDoor(id: string, door: DoorState) {
    const current = state.sites.find((site) => site.id === id);
    if (current && door === 'open' && (current.door !== 'open' || current.status === 'danger')) {
      setDangerDeadlines((prev) => ({ ...prev, [id]: Date.now() + 60_000 }));
    }
    setState((prev) => {
      const site = prev.sites.find((s) => s.id === id);
      if (!site || (site.door === door && !(door === 'open' && site.status === 'danger'))) return prev;
      const updated: Site = { ...site, door, status: door === 'open' ? 'normal' : site.status };
      const events = [makeEvent(updated, 'door', door === 'open' ? '사용자 개폐기 열기 · 정상 전환' : '사용자 개폐기 닫기')];
      return { sites: prev.sites.map((s) => s.id === id ? updated : s), detectionEvents: [...events, ...prev.detectionEvents] };
    });
  }
  function detect(id: string, label: Classification, confidence: number) {
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) return;
    setDangerDeadlines((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setState((prev) => {
      const site = prev.sites.find((s) => s.id === id);
      if (!site) return prev;
      const updated: Site = { ...site, aiLabel: label, aiConfidence: confidence, status: label === 'wasp' ? 'danger' : 'normal', lastAnalyzedAt: new Date().toLocaleTimeString('ko-KR', { hour12: false }) };
      const events = [makeEvent(updated, label === 'wasp' ? 'danger' : 'detection', label === 'wasp' ? '말벌 감지 (시뮬레이션)' : '정상 감지 (시뮬레이션)')];
      if (shouldClose(updated) && updated.door !== 'closed') {
        updated.door = 'closed';
        events.unshift(makeEvent(updated, 'door', '자동 보호 · 문 닫기'));
      }
      return { sites: prev.sites.map((s) => s.id === id ? updated : s), detectionEvents: [...events, ...prev.detectionEvents] };
    });
    if (label === 'wasp' && settings.waspAlert && settings.vibration) {
      try { navigator.vibrate?.([200, 100, 200]); } catch { /* 미지원 브라우저에서는 화면 알림 사용 */ }
    }
  }
  function saveSettings(next: Settings) {
    try { localStorage.setItem(storageKey, JSON.stringify(next)); }
    catch { return false; }
    setSettings(next);
    setState((prev) => {
      const events: DetectionEvent[] = [];
      const sites = prev.sites.map((site) => {
        if (!next.autoClose || site.status !== 'danger' || site.aiLabel !== 'wasp' || site.aiConfidence < next.autoCloseThreshold || site.door === 'closed') return site;
        const updated: Site = { ...site, door: 'closed' };
        events.push(makeEvent(updated, 'door', '자동 보호 · 문 닫기'));
        return updated;
      });
      return { sites, detectionEvents: [...events, ...prev.detectionEvents] };
    });
    return true;
  }
  return <Context.Provider value={{ ...state, settings, saveSettings, setDoor, detect }}>{children}</Context.Provider>;
}
export function useMonitoring() {
  const context = useContext(Context);
  if (!context) throw new Error('MonitoringProvider is required');
  return context;
}
