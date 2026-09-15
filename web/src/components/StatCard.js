import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import styles from './StatCard.module.css';
export function StatCard({ icon: Icon, label, value, tone = 'neutral' }) {
    return (_jsxs("div", { className: styles.card, children: [_jsx("div", { className: `${styles.iconWrap} ${styles[tone]}`, children: _jsx(Icon, { size: 18 }) }), _jsxs("div", { children: [_jsx("div", { className: styles.label, children: label }), _jsx("div", { className: styles.value, children: value })] })] }));
}
