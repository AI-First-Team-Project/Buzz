// 음향 모니터링 - 사업장 파형과 주파수 분포 표시
import { MelSpectrogram } from '../pages/SoundTest/MelSpectrogram';
import styles from './AcousticSignal.module.css';

export function AcousticSignal({ seed = 1, danger = false, compact = false }: { seed?: number; danger?: boolean; compact?: boolean }) {
  return (
    <div className={`${styles.signal} ${danger ? styles.danger : ''}`}>
      <div className={styles.heading}><strong>음향 파형</strong><span>샘플 신호</span></div>
      <svg viewBox="0 0 600 100" preserveAspectRatio="none" className={compact ? styles.compact : styles.wave} role="img" aria-label="음향 파형 샘플">
        <path d="M0 50H600" stroke="currentColor" opacity=".2" />
        {Array.from({ length: 180 }, (_, i) => {
          const height = 4 + Math.abs(Math.sin(i * .71 + seed) * Math.cos(i * .23 + seed) * Math.sin(i * .047 + .4)) * 86;
          return <path key={i} d={`M${i * 600 / 180 + 1} ${50 - height / 2}v${height}`} stroke="currentColor" strokeWidth="1.8" />;
        })}
      </svg>
      {!compact && <>
        <div className={styles.axis}><span>0초</span><span>5초</span><span>10초</span></div>
        <div className={styles.heading}><strong>주파수 스펙트로그램</strong><span>시간별 에너지</span></div>
        <div className={styles.spectrum} role="img" aria-label="주파수 스펙트로그램 샘플">
          <div className={styles.frequency}><span>8 kHz</span><span>4 kHz</span><span>0</span></div>
          <MelSpectrogram className={styles.heatmap} />
        </div>
        <div className={styles.axis}><span>0초</span><span>5초</span><span>10초</span></div>
      </>}
    </div>
  );
}
