// 앱 구성 - 페이지 라우팅
import { MonitoringProvider } from './data/MonitoringContext';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { Worksites } from './pages/Worksites/Worksites';
import { AIAnalysis } from './pages/AIAnalysis/AIAnalysis';
import { History } from './pages/History/History';
import { Settings } from './pages/Settings/Settings';
import { SoundTest } from './pages/SoundTest/SoundTest';

export function App() {
  return (
    <MonitoringProvider>
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="sites" element={<Worksites />} />
        <Route path="analysis" element={<AIAnalysis />} />
        <Route path="history" element={<History />} />
        <Route path="settings" element={<Settings />} />
        <Route path="sound-test" element={<SoundTest />} />
      </Route>
    </Routes>
    </MonitoringProvider>
  );
}
