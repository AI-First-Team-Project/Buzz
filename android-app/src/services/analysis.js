// FastAPI AnalysisResponse가 기준이다. 원본 응답은 0~1 확률, 초, Hz, dB를 유지한다.
// Android 기기에서는 localhost가 PC가 아니므로 VITE_API_BASE_URL에 PC 주소를 지정한다.
const API_BASE = (import.meta.env?.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");
export const labels = { wasp: "말벌", bee: "꿀벌", other: "Other" };

export function toAnalysisView(data) {
  const probability = value => Number.isFinite(value) && value >= 0 && value <= 1;
  const vector = value => Array.isArray(value) && value.length > 0 && value.every(Number.isFinite);
  const paired = (x, y) => vector(x) && vector(y) && x.length === y.length;
  const matrix = (rows, columns) => Array.isArray(rows) && rows.length > 0 && rows.every(row => vector(row) && row.length === columns);
  if (!data || !labels[data.prediction?.label] ||
      !probability(data.prediction.confidence) ||
      !Object.keys(labels).every(key => probability(data.prediction.probabilities?.[key])) ||
      !paired(data.waveform?.time, data.waveform?.amplitude) ||
      !paired(data.fft?.frequency, data.fft?.magnitudeDb) ||
      !vector(data.spectrogram?.time) || !vector(data.spectrogram?.frequency) ||
      !matrix(data.spectrogram?.db, data.spectrogram.time.length) ||
      data.spectrogram.db.length !== data.spectrogram.frequency.length ||
      !vector(data.mfcc?.time) || !matrix(data.mfcc?.coefficients, data.mfcc.time.length) ||
      !Number.isFinite(data.audio?.duration) || !Number.isFinite(data.audio?.sampleRate) ||
      typeof data.audio?.fileName !== "string" || typeof data.meta?.modelName !== "string" ||
      !Number.isFinite(Date.parse(data.meta?.timestamp))) {
    throw new Error("서버 분석 응답 형식이 올바르지 않습니다.");
  }
  // 한국어/백분율/시간 문자열은 화면 경계에서만 변환한다. 그래프는 원본 수치 사용.
  return {
    raw: data,
    main: labels[data.prediction.label],
    confidence: (data.prediction.confidence * 100).toFixed(1),
    rows: Object.entries(labels).map(([key, label]) => [label, (data.prediction.probabilities[key] * 100).toFixed(1)]),
    fileName: data.audio.fileName,
    duration: `${data.audio.duration.toFixed(1)}초`,
    analyzedAt: new Date(data.meta.timestamp).toLocaleTimeString("ko-KR", { hour12: false }),
    isMock: data.meta.modelName === "mock-placeholder",
  };
}

export async function uploadAnalysis(file, signal) {
  const body = new FormData();
  body.append("file", file);
  // multipart boundary는 브라우저가 생성한다. Content-Type을 직접 지정하지 않는다.
  const response = await fetch(`${API_BASE}/api/test/analyze`, { method: "POST", body, signal });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof data?.detail === "string" ? data.detail : `분석 요청 실패 (${response.status})`);
  return toAnalysisView(data);
}
