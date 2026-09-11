import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// 공통 탐색 - 사이드바 메뉴
import { NavLink } from 'react-router-dom';
import { AnalysisIcon, DashboardIcon, HistoryIcon, SettingsIcon, SoundTestIcon, } from './Icons';
import styles from './Sidebar.module.css';
const NAV_ITEMS = [
    { to: '/', label: '대시보드', icon: DashboardIcon, end: true },
    { to: '/analysis', label: '분석', icon: AnalysisIcon, end: false },
    { to: '/history', label: '이력', icon: HistoryIcon, end: false },
    { to: '/settings', label: '설정', icon: SettingsIcon, end: false },
    { to: '/sound-test', label: '테스트', icon: SoundTestIcon, end: false },
];
export function Sidebar() {
    return (_jsxs("aside", { className: styles.sidebar, children: [_jsxs("div", { className: styles.brand, children: [_jsxs("svg", { width: "30", height: "30", viewBox: "0 0 64 64", fill: "none", "aria-hidden": "true", children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "webBuzzGrad", x1: "0", y1: "0", x2: "64", y2: "64", gradientUnits: "userSpaceOnUse", children: [_jsx("stop", { offset: "0%", stopColor: "#FFD86B" }), _jsx("stop", { offset: "55%", stopColor: "#F7B500" }), _jsx("stop", { offset: "100%", stopColor: "#E38A00" })] }) }), _jsx("polygon", { points: "32,2 58.5,17 58.5,47 32,62 5.5,47 5.5,17", fill: "url(#webBuzzGrad)" }), _jsx("polygon", { points: "32,8 52.6,20.3 52.6,43.7 32,56 11.4,43.7 11.4,20.3", fill: "#0A0E1A" }), _jsx("text", { x: "32", y: "41.5", textAnchor: "middle", fontFamily: "'Chakra Petch', 'Outfit', sans-serif", fontWeight: "700", fontSize: "27", fill: "#F7B500", children: "B" }), _jsx("path", { d: "M49 5.5 L43.5 15.5 h4.5 l-4 9", stroke: "#F7B500", strokeWidth: "2.6", strokeLinecap: "round", strokeLinejoin: "round" })] }), _jsx("span", { className: styles.brandName, children: "BUZZ" })] }), _jsx("nav", { className: styles.nav, children: NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (_jsxs(NavLink, { to: to, end: end, className: ({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`, children: [_jsx(Icon, { size: 18 }), _jsx("span", { children: label })] }, to))) }), _jsx("div", { className: styles.footer, children: "BUZZ / SOUND INTELLIGENCE" })] }));
}
