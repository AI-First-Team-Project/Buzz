
import { useEffect, useRef, useState } from "react";
import BottomNav from "./BottomNav";
import AnalysisCharts from "./AnalysisCharts.jsx";
import { uploadAnalysis } from "../services/analysis.js";

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

          <p className={`buzz-analysis-conclusion ${result.main === "말벌" ? "danger" : ""}`}>
            {result.isMock ? "예측은 임시 결과입니다. 그래프는 업로드한 음원을 실제 분석한 결과입니다." : "업로드한 음원의 분석 결과입니다."}
          </p>
        </section>

        <AnalysisCharts data={result.raw} />
      </div>
    </div>
  );
}

export default function TestPage({ setPage }) {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);

  const analyze = async () => {
    if (!file || loading) return;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    setResult(null);
    setDetailOpen(false);
    try {
      // 서버 계약을 화면 데이터로 변환한다. 테스트 응답으로 운영 상태를 변경하지 않는다.
      const next = await uploadAnalysis(file, controller.signal);
      if (!controller.signal.aborted) setResult(next);
    } catch (error) {
      if (!controller.signal.aborted) setError(error.message || "서버에 연결할 수 없습니다.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  return (
    <div className="buzz-commercial-page">
      <main className="buzz-commercial-content buzz-test-page">
        <div className="buzz-page-heading">
          <p className="buzz-kicker">개발 · 검증 전용</p>
          <h1>AI 사운드 테스트</h1>
        </div>

        <div className="buzz-test-banner">
          <b>🧪 테스트 모드</b>
          <span>운영 모니터링과 완전히 분리되어 있으며 가상 개폐기 상태에는 영향을 주지 않습니다.</span>
        </div>

        <section className="buzz-card">
          <label className="buzz-file-drop">
            <span className="text-3xl">♫</span>
            <b>{file ? file.name : "오디오 파일 선택"}</b>
            <small>MP3 / WAV</small>
            <input
              type="file"
              disabled={loading}
              accept=".mp3,.wav,audio/*"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setError("");
                setResult(null);
                setDetailOpen(false);
              }}
            />
          </label>
          <button className="buzz-primary-btn" disabled={!file || loading} onClick={analyze}>{loading ? "분석 중…" : "분석 시작"}</button>
        </section>

        {error && <p role="alert">{error}</p>}
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
                분석 결과 상세 보기
              </button>
            </div>

            <p className="buzz-door-note mt-4">
              {result.isMock ? "예측: 임시 결과 · 그래프: 실제 음원 분석" : `사용 모델: ${result.raw.meta.modelName}`}
            </p>
          </section>
        )}
      </main>

      <AnalysisImageModal result={detailOpen ? result : null} onClose={() => setDetailOpen(false)} />
      <BottomNav currentPage="test" setPage={setPage} />
    </div>
  );
}
