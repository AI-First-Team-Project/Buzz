import { useEffect, useMemo, useState } from 'react';
import BottomNav from './BottomNavV2.jsx';
import { MelSpectrogram, WaveformChart } from './AudioAnalysisCharts.jsx';
import { commandDoor, fetchHistory, fetchLatestAnalysis, fetchSiteStatuses } from '../api/buzzApi';
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

const formatTime = (value) => {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime())
    ? date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    : '대기 중';
};

export default function EnterpriseMobileHome({ setPage }) {
  const [sites, setSites] = useState([]);
  const [selectedId, setSelectedId] = useState(1);
  const [history, setHistory] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');
  const site = useMemo(() => sites.find((item) => item.id === selectedId) || sites[0], [sites, selectedId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [siteResult, historyResult] = await Promise.allSettled([fetchSiteStatuses(), fetchHistory(20)]);
      if (cancelled) return;
      if (siteResult.status === 'fulfilled') {
        setSites(siteResult.value.map(mapSite));
        setError('');
      } else {
        setError(siteResult.reason?.message || '서버 연결을 확인해 주세요.');
      }
      if (historyResult.status === 'fulfilled') setHistory(historyResult.value);
    };
    void load();
    const timer = window.setInterval(load, 2000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!site) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        const value = await fetchLatestAnalysis(site.id);
        if (!cancelled) setAnalysis(value);
      } catch {
        if (!cancelled) setAnalysis(null);
      }
    };
    void load();
    const timer = window.setInterval(load, 2000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [site?.id]);

  const toggleDoor = async () => {
    if (!site) return;
    const action = site.door === 'CLOSED' ? 'open' : 'close';
    try {
      await commandDoor(site.id, action);
      setSites((items) => items.map((item) => item.id === site.id ? { ...item, door: action === 'open' ? 'OPEN' : 'CLOSED' } : item));
    } catch (reason) {
      setError(reason?.message || '개폐기를 제어하지 못했습니다.');
    }
  };

  if (!site) return <div className="em-page"><main className="em-loading">사업장 정보를 불러오는 중입니다.</main><BottomNav currentPage="home" setPage={setPage}/></div>;

  const dangerCount = sites.filter((item) => item.danger).length;
  const normalCount = sites.length - dangerCount;
  const waspPct = site.label === 'wasp' ? site.confidence : Math.max(1, Math.round((100 - site.confidence) * 0.35));
  const otherPct = Math.max(0, 100 - site.confidence - waspPct);
  const normalPct = Math.max(0, 100 - waspPct - otherPct);
  const recentEvents = history.filter((event) => !event.site_id || event.site_id === site.id).slice(0, 5);

  return <div className="em-page"><main>
    <header className="em-header"><div><small>BUZZ</small><h1>실시간 사업장 모니터링</h1></div><span className={site.danger ? 'danger' : 'normal'}>{site.danger ? '위험' : '정상'}</span></header>

    <section className="em-summary-grid">
      <article><small>사업장 수</small><strong>{sites.length}</strong><span>개소</span></article>
      <article className="success"><small>정상</small><strong>{normalCount}</strong><span>개소</span></article>
      <article className="danger"><small>위험</small><strong>{dangerCount}</strong><span>개소</span></article>
      <article><small>최근 갱신</small><strong className="time">{formatTime(site.updatedAt)}</strong></article>
    </section>

    <nav className="em-site-tabs" aria-label="사업장 선택">{sites.map((item) => <button key={item.id} className={item.id === site.id ? 'active' : ''} onClick={() => setSelectedId(item.id)}>사업장 {item.id}</button>)}</nav>

    {site.danger && <section className="em-alert"><strong>위험 상태를 확인해 주세요.</strong><span>{site.name}에서 말벌 신호가 감지되었습니다.</span></section>}

    <section className="em-monitor-card">
      <div className="em-monitor-title"><div><h2>{site.name}</h2><small><i/> 실시간 수신 중</small></div></div>
      <section className="em-video"><video key={site.id} src={`${import.meta.env.BASE_URL}videos/site-${site.id}.mp4`} poster={`${import.meta.env.BASE_URL}images/hero.jpg`} autoPlay muted loop playsInline/><span>● LIVE</span><b>{site.name} · AI 사운드 기반 모니터링</b></section>
      <section className="em-card em-door"><div><small>개폐기 상태</small><h2>{site.door === 'CLOSED' ? '닫힘' : '열림'}</h2><p>{site.danger ? '자동 보호 상태입니다.' : '수동으로 제어할 수 있습니다.'}</p></div><button onClick={toggleDoor}>{site.door === 'CLOSED' ? '개폐기 열기' : '개폐기 닫기'}</button></section>
      <div className="em-chart-grid">
        <article><header><b>실시간 음향 파형</b><span>24 kHz · 2초</span></header><div>{analysis?.waveform ? <WaveformChart data={analysis.waveform}/> : <p>분석 데이터 수신 대기 중</p>}</div></article>
        <article><header><b>주파수 스펙트로그램</b><span>dB 스케일</span></header><div>{analysis?.spectrogram ? <MelSpectrogram data={analysis.spectrogram}/> : <p>분석 데이터 수신 대기 중</p>}</div></article>
      </div>
    </section>

    <section className={`em-card em-ai ${site.danger ? 'danger' : ''}`}>
      <header><h2>최근 AI 판정 결과</h2></header>
      <div className="em-ai-result"><span>{site.danger ? '!' : '✓'}</span><div><strong>{site.label === 'wasp' ? '말벌' : '말벌 아님'} <b>{site.confidence}%</b></strong><p>{site.danger ? '말벌 특징이 높은 음향 패턴입니다.' : '현재 소리는 정상적인 활동으로 판단됩니다.'}</p></div></div>
      <div className="em-confidence"><i style={{ width: `${site.confidence}%` }}/></div>
      <div className="em-probs"><span>말벌 아님 <b>{site.danger ? normalPct : site.confidence}%</b></span><span>말벌 의심 <b>{waspPct}%</b></span><span>기타 소리 <b>{otherPct}%</b></span></div>
    </section>

    <section className="em-card em-history"><header><h2>최근 감지 이력</h2><button onClick={() => setPage('history')}>전체 보기</button></header>{recentEvents.length ? recentEvents.map((event) => <div key={event.id}><i className={event.type === 'danger' || event.result === 'wasp' ? 'danger' : ''}>{event.type === 'danger' || event.result === 'wasp' ? '!' : '✓'}</i><span><b>{event.title || (event.result === 'wasp' ? '말벌 감지' : '정상 감지')}</b><small>{event.site_name}</small></span><time>{formatTime(event.timestamp)}</time></div>) : <p>아직 감지 이력이 없습니다.</p>}</section>

    {error && <p className="em-error">{error}</p>}
    <section className="em-sites"><header><h2>전체 사업장 현황</h2><span>총 {sites.length}개 사업장</span></header><div>{sites.map((item) => <button key={item.id} className={item.id === site.id ? 'active' : ''} onClick={() => setSelectedId(item.id)}><img src={`${import.meta.env.BASE_URL}images/honeybee.jpg`} alt="꿀벌과 벌집"/><span>{item.name}<b className={item.danger ? 'danger' : 'normal'}>{item.danger ? '위험' : '정상'}</b><small>{item.door === 'CLOSED' ? '닫힘' : '열림'} · {formatTime(item.updatedAt)}</small></span></button>)}</div></section>
  </main><BottomNav currentPage="home" setPage={setPage}/></div>;
}
