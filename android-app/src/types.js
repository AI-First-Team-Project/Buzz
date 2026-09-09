// BUZZ 앱 - types 모듈
export const SITES = [
    { id: 1, name: '사업장 1', status: 'normal', insect: null, count: 0, confidence: 0 },
    { id: 2, name: '사업장 2', status: 'normal', insect: null, count: 0, confidence: 0 },
    { id: 3, name: '사업장 3', status: 'danger', insect: 'wasps', count: 7, confidence: 96 },
];
export const getSiteRuntimeStatus = (siteId) => {
    if (typeof window === 'undefined')
        return null;
    return window.localStorage.getItem(`buzz-site-status-${siteId}`);
};
export const setSiteRuntimeStatus = (siteId, status) => {
    if (typeof window === 'undefined')
        return;
    const previousStatus = window.localStorage.getItem(`buzz-site-status-${siteId}`);
    window.localStorage.setItem(`buzz-site-status-${siteId}`, status);
    if (status === 'normal' && siteId !== 3) {
        const savedGates = window.localStorage.getItem('buzz-gates');
        if (savedGates) {
            try {
                const nextGates = JSON.parse(savedGates).map(gate => gate.site === `사업장 ${siteId}`
                    ? { ...gate, status: 'open', lastAction: '정상 개방', lastTime: '현재' }
                    : gate);
                window.localStorage.setItem('buzz-gates', JSON.stringify(nextGates));
            }
            catch {
                // 손상된 저장값은 개폐기 화면의 기본값으로 복구한다.
            }
        }
    }
    if (status === 'danger' && previousStatus !== 'danger') {
        const now = new Date();
        const savedGates = window.localStorage.getItem('buzz-gates');
        if (savedGates) {
            try {
                const nextGates = JSON.parse(savedGates).map(gate => gate.site === `사업장 ${siteId}`
                    ? { ...gate, status: 'closed', mode: 'auto', lastAction: '말벌 탐지 자동 차단', lastTime: now.toLocaleTimeString('ko-KR', { hour12: false }) }
                    : gate);
                window.localStorage.setItem('buzz-gates', JSON.stringify(nextGates));
            }
            catch {
                // 손상된 저장값은 개폐기 화면의 기본값으로 복구한다.
            }
        }
        window.localStorage.setItem('buzz-latest-detection', JSON.stringify({
            siteId,
            time: now.toLocaleTimeString('ko-KR', { hour12: false }),
            timestamp: now.toISOString(),
            insect: 'wasps',
            count: 1,
            confidence: 96,
        }));
        appendRuntimeHistory({
            type: 'danger', site: `사업장 ${siteId}`, time: now.toLocaleTimeString('ko-KR', { hour12: false }),
            title: '말벌 위험 알림', result: '말벌', confidence: 96, door: '닫힘', action: '자동 폐쇄',
            probs: { wasp: 96, nonWasp: 4 }, flow: ['말벌 위험 감지', '위험 알림 기록', '개폐기 자동 닫힘'],
        });
    }
};
export const getLatestDetection = () => {
    if (typeof window === 'undefined')
        return null;
    const saved = window.localStorage.getItem('buzz-latest-detection');
    if (!saved)
        return null;
    try {
        return JSON.parse(saved);
    }
    catch {
        return null;
    }
};
export const getRuntimeSites = () => SITES.map(site => {
    const runtimeStatus = getSiteRuntimeStatus(site.id);
    if (runtimeStatus === 'danger') {
        const latestDetection = getLatestDetection();
        return {
            ...site,
            status: 'danger',
            insect: latestDetection?.insect ?? 'wasps',
            count: latestDetection?.count ?? 1,
            confidence: latestDetection?.confidence ?? 96,
        };
    }
    if (runtimeStatus !== 'normal')
        return site;
    return { ...site, status: 'normal', insect: null, count: 0, confidence: 0 };
});
export const SITE_ALERTS = [
    { id: 1, time: '09:42', siteId: 3, status: 'danger', insect: 'wasps', msg: '말벌 7마리 탐지' },
    { id: 2, time: '09:38', siteId: 3, status: 'danger', insect: 'wasps', msg: '말벌 접근 감지' },
    { id: 3, time: '09:31', siteId: 1, status: 'normal', insect: null, msg: '정상 상태 확인' },
    { id: 4, time: '09:25', siteId: 2, status: 'normal', insect: null, msg: '정상 상태 확인' },
    { id: 5, time: '09:12', siteId: 3, status: 'normal', insect: null, msg: '정상 상태 확인' },
    { id: 6, time: '08:55', siteId: 3, status: 'danger', insect: 'wasps', msg: '말벌 4마리 탐지' },
    { id: 7, time: '08:40', siteId: 1, status: 'normal', insect: null, msg: '정상 상태 확인' },
    { id: 8, time: '08:30', siteId: 2, status: 'normal', insect: null, msg: '정상 상태 확인' },
];
export const SITE_GATES = {
    1: [
        { id: 101, name: '개폐기', status: 'open', lastAction: '정상 개방', lastTime: '09:30:00' },
    ],
    2: [
        { id: 201, name: '개폐기', status: 'open', lastAction: '정상 개방', lastTime: '09:30:00' },
    ],
    3: [
        { id: 301, name: '개폐기', status: 'closed', lastAction: '말벌 탐지 자동 차단', lastTime: '09:42:15' },
    ],
};
export const getSelectedSiteId = () => {
    if (typeof window === 'undefined') return 3;
    const value = Number(window.localStorage.getItem('buzz-selected-site-id'));
    return SITES.some((site) => site.id === value) ? value : 3;
};
export const setSelectedSiteId = (siteId) => {
    if (typeof window !== 'undefined')
        window.localStorage.setItem('buzz-selected-site-id', String(siteId));
};

// 앱 이력 - 웹과 동일하게 브라우저 저장소에 누적하고 10개 단위로 조회한다.
const HISTORY_KEY = 'buzz-app-detection-history-v1';
const DEFAULT_HISTORY = [
    { id: 'seed-1', type: 'danger', site: '사업장 3', time: '14:30:25', title: '말벌 감지', result: '말벌', confidence: 97, door: '닫힘', action: '자동 폐쇄', probs: { wasp: 97, nonWasp: 3 }, flow: ['말벌 위험 감지', '위험 알림 기록', '개폐기 자동 닫힘'] },
    { id: 'seed-2', type: 'gate', site: '사업장 3', time: '14:31:02', title: '사용자 문 열기', result: '말벌', confidence: 96, door: '열림', action: '정상 전환', probs: { wasp: 96, nonWasp: 4 }, flow: ['사용자 문 열기', '정상 상태 전환', '이력 저장'] },
    { id: 'seed-3', type: 'gate', site: '사업장 3', time: '14:31:05', title: '자동 재폐쇄', result: '말벌', confidence: 96, door: '닫힘', action: '자동 재폐쇄', probs: { wasp: 96, nonWasp: 4 }, flow: ['말벌 위험 감지', '개폐기 자동 닫힘', '이력 저장'] },
    { id: 'seed-4', type: 'gate', site: '사업장 2', time: '11:05:12', title: '사용자 문 닫기', result: '말벌 아님', confidence: 91, door: '닫힘', action: '수동 폐쇄', probs: { wasp: 9, nonWasp: 91 }, flow: ['사용자 제어', '출입문 닫힘', '이력 저장'] },
];

export const getRuntimeHistory = () => {
    if (typeof window === 'undefined') return DEFAULT_HISTORY;
    try {
        const saved = JSON.parse(window.localStorage.getItem(HISTORY_KEY) ?? 'null');
        return Array.isArray(saved) ? saved : DEFAULT_HISTORY;
    }
    catch {
        return DEFAULT_HISTORY;
    }
};

export const appendRuntimeHistory = (event) => {
    if (typeof window === 'undefined') return;
    const next = [{ id: crypto.randomUUID(), ...event }, ...getRuntimeHistory()];
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
};
