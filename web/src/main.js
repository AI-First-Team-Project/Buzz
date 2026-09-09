import { jsx as _jsx } from "react/jsx-runtime";
// 앱 시작 - React 렌더링 및 라우터 초기화
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { App } from './App';
import { ResponsiveApp } from './ResponsiveApp';
import './styles/global.css';
createRoot(document.getElementById('root')).render(_jsx(StrictMode, { children: _jsx(HashRouter, { children: _jsx(ResponsiveApp, { children: _jsx(App, {}) }) }) }));
