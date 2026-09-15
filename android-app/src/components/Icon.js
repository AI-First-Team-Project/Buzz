// BUZZ 앱 - components/Icon 모듈
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
const iconPaths = {
    activity: _jsx(_Fragment, { children: _jsx("path", { d: "M3 12h4l2.2-6 4.1 12L16 10l1.6 2H21" }) }),
    alert: _jsxs(_Fragment, { children: [_jsx("path", { d: "M12 3 2.8 19a1.5 1.5 0 0 0 1.3 2.2h15.8a1.5 1.5 0 0 0 1.3-2.2L12 3Z" }), _jsx("path", { d: "M12 9v4.5M12 17h.01" })] }),
    'arrow-left': _jsx("path", { d: "m14.5 5-7 7 7 7" }),
    'arrow-right': _jsx("path", { d: "m9.5 5 7 7-7 7" }),
    bell: _jsxs(_Fragment, { children: [_jsx("path", { d: "M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" }), _jsx("path", { d: "M10 21h4" })] }),
    bee: _jsxs(_Fragment, { children: [_jsx("path", { d: "M12 9.2c-2.4 0-4.2 2.7-4.2 6.2s1.8 5.9 4.2 5.9 4.2-2.4 4.2-5.9-1.8-6.2-4.2-6.2Z", fill: "currentColor", stroke: "none" }), _jsx("path", { d: "M8.1 13h7.8M7.9 16.5h8.2", stroke: "#0A0E1A", strokeWidth: "1.8" }), _jsx("path", { d: "M8.5 12.2c-2.3-2.8-5.6-2.4-5.2.8.3 2.3 2.8 3.2 4.8 2.5M15.5 12.2c2.3-2.8 5.6-2.4 5.2.8-.3 2.3-2.8 3.2-4.8 2.5M10.2 9.5 8.5 6.8M13.8 9.5l1.7-2.7" }), _jsx("path", { d: "M8.5 6.8h.01M15.5 6.8h.01" })] }),
    camera: _jsxs(_Fragment, { children: [_jsx("rect", { x: "3", y: "7", width: "13", height: "11", rx: "2" }), _jsx("path", { d: "m16 10 4-2v9l-4-2M8.5 11.5h2.8" })] }),
    check: _jsx("path", { d: "m5 12.5 4.3 4.2L19.5 6.8" }),
    'chevron-right': _jsx("path", { d: "m9.5 5 7 7-7 7" }),
    download: _jsxs(_Fragment, { children: [_jsx("path", { d: "M12 3v11" }), _jsx("path", { d: "m8 10 4 4 4-4M5 20h14" })] }),
    'gate-closed': _jsxs(_Fragment, { children: [_jsx("path", { d: "M5 21V7.5a7 7 0 0 1 14 0V21" }), _jsx("path", { d: "M3 21h18M8.5 10h7M8.5 14h7M8.5 18h7" })] }),
    'gate-open': _jsxs(_Fragment, { children: [_jsx("path", { d: "M5 21V7.5a7 7 0 0 1 11.8-5.1" }), _jsx("path", { d: "M12 21V11h7v10M3 21h18M14.5 14h2" })] }),
    history: _jsxs(_Fragment, { children: [_jsx("path", { d: "M3.5 12a8.5 8.5 0 1 0 2-5.5" }), _jsx("path", { d: "M3.5 4.5v4h4M12 7v5l3.5 2" })] }),
    lock: _jsxs(_Fragment, { children: [_jsx("rect", { x: "5", y: "10", width: "14", height: "11", rx: "2" }), _jsx("path", { d: "M8 10V7a4 4 0 0 1 8 0v3" })] }),
    menu: _jsx("path", { d: "M4 7h16M4 12h16M4 17h16" }),
    settings: _jsxs(_Fragment, { children: [_jsx("circle", { cx: "12", cy: "12", r: "3" }), _jsx("path", { d: "M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.1 2.1-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-3v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-2.1-2.1.1-.1A1.7 1.7 0 0 0 7 15a1.7 1.7 0 0 0-1.6-1H5.2v-3h.2A1.7 1.7 0 0 0 7 10a1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.1-2.1.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h3v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.1 2.1-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v3H21a1.7 1.7 0 0 0-1.6 1Z" })] }),
    shield: _jsxs(_Fragment, { children: [_jsx("path", { d: "M12 3 20 6v5c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10V6l8-3Z" }), _jsx("path", { d: "m8.5 12 2.2 2.2 4.8-4.8" })] }),
    sliders: _jsx(_Fragment, { children: _jsx("path", { d: "M4 7h16M4 17h16M8 3v8M16 13v8" }) }),
    sound: _jsx(_Fragment, { children: _jsx("path", { d: "M4 10v4h3l4 4V6l-4 4H4ZM15 9.5a4 4 0 0 1 0 5M18 7a7.5 7.5 0 0 1 0 10" }) }),
    spark: _jsx("path", { d: "m12 2 1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6L12 2ZM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" }),
    unlock: _jsxs(_Fragment, { children: [_jsx("rect", { x: "5", y: "10", width: "14", height: "11", rx: "2" }), _jsx("path", { d: "M16 10V7a4 4 0 0 0-7.5-2" })] }),
};
export default function Icon({ name, size = 20, className = '', strokeWidth = 1.8 }) {
    return (_jsx("svg", { "aria-hidden": "true", width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: strokeWidth, strokeLinecap: "round", strokeLinejoin: "round", className: className, children: iconPaths[name] }));
}
