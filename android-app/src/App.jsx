
import { useEffect, useState } from "react";
import SplashScreen from "./components/SplashScreen";
import HomePage from "./components/HomePage";
import SitePage from "./components/SitePage.jsx";
import AnalysisPage from "./components/AnalysisPage.jsx";
import HistoryPage from "./components/HistoryPage";
import ResultPage from "./components/ResultPage";
import SettingsPage from "./components/SettingsPage";
import GatePage from "./components/GatePage";
import TestPage from "./components/TestPage.jsx";

export default function App() {
  const [currentPage, setCurrentPage] = useState("splash");
  const [siteId, setSiteId] = useState(3);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  const openSite = (id) => {
    setSiteId(id);
    setCurrentPage("site");
  };

  switch (currentPage) {
    case "splash":
      return <SplashScreen onComplete={() => setCurrentPage("home")} />;
    case "home":
      return <HomePage setPage={setCurrentPage} onOpenSite={openSite} />;
    case "site":
      return <SitePage siteId={siteId} setPage={setCurrentPage} onSwitchSite={setSiteId} />;
    case "analysis":
      return <AnalysisPage setPage={setCurrentPage} />;
    case "history":
      return <HistoryPage setPage={setCurrentPage} />;
    case "result":
      return <ResultPage setPage={setCurrentPage} />;
    case "gate":
      return <GatePage setPage={setCurrentPage} />;
    case "settings":
      return <SettingsPage setPage={setCurrentPage} />;
    case "test":
      return <TestPage setPage={setCurrentPage} />;
    default:
      return <HomePage setPage={setCurrentPage} onOpenSite={openSite} />;
  }
}
