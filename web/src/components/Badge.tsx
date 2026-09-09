// 공통 UI - 상태 배지
import type { ReactNode } from 'react';
import styles from './Badge.module.css';

type BadgeTone = 'success' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  tone: BadgeTone;
  children: ReactNode;
}

export function Badge({ tone, children }: BadgeProps) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}
