import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// 공통 레이아웃 - 사이드바와 상단바 및 페이지 배치
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useMonitoring } from '../data/MonitoringContext';
import styles from './Layout.module.css';
function ConnectionNotice() {
    const { connection } = useMonitoring();
    const lastUpdated = connection.lastUpdatedAt
        ? new Date(connection.lastUpdatedAt).toLocaleString('ko-KR', { hour12: false })
        : '없음';
    const label = connection.status === 'connected' ? '서버 연결됨'
        : connection.status === 'loading' ? '서버 연결 확인 중' : '서버 연결 실패 · 마지막 상태 표시 중';
    return _jsxs('div', {
        className: `${styles.connectionNotice} ${connection.status === 'disconnected' || connection.historyError ? styles.connectionError : ''}`,
        role: connection.status === 'disconnected' || connection.historyError ? 'alert' : 'status',
        children: [_jsx('strong', { children: `${label}${connection.historyError ? ' · 이력 조회 실패' : ''}` }), _jsxs('span', { children: ['마지막 상태 갱신: ', lastUpdated] })],
    });
}
export function Layout() {
    return (_jsxs("div", { className: styles.shell, children: [_jsx(Sidebar, {}), _jsx("div", { className: styles.main, children: _jsxs("div", { className: styles.content, children: [_jsx(ConnectionNotice, {}), _jsx(Outlet, {})] }) })] }));
}
