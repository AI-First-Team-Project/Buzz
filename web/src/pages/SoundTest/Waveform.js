import { jsx as _jsx } from "react/jsx-runtime";
// Deterministic pseudo-amplitude so the waveform looks organic without
// depending on Math.random (keeps renders stable and reproducible).
function amplitudeAt(i) {
    const a = Math.sin(i * 0.7) * 0.5 + Math.sin(i * 1.9 + 1.2) * 0.3 + Math.sin(i * 0.3) * 0.2;
    return 0.15 + Math.abs(a) * 0.85;
}
export function Waveform({ seed = [], values, className }) {
    const samples = values?.length ? values : seed;
    const barWidth = 100 / Math.max(samples.length, 1);
    return (_jsx("svg", { viewBox: "0 0 100 32", preserveAspectRatio: "none", className: className, "aria-hidden": "true", children: samples.map((value, i) => {
            const normalized = values?.length ? Math.min(1, Math.abs(value)) : amplitudeAt(value);
            const h = Math.max(0.6, normalized * 28);
            return (_jsx("rect", { x: i * barWidth + barWidth * 0.15, y: 16 - h / 2, width: barWidth * 0.7, height: h, rx: 0.6, fill: "#f5a623" }, i));
        }) }));
}
