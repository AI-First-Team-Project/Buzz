import { useEffect, useMemo, useState } from 'react';
import BottomNav from './BottomNav';
import { commandDoor, fetchSiteStatuses } from '../api/buzzApi';
import './EnterpriseMobileHome.css';
import './EnterpriseMobileB2B.css';
import './MobileOverflow.css';

const mapSite = (site) => ({
  id: site.site_id,
  name: site.site_name,
  danger: site.status === 'DANGER',
  label: site.detected_class,
  confidence: Math.round((site.confidence || 0) * 100),
  door: site.door_status,
  updatedAt: site.last_analysis_time,
});

function formatTime(value) {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime())
    ? date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    : '대기 중';
}

export default function EnterpriseMobileHome({ setPage }) {
  const [sites, setSites] = useState([]);
  const [selectedId, setSelectedId] = useState(1);
  const [error, setError] = useState('');
  const site = useMemo(() => sites.find((item) => item.id === selectedId) || sites[0], [sites, selectedId]);

  useEffect(() => {
    let cancelled = false;
    const load = () => fetchSiteStatuses().then((value) => {
      if (!cancelled) { setSites(value.map(mapSite)); setError(''); }
    }).catch((reason) => { if (!cancelled) setError(reason?.message || '서버 연결을 확인해 주세요.'); });
    load();
    const timer = setInterval(load, 2000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  const toggleDoor = async () => {
    if (!site) return;
    const action = site.door === 'CLOSED' ? 'open' : 'close';
    try {
      await commandDoor(site.id, action);
      setSites((items) => items.map((item) => item.id === site.id ? { ...item, door: action === 'open' ? 'OPEN' : 'CLOSED' } : item));
    } catch (reason) { setError(reason?.message || '개폐기를 제어하지 못했습니다.'); }
  };

  if (!site) return <div className="em-page"><main className="em-loading">사업장 정보를 불러오는 중입니다.</main><BottomNav currentPage="home" setPage={setPage}/></div>;
  const wasp = site.label === 'wasp' ? site.confidence : Math.max(0, 100 - site.confidence);

  return <div className="em-page"><main>
    <header className="em-header"><div><small>BUZZ</small><h1>{site.name}</h1></div><span className={site.danger ? 'danger' : 'normal'}>{site.danger ? '위험' : '정상'}</span></header>
    <nav className="em-site-tabs" aria-label="사업장 선택">{sites.map((item) => <button key={item.id} className={item.id === site.id ? 'active' : ''} onClick={() => setSelectedId(item.id)}>사업장 {item.id}</button>)}</nav>
    {site.danger && <section className="em-alert"><strong>말벌 위험이 감지되었습니다.</strong><span>개폐기 상태와 현장을 확인해 주세요.</span></section>}
    <section className="em-video"><video key={site.id} src={`${import.meta.env.BASE_URL}videos/site-${site.id}.mp4`} poster={`${import.meta.env.BASE_URL}images/hero.jpg`} autoPlay muted loop playsInline/><span>LIVE</span></section>
    <section className={`em-card em-ai ${site.danger ? 'danger' : ''}`}><div><small>현재 AI 판정</small><h2>{site.label === 'wasp' ? '말벌' : '정상'}</h2></div><strong>{site.confidence}%</strong><div className="em-probs"><span>말벌 아님 <b>{100 - wasp}%</b></span><span>말벌 <b>{wasp}%</b></span></div></section>
    <section className="em-card em-door"><div><small>개폐기 상태</small><h2>{site.door === 'CLOSED' ? '닫힘' : '열림'}</h2></div><button onClick={toggleDoor}>{site.door === 'CLOSED' ? '문 열기' : '문 닫기'}</button></section>
    {error && <p className="em-error">{error}</p>}
    <section className="em-sites"><h2>전체 사업장</h2><div>{sites.map((item) => <button key={item.id} onClick={() => setSelectedId(item.id)}><span>{item.name}</span><b className={item.danger ? 'danger' : 'normal'}>{item.danger ? '위험' : '정상'}</b><small>{item.door === 'CLOSED' ? '닫힘' : '열림'} · {formatTime(item.updatedAt)}</small></button>)}</div></section>
  </main><BottomNav currentPage="home" setPage={setPage}/></div>;
}
