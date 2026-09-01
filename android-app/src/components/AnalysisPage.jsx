
import { useMemo, useState } from "react";
import BottomNav from "./BottomNav";

const SITE_DATA = {
  1: {
    name: "사업장 1",
    status: "normal",
    result: "꿀벌",
    confidence: 95,
    probs: { hornet: 2, bee: 95, other: 3 },
    analyzedAt: "15:38:12",
    duration: "18.0초",
    source: "운영 데이터",
    summary: "꿀벌 음향 패턴이 우세하며 위험 신호는 확인되지 않았습니다.",
    dominantBand: "약 0.8~1.5 kHz",
  },
  2: {
    name: "사업장 2",
    status: "normal",
    result: "꿀벌",
    confidence: 92,
    probs: { hornet: 4, bee: 92, other: 4 },
    analyzedAt: "15:39:04",
    duration: "12.0초",
    source: "운영 데이터",
    summary: "꿀벌 신호가 안정적으로 분류되었으며 출입문 자동 보호는 작동하지 않았습니다.",
    dominantBand: "약 1.0~1.7 kHz",
  },
  3: {
    name: "사업장 3",
    status: "danger",
    result: "말벌",
    confidence: 97,
    probs: { hornet: 97, bee: 2, other: 1 },
    analyzedAt: "15:40:27",
    duration: "15.0초",
    source: "운영 데이터",
    summary: "말벌 특징이 강하게 검출되어 위험 상태로 판정되었고 출입문 자동 폐쇄 조건을 충족했습니다.",
    dominantBand: "약 1.5~2.2 kHz",
  },
};

const DAYS = [["월",20],["화",42],["수",16],["목",63],["금",34],["토",76],["일",48]];
const WAVE = [32,44,38,55,71,42,28,63,76,49,36,58,82,67,39,22,51,73,62,45,31,69,77,54,29,48,66,40,25,57,70,46,34,61,79,52,27,43,64,37];
const FFT = [15,24,39,30,52,45,36,61,72,67,48,34,58,76,81,64,43,31,50,69,74,57,38,27,46,62,55,33,21,40,53,36];

function SiteSelector({ siteId, setSiteId }) {
  return (
    <div className="buzz-analysis-site-selector">
      <div>
        <p className="buzz-kicker">분석 대상</p>
        <b>{SITE_DATA[siteId].name}</b>
      </div>
      <select value={siteId} onChange={(e) => setSiteId(Number(e.target.value))}>
        <option value={1}>사업장 1</option>
        <option value={2}>사업장 2</option>
        <option value={3}>사업장 3</option>
      </select>
    </div>
  );
}

export default function AnalysisPage({ setPage }) {
  const [siteId, setSiteId] = useState(3);
  const [showDetail, setShowDetail] = useState(true);
  const data = SITE_DATA[siteId];
  const danger = data.status === "danger";

  const melCells = useMemo(() => Array.from({ length: 240 }, (_, i) => 0.16 + ((i * (siteId + 9)) % 10) / 11), [siteId]);
  const mfccCells = useMemo(() => Array.from({ length: 84 }, (_, i) => 0.22 + ((i * (siteId + 5)) % 10) / 14), [siteId]);

  return (
    <div className="buzz-commercial-page">
      <main className="buzz-commercial-content buzz-analysis-page">
        <div className="buzz-page-heading">
          <p className="buzz-kicker">운영 데이터 · 포트폴리오 상세 분석</p>
          <h1>분석</h1>
          <p className="buzz-page-desc">
            사업장별 AI 판정과 음향 특징을 비교하고, 필요한 경우 원본 파형과 주파수 분석까지 확인합니다.
          </p>
        </div>

        <SiteSelector siteId={siteId} setSiteId={setSiteId} />

        <section className="buzz-metric-grid">
          <div className="buzz-metric-card">
            <span>오늘 분석</span><strong>128</strong><small>건</small>
          </div>
          <div className="buzz-metric-card danger">
            <span>말벌 감지</span><strong>{siteId === 3 ? 3 : siteId === 2 ? 1 : 0}</strong><small>건</small>
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
            <div><span>말벌</span><b>{data.probs.hornet}%</b></div>
            <div><span>꿀벌</span><b>{data.probs.bee}%</b></div>
            <div><span>Other</span><b>{data.probs.other}%</b></div>
          </div>

          <div className="buzz-analysis-meta">
            <span>분석 시각 <b>{data.analyzedAt}</b></span>
            <span>음원 길이 <b>{data.duration}</b></span>
            <span>입력 출처 <b>{data.source}</b></span>
          </div>

          <p className={`buzz-analysis-conclusion ${danger ? "danger" : ""}`}>
            {data.summary}
          </p>
        </section>

        <section className="buzz-card">
          <div className="buzz-card-head">
            <div><p className="buzz-kicker">최근 7일</p><h2>말벌 감지 추이</h2></div>
          </div>
          <div className="buzz-week-chart">
            {DAYS.map(([label, h]) => <div key={label}><span style={{height:`${h}%`}}/><small>{label}</small></div>)}
          </div>
        </section>

        <section className="buzz-card buzz-analysis-entry">
          <div className="buzz-card-head">
            <div><p className="buzz-kicker">신호 분석</p><h2>상세 결과 분석</h2></div>
            <span className="buzz-analysis-badge">포트폴리오용 상세</span>
          </div>
          <p className="buzz-page-desc">
            Waveplot → FFT → Mel-Spectrogram → MFCC 순서로 원본 신호부터 AI 입력 특징까지 확인할 수 있습니다.
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
                <span className="buzz-wave-zero"/>
                {WAVE.map((v, i) => (
                  <i key={i} style={{
                    height: `${v}%`,
                    transform: `translateY(${i % 2 === 0 ? "-50%" : "0"})`
                  }}/>
                ))}
              </div>
              <div className="buzz-time-axis">
                <span>0초</span><span>5초</span><span>10초</span><span>{data.duration}</span>
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
                <span className="buzz-axis-y fft">강도</span>
                <div className="buzz-fft-plot">
                  {FFT.map((h, i) => <i key={i} style={{height:`${h}%`}} title={`${Math.round(i * 4000/(FFT.length-1))} Hz`}/>)}
                </div>
                <div className="buzz-fft-axis">
                  <span>0</span><span>1k</span><span>2k</span><span>3k</span><span>4k Hz</span>
                </div>
              </div>
              <p className="buzz-analysis-insight strong">
                주요 에너지가 <b>{data.dominantBand}</b> 구간에 상대적으로 집중되어 있습니다.
              </p>
            </div>

            <div className="buzz-tech-block buzz-tech-main">
              <div className="buzz-tech-title">
                <div><span>3. Mel-Spectrogram</span><small>시간에 따른 주파수 에너지 변화</small></div>
                <span className="buzz-help-pill">CNN 입력 특징</span>
              </div>
              <div className="buzz-spectrogram-layout buzz-spectrogram-large">
                <span className="buzz-axis-y">주파수 ↑</span>
                <div className="buzz-mel-visual">
                  {melCells.map((opacity, i) => <i key={i} style={{ opacity }} />)}
                </div>
                <div className="buzz-time-axis">
                  <span>0초</span><span>5초</span><span>10초</span><span>{data.duration} → 시간</span>
                </div>
              </div>
              <div className="buzz-energy-legend">
                <span>낮은 에너지</span><i/><i/><i/><i/><span>높은 에너지</span>
              </div>
              <p className="buzz-analysis-insight">
                색이 밝을수록 해당 시간·주파수 구간의 에너지가 높다는 의미입니다. CNN이 소리 패턴을 이미지처럼 학습하는 데 활용할 수 있습니다.
              </p>
            </div>

            <div className="buzz-tech-block buzz-mfcc-compact">
              <div className="buzz-tech-title">
                <div><span>4. MFCC</span><small>음색 특성을 압축한 특징 벡터</small></div>
                <span className="buzz-help-pill">보조 특징</span>
              </div>
              <div className="buzz-mfcc-grid buzz-mfcc-wide">
                {mfccCells.map((opacity, i) => <i key={i} style={{ opacity }} />)}
              </div>
              <p className="buzz-analysis-insight">
                사람이 직접 해석하기보다는 AI가 말벌·꿀벌·Other의 음색 차이를 비교하는 특징값으로 사용합니다.
              </p>
            </div>

            <div className="buzz-analysis-method">
              <h3>분석 흐름</h3>
              <div><span>10~30초 음원 입력</span><i>→</i><span>Waveplot/FFT</span><i>→</i><span>Mel/MFCC</span><i>→</i><span>AI 3분류</span></div>
            </div>
          </section>
        )}
      </main>
      <BottomNav currentPage="analysis" setPage={setPage}/>
    </div>
  );
}
