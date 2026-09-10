import { useEffect, useMemo, useState } from "react";
import BottomNav from "./BottomNav";
import { BuzzMark } from "./Logo";
import { useSiteStatuses } from "../hooks/useSiteStatuses";
import { commandDoor } from "../api/buzzApi";
import {
  getSelectedSiteId,
  setSelectedSiteId as persistSelectedSiteId,
} from "../types";

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

export default function HomePage({ setPage, onOpenSite }) {
  const { sites, setSites, error: monitoringError } = useSiteStatuses();
  const [selectedSiteId, setSelectedSiteId] = useState(getSelectedSiteId);
  const [siteMenu, setSiteMenu] = useState(false);
  const [now, setNow] = useState(new Date());
  const [doorOpen, setDoorOpen] = useState(true);
  const [doorControlPending, setDoorControlPending] = useState(false);
  const [toast, setToast] = useState("");
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertsAcknowledged, setAlertsAcknowledged] = useState(false);

  const selectedSite = useMemo(
    () => sites.find((site) => site.id === selectedSiteId) ?? sites[0],
    [sites, selectedSiteId]
  );
  const danger = selectedSite?.status === "danger";
  const dangerSites = useMemo(() => sites.filter((site) => site.status === "danger"), [sites]);
  const waspProbability = selectedSite?.probabilities?.wasp ?? 0;
  const nonWaspProbability = selectedSite?.probabilities?.nonWasp ?? 0;
  const waspDetected = selectedSite?.insect === "wasps";
  const ai = { primary: "말벌 확률", primaryValue: waspProbability, nonWasp: nonWaspProbability };

  useEffect(() => {
    if (dangerSites.length > 0) {
      setAlertOpen(true);
      setAlertsAcknowledged(false);
    } else {
      setAlertOpen(false);
    }
  }, [dangerSites.length]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setDoorOpen(selectedSite?.door !== "closed");
  }, [selectedSiteId, selectedSite?.door]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3300);
    return () => clearTimeout(t);
  }, [toast]);

  const operateDoor = async () => {
    if (!selectedSite || doorControlPending) return;
    const action = doorOpen ? "close" : "open";
    setDoorControlPending(true);
    try {
      const response = await commandDoor(selectedSite.id, action);
      const open = response.door_status === "OPEN";
      setDoorOpen(open);
      setSites((previous) => previous.map((site) => site.id === selectedSite.id
        ? { ...site, door: response.door_status.toLowerCase(), status: response.status.toLowerCase() }
        : site));
      setToast(`출입문을 ${open ? "열었습니다" : "닫았습니다"}.`);
    } catch (error) {
      setToast(error.message || "출입문을 제어하지 못했습니다.");
    } finally {
      setDoorControlPending(false);
    }
  };

  const switchSite = (id) => {
    setSelectedSiteId(id);
    persistSelectedSiteId(id);
    setSiteMenu(false);
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
          <b>{monitoringError ? "서버 연결 지연" : danger ? "위험 감지" : "시스템 정상"}</b>
          <span>{monitoringError ? "마지막 수신 상태 표시 중" : selectedSite.name}</span>
        </div>

        <section className={`buzz-status-summary ${danger ? "danger" : ""}`}>
          <div className="buzz-status-symbol">
            {danger ? "!" : "✓"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="buzz-kicker">현재 상태</p>
            <h1>{danger ? "말벌 침입 감지" : "정상 감시 중"}</h1>
            <p>{danger ? "말벌이 감지되어 출입문을 자동으로 닫았습니다." : "현재 양봉장은 안전합니다."}</p>
            <small>마지막 분석 {selectedSite?.lastAnalyzedAt ?? "분석 대기 중"}</small>
          </div>
          <BeeMascot danger={danger} />
        </section>

        <section className={`buzz-video-panel ${danger ? "danger" : ""}`}>
          <video
            key={`${selectedSiteId}-${danger ? "danger" : "normal"}`}
            src={`/videos/site-${selectedSiteId}.mp4`}
            poster={danger ? "/images/wasp.jpg" : "/images/honeybee.jpg"}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
          <div className="buzz-video-shade" />
          <div className="buzz-video-top">
            <span className="buzz-live-dot-only" aria-label="영상 재생 중"><i /></span>
            <span className="buzz-current-time">
              {now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })}
            </span>
          </div>
          <div className={`buzz-video-caption ${danger ? "danger" : ""}`}>
            {danger ? "말벌 감지 상태" : "꿀벌 영상 반복 재생"}
          </div>
        </section>

        <section className={`buzz-card buzz-ai-card buzz-ai-compact ${danger ? "danger" : ""} ${waspDetected ? "prediction-danger" : ""}`}>
          <div className="buzz-ai-compact-main">
            <div>
              <p className="buzz-kicker">AI 판정</p>
              <div className="buzz-ai-line">
                <BeeMascot danger={waspDetected} />
                <b>{ai.primary}</b>
                <strong>{ai.primaryValue}%</strong>
              </div>
            </div>
            <span className={`buzz-status-chip ${danger ? "danger" : ""}`}>{danger ? "위험" : "정상"}</span>
          </div>
          <div className="buzz-ai-mini-row">
            <span>안전 확률 {ai.nonWasp}%</span>
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

          <button className={`buzz-door-action ${danger && !doorOpen ? "danger" : ""}`} onClick={operateDoor} disabled={doorControlPending}>
            <DoorIcon open={!doorOpen} />
            {doorControlPending ? "처리 중..." : doorOpen ? "문 닫기" : "문 열기"}
          </button>

          <p className="buzz-door-note">
            ⓘ {danger
              ? "문을 열어도 위험 상태는 유지되며, 3회 연속 미탐지 시 정상으로 복귀합니다."
              : "위험 감지 시 출입문이 자동으로 닫힙니다."}
          </p>
        </section>

        <button className="buzz-wide-link buzz-wide-link-compact" onClick={() => setPage("site")}>
          <span>전체 사업장 보기</span>
          <span>3개 사업장 ›</span>
        </button>
</main>

      {toast && <div className="buzz-toast">{toast}</div>}
      <BottomNav currentPage="home" setPage={setPage} />
    </div>
  );
}
