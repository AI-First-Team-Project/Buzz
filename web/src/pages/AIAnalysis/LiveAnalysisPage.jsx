import { useEffect, useMemo, useState } from 'react';
import { fetchAnalysisLogs, fetchLatestAnalysis, fetchSiteStatuses } from '../../api/buzzApi';
import { formatOperationalTime } from '../../utils/formatDateTime';
import { MEL_PALETTE, SignalHeatmap, SignalLineChart } from './LiveAnalysisCharts';
import './LiveAnalysisPage.css';
import './LiveAlert.css';
import './LiveGraphLayout.css';
import './LiveDashboard.css';
import { Pagination } from '../../components/common/Pagination';
import './RecentAnalysisOverrides.css';

const percent=value=>`${(Math.max(0,Math.min(1,Number(value)||0))*100).toFixed(1)}%`;

export function LiveAnalysisPage({onViewHistory}){
 const [sites,setSites]=useState([]),[siteId,setSiteId]=useState(null),[data,setData]=useState(null),[recent,setRecent]=useState([]),[error,setError]=useState(''),[page,setPage]=useState(1);
 useEffect(()=>{fetchSiteStatuses().then(value=>{setSites(value);setSiteId(current=>current??value[0]?.site_id??null)}).catch(reason=>setError(reason?.message||'사업장 정보를 불러오지 못했습니다.'))},[]);
 useEffect(()=>{if(!siteId)return;let dead=false;setPage(1);const load=()=>Promise.all([fetchLatestAnalysis(siteId),fetchAnalysisLogs(100,{site_id:siteId})]).then(([latest,logs])=>{if(!dead){setData(latest);setRecent(logs.filter(item=>item.analysis_type!=='test'));setError('')}}).catch(reason=>!dead&&setError(reason?.message||'분석 데이터를 불러오지 못했습니다.'));load();const timer=setInterval(load,20000);return()=>{dead=true;clearInterval(timer)}},[siteId]);
 const site=useMemo(()=>sites.find(item=>item.site_id===siteId),[sites,siteId]);
 const prediction=data?.prediction;
 const label=prediction?.label??site?.detected_class;
 const danger=label==='wasp';
 const waspProbability=prediction?.probabilities?.wasp??site?.probabilities?.wasp??0;
 const normalProbability=prediction?.probabilities?.non_wasp??site?.probabilities?.non_wasp??0;
 const analyzed=formatOperationalTime(data?.meta?.timestamp??site?.last_analysis_time);
 const pageCount=Math.max(1,Math.ceil(recent.length/10));const currentPage=Math.min(page,pageCount);const pageRows=recent.slice((currentPage-1)*10,currentPage*10);
 return <div className="la-page">
  <section className="la-command-bar"><div><span className="la-command-label">모니터링 대상</span><label className="la-site-select"><span className="la-site-dot"/ ><select aria-label="사업장 선택" value={siteId??''} onChange={event=>setSiteId(Number(event.target.value))} disabled={!sites.length}><option value="" disabled>사업장 없음</option>{sites.map(item=><option key={item.site_id} value={item.site_id}>{item.site_name}</option>)}</select></label></div><div className="la-connection"><span className="la-live-dot"/>실시간 연결 중</div><div className="la-refresh"><span>↻</span><div><small>자동 갱신</small><b>20초</b></div></div></section>
  <section className="la-overview">
   <article className={`la-verdict ${danger?'danger':label?'safe':'waiting'}`} role={danger?'alert':'status'} aria-live="polite"><div className="la-verdict-icon">{danger?'!':label?'✓':'···'}</div><div className="la-verdict-copy"><span>현재 AI 판정</span><strong>{label?(danger?'말벌 감지':'정상'):'분석 대기'}</strong><p>{label?(danger?'말벌 음향 패턴이 감지되었습니다. 해당 사업장을 확인하세요.':'현재 말벌 이상 음향이 감지되지 않았습니다.'):'첫 분석 결과를 기다리고 있습니다.'}</p></div><span className="la-verdict-badge">{danger?'주의 필요':label?'안전 상태':'연결 대기'}</span></article>
   <div className="la-kpis"><ProbabilityCard label="말벌 감지 확률" value={waspProbability} danger/><ProbabilityCard label="정상 확률" value={normalProbability}/><article className="la-meta-card"><span>최근 분석 시간</span><strong>{analyzed.time||'-'}</strong><small>{analyzed.date||'분석 대기 중'}</small></article><article className="la-meta-card"><span>사용 모델</span><strong>{data?.meta?.modelName??recent[0]?.model_name??'-'}</strong><small>{site?.site_name??'등록된 사업장 없음'}</small></article></div>
  </section>
  {!data?<section className="la-empty">{error||'수신된 실시간 분석 데이터가 없습니다.'}</section>:<section className="la-grid"><AnalysisContents data={data}/></section>}
  <section className="la-recent"><div className="la-recent-head"><div><h2>최근 분석 결과</h2><p>AI가 최근 수집된 음원을 판정한 결과입니다.</p></div><button type="button" onClick={onViewHistory}>감지 이력 보기</button></div>
   <div className="la-recent-list">{pageRows.map(item=>{const stamp=formatOperationalTime(item.detected_at);const wasp=item.prediction==='wasp';return <div key={item.id} className={wasp?'danger':''}><time>{stamp.time}<small>{stamp.date}</small></time><span>{item.site_name||site?.site_name}</span><strong>{wasp?'⚠ 말벌':'비말벌'}</strong><b>{percent(item.confidence)}</b></div>})}{!recent.length&&<p className="la-recent-empty">최근 실시간 분석 결과가 없습니다.</p>}</div><Pagination page={currentPage} totalPages={pageCount} onChange={setPage}/>
  </section>
 </div>;
}
function ProbabilityCard({label,value,danger=false}){const numeric=Math.max(0,Math.min(1,Number(value)||0));return <article className={`la-probability-card ${danger?'danger':''}`}><span>{label}</span><strong>{percent(numeric)}</strong><div className="la-progress" aria-hidden="true"><i style={{width:`${numeric*100}%`}}/></div><small>{danger?'Wasp probability':'Normal probability'}</small></article>}
function AnalysisContents({data}){const sampleRate=data.audio?.sampleRate??data.audio?.sample_rate;return <>
 <article className="la-waveform-card"><Title title="실시간 음향 파형" desc="마이크에서 수집되는 최근 음향 신호" live meta={[`${data.audio?.duration??2}초 분석`,sampleRate?`${(sampleRate/1000).toFixed(0)}kHz`:null,'Mono']}/><div className="la-chart-surface"><SignalLineChart xValues={data.waveform?.time} yValues={data.waveform?.amplitude} symmetric color="#2aa876" label="실시간 음향 파형"/></div></article>
 <article className="la-mel-card"><Title title="Mel 스펙트로그램" desc="시간에 따른 주파수 에너지 변화"/><div className="la-chart-surface la-heatmap-surface"><SignalHeatmap matrix={data.spectrogram?.db} palette={MEL_PALETTE} label="Mel 스펙트로그램"/></div><div className="la-energy-legend"><span>Low Energy</span><i/><span>High Energy</span></div></article>
 <article className="la-frequency-card"><Title title="주파수 분석" desc="현재 음향의 주파수별 에너지 분포"/><div className="la-chart-surface"><SignalLineChart xValues={data.fft?.frequency} yValues={data.fft?.magnitudeDb} color="#557dd6" label="주파수 분석"/></div><div className="la-axis-labels"><span>저주파</span><span>주파수 (Hz)</span><span>고주파</span></div></article>
 </>}
function Title({title,desc,live,meta=[]}){return <div className="la-card-title"><div><h2>{title}</h2><small>{desc}</small></div><div className="la-chart-meta">{meta.filter(Boolean).map(item=><span key={item}>{item}</span>)}{live&&<b><i/>LIVE</b>}</div></div>}
