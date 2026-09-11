import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMonitoring } from '../../data/MonitoringContext';
import { fetchLatestAnalysis, fetchSimulatorStatus, startSimulator, stopSimulator } from '../../api/buzzApi';
import { SignalHeatmap, SignalLineChart, MEL_PALETTE } from '../AIAnalysis/LiveAnalysisCharts';
import './EnterpriseDashboard.css';

const MFCC_PALETTE=[[30,58,138],[59,130,246],[248,250,252],[239,68,68],[153,27,27]];
const pct=v=>`${(Number(v||0)*100).toFixed(1)}%`;
const siteNum=id=>Number(String(id).replace('site-',''));

function StatusPill({site}) { const danger=site.status==='danger'; return <span className={`ed-pill ${danger?'danger':'normal'}`}>{danger?'위험':'정상'}</span>; }
function SiteCard({site, active, onClick, sim}) {
  const error=sim?.state==='ERROR';
  return <button className={`ed-site-card ${active?'active':''} ${site.status==='danger'?'danger':''}`} onClick={onClick}>
    <div className="ed-site-card-head"><div><small>WORKSITE {siteNum(site.id)}</small><h3>{site.name}</h3></div><StatusPill site={site}/></div>
    <div className="ed-metrics"><div><span>AI 판정</span><b>{error?'분석 오류':site.aiLabel==='wasp'?'말벌':'말벌 아님'}</b></div><div><span>신뢰도</span><b>{site.aiConfidence}%</b></div><div><span>출입문</span><b>{site.door==='closed'?'닫힘':'열림'}</b></div></div>
    <div className="ed-simline"><span className={`ed-dot ${error?'error':sim?.state==='RUNNING'?'live':''}`}/><span>{sim?.current_file||'음원 대기'}</span>{Number.isInteger(sim?.chunk_index)&&<b>#{sim.chunk_index+1}</b>}</div>
  </button>;
}
function Detail({site, sim}) {
  const [analysis,setAnalysis]=useState(null); const [error,setError]=useState('');
  useEffect(()=>{ let dead=false; const load=async()=>{try{const a=await fetchLatestAnalysis(siteNum(site.id)); if(!dead){setAnalysis(a);setError('');}}catch(e){if(!dead){setError(e.message);}}}; load(); const t=setInterval(load,2000); return()=>{dead=true;clearInterval(t)};},[site.id]);
  return <section className="ed-detail">
    <div className="ed-detail-top"><div><p>REAL-TIME MONITORING</p><h2>{site.name}</h2><span>{sim?.current_file||'현재 입력 파일 없음'} {Number.isInteger(sim?.chunk_index)?`· chunk ${sim.chunk_index+1} · ${sim.chunk_start}~${sim.chunk_end}초`:''}</span></div><div className="ed-live-result"><StatusPill site={site}/><strong>{site.aiLabel==='wasp'?'말벌':'말벌 아님'}</strong><b>{site.aiConfidence}%</b></div></div>
    {sim?.state==='ERROR' && <div className="ed-error">FastAPI 분석 오류입니다. 이 chunk는 normal/no_wasp로 대체되지 않았습니다.</div>}
    {!analysis ? <div className="ed-empty">{error||'실제 2초 chunk 분석 데이터를 기다리는 중입니다.'}</div> : <div className="ed-chart-grid">
      <article><header><b>Waveplot</b><span>현재 2초 chunk</span></header><SignalLineChart xValues={analysis.waveform.time} yValues={analysis.waveform.amplitude} symmetric color="#2563eb" label="Waveplot"/></article>
      <article><header><b>FFT Spectrum</b><span>dB</span></header><SignalLineChart xValues={analysis.fft.frequency} yValues={analysis.fft.magnitudeDb} color="#0ea5e9" label="FFT"/></article>
      <article className="wide"><header><b>Mel-Spectrogram</b><span>현재 AI 입력과 동일 chunk</span></header><SignalHeatmap matrix={analysis.spectrogram.db} palette={MEL_PALETTE} label="Mel"/></article>
      <article className="wide"><header><b>MFCC</b><span>현재 2초 chunk</span></header><SignalHeatmap matrix={analysis.mfcc?.coefficients||[]} palette={MFCC_PALETTE} symmetric label="MFCC"/></article>
    </div>}
    <div className="ed-log"><h3>시뮬레이터 로그</h3>{(sim?.logs||[]).slice(0,8).map((l,i)=><div key={i}><time>{new Date(l.time).toLocaleTimeString('ko-KR',{hour12:false})}</time><span>{l.message}</span></div>)}</div>
  </section>;
}
export function EnterpriseDashboard(){
 const {sites}=useMonitoring(); const [params,setParams]=useSearchParams(); const selected=params.get('site')||'all'; const [sim,setSim]=useState({enabled:true,sites:{}});
 useEffect(()=>{let dead=false; const load=()=>fetchSimulatorStatus().then(v=>!dead&&setSim(v)).catch(()=>{});load();const t=setInterval(load,1500);return()=>{dead=true;clearInterval(t)}},[]);
 const selectedSite=selected==='all'?null:sites.find(s=>s.id===`site-${selected}`)||sites[0];
 const danger=sites.filter(s=>s.status==='danger').length;
 const toggle=async()=>{const next=sim.enabled?await stopSimulator():await startSimulator();setSim(next)};
 return <div className="ed-page">
  <header className="ed-hero"><div><p>BUZZ · AI SOUND SAFETY</p><h1>실시간 사업장 모니터링</h1><span>24 kHz · Mono · 2초 단위 실제 AI 분석</span></div><div className="ed-hero-stats"><div><span>사업장</span><b>{sites.length}</b></div><div><span>위험</span><b>{danger}</b></div><button onClick={toggle}>{sim.enabled?'■ STOP':'▶ START'}</button></div></header>
  <nav className="ed-tabs"><button className={selected==='all'?'active':''} onClick={()=>setParams({})}>전체 사업장</button>{sites.map(s=><button key={s.id} className={selected===String(siteNum(s.id))?'active':''} onClick={()=>setParams({site:String(siteNum(s.id))})}>{s.name}</button>)}</nav>
  {selected==='all'?<><section className="ed-section-title"><div><p>OVERVIEW</p><h2>전체 사업장 상태</h2></div><span>site1 · site2 · site3 독립 분석</span></section><div className="ed-site-grid">{sites.map(s=><SiteCard key={s.id} site={s} sim={sim.sites?.[siteNum(s.id)]} onClick={()=>setParams({site:String(siteNum(s.id))})}/>)}</div></>: selectedSite&&<Detail site={selectedSite} sim={sim.sites?.[siteNum(selectedSite.id)]}/>} 
 </div>;
}
