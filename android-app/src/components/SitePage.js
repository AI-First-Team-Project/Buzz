// 사업장 상세 페이지 - 선택 사업장의 CCTV·알림·개폐기 확인
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { SITES, SITE_ALERTS, SITE_GATES, getLatestDetection, getRuntimeSites, getSiteRuntimeStatus } from '../types';
import BottomNav from './BottomNav';
import Icon from './Icon';
export default function SitePage({ siteId, setPage, onSwitchSite }) {
    const site = getRuntimeSites().find(s => s.id === siteId) ?? SITES[0];
    const isDanger = site.status === 'danger';
    const [time, setTime] = useState(new Date());
    const [scan, setScan] = useState(0);
    const latestDetection = getLatestDetection();
    const siteAlerts = site.id === 3
        ? (isDanger
            ? [{ id: 'latest', time: latestDetection?.time ?? '방금', siteId: 3, status: 'danger', insect: 'wasps', msg: `말벌 ${latestDetection?.count ?? 1}마리 탐지` }]
            : [{ id: 'normal', time: '현재', siteId: 3, status: 'normal', insect: null, msg: '정상 상태 확인' }])
        : SITE_ALERTS.filter(a => a.siteId === site.id).slice(0, 4);
    const siteGates = getSavedSiteGates(site.id);
    const dangerCount = siteAlerts.filter(a => a.status === 'danger').length;
    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);
    useEffect(() => {
        if (!isDanger)
            return;
        const t = setInterval(() => setScan(p => (p + 1.5) % 100), 25);
        return () => clearInterval(t);
    }, [isDanger]);
    return (_jsxs("div", { className: "min-h-screen bg-[#0A0E1A] flex flex-col pb-[calc(9rem+env(safe-area-inset-bottom))]", children: [_jsx("header", { className: "px-4 pt-5 pb-3", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { onClick: () => setPage('home'), className: "w-9 h-9 rounded-xl bg-[#13192B] border border-white/8 flex items-center justify-center text-slate-400 active:bg-white/5", children: _jsx(Icon, { name: "arrow-left", size: 20, strokeWidth: 2 }) }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h1", { className: "text-white text-lg font-bold leading-none", children: site.name }), _jsx("span", { className: `text-[10px] font-bold px-2 py-0.5 rounded-md ${isDanger ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-500 text-white'}`, children: isDanger ? '위험' : '정상' })] }), _jsxs("p", { className: "text-slate-500 text-[11px] mt-1", children: ["CCTV CAM-0", site.id, " \u00B7 ", time.toLocaleTimeString('ko-KR', { hour12: false })] })] }), _jsx("div", { className: "flex gap-1 bg-[#13192B] border border-white/8 rounded-xl p-1", children: SITES.map(s => (_jsx("button", { onClick: () => s.id !== site.id && onSwitchSite(s.id), className: `w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold transition-all ${s.id === site.id
            ? 'bg-amber-500 text-white'
                                    : 'text-slate-500 active:bg-white/5'}`, children: s.id }, s.id))) })] }) }), _jsx("section", { className: "px-4 mb-4", children: _jsxs("div", { className: `relative rounded-2xl overflow-hidden border aspect-[4/3] ${isDanger ? 'border-red-500/50' : 'border-white/6'}`, children: [_jsxs("div", { className: "absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900", children: [_jsx("video", { src: `/videos/site-${site.id}.mp4`, poster: isDanger ? '/images/wasp.jpg' : '/images/honeycomb-dark.jpg', autoPlay: true, muted: true, loop: true, playsInline: true, preload: "metadata", "aria-label": `${site.name} CCTV 대체 영상`, className: "absolute inset-0 w-full h-full object-cover opacity-80" }), _jsx("div", { className: `absolute inset-0 ${isDanger ? 'bg-gradient-to-r from-transparent via-transparent to-red-950/45' : 'bg-transparent'}` }), _jsxs("svg", { className: "absolute inset-0 w-full h-full opacity-[0.07]", viewBox: "0 0 40 40", preserveAspectRatio: "xMidYMid slice", children: [_jsx("defs", { children: _jsx("pattern", { id: `sd${site.id}`, width: "8", height: "8", patternUnits: "userSpaceOnUse", children: _jsx("path", { d: "M 8 0 L 0 0 0 8", fill: "none", stroke: "white", strokeWidth: "0.5" }) }) }), _jsx("rect", { width: "40", height: "40", fill: `url(#sd${site.id})` })] })] }), isDanger && (_jsx("div", { className: "absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-400/70 to-transparent pointer-events-none", style: { top: `${scan}%` } })), isDanger && site.id === 3 && (_jsxs("div", { className: "absolute top-12 right-3 w-[42%] overflow-hidden rounded-xl border-2 border-red-500 bg-black shadow-xl shadow-black/60", children: [_jsx("video", { src: "/videos/site-3.mp4", autoPlay: true, muted: true, loop: true, playsInline: true, className: "aspect-video w-full object-cover" }), _jsx("div", { className: "absolute inset-2 border border-red-400" }), _jsxs("div", { className: "absolute left-0 right-0 top-0 flex items-center justify-between bg-red-600/95 px-2 py-1 text-[9px] font-bold text-white", children: [_jsx("span", { children: "침입 개체 확대" }), _jsxs("span", { children: ["말벌 1 · ", site.confidence, "%"] })] })] })), isDanger && site.id === 3 && (_jsxs("div", { className: "absolute left-3 top-1/2 -translate-y-1/2", children: [_jsx("div", { className: "h-24 border-l-2 border-dashed border-amber-300" }), _jsx("span", { className: "absolute left-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-black/75 px-2 py-1 text-[9px] font-bold text-amber-300", children: "외부 → 감시구역 침입" })] })), _jsxs("div", { className: "absolute top-0 left-0 right-0 flex items-center justify-between px-3 pt-3", children: [_jsxs("div", { className: "flex items-center gap-1.5 bg-black/55 rounded-lg px-2 py-1", children: [_jsx("span", { className: "w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" }), _jsx("span", { className: "text-white text-[10px] font-mono font-bold", children: "REC" })] }), _jsxs("div", { className: "bg-black/55 rounded-lg px-2 py-1 text-white text-[10px] font-mono", children: ["CAM-0", site.id] })] }), _jsxs("div", { className: "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 pt-8 pb-3 flex items-end justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white font-bold text-sm", children: site.name }), isDanger ? (_jsxs("p", { className: "text-red-300 text-xs font-semibold", children: ["침입 감지 · 말벌 ", site.count, "마리"] })) : (_jsx("p", { className: "text-emerald-400 text-xs font-medium", children: "이상 없음" }))] }), isDanger && _jsx(Icon, { name: "bee", size: 31, className: "text-red-300" })] })] }) }), _jsxs("section", { className: "px-4 mb-4 grid grid-cols-3 gap-2", children: [_jsxs("div", { className: `rounded-xl px-3 py-2.5 border text-center ${isDanger ? 'bg-red-500/10 border-red-500/25' : 'bg-emerald-500/10 border-emerald-500/25'}`, children: [_jsx("p", { className: `text-lg font-bold ${isDanger ? 'text-red-400' : 'text-emerald-400'}`, children: isDanger ? site.count : 0 }), _jsx("p", { className: "text-slate-500 text-[10px]", children: "\uAC10\uC9C0 \uC218\uB7C9" })] }), _jsxs("div", { className: "bg-[#13192B] border border-white/6 rounded-xl px-3 py-2.5 text-center", children: [_jsx("p", { className: "text-lg font-bold text-white", children: isDanger ? `${site.confidence}%` : '—' }), _jsx("p", { className: "text-slate-500 text-[10px]", children: "AI \uC2E0\uB8B0\uB3C4" })] }), _jsxs("div", { className: `rounded-xl px-3 py-2.5 border text-center ${isDanger ? 'bg-red-500/10 border-red-500/25' : 'bg-emerald-500/10 border-emerald-500/25'}`, children: [_jsx("p", { className: `text-lg font-bold ${isDanger ? 'text-red-400' : 'text-emerald-400'}`, children: isDanger ? '위험' : '정상' }), _jsx("p", { className: "text-slate-500 text-[10px]", children: "\uD604\uC7AC \uC0C1\uD0DC" })] })] }), _jsxs("section", { className: "px-4 mb-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-2.5", children: [_jsx("h2", { className: "text-white text-[13px] font-bold", children: "\uC774 \uC0AC\uC5C5\uC7A5 \uC54C\uB9BC" }), _jsxs("span", { className: "text-[11px] text-slate-500", children: ["\uC704\uD5D8 ", dangerCount, "\uAC74"] })] }), _jsxs("div", { className: "space-y-2", children: [siteAlerts.length === 0 && (_jsx("div", { className: "bg-[#13192B] border border-white/5 rounded-2xl p-4 text-center", children: _jsx("p", { className: "text-slate-500 text-sm", children: "\uC544\uC9C1 \uC54C\uB9BC\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" }) })), siteAlerts.map(a => (_jsxs("div", { className: `flex items-center gap-3 px-3.5 py-3 rounded-2xl border ${a.status === 'danger' ? 'bg-red-500/8 border-red-500/20' : 'bg-emerald-500/5 border-emerald-500/15'}`, children: [_jsx("div", { className: `w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${a.status === 'danger' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}`, children: _jsx(Icon, { name: a.status === 'danger' ? 'bee' : 'check', size: 19, strokeWidth: 1.9 }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-white text-sm font-semibold leading-tight", children: a.msg }), _jsx("p", { className: "text-slate-500 text-[11px] mt-0.5", children: a.time })] }), _jsx("span", { className: `text-[11px] font-bold px-2.5 py-1 rounded-lg border flex-shrink-0 ${a.status === 'danger'
                                            ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'}`, children: a.status === 'danger' ? '위험' : '정상' })] }, a.id)))] })] }), _jsxs("section", { className: "px-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-2.5", children: [_jsx("h2", { className: "text-white text-[13px] font-bold", children: "\uAC1C\uD3D0\uAE30 \uC0C1\uD0DC" }), _jsx("button", { onClick: () => setPage('gate'), className: "text-[11px] text-amber-400 font-semibold", children: "\uC804\uCCB4 \uAD00\uB9AC \u2192" })] }), _jsx("div", { className: "space-y-2", children: siteGates.map(gate => {
                            const isOpen = gate.status === 'open';
                            return (_jsxs("div", { className: `flex items-center gap-3 px-3.5 py-3 rounded-2xl border ${isOpen ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`, children: [_jsx("div", { className: `w-9 h-9 rounded-xl flex items-center justify-center ${isOpen ? 'bg-emerald-500/15' : 'bg-red-500/15'}`, children: _jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, className: `w-4.5 h-4.5 ${isOpen ? 'text-emerald-400' : 'text-red-400'}`, children: isOpen
                                                ? _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" })
                                                : _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" }) }) }), _jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "text-white text-sm font-semibold", children: gate.name }), _jsxs("p", { className: "text-slate-500 text-[11px]", children: [gate.lastAction, " \u00B7 ", gate.lastTime] })] }), _jsx("span", { className: `text-[11px] font-bold px-2.5 py-1 rounded-lg border ${isOpen
                                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                            : 'bg-red-500/15 text-red-400 border-red-500/30'}`, children: isOpen ? '개방' : '차단' })] }, gate.id));
                        }) })] }), _jsx(BottomNav, { currentPage: "home", setPage: setPage })] }));
}
function getSavedSiteGates(siteId) {
    const fallback = SITE_GATES[siteId] ?? [];
    const siteIsNormal = getSiteRuntimeStatus(siteId) === 'normal';
    const saved = window.localStorage.getItem('buzz-gates');
    if (!saved)
        return siteIsNormal
            ? fallback.map(gate => ({ ...gate, status: 'open', lastAction: '정상 개방', lastTime: '현재' }))
            : fallback;
    try {
        const siteName = `사업장 ${siteId}`;
        const savedGate = JSON.parse(saved).find(gate => gate.site === siteName);
        if (!savedGate)
            return fallback;
        const gateWasAutoClosed = savedGate.status === 'closed' && savedGate.lastAction?.includes('자동 차단');
        return [{
                ...fallback[0],
                id: fallback[0]?.id ?? siteId * 100 + 1,
                name: '개폐기',
                status: siteIsNormal && gateWasAutoClosed ? 'open' : savedGate.status,
                lastAction: siteIsNormal && gateWasAutoClosed ? '정상 개방' : savedGate.lastAction,
                lastTime: siteIsNormal && gateWasAutoClosed ? '현재' : savedGate.lastTime,
            }];
    }
    catch {
        return fallback;
    }
}
