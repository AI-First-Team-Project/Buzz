import { jsx as _jsx } from "react/jsx-runtime";
// Deterministic pseudo-amplitude so the waveform looks organic without
// depending on Math.random (keeps renders stable and reproducible).
function amplitudeAt(i) {
    const a = Math.sin(i * 0.7) * 0.5 + Math.sin(i * 1.9 + 1.2) * 0.3 + Math.sin(i * 0.3) * 0.2;
    return 0.15 + Math.abs(a) * 0.85;
}
<<<<<<< HEAD
export function Waveform({ amplitude, className }) {
    const source = amplitude?.length ? amplitude : Array.from({ length: 64 }, (_, index) => amplitudeAt(index));
    const step = Math.max(1, Math.ceil(source.length / 180));
    const values = source.filter((_, index) => index % step === 0);
    const peak = Math.max(...values.map((value) => Math.abs(value)), 1e-6);
    const barWidth = 100 / values.length;
    return (_jsx("svg", { viewBox: "0 0 100 32", preserveAspectRatio: "none", className: className, role: "img", "aria-label": "오디오 파형", children: values.map((value, i) => {
            const h = Math.max(0.6, Math.abs(value) / peak * 28);
            return (_jsx("rect", { x: i * barWidth + barWidth * 0.1, y: 16 - h / 2, width: barWidth * 0.8, height: h, rx: 0.2, fill: "#2563eb" }, i));
=======
export function Waveform({ seed = [], values, className }) {
    const samples = values?.length ? values : seed;
    const barWidth = 100 / Math.max(samples.length, 1);
    return (_jsx("svg", { viewBox: "0 0 100 32", preserveAspectRatio: "none", className: className, "aria-hidden": "true", children: samples.map((value, i) => {
            const normalized = values?.length ? Math.min(1, Math.abs(value)) : amplitudeAt(value);
            const h = Math.max(0.6, normalized * 28);
            return (_jsx("rect", { x: i * barWidth + barWidth * 0.15, y: 16 - h / 2, width: barWidth * 0.7, height: h, rx: 0.6, fill: "#f5a623" }, i));
>>>>>>> dev
        }) }));
}
