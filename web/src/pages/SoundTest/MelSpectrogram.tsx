// 사운드 테스트 - 멜 스펙트로그램 시각화
const COLUMNS = 40;
const ROWS = 16;

// Deterministic heat value per cell, layered sine waves to mimic a
// frequency-over-time energy pattern without any binary image asset.
function heatAt(col: number, row: number) {
  const t = col / COLUMNS;
  const f = row / ROWS;
  const energy =
    Math.sin(t * 12 + f * 3) * 0.4 + Math.sin(t * 4 - f * 8) * 0.35 + Math.cos(f * 10) * 0.25;
  return Math.max(0, Math.min(1, 0.5 + energy * 0.6 - f * 0.15));
}

function heatColor(v: number) {
  // dark purple -> magenta -> orange -> yellow, approximating a "magma" map
  const stops: [number, string][] = [
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

interface MelSpectrogramProps {
  className?: string;
}

export function MelSpectrogram({ className }: MelSpectrogramProps) {
  const cellW = 100 / COLUMNS;
  const cellH = 100 / ROWS;

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={className} aria-hidden="true">
      {Array.from({ length: COLUMNS }).map((_, col) =>
        Array.from({ length: ROWS }).map((_, row) => (
          <rect
            key={`${col}-${row}`}
            x={col * cellW}
            y={row * cellH}
            width={cellW + 0.5}
            height={cellH + 0.5}
            fill={heatColor(heatAt(col, row))}
          />
        )),
      )}
    </svg>
  );
}
