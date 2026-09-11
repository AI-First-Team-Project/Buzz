
import BottomNav from "./BottomNav";
import { BuzzMark } from "./Logo";
import { setSelectedSiteId } from "../types";
import { useSiteStatuses } from "../hooks/useSiteStatuses";

export default function SitePage({ setPage }) {
  const { sites } = useSiteStatuses();

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
            <b>{sites.filter((s) => s.status !== "danger").length}</b>
            <span>정상</span>
          </div>
          <div className="danger">
            <b>{sites.filter((s) => s.status === "danger").length}</b>
            <span>위험</span>
          </div>
          <small>총 {sites.length}개 사업장</small>
        </div>

        <div className="buzz-site-grid">
          {sites.map((site) => {
            const danger = site.status === "danger";
            const result = "말벌 확률";
            const confidence = site.probabilities?.wasp ?? 0;
            const door = site.door === "closed" ? "닫힘" : "열림";

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
                    poster={danger ? "/images/wasp.jpg" : "/images/honeybee.jpg"}
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                  <span className="buzz-live-dot-only"><i /></span>
                </div>

                <div className="buzz-site-card-info">
                  <div>
                    <span>최근 AI 판정</span>
                    <b className={danger ? "danger-text" : ""}>{result} {confidence}%</b>
                  </div>
                  <div>
                    <span>문 상태</span>
                    <b>{door}</b>
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
