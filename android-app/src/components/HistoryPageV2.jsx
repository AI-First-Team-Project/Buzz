import { useState } from "react";
import BottomNav from "./BottomNav";
import { useHistory } from "../hooks/useHistory";

const FILTERS = [
  ["all", "전체"],
  ["danger", "위험"],
  ["gate", "문 제어"],
];

function EventDetail({ item, onClose, onAnalysis }) {
  if (!item) return null;
  const danger = item.type === "danger" || item.result === "말벌";

  return (
    <div className="buzz-detail-overlay" onClick={onClose}>
      <div className="buzz-history-detail buzz-history-detail-full" onClick={(e) => e.stopPropagation()}>
        <div className="buzz-history-detail-head buzz-history-detail-appbar">
          <div>
            <p className="buzz-kicker">이력 상세</p>
            <h2>{item.title}</h2>
            <span>{item.site} · {item.time}</span>
          </div>
          <button onClick={onClose} aria-label="닫기">×</button>
        </div>

        <p className="buzz-history-detail-intro">
          감지 당시의 AI 판정, 문 상태, 동작 흐름을 한 화면에서 확인할 수 있습니다.
        </p>

        <div className={`buzz-detail-status ${danger ? "danger" : "normal"}`}>
          <div>
            <span>AI 판정</span>
            <b>{item.result}</b>
          </div>
          <strong>{item.confidence}%</strong>
        </div>

        <div className="buzz-detail-grid">
          <div><span>당시 문 상태</span><b>{item.door}</b></div>
          <div><span>문 동작</span><b>{item.action}</b></div>
          <div><span>감지 시각</span><b>{item.time}</b></div>
          <div><span>사업장</span><b>{item.site}</b></div>
        </div>

        <div className="buzz-detail-section">
          <h3>클래스별 신뢰도</h3>
          {[
            ["말벌", item.probs.wasp],
            ["말벌 아님", item.probs.nonWasp],
          ].map(([label, value]) => (
            <div className="buzz-history-prob" key={label}>
              <span>{label}</span>
              <div><i className={label === "말벌" ? "danger" : ""} style={{ width: `${value}%` }} /></div>
              <b>{value}%</b>
            </div>
          ))}
        </div>

        <div className="buzz-detail-section">
          <h3>관련 이벤트 흐름</h3>
          <div className="buzz-event-flow">
            {item.flow.map((step, index) => (
              <div key={step}>
                <i className={danger ? "danger" : ""}>{index + 1}</i>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>

        <button className="buzz-history-analysis-link" onClick={onAnalysis}>
          관련 AI 분석 상세 보기
          <span>›</span>
        </button>
      </div>
    </div>
  );
}

export default function HistoryPage({ setPage }) {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [historyPage, setHistoryPage] = useState(1);
  const { history, error } = useHistory();

  const filtered = history.filter((item) => filter === "all" || item.type === filter);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(historyPage, pageCount);
  const pageItems = filtered.slice((currentPage - 1) * 10, currentPage * 10);

  return (
    <div className="buzz-commercial-page">
      <main className="buzz-commercial-content buzz-history-page">
        <div className="buzz-page-heading buzz-history-heading">
          <div>
            <h1>감지 이력</h1>
            <p className="buzz-page-desc">위험 감지와 출입문 동작을 확인하세요.</p>
          </div>
        </div>

        <section className="buzz-history-summary">
          <div><span>전체 이벤트</span><b>{history.length}</b></div>
          <div className="danger"><span>위험</span><b>{history.filter((x) => x.type === "danger").length}</b></div>
          <div><span>문 제어</span><b>{history.filter((x) => x.type === "gate").length}</b></div>
        </section>

        <div className="buzz-history-filters">
          {FILTERS.map(([key, label]) => (
            <button key={key} className={filter === key ? "active" : ""} onClick={() => { setFilter(key); setHistoryPage(1); }}>
              {label}
            </button>
          ))}
        </div>

        <div className="buzz-history-list">
          {error && history.length === 0 && <p className="buzz-history-tip">{error}</p>}
          {!error && history.length === 0 && <p className="buzz-history-tip">저장된 이력이 없습니다.</p>}
          {pageItems.map((item) => {
            const danger = item.type === "danger";
            const gate = item.type === "gate";
            return (
              <button
                key={item.id}
                className={`buzz-history-card ${danger ? "danger" : ""} ${gate ? "gate" : ""}`}
                onClick={() => setSelected(item)}
              >
                <div className={`buzz-history-icon ${danger ? "danger" : gate ? "gate" : "normal"}`}>
                  {danger ? "!" : gate ? "↕" : "✓"}
                </div>
                <div className="buzz-history-main">
                  <div className="buzz-history-title-row">
                    <b>{item.title}</b>
                    <span>{item.time}</span>
                  </div>
                  <p>{item.site}</p>
                  <div className="buzz-history-meta">
                    <span>AI <b className={danger ? "danger-text" : ""}>{item.result} {item.confidence}%</b></span>
                    <span>문 <b>{item.door}</b></span>
                  </div>
                </div>
                <span className="buzz-history-chevron">›</span>
              </button>
            );
          })}
        </div>

        <div className="buzz-history-pagination">
          <button disabled={currentPage === 1} onClick={() => setHistoryPage((value) => value - 1)}>‹</button>
          {Array.from({ length: pageCount }, (_, index) => index + 1).slice(0, 10).map((number) => (
            <button key={number} className={number === currentPage ? "active" : ""} onClick={() => setHistoryPage(number)}>{number}</button>
          ))}
          <button disabled={currentPage === pageCount} onClick={() => setHistoryPage((value) => value + 1)}>›</button>
        </div>

        <p className="buzz-history-tip">항목을 누르면 당시 AI 판정과 문 동작 흐름을 자세히 볼 수 있습니다.</p>
      </main>

      <EventDetail
        item={selected}
        onClose={() => setSelected(null)}
        onAnalysis={() => {
          setSelected(null);
          setPage("analysis");
        }}
      />

      <BottomNav currentPage="history" setPage={setPage} />
    </div>
  );
}
