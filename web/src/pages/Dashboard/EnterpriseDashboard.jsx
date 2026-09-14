import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMonitoring } from '../../data/MonitoringContext';
import { fetchLatestAnalysis, fetchSimulatorStatus, startSimulator, stopSimulator } from '../../api/buzzApi';
import { SignalHeatmap, SignalLineChart } from '../AIAnalysis/LiveAnalysisCharts';
import './EnterpriseDashboard.css';
import './EnterpriseDashboardOverrides.css';
import { formatOperationalTime } from '../../utils/formatDateTime';

const DASHBOARD_MEL_PALETTE = [
  [241, 247, 255],
  [191, 219, 254],
  [103, 232, 249],
  [52, 211, 153],
  [250, 204, 21],
  [251, 146, 60],
];
const siteNum = (id) => Number(String(id).replace('site-', ''));
const formatUpdate = (value) => formatOperationalTime(value);
const classify = (site) => site.aiLabel === 'wasp' ? '말벌' : site.aiLabel === 'bee' ? '꿀벌' : '말벌 아님';

function Icon({ type }) {
  const paths = {
    site: <><path d="M4 20V8l8-5 8 5v12"/><path d="M9 20v-6h6v6"/></>,
    check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16.5 9"/></>,
    warning: <><path d="M10.3 3.7 2.4 18a2 2 0 0 0 1.8 3h15.6a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    door: <><path d="M6 3h12v18H6z"/><path d="M12 3v18M9 12h.01M15 12h.01"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[type]}</svg>;
}

function StatCard({ icon, label, value, sub, tone = 'default' }) {
  return <article className={`ed-stat ${tone}`}>
    <span className="ed-stat-icon"><Icon type={icon}/></span>
    <div><small>{label}</small><strong>{value}</strong>{sub && <em>{sub}</em>}</div>
  </article>;
}

function StatusPill({ site }) {
  const danger = site.status === 'danger';
  return <span className={`ed-pill ${danger ? 'danger' : 'normal'}`}><i/>{danger ? '위험' : '정상'}</span>;
}

function MiniHistory({ events, site }) {
  return <section className="ed-side-card ed-history-card">
    <div className="ed-card-head"><h3>최근 감지 이력</h3><span>실시간</span></div>
    <div className="ed-history-list">
      {events.filter((event) => event.siteId === site.id).slice(0, 5).map((event) => {
        const danger = event.kind === 'danger' || event.aiClassification === 'wasp';
        return <div className="ed-history-row" key={event.id}>
          <span className={`ed-history-dot ${danger ? 'danger' : ''}`}>{danger ? '!' : '✓'}</span>
          <div><strong>{danger ? '말벌 감지' : event.label}</strong><small>{event.siteName}</small></div>
          <time>{event.time}</time>
        </div>;
      })}
      {!events.some((event) => event.siteId === site.id) && <p className="ed-history-empty">이 사업장의 상태 변경 이력이 없습니다.</p>}
    </div>
  </section>;
}

export function EnterpriseDashboard() {
  const { sites, detectionEvents, setDoor } = useMonitoring();
  const [params, setParams] = useSearchParams();
  const requested = Number(params.get('site')) || siteNum(sites[0]?.id || 'site-1');
  const site = sites.find((item) => siteNum(item.id) === requested) || sites[0];
  const [analysis, setAnalysis] = useState(null);
  const [sim, setSim] = useState({ enabled: true, sites: {} });
  const [analysisError, setAnalysisError] = useState('');

  useEffect(() => {
    let dead = false;
    const load = () => fetchSimulatorStatus().then((value) => !dead && setSim(value)).catch(() => {});
    load();
    const timer = setInterval(load, 1800);
    return () => { dead = true; clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!site) return undefined;
    let dead = false;
    const load = async () => {
      try {
        const value = await fetchLatestAnalysis(siteNum(site.id));
        if (!dead) { setAnalysis(value); setAnalysisError(''); }
      } catch (error) {
        if (!dead) setAnalysisError(error?.message || '분석 데이터 대기 중');
      }
    };
    load();
    const timer = setInterval(load, 2000);
    return () => { dead = true; clearInterval(timer); };
  }, [site?.id]);

  const dangerCount = sites.filter((item) => item.status === 'danger').length;
  const normalCount = sites.length - dangerCount;
  const simulatorSite = site ? sim.sites?.[siteNum(site.id)] : null;
  const danger = site?.status === 'danger';
  const primaryPercent = site?.aiConfidence ?? 0;
  const latestWasp = site?.aiLabel === 'wasp';
  const toggleSimulator = async () => setSim(await (sim.enabled ? stopSimulator() : startSimulator()));
  const videoPath = site ? `${import.meta.env.BASE_URL}videos/site-${siteNum(site.id)}.mp4` : '';
  const recentUpdated = useMemo(() => formatUpdate(site?.lastAnalyzedAt), [site?.lastAnalyzedAt]);

  if (!site) return <div className="ed-page"><p>사업장 정보를 불러오는 중입니다.</p></div>;

  return <div className="ed-page">
    <section className="ed-summary-grid">
      <StatCard icon="site" label="사업장 수" value={sites.length} sub="개소" />
      <StatCard icon="check" label="정상" value={normalCount} sub="개소" tone="success" />
      <StatCard icon="warning" label="위험" value={dangerCount} sub="개소" tone="danger" />
      <StatCard icon="clock" label="최근 갱신" value={recentUpdated.time} sub={recentUpdated.date} tone="muted" />
    </section>

    <section className="ed-dashboard-grid">
      <div className="ed-main-column">
        <section className="ed-monitor-card">
          <div className="ed-monitor-head">
            <div><h2>{site.name} · 실시간 모니터링</h2><span className="ed-live-badge"><i/>실시간 수신 중</span></div>
            <div className="ed-site-tabs">
              {sites.map((item) => <button key={item.id} className={item.id === site.id ? 'active' : ''} onClick={() => setParams({ site: String(siteNum(item.id)) })}>사업장 {siteNum(item.id)}</button>)}
            </div>
          </div>

          <div className="ed-video-door-grid">
            <div className="ed-video-wrap">
              <video key={videoPath} src={videoPath} autoPlay muted loop playsInline preload="metadata" poster={`${import.meta.env.BASE_URL}images/hero.jpg`} />
              <span className="ed-video-live"><i/>LIVE</span>
              <div className="ed-video-caption"><b>{site.name}</b><span>AI 사운드 기반 모니터링</span></div>
            </div>
            <aside className="ed-door-panel">
              <p>개폐기 상태</p>
              <div className={`ed-door-state ${site.door === 'closed' ? 'closed' : ''}`}><span><Icon type="door"/></span><div><strong>{site.door === 'closed' ? '닫힘' : '열림'}</strong><em>{danger ? '자동 보호 중' : '정상'}</em></div></div>
              <small>{danger ? '말벌 위험 감지로 자동 보호 상태입니다.' : '현재 개폐기를 수동으로 제어할 수 있습니다.'}</small>
              <button onClick={() => setDoor(site.id, site.door === 'closed' ? 'open' : 'closed')}>{site.door === 'closed' ? '개폐기 열기' : '개폐기 닫기'}</button>
              <div className="ed-door-note">ⓘ 위험 감지 시 자동으로 개폐기가 닫힙니다.</div>
            </aside>
          </div>

          <div className="ed-chart-row">
            <article className="ed-chart-card">
              <header><div><b>실시간 음향 파형</b><span>샘플레이트 24 kHz · 2초</span></div><em>● 실시간</em></header>
              <div className="ed-chart-surface line">
                {analysis?.waveform ? <SignalLineChart xValues={analysis.waveform.time} yValues={analysis.waveform.amplitude} symmetric color="#20b86a" label="실시간 음향 파형"/> : <p>{analysisError || '분석 데이터 수신 대기 중'}</p>}
              </div>
            </article>
            <article className="ed-chart-card">
              <header><div><b>주파수 스펙트로그램</b><span>실시간 주파수 분석</span></div><em>dB 스케일</em></header>
              <div className="ed-chart-surface heat">
                {analysis?.spectrogram ? <SignalHeatmap matrix={analysis.spectrogram.db} palette={DASHBOARD_MEL_PALETTE} label="주파수 스펙트로그램"/> : <p>{analysisError || '분석 데이터 수신 대기 중'}</p>}
              </div>
            </article>
          </div>
        </section>
      </div>

      <aside className="ed-side-column">
        <section className={`ed-side-card ed-ai-card ${latestWasp ? 'danger' : ''}`}>
          <div className="ed-card-head"><h3>최근 AI 판정 결과</h3></div>
          <div className="ed-ai-result"><span>{latestWasp ? '!' : '✓'}</span><div><strong>{classify(site)} <b>{primaryPercent}%</b></strong><p>마지막으로 수신한 2초 음원의 이진분류 결과입니다.</p></div></div>
          <div className="ed-confidence"><i style={{ width: `${primaryPercent}%` }}/></div>
          <button className="ed-simulator-toggle" onClick={toggleSimulator}>{sim.enabled ? '시뮬레이션 일시정지' : '시뮬레이션 시작'}</button>
        </section>

        <section className={`ed-side-card ed-risk-card ${danger ? 'danger' : ''}`}>
          <div className="ed-card-head"><h3>현재 위험 상태</h3><StatusPill site={site}/></div>
          <div className="ed-risk-count"><strong>{danger ? '위험 유지 중' : `${site.consecutiveWasp} / ${site.dangerThreshold}`}</strong><span>{danger ? `정상 연속 ${site.consecutiveNonWasp} / ${site.normalThreshold}` : '연속 말벌 감지'}</span></div>
          <div className="ed-risk-progress"><i style={{width:`${Math.min(100,(danger ? site.consecutiveNonWasp/site.normalThreshold : site.consecutiveWasp/site.dangerThreshold)*100)}%`}}/></div>
          <p>{danger ? `정상 판정이 ${site.normalThreshold}회 연속되면 위험 상태가 해제됩니다. 문은 자동으로 열리지 않습니다.` : `말벌 판정이 ${site.dangerThreshold}회 연속되면 위험 상태로 전환되고 문이 닫힙니다.`}</p>
        </section>

        <MiniHistory events={detectionEvents} site={site}/>

      </aside>
    </section>

  </div>;
}
