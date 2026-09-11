// 사운드 테스트 - 음원 파형 시각화
interface WaveformProps {
  seed: number[];
  className?: string;
}

// Deterministic pseudo-amplitude so the waveform looks organic without
// depending on Math.random (keeps renders stable and reproducible).
function amplitudeAt(i: number) {
  const a = Math.sin(i * 0.7) * 0.5 + Math.sin(i * 1.9 + 1.2) * 0.3 + Math.sin(i * 0.3) * 0.2;
  return 0.15 + Math.abs(a) * 0.85;
}

export function Waveform({ seed, className }: WaveformProps) {
  const barWidth = 100 / seed.length;
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className={className} aria-hidden="true">
      {seed.map((i) => {
        const h = amplitudeAt(i) * 28;
        return (
          <rect
            key={i}
            x={i * barWidth + barWidth * 0.15}
            y={16 - h / 2}
            width={barWidth * 0.7}
            height={h}
            rx={0.6}
            fill="#f5a623"
          />
        );
      })}
    </svg>
  );
}
