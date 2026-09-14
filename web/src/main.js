import { jsx as _jsx } from "react/jsx-runtime";
// 앱 시작 - React 렌더링 및 라우터 초기화
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { App } from './AppView.jsx';
import { AppErrorBoundary } from './components/AppErrorBoundary.jsx';
import './styles/global.css';
createRoot(document.getElementById('root')).render(_jsx(StrictMode, { children: _jsx(AppErrorBoundary, { children: _jsx(HashRouter, { children: _jsx(App, {}) }) }) }));
