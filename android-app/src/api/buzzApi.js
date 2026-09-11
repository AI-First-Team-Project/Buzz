const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const isNativeAndroid = typeof window !== "undefined" &&
  Boolean(window.Capacitor?.isNativePlatform?.());
const defaultBaseUrl = isNativeAndroid
  ? "http://10.0.2.2:8000"
  : "http://localhost:8000";

export const API_BASE_URL = (configuredBaseUrl || defaultBaseUrl).replace(/\/$/, "");

async function readError(response) {
  try {
    const body = await response.json();
    return body.detail || body.message || `요청에 실패했습니다. (${response.status})`;
  } catch {
    return `요청에 실패했습니다. (${response.status})`;
  }
}

export async function analyzeTestAudio(file) {
  const form = new FormData();
  form.append("file", file);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/test/analyze`, {
      method: "POST",
      body: form,
    });
  } catch {
    throw new Error(`AI 서버에 연결할 수 없습니다. 서버 주소: ${API_BASE_URL}`);
  }

  if (!response.ok) throw new Error(await readError(response));

  const data = await response.json();
  if (
    !data?.prediction?.probabilities ||
    !data?.waveform?.time ||
    !data?.fft?.frequency ||
    !data?.spectrogram?.db ||
    !data?.mfcc?.coefficients
  ) {
    throw new Error("서버 응답 형식이 앱의 분석 데이터 계약과 일치하지 않습니다.");
  }
  return data;
}

export async function fetchSiteStatuses() {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/status`);
  } catch {
    throw new Error(`AI 서버에 연결할 수 없습니다. 서버 주소: ${API_BASE_URL}`);
  }

  if (!response.ok) throw new Error(await readError(response));

  const data = await response.json();
  if (!Array.isArray(data) || data.some((site) => !Number.isInteger(site?.site_id))) {
    throw new Error("사업장 상태 응답 형식이 올바르지 않습니다.");
  }
  return data;
}

export async function fetchHistory(limit = 500) {
  let historyResponse;
  let analysisResponse;
  try {
    [historyResponse, analysisResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/api/history?limit=${limit}`),
      fetch(`${API_BASE_URL}/api/analysis-logs?limit=${limit}`),
    ]);
  } catch {
    throw new Error(`AI 서버에 연결할 수 없습니다. 서버 주소: ${API_BASE_URL}`);
  }
  if (!historyResponse.ok) throw new Error(await readError(historyResponse));
  if (!analysisResponse.ok) throw new Error(await readError(analysisResponse));

  const [history, analysisLogs] = await Promise.all([
    historyResponse.json(),
    analysisResponse.json(),
  ]);
  if (!Array.isArray(history) || !Array.isArray(analysisLogs)) {
    throw new Error("이력 응답 형식이 올바르지 않습니다.");
  }

  const persistedPredictions = analysisLogs.map((item) => ({
    id: `analysis-${item.analysis_id}`,
    type: item.prediction === "wasp" ? "danger" : "recovery",
    site_id: item.site_id,
    site_name: item.site_id ? `사업장 ${item.site_id}` : "사용자 테스트",
    title: item.analysis_type === "test" ? "사용자 음원 분석" : "AI 음원 분석",
    timestamp: item.detected_at,
    result: item.prediction,
    confidence: item.confidence,
    door_status: "OPEN",
    action: "analysis",
    analysis_id: item.analysis_id,
  }));

  return [...history, ...persistedPredictions]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
}

export async function commandDoor(siteId, action) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/door/${siteId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
  } catch {
    throw new Error(`AI 서버에 연결할 수 없습니다. 서버 주소: ${API_BASE_URL}`);
  }
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export async function fetchLatestAnalysis(siteId) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/analysis/latest/${siteId}`);
  } catch {
    throw new Error(`AI 서버에 연결할 수 없습니다. 서버 주소: ${API_BASE_URL}`);
  }
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(await readError(response));
  }
  const data = await response.json();
  if (!data?.waveform?.amplitude || !data?.fft?.magnitudeDb ||
      !data?.spectrogram?.db) {
    throw new Error("최신 분석 그래프 응답 형식이 올바르지 않습니다.");
  }
  return data;
}
