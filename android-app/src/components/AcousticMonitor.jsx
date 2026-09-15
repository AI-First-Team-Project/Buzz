// 음향 모니터링 - 파형 우선 표시와 보조 영상 선택
import { useEffect, useRef, useState } from 'react';
import './AcousticMonitor.css';

export function AcousticSignal({ seed = 1, danger = false, compact = false }) {
  const color = danger ? '#ff465b' : '#23bd77';
  return <div className="buzz-acoustic-signal">
    <div className="buzz-acoustic-label"><b>음향 파형</b><span>샘플 신호</span></div>
    <svg viewBox="0 0 600 90" preserveAspectRatio="none" className={compact ? 'buzz-acoustic-mini' : 'buzz-acoustic-wave'} role="img" aria-label="음향 파형 샘플">
      <path d="M0 45H600" stroke={color} opacity=".25" />
      {Array.from({ length: 180 }, (_, i) => {
        const h = 3 + Math.abs(Math.sin(i * .71 + seed) * Math.cos(i * .23 + seed) * Math.sin(i * .047 + .4)) * 82;
        return <path key={i} d={`M${i * 600 / 180 + 1} ${45 - h / 2}v${h}`} stroke={color} strokeWidth="2" />;
      })}
    </svg>
    {!compact && <>
      <div className="buzz-acoustic-label"><b>주파수 스펙트로그램</b><span>8 kHz → 0</span></div>
      <svg viewBox="0 0 400 100" preserveAspectRatio="none" className="buzz-acoustic-spectrum" role="img" aria-label="주파수 스펙트로그램 샘플">
        {Array.from({ length: 800 }, (_, i) => {
          const x = i % 80, y = Math.floor(i / 80);
          const energy = Math.max(0, Math.min(1, .25 + y * .035 + Math.sin(x * .31 + seed) * .18 + Math.cos(y * 1.6 + x * .13) * .22));
          const colors = ['#170d35', '#32104c', '#65206d', '#a82b74', '#e85151', '#ff9742', '#ffcf59'];
          return <rect key={i} x={x * 5} y={y * 10} width="5.2" height="10.2" fill={colors[Math.floor(energy * 6)]} />;
        })}
      </svg>
      <div className="buzz-acoustic-axis"><span>0초</span><span>5초</span><span>10초</span></div>
    </>}
  </div>;
}

export default function AcousticMonitor({ siteId, name, danger, onAnalysis, cameraFocusKey }) {
  const [mode, setMode] = useState('camera');
  const videoRef = useRef(null);
  const videoSrc = `/videos/site-${siteId}.mp4`;
  const videoType = siteId === 3 ? 'video/webm' : 'video/mp4';

  useEffect(() => {
    setMode('camera');
  }, [cameraFocusKey]);

  useEffect(() => {
    if (mode !== 'camera' || !videoRef.current) return;
    videoRef.current.muted = true;
    videoRef.current.defaultMuted = true;
    videoRef.current.play().catch(() => {});
  }, [siteId, mode, cameraFocusKey]);

  return <section className="buzz-acoustic-monitor">
    <div className="buzz-acoustic-heading"><h2>{name} · 모니터링</h2><span className={`buzz-status-chip ${danger ? 'danger' : ''}`}>{danger ? '위험' : '정상'}</span></div>
    <div className="buzz-acoustic-switch" role="group" aria-label="모니터링 화면 선택">
      <button type="button" aria-pressed={mode === 'camera'} onClick={() => setMode('camera')}>카메라</button>
      <button type="button" aria-pressed={mode === 'sound'} onClick={() => setMode('sound')}>음향</button>
    </div>
    {mode === 'sound' ? <AcousticSignal seed={siteId} danger={danger} /> : <div>
      <video ref={videoRef} key={siteId} poster={danger ? '/images/wasp.jpg' : '/images/honeybee.jpg'} autoPlay muted defaultMuted loop playsInline preload="metadata">
        <source src={videoSrc} type={videoType} />
      </video>
      <p className="buzz-acoustic-note">사업장 참고 영상</p>
    </div>}
    <button type="button" className="buzz-acoustic-detail" onClick={onAnalysis}>상세 음향 분석 보기 <span>↗</span></button>
  </section>;
}
