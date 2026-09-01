// 이력 페이지 - 탐지 및 개폐기 동작 기록 조회
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { getLatestDetection, getSiteRuntimeStatus } from '../types';
import BottomNav from './BottomNav';
import Icon from './Icon';
const DATA = [
    { id: 1, date: '오늘', time: '09:42:15', category: 'detection', level: 'danger', title: '말벌 탐지', detail: '사업장 3 - 7마리, 신뢰도 96%', site: '사업장 3' },
    { id: 2, date: '오늘', time: '09:42:14', category: 'gate', level: 'warning', title: '개폐기 자동 차단', detail: '말벌 탐지로 자동 잠금', site: '사업장 3' },
    { id: 3, date: '오늘', time: '09:38:24', category: 'detection', level: 'warning', title: '꿀벌 활동 증가', detail: '사업장 2 - 3마리, 신뢰도 82%', site: '사업장 2' },
    { id: 4, date: '오늘', time: '09:35:12', category: 'gate', level: 'info', title: '개폐기 수동 개방', detail: '관리자 수동 조작', site: '사업장 2' },
    { id: 5, date: '오늘', time: '09:31:05', category: 'detection', level: 'normal', title: '정상 상태 확인', detail: '사업장 1 - 이상 없음', site: '사업장 1' },
    { id: 6, date: '오늘', time: '09:30:00', category: 'gate', level: 'normal', title: '개폐기 자동 차단', detail: '스케줄에 따른 닫힘', site: '사업장 1' },
    { id: 7, date: '오늘', time: '09:15:33', category: 'system', level: 'info', title: '시스템 재시작', detail: '정기 재부팅 완료' },
    { id: 8, date: '오늘', time: '09:00:00', category: 'system', level: 'normal', title: '일일 점검 완료', detail: '전체 장비 정상 확인' },
    { id: 9, date: '어제', time: '17:22:40', category: 'detection', level: 'danger', title: '말벌 탐지', detail: '사업장 3 - 4마리, 신뢰도 91%', site: '사업장 3' },
    { id: 10, date: '어제', time: '17:22:39', category: 'gate', level: 'danger', title: '개폐기 긴급 차단', detail: '말벌 탐지로 긴급 잠금', site: '사업장 3' },
    { id: 11, date: '어제', time: '14:10:05', category: 'detection', level: 'warning', title: '꿀벌 군집 탐지', detail: '사업장 2 - 8마리, 신뢰도 88%', site: '사업장 2' },
    { id: 12, date: '어제', time: '08:00:00', category: 'gate', level: 'info', title: '전체 출입문 개방', detail: '오전 8시 자동 개방' },
];
const LEVEL_BADGE = {
    danger: 'bg-red-500/20 text-red-400 border border-red-500/30',
    warning: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    normal: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    info: 'bg-slate-700/60 text-slate-500',
};
// warning → 정상으로 통합 표시 (정상/위험만)
const LEVEL_LABEL = {
    danger: '위험', warning: '정상', normal: '정상', info: '정보',
};
const CAT_BG = {
    all: 'bg-amber-500 text-white',
    detection: 'bg-red-500/20 text-red-400 border border-red-500/30',
    gate: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
    system: 'bg-slate-700 text-slate-300',
};
export default function HistoryPage({ setPage }) {
    const [filter, setFilter] = useState('all');
    const latestDetection = getLatestDetection();
    const site3Danger = getSiteRuntimeStatus(3) === 'danger';
    const data = (site3Danger ? DATA : DATA.filter(item => item.id !== 1 && item.id !== 2)).map(item => latestDetection && (item.id === 1 || item.id === 2)
        ? { ...item, time: latestDetection.time, detail: item.id === 1 ? `사업장 3 - ${latestDetection.count}마리, 신뢰도 ${latestDetection.confidence}%` : item.detail }
        : item);
    const filtered = data.filter(d => filter === 'all' || d.category === filter);
    /* 날짜 그룹핑 */
    const grouped = {};
    filtered.forEach(d => {
        if (!grouped[d.date])
            grouped[d.date] = [];
        grouped[d.date].push(d);
    });
    const tabs = [
        { k: 'all', label: '전체', icon: 'history' },
        { k: 'detection', label: '탐지', icon: 'bee' },
        { k: 'gate', label: '개폐기', icon: 'gate-closed' },
        { k: 'system', label: '시스템', icon: 'settings' },
    ];
    const exportHistory = () => {
        const categoryLabel = { detection: '탐지', gate: '개폐기', system: '시스템' };
        const rows = [
            ['번호', '날짜', '시간', '사업장', '분류', '상태', '제목', '상세 내용'],
            ...filtered.map(item => [
                item.id,
                item.date,
                item.time,
                item.site ?? '전체',
                categoryLabel[item.category] ?? item.category,
                LEVEL_LABEL[item.level] ?? item.level,
                item.title,
                item.detail,
            ]),
        ];
        const csv = rows
            .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(','))
            .join('\r\n');
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const today = new Date().toISOString().slice(0, 10);
        link.href = url;
        link.download = `BUZZ_이력_${filter}_${today}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };
    return (_jsxs("div", { className: "min-h-screen bg-[#0A0E1A] pb-[calc(9rem+env(safe-area-inset-bottom))] flex flex-col", children: [_jsxs("header", { className: "px-5 pt-6 pb-4", children: [_jsx("p", { className: "text-slate-500 text-xs font-medium tracking-wider uppercase mb-0.5", children: "Log History" }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h1", { className: "text-white text-xl font-bold", children: "\uC774\uB825\uC815\uBCF4" }), _jsxs("button", { onClick: exportHistory, className: "text-xs text-slate-400 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5", children: [_jsx(Icon, { name: "download", size: 14, strokeWidth: 2 }), "\uB0B4\uBCF4\uB0B4\uAE30"] })] })] }), _jsx("div", { className: "px-5 mb-5", children: _jsx("div", { className: "flex gap-2", children: tabs.map(t => (_jsxs("button", { onClick: () => setFilter(t.k), className: `flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${filter === t.k ? CAT_BG[t.k] : 'bg-[#13192B] text-slate-500 border border-white/5'}`, children: [_jsx(Icon, { name: t.icon, size: 15, strokeWidth: 1.9 }), _jsx("span", { children: t.label })] }, t.k))) }) }), _jsx("div", { className: "px-5 mb-5 grid grid-cols-4 gap-2", children: [
                    { label: '위험', count: data.filter(d => d.level === 'danger').length, col: 'text-red-400' },
                    { label: '경고', count: data.filter(d => d.level === 'warning').length, col: 'text-amber-400' },
                    { label: '개폐', count: data.filter(d => d.category === 'gate').length, col: 'text-cyan-400' },
                    { label: '전체', count: data.length, col: 'text-white' },
                ].map((s, i) => (_jsxs("div", { className: "bg-[#13192B] border border-white/5 rounded-xl p-2.5 text-center", children: [_jsx("p", { className: `text-lg font-bold ${s.col}`, children: s.count }), _jsx("p", { className: "text-slate-600 text-[10px]", children: s.label })] }, i))) }), _jsx("div", { className: "px-5 flex-1 space-y-6", children: Object.entries(grouped).map(([date, items]) => (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-3 mb-3", children: [_jsx("p", { className: "text-slate-400 text-xs font-semibold", children: date }), _jsx("div", { className: "flex-1 h-px bg-slate-800" }), _jsxs("span", { className: "text-slate-600 text-xs", children: [items.length, "\uAC74"] })] }), _jsx("div", { className: "bg-[#13192B] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5", children: items.map((item) => (_jsxs("div", { className: "px-4 py-3.5 flex items-start gap-3", children: [_jsxs("div", { className: "flex-shrink-0 w-10 text-right", children: [_jsx("p", { className: "text-slate-600 text-[10px] font-mono leading-tight", children: item.time.slice(0, 5) }), _jsx("p", { className: "text-slate-700 text-[9px] font-mono", children: item.time.slice(6) })] }), item.category === 'detection' && item.level !== 'normal' ? (_jsx("div", { className: "flex-shrink-0 w-10 h-10 rounded-xl overflow-hidden border border-red-500/40", children: _jsx("img", { src: item.title.includes('꿀벌') ? '/images/honeybee.jpg' : '/images/wasp.jpg', alt: "\uD0D0\uC9C0\uB41C \uACE4\uCDA9", className: "w-full h-full object-cover" }) })) : (_jsx("div", { className: `flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${item.category === 'detection' ? 'bg-emerald-500/20 text-emerald-400' :
                                            item.category === 'gate' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700/50 text-slate-400'}`, children: _jsx(Icon, { name: item.category === 'detection' ? 'check' : item.category === 'gate' ? 'gate-closed' : 'settings', size: 19, strokeWidth: 1.8 }) })), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 flex-wrap mb-0.5", children: [_jsx("span", { className: "text-white text-sm font-medium", children: item.title }), _jsx("span", { className: `text-[10px] font-semibold px-2 py-0.5 rounded-full ${LEVEL_BADGE[item.level]}`, children: LEVEL_LABEL[item.level] })] }), _jsx("p", { className: "text-slate-500 text-xs leading-snug", children: item.detail }), item.site && (_jsx("span", { className: "inline-block mt-1 text-[10px] text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded-md", children: item.site }))] })] }, item.id))) })] }, date))) }), _jsx(BottomNav, { currentPage: "history", setPage: setPage })] }));
}
