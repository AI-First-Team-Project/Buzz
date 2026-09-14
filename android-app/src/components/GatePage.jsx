import { useEffect, useMemo, useState } from 'react';
import { commandDoor, fetchSiteStatuses } from '../api/buzzApi';
import BottomNav from './BottomNavV2.jsx';

const formatTime = (value) => {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime())
    ? date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    : '분석 대기 중';
};

export default function GatePage({ setPage }) {
  const [sites, setSites] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const selected = useMemo(() => sites.find((site) => site.site_id === selectedId) || sites[0], [sites, selectedId]);

  const load = async ({ quiet = false } = {}) => {
    try {
      const rows = await fetchSiteStatuses();
      setSites(rows);
      setSelectedId((current) => rows.some((site) => site.site_id === current) ? current : rows[0]?.site_id ?? null);
      if (!quiet) setMessage('');
    } catch (reason) {
      setMessage(reason?.message || '개폐기 상태를 불러오지 못했습니다.');
    }
  };

  useEffect(() => {
    let active = true;
    const refresh = async () => { if (active) await load({ quiet: true }); };
    void load();
    const timer = window.setInterval(refresh, 2000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const applyAction = async (siteIds, action) => {
    setBusy(true);
    setMessage('');
    try {
      const results = await Promise.allSettled(siteIds.map((siteId) => commandDoor(siteId, action)));
      const failed = results.filter((result) => result.status === 'rejected');
      await load({ quiet: true });
      if (failed.length) throw failed[0].reason;
      setMessage(`${siteIds.length > 1 ? '전체 사업장' : selected?.site_name || '사업장'} 개폐기를 ${action === 'open' ? '열었습니다.' : '닫았습니다.'}`);
      setConfirm(null);
    } catch (reason) {
      setMessage(reason?.message || '개폐기를 제어하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const openCount = sites.filter((site) => site.door_status === 'OPEN').length;
  const closedCount = sites.length - openCount;

  return <div className="min-h-screen bg-[#0A0E1A] text-white pb-[calc(9rem+env(safe-area-inset-bottom))]">
    <header className="px-5 pt-6 pb-4 flex items-start justify-between"><div><p className="text-slate-600 text-[11px] font-semibold tracking-widest uppercase">Gate Control</p><h1 className="text-xl font-bold">개폐기 상태</h1></div><div className="flex gap-2"><span className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 px-3 py-2 text-emerald-400 text-xs font-bold">열림 {openCount}</span><span className="rounded-xl bg-red-500/10 border border-red-500/25 px-3 py-2 text-red-400 text-xs font-bold">닫힘 {closedCount}</span></div></header>
    {message && <p className="mx-5 mb-4 rounded-xl border border-white/10 bg-[#13192B] px-4 py-3 text-sm text-slate-200">{message}</p>}
    <nav className="mx-5 mb-4 flex gap-2 overflow-x-auto" aria-label="사업장 선택">{sites.map((site) => <button key={site.site_id} onClick={() => setSelectedId(site.site_id)} className={`shrink-0 rounded-xl px-4 py-3 text-sm font-bold border ${selected?.site_id === site.site_id ? 'bg-[#1A2236] border-blue-500/50 text-white' : 'bg-[#0D1220] border-white/5 text-slate-500'}`}>{site.site_name}</button>)}</nav>
    {!selected ? <p className="px-5 text-slate-400">사업장 정보를 불러오는 중입니다.</p> : <main className="px-5 space-y-4">
      <section className={`rounded-3xl border p-5 ${selected.door_status === 'CLOSED' ? 'bg-red-500/5 border-red-500/30' : 'bg-emerald-500/5 border-emerald-500/30'}`}><div className="flex items-start justify-between gap-4"><div><p className="text-slate-500 text-xs">{selected.site_name}</p><h2 className="mt-1 text-2xl font-bold">{selected.door_status === 'CLOSED' ? '닫힘' : '열림'}</h2><p className="mt-2 text-sm text-slate-400">{selected.status === 'DANGER' ? '말벌 감지로 위험 상태입니다.' : '현재 정상 상태입니다.'}</p></div><span className={`rounded-xl px-3 py-1.5 text-xs font-bold ${selected.status === 'DANGER' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{selected.status === 'DANGER' ? '위험' : '정상'}</span></div><dl className="mt-5 rounded-2xl bg-[#0A0E1A] px-4 py-3 text-xs"><div className="flex justify-between"><dt className="text-slate-600">최근 분석</dt><dd className="text-slate-300">{formatTime(selected.last_analysis_time)}</dd></div><div className="mt-2 flex justify-between"><dt className="text-slate-600">서버 상태</dt><dd className="text-slate-300">{selected.worker_status === 'RUNNING' ? '수신 중' : '대기 중'}</dd></div></dl><button disabled={busy} onClick={() => setConfirm({ siteIds: [selected.site_id], action: selected.door_status === 'CLOSED' ? 'open' : 'close' })} className={`mt-4 w-full rounded-2xl py-3.5 font-bold disabled:opacity-50 ${selected.door_status === 'CLOSED' ? 'bg-emerald-500' : 'bg-red-500'}`}>{selected.door_status === 'CLOSED' ? '개폐기 열기' : '개폐기 닫기'}</button></section>
      <section className="grid grid-cols-2 gap-3"><button disabled={busy || !sites.length} onClick={() => setConfirm({ siteIds: sites.map((site) => site.site_id), action: 'open' })} className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 py-3 text-sm font-bold text-emerald-400 disabled:opacity-50">전체 개방</button><button disabled={busy || !sites.length} onClick={() => setConfirm({ siteIds: sites.map((site) => site.site_id), action: 'close' })} className="rounded-2xl border border-red-500/30 bg-red-500/10 py-3 text-sm font-bold text-red-400 disabled:opacity-50">전체 차단</button></section>
    </main>}
    {confirm && <div className="fixed inset-0 z-[60] flex items-end bg-black/60 px-5 pb-[calc(6rem+env(safe-area-inset-bottom))]" onClick={() => !busy && setConfirm(null)}><div className="w-full rounded-3xl border border-white/10 bg-[#13192B] p-6" onClick={(event) => event.stopPropagation()}><h2 className="text-center text-lg font-bold">개폐기를 {confirm.action === 'open' ? '여시겠습니까?' : '닫으시겠습니까?'}</h2><p className="mt-2 text-center text-sm text-slate-400">서버와 실제 저장 상태에 즉시 반영됩니다.</p><div className="mt-6 flex gap-3"><button disabled={busy} onClick={() => setConfirm(null)} className="flex-1 rounded-xl bg-slate-800 py-3 text-sm font-bold">취소</button><button disabled={busy} onClick={() => applyAction(confirm.siteIds, confirm.action)} className={`flex-1 rounded-xl py-3 text-sm font-bold ${confirm.action === 'open' ? 'bg-emerald-500' : 'bg-red-500'}`}>{busy ? '처리 중…' : '확인'}</button></div></div></div>}
    <BottomNav currentPage="gate" setPage={setPage}/>
  </div>;
}
