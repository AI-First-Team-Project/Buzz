import { jsx as _jsx } from "react/jsx-runtime";
// 모니터링 - 사업장 상태, 위험 알림, 출입문 및 설정 공유
import { createContext, useContext, useEffect, useState } from 'react';
import { commandDoor, fetchHistory, fetchSiteStatuses } from '../api/buzzApi';
import { sites as initialSites } from './mockData';
const defaultSettings = { waspAlert: true, vibration: true, autoClose: true, autoCloseThreshold: 85 };
const storageKey = 'buzz-web-settings-v1';
function percent(value) {
    return Math.round((Number(value) || 0) * 1000) / 10;
}
function analysisLabel(site) {
    const age = site.last_analysis_age_seconds;
    if (age == null)
        return '분석 대기 중';
    if (site.worker_status === 'DEGRADED')
        return `수신 지연 · ${Math.floor(age)}초 전`;
    return age < 2 ? '방금 전' : `${Math.floor(age)}초 전`;
}
function adaptSite(site, previous) {
    return {
        ...previous,
        id: `site-${site.site_id}`,
        name: site.site_name,
        status: site.status.toLowerCase(),
        aiLabel: site.detected_class?.replace('_', '-') ?? 'non-wasp',
        aiConfidence: percent(site.confidence),
        probabilities: {
            wasp: percent(site.probabilities?.wasp),
            nonWasp: percent(site.probabilities?.non_wasp),
        },
        door: site.door_status.toLowerCase(),
        lastAnalyzedAt: analysisLabel(site),
        workerStatus: site.worker_status.toLowerCase(),
        latestAnalysisId: site.latest_analysis_id,
        consecutiveWasp: site.consecutive_wasp,
        consecutiveNonWasp: site.consecutive_non_wasp,
    };
}
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
function adaptHistoryItem(item) {
    const timestamp = new Date(item.timestamp);
    const confidence = percent(item.confidence);
    const hasPrediction = item.result === 'wasp' || item.result === 'non_wasp';
    const wasp = item.result === 'wasp' ? confidence : item.result === 'non_wasp' ? 100 - confidence : 0;
    const nonWasp = item.result === 'non_wasp' ? confidence : item.result === 'wasp' ? 100 - confidence : 0;
    return {
        id: item.id,
        date: timestamp.toISOString().slice(0, 10),
        time: timestamp.toLocaleTimeString('ko-KR', { hour12: false }),
        siteName: item.site_name,
        kind: item.type === 'gate' ? 'door' : item.type === 'danger' ? 'danger' : 'detection',
        label: item.title,
        aiClassification: hasPrediction ? item.result.replace('_', '-') : 'non-wasp',
        aiConfidence: hasPrediction ? confidence : 0,
        probabilities: { wasp, nonWasp },
        doorState: item.door_status.toLowerCase(),
        action: item.action,
        analysisId: item.analysis_id,
    };
}
const Context = createContext(null);
export function MonitoringProvider({ children }) {
    const [state, setState] = useState(() => ({ sites: initialSites, detectionEvents: [] }));
    const [monitoringError, setMonitoringError] = useState('');
    const [settings, setSettings] = useState(loadSettings);
    const [dangerDeadlines, setDangerDeadlines] = useState({});
    useEffect(() => {
        let active = true;
        async function refreshStatuses() {
            try {
                const statuses = await fetchSiteStatuses();
                if (!active)
                    return;
                setState((previous) => ({
                    ...previous,
                    sites: statuses.map((site) => adaptSite(
                        site,
                        previous.sites.find((current) => current.id === `site-${site.site_id}`),
                    )),
                }));
                setMonitoringError('');
            }
            catch (error) {
                if (active) {
                    setMonitoringError(error?.message || '사업장 상태를 불러오지 못했습니다.');
                    setState((previous) => ({
                        ...previous,
                        sites: previous.sites.map((site) => ({
                            ...site,
                            workerStatus: 'degraded',
                            lastAnalyzedAt: '서버 연결 지연',
                        })),
                    }));
                }
            }
        }
        refreshStatuses();
        const timer = window.setInterval(refreshStatuses, 2000);
        return () => {
            active = false;
            window.clearInterval(timer);
        };
    }, []);
    useEffect(() => {
        let active = true;
        async function refreshHistory() {
            try {
                const history = await fetchHistory();
                if (active)
                    setState((previous) => ({ ...previous, detectionEvents: history.map(adaptHistoryItem) }));
            }
            catch { /* 마지막으로 정상 수신한 이력을 유지한다. */ }
        }
        refreshHistory();
        const timer = window.setInterval(refreshHistory, 2000);
        return () => {
            active = false;
            window.clearInterval(timer);
        };
    }, []);
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
        try {
            const response = await commandDoor(siteId, door);
            setState((previous) => ({
                ...previous,
                sites: previous.sites.map((site) => site.id === id ? adaptSite(response, site) : site),
            }));
            setMonitoringError('');
            return true;
        }
        catch (error) {
            setMonitoringError(error?.message || '출입문을 제어하지 못했습니다.');
            return false;
        }
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
    return _jsx(Context.Provider, { value: { ...state, monitoringError, settings, saveSettings, setDoor, detect }, children: children });
}
export function useMonitoring() {
    const context = useContext(Context);
    if (!context)
        throw new Error('MonitoringProvider is required');
    return context;
}
