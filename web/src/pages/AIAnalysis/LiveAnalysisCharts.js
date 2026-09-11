import { jsx as _jsx } from 'react/jsx-runtime';
import { useEffect, useMemo, useRef } from 'react';
import styles from './AIAnalysis.module.css';

const WIDTH = 900;
const HEIGHT = 230;

function finite(value, fallback = 0) {
    return Number.isFinite(value) ? value : fallback;
}

function linePath(xValues, yValues, symmetric = false) {
    const length = Math.min(xValues?.length ?? 0, yValues?.length ?? 0);
    if (length < 2)
        return '';
    const step = Math.max(1, Math.ceil(length / 700));
    const points = [];
    for (let index = 0; index < length; index += step)
        points.push([finite(xValues[index]), finite(yValues[index])]);
    if ((length - 1) % step !== 0)
        points.push([finite(xValues[length - 1]), finite(yValues[length - 1])]);

    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    let yMin = Math.min(...ys);
    let yMax = Math.max(...ys);
    if (symmetric) {
        const bound = Math.max(Math.abs(yMin), Math.abs(yMax), 1e-6);
        yMin = -bound;
        yMax = bound;
    }
    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;
    return points.map(([x, y], index) => {
        const px = ((x - xMin) / xRange) * WIDTH;
        const py = HEIGHT - ((y - yMin) / yRange) * HEIGHT;
        return `${index ? 'L' : 'M'}${px.toFixed(2)},${py.toFixed(2)}`;
    }).join(' ');
}

export function SignalLineChart({ xValues, yValues, symmetric = false, color, label }) {
    const path = useMemo(() => linePath(xValues, yValues, symmetric), [xValues, yValues, symmetric]);
    return _jsx('svg', {
        className: styles.liveLineChart,
        viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
        role: 'img',
        'aria-label': label,
        children: _jsx('path', { d: path, stroke: color }),
    });
}

function interpolate(stops, value) {
    const scaled = Math.max(0, Math.min(1, value)) * (stops.length - 1);
    const left = Math.floor(scaled);
    const right = Math.min(stops.length - 1, left + 1);
    const ratio = scaled - left;
    return stops[left].map((channel, index) => Math.round(
        channel + (stops[right][index] - channel) * ratio,
    ));
}

export function SignalHeatmap({ matrix, palette, symmetric = false, label }) {
    const canvasRef = useRef(null);
    useEffect(() => {
        const rows = matrix?.length ?? 0;
        const cols = rows ? matrix[0]?.length ?? 0 : 0;
        const canvas = canvasRef.current;
        if (!canvas || !rows || !cols)
            return;
        const values = matrix.flat().filter(Number.isFinite);
        if (!values.length)
            return;
        let min = Math.min(...values);
        let max = Math.max(...values);
        if (symmetric) {
            const bound = Math.max(Math.abs(min), Math.abs(max), 1e-6);
            min = -bound;
            max = bound;
        }
        const range = max - min || 1;
        canvas.width = cols;
        canvas.height = rows;
        const context = canvas.getContext('2d');
        const image = context.createImageData(cols, rows);
        for (let row = 0; row < rows; row += 1) {
            for (let col = 0; col < cols; col += 1) {
                const value = finite(matrix[rows - row - 1]?.[col], min);
                const [red, green, blue] = interpolate(palette, (value - min) / range);
                const offset = (row * cols + col) * 4;
                image.data[offset] = red;
                image.data[offset + 1] = green;
                image.data[offset + 2] = blue;
                image.data[offset + 3] = 255;
            }
        }
        context.putImageData(image, 0, 0);
    }, [matrix, palette, symmetric]);
    return _jsx('canvas', { ref: canvasRef, className: styles.liveHeatmap, role: 'img', 'aria-label': label });
}

export const MEL_PALETTE = [[18, 13, 49], [59, 15, 112], [140, 41, 129], [222, 73, 104], [254, 159, 109], [252, 253, 191]];
