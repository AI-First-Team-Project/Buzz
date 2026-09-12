import { jsx as _jsx } from "react/jsx-runtime";
// 모니터링 - 사업장 상태, 위험 알림, 출입문 및 설정 공유
import { createContext, useContext, useEffect, useState } from 'react';
import { sites as initialSites } from './mockData';
import { commandDoor, fetchHistory, fetchSiteStatuses } from '../api/buzzApi';
const defaultSettings = { waspAlert: true, vibration: true, autoClose: true, autoCloseThreshold: 85 };
const storageKey = 'buzz-web-settings-v1';
const historyStorageKey = 'buzz-web-status-history-v2';
function loadSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
        if (saved && ['waspAlert', 'vibration', 'autoClose'].every((key) => typeof saved[key] === 'boolean') &&
            Number.isFinite(saved.autoCloseThreshold) && saved.autoCloseThreshold >= 60 && saved.autoCloseThreshold <= 99)
            return saved;
    }
    catch { /* 저장소를 사용할 수 없으면 기본 설정 사용 */ }
    return defaultSettings;
}
function loadHistory() {
    try {
        const saved = JSON.parse(localStorage.getItem(historyStorageKey) ?? 'null');
        if (Array.isArray(saved))
            return saved;
    }
    catch { /* 저장 이력이 없으면 초기 이력 사용 */ }
    return [];
}
const Context = createContext(null);

function mapSite(site) {
    const fallback = initialSites.find((item) => item.id === `site-${site.site_id}`);
    return {
        id: `site-${site.site_id}`,
        name: site.site_name,
        status: site.status === 'DANGER' ? 'danger' : 'normal',
        aiLabel: site.detected_class === 'wasp' ? 'wasp' : 'non-wasp',
        aiConfidence: Math.round((site.confidence ?? 0) * 100),
        door: site.door_status === 'CLOSED' ? 'closed' : 'open',
        lastAnalyzedAt: site.last_analysis_time,
        photoTone: fallback?.photoTone ?? 'green',
    };
}

function mapEvent(event) {
    const timestamp = new Date(event.timestamp);
    return {
        id: String(event.id),
        date: Number.isNaN(timestamp.getTime()) ? '' : timestamp.toISOString().slice(0, 10),
        time: Number.isNaN(timestamp.getTime()) ? '' : timestamp.toLocaleTimeString('ko-KR', { hour12: false }),
        siteName: event.site_name,
        kind: event.type === 'gate' ? 'door' : event.type === 'danger' ? 'danger' : 'detection',
        label: event.title,
        aiClassification: event.result === 'wasp' ? 'wasp' : 'non-wasp',
        aiConfidence: Math.round((event.confidence ?? 0) * 100),
        doorState: event.door_status === 'CLOSED' ? 'closed' : 'open',
        analysisId: event.analysis_id,
    };
}

export function MonitoringProvider({ children }) {
    const [state, setState] = useState(() => ({ sites: initialSites, detectionEvents: loadHistory() }));
    const [settings, setSettings] = useState(loadSettings);
    const [dangerDeadlines, setDangerDeadlines] = useState({});
    useEffect(() => {
        let cancelled = false;
        const refresh = async () => {
            const [sitesResult, historyResult] = await Promise.allSettled([fetchSiteStatuses(), fetchHistory()]);
            if (cancelled) return;
            setState((prev) => ({
                sites: sitesResult.status === 'fulfilled' ? sitesResult.value.map(mapSite) : prev.sites,
                detectionEvents: historyResult.status === 'fulfilled' ? historyResult.value.map(mapEvent) : prev.detectionEvents,
            }));
        };
        refresh();
        const timer = window.setInterval(refresh, 2000);
        return () => { cancelled = true; window.clearInterval(timer); };
    }, []);
    useEffect(() => {
        try {
            localStorage.setItem(historyStorageKey, JSON.stringify(state.detectionEvents));
        }
        catch { /* 브라우저 저장소를 사용할 수 없으면 현재 세션에서 유지 */ }
    }, [state.detectionEvents]);
    useEffect(() => {
        const timers = Object.entries(dangerDeadlines).map(([id, deadline]) => window.setTimeout(() => {
            detect(id, 'wasp', 97);
        }, Math.max(0, deadline - Date.now())));
        return () => timers.forEach(window.clearTimeout);
    }, [dangerDeadlines, settings]);
    const makeEvent = (site, kind, label) => ({
        id: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10), time: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
        siteName: site.name, kind, label, aiClassification: site.aiLabel,
        aiConfidence: site.aiConfidence, doorState: site.door,
    });
    const shouldClose = (site) => settings.autoClose && site.status === 'danger' && site.aiLabel === 'wasp' && site.aiConfidence >= settings.autoCloseThreshold;
    async function setDoor(id, door) {
        const siteId = Number(id.replace('site-', ''));
        if (!Number.isInteger(siteId))
            return;
        try {
            const updatedSite = mapSite(await commandDoor(siteId, door === 'open' ? 'open' : 'close'));
            let refreshedEvents = null;
            try {
                refreshedEvents = (await fetchHistory()).map(mapEvent);
            }
            catch { /* 문 제어 성공은 유지하고 기존 이력을 안전한 fallback으로 사용 */ }
            setState((prev) => ({
                sites: prev.sites.map((site) => site.id === id ? updatedSite : site),
                detectionEvents: refreshedEvents ?? prev.detectionEvents,
            }));
        }
        catch { /* API 실패 시 화면과 기존 데이터를 그대로 유지 */ }
    }
    function detect(id, label, confidence) {
        if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100)
            return;
        setDangerDeadlines((prev) => {
            if (!(id in prev))
                return prev;
            const next = { ...prev };
            delete next[id];
            return next;
        });
        setState((prev) => {
            const site = prev.sites.find((s) => s.id === id);
            if (!site)
                return prev;
            const updated = { ...site, aiLabel: label, aiConfidence: confidence, status: label === 'wasp' ? 'danger' : 'normal', lastAnalyzedAt: new Date().toLocaleTimeString('ko-KR', { hour12: false }) };
            const events = [makeEvent(updated, label === 'wasp' ? 'danger' : 'detection', label === 'wasp' ? '말벌 위험 알림' : '말벌 아님 판정')];
            if (shouldClose(updated) && updated.door !== 'closed') {
                updated.door = 'closed';
                events.unshift(makeEvent(updated, 'door', '자동 보호 · 문 닫기'));
            }
            return { sites: prev.sites.map((s) => s.id === id ? updated : s), detectionEvents: [...events, ...prev.detectionEvents] };
        });
        if (label === 'wasp' && settings.waspAlert && settings.vibration) {
            try {
                navigator.vibrate?.([200, 100, 200]);
            }
            catch { /* 미지원 브라우저에서는 화면 알림 사용 */ }
        }
    }
    function saveSettings(next) {
        try {
            localStorage.setItem(storageKey, JSON.stringify(next));
        }
        catch {
            return false;
        }
        setSettings(next);
        setState((prev) => {
            const events = [];
            const sites = prev.sites.map((site) => {
                if (!next.autoClose || site.status !== 'danger' || site.aiLabel !== 'wasp' || site.aiConfidence < next.autoCloseThreshold || site.door === 'closed')
                    return site;
                const updated = { ...site, door: 'closed' };
                events.push(makeEvent(updated, 'door', '자동 보호 · 문 닫기'));
                return updated;
            });
            return { sites, detectionEvents: [...events, ...prev.detectionEvents] };
        });
        return true;
    }
    return _jsx(Context.Provider, { value: { ...state, settings, saveSettings, setDoor, detect }, children: children });
}
export function useMonitoring() {
    const context = useContext(Context);
    if (!context)
        throw new Error('MonitoringProvider is required');
    return context;
}
