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
