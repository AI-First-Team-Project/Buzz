import { jsx as _jsx } from "react/jsx-runtime";
import styles from './Badge.module.css';
export function Badge({ tone, children }) {
    return _jsx("span", { className: `${styles.badge} ${styles[tone]}`, children: children });
}
