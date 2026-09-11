// BUZZ 앱 - components/Logo 모듈
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function BuzzMark({ size = 36 }) {
    return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 64 64", fill: "none", children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "buzzGrad", x1: "0", y1: "0", x2: "64", y2: "64", gradientUnits: "userSpaceOnUse", children: [_jsx("stop", { offset: "0%", stopColor: "#FFD86B" }), _jsx("stop", { offset: "55%", stopColor: "#F7B500" }), _jsx("stop", { offset: "100%", stopColor: "#E38A00" })] }) }), _jsx("polygon", { points: "32,2 58.5,17 58.5,47 32,62 5.5,47 5.5,17", fill: "url(#buzzGrad)" }), _jsx("polygon", { points: "32,8 52.6,20.3 52.6,43.7 32,56 11.4,43.7 11.4,20.3", fill: "#0A0E1A" }), _jsx("text", { x: "32", y: "41.5", textAnchor: "middle", fontFamily: "'Chakra Petch', 'Outfit', sans-serif", fontWeight: "700", fontSize: "27", fill: "#F7B500", children: "B" }), _jsx("path", { d: "M49 5.5 L43.5 15.5 h4.5 l-4 9", stroke: "#F7B500", strokeWidth: "2.6", strokeLinecap: "round", strokeLinejoin: "round", fill: "none" })] }));
}
export default function Logo({ size = 36, showWordmark = false, sub = 'INTRUSION AI' }) {
    if (!showWordmark)
        return _jsx(BuzzMark, { size: size });
    return (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(BuzzMark, { size: size }), _jsxs("div", { children: [_jsx("p", { className: "font-brand font-bold text-white leading-none", style: { fontSize: size * 0.55, letterSpacing: '0.22em' }, children: "BUZZ" }), _jsx("p", { className: "text-slate-500 font-medium mt-1.5", style: { fontSize: Math.max(8, size * 0.16), letterSpacing: '0.32em' }, children: sub })] })] }));
}
