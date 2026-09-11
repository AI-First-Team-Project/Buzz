import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// 공통 UI - 앱과 통일된 벌 마스코트 (상태 요약 카드에 사용)
import styles from './BeeMascot.module.css';
export function BeeMascot({ danger = false }) {
    return (_jsxs("div", { className: `${styles.mascot} ${danger ? styles.mascotDanger : ''}`, "aria-hidden": "true", children: [_jsx("span", { className: `${styles.wing} ${styles.wingLeft}` }), _jsx("span", { className: `${styles.wing} ${styles.wingRight}` }), _jsx("span", { className: `${styles.ant} ${styles.antLeft}` }), _jsx("span", { className: `${styles.ant} ${styles.antRight}` }), _jsx("span", { className: `${styles.eye} ${styles.eyeLeft}` }), _jsx("span", { className: `${styles.eye} ${styles.eyeRight}` }), _jsx("span", { className: styles.mouth })] }));
}
