// 사업장 - 풍경 일러스트
interface SiteSceneProps {
  tone: 'green' | 'amber' | 'teal';
  className?: string;
}

const PALETTES: Record<SiteSceneProps['tone'], { sky: [string, string]; hill: string; hillFar: string }> = {
  green: { sky: ['#cfe8d8', '#eef6ee'], hill: '#4d7c53', hillFar: '#7fa77f' },
  teal: { sky: ['#cfe4e8', '#eaf5f6'], hill: '#3f6e6b', hillFar: '#749b96' },
  amber: { sky: ['#e8d9c2', '#f3e9d8'], hill: '#7a6a45', hillFar: '#a5906a' },
};

// Lightweight vector stand-in for an on-site apiary photo, so the layout and
// tone read correctly without shipping binary image assets.
export function SiteScene({ tone, className }: SiteSceneProps) {
  const p = PALETTES[tone];
  return (
    <svg viewBox="0 0 400 220" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`sky-${tone}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.sky[0]} />
          <stop offset="100%" stopColor={p.sky[1]} />
        </linearGradient>
      </defs>
      <rect width="400" height="220" fill={`url(#sky-${tone})`} />
      <path d="M0 150 Q80 110 160 145 T400 130 V220 H0 Z" fill={p.hillFar} opacity="0.7" />
      <path d="M0 180 Q100 140 220 175 T400 160 V220 H0 Z" fill={p.hill} />
      {[60, 120, 180].map((x) => (
        <g key={x} transform={`translate(${x} 168)`}>
          <rect x="-16" y="0" width="32" height="14" rx="2" fill="#e8e1d1" />
          <rect x="-16" y="-13" width="32" height="12" rx="2" fill="#f2ecdd" />
          <rect x="-18" y="-17" width="36" height="5" rx="1.5" fill="#c9a24a" />
        </g>
      ))}
    </svg>
  );
}
