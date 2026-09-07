import { useEffect, useRef } from "react";

function LineChart({ x, y, unit, valueUnit, title }) {
  const low = Math.min(...y), high = Math.max(...y);
  const span = high - low || 1;
  const start = x[0], end = x[x.length - 1];
  const points = y.map((value, i) => `${(x[i] - start) / (end - start || 1) * 600},${150 - (value - low) / span * 140}`).join(" ");
  return <div>
    <small>{low.toFixed(2)} ~ {high.toFixed(2)} {valueUnit}</small>
    <svg viewBox="0 0 600 160" role="img" aria-label={title} style={{ width: "100%", background: "#0a0e1a" }}>
      <polyline points={points} fill="none" stroke="#34d399" strokeWidth="1.5" />
    </svg>
    <div className="buzz-time-axis"><span>{start.toFixed(2)} {unit}</span><span>{end.toFixed(2)} {unit}</span></div>
  </div>;
}

function Heatmap({ rows, time, title, axis }) {
  const ref = useRef(null);
  const min = Math.min(...rows.map(row => Math.min(...row)));
  const max = Math.max(...rows.map(row => Math.max(...row)));
  useEffect(() => {
    const canvas = ref.current;
    canvas.width = time.length;
    canvas.height = rows.length;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // 서버 행렬은 [주파수/계수][시간]. 낮은 행을 아래쪽에 배치한다.
    rows.forEach((row, r) => row.forEach((value, c) => {
      const t = (value - min) / (max - min || 1);
      ctx.fillStyle = `hsl(${240 - t * 220} 85% ${15 + t * 45}%)`;
      ctx.fillRect(c, rows.length - 1 - r, 1, 1);
    }));
  }, [rows, time, min, max]);
  return <div>
    <small>{axis} · {min.toFixed(1)} ~ {max.toFixed(1)} {title === "Mel-Spectrogram" ? "dB" : ""}</small>
    <canvas ref={ref} role="img" aria-label={title} style={{ width: "100%", height: 180, imageRendering: "pixelated" }} />
    <div className="buzz-time-axis"><span>{time[0].toFixed(2)}초</span><span>{time[time.length - 1].toFixed(2)}초</span></div>
  </div>;
}

// 이미지 URL이나 임의 높이 대신 FastAPI의 축과 수치 배열을 직접 렌더링한다.
export default function AnalysisCharts({ data }) {
  return <section className="buzz-card buzz-tech-detail">
    <div className="buzz-tech-block"><h3>1. Waveform</h3><LineChart x={data.waveform.time} y={data.waveform.amplitude} unit="초" valueUnit="진폭" title="파형" /></div>
    <div className="buzz-tech-block"><h3>2. FFT</h3><LineChart x={data.fft.frequency} y={data.fft.magnitudeDb} unit="Hz" valueUnit="dB" title="FFT" /></div>
    <div className="buzz-tech-block"><h3>3. Mel-Spectrogram</h3><Heatmap rows={data.spectrogram.db} time={data.spectrogram.time} title="Mel-Spectrogram" axis={`${data.spectrogram.frequency[0]} ~ ${data.spectrogram.frequency.at(-1)} Hz (Mel 축)`} /></div>
    <div className="buzz-tech-block"><h3>4. MFCC</h3><Heatmap rows={data.mfcc.coefficients} time={data.mfcc.time} title="MFCC" axis={`계수 0 ~ ${data.mfcc.coefficients.length - 1}`} /></div>
  </section>;
}
