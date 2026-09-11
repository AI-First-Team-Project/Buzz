import { useMemo, useState } from "react";
import BottomNav from "./BottomNav";
import "./WebStylePages.css";
import { getLatestDetection, getRuntimeHistory, getSiteRuntimeStatus } from "../types";

const BASE_HISTORY = [
  { id: 1, type: "danger", site: "사업장 3", time: "14:30:25", title: "말벌 감지", result: "말벌", confidence: 97, door: "닫힘", action: "자동 폐쇄", probs: { hornet: 97, bee: 2, other: 1 }, flow: ["말벌 감지", "출입문 자동 닫힘", "사용자에게 위험 상태 표시"] },
  { id: 2, type: "gate", site: "사업장 3", time: "14:31:02", title: "사용자 문 열기", result: "말벌", confidence: 96, door: "열림", action: "수동 개방", probs: { hornet: 96, bee: 3, other: 1 }, flow: ["말벌 감지 지속", "사용자 문 열기", "3초 후 안전 정책에 따라 자동 재폐쇄"] },
  { id: 3, type: "danger", site: "사업장 3", time: "14:31:05", title: "자동 재폐쇄", result: "말벌", confidence: 96, door: "닫힘", action: "자동 재폐쇄", probs: { hornet: 96, bee: 3, other: 1 }, flow: ["사용자 문 열기", "말벌 감지 지속", "자동 재폐쇄 완료"] },
  { id: 4, type: "gate", site: "사업장 2", time: "11:05:12", title: "사용자 문 닫기", result: "꿀벌", confidence: 91, door: "닫힘", action: "수동 폐쇄", probs: { hornet: 4, bee: 91, other: 5 }, flow: ["사용자 제어", "출입문 닫힘", "수동 상태 저장"] },
];

const FILTERS = [["all", "전체"], ["danger", "위험"], ["gate", "문 제어"]];
const HISTORY_OVERVIEW = { total: 24, danger: 8, door: 3 };

function getBinaryProbs(item) {
  const probs = item?.probs || {};
  const confidence = Number(item?.confidence) || 0;
  const wasp = typeof probs.wasp === "number"
    ? probs.wasp
    : typeof probs.hornet === "number"
      ? probs.hornet
      : item?.result === "말벌" ? confidence : Math.max(0, 100 - confidence);

  const nonWasp = typeof probs.nonWasp === "number"
    ? probs.nonWasp
    : (typeof probs.bee === "number" || typeof probs.other === "number")
      ? (probs.bee || 0) + (probs.other || 0)
      : Math.max(0, 100 - wasp);

  return { wasp, nonWasp };
}

function EventDetail({ item, onClose, onAnalysis }) {
  if (!item) return null;
  const danger = item.type === "danger" || item.result === "말벌";
  const binaryProbs = getBinaryProbs(item);

  return (
    <div className="buzz-detail-overlay" onClick={onClose}>
      <div className="buzz-history-detail buzz-history-detail-full" onClick={(e) => e.stopPropagation()}>
        <div className="buzz-history-detail-head buzz-history-detail-appbar">
          <div>
            <p className="buzz-kicker">이력 상세</p>
            <h2>{item.title}</h2>
            <span>{item.site} · {item.time}</span>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기">×</button>
        </div>

        <p className="buzz-history-detail-intro">감지 당시의 AI 판정과 문 상태를 한 화면에서 확인할 수 있습니다.</p>

        <div className={`buzz-detail-status ${danger ? "danger" : "normal"}`}>
          <div><span>AI 판정</span><b>{item.result}</b></div>
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
          {[["말벌", binaryProbs.wasp], ["말벌 아님", binaryProbs.nonWasp]].map(([label, value]) => (
            <div className="buzz-history-prob" key={label}>
              <span>{label}</span>
              <div><i className={label === "말벌" ? "danger" : ""} style={{ width: `${value}%` }} /></div>
              <b>{value}%</b>
            </div>
          ))}
        </div>

        <button type="button" className="buzz-history-analysis-link" onClick={onAnalysis}>
          관련 AI 분석 상세 보기 <span>›</span>
        </button>
      </div>
    </div>
  );
}

export default function HistoryPage({ setPage }) {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [historyPage, setHistoryPage] = useState(1);

  const latest = getLatestDetection();
  const site3Danger = getSiteRuntimeStatus(3) === "danger";

  const history = useMemo(() => {
    const runtimeHistory = getRuntimeHistory();
    return Array.isArray(runtimeHistory) && runtimeHistory.length > 0 ? runtimeHistory : BASE_HISTORY;
  }, [site3Danger, latest?.time]);

  const filtered = history.filter((item) => filter === "all" || item.type === filter);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(historyPage, pageCount);
  const pageItems = filtered.slice((currentPage - 1) * 10, currentPage * 10);

  return (
    <div className="buzz-commercial-page">
      <main className="buzz-commercial-content buzz-history-page buzz-web-history">
        <div className="buzz-page-heading buzz-history-heading">
          <div>
            <h1>감지 이력</h1>
            <p className="buzz-page-desc">위험 감지와 출입문 동작을 확인하세요.</p>
          </div>
        </div>

        <section className="buzz-history-summary">
          <div><span>전체 이벤트</span><b>{HISTORY_OVERVIEW.total}</b></div>
          <div className="danger"><span>위험</span><b>{HISTORY_OVERVIEW.danger}</b></div>
          <div><span>문 제어</span><b>{HISTORY_OVERVIEW.door}</b></div>
        </section>

        <div className="buzz-history-filters">
          {FILTERS.map(([key, label]) => (
            <button type="button" key={key} className={filter === key ? "active" : ""} onClick={() => {
              setFilter(key);
              setHistoryPage(1);
            }}>
              {label}
            </button>
          ))}
        </div>

        <div className="buzz-history-only-list">
          {pageItems.map((item) => (
            <button
              type="button"
              className="buzz-history-only-card"
              key={item.id}
              onClick={() => setSelected(item)}
            >
              <div className="buzz-history-only-top">
                <div className="buzz-history-only-time">
                  <strong>{item.time}</strong>
                  <span>{item.site}</span>
                </div>

                <span className={`buzz-history-event-badge ${item.type === "danger" ? "danger" : ""}`}>
                  {item.type === "danger" ? "위험" : "문 제어"}
                </span>

                <span className="buzz-history-only-arrow">›</span>
              </div>

              <b className="buzz-history-only-title-text">{item.title}</b>

              <div className="buzz-history-only-info">
                <div>
                  <span className="buzz-history-only-icon">◉</span>
                  <p><small>AI 판정</small><b>{item.result} {item.confidence}%</b></p>
                </div>
                <div>
                  <span className={`buzz-history-only-door ${item.door === "열림" ? "open" : ""}`}>▯</span>
                  <p><small>문 상태</small><b>{item.door}</b></p>
                </div>
              </div>
            </button>
          ))}

          {pageItems.length === 0 && <div className="buzz-history-only-empty">표시할 이력이 없습니다.</div>}
        </div>

        <div className="buzz-history-pagination">
          <button type="button" disabled={currentPage === 1} onClick={() => setHistoryPage((v) => Math.max(1, v - 1))}>‹</button>
          {Array.from({ length: pageCount }, (_, i) => i + 1).slice(0, 10).map((number) => (
            <button type="button" key={number} className={number === currentPage ? "active" : ""} onClick={() => setHistoryPage(number)}>
              {number}
            </button>
          ))}
          <button type="button" disabled={currentPage === pageCount} onClick={() => setHistoryPage((v) => Math.min(pageCount, v + 1))}>›</button>
        </div>

        <p className="buzz-history-tip">항목을 누르면 당시 AI 판정과 문 상태를 자세히 볼 수 있습니다.</p>
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