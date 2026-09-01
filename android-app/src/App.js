// BUZZ 앱 - App 모듈
import { jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import SplashScreen from './components/SplashScreen';
import HomePage from './components/HomePage';
import SitePage from './components/SitePage';
import AnalysisPage from './components/AnalysisPage';
import HistoryPage from './components/HistoryPage';
import ResultPage from './components/ResultPage';
import SettingsPage from './components/SettingsPage';
import GatePage from './components/GatePage';
export default function App() {
    const [currentPage, setCurrentPage] = useState('splash');
    const [siteId, setSiteId] = useState(3);
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [currentPage]);
    const openSite = (id) => {
        setSiteId(id);
        setCurrentPage('site');
    };
    const renderPage = () => {
        switch (currentPage) {
            case 'splash': return _jsx(SplashScreen, { onComplete: () => setCurrentPage('home') });
            case 'home': return _jsx(HomePage, { setPage: setCurrentPage, onOpenSite: openSite });
            case 'site': return _jsx(SitePage, { siteId: siteId, setPage: setCurrentPage, onSwitchSite: setSiteId });
            case 'analysis': return _jsx(AnalysisPage, { setPage: setCurrentPage });
            case 'history': return _jsx(HistoryPage, { setPage: setCurrentPage });
            case 'result': return _jsx(ResultPage, { setPage: setCurrentPage });
            case 'gate': return _jsx(GatePage, { setPage: setCurrentPage });
            case 'settings': return _jsx(SettingsPage, { setPage: setCurrentPage });
            default: return _jsx(HomePage, { setPage: setCurrentPage, onOpenSite: openSite });
        }
    };
    return (_jsx("div", { className: "min-h-screen bg-[#0A0E1A] max-w-[430px] mx-auto relative shadow-2xl shadow-black/50", children: renderPage() }));
}
