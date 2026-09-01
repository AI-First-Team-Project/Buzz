
import { useEffect, useMemo, useState } from "react";
import BottomNav from "./BottomNav";
import { BuzzMark } from "./Logo";
import {
  getRuntimeSites,
  getSiteRuntimeStatus,
  setSiteRuntimeStatus,
} from "../types";

const classification = {
  normal: { primary: "꿀벌", primaryValue: 94, hornet: 4, other: 2 },
  danger: { primary: "말벌", primaryValue: 97, bee: 2, other: 1 },
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

export default function HomePage({ setPage, onOpenSite }) {
  const [sites, setSites] = useState(() => {
    const runtime = getRuntimeSites();
    return runtime.map((site) =>
      getSiteRuntimeStatus(site.id) === null
        ? { ...site, status: "normal", insect: null, count: 0, confidence: 0 }
        : site
    );
  });
  const [selectedSiteId, setSelectedSiteId] = useState(3);
  const [siteMenu, setSiteMenu] = useState(false);
  const [now, setNow] = useState(new Date());
  const [lastAnalysisAt, setLastAnalysisAt] = useState(Date.now());
  const [lastAnalysisLabel, setLastAnalysisLabel] = useState("방금 전");
  const [doorOpen, setDoorOpen] = useState(true);
  const [toast, setToast] = useState("");

  const selectedSite = useMemo(
    () => sites.find((site) => site.id === selectedSiteId) ?? sites[0],
    [sites, selectedSiteId]
  );
  const danger = selectedSite?.status === "danger";
  const ai = danger ? classification.danger : classification.normal;

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

  const operateDoor = () => {
    if (doorOpen) {
      setDoorOpen(false);
      setToast("출입문을 닫았습니다.");
      return;
    }
    setDoorOpen(true);
    if (danger) {
      setToast("말벌 감지 중입니다. 안전을 위해 3초 후 다시 자동으로 닫힙니다.");
      setTimeout(() => setDoorOpen(false), 3000);
    } else {
      setToast("출입문을 열었습니다.");
    }
  };

  const switchSite = (id) => {
    setSelectedSiteId(id);
    setSiteMenu(false);
    setSites(getRuntimeSites());
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
          <span>_buzz</span>
        </div>

        <button className="buzz-site-picker" onClick={() => setSiteMenu((v) => !v)}>
          <span>{selectedSite.name}</span>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <button className="buzz-icon-button" aria-label="알림">
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9a6 6 0 10-12 0v.75a8.967 8.967 0 01-2.312 6.022 23.857 23.857 0 005.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/>
          </svg>
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
                <span>꿀벌 {ai.bee}%</span>
                <span>Other {ai.other}%</span>
              </>
            ) : (
              <>
                <span>말벌 {ai.hornet}%</span>
                <span>Other {ai.other}%</span>
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
              ? "말벌 감지 중에는 사용자가 문을 열어도 안전을 위해 다시 자동으로 닫힙니다."
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
