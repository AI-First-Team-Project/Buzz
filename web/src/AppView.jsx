import { MonitoringProvider } from './data/MonitoringContext';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { EnterpriseDashboard as Dashboard } from './pages/Dashboard/EnterpriseDashboard.jsx';
import { Worksites } from './pages/Worksites/Worksites.jsx';
import { Settings } from './pages/Settings/Settings.jsx';
import { FileTestPage as SoundTest } from './pages/SoundTest/FileTestPage.jsx';
import { SoundTestDetail } from './pages/SoundTest/SoundTestDetail.jsx';
import { MonitoringPage } from './pages/Monitoring/MonitoringPage.jsx';
import { Navigate } from 'react-router-dom';
import './styles/b2b.css';

export function App() {
  return (
    <MonitoringProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="sites" element={<Worksites />} />
          <Route path="monitoring" element={<MonitoringPage />} />
          <Route path="analysis" element={<Navigate to="/monitoring" replace />} />
          <Route path="history" element={<Navigate to="/monitoring" replace />} />
          <Route path="settings" element={<Settings />} />
          <Route path="sound-test" element={<SoundTest />} />
          <Route path="sound-test/detail" element={<SoundTestDetail />} />
        </Route>
      </Routes>
    </MonitoringProvider>
  );
}
