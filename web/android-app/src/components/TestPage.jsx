
import { useMemo, useState } from "react";
import BottomNav from "./BottomNav";

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

  const nowTime = useMemo(() => new Date().toLocaleTimeString("ko-KR", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
  }), [result]);

  const analyze = () => {
    if (!file) return;
    const name = file.name.toLowerCase();
    const hornet = /hornet|wasp|vespa|말벌/.test(name);

    const computed = hornet
      ? {
          main: "말벌",
          confidence: 96.8,
          rows: [["말벌", 96.8], ["말벌 아님", 3.2]],
        }
      : {
          main: "말벌 아님",
          confidence: 93.4,
          rows: [["말벌", 6.6], ["말벌 아님", 93.4]],
        };

    setResult({
      ...computed,
      fileName: file.name,
      duration: hornet ? "15.0초" : "12.0초",
      analyzedAt: nowTime,
      images: {
        waveplot: "/mock-analysis/waveplot.png",
        fft: "/mock-analysis/fft.png",
        mel: "/mock-analysis/mel.png",
        mfcc: "/mock-analysis/mfcc.png",
      },
    });
    setDetailOpen(false)
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
              }}
            />
          </label>
          <button className="buzz-primary-btn" disabled={!file} onClick={analyze}>분석하기</button>
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
