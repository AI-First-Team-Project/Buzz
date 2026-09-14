import { useEffect, useState } from "react";
import SplashScreen from "./components/SplashScreen";
import HomePage from "./components/EnterpriseMobileHome.jsx";
import AnalysisPage from "./components/AnalysisPage.jsx";
import HistoryPage from "./components/HistoryPageV2.jsx";
import ResultPage from "./components/ResultPage";
import SettingsPage from "./components/SettingsPageV2.jsx";
import GatePage from "./components/GatePage";
import SitePage from "./components/SitePage.jsx";
import TestPage from "./components/TestPage.jsx";
import NotificationCenter from "./components/NotificationCenter.jsx";

const VALID_PAGES = ["home", "analysis", "history", "result", "gate", "settings", "site", "test"];

function getRequestedPage() {
  const params = new URLSearchParams(window.location.search);
  const page = params.get("page");
  return VALID_PAGES.includes(page) ? page : "home";
}

export default function App() {
  const [currentPage, setCurrentPage] = useState("splash");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  if (currentPage === "splash") return <SplashScreen onComplete={() => setCurrentPage(getRequestedPage())} />;
  let page;
  switch (currentPage) {
    case "home":
      page = <HomePage setPage={setCurrentPage} />; break;
    case "analysis":
      page = <AnalysisPage setPage={setCurrentPage} />; break;
    case "history":
      page = <HistoryPage setPage={setCurrentPage} />; break;
    case "result":
      page = <ResultPage setPage={setCurrentPage} />; break;
    case "gate":
      page = <GatePage setPage={setCurrentPage} />; break;
    case "settings":
      page = <SettingsPage setPage={setCurrentPage} />; break;
    case "site":
      page = <SitePage setPage={setCurrentPage} />; break;
    case "test":
      page = <TestPage setPage={setCurrentPage} />; break;
    default:
      page = <HomePage setPage={setCurrentPage} />;
  }
  return <><NotificationCenter setPage={setCurrentPage}/>{page}</>;
}
