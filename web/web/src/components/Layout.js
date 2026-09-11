import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// 공통 레이아웃 - 사이드바와 상단바 및 페이지 배치
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import styles from './Layout.module.css';
export function Layout() {
    return (_jsxs("div", { className: styles.shell, children: [_jsx(Sidebar, {}), _jsx("div", { className: styles.main, children: _jsx("div", { className: styles.content, children: _jsx(Outlet, {}) }) })] }));
}
