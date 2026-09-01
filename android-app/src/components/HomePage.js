// 홈 페이지 - 전체 탐지 현황과 사업장별 CCTV 확인
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { getLatestDetection, getRuntimeSites, getSiteRuntimeStatus, setSiteRuntimeStatus } from '../types';
import BottomNav from './BottomNav';
import { BuzzMark } from './Logo';
import Icon from './Icon';
export default function HomePage({ setPage, onOpenSite }) {
    const [time, setTime] = useState(new Date());
    const [sites, setSites] = useState(() => {
        const runtimeSites = getRuntimeSites();
        return runtimeSites.map(site => getSiteRuntimeStatus(site.id) === null
            ? { ...site, status: 'normal', insect: null, count: 0, confidence: 0 }
            : site);
    });
    const [selectedSiteId, setSelectedSiteId] = useState(3);
    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);
    useEffect(() => {
        const intrusionAlert = new Audio('/audio/intrusion-alert.mp3');
        intrusionAlert.preload = 'auto';
        intrusionAlert.volume = 0.55;
        [1, 2].forEach(siteId => setSiteRuntimeStatus(siteId, 'normal'));
        const runtimeStatus = getSiteRuntimeStatus(3);
        const detectionTimers = [];
        if (runtimeStatus !== 'danger') {
            if (runtimeStatus === null)
                setSiteRuntimeStatus(3, 'normal');
            const rearmAt = Number(window.localStorage.getItem('buzz-site-3-rearm-at') ?? 0);
            const detectionDelay = Math.max(8000, rearmAt - Date.now());
            detectionTimers.push(setTimeout(() => {
                setSiteRuntimeStatus(3, 'danger');
                window.localStorage.removeItem('buzz-site-3-rearm-at');
                setSites(getRuntimeSites());
                intrusionAlert.currentTime = 0;
                intrusionAlert.play().catch(() => undefined);
            }, detectionDelay));
        }
        setSites(getRuntimeSites());
        return () => {
            detectionTimers.forEach(clearTimeout);
            intrusionAlert.pause();
        };
    }, []);
    const dangerCount = sites.filter(s => s.status === 'danger').length;
    const normalCount = sites.filter(s => s.status === 'normal').length;
    const selectedSite = sites.find(site => site.id === selectedSiteId) ?? sites[0];
    const totalDetected = sites.reduce((sum, site) => sum + site.count, 0);
    const latestDetection = getLatestDetection();
    return (_jsxs("div", { className: "min-h-screen bg-[#0A0E1A] flex flex-col pb-[calc(9rem+env(safe-area-inset-bottom))]", children: [_jsxs("header", { className: "px-5 pt-6 pb-3 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(BuzzMark, { size: 36 }), _jsx("p", { className: "font-brand text-white font-bold text-lg", style: { letterSpacing: '0.22em' }, children: "BUZZ" })] }), _jsxs("div", { className: "flex items-center gap-1.5 bg-ink-800 border border-white/8 rounded-xl px-3 py-1.5", children: [_jsx("span", { className: "w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" }), _jsx("p", { className: "text-buzz-400 text-xs font-mono font-bold", children: time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) })] })] }), _jsx("section", { className: "px-5 mb-4", children: _jsxs("div", { className: "relative rounded-3xl overflow-hidden border border-buzz-500/25 aspect-[4/3]", children: [_jsx("img", { src: "/images/hero.jpg", alt: "", className: "absolute inset-0 w-full h-full object-cover" }), _jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-[#0A0E1A] via-[#0A0E1A]/55 to-transparent" }), _jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-[#0A0E1A]/70 via-transparent to-transparent" }), _jsxs("div", { className: "absolute top-3.5 left-4 right-4 flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "font-brand text-buzz-400 text-[10px] font-semibold mb-1", style: { letterSpacing: '0.3em' }, children: "BEE INTRUSION AI" }), _jsxs("h1", { className: "text-white text-2xl font-bold leading-tight", children: ["\uCE68\uC785 \uAC10\uC9C0", _jsx("br", {}), "\uBAA8\uB2C8\uD130\uB9C1"] })] }), _jsxs("div", { className: "relative w-14 h-14", children: [_jsxs("svg", { className: "w-full h-full -rotate-90", viewBox: "0 0 48 48", children: [_jsx("circle", { cx: "24", cy: "24", r: "20", fill: "#0A0E1A", fillOpacity: "0.6", stroke: "#1F2937", strokeWidth: "4" }), _jsx("circle", { cx: "24", cy: "24", r: "20", fill: "none", stroke: "#EF4444", strokeWidth: "4", strokeLinecap: "round", strokeDasharray: `${(dangerCount / 3) * 125.6} 125.6` })] }), _jsxs("div", { className: "absolute inset-0 flex flex-col items-center justify-center", children: [_jsx("span", { className: "text-white font-bold text-base leading-none", children: dangerCount }), _jsx("span", { className: "text-slate-400 text-[8px] mt-0.5", children: "\uC704\uD5D8" })] })] })] }), _jsxs("div", { className: "absolute bottom-3.5 left-4 right-4 flex gap-2", children: [_jsxs("div", { className: "flex items-center gap-2 bg-red-500/90 rounded-xl px-3 py-2 backdrop-blur-sm", children: [_jsx(Icon, { name: "alert", size: 13, className: "text-white" }), _jsxs("span", { className: "text-white text-[11px] font-bold", children: ["\uC704\uD5D8 ", dangerCount, "\uACF3"] })] }), _jsxs("div", { className: "flex items-center gap-2 bg-emerald-500/90 rounded-xl px-3 py-2 backdrop-blur-sm", children: [_jsx(Icon, { name: "shield", size: 13, className: "text-white" }), _jsxs("span", { className: "text-white text-[11px] font-bold", children: ["\uC815\uC0C1 ", normalCount, "\uACF3"] })] }), _jsxs("button", { onClick: () => setPage('gate'), className: "ml-auto flex items-center gap-1.5 bg-buzz-500 rounded-xl px-3 py-2 active:bg-buzz-600 transition-colors", children: [_jsx(Icon, { name: "gate-closed", size: 14, className: "text-[#0A0E1A]", strokeWidth: 2.2 }), _jsx("span", { className: "text-[#0A0E1A] text-[11px] font-bold", children: "\uAC1C\uD3D0\uAE30" })] })] })] }) }), _jsxs("section", { className: "px-5 mb-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-2.5", children: [_jsx("h2", { className: "text-white text-[13px] font-bold", children: "\uC804\uCCB4 \uACB0\uACFC" }), _jsx("button", { onClick: () => setPage('result'), className: "text-[11px] text-buzz-400 font-semibold", children: "\uACB0\uACFC \uC0C1\uC138 \u2192" })] }), _jsxs("div", { className: "grid grid-cols-3 gap-2", children: [_jsxs("button", { onClick: () => setSelectedSiteId(3), className: "rounded-2xl border border-red-500/25 bg-red-500/8 px-3 py-3 text-left", children: [_jsx("p", { className: "text-red-400 text-xl font-bold leading-none", children: dangerCount }), _jsx("p", { className: "text-slate-300 text-xs font-semibold mt-2", children: "\uC704\uD5D8 \uC0AC\uC5C5\uC7A5" }), _jsx("p", { className: "text-slate-600 text-[10px] mt-0.5", children: "\uC989\uC2DC \uD655\uC778 \uD544\uC694" })] }), _jsxs("div", { className: "rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-3", children: [_jsx("p", { className: "text-emerald-400 text-xl font-bold leading-none", children: normalCount }), _jsx("p", { className: "text-slate-300 text-xs font-semibold mt-2", children: "\uC815\uC0C1 \uC0AC\uC5C5\uC7A5" }), _jsx("p", { className: "text-slate-600 text-[10px] mt-0.5", children: "\uC5F0\uACB0 \uC0C1\uD0DC \uC815\uC0C1" })] }), _jsxs("div", { className: "rounded-2xl border border-buzz-500/20 bg-buzz-500/5 px-3 py-3", children: [_jsx("p", { className: "text-buzz-400 text-xl font-bold leading-none", children: totalDetected }), _jsx("p", { className: "text-slate-300 text-xs font-semibold mt-2", children: "\uD0D0\uC9C0 \uAC1C\uCCB4" }), _jsx("p", { className: "text-slate-600 text-[10px] mt-0.5", children: "\uC624\uB298 \uB204\uC801 \uACB0\uACFC" })] })] })] }), _jsxs("section", { className: "px-5 mb-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-2.5", children: [_jsx("h2", { className: "text-white text-[13px] font-bold", children: "\uC0AC\uC5C5\uC7A5 CCTV" }), _jsx("span", { className: "text-[11px] text-slate-500", children: "\uC0AC\uC5C5\uC7A5\uC744 \uC120\uD0DD\uD558\uC138\uC694" })] }), _jsx("div", { className: "grid grid-cols-3 gap-2 mb-2.5 rounded-2xl border border-white/5 bg-[#0D1220] p-1.5", children: sites.map(site => {
                            const active = site.id === selectedSiteId;
                            const danger = site.status === 'danger';
                            return (_jsxs("button", { onClick: () => setSelectedSiteId(site.id), className: `rounded-xl px-2 py-2.5 transition-colors ${active ? 'bg-[#1A2236] ring-1 ring-buzz-500/45' : ''}`, children: [_jsxs("div", { className: "flex items-center justify-center gap-1.5", children: [_jsx("span", { className: `w-1.5 h-1.5 rounded-full ${danger ? 'bg-red-400' : 'bg-emerald-400'}` }), _jsx("span", { className: `text-xs font-bold ${active ? 'text-white' : 'text-slate-500'}`, children: site.name })] }), _jsx("p", { className: `text-[10px] mt-1 ${danger ? 'text-red-400' : 'text-emerald-400'}`, children: danger ? '위험' : '정상' })] }, site.id));
                        }) }), _jsxs("div", { className: "space-y-2.5", children: [_jsx(SiteCard, { site: selectedSite, onOpen: () => onOpenSite(selectedSite.id) }), _jsxs("button", { onClick: () => onOpenSite(selectedSite.id), className: "w-full rounded-xl border border-white/8 bg-[#13192B] py-2.5 text-xs font-semibold text-slate-300 active:bg-[#1A2236]", children: [selectedSite.name, " CCTV \uBD84\uC11D \uC0C1\uC138 \uBCF4\uAE30 \u2192"] })] })] }), _jsxs("section", { className: "px-5 flex-1 min-h-0", children: [_jsxs("div", { className: "flex items-center justify-between mb-2.5", children: [_jsx("h2", { className: "text-white text-[13px] font-bold", children: "\uC2E4\uC2DC\uAC04 \uC54C\uB9BC" }), _jsx("button", { onClick: () => setPage('result'), className: "text-[11px] text-buzz-400 font-semibold", children: "\uC804\uCCB4\uBCF4\uAE30 \u2192" })] }), _jsx("div", { className: "space-y-2", children: [
                            { id: 1, time: '09:42', site: '사업장 3', danger: true, msg: `말벌 ${latestDetection?.count ?? 1}마리 탐지`, onOpen: () => onOpenSite(3) },
                            { id: 2, time: '09:31', site: '사업장 1', danger: false, msg: '정상 상태 확인', onOpen: () => onOpenSite(1) },
                            { id: 3, time: '09:25', site: '사업장 2', danger: false, msg: '정상 상태 확인', onOpen: () => onOpenSite(2) },
                            { id: 4, time: '08:55', site: '사업장 3', danger: true, msg: '말벌 4마리 탐지', onOpen: () => onOpenSite(3) },
                        ].map(a => (_jsx("button", { onClick: a.onOpen, className: "w-full", children: _jsxs("div", { className: `flex items-center gap-3 px-3 py-2.5 rounded-2xl border ${a.danger ? 'bg-red-500/8 border-red-500/25' : 'bg-emerald-500/5 border-emerald-500/20'}`, children: [_jsx("div", { className: `w-10 h-10 rounded-xl flex-shrink-0 border flex items-center justify-center ${a.danger
                                            ? 'border-red-500/40 bg-red-500/15 text-red-400'
                                            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'}`, children: _jsx(Icon, { name: a.danger ? 'bee' : 'check', size: 20, strokeWidth: 1.9 }) }), _jsxs("div", { className: "flex-1 min-w-0 text-left", children: [_jsx("p", { className: "text-white text-sm font-semibold leading-tight", children: a.msg }), _jsxs("p", { className: "text-slate-500 text-[11px] mt-0.5", children: [a.site, " \u00B7 ", a.time] })] }), _jsx("span", { className: `text-[11px] font-bold px-2.5 py-1 rounded-lg flex-shrink-0 ${a.danger ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`, children: a.danger ? '위험' : '정상' })] }) }, a.id))) })] }), _jsx(BottomNav, { currentPage: "home", setPage: setPage })] }));
}
/* ── 사업장 카드 (가로 풀width, 사진 배경) ── */
function SiteCard({ site, onOpen }) {
    const isDanger = site.status === 'danger';
    const [scan, setScan] = useState(0);
    useEffect(() => {
        if (!isDanger)
            return;
        const t = setInterval(() => setScan(p => (p + 2) % 100), 25);
        return () => clearInterval(t);
    }, [isDanger]);
    return (_jsxs("button", { onClick: onOpen, className: `relative w-full aspect-[21/9] rounded-2xl overflow-hidden text-left border active:opacity-90 transition-opacity ${isDanger ? 'border-red-500/60 shadow-lg shadow-red-500/15' : 'border-white/8'}`, children: [_jsx("video", { src: `/videos/site-${site.id}.mp4`, poster: isDanger ? '/images/wasp.jpg' : '/images/honeycomb-dark.jpg', autoPlay: true, muted: true, loop: true, playsInline: true, preload: "metadata", "aria-label": `${site.name} CCTV 대체 영상`, className: `absolute inset-0 w-full h-full ${site.id === 3 ? 'object-contain bg-black' : 'object-cover'}` }), _jsx("div", { className: `absolute inset-0 ${isDanger
                    ? 'bg-gradient-to-r from-[#1A0505]/95 via-[#0A0E1A]/70 to-[#7F1D1D]/40'
                    : 'bg-gradient-to-r from-[#0A0E1A]/95 via-[#0A0E1A]/60 to-[#0A0E1A]/20'}` }), isDanger && (_jsx("div", { className: "absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-400/80 to-transparent pointer-events-none", style: { top: `${scan}%` } })), isDanger && (_jsxs("div", { className: "absolute border-2 border-red-500 rounded", style: { left: '44%', top: '20%', width: '12%', height: '60%' }, children: [[
                        '-top-1 -left-1 border-t-2 border-l-2',
                        '-top-1 -right-1 border-t-2 border-r-2',
                        '-bottom-1 -left-1 border-b-2 border-l-2',
                        '-bottom-1 -right-1 border-b-2 border-r-2',
                    ].map((cls, ci) => (_jsx("div", { className: `absolute w-3 h-3 border-red-400 bg-transparent ${cls}` }, ci))), _jsxs("div", { className: "absolute -top-6 left-0 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md", children: ["\uB9D0\uBC8C ", site.confidence, "%"] })] })), _jsxs("div", { className: "absolute top-2.5 left-3 right-3 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-0.5", children: [_jsx("span", { className: "w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" }), _jsxs("span", { className: "text-white text-[9px] font-mono font-bold", children: ["CAM-0", site.id] })] }), _jsx("span", { className: `text-[10px] font-bold px-2.5 py-1 rounded-lg ${isDanger ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-500 text-white'}`, children: isDanger ? '위험' : '정상' })] }), _jsx("div", { className: "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 to-transparent px-3.5 pt-8 pb-2.5", children: _jsxs("div", { className: "flex items-end justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white text-sm font-bold", children: site.name }), isDanger ? (_jsxs("p", { className: "text-red-300 text-[11px] font-medium mt-0.5", children: [site.count, "\uB9C8\uB9AC \uAC10\uC9C0\uB428 \u00B7 \uC2E0\uB8B0\uB3C4 ", site.confidence, "%"] })) : (_jsx("p", { className: "text-emerald-400 text-[11px] font-medium mt-0.5", children: "\uC774\uC0C1 \uC5C6\uC74C" }))] }), _jsx("div", { className: "bg-white/12 rounded-lg p-1.5 backdrop-blur-sm text-white", children: _jsx(Icon, { name: "chevron-right", size: 14, strokeWidth: 2.5 }) })] }) })] }));
}
