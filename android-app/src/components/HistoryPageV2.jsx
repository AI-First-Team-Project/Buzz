
import { useMemo, useState } from "react";
import BottomNav from "./BottomNav";
import { getLatestDetection, getSiteRuntimeStatus } from "../types";

const BASE_HISTORY = [
  {
    id: 1, type: "danger", site: "사업장 3", time: "14:30:25", title: "말벌 감지",
    result: "말벌", confidence: 97, door: "닫힘", action: "자동 폐쇄",
    probs: { hornet: 97, bee: 2, other: 1 },
    flow: ["말벌 감지", "출입문 자동 닫힘", "사용자에게 위험 상태 표시"],
  },
  {
    id: 2, type: "gate", site: "사업장 3", time: "14:31:02", title: "사용자 문 열기",
    result: "말벌", confidence: 96, door: "열림", action: "수동 개방",
    probs: { hornet: 96, bee: 3, other: 1 },
    flow: ["말벌 감지 지속", "사용자 문 열기", "3초 후 안전 정책에 따라 자동 재폐쇄"],
  },
  {
    id: 3, type: "danger", site: "사업장 3", time: "14:31:05", title: "자동 재폐쇄",
    result: "말벌", confidence: 96, door: "닫힘", action: "자동 재폐쇄",
    probs: { hornet: 96, bee: 3, other: 1 },
    flow: ["사용자 문 열기", "말벌 감지 지속", "자동 재폐쇄 완료"],
  },
  {
    id: 4, type: "gate", site: "사업장 2", time: "11:05:12", title: "사용자 문 닫기",
    result: "꿀벌", confidence: 91, door: "닫힘", action: "수동 폐쇄",
    probs: { hornet: 4, bee: 91, other: 5 },
    flow: ["사용자 제어", "출입문 닫힘", "수동 상태 저장"],
  },
];

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
            ["말벌", item.probs.hornet],
            ["꿀벌", item.probs.bee],
            ["Other", item.probs.other],
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
  const latest = getLatestDetection();
  const site3Danger = getSiteRuntimeStatus(3) === "danger";

  const history = useMemo(() => {
    const rows = [...BASE_HISTORY];
    if (site3Danger && latest) {
      rows[0] = {
        ...rows[0],
        time: latest.time,
        confidence: latest.confidence ?? 96,
        probs: { hornet: latest.confidence ?? 96, bee: 3, other: 1 },
      };
    }
    return rows;
  }, [site3Danger, latest?.time]);

  const filtered = history.filter((item) => filter === "all" || item.type === filter);

  return (
    <div className="buzz-commercial-page">
      <main className="buzz-commercial-content buzz-history-page">
        <div className="buzz-page-heading buzz-history-heading">
          <div>
            <p className="buzz-kicker">운영 기록</p>
            <h1>이력</h1>
            <p className="buzz-page-desc">위험 감지와 출입문 제어처럼 확인이 필요한 이벤트만 기록합니다.</p>
          </div>
        </div>

        <section className="buzz-history-summary">
          <div><span>전체 이벤트</span><b>{history.length}</b></div>
          <div className="danger"><span>위험</span><b>{history.filter((x) => x.type === "danger").length}</b></div>
          <div><span>문 제어</span><b>{history.filter((x) => x.type === "gate").length}</b></div>
        </section>

        <div className="buzz-history-filters">
          {FILTERS.map(([key, label]) => (
            <button key={key} className={filter === key ? "active" : ""} onClick={() => setFilter(key)}>
              {label}
            </button>
          ))}
        </div>

        <div className="buzz-history-list">
          {filtered.map((item) => {
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
