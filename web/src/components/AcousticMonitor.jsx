// 음향 모니터링 - 웹의 기본 음향 분석 및 보조 영상 전환
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AcousticSignal } from './AcousticSignal.tsx';
import styles from './AcousticMonitor.module.css';

export function AcousticMonitor({ site }) {
  const [mode, setMode] = useState('camera');
  return <section className={styles.monitor}>
    <div className={styles.heading}><h2>{site.name} · 모니터링</h2><span>{site.lastAnalyzedAt}</span></div>
    <div className={styles.switch} role="group" aria-label="모니터링 화면 선택">
      <button type="button" aria-pressed={mode === 'camera'} onClick={() => setMode('camera')}>카메라</button>
      <button type="button" aria-pressed={mode === 'sound'} onClick={() => setMode('sound')}>음향</button>
    </div>
    {mode === 'sound' ? <AcousticSignal seed={Number(site.id.replace(/\D/g, ''))} danger={site.status === 'danger'} /> : <div>
      <video key={site.id} src={`${import.meta.env.BASE_URL}videos/${site.id}.mp4`} autoPlay muted loop playsInline preload="metadata" />
      <p className={styles.note}>사업장 참고 영상</p>
    </div>}
    <Link className={styles.detail} to={`/analysis?site=${site.id}`}>상세 음향 분석 보기 <span>↗</span></Link>
  </section>;
}
