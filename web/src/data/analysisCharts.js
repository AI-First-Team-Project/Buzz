export const DURATION_BY_SITE = { 1: '18.0초', 2: '12.0초', 3: '15.0초' };
export const DOMINANT_BAND_BY_SITE = {
    1: '약 0.8~1.5 kHz',
    2: '약 1.0~1.7 kHz',
    3: '약 1.5~2.2 kHz',
};
// 문자열(이벤트 ID 등)을 안정적인 숫자로 변환 - 같은 입력이면 항상 같은 값
export function hashSeed(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
        hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
    }
    return hash;
}
export function siteNumberFromId(id) {
    return Number(id.replace(/\D/g, '')) || 1;
}
// 확률 분포는 실제 API 연동 전까지 aiLabel / aiConfidence를 기반으로
// 결정적으로 파생시킨 값입니다(랜덤 없음 → 새로고침해도 값이 안정적).
export function buildProbs(label, confidence) {
    const conf = Math.max(0, Math.min(100, Math.round(confidence)));
    const rest = 100 - conf;
    if (label === 'wasp') {
        return { wasp: conf, nonWasp: rest };
    }
    return { wasp: rest, nonWasp: conf };
}
// Waveplot: seed별로 다른 파형처럼 보이도록 함
export function waveBars(seed) {
    return Array.from({ length: 42 }, (_, i) => {
        const t = i + seed * 5;
        const v = Math.sin(t * 0.7) * 0.5 + Math.sin(t * 1.9 + seed) * 0.3 + Math.sin(t * 0.31) * 0.2;
        return 12 + Math.abs(v) * 82;
    });
}
// FFT 스펙트럼: 낮은 주파수대에서 seed별로 다른 위치에 에너지가 몰리도록 구성
export function fftBars(seed) {
    return Array.from({ length: 32 }, (_, i) => {
        const t = i / 31;
        const peak = 0.18 + (seed % 5) * 0.12;
        const v = Math.exp(-Math.pow((t - peak) * 5.5, 2)) * 0.85 + Math.sin(i * 0.9 + seed) * 0.08;
        return Math.max(6, Math.min(100, 8 + v * 92));
    });
}
// Mel-Spectrogram: 시간 x 주파수 히트맵 (seed로 패턴 변화)
export function melCells(seed) {
    const cols = 30;
    const rows = 10;
    return Array.from({ length: cols * rows }, (_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const t = col / cols;
        const f = row / rows;
        const energy = Math.sin(t * 12 + f * 3 + seed) * 0.4 +
            Math.sin(t * 4 - f * 8 + seed * 2) * 0.35 +
            Math.cos(f * 10) * 0.25;
        return Math.max(0, Math.min(1, 0.5 + energy * 0.6 - f * 0.15));
    });
}
export function heatColor(v) {
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
        if (v >= p0 && v <= p1)
            return v - p0 < p1 - v ? c0 : c1;
    }
    return stops[stops.length - 1][1];
}
// MFCC: 음색 특징 벡터를 압축해 보여주는 작은 그리드
export function mfccCells(seed) {
    return Array.from({ length: 13 * 6 }, (_, i) => 0.18 + ((i * (seed + 5)) % 10) / 12);
}
