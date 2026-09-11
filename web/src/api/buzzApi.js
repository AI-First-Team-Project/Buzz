const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const defaultBaseUrl = import.meta.env.DEV ? 'http://localhost:8000' : '';
export const API_BASE_URL = (configuredBaseUrl || defaultBaseUrl).replace(/\/$/, '');

async function request(path, options = {}) {
  let response;
  try { response = await fetch(`${API_BASE_URL}${path}`, options); }
  catch { throw new Error(`AI 서버에 연결할 수 없습니다. 서버 주소: ${API_BASE_URL || 'Docker proxy'}`); }
  if (!response.ok) {
    let message = `요청에 실패했습니다. (${response.status})`;
    try { const body = await response.json(); message = body.detail || body.message || message; } catch {}
    throw new Error(message);
  }
  return response.json();
}
export async function analyzeTestAudio(file) { const form=new FormData(); form.append('file',file); return request('/api/test/analyze',{method:'POST',body:form}); }
export async function fetchSiteStatuses() { const data=await request('/api/status'); if(!Array.isArray(data)) throw new Error('사업장 상태 응답 형식이 올바르지 않습니다.'); return data; }
export async function fetchHistory(limit=500) { return request(`/api/history?limit=${limit}`); }
export async function fetchAnalysisLogs(limit=100) { return request(`/api/analysis-logs?limit=${limit}`); }
export async function commandDoor(siteId, action) { return request(`/api/door/${siteId}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})}); }
export async function fetchLatestAnalysis(siteId) { try{return await request(`/api/analysis/latest/${siteId}`)}catch(e){if(String(e.message).includes('(404)')||String(e.message).includes('아직 수신')) return null; throw e;} }
export async function fetchSimulatorStatus(){return request('/api/simulator/status')}
export async function startSimulator(){return request('/api/simulator/start',{method:'POST'})}
export async function stopSimulator(){return request('/api/simulator/stop',{method:'POST'})}
export async function analyzeFullTestAudio(file,siteId=1){const form=new FormData();form.append('file',file);form.append('site_id',String(siteId));return request('/api/test/analyze-full',{method:'POST',body:form})}
export async function fetchTestHistory(){return request('/api/test/history')}
