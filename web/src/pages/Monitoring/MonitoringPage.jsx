import { useState } from 'react';
import { LiveAnalysisPage } from '../AIAnalysis/LiveAnalysisPage';
import { HistoryPage } from '../History/HistoryPage';
import './MonitoringPage.css';
import './MonitoringDashboard.css';
import './MonitoringDashboard.css';

export function MonitoringPage() {
  const [tab, setTab] = useState('live');
  return <div className="monitoring-page">
    <header className="monitoring-head"><div><span>AI ACOUSTIC CONTROL</span><h1>모니터링</h1><p>양봉장의 음향 신호를 AI로 분석하고 위험 상태를 실시간으로 확인합니다.</p></div></header>
    <nav className="monitoring-tabs" aria-label="모니터링 화면">
      <button type="button" className={tab === 'live' ? 'active' : ''} onClick={() => setTab('live')}><i/>실시간 분석</button>
      <button type="button" className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}><i/>감지 이력</button>
    </nav>
    {tab === 'live' ? <LiveAnalysisPage onViewHistory={() => setTab('history')} /> : <HistoryPage />}
  </div>;
}
