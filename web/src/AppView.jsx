import { MonitoringProvider } from './data/MonitoringContext';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { EnterpriseDashboard as Dashboard } from './pages/Dashboard/EnterpriseDashboard.jsx';
import { Worksites } from './pages/Worksites/Worksites';
import { LiveAnalysisPage as AIAnalysis } from './pages/AIAnalysis/LiveAnalysisPage.jsx';
import { History } from './pages/History/History';
import { Settings } from './pages/Settings/Settings';
import { FileTestPage as SoundTest } from './pages/SoundTest/FileTestPage.jsx';
import { SoundTestDetail } from './pages/SoundTest/SoundTestDetail.jsx';

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
          <Route path="sound-test/detail" element={<SoundTestDetail />} />
        </Route>
      </Routes>
    </MonitoringProvider>
  );
}
