// 공통 UI - 통계 요약 카드
import type { ComponentType } from 'react';
import styles from './StatCard.module.css';

type Tone = 'neutral' | 'success' | 'danger' | 'muted';

interface StatCardProps {
  icon: ComponentType<{ size?: number }>;
  label: string;
  value: string;
  tone?: Tone;
}

export function StatCard({ icon: Icon, label, value, tone = 'neutral' }: StatCardProps) {
  return (
    <div className={styles.card}>
      <div className={`${styles.iconWrap} ${styles[tone]}`}>
        <Icon size={18} />
      </div>
      <div>
        <div className={styles.label}>{label}</div>
        <div className={styles.value}>{value}</div>
      </div>
    </div>
  );
}
