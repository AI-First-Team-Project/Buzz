// BUZZ 앱 - components/BottomNav 모듈
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const nav = [
    {
        page: 'home',
        label: '홈',
        icon: (a) => (_jsx("svg", { viewBox: "0 0 24 24", fill: a ? 'currentColor' : 'none', stroke: "currentColor", strokeWidth: 1.8, className: "w-5 h-5", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" }) })),
    },
    {
        page: 'analysis',
        label: '분석',
        icon: (a) => (_jsx("svg", { viewBox: "0 0 24 24", fill: a ? 'currentColor' : 'none', stroke: "currentColor", strokeWidth: 1.8, className: "w-5 h-5", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" }) })),
    },
    {
        page: 'gate',
        label: '개폐기',
        icon: (a) => (_jsx("svg", { viewBox: "0 0 24 24", fill: a ? 'currentColor' : 'none', stroke: "currentColor", strokeWidth: 1.8, className: "w-5 h-5", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" }) })),
    },
    {
        page: 'result',
        label: '결과',
        icon: (a) => (_jsx("svg", { viewBox: "0 0 24 24", fill: a ? 'currentColor' : 'none', stroke: "currentColor", strokeWidth: 1.8, className: "w-5 h-5", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" }) })),
    },
    {
        page: 'history',
        label: '이력',
        icon: (a) => (_jsx("svg", { viewBox: "0 0 24 24", fill: a ? 'currentColor' : 'none', stroke: "currentColor", strokeWidth: 1.8, className: "w-5 h-5", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" }) })),
    },
];
export default function BottomNav({ currentPage, setPage }) {
    return (_jsx("nav", { className: "fixed inset-x-0 bottom-0 mx-auto w-full max-w-[430px] z-50 border-t border-white/8 bg-[#0B101B]/98 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]", children: _jsx("div", { className: "flex justify-around px-2 py-2", children: nav.map((item) => {
                        const active = currentPage === item.page;
                        return (_jsxs("button", { onClick: () => setPage(item.page), className: `relative flex min-w-14 flex-col items-center gap-1 px-3 py-1.5 transition-colors duration-150 ${active ? 'text-amber-400' : 'text-slate-500'}`, children: [active && _jsx("span", { className: "absolute -top-2 h-0.5 w-8 bg-amber-400" }), item.icon(active), _jsx("span", { className: "text-[10px] font-medium", children: item.label })] }, item.page));
                    }) }) }));
}
