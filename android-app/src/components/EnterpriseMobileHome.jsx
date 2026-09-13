import { useEffect,useState } from 'react';
import BottomNav from './BottomNav';
import { fetchLatestAnalysis, fetchSimulatorStatus, fetchSiteStatuses, startSimulator, stopSimulator } from '../api/buzzApi';
import { WaveformChart, SpectrumChart, MelSpectrogram, MfccHeatmap } from './AudioAnalysisCharts';
import './EnterpriseMobileHome.css';
const map=s=>({id:s.site_id,name:s.site_name,danger:s.status==='DANGER',label:s.detected_class,confidence:Math.round((s.confidence||0)*100),door:s.door_status,workerStatus:s.worker_status,lastAnalyzedAt:s.last_analysis_time});
export default function EnterpriseMobileHome({setPage}){
 const [sites,setSites]=useState([]),[selected,setSelected]=useState('all'),[sim,setSim]=useState({enabled:true,sites:{}}),[detail,setDetail]=useState(null);
 const [connection,setConnection]=useState({status:'loading',lastUpdatedAt:null});
 const [simError,setSimError]=useState(false);
 useEffect(()=>{let dead=false;const load=async()=>{
  const [statusResult,simResult]=await Promise.allSettled([fetchSiteStatuses(),fetchSimulatorStatus()]);
  if(dead)return;
  if(statusResult.status==='fulfilled'){
   setSites(statusResult.value.map(map));
   setConnection({status:'connected',lastUpdatedAt:new Date().toISOString()});
  }else setConnection(previous=>({...previous,status:'disconnected'}));
  if(simResult.status==='fulfilled'){setSim(simResult.value);setSimError(false)}else setSimError(true);
 };load();const t=setInterval(load,2000);return()=>{dead=true;clearInterval(t)}},[]);
 useEffect(()=>{if(selected==='all'){setDetail(null);return} let dead=false;const load=()=>fetchLatestAnalysis(Number(selected)).then(v=>!dead&&setDetail(v)).catch(()=>{});load();const t=setInterval(load,2000);return()=>{dead=true;clearInterval(t)}},[selected]);
 const toggle=async()=>{try{setSim(await(sim.enabled?stopSimulator():startSimulator()));setSimError(false)}catch{setSimError(true)}}; const site=sites.find(s=>s.id===Number(selected));
 const lastUpdated=connection.lastUpdatedAt?new Date(connection.lastUpdatedAt).toLocaleString('ko-KR',{hour12:false}):'없음';
 return <div className="em-page"><main><header><div><small>BUZZ AI SAFETY</small><h1>실시간 모니터링</h1></div><button onClick={toggle}>{sim.enabled?'■ STOP':'▶ START'}</button></header><nav><button className={selected==='all'?'active':''} onClick={()=>setSelected('all')}>전체</button>{sites.map(s=><button className={selected===String(s.id)?'active':''} key={s.id} onClick={()=>setSelected(String(s.id))}>사업장{s.id}</button>)}</nav>
 <div className={`em-connection ${connection.status==='disconnected'||simError?'error':''}`} role={connection.status==='disconnected'||simError?'alert':'status'}><strong>{connection.status==='connected'?'서버 연결됨':connection.status==='loading'?'서버 연결 확인 중':'서버 연결 실패 · 마지막 상태 표시 중'}{simError?' · 시뮬레이터 상태 확인 실패':''}</strong><span>마지막 갱신: {lastUpdated}</span></div>
 {selected==='all'?<section className="em-sites">{sites.map(s=>{const ss=sim.sites?.[s.id];return <button key={s.id} className={s.danger?'danger':''} onClick={()=>setSelected(String(s.id))}><div><h2>{s.name}</h2><span className={s.danger?'danger':'normal'}>{s.danger?'위험':'정상'}</span></div><strong>{ss?.state==='ERROR'?'분석 오류':s.label==='wasp'?'말벌':'말벌 아님'} · {s.confidence}%</strong><small>{s.workerStatus==='DEGRADED'?'분석 지연 · 마지막 판정 유지':ss?.current_file||'음원 대기'} {Number.isInteger(ss?.chunk_index)?`#${ss.chunk_index+1}`:''}</small></button>})}</section>:site&&<section className="em-detail"><div className="em-result"><div><small>{site.name}</small><h2>{site.label==='wasp'?'말벌':'말벌 아님'}</h2></div><b>{site.confidence}%</b></div><p className="em-analysis-time">{site.workerStatus==='DEGRADED'?'분석 지연 · 마지막 판정 유지 · ':''}마지막 분석: {site.lastAnalyzedAt?new Date(site.lastAnalyzedAt).toLocaleString('ko-KR',{hour12:false}):'없음'}</p>{sim.sites?.[site.id]?.state==='ERROR'&&<p className="em-error">API 오류 · normal로 대체하지 않음</p>}{detail?<div className="em-charts"><article><h3>Waveplot</h3><WaveformChart data={detail.waveform}/></article><article><h3>FFT Spectrum</h3><SpectrumChart data={detail.fft}/></article><article><h3>Mel-Spectrogram</h3><MelSpectrogram data={detail.spectrogram}/></article>{detail.mfcc&&<article><h3>MFCC</h3><MfccHeatmap data={detail.mfcc}/></article>}</div>:<p className="em-wait">실제 2초 chunk를 기다리는 중</p>}</section>}</main><BottomNav currentPage="home" setPage={setPage}/></div>;
}
