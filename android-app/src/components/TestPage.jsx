<<<<<<< HEAD
import { useState } from "react";
import { analyzeTestAudio, API_BASE_URL } from "../api/buzzApi";
import {
  MelSpectrogram,
  MfccHeatmap,
  SpectrumChart,
  WaveformChart,
} from "./AudioAnalysisCharts";
import BottomNav from "./BottomNav";

function percent(value) {
  return Number((Number(value) * 100).toFixed(1));
}

function formatTimestamp(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleTimeString("ko-KR", {
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
      });
}

function toViewModel(data) {
  const wasp = data.prediction.label === "wasp";
  return {
    main: wasp ? "말벌" : "말벌 아님",
    confidence: percent(data.prediction.confidence),
    rows: [
      ["말벌", percent(data.prediction.probabilities.wasp)],
      ["말벌 아님", percent(data.prediction.probabilities.non_wasp)],
    ],
    fileName: data.audio.fileName,
    duration: `${Number(data.audio.duration).toFixed(1)}초`,
    analyzedAt: formatTimestamp(data.meta.timestamp),
    modelName: data.meta.modelName,
    analysisId: data.analysisId,
    charts: {
      waveform: data.waveform,
      fft: data.fft,
      spectrogram: data.spectrogram,
      mfcc: data.mfcc,
    },
  };
}

function AnalysisModal({ result, onClose }) {
=======

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
>>>>>>> dev
  if (!result) return null;
  const danger = result.main === "말벌";

  return (
    <div className="buzz-detail-overlay" onClick={onClose}>
      <div className="buzz-history-detail buzz-history-detail-full buzz-analysis-modal" onClick={(event) => event.stopPropagation()}>
        <div className="buzz-history-detail-head buzz-history-detail-appbar">
          <div>
            <p className="buzz-kicker">분석 결과 상세</p>
            <h2>테스트 음원 분석</h2>
            <span>{result.fileName} · {result.duration} · {result.analyzedAt}</span>
          </div>
          <button onClick={onClose} aria-label="닫기">×</button>
        </div>

        <section className={`buzz-card buzz-analysis-summary-card ${danger ? "danger" : ""}`}>
          <div className="buzz-analysis-summary-head">
            <div><p className="buzz-kicker">AI 판정 요약</p><h2>{result.main}</h2></div>
            <span className={`buzz-status-chip ${danger ? "danger" : ""}`}>{danger ? "위험" : "정상"}</span>
          </div>
          <div className="buzz-analysis-result">
            <div><span>최종 판정</span><strong>{result.main}</strong></div>
            <div><span>신뢰도</span><strong className={danger ? "danger" : ""}>{result.confidence}%</strong></div>
          </div>
          <div className="buzz-analysis-probs">
            {result.rows.map(([label, value]) => <div key={label}><span>{label}</span><b>{value}%</b></div>)}
          </div>
          <div className="buzz-analysis-meta">
            <span>분석 시각 <b>{result.analyzedAt}</b></span>
            <span>분석 구간 <b>{result.duration}</b></span>
            <span>사용 모델 <b>{result.modelName}</b></span>
          </div>
        </section>

        <section className="buzz-card buzz-tech-detail buzz-api-charts">
          <div className="buzz-tech-block">
            <div className="buzz-tech-title"><div><span>1. Waveplot</span><small>서버가 반환한 실제 시간·진폭 데이터</small></div></div>
            <WaveformChart data={result.charts.waveform} />
          </div>
          <div className="buzz-tech-block">
            <div className="buzz-tech-title"><div><span>2. FFT Spectrum</span><small>주파수별 상대 크기(dB)</small></div></div>
            <SpectrumChart data={result.charts.fft} />
          </div>
          <div className="buzz-tech-block">
            <div className="buzz-tech-title"><div><span>3. Mel-Spectrogram</span><small>시간에 따른 주파수 에너지</small></div></div>
            <MelSpectrogram data={result.charts.spectrogram} />
          </div>
          <div className="buzz-tech-block">
            <div className="buzz-tech-title"><div><span>4. MFCC</span><small>음색 특징 계수</small></div></div>
            <MfccHeatmap data={result.charts.mfcc} />
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
<<<<<<< HEAD
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!file || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    setDetailOpen(false);
    try {
      setResult(toViewModel(await analyzeTestAudio(file)));
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "음원 분석에 실패했습니다.");
    } finally {
      setLoading(false);
=======
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
>>>>>>> dev
    }
  };

  return (
    <div className="buzz-commercial-page">
      <main className="buzz-commercial-content buzz-test-page">
        <div className="buzz-page-heading">
          <h1>음원 테스트</h1>
          <p className="buzz-page-desc">음원을 FastAPI로 전송해 실제 AI 분류 결과를 확인하세요.</p>
        </div>

        <section className="buzz-card">
          <label className="buzz-file-drop">
            <span className="text-3xl">♫</span>
            <b>{file ? file.name : "음원 파일을 놓아주세요"}</b>
            <small>MP3 또는 WAV · 최대 30MB</small>
            <input
              type="file"
              accept=".mp3,.wav,audio/mpeg,audio/wav"
              disabled={loading}
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setResult(null);
                setError("");
                setDetailOpen(false);
                setError("");
              }}
            />
          </label>
<<<<<<< HEAD
          <button className="buzz-primary-btn" disabled={!file || loading} onClick={analyze}>
            {loading ? "AI 분석 중…" : "분석하기"}
          </button>
          <small className="buzz-api-endpoint">연결 서버: {API_BASE_URL}</small>
          {error && <p className="buzz-analysis-error" role="alert">{error}</p>}
=======
          <button className="buzz-primary-btn" disabled={!file || isAnalyzing} onClick={analyze}>
            {isAnalyzing ? "분석 중…" : "분석하기"}
          </button>
          {error && <p role="alert" className="buzz-test-error">{error}</p>}
>>>>>>> dev
        </section>

        {result && (
          <section className="buzz-card">
            <div className="buzz-card-head">
              <div><p className="buzz-kicker">실제 AI 분석 결과</p><h2>{result.main}</h2></div>
              <strong className="buzz-test-score">{result.confidence}%</strong>
            </div>
            <div className="space-y-3 mt-4">
              {result.rows.map(([label, value]) => (
                <div key={label} className="buzz-probability-row">
                  <span>{label}</span><div><i style={{ width: `${value}%` }} /></div><b>{value}%</b>
                </div>
              ))}
            </div>
            <p className="buzz-result-model">{result.modelName} · 분석 ID {result.analysisId.slice(0, 8)}</p>
            <div className="buzz-test-actions">
              <button className="buzz-secondary-btn" onClick={() => setDetailOpen(true)}>분석 상세 보기 →</button>
            </div>
          </section>
        )}
      </main>

      <AnalysisModal result={detailOpen ? result : null} onClose={() => setDetailOpen(false)} />
      <BottomNav currentPage="test" setPage={setPage} />
    </div>
  );
}
