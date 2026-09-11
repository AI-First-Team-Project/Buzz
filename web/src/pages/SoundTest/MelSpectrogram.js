import { jsx as _jsx } from "react/jsx-runtime";
// 사운드 테스트 - 멜 스펙트로그램 시각화
const COLUMNS = 40;
const ROWS = 16;
// Deterministic heat value per cell, layered sine waves to mimic a
// frequency-over-time energy pattern without any binary image asset.
function heatAt(col, row) {
    const t = col / COLUMNS;
    const f = row / ROWS;
    const energy = Math.sin(t * 12 + f * 3) * 0.4 + Math.sin(t * 4 - f * 8) * 0.35 + Math.cos(f * 10) * 0.25;
    return Math.max(0, Math.min(1, 0.5 + energy * 0.6 - f * 0.15));
}
function heatColor(v) {
    // dark purple -> magenta -> orange -> yellow, approximating a "magma" map
    const stops = [
        [0, '#1a1033'],
        [0.35, '#5b1a63'],
        [0.6, '#b7325f'],
        [0.8, '#f0793c'],
        [1, '#fbdf6a'],
    ];
    for (let i = 0; i < stops.length - 1; i += 1) {
        const [p0, c0] = stops[i];
        const [p1, c1] = stops[i + 1];
        if (v >= p0 && v <= p1) {
            return v - p0 < p1 - v ? c0 : c1;
        }
    }
    return stops[stops.length - 1][1];
}
<<<<<<< HEAD
export function MelSpectrogram({ matrix, className }) {
    const rowStep = Math.max(1, Math.ceil((matrix?.length || ROWS) / ROWS));
    const colCount = matrix?.[0]?.length || COLUMNS;
    const colStep = Math.max(1, Math.ceil(colCount / COLUMNS));
    const values = matrix?.length
        ? Array.from({ length: ROWS }, (_, row) => Array.from({ length: COLUMNS }, (_, col) => matrix[Math.min(matrix.length - 1, row * rowStep)]?.[Math.min(colCount - 1, col * colStep)] ?? -80))
        : Array.from({ length: ROWS }, (_, row) => Array.from({ length: COLUMNS }, (_, col) => heatAt(col, row)));
    const flattened = values.flat();
    const min = Math.min(...flattened);
    const max = Math.max(...flattened);
    const range = max - min || 1;
    const cellW = 100 / COLUMNS;
    const cellH = 100 / ROWS;
    return (_jsx("svg", { viewBox: "0 0 100 100", preserveAspectRatio: "none", className: className, role: "img", "aria-label": "Mel Spectrogram", children: values.map((rowValues, row) => rowValues.map((value, col) => (_jsx("rect", { x: col * cellW, y: (ROWS - row - 1) * cellH, width: cellW + 0.5, height: cellH + 0.5, fill: heatColor((value - min) / range) }, `${col}-${row}`)))) }));
=======
export function MelSpectrogram({ db, className }) {
    const rows = db?.length ? db : Array.from({ length: ROWS }, (_, row) => Array.from({ length: COLUMNS }, (_, col) => heatAt(col, row)));
    const rowCount = rows.length;
    const columnCount = rows[0]?.length || 1;
    const flat = rows.flat();
    const min = db?.length ? Math.min(...flat) : 0;
    const max = db?.length ? Math.max(...flat) : 1;
    const normalize = (value) => (value - min) / Math.max(max - min, Number.EPSILON);
    const cellW = 100 / columnCount;
    const cellH = 100 / rowCount;
    return (_jsx("svg", { viewBox: "0 0 100 100", preserveAspectRatio: "none", className: className, "aria-hidden": "true", children: rows.map((values, row) => values.map((value, col) => (_jsx("rect", { x: col * cellW, y: (rowCount - row - 1) * cellH, width: cellW + 0.5, height: cellH + 0.5, fill: heatColor(db?.length ? normalize(value) : value) }, `${col}-${row}`)))) }));
>>>>>>> dev
}
