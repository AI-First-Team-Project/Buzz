import AcousticMonitor, { AcousticSignal } from "./AcousticMonitor.jsx";
import { useEffect, useMemo, useRef, useState } from "react";
import BottomNav from "./BottomNav";
import { BuzzMark } from "./Logo";
import {
  getRuntimeSites,
  getSelectedSiteId,
  getSiteRuntimeStatus,
  appendRuntimeHistory,
  setSiteRuntimeStatus,
  setSelectedSiteId as persistSelectedSiteId,
} from "../types";

const classification = {
  normal: { primary: "말벌 아님", primaryValue: 94, wasp: 6 },
  danger: { primary: "말벌", primaryValue: 97, nonWasp: 3 },
};

function DoorIcon({ open }) {
  return open ? (
    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
    </svg>
  );
}

function BeeMascot({ danger = false }) {
  return (
    <div className={`buzz-mascot ${danger ? "is-danger" : ""}`} aria-hidden="true">
      <span className="buzz-wing buzz-wing-left" />
      <span className="buzz-wing buzz-wing-right" />
      <span className="buzz-ant buzz-ant-left" />
      <span className="buzz-ant buzz-ant-right" />
      <span className="buzz-eye buzz-eye-left" />
      <span className="buzz-eye buzz-eye-right" />
      <span className="buzz-mouth" />
    </div>
  );
}

export default function HomePage({ setPage }) {
  const [sites, setSites] = useState(() => {
    const runtime = getRuntimeSites();
    return runtime.map((site) =>
      getSiteRuntimeStatus(site.id) === null
        ? { ...site, status: "normal", insect: null, count: 0, confidence: 0 }
        : site
    );
  });
  const [selectedSiteId, setSelectedSiteId] = useState(getSelectedSiteId);
  const [siteMenu, setSiteMenu] = useState(false);
  const [now, setNow] = useState(new Date());
  const [lastAnalysisAt, setLastAnalysisAt] = useState(Date.now());
  const [lastAnalysisLabel, setLastAnalysisLabel] = useState("방금 전");
  const [doorOpen, setDoorOpen] = useState(true);
  const [toast, setToast] = useState("");
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertsAcknowledged, setAlertsAcknowledged] = useState(false);
  const [dangerModalSite, setDangerModalSite] = useState(null);
  const [cameraFocusKey, setCameraFocusKey] = useState(0);
  const dashboardSiteRef = useRef(null);
  const dangerTimer = useRef(null);
  const previousDangerCount = useRef(null);

  const selectedSite = useMemo(
    () => sites.find((site) => site.id === selectedSiteId) ?? sites[0],
    [sites, selectedSiteId]
  );
  const danger = selectedSite?.status === "danger";
  const dangerSites = useMemo(() => sites.filter((site) => site.status === "danger"), [sites]);
  const ai = danger ? classification.danger : classification.normal;

  useEffect(() => {
    if (dangerSites.length > 0) {
      setAlertOpen(true);
      setAlertsAcknowledged(false);
    } else {
      setAlertOpen(false);
    }
  }, [dangerSites.length]);

  useEffect(() => {
    if (dangerSites.length > 0 && (previousDangerCount.current === null || previousDangerCount.current === 0)) {
      setDangerModalSite(dangerSites[0]);
    }
    previousDangerCount.current = dangerSites.length;
  }, [dangerSites]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
      const diff = Math.max(0, Math.floor((Date.now() - lastAnalysisAt) / 1000));
      setLastAnalysisLabel(diff < 2 ? "방금 전" : `${diff}초 전`);
    }, 1000);
    return () => clearInterval(timer);
  }, [lastAnalysisAt]);

  // UI 데모용 Kafka 입력 시뮬레이션:
  // 10~30초 사이의 랜덤 간격으로 새 음원 조각이 도착한 것으로 보고
  // "마지막 분석" 시각을 갱신한다.
  // 실제 연동 시에는 FastAPI/Kafka Consumer 결과 수신 시 setLastAnalysisAt(Date.now())를 호출하면 된다.
  useEffect(() => {
    let timer;
    const scheduleNext = () => {
      const delay = 10000 + Math.floor(Math.random() * 20001);
      timer = setTimeout(() => {
        setLastAnalysisAt(Date.now());
        scheduleNext();
      }, delay);
    };
    scheduleNext();
    return () => clearTimeout(timer);
  }, []);

  // 기존 팀원 데모 로직 유지: 사업장 3은 약 10초 후 말벌 이벤트를 발생시킬 수 있다.
  useEffect(() => {
    [1, 2].forEach((id) => setSiteRuntimeStatus(id, "normal"));
    if (getSiteRuntimeStatus(3) === null) setSiteRuntimeStatus(3, "normal");
    setSites(getRuntimeSites());

    const existingDanger = getSiteRuntimeStatus(3) === "danger";
    if (existingDanger) return;

    const timer = setTimeout(() => {
      setSiteRuntimeStatus(3, "danger");
      setSites(getRuntimeSites());
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setDoorOpen(!danger);
  }, [selectedSiteId, danger]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3300);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => () => window.clearTimeout(dangerTimer.current), []);

  const operateDoor = () => {
    if (doorOpen) {
      setDoorOpen(false);
      appendRuntimeHistory({ type: "gate", site: selectedSite.name, time: new Date().toLocaleTimeString("ko-KR", { hour12: false }), title: "사용자 문 닫기", result: danger ? "말벌" : "말벌 아님", confidence: danger ? 97 : 95, door: "닫힘", action: "수동 폐쇄", probs: { wasp: danger ? 97 : 5, nonWasp: danger ? 3 : 95 }, flow: ["사용자 제어", "출입문 닫힘", "이력 저장"] });
      setToast("출입문을 닫았습니다.");
      return;
    }
    setDoorOpen(true);
    if (danger) {
      setSiteRuntimeStatus(selectedSiteId, "normal");
      appendRuntimeHistory({ type: "gate", site: selectedSite.name, time: new Date().toLocaleTimeString("ko-KR", { hour12: false }), title: "사용자 문 열기", result: "말벌", confidence: 97, door: "열림", action: "정상 전환", probs: { wasp: 97, nonWasp: 3 }, flow: ["사용자 문 열기", "정상 상태 전환", "1분 뒤 위험 재확인"] });
      setSites(getRuntimeSites());
      dangerTimer.current = window.setTimeout(() => {
        setSiteRuntimeStatus(selectedSiteId, "danger");
        setSites(getRuntimeSites());
      }, 60000);
      setToast("출입문을 열어 정상 상태로 전환되었습니다. 1분 뒤 위험이 다시 표시됩니다.");
    } else {
      setToast("출입문을 열었습니다.");
    }
  };

  const switchSite = (id) => {
    setSelectedSiteId(id);
    persistSelectedSiteId(id);
    setSiteMenu(false);
    setSites(getRuntimeSites());
  };

  const selectOverviewSite = (id, event) => {
    event.currentTarget.blur();
    switchSite(id);
    setCameraFocusKey((key) => key + 1);
    window.requestAnimationFrame(() => {
      dashboardSiteRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
    });
  };

  const resetDemo = () => {
    setSiteRuntimeStatus(selectedSiteId, danger ? "normal" : "danger");
    setSites(getRuntimeSites());
  };

  return (
    <div className="buzz-commercial-page">
      <header className="buzz-topbar">
        <div className="buzz-brand">
          <BuzzMark size={30} />
          <span>BUZZ</span>
        </div>

        <button className="buzz-site-picker" onClick={() => setSiteMenu((v) => !v)}>
          <span>{selectedSite.name}</span>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <button
          className={`buzz-icon-button buzz-alert-button ${dangerSites.length > 0 ? "danger" : ""}`}
          aria-label={`위험 알림 ${dangerSites.length}건`}
          aria-expanded={alertOpen}
          onClick={() => {
            setAlertsAcknowledged(true);
            setAlertOpen((open) => !open);
          }}
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9a6 6 0 10-12 0v.75a8.967 8.967 0 01-2.312 6.022 23.857 23.857 0 005.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/>
          </svg>
          {dangerSites.length > 0 && !alertsAcknowledged && <i>{dangerSites.length}</i>}
        </button>

        {siteMenu && (
          <div className="buzz-site-menu">
            {sites.map((site) => (
              <button key={site.id} onClick={() => switchSite(site.id)}>
                <span className={`buzz-dot ${site.status === "danger" ? "danger" : ""}`} />
                <span className="flex-1 text-left">
                  <b>{site.name}</b>
                  <small>{site.status === "danger" ? "위험" : "정상"}</small>
                </span>
                {selectedSiteId === site.id && <span className="text-amber-500 font-black">✓</span>}
              </button>
            ))}
          </div>
        )}
      </header>

      {dangerModalSite && (
        <div className="buzz-danger-modal-overlay" role="alertdialog" aria-modal="true" aria-label="말벌 침입 위험 알림">
          <section className="buzz-danger-modal">
            <span className="buzz-danger-modal-icon">!</span>
            <p>위험 알림</p>
            <h2>말벌 침입 감지</h2>
            <strong>{dangerModalSite.name} · 신뢰도 {dangerModalSite.confidence ?? 97}%</strong>
            <span>가상 방어문이 자동으로 닫혔습니다.</span>
            <div>
              <button type="button" onClick={() => setDangerModalSite(null)}>확인</button>
            </div>
          </section>
        </div>
      )}

      {dangerSites.length > 0 && alertOpen && (
        <section className="buzz-mobile-alert" role="alert">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9a6 6 0 10-12 0v.75a8.967 8.967 0 01-2.312 6.022 23.857 23.857 0 005.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/>
          </svg>
          <div>
            {dangerSites.map((site) => (
              <p key={site.id}><b>{site.name}</b><span>말벌 {site.confidence ?? 97}% · 출입문 닫힘</span></p>
            ))}
          </div>
          <button onClick={() => { setAlertsAcknowledged(true); setAlertOpen(false); }} aria-label="알림 닫기">×</button>
        </section>
      )}

      <main className="buzz-commercial-content">
        <div className={`buzz-system-strip ${danger ? "danger" : ""}`}>
          <span className="buzz-dot" />
          <b>{danger ? "위험 감지" : "시스템 정상"}</b>
          <span>{selectedSite.name}</span>
        </div>

        <section className={`buzz-status-summary ${danger ? "danger" : ""}`}>
          <div className="buzz-status-symbol">
            {danger ? "!" : "✓"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="buzz-kicker">현재 상태</p>
            <h1>{danger ? "말벌 침입 감지" : "정상 감시 중"}</h1>
            <p>{danger ? "말벌이 감지되어 출입문을 자동으로 닫았습니다." : "현재 양봉장은 안전합니다."}</p>
            <small>마지막 분석 {lastAnalysisLabel}</small>
          </div>
          <BeeMascot danger={danger} />
        </section>

        <div ref={dashboardSiteRef}>
          <AcousticMonitor key={selectedSiteId} siteId={selectedSiteId} name={selectedSite.name} danger={danger} onAnalysis={() => setPage("analysis")} cameraFocusKey={cameraFocusKey} />
        </div>

        <section className={`buzz-card buzz-ai-card buzz-ai-compact ${danger ? "danger" : ""}`}>
          <div className="buzz-ai-compact-main">
            <div>
              <p className="buzz-kicker">AI 판정</p>
              <div className="buzz-ai-line">
                <BeeMascot danger={danger} />
                <b>{ai.primary}</b>
                <strong>{ai.primaryValue}%</strong>
              </div>
            </div>
            <span className={`buzz-status-chip ${danger ? "danger" : ""}`}>{danger ? "위험" : "정상"}</span>
          </div>
          <div className="buzz-ai-mini-row">
            {danger ? (
            <>
                <span>말벌 아님 {ai.nonWasp}%</span>
              </>
            ) : (
            <>
                <span>말벌 {ai.wasp}%</span>
              </>
            )}
          </div>
        </section>

        <section className={`buzz-card buzz-door-card ${danger ? "danger" : ""}`}>
          <div className="buzz-door-row">
            <div className={`buzz-door-symbol ${doorOpen ? "open" : "closed"}`}>
              <DoorIcon open={doorOpen} />
            </div>
            <div className="flex-1">
              <p className="buzz-kicker">문 상태</p>
              <h2>{doorOpen ? "열림" : "닫힘"}</h2>
              <small>{danger ? "자동 보호 모드 적용 중" : "수동 제어 가능"}</small>
            </div>
          </div>

          <button className={`buzz-door-action ${danger && !doorOpen ? "danger" : ""}`} onClick={operateDoor}>
            <DoorIcon open={!doorOpen} />
            {doorOpen ? "문 닫기" : "문 열기"}
          </button>

          <p className="buzz-door-note">
            ⓘ {danger
              ? "문을 열면 위험 상태가 해제되고 정상 상태로 전환됩니다."
              : "위험 감지 시 출입문이 자동으로 닫힙니다."}
          </p>
        </section>

        <section className="buzz-home-sites" aria-label="사업장별 현황">
          <div className="buzz-home-sites-head">
            <h2>사업장별 현황</h2>
          </div>
          <div className="buzz-home-site-list">
            {sites.map((site) => {
              const siteDanger = site.status === "danger";
              return <button key={site.id} type="button" className={siteDanger ? "danger" : ""} onClick={(event) => selectOverviewSite(site.id, event)}>
                <span className="buzz-home-site-name"><b>{site.name}</b><em>{siteDanger ? "위험" : "정상"}</em></span>
                <AcousticSignal seed={site.id} danger={siteDanger} compact />
                <span className="buzz-home-site-result">{siteDanger ? `최근 말벌 ${site.confidence ?? 97}%` : "최근 말벌 아님"}</span>
              </button>;
            })}
          </div>
        </section>

</main>

      {toast && <div className="buzz-toast">{toast}</div>}
      <BottomNav currentPage="home" setPage={setPage} />
    </div>
  );
}
