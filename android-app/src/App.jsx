import { useEffect, useState } from "react";
import SplashScreen from "./components/SplashScreen";
import HomePage from "./components/HomePage";
import AnalysisPage from "./components/AnalysisPage.jsx";
import HistoryPage from "./components/HistoryPage";
import ResultPage from "./components/ResultPage";
import SettingsPage from "./components/SettingsPage";
import GatePage from "./components/GatePage";
import SitePage from "./components/SitePage.jsx";
import TestPage from "./components/TestPage.jsx";

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

  switch (currentPage) {
    case "splash":
      return <SplashScreen onComplete={() => setCurrentPage(getRequestedPage())} />;
    case "home":
      return <HomePage setPage={setCurrentPage} />;
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
    case "site":
      return <SitePage setPage={setCurrentPage} />;
    case "test":
      return <TestPage setPage={setCurrentPage} />;
    default:
      return <HomePage setPage={setCurrentPage} />;
  }
}