import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// 앱 구성 - 페이지 라우팅
import { MonitoringProvider } from './data/MonitoringContext';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { AIAnalysis } from './pages/AIAnalysis/AIAnalysis';
import { History } from './pages/History/History';
import { Settings } from './pages/Settings/Settings';
import { SoundTest } from './pages/SoundTest/SoundTest';
export function App() {
    return (_jsx(MonitoringProvider, { children: _jsx(Routes, { children: _jsxs(Route, { element: _jsx(Layout, {}), children: [_jsx(Route, { index: true, element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "sites", element: _jsx(Navigate, { to: "/", replace: true }) }), _jsx(Route, { path: "analysis", element: _jsx(AIAnalysis, {}) }), _jsx(Route, { path: "history", element: _jsx(History, {}) }), _jsx(Route, { path: "settings", element: _jsx(Settings, {}) }), _jsx(Route, { path: "sound-test", element: _jsx(SoundTest, {}) })] }) }) }));
}
