// 개폐기 페이지 - 사업장별 개폐기 상태 확인 및 제어
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { getSiteRuntimeStatus, setSiteRuntimeStatus } from '../types';
import BottomNav from './BottomNav';
import Icon from './Icon';
const INIT_GATES = [
    { id: 1, name: '개폐기', site: '사업장 1', status: 'open', mode: 'auto', lastAction: '정상 개방', lastTime: '09:42:14', autoTrigger: '말벌 탐지 시 자동 차단' },
    { id: 2, name: '개폐기', site: '사업장 2', status: 'open', mode: 'auto', lastAction: '정상 개방', lastTime: '09:42:14', autoTrigger: '말벌 탐지 시 자동 차단' },
    { id: 3, name: '개폐기', site: '사업장 3', status: 'closed', mode: 'auto', lastAction: '말벌 탐지 자동 차단', lastTime: '09:42:15', autoTrigger: '말벌 탐지 시 자동 차단' },
];
export default function GatePage({ setPage }) {
    const [selectedSite, setSelectedSite] = useState('사업장 1');
    const [gates, setGates] = useState(() => {
        const saved = window.localStorage.getItem('buzz-gates');
        const savedGates = saved ? JSON.parse(saved) : INIT_GATES;
        const initialGates = ['사업장 1', '사업장 2', '사업장 3'].map((site, index) => {
            const savedGate = savedGates.find(gate => gate.site === site) ?? INIT_GATES[index];
            return { ...savedGate, id: index + 1, name: '개폐기', site };
        });
        return initialGates.map(gate => {
            const siteId = Number(gate.site.replace(/\D/g, ''));
            return getSiteRuntimeStatus(siteId) === 'danger'
                ? { ...gate, status: 'closed', mode: 'auto', lastAction: '말벌 탐지 자동 차단' }
                : gate;
        });
    });
    const [confirm, setConfirm] = useState(null);
    const [toastMsg, setToastMsg] = useState('');
    useEffect(() => {
        window.localStorage.setItem('buzz-gates', JSON.stringify(gates));
    }, [gates]);
    const showToast = (msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(''), 2000);
    };
    const applyAction = (gate, action) => {
        const nextGates = gates.map(g => g.id === gate.id
            ? {
                ...g,
                status: action === 'open' ? 'open' : 'closed',
                mode: 'manual',
                lastAction: action === 'open' ? '수동 열림' : '수동 닫힘',
                lastTime: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
            }
            : g);
        setGates(nextGates);
        window.localStorage.setItem('buzz-gates', JSON.stringify(nextGates));
        if (action === 'open') {
            const siteId = Number(gate.site.replace(/\D/g, ''));
            setSiteRuntimeStatus(siteId, 'normal');
            if (siteId === 3)
                window.localStorage.setItem('buzz-site-3-rearm-at', String(Date.now() + 30000));
        }
        showToast(`${gate.site} ${gate.name} ${action === 'open' ? '개방 완료 · 정상 상태로 전환' : '차단 완료'}`);
        setConfirm(null);
    };
    const toggleMode = (id) => {
        setGates(prev => prev.map(g => g.id === id ? { ...g, mode: g.mode === 'auto' ? 'manual' : 'auto' } : g));
    };
    // 사이트별 그룹
    const grouped = {};
    gates.forEach(g => {
        if (!grouped[g.site])
            grouped[g.site] = [];
        grouped[g.site].push(g);
    });
    const totalOpen = gates.filter(g => g.status === 'open').length;
    const totalClosed = gates.filter(g => g.status === 'closed').length;
    const selectedGates = grouped[selectedSite] ?? [];
    const selectedOpen = selectedGates.filter(g => g.status === 'open').length;
    const selectedClosed = selectedGates.filter(g => g.status === 'closed').length;
    return (_jsxs("div", { className: "min-h-screen bg-[#0A0E1A] flex flex-col pb-[calc(9rem+env(safe-area-inset-bottom))]", children: [toastMsg && (_jsxs("div", { className: "fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#1A2540] border border-white/10 text-white px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold flex items-center gap-2 animate-pulse", children: [_jsx(Icon, { name: "check", size: 18, className: "text-emerald-400", strokeWidth: 2.2 }), " ", toastMsg] })), confirm && (_jsxs("div", { className: "fixed inset-0 z-[60] flex items-end justify-center px-5 pb-[calc(6rem+env(safe-area-inset-bottom))]", children: [_jsx("div", { className: "absolute inset-0 bg-black/60 backdrop-blur-sm", onClick: () => setConfirm(null) }), _jsxs("div", { className: "relative w-full bg-[#13192B] border border-white/10 rounded-3xl p-6 shadow-2xl", children: [_jsx("div", { className: "flex justify-center mb-3", children: _jsx("div", { className: `w-11 h-11 rounded-2xl flex items-center justify-center ${confirm.action === 'open' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`, children: _jsx(Icon, { name: confirm.action === 'open' ? 'gate-open' : 'gate-closed', size: 22 }) }) }), _jsx("p", { className: "text-white text-base font-bold mb-1 text-center", children: confirm.action === 'open' ? '개폐기를 개방하시겠습니까?' : '개폐기를 차단하시겠습니까?' }), _jsxs("p", { className: "text-slate-400 text-sm text-center mb-6", children: [confirm.gate.site, " \u00B7 ", confirm.gate.name] }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: () => setConfirm(null), className: "flex-1 py-3 bg-slate-800 border border-white/8 text-slate-400 rounded-xl font-semibold text-sm", children: "\uCDE8\uC18C" }), _jsx("button", { onClick: () => applyAction(confirm.gate, confirm.action), className: `flex-1 py-3 rounded-xl font-bold text-sm ${confirm.action === 'open'
                                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                            : 'bg-red-500 text-white shadow-lg shadow-red-500/20'}`, children: confirm.action === 'open' ? '개방하기' : '차단하기' })] })] })] })), _jsxs("header", { className: "px-5 pt-6 pb-3 flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-slate-600 text-[11px] font-semibold tracking-widest uppercase mb-0.5", children: "Gate Control" }), _jsx("h1", { className: "text-white text-xl font-bold", children: "\uAC1C\uD3D0\uAE30 \uC0C1\uD0DC" })] }), _jsxs("div", { className: "flex gap-2 mt-1", children: [_jsxs("div", { className: "bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3 py-1.5 text-center", children: [_jsx("p", { className: "text-emerald-400 text-sm font-bold", children: totalOpen }), _jsx("p", { className: "text-emerald-600 text-[10px]", children: "\uAC1C\uBC29" })] }), _jsxs("div", { className: "bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-1.5 text-center", children: [_jsx("p", { className: "text-red-400 text-sm font-bold", children: totalClosed }), _jsx("p", { className: "text-red-600 text-[10px]", children: "\uCC28\uB2E8" })] })] })] }), _jsxs("section", { className: "px-5 mb-4", children: [_jsx("div", { className: "grid grid-cols-3 gap-2 rounded-2xl bg-[#0D1220] border border-white/5 p-1.5", children: ['사업장 1', '사업장 2', '사업장 3'].map(siteName => {
                            const siteGates = grouped[siteName] ?? [];
                            const active = selectedSite === siteName;
                            const closed = siteGates.filter(g => g.status === 'closed').length;
                            const siteId = Number(siteName.replace(/\D/g, ''));
                            const siteIsDanger = getSiteRuntimeStatus(siteId) === 'danger';
                            return (_jsxs("button", { onClick: () => setSelectedSite(siteName), className: `min-h-14 rounded-xl px-2 py-2 text-left transition-colors ${active ? 'bg-[#1A2236] ring-1 ring-buzz-500/45' : 'bg-transparent'}`, children: [_jsxs("div", { className: "flex items-center justify-between gap-1", children: [_jsx("span", { className: `text-xs font-bold ${active ? 'text-white' : 'text-slate-500'}`, children: siteName }), _jsx("span", { className: `w-2 h-2 rounded-full ${siteIsDanger ? 'bg-red-400' : 'bg-emerald-400'}` })] }), _jsxs("p", { className: `mt-1 text-[10px] ${siteIsDanger ? 'text-red-400' : 'text-emerald-400'}`, children: [siteGates.length, "\uAC1C \u00B7 ", closed, "\uAC1C \uCC28\uB2E8"] })] }, siteName));
                        }) }), _jsxs("div", { className: "mt-2.5 flex items-center justify-between rounded-xl border border-white/5 bg-[#13192B] px-3.5 py-2.5", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-white text-xs font-semibold", children: [selectedSite, " \uAC1C\uD3D0\uAE30 \uAD00\uB9AC"] }), _jsxs("p", { className: "text-slate-500 text-[10px] mt-0.5", children: ["\uAC1C\uBC29 ", selectedOpen, "\uAC1C \u00B7 \uCC28\uB2E8 ", selectedClosed, "\uAC1C"] })] }), _jsxs("span", { className: "text-buzz-400 text-xs font-bold", children: ["\uCD1D ", selectedGates.length, "\uB300"] })] })] }), _jsxs("div", { className: "px-5 mb-5 flex gap-2.5", children: [_jsxs("button", { onClick: () => {
                            setGates(prev => prev.map(g => g.site === selectedSite
                                ? { ...g, status: 'open', mode: 'manual', lastAction: '사업장 전체 수동 열림', lastTime: new Date().toLocaleTimeString('ko-KR', { hour12: false }) }
                                : g));
                            setSiteRuntimeStatus(Number(selectedSite.replace(/\D/g, '')), 'normal');
                            if (selectedSite === '사업장 3')
                                window.localStorage.setItem('buzz-site-3-rearm-at', String(Date.now() + 30000));
                            showToast(`${selectedSite} 전체 개방 완료`);
                        }, className: "flex-1 py-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-2xl font-bold text-sm active:bg-emerald-500/25 transition-colors flex items-center justify-center gap-2", children: [_jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, className: "w-4 h-4", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" }) }), "\uC774 \uC0AC\uC5C5\uC7A5 \uC804\uCCB4 \uAC1C\uBC29"] }), _jsxs("button", { onClick: () => {
                            setGates(prev => prev.map(g => g.site === selectedSite
                                ? { ...g, status: 'closed', mode: 'manual', lastAction: '사업장 전체 수동 차단', lastTime: new Date().toLocaleTimeString('ko-KR', { hour12: false }) }
                                : g));
                            showToast(`${selectedSite} 전체 차단 완료`);
                        }, className: "flex-1 py-3 bg-red-500/15 border border-red-500/30 text-red-400 rounded-2xl font-bold text-sm active:bg-red-500/25 transition-colors flex items-center justify-center gap-2", children: [_jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, className: "w-4 h-4", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" }) }), "\uC774 \uC0AC\uC5C5\uC7A5 \uC804\uCCB4 \uCC28\uB2E8"] })] }), _jsx("div", { className: "px-5 flex-1 space-y-5", children: Object.entries(grouped).filter(([site]) => site === selectedSite).map(([site, siteGates]) => {
                    const siteOpen = siteGates.filter(g => g.status === 'open').length;
                    const siteClosed = siteGates.filter(g => g.status === 'closed').length;
                    const siteHasDanger = getSiteRuntimeStatus(Number(site.replace(/\D/g, ''))) === 'danger';
                    return (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-3 mb-2.5", children: [_jsx("div", { className: `w-2 h-2 rounded-full ${siteHasDanger ? 'bg-red-500' : 'bg-emerald-400'}` }), _jsx("p", { className: "text-white text-sm font-bold", children: site }), _jsx("div", { className: "flex-1 h-px bg-white/5" }), _jsxs("span", { className: "text-[11px] text-slate-500", children: [siteOpen, "\uAC1C\uBC29 \u00B7 ", siteClosed, "\uCC28\uB2E8"] })] }), _jsx("div", { className: "space-y-2.5", children: siteGates.map(gate => {
                                    const isOpen = gate.status === 'open';
                                    return (_jsxs("div", { className: `bg-[#13192B] rounded-2xl overflow-hidden border ${isOpen ? 'border-emerald-500/20' : 'border-red-500/20'}`, children: [_jsx("div", { className: `h-0.5 w-full ${isOpen ? 'bg-emerald-500/60' : 'bg-red-500/60'}` }), _jsxs("div", { className: "p-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: `w-11 h-11 rounded-xl flex items-center justify-center ${isOpen ? 'bg-emerald-500/15' : 'bg-red-500/15'}`, children: _jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, className: `w-5 h-5 ${isOpen ? 'text-emerald-400' : 'text-red-400'}`, children: isOpen
                                                                                ? _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" })
                                                                                : _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" }) }) }), _jsxs("div", { children: [_jsx("p", { className: "text-white font-bold text-sm", children: gate.name }), _jsx("p", { className: `text-xs font-semibold mt-0.5 ${isOpen ? 'text-emerald-400' : 'text-red-400'}`, children: isOpen ? '개방 중' : '차단 중' })] })] }), _jsx("button", { onClick: () => setConfirm({ gate, action: isOpen ? 'close' : 'open' }), className: `px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${isOpen
                                                                    ? 'bg-red-500/15 border border-red-500/30 text-red-400'
                                                                    : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'}`, children: isOpen ? '차단' : '개방' })] }), _jsxs("div", { className: "bg-[#0A0E1A] rounded-xl px-3 py-2.5 space-y-1.5", children: [_jsxs("div", { className: "flex justify-between text-[11px]", children: [_jsx("span", { className: "text-slate-600", children: "\uB9C8\uC9C0\uB9C9 \uB3D9\uC791" }), _jsxs("span", { className: "text-slate-300", children: [gate.lastAction, " \u00B7 ", gate.lastTime] })] }), _jsxs("div", { className: "flex justify-between text-[11px]", children: [_jsx("span", { className: "text-slate-600", children: "\uC790\uB3D9\uD654 \uC870\uAC74" }), _jsx("span", { className: "text-slate-400", children: gate.autoTrigger })] }), _jsxs("div", { className: "flex justify-between items-center text-[11px]", children: [_jsx("span", { className: "text-slate-600", children: "\uC6B4\uC601 \uBAA8\uB4DC" }), _jsx("button", { onClick: () => toggleMode(gate.id), className: `px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${gate.mode === 'auto'
                                                                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                                                                            : 'bg-slate-700/60 border-slate-600 text-slate-400'}`, children: gate.mode === 'auto' ? '자동' : '수동' })] })] })] })] }, gate.id));
                                }) })] }, site));
                }) }), _jsx(BottomNav, { currentPage: "gate", setPage: setPage })] }));
}
