import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// 공통 레이아웃 - 사이드바와 상단바 및 페이지 배치
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar.jsx';
import styles from './Layout.module.css';
export function Layout() {
    const { pathname } = useLocation();
    const labels = { '/': '대시보드', '/sites': '사업장 관리', '/monitoring': '모니터링', '/settings': '설정', '/sound-test': '파일 테스트' };
    return (_jsxs("div", { className: styles.shell, children: [_jsx(Sidebar, {}), _jsxs("div", { className: styles.main, children: [_jsx(Topbar, { breadcrumb: ['BUZZ', labels[pathname] || 'BUZZ'] }), _jsx("div", { className: styles.content, children: _jsx(Outlet, {}) })] })] }));
}
