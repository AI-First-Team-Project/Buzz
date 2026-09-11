import { jsx as _jsx } from "react/jsx-runtime";
// 공통 UI - 켜기 및 끄기 스위치
import styles from './Toggle.module.css';
export function Toggle({ checked, onChange, label }) {
    return (_jsx("button", { type: "button", role: "switch", "aria-checked": checked, "aria-label": label, className: `${styles.track} ${checked ? styles.trackOn : ''}`, onClick: () => onChange(!checked), children: _jsx("span", { className: `${styles.thumb} ${checked ? styles.thumbOn : ''}` }) }));
}
