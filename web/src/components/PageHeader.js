import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import styles from './PageHeader.module.css';
export function PageHeader({ title, description, action }) {
    return (_jsxs("div", { className: styles.header, children: [_jsxs("div", { children: [_jsx("h1", { className: styles.title, children: title }), _jsx("p", { className: styles.description, children: description })] }), action && _jsx("div", { className: styles.action, children: action })] }));
}
