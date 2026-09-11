import { AcousticSignal } from "./AcousticMonitor.jsx";

import { useEffect, useState } from "react";
import BottomNav from "./BottomNav";
import { BuzzMark } from "./Logo";
import { getRuntimeSites, getSiteRuntimeStatus, setSelectedSiteId } from "../types";

export default function SitePage({ setPage }) {
  const [sites, setSites] = useState(() => getRuntimeSites());

  useEffect(() => {
    const refresh = () => setSites(getRuntimeSites());
    refresh();
    const timer = setInterval(refresh, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="buzz-commercial-page">
      <header className="buzz-simple-header">
        <div className="buzz-brand">
          <BuzzMark size={30} />
          <span>BUZZ</span>
        </div>
        <div>
          <p className="buzz-kicker">전체 현황</p>
          <h1>사업장</h1>
        </div>
      </header>

      <main className="buzz-commercial-content">
        <div className="buzz-site-summary">
          <div>
            <b>{sites.filter((s) => getSiteRuntimeStatus(s.id) !== "danger").length}</b>
            <span>정상</span>
          </div>
          <div className="danger">
            <b>{sites.filter((s) => getSiteRuntimeStatus(s.id) === "danger").length}</b>
            <span>위험</span>
          </div>
          <small>총 {sites.length}개 사업장</small>
        </div>

        <div className="buzz-site-grid">
          {sites.map((site) => {
            const status = getSiteRuntimeStatus(site.id) ?? "normal";
            const danger = status === "danger";
            const result = danger ? "말벌" : "말벌 아님";
            const confidence = danger ? 97 : site.id === 1 ? 95 : site.id === 2 ? 92 : 94;
            const door = danger ? "닫힘" : "열림";

            return (
              <article className={`buzz-site-overview-card ${danger ? "danger" : ""}`} key={site.id}>
                <div className="buzz-site-card-top">
                  <div>
                    <p className="buzz-kicker">사업장 {site.id}</p>
                    <h2>{site.name}</h2>
                  </div>
                  <span className={`buzz-status-chip ${danger ? "danger" : ""}`}>
                    {danger ? "위험" : "정상"}
                  </span>
                </div>

                <div className="buzz-site-image">
                  <video
                    src={`/videos/site-${site.id}.mp4`}
                    poster={`/images/${danger ? "wasp" : site.id === 1 ? "honeybee" : "honeycomb-dark"}.jpg`}
                    muted
                    playsInline
                    preload="metadata"
                  />
                </div>
                <AcousticSignal seed={site.id} danger={danger} compact />

                <div className="buzz-site-card-info">
                  <div>
                    <span>최근 AI 판정</span>
                    <b className={danger ? "danger-text" : ""}>{result} {confidence}%</b>
                  </div>
                  <div>
                    <span>문 상태</span>
                    <b>{door}</b>
                  </div>
                  <div>
                    <span>최근 분석</span>
                    <b>방금 전</b>
                  </div>
                </div>

                <button
                  className="buzz-site-detail-button"
                  onClick={() => {
                    setSelectedSiteId(site.id);
                    setPage("home");
                  }}
                >
                  홈에서 모니터링 보기
                </button>
              </article>
            );
          })}
        </div>
      </main>

      <BottomNav currentPage="site" setPage={setPage} />
    </div>
  );
}
