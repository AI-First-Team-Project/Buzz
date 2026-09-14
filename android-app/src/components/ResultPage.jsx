import { useEffect, useMemo, useState } from 'react';
import { fetchAnalysisLogs, fetchSiteStatuses } from '../api/buzzApi';
import BottomNav from './BottomNavV2.jsx';

const formatDateTime = (value) => {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? date.toLocaleString('ko-KR') : '시간 정보 없음';
};

export default function ResultPage({ setPage }) {
  const [results, setResults] = useState([]);
  const [sites, setSites] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState('');
  const selected = useMemo(() => results.find((item) => item.id === selectedId) || results[0], [results, selectedId]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [logResult, siteResult] = await Promise.allSettled([fetchAnalysisLogs(20), fetchSiteStatuses()]);
      if (!active) return;
      if (logResult.status === 'fulfilled') {
        setResults(logResult.value);
        setSelectedId((current) => logResult.value.some((item) => item.id === current) ? current : logResult.value[0]?.id ?? null);
        setError('');
      } else setError(logResult.reason?.message || '탐지 결과를 불러오지 못했습니다.');
      if (siteResult.status === 'fulfilled') setSites(siteResult.value);
    };
    void load();
    const timer = window.setInterval(load, 2000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const site = sites.find((item) => item.site_id === selected?.site_id);
  const isWasp = selected?.prediction === 'wasp';
  const confidence = Math.round(Number(selected?.confidence || 0) * 100);
  const dangerCount = results.filter((item) => item.prediction === 'wasp').length;

  return <div className="min-h-screen bg-[#0A0E1A] text-white pb-[calc(9rem+env(safe-area-inset-bottom))]">
    <header className="px-5 pt-6 pb-4"><p className="text-slate-600 text-[11px] font-semibold tracking-widest uppercase">Detection Result</p><div className="flex items-center justify-between"><h1 className="text-xl font-bold">탐지 결과</h1><span className="rounded-lg border border-red-500/25 bg-red-500/10 px-2.5 py-1 text-[11px] font-bold text-red-400">최근 말벌 {dangerCount}건</span></div></header>
    {error && <p className="mx-5 mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
    <nav className="mx-5 mb-4 flex gap-2 overflow-x-auto" aria-label="최근 탐지 결과">{results.map((item) => <button key={item.id} onClick={() => setSelectedId(item.id)} className={`w-24 shrink-0 rounded-xl border p-3 text-left ${selected?.id === item.id ? 'border-blue-500/50 bg-[#1A2236]' : 'border-white/5 bg-[#0D1220]'}`}><b className="block truncate text-xs">{item.site_name || `사업장 ${item.site_id}`}</b><span className={`mt-2 block text-[10px] font-bold ${item.prediction === 'wasp' ? 'text-red-400' : 'text-emerald-400'}`}>{item.prediction === 'wasp' ? '말벌' : '정상'}</span></button>)}</nav>
    {!selected ? <p className="px-5 text-slate-400">표시할 실제 분석 결과가 없습니다.</p> : <main className="px-5 space-y-4">
      <section className={`rounded-3xl border p-5 ${isWasp ? 'border-red-500/40 bg-red-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}><div className="flex items-start justify-between"><div><p className="text-sm text-slate-400">{selected.site_name || `사업장 ${selected.site_id}`}</p><h2 className={`mt-1 text-2xl font-bold ${isWasp ? 'text-red-400' : 'text-emerald-400'}`}>{isWasp ? '말벌 감지' : '말벌 미감지'}</h2></div><strong className="text-2xl">{confidence}%</strong></div><p className="mt-3 text-sm text-slate-400">{formatDateTime(selected.detected_at)}</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-[#0A0E1A]"><i className={`block h-full ${isWasp ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${confidence}%` }}/></div></section>
      <section className="overflow-hidden rounded-2xl border border-white/5 bg-[#13192B]"><h2 className="border-b border-white/5 px-4 py-3 text-sm font-bold">탐지 상세</h2><dl className="divide-y divide-white/5 text-sm"><div className="flex justify-between px-4 py-3"><dt className="text-slate-500">분석 종류</dt><dd>{selected.analysis_type || '-'}</dd></div><div className="flex justify-between px-4 py-3"><dt className="text-slate-500">말벌 확률</dt><dd>{Math.round(Number(selected.wasp_probability || 0) * 100)}%</dd></div><div className="flex justify-between px-4 py-3"><dt className="text-slate-500">모델</dt><dd>{selected.model_name || '-'}</dd></div></dl></section>
      <section className="overflow-hidden rounded-2xl border border-white/5 bg-[#13192B]"><div className="flex items-center justify-between border-b border-white/5 px-4 py-3"><h2 className="text-sm font-bold">개폐기 현재 상태</h2><button onClick={() => setPage('gate')} className="text-xs font-bold text-amber-400">제어 화면 →</button></div><div className="flex items-center justify-between px-4 py-4"><div><b>{site?.site_name || selected.site_name}</b><p className="mt-1 text-xs text-slate-500">서버에서 조회한 현재 상태</p></div><span className={`rounded-xl px-3 py-1.5 text-xs font-bold ${site?.door_status === 'CLOSED' ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}`}>{site ? (site.door_status === 'CLOSED' ? '닫힘' : '열림') : '조회 대기'}</span></div></section>
      {isWasp && <section className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4"><h2 className="text-sm font-bold">대응 절차</h2><ol className="mt-3 space-y-2 text-sm text-slate-300"><li>1. 현장 접근을 제한합니다.</li><li>2. 보호 장비 없이 출동하지 않습니다.</li><li>3. 전문 방역 업체에 연락합니다.</li></ol><p className="mt-4 text-xs text-slate-500">긴급 알림은 서버가 생성한 실제 알림만 알림 센터에 표시됩니다.</p></section>}
    </main>}
    <BottomNav currentPage="result" setPage={setPage}/>
  </div>;
}
