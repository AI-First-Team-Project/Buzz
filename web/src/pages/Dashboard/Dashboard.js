import { AcousticMonitor } from '../../components/AcousticMonitor.jsx';
import { AcousticSignal } from '../../components/AcousticSignal.tsx';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// 대시보드 - 사업장 현황 요약
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '../../components/Badge';
import { BeeMascot } from '../../components/BeeMascot';
import { PageHeader } from '../../components/PageHeader';
import { StatCard } from '../../components/StatCard';
import { BellIcon, CheckCircleIcon, DoorIcon, HistoryIcon, LockIcon, SiteIcon, WarningIcon, } from '../../components/Icons';
import { useMonitoring } from '../../data/MonitoringContext';
import styles from './Dashboard.module.css';
const KOREAN_LABEL = { wasp: '말벌', 'non-wasp': '말벌 아님' };
export function Dashboard() {
    const { sites, detectionEvents, setDoor } = useMonitoring();
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedId = searchParams.get('site') ?? 'all';
    const visibleSites = sites;
    const selectedSites = selectedId === 'all' ? sites : sites.filter((s) => s.id === selectedId);
    const [defaultMonitorId] = useState(() => sites.find((s) => s.status === 'danger')?.id ?? sites[0]?.id);
    const selectedSite = selectedSites.find((s) => s.id === defaultMonitorId) ?? selectedSites[0];
    const doorState = selectedSite?.door ?? 'closed';
    const setDoorState = (door) => selectedSite && setDoor(selectedSite.id, door);
    const normalCount = selectedSites.filter((s) => s.status === 'normal').length;
    const dangerCount = selectedSites.filter((s) => s.status === 'danger').length;
    // 앱(HomePage)과 동일한 "마지막 분석 N초 전" 표시를 위한 시뮬레이션 타이머.
    // 실제 연동 시에는 FastAPI/Kafka Consumer 결과 수신 시 setLastAnalysisAt(Date.now())를 호출하면 됨.
    const [lastAnalysisAt, setLastAnalysisAt] = useState(Date.now());
    const [lastAnalysisLabel, setLastAnalysisLabel] = useState('방금 전');
    const [alertOpen, setAlertOpen] = useState(true);
    const [alertsAcknowledged, setAlertsAcknowledged] = useState(false);
    const [dangerModalSite, setDangerModalSite] = useState(null);
    const previousDangerCount = useRef(null);
    const activeDangerSites = sites.filter((site) => site.status === 'danger');
    useEffect(() => {
        const cards = Array.from(document.querySelectorAll(`.${styles.siteCard}`));
        const cleanups = cards.map((card, index) => {
            const site = visibleSites[index];
            if (!site)
                return () => { };
            const selectSite = () => {
                setSearchParams({ site: site.id });
                window.scrollTo({ top: 0, behavior: 'instant' });
            };
            const handleKeyDown = (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectSite();
                }
            };
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', `${site.name} 모니터링 보기`);
            card.addEventListener('click', selectSite);
            card.addEventListener('keydown', handleKeyDown);
            return () => {
                card.removeEventListener('click', selectSite);
                card.removeEventListener('keydown', handleKeyDown);
            };
        });
        return () => cleanups.forEach((cleanup) => cleanup());
    }, [visibleSites, setSearchParams]);
    useEffect(() => {
        const timer = window.setInterval(() => {
            const diff = Math.max(0, Math.floor((Date.now() - lastAnalysisAt) / 1000));
            setLastAnalysisLabel(diff < 2 ? '방금 전' : `${diff}초 전`);
        }, 1000);
        return () => window.clearInterval(timer);
    }, [lastAnalysisAt]);
    useEffect(() => {
        let timer;
        const scheduleNext = () => {
            const delay = 10000 + Math.floor(Math.random() * 20001);
            timer = window.setTimeout(() => {
                setLastAnalysisAt(Date.now());
                scheduleNext();
            }, delay);
        };
        scheduleNext();
        return () => window.clearTimeout(timer);
    }, []);
    useEffect(() => {
        if (activeDangerSites.length > 0)
            setAlertOpen(true);
        setAlertsAcknowledged(false);
    }, [activeDangerSites.length]);
    useEffect(() => {
        if (activeDangerSites.length > 0 && (previousDangerCount.current === null || previousDangerCount.current === 0))
            setDangerModalSite(activeDangerSites[0]);
        previousDangerCount.current = activeDangerSites.length;
    }, [activeDangerSites]);
    const selectedDanger = selectedSite?.status === 'danger';
    return (_jsxs("div", { children: [dangerModalSite && _jsx("div", { className: styles.dangerModalOverlay, role: "alertdialog", "aria-modal": "true", "aria-label": "말벌 침입 위험 알림", children: _jsxs("section", { className: styles.dangerModal, children: [_jsx("span", { className: styles.dangerModalIcon, children: "!" }), _jsx("p", { children: "위험 알림" }), _jsx("h2", { children: "말벌 침입 감지" }), _jsxs("strong", { children: [dangerModalSite.name, " · 신뢰도 ", dangerModalSite.aiConfidence, "%"] }), _jsx("span", { children: "가상 방어문이 자동으로 닫혔습니다." }), _jsxs("div", { className: styles.dangerModalActions, children: [_jsx("button", { type: "button", onClick: () => setDangerModalSite(null), children: "확인" })] })] }) }), _jsx(PageHeader, { title: "\uC591\uBD09\uC7A5\uC758 \uC548\uC804\uC744 \uD55C\uB208\uC5D0", description: "\uC591\uBD09\uC7A5\uC758 \uC548\uC804\uC744 \uD655\uC778\uD558\uC138\uC694.", action: _jsxs("div", { className: styles.headerActions, children: [_jsxs("select", { "aria-label": "\uC0AC\uC5C5\uC7A5 \uC120\uD0DD", className: styles.siteSelect, value: selectedId, onChange: (e) => setSearchParams(e.target.value === 'all' ? {} : { site: e.target.value }), children: [_jsx("option", { value: "all", children: "\uC804\uCCB4 \uC0AC\uC5C5\uC7A5" }), sites.map((site) => _jsx("option", { value: site.id, children: site.name }, site.id))] }), _jsxs("button", { type: "button", className: `${styles.alertBell} ${activeDangerSites.length > 0 ? styles.alertBellDanger : ""}`, onClick: () => { setAlertsAcknowledged(true); setAlertOpen((open) => !open); }, "aria-label": `위험 알림 ${activeDangerSites.length}건`, "aria-expanded": alertOpen, children: [_jsx(BellIcon, { size: 18 }), activeDangerSites.length > 0 && !alertsAcknowledged && _jsx("i", { children: activeDangerSites.length })] }), activeDangerSites.length > 0 && alertOpen && _jsxs("div", { className: styles.bellAlert, role: "alert", children: [_jsx(BellIcon, { size: 17 }), _jsx("div", { className: styles.bellAlertList, children: activeDangerSites.map((site) => _jsxs("div", { className: styles.bellAlertItem, children: [_jsx("b", { children: site.name }), _jsxs("span", { children: ["말벌 ", site.aiConfidence, "% · 출입문 ", site.door === "closed" ? "닫힘" : "열림"] })] }, site.id)) }), _jsx("button", { type: "button", onClick: () => { setAlertsAcknowledged(true); setAlertOpen(false); }, "aria-label": "알림 닫기", children: "×" })] })] }) }), activeDangerSites.length > 0 && alertOpen && _jsx("div", { className: styles.alertSpacer, style: { height: `${activeDangerSites.length * 38 + 26}px` } }), _jsxs("div", { className: styles.statRow, children: [_jsx(StatCard, { icon: SiteIcon, label: "\uC0AC\uC5C5\uC7A5", value: String(visibleSites.length) }), _jsx(StatCard, { icon: CheckCircleIcon, label: "\uC815\uC0C1", value: String(normalCount), tone: "success" }), _jsx(StatCard, { icon: WarningIcon, label: "\uC704\uD5D8", value: String(dangerCount), tone: "danger" }), _jsx(StatCard, { icon: HistoryIcon, label: "\uBC29\uAE08 \uC804", value: "\uAC31\uC2E0\uB428", tone: "muted" })] }), selectedSite && (_jsxs("section", { className: `${styles.statusSummary} ${selectedDanger ? styles.statusSummaryDanger : ''}`, children: [_jsx("div", { className: `${styles.statusSymbol} ${selectedDanger ? styles.statusSymbolDanger : ''}`, children: selectedDanger ? '!' : '✓' }), _jsxs("div", { className: styles.statusBody, children: [_jsx("p", { className: styles.kicker, children: "\uD604\uC7AC \uC0C1\uD0DC" }), _jsx("h1", { className: styles.statusTitle, children: selectedDanger ? '말벌 침입 감지' : '정상 감시 중' }), _jsx("p", { className: styles.statusDesc, children: selectedDanger
                                    ? '말벌이 감지되어 출입문을 자동으로 닫았습니다.'
                                    : '현재 양봉장은 안전합니다.' }), _jsxs("small", { className: styles.statusMeta, children: ["\uB9C8\uC9C0\uB9C9 \uBD84\uC11D ", lastAnalysisLabel] })] }), _jsx(BeeMascot, { danger: selectedDanger })] })), selectedSite && (_jsxs("div", { className: styles.monitorCard, children: [_jsx(AcousticMonitor, { site: selectedSite }, selectedSite.id), _jsxs("div", { className: styles.monitorInfo, children: [_jsxs("div", { className: styles.confidenceRow, children: [_jsx("span", { className: styles.confidenceLabel, children: "\uCD5C\uADFC AI \uD310\uC815" }), _jsxs("span", { className: styles.confidenceValue, children: [KOREAN_LABEL[selectedSite.aiLabel], " ", selectedSite.aiConfidence, "%"] })] }), _jsx("div", { className: styles.confidenceBarTrack, children: _jsx("div", { className: styles.confidenceBarFill, style: { width: `${selectedSite.aiConfidence}%` } }) }), _jsxs("section", { className: styles.doorControl, "aria-label": "\uAC1C\uD3D0\uAE30 \uC81C\uC5B4", children: [_jsxs("div", { className: styles.doorState, children: [_jsx("span", { className: `${styles.doorSymbol} ${doorState === 'closed' ? styles.doorSymbolClosed : ''}`, children: doorState === 'closed' ? _jsx(LockIcon, { size: 26 }) : _jsx(DoorIcon, { size: 26 }) }), _jsxs("div", { children: [_jsx("span", { className: styles.doorCaption, children: "\uAC1C\uD3D0\uAE30 \uC0C1\uD0DC" }), _jsx("strong", { role: "status", children: doorState === 'closed' ? '닫힘' : '열림' }), _jsx("small", { children: selectedSite.status === 'danger' ? '위험 감지 · 자동 보호 중' : '정상 · 수동 제어 가능' })] }), _jsx(Badge, { tone: selectedSite.status === 'danger' ? 'danger' : 'success', children: selectedSite.status === 'danger' ? '위험' : '정상' })] }), _jsxs("button", { type: "button", className: `${styles.doorAction} ${selectedSite.status === 'danger' && doorState === 'closed' ? styles.doorActionDanger : ''}`, onClick: () => setDoorState(doorState === 'closed' ? 'open' : 'closed'), children: [doorState === 'closed' ? _jsx(DoorIcon, { size: 20 }) : _jsx(LockIcon, { size: 20 }), doorState === 'closed' ? '개폐기 열기' : '개폐기 닫기'] }), _jsx("p", { className: styles.doorNote, children: selectedSite.status === 'danger'
                                            ? '열기를 누르면 정상으로 전환되고, 1분 뒤 다시 위험이 표시됩니다.'
                                            : '열기 후 1분 뒤 위험이 다시 표시되며, 설정에 따라 자동으로 닫힙니다.' })] })] })] })), !selectedSite && _jsx("p", { role: "status", children: "\uC0AC\uC5C5\uC7A5\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC704\uC5D0\uC11C \uC0AC\uC5C5\uC7A5\uC744 \uC120\uD0DD\uD558\uC138\uC694." }), _jsx("div", { className: styles.sectionTitle, children: "\uC0AC\uC5C5\uC7A5\uBCC4 \uD604\uD669" }), _jsx("div", { className: styles.siteGrid, children: visibleSites.map((site) => (_jsxs("div", { className: `${styles.siteCard} ${site.status === 'danger' ? styles.siteCardDanger : ''}`, children: [_jsxs("div", { className: styles.siteCardHead, children: [_jsx("span", { children: site.name }), _jsx(Badge, { tone: site.status === 'danger' ? 'danger' : 'success', children: site.status === 'danger' ? '위험' : '정상' })] }), _jsx(AcousticSignal, { seed: Number(site.id.replace(/\D/g, "")), danger: site.status === "danger", compact: true }), _jsxs("div", { className: styles.siteCardMeta, children: ["\uCD5C\uADFC AI \uD310\uC815 ", KOREAN_LABEL[site.aiLabel], " ", site.aiConfidence, "%"] }), _jsxs("div", { className: styles.siteCardDoor, children: [_jsx(DoorIcon, { size: 14 }), "\uCD9C\uC785\uBB38 ", site.door === 'closed' ? '닫힘' : '열림'] })] }, site.id))) }), _jsx("div", { className: styles.sectionTitle, children: "\uCD5C\uADFC \uC774\uBCA4\uD2B8" }), _jsx("div", { className: styles.eventList, children: detectionEvents.filter((event) => selectedId === 'all' || event.siteName === selectedSite?.name).slice(0, 5).map((event, index) => (_jsxs("div", { className: styles.eventRow, children: [_jsx("span", { className: styles.eventTime, children: event.time }), _jsx("span", { className: styles.eventSite, children: event.siteName }), _jsx("span", { className: styles.eventLabel, children: event.label }), _jsx(Badge, { tone: event.kind === 'danger' ? 'danger' : 'success', children: event.kind === 'danger' ? '위험' : event.kind === 'door' ? '문 제어' : '정상' })] }, `${event.time}-${index}`))) })] }));
}











