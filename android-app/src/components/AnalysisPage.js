// 분석 페이지 - 사업장별 FFT·스펙트로그램·탐지 분석
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { SITES, getRuntimeSites, getSiteRuntimeStatus } from '../types';
import BottomNav from './BottomNav';
import Icon from './Icon';
export default function AnalysisPage({ setPage }) {
    const [siteId, setSiteId] = useState(1);
    const [tab, setTab] = useState('fft');
    const [fft, setFft] = useState(Array(48).fill(0));
    const [dominantHz, setDominantHz] = useState(0);
    const [detect, setDetect] = useState(null);
    const specRef = useRef(null);
    const runtimeSites = getRuntimeSites();
    const site = runtimeSites.find(item => item.id === siteId) ?? runtimeSites[0];
    const baseSiteProfile = {
        1: { hz: 118, confidence: 98, verdict: null, activity: 18 },
        2: { hz: 524, confidence: 84, verdict: 'bees', activity: 46 },
        3: { hz: 286, confidence: 96, verdict: 'wasps', activity: 82 },
    }[siteId] ?? { hz: 118, confidence: 98, verdict: null, activity: 18 };
    const siteProfile = getSiteRuntimeStatus(siteId) === 'normal'
        ? { hz: 118, confidence: 98, verdict: null, activity: 18 }
        : baseSiteProfile;
    /* FFT 시뮬레이션 */
    useEffect(() => {
        const id = setInterval(() => {
            const data = Array.from({ length: 48 }, (_, i) => {
                const base = Math.abs(Math.sin(Date.now() / 400 + i * 0.4)) * 35 + 8;
                const noise = Math.random() * 18;
                const siteBoost = siteId === 3 && i >= 10 && i <= 15
                    ? Math.random() * 45
                    : siteId === 2 && i >= 18 && i <= 27
                        ? Math.random() * 28
                        : 0;
                return Math.min(98, base + noise + siteBoost);
            });
            setFft(data);
            const jitter = Math.round((Math.random() - 0.5) * 24);
            const hz = Math.max(0, siteProfile.hz + jitter);
            setDominantHz(hz);
            setDetect(siteProfile.verdict);
        }, 90);
        return () => clearInterval(id);
    }, [siteId, siteProfile.hz, siteProfile.verdict]);
    /* Spectrogram 캔버스 */
    useEffect(() => {
        if (tab !== 'spec')
            return;
        const canvas = specRef.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        const W = canvas.width, H = canvas.height;
        const id = setInterval(() => {
            const img = ctx.getImageData(1, 0, W - 1, H);
            ctx.putImageData(img, 0, 0);
            for (let y = 0; y < H; y++) {
                const t = Date.now() / 600;
                const raw = Math.abs(Math.sin(t + y * 0.12)) * 0.7 + Math.random() * 0.35;
                const v = Math.min(1, raw);
                // 히트맵: 낮은값=파랑 높은값=빨강
                const r = Math.round(v > 0.5 ? (v - 0.5) * 2 * 255 : 0);
                const g = Math.round(v < 0.5 ? v * 2 * 200 : (1 - v) * 2 * 200);
                const b = Math.round(v < 0.5 ? 200 : 0);
                ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
                ctx.fillRect(W - 1, H - 1 - y, 1, 1);
            }
        }, 55);
        return () => clearInterval(id);
    }, [tab]);
    const bands = [
        { label: '저주파 0-200 Hz', desc: '배경 소음', pct: siteId === 1 ? 48 : 22, col: 'bg-sky-500' },
        { label: '중주파 200-400 Hz', desc: '말벌 탐지 구간', pct: siteId === 3 ? 82 : 24, col: 'bg-red-500', highlight: siteId === 3 },
        { label: '고주파 400-800 Hz', desc: '꿀벌 구간', pct: siteId === 2 ? 68 : 30, col: 'bg-amber-500', highlight: siteId === 2 },
        { label: '초고주파 800+ Hz', desc: '정상 범위', pct: 14, col: 'bg-emerald-500' },
    ];
    const logItems = [
        { time: '09:42:15', type: 'wasps', hz: '280 Hz', conf: 96, site: '사업장 3' },
        { time: '09:38:24', type: 'bees', hz: '520 Hz', conf: 82, site: '사업장 2' },
        { time: '09:31:05', type: 'wasps', hz: '310 Hz', conf: 78, site: '사업장 3' },
        { time: '09:22:10', type: null, hz: '90 Hz', conf: 20, site: '사업장 1' },
        { time: '09:15:33', type: 'bees', hz: '490 Hz', conf: 89, site: '사업장 2' },
    ];
    return (_jsxs("div", { className: "min-h-screen bg-[#0A0E1A] pb-[calc(9rem+env(safe-area-inset-bottom))] flex flex-col", children: [_jsxs("header", { className: "px-5 pt-6 pb-4", children: [_jsx("p", { className: "text-slate-500 text-xs font-medium tracking-wider uppercase mb-0.5", children: "Sound Analysis" }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h1", { className: "text-white text-xl font-bold", children: "\uC0AC\uC6B4\uB4DC \uBD84\uC11D" }), _jsxs("div", { className: `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${detect === 'wasps' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                    detect === 'bees' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                        'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`, children: [_jsx("span", { className: `w-1.5 h-1.5 rounded-full animate-pulse ${detect === 'wasps' ? 'bg-red-400' : detect === 'bees' ? 'bg-amber-400' : 'bg-emerald-400'}` }), detect === 'wasps' ? '말벌 탐지' : detect === 'bees' ? '꿀벌 탐지' : '정상'] })] })] }), _jsxs("section", { className: "px-5 mb-4", children: [_jsx("div", { className: "grid grid-cols-3 gap-2 rounded-2xl bg-[#0D1220] border border-white/5 p-1.5", children: runtimeSites.map(item => {
                            const active = item.id === siteId;
                            const danger = item.status === 'danger';
                            return (_jsxs("button", { onClick: () => setSiteId(item.id), className: `min-h-14 rounded-xl px-2 py-2 text-left transition-colors ${active ? 'bg-[#1A2236] ring-1 ring-buzz-500/45' : 'bg-transparent'}`, children: [_jsxs("div", { className: "flex items-center justify-between gap-1", children: [_jsx("span", { className: `text-xs font-bold ${active ? 'text-white' : 'text-slate-500'}`, children: item.name }), _jsx("span", { className: `w-2 h-2 rounded-full ${danger ? 'bg-red-400' : 'bg-emerald-400'}` })] }), _jsx("p", { className: `mt-1 text-[10px] ${danger ? 'text-red-400' : 'text-emerald-400'}`, children: danger ? '위험 감지' : '정상 연결' })] }, item.id));
                        }) }), _jsxs("div", { className: `mt-2.5 flex items-center justify-between rounded-xl border px-3.5 py-2.5 ${site.status === 'danger' ? 'bg-red-500/8 border-red-500/25' : 'bg-emerald-500/5 border-emerald-500/20'}`, children: [_jsxs("div", { children: [_jsxs("p", { className: "text-white text-xs font-semibold", children: [site.name, " \uC2E4\uC2DC\uAC04 \uBD84\uC11D"] }), _jsxs("p", { className: "text-slate-500 text-[10px] mt-0.5", children: ["CAM-0", site.id, " \u00B7 \uB9C8\uC774\uD06C \uC815\uC0C1 \u00B7 \uB370\uC774\uD130 \uC218\uC2E0 \uC911"] })] }), _jsxs("span", { className: "text-buzz-400 text-xs font-bold", children: ["\uD65C\uB3D9\uB3C4 ", siteProfile.activity, "%"] })] })] }), _jsx("div", { className: "px-5 mb-5 grid grid-cols-3 gap-3", children: [
                    { label: '주파수', value: `${dominantHz} Hz`, sub: '지배적 주파수' },
                    { label: '신뢰도', value: `${siteProfile.confidence}%`, sub: 'AI 판단' },
                    { label: '판정', value: detect === 'wasps' ? '말벌' : detect === 'bees' ? '꿀벌' : '정상', sub: '탐지 결과' },
                ].map((s, i) => (_jsxs("div", { className: "bg-[#13192B] border border-white/5 rounded-2xl px-3 py-3 text-center", children: [_jsx("p", { className: "text-slate-500 text-[10px] uppercase tracking-wider mb-1", children: s.label }), _jsx("p", { className: `text-base font-bold ${i === 2 && detect === 'wasps' ? 'text-red-400' :
                                i === 2 && detect === 'bees' ? 'text-amber-400' :
                                    'text-white'}`, children: s.value }), _jsx("p", { className: "text-slate-600 text-[10px] mt-0.5", children: s.sub })] }, i))) }), _jsx("div", { className: "px-5 mb-4", children: _jsx("div", { className: "flex gap-1 bg-[#13192B] p-1 rounded-xl border border-white/5", children: [
                        { k: 'fft', label: 'FFT' },
                        { k: 'spec', label: 'Spectro' },
                        { k: 'stats', label: '분포' },
                        { k: 'log', label: '로그' },
                    ].map(t => (_jsx("button", { onClick: () => setTab(t.k), className: `flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${tab === t.k ? 'bg-buzz-500 text-[#0A0E1A] shadow-lg shadow-buzz-500/25' : 'text-slate-500'}`, children: t.label }, t.k))) }) }), _jsxs("div", { className: "px-5 flex-1 space-y-4", children: [tab === 'fft' && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "bg-[#13192B] border border-white/5 rounded-2xl p-4", children: [_jsxs("div", { className: "flex justify-between items-center mb-3", children: [_jsx("p", { className: "text-white text-sm font-semibold", children: "FFT \uC2A4\uD399\uD2B8\uB7FC" }), _jsxs("p", { className: "text-slate-500 text-xs font-mono", children: [dominantHz, " Hz peak"] })] }), _jsx("div", { className: "h-40 bg-[#0A0E1A] rounded-xl px-2 pt-2 pb-1 flex items-end gap-0.5", children: fft.map((v, i) => {
                                            const isWasp = i >= 10 && i <= 15;
                                            return (_jsx("div", { className: "flex-1 rounded-sm transition-all duration-100", style: {
                                                    height: `${v}%`,
                                                    background: isWasp
                                                        ? `rgba(239,68,68,${0.4 + v / 160})`
                                                        : `rgba(34,211,238,${0.25 + v / 200})`,
                                                } }, i));
                                        }) }), _jsxs("div", { className: "flex justify-between mt-1.5 px-2 text-[10px] text-slate-600", children: [_jsx("span", { children: "0" }), _jsx("span", { children: "250Hz" }), _jsx("span", { children: "500Hz" }), _jsx("span", { children: "750Hz" }), _jsx("span", { children: "1.2kHz" })] })] }), _jsxs("div", { className: "bg-[#13192B] border border-white/5 rounded-2xl p-4", children: [_jsx("p", { className: "text-white text-sm font-semibold mb-4", children: "\uC8FC\uD30C\uC218 \uB300\uC5ED \uBD84\uC11D" }), _jsx("div", { className: "space-y-3", children: bands.map((b, i) => (_jsxs("div", { children: [_jsxs("div", { className: "flex justify-between text-xs mb-1.5", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: `w-2 h-2 rounded-full ${b.col}` }), _jsx("span", { className: b.highlight ? 'text-red-400 font-semibold' : 'text-slate-400', children: b.label })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-slate-500", children: b.desc }), _jsxs("span", { className: b.highlight ? 'text-red-400 font-bold' : 'text-slate-400', children: [b.pct, "%"] })] })] }), _jsx("div", { className: "h-2 bg-[#0A0E1A] rounded-full overflow-hidden", children: _jsx("div", { className: `h-full ${b.col} rounded-full transition-all duration-500`, style: { width: `${b.pct}%`, opacity: b.highlight ? 1 : 0.6 } }) })] }, i))) })] })] })), tab === 'spec' && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "bg-[#13192B] border border-white/5 rounded-2xl p-4", children: [_jsxs("div", { className: "flex justify-between items-center mb-3", children: [_jsx("p", { className: "text-white text-sm font-semibold", children: "Spectrogram" }), _jsx("span", { className: "text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full", children: "\uC2DC\uAC04-\uC8FC\uD30C\uC218 \uB9F5" })] }), _jsx("canvas", { ref: specRef, width: 340, height: 160, className: "w-full rounded-xl bg-[#0A0E1A]" }), _jsxs("div", { className: "flex justify-between mt-2 text-[10px] text-slate-600", children: [_jsx("span", { children: "\u2190 \uACFC\uAC70 (20s)" }), _jsx("span", { children: "\uD604\uC7AC \u2192" })] })] }), _jsxs("div", { className: "bg-[#13192B] border border-white/5 rounded-2xl p-4", children: [_jsx("p", { className: "text-white text-sm font-semibold mb-3", children: "\uC0C9\uC0C1 \uBC94\uB840" }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-24 h-3 rounded-full bg-gradient-to-r from-blue-600 via-green-500 to-red-500" }), _jsx("span", { className: "text-slate-400 text-xs", children: "\uC800\uAC15\uB3C4 \u2192 \uC911\uAC04 \u2192 \uACE0\uAC15\uB3C4" })] }), _jsx("div", { className: "grid grid-cols-3 gap-2 mt-1", children: [
                                                    { col: 'bg-sky-600', label: '저주파', sub: '0-200Hz' },
                                                    { col: 'bg-emerald-500', label: '중주파', sub: '200-500Hz' },
                                                    { col: 'bg-red-500', label: '고주파', sub: '500Hz+' },
                                                ].map((c, i) => (_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: `w-3 h-3 rounded ${c.col}` }), _jsxs("div", { children: [_jsx("p", { className: "text-slate-300 text-xs", children: c.label }), _jsx("p", { className: "text-slate-600 text-[10px]", children: c.sub })] })] }, i))) })] })] }), detect && (_jsxs("div", { className: `rounded-2xl p-4 border flex items-center gap-3 ${detect === 'wasps'
                                    ? 'bg-red-500/10 border-red-500/30'
                                    : 'bg-amber-500/10 border-amber-500/30'}`, children: [_jsx("div", { className: `w-11 h-11 rounded-2xl flex items-center justify-center ${detect === 'wasps' ? 'bg-red-500/15 text-red-400' : 'bg-buzz-500/15 text-buzz-400'}`, children: _jsx(Icon, { name: "bee", size: 24, strokeWidth: 1.8 }) }), _jsxs("div", { children: [_jsx("p", { className: `font-bold ${detect === 'wasps' ? 'text-red-400' : 'text-amber-400'}`, children: detect === 'wasps' ? '말벌 패턴 감지됨' : '꿀벌 패턴 감지됨' }), _jsx("p", { className: "text-slate-400 text-sm", children: detect === 'wasps' ? '200-400Hz 대역 반복 패턴' : '400-700Hz 대역 활동 증가' })] })] }))] })), tab === 'stats' && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "bg-[#13192B] border border-white/5 rounded-2xl p-5", children: [_jsx("p", { className: "text-white text-sm font-semibold mb-4", children: "\uC624\uB298 \uD0D0\uC9C0 \uBD84\uD3EC" }), _jsx("div", { className: "flex items-center justify-center mb-5", children: _jsxs("div", { className: "relative w-44 h-44", children: [_jsxs("svg", { className: "w-full h-full -rotate-90", viewBox: "0 0 100 100", children: [_jsx("circle", { cx: "50", cy: "50", r: "42", fill: "none", stroke: "#1A2236", strokeWidth: "12" }), _jsx("circle", { cx: "50", cy: "50", r: "42", fill: "none", stroke: "#10B981", strokeWidth: "12", strokeLinecap: "round", strokeDasharray: `${0.60 * 263.9} 263.9`, strokeDashoffset: "0" }), _jsx("circle", { cx: "50", cy: "50", r: "42", fill: "none", stroke: "#EF4444", strokeWidth: "12", strokeLinecap: "round", strokeDasharray: `${0.25 * 263.9} 263.9`, strokeDashoffset: -0.60 * 263.9 - 4 }), _jsx("circle", { cx: "50", cy: "50", r: "42", fill: "none", stroke: "#F7B500", strokeWidth: "12", strokeLinecap: "round", strokeDasharray: `${0.15 * 263.9} 263.9`, strokeDashoffset: -0.85 * 263.9 - 8 })] }), _jsxs("div", { className: "absolute inset-0 flex flex-col items-center justify-center", children: [_jsx("span", { className: "text-white text-3xl font-bold", children: "24" }), _jsx("span", { className: "text-slate-500 text-xs", children: "\uCD1D \uD0D0\uC9C0" })] })] }) }), _jsx("div", { className: "space-y-2.5", children: [
                                            { col: 'bg-emerald-500', label: '정상', count: 14, pct: 60 },
                                            { col: 'bg-red-500', label: '위험 (말벌)', count: 6, pct: 25 },
                                            { col: 'bg-buzz-500', label: '참고 (꿀벌)', count: 4, pct: 15 },
                                        ].map((l, i) => (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: `w-3 h-3 rounded-full ${l.col}` }), _jsx("span", { className: "text-slate-300 text-sm flex-1", children: l.label }), _jsxs("span", { className: "text-white text-sm font-bold", children: [l.count, "\uAC74"] }), _jsxs("span", { className: "text-slate-500 text-xs w-10 text-right", children: [l.pct, "%"] })] }, i))) })] }), _jsxs("div", { className: "bg-[#13192B] border border-white/5 rounded-2xl p-4", children: [_jsx("p", { className: "text-white text-sm font-semibold mb-4", children: "\uC2DC\uAC04\uB300\uBCC4 \uD0D0\uC9C0" }), _jsx("div", { className: "h-24 flex items-end gap-1", children: [30, 45, 25, 60, 80, 95, 70, 50, 40, 55, 75, 100, 85, 65, 45, 35].map((v, i) => (_jsx("div", { className: `flex-1 rounded-t ${v > 85 ? 'bg-red-500' : v > 55 ? 'bg-buzz-500' : 'bg-emerald-500/70'}`, style: { height: `${v}%` } }, i))) }), _jsxs("div", { className: "flex justify-between mt-2 text-[10px] text-slate-600", children: [_jsx("span", { children: "00\uC2DC" }), _jsx("span", { children: "06\uC2DC" }), _jsx("span", { children: "12\uC2DC" }), _jsx("span", { children: "18\uC2DC" }), _jsx("span", { children: "24\uC2DC" })] })] })] })), tab === 'log' && (_jsxs("div", { className: "bg-[#13192B] border border-white/5 rounded-2xl overflow-hidden", children: [_jsxs("div", { className: "px-4 py-3 border-b border-white/5 flex justify-between items-center", children: [_jsx("p", { className: "text-white text-sm font-semibold", children: "\uBD84\uC11D \uB85C\uADF8" }), _jsxs("span", { className: "text-slate-500 text-xs", children: [logItems.filter(item => item.site === site.name).length, "\uAC74"] })] }), _jsx("div", { className: "divide-y divide-white/5", children: logItems.filter(item => item.site === site.name).map((item, i) => (_jsxs("div", { className: "px-4 py-3 flex items-center gap-3", children: [_jsx("div", { className: `w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${item.type === 'wasps' ? 'bg-red-500/20 text-red-400' :
                                                item.type === 'bees' ? 'bg-buzz-500/15 text-buzz-400' : 'bg-emerald-500/15 text-emerald-400'}`, children: _jsx(Icon, { name: item.type ? 'bee' : 'check', size: 18, strokeWidth: 1.9 }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 mb-0.5", children: [_jsx("span", { className: `text-sm font-semibold ${item.type === 'wasps' ? 'text-red-400' :
                                                                item.type === 'bees' ? 'text-amber-400' : 'text-emerald-400'}`, children: item.type === 'wasps' ? '말벌' : item.type === 'bees' ? '꿀벌' : '정상' }), _jsx("span", { className: "text-slate-600 text-xs", children: item.hz })] }), _jsxs("p", { className: "text-slate-500 text-xs", children: [item.site, " \u00B7 ", item.time] })] }), _jsxs("div", { className: "text-right flex-shrink-0", children: [_jsxs("p", { className: `text-sm font-bold ${item.conf >= 80 ? 'text-white' : 'text-slate-500'}`, children: [item.conf, "%"] }), _jsx("p", { className: "text-slate-600 text-[10px]", children: "\uC2E0\uB8B0\uB3C4" })] })] }, i))) })] }))] }), _jsx(BottomNav, { currentPage: "analysis", setPage: setPage })] }));
}
