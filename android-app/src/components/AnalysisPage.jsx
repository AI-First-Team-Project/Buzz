import { useEffect, useState } from "react";
import BottomNav from "./BottomNav";
import { fetchLatestAnalysis } from "../api/buzzApi";
import { useSiteStatuses } from "../hooks/useSiteStatuses";
import { MelSpectrogram, SpectrumChart, WaveformChart } from "./AudioAnalysisCharts";

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function SiteSelector({ siteId, setSiteId, sites }) {
  const selected = sites.find((site) => site.id === siteId);
  return (
    <div className="buzz-analysis-site-selector">
      <div>
        <p className="buzz-kicker">분석 대상</p>
        <b>{selected?.name ?? `사업장 ${siteId}`}</b>
      </div>
      <select value={siteId} onChange={(e) => setSiteId(Number(e.target.value))}>
        {sites.map((site) => <option value={site.id} key={site.id}>{site.name}</option>)}
      </select>
    </div>
  );
}

export default function AnalysisPage({ setPage }) {
  const { sites } = useSiteStatuses();
  const [siteId, setSiteId] = useState(3);
  const [showDetail, setShowDetail] = useState(true);
  const [analysisBySite, setAnalysisBySite] = useState({});
  const selectedSite = sites.find((site) => site.id === siteId) ?? sites[0];
  const latestAnalysis = analysisBySite[siteId] ?? null;
  const data = {
    name: selectedSite?.name ?? `사업장 ${siteId}`,
    status: selectedSite?.status ?? "normal",
    result: selectedSite?.insect === "wasps" ? "말벌" : "말벌 아님",
    confidence: selectedSite?.confidence ?? 0,
    probs: selectedSite?.probabilities ?? { wasp: 0, nonWasp: 0 },
    analyzedAt: selectedSite?.lastAnalyzedAt ?? "분석 대기 중",
    duration: latestAnalysis ? `${Number(latestAnalysis.audio.duration).toFixed(1)}초` : "최신 데이터 대기",
    summary: selectedSite?.status === "danger"
      ? "말벌 위험 상태가 유지되고 있으며 출입문 자동 보호 규칙이 적용됩니다."
      : "현재 사업장은 정상 상태이며 최신 음원 신호를 표시하고 있습니다.",
  };
  const danger = data.status === "danger";

  useEffect(() => {
    let active = true;
    if (!selectedSite?.latestAnalysisId) return () => { active = false; };
    fetchLatestAnalysis(siteId)
      .then((analysis) => {
        if (active && analysis) setAnalysisBySite((previous) => ({ ...previous, [siteId]: analysis }));
      })
      .catch(() => {});
    return () => { active = false; };
  }, [siteId, selectedSite?.latestAnalysisId]);

  return (
    <div className="buzz-commercial-page">
      <main className="buzz-commercial-content buzz-analysis-page">
        <div className="buzz-page-heading">
          <h1>분석</h1>
          <p className="buzz-page-desc">
            사업장별 AI 판정과 음향 특징을 비교하고, 상세 신호 분석까지 확인하세요.
          </p>
        </div>

        <SiteSelector siteId={siteId} setSiteId={setSiteId} sites={sites} />

        <section className="buzz-metric-grid">
          <div className="buzz-metric-card">
            <span>오늘 분석</span><strong>-</strong><small>DB 연결 후</small>
          </div>
          <div className="buzz-metric-card danger">
            <span>말벌 감지</span><strong>-</strong><small>DB 연결 후</small>
          </div>
        </section>

        <section className={`buzz-card buzz-analysis-summary-card ${danger ? "danger" : ""}`}>
          <div className="buzz-analysis-summary-head">
            <div>
              <p className="buzz-kicker">AI 판정 요약</p>
              <h2>{data.name} · 최근 분석</h2>
            </div>
            <span className={`buzz-status-chip ${danger ? "danger" : ""}`}>{danger ? "위험" : "정상"}</span>
          </div>

          <div className="buzz-analysis-result">
            <div><span>최종 판정</span><strong>{data.result}</strong></div>
            <div><span>신뢰도</span><strong className={danger ? "danger" : ""}>{data.confidence}%</strong></div>
          </div>

          <div className="buzz-analysis-probs">
            <div><span>말벌</span><b>{data.probs.wasp}%</b></div>
            <div><span>말벌 아님</span><b>{data.probs.nonWasp}%</b></div>
          </div>

          <div className="buzz-analysis-meta">
            <span>분석 시각 <b>{data.analyzedAt}</b></span>
            <span>음원 길이 <b>{data.duration}</b></span>
          </div>

          <p className={`buzz-analysis-conclusion ${danger ? "danger" : ""}`}>
            {data.summary}
          </p>
        </section>

        <section className="buzz-card">
          <div className="buzz-card-head">
            <div><p className="buzz-kicker">최근 7일</p><h2>말벌 감지 추이</h2></div>
            <span className="buzz-history-pending-badge">DB 연결 후 제공</span>
          </div>
          <div className="buzz-week-chart buzz-week-chart-pending" aria-label="최근 7일 말벌 감지 추이 DB 연결 대기">
            {DAY_LABELS.map((label) => <div key={label}><span/><small>{label}</small></div>)}
            <p>이력 DB 연결 후 일별 감지 건수가 표시됩니다.</p>
          </div>
        </section>

        <section className="buzz-card buzz-analysis-entry">
          <div className="buzz-card-head">
            <div><p className="buzz-kicker">신호 분석</p><h2>상세 결과 분석</h2></div>
          </div>
          <p className="buzz-page-desc">
            Waveplot → FFT → Mel-Spectrogram 순서로 원본 신호와 전체 주파수 특성을 확인할 수 있습니다.
          </p>
          <button className="buzz-primary-btn" onClick={() => setShowDetail((v) => !v)}>
            {showDetail ? "상세 그래프 접기" : "상세 그래프 펼치기"}
          </button>
        </section>

        {showDetail && (
          <section className="buzz-card buzz-tech-detail buzz-portfolio-tech">
            <div className="buzz-tech-block buzz-wave-block">
              <div className="buzz-tech-title">
                <div><span>1. Waveplot</span><small>분석에 사용된 오디오의 시간 영역 파형</small></div>
                <span className="buzz-help-pill">원본 신호</span>
              </div>
              <div className="buzz-wave-chart">
                {latestAnalysis ? <WaveformChart data={latestAnalysis.waveform} /> : <span>최신 분석 대기 중</span>}
              </div>
              <div className="buzz-time-axis">
                <span>0초</span><span>{data.duration}</span>
              </div>
              <p className="buzz-analysis-insight">
                음원의 진폭 변화를 시간 순서대로 보여줍니다. 소리가 강해지는 구간과 반복 패턴을 빠르게 확인할 수 있습니다.
              </p>
            </div>

            <div className="buzz-tech-block">
              <div className="buzz-tech-title">
                <div><span>2. FFT Spectrum</span><small>주파수별 에너지 분포</small></div>
                <span className="buzz-help-pill">주파수 분석</span>
              </div>
              <div className="buzz-fft-chart buzz-fft-detailed">
                {latestAnalysis ? <SpectrumChart data={latestAnalysis.fft} /> : <span>최신 분석 대기 중</span>}
                <div className="buzz-fft-axis">
                  <span>0</span><span>1k</span><span>2k</span><span>3k</span><span>4k Hz</span>
                </div>
              </div>
              <p className="buzz-analysis-insight strong">
                최신 2초 음원의 주파수별 상대 에너지를 표시합니다.
              </p>
            </div>

            <div className="buzz-tech-block buzz-tech-main">
              <div className="buzz-tech-title">
                <div><span>3. Mel-Spectrogram</span><small>전체 주파수 대역</small></div>
                <span className="buzz-help-pill">CNN 입력 특징</span>
              </div>
              <div className="buzz-spectrogram-layout buzz-spectrogram-large">
                <span className="buzz-axis-y">주파수 ↑</span>
                <div className="buzz-mel-visual">
                  {latestAnalysis ? <MelSpectrogram data={latestAnalysis.spectrogram} /> : <span>최신 분석 대기 중</span>}
                </div>
                <div className="buzz-time-axis">
                  <span>0초</span><span>{data.duration} → 시간</span>
                </div>
              </div>
              <div className="buzz-energy-legend">
                <span>낮은 에너지</span><i/><i/><i/><i/><span>높은 에너지</span>
              </div>
              <p className="buzz-analysis-insight">
                전체 주파수 대역을 표시합니다. 색이 밝을수록 해당 시간·주파수 구간의 에너지가 높습니다.
              </p>
            </div>
          </section>
        )}
      </main>
      <BottomNav currentPage="analysis" setPage={setPage}/>
    </div>
  );
}
