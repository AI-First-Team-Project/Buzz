// 공통 UI - 앱과 통일된 벌 마스코트 (상태 요약 카드에 사용)
import styles from './BeeMascot.module.css';

interface BeeMascotProps {
  danger?: boolean;
}

export function BeeMascot({ danger = false }: BeeMascotProps) {
  return (
    <div className={`${styles.mascot} ${danger ? styles.mascotDanger : ''}`} aria-hidden="true">
      <span className={`${styles.wing} ${styles.wingLeft}`} />
      <span className={`${styles.wing} ${styles.wingRight}`} />
      <span className={`${styles.ant} ${styles.antLeft}`} />
      <span className={`${styles.ant} ${styles.antRight}`} />
      <span className={`${styles.eye} ${styles.eyeLeft}`} />
      <span className={`${styles.eye} ${styles.eyeRight}`} />
      <span className={styles.mouth} />
    </div>
  );
}