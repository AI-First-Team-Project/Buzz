
import { useState } from "react";
import BottomNav from "./BottomNav";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");

function svgUrl(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function lineChartUrl(values, color = "#f5a623") {
  const sampled = values?.filter((_, index) => index % Math.max(1, Math.ceil(values.length / 500))) ?? [];
  const min = Math.min(...sampled, 0);
  const max = Math.max(...sampled, 1e-6);
  const points = sampled.map((value, index) => `${(index / Math.max(sampled.length - 1, 1)) * 800},${190 - ((value - min) / Math.max(max - min, 1e-6)) * 180}`).join(" ");
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 200"><rect width="800" height="200" fill="#111827"/><polyline fill="none" stroke="${color}" stroke-width="2" points="${points}"/></svg>`);
}

function heatmapUrl(matrix) {
  const rows = matrix?.length ?? 0;
  const columns = matrix?.[0]?.length ?? 0;
  const flat = matrix?.flat() ?? [];
  const min = Math.min(...flat, 0);
  const max = Math.max(...flat, 1);
  const cells = matrix?.map((row, y) => row.map((value, x) => {
    const level = (value - min) / Math.max(max - min, 1e-6);
    const hue = 280 - level * 235;
    return `<rect x="${x}" y="${rows - y - 1}" width="1.1" height="1.1" fill="hsl(${hue} 85% ${20 + level * 55}%)"/>`;
  }).join("")).join("") ?? "";
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${columns || 1} ${rows || 1}" preserveAspectRatio="none"><rect width="100%" height="100%" fill="#111827"/>${cells}</svg>`);
}

function AnalysisImageModal({ result, onClose }) {
  if (!result) return null;

  return (
    <div className="buzz-detail-overlay" onClick={onClose}>
      <div className="buzz-history-detail buzz-history-detail-full buzz-analysis-modal" onClick={(e) => e.stopPropagation()}>
        <div className="buzz-history-detail-head buzz-history-detail-appbar">
          <div>
            <p className="buzz-kicker">분석 결과 상세</p>
            <h2>테스트 음원 분석</h2>
            <span>{result.fileName} · {result.duration} · {result.analyzedAt}</span>
          </div>
          <button onClick={onClose} aria-label="닫기">×</button>
        </div>

        <section className={`buzz-card buzz-analysis-summary-card ${result.main === "말벌" ? "danger" : ""}`}>
          <div className="buzz-analysis-summary-head">
            <div>
              <p className="buzz-kicker">AI 판정 요약</p>
              <h2>{result.main}</h2>
            </div>
            <span className={`buzz-status-chip ${result.main === "말벌" ? "danger" : ""}`}>
              {result.main === "말벌" ? "위험" : "정상"}
            </span>
          </div>

          <div className="buzz-analysis-result">
            <div><span>최종 판정</span><strong>{result.main}</strong></div>
            <div><span>신뢰도</span><strong className={result.main === "말벌" ? "danger" : ""}>{result.confidence}%</strong></div>
          </div>

          <div className="buzz-analysis-probs">
            {result.rows.map(([label, value]) => (
              <div key={label}><span>{label}</span><b>{value}%</b></div>
            ))}
          </div>

          <div className="buzz-analysis-meta">
            <span>분석 시각 <b>{result.analyzedAt}</b></span>
            <span>음원 길이 <b>{result.duration}</b></span>
            <span>입력 출처 <b>테스트 업로드</b></span>
          </div>

        </section>

        <section className="buzz-card buzz-tech-detail">
          <div className="buzz-tech-block buzz-wave-block">
            <div className="buzz-tech-title">
              <div><span>1. Waveplot</span><small>Python 서버에서 생성한 파형 이미지</small></div>
            </div>
            <img className="buzz-analysis-server-image" src={result.images.waveplot} alt="Waveplot" />
          </div>

          <div className="buzz-tech-block">
            <div className="buzz-tech-title">
              <div><span>2. FFT Spectrum</span><small>Python 서버에서 생성한 FFT 이미지</small></div>
            </div>
            <img className="buzz-analysis-server-image" src={result.images.fft} alt="FFT Spectrum" />
          </div>

          <div className="buzz-tech-block buzz-tech-main">
            <div className="buzz-tech-title">
              <div><span>3. Mel-Spectrogram</span><small>Python 서버에서 생성한 Mel-Spectrogram 이미지</small></div>
            </div>
            <img className="buzz-analysis-server-image" src={result.images.mel} alt="Mel-Spectrogram" />
          </div>

          <div className="buzz-tech-block buzz-mfcc-compact">
            <div className="buzz-tech-title">
              <div><span>4. MFCC</span><small>Python 서버에서 생성한 MFCC 이미지</small></div>
            </div>
            <img className="buzz-analysis-server-image" src={result.images.mfcc} alt="MFCC" />
          </div>
        </section>
      </div>
    </div>
  );
}

export default function TestPage({ setPage }) {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`${API_BASE_URL}/api/test/analyze`, { method: "POST", body });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.detail || `분석 요청 실패 (${response.status})`);
      const wasp = data.prediction.probabilities.wasp * 100;
      const nonWasp = data.prediction.probabilities.non_wasp * 100;
      setResult({
        main: data.prediction.label === "wasp" ? "말벌" : "말벌 아님",
        confidence: (data.prediction.confidence * 100).toFixed(1),
        rows: [["말벌", wasp.toFixed(1)], ["말벌 아님", nonWasp.toFixed(1)]],
        fileName: data.audio.fileName,
        duration: `${data.audio.duration.toFixed(1)}초`,
        analyzedAt: new Date(data.meta.timestamp).toLocaleTimeString("ko-KR", { hour12: false }),
        images: {
          waveplot: lineChartUrl(data.waveform.amplitude),
          fft: lineChartUrl(data.fft.magnitudeDb, "#60a5fa"),
          mel: heatmapUrl(data.spectrogram.db),
          mfcc: heatmapUrl(data.mfcc.coefficients),
        },
      });
      setDetailOpen(false);
    } catch (requestError) {
      setResult(null);
      setError(requestError instanceof Error ? requestError.message : "서버에 연결할 수 없습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="buzz-commercial-page">
      <main className="buzz-commercial-content buzz-test-page">
        <div className="buzz-page-heading">
          <h1>음원 테스트</h1>
          <p className="buzz-page-desc">음원을 업로드하고 AI 분류 결과를 확인하세요.</p>
        </div>

        <section className="buzz-card">
          <label className="buzz-file-drop">
            <span className="text-3xl">♫</span>
            <b>{file ? file.name : "음원 파일을 놓아주세요"}</b>
            <small>MP3 또는 WAV</small>
            <input
              type="file"
              accept=".mp3,.wav,audio/*"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setResult(null);
                setDetailOpen(false);
                setError("");
              }}
            />
          </label>
          <button className="buzz-primary-btn" disabled={!file || isAnalyzing} onClick={analyze}>
            {isAnalyzing ? "분석 중…" : "분석하기"}
          </button>
          {error && <p role="alert" className="buzz-test-error">{error}</p>}
        </section>

        {result && (
          <section className="buzz-card">
            <div className="buzz-card-head">
              <div><p className="buzz-kicker">분석 결과</p><h2>{result.main}</h2></div>
              <strong className="buzz-test-score">{result.confidence}%</strong>
            </div>

            <div className="space-y-3 mt-4">
              {result.rows.map(([label, value]) => (
                <div key={label} className="buzz-probability-row">
                  <span>{label}</span>
                  <div><i style={{ width: `${value}%` }} /></div>
                  <b>{value}%</b>
                </div>
              ))}
            </div>

            <div className="buzz-test-actions">
              <button className="buzz-secondary-btn" onClick={() => setDetailOpen(true)}>
                분석 상세 보기 →
              </button>
            </div>
          </section>
        )}
      </main>

      <AnalysisImageModal result={detailOpen ? result : null} onClose={() => setDetailOpen(false)} />
      <BottomNav currentPage="test" setPage={setPage} />
    </div>
  );
}
