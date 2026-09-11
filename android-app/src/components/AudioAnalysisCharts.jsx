import { useEffect, useMemo, useRef } from "react";

const CHART_WIDTH = 800;
const CHART_HEIGHT = 220;

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function sampledPairs(xValues, yValues, maxPoints = 600) {
  const length = Math.min(xValues?.length || 0, yValues?.length || 0);
  if (!length) return [];
  const step = Math.max(1, Math.ceil(length / maxPoints));
  const pairs = [];
  for (let i = 0; i < length; i += step) pairs.push([finite(xValues[i]), finite(yValues[i])]);
  if ((length - 1) % step !== 0) pairs.push([finite(xValues[length - 1]), finite(yValues[length - 1])]);
  return pairs;
}

function LineChart({ xValues, yValues, symmetric = false, color, label }) {
  const path = useMemo(() => {
    const pairs = sampledPairs(xValues, yValues);
    if (pairs.length < 2) return "";
    const xs = pairs.map(([x]) => x);
    const ys = pairs.map(([, y]) => y);
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
    return pairs.map(([x, y], index) => {
      const px = ((x - xMin) / xRange) * CHART_WIDTH;
      const py = CHART_HEIGHT - ((y - yMin) / yRange) * CHART_HEIGHT;
      return `${index ? "L" : "M"}${px.toFixed(2)},${py.toFixed(2)}`;
    }).join(" ");
  }, [xValues, yValues, symmetric]);

  return (
    <svg className="buzz-api-line-chart" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} role="img" aria-label={label}>
      <line x1="0" x2={CHART_WIDTH} y1={CHART_HEIGHT / 2} y2={CHART_HEIGHT / 2} />
      <path d={path} stroke={color} />
    </svg>
  );
}

function interpolate(stops, value) {
  const scaled = Math.max(0, Math.min(1, value)) * (stops.length - 1);
  const left = Math.floor(scaled);
  const right = Math.min(stops.length - 1, left + 1);
  const ratio = scaled - left;
  return stops[left].map((channel, i) => Math.round(channel + (stops[right][i] - channel) * ratio));
}

function Heatmap({ matrix, palette, symmetric = false, label }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const rows = matrix?.length || 0;
    const cols = rows ? matrix[0]?.length || 0 : 0;
    const canvas = canvasRef.current;
    if (!canvas || !rows || !cols) return;

    canvas.width = cols;
    canvas.height = rows;
    const context = canvas.getContext("2d");
    const image = context.createImageData(cols, rows);
    const values = matrix.flat().filter(Number.isFinite);
    if (!values.length) return;
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (symmetric) {
      const bound = Math.max(Math.abs(min), Math.abs(max), 1e-6);
      min = -bound;
      max = bound;
    }
    const range = max - min || 1;

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

  return <canvas ref={canvasRef} className="buzz-api-heatmap" role="img" aria-label={label} />;
}

const MEL_PALETTE = [[18, 13, 49], [59, 15, 112], [140, 41, 129], [222, 73, 104], [254, 159, 109], [252, 253, 191]];
const MFCC_PALETTE = [[30, 58, 138], [59, 130, 246], [248, 250, 252], [239, 68, 68], [153, 27, 27]];

export function WaveformChart({ data }) {
  return <LineChart xValues={data.time} yValues={data.amplitude} symmetric color="#2563eb" label="Waveplot" />;
}

export function SpectrumChart({ data }) {
  return <LineChart xValues={data.frequency} yValues={data.magnitudeDb} color="#0ea5e9" label="FFT Spectrum" />;
}

export function MelSpectrogram({ data }) {
  return <Heatmap matrix={data.db} palette={MEL_PALETTE} label="Mel-Spectrogram" />;
}

export function MfccHeatmap({ data }) {
  return <Heatmap matrix={data.coefficients} palette={MFCC_PALETTE} symmetric label="MFCC" />;
}
