// 시작 페이지 - BUZZ 시스템 초기화 및 로딩 화면
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import Logo from './Logo';
export default function SplashScreen({ onComplete }) {
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('BUZZ 시스템 초기화 중...');
    useEffect(() => {
        const steps = [
            { p: 28, s: 'AI 탐지 모델 로딩...' },
            { p: 55, s: 'CCTV 노드 연결 중...' },
            { p: 82, s: 'FFT 사운드 분석기 준비...' },
            { p: 100, s: '모든 시스템 정상' },
        ];
        let i = 0;
        const t = setInterval(() => {
            if (i < steps.length) {
                setProgress(steps[i].p);
                setStatus(steps[i].s);
                i++;
            }
            else {
                clearInterval(t);
                setTimeout(onComplete, 450);
            }
        }, 480);
        return () => clearInterval(t);
    }, [onComplete]);
    return (_jsxs("div", { className: "min-h-screen bg-[#0A0E1A] flex flex-col items-center justify-center px-8 select-none relative overflow-hidden", children: [_jsx("div", { className: "absolute inset-0 opacity-[0.05] pointer-events-none", children: _jsxs("svg", { className: "w-full h-full", viewBox: "0 0 200 200", preserveAspectRatio: "xMidYMid slice", children: [_jsx("defs", { children: _jsx("pattern", { id: "honeycomb", width: "28", height: "24.25", patternUnits: "userSpaceOnUse", children: _jsx("polygon", { points: "14,1 26.5,8 26.5,16.25 14,23.25 1.5,16.25 1.5,8", fill: "none", stroke: "#F7B500", strokeWidth: "0.8", transform: "scale(1.55)" }) }) }), _jsx("rect", { width: "200", height: "200", fill: "url(#honeycomb)" })] }) }), _jsx("div", { className: "absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-buzz-500/10 rounded-full blur-3xl pointer-events-none" }), _jsxs("div", { className: "relative mb-10", children: [_jsx("div", { className: "absolute inset-0 rounded-full bg-buzz-500/20 blur-2xl animate-pulse" }), _jsx("div", { className: "relative", children: _jsx(Logo, { size: 104, showWordmark: true, sub: "BEE INTRUSION INTELLIGENCE" }) })] }), _jsxs("p", { className: "text-slate-400 text-sm text-center leading-relaxed mb-12", children: ["AI \uC0AC\uC6B4\uB4DC + CCTV \uAE30\uBC18", _jsx("br", {}), _jsx("span", { className: "text-buzz-400 font-semibold", children: "\uB9D0\uBC8C\u00B7\uAFC0\uBC8C \uCE68\uC785 \uAC10\uC9C0" })] }), _jsxs("div", { className: "w-full max-w-[280px]", children: [_jsx("div", { className: "h-1 bg-white/8 rounded-full overflow-hidden mb-3", children: _jsx("div", { className: "h-full bg-gradient-to-r from-buzz-600 via-buzz-500 to-buzz-300 rounded-full transition-all duration-500 ease-out", style: { width: `${progress}%` } }) }), _jsxs("div", { className: "flex justify-between items-center", children: [_jsx("p", { className: "text-slate-500 text-xs", children: status }), _jsxs("p", { className: "font-brand text-buzz-400 text-xs font-bold", style: { letterSpacing: '0.1em' }, children: [progress, "%"] })] })] }), _jsxs("div", { className: "absolute bottom-8 text-center", children: [_jsxs("p", { className: "font-brand text-slate-600 text-[11px] font-semibold", style: { letterSpacing: '0.25em' }, children: ["BUZZ ", _jsx("span", { className: "text-buzz-600", children: "v1.0.0" })] }), _jsx("p", { className: "text-slate-700 text-[10px] mt-1.5", children: "Protecting what matters. Buzz." })] })] }));
}
