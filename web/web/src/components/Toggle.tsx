// 공통 UI - 켜기 및 끄기 스위치
import styles from './Toggle.module.css';

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`${styles.track} ${checked ? styles.trackOn : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className={`${styles.thumb} ${checked ? styles.thumbOn : ''}`} />
    </button>
  );
}
