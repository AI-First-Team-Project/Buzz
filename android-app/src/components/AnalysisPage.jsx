import { useEffect, useState } from 'react';
import BottomNav from './BottomNavV2.jsx';
import { fetchLatestAnalysis } from '../api/buzzApi';
import { useSiteStatuses } from '../hooks/useSiteStatuses';
import { MelSpectrogram, MfccHeatmap, SpectrumChart, WaveformChart } from './AudioAnalysisCharts';

const DAYS=['월','화','수','목','금','토','일'];
export default function AnalysisPage({setPage}){
 const {sites}=useSiteStatuses();
 const [siteId,setSiteId]=useState(1),[analysis,setAnalysis]=useState(null);
 const site=sites.find(item=>item.id===siteId)||sites[0];
 useEffect(()=>{if(!site)return;let dead=false;const load=()=>fetchLatestAnalysis(site.id).then(value=>!dead&&setAnalysis(value)).catch(()=>{});load();const timer=setInterval(load,20000);return()=>{dead=true;clearInterval(timer)}},[site?.id]);
 if(!site)return <div className="buzz-commercial-page"><main className="buzz-commercial-content buzz-analysis-page">사업장 정보를 불러오는 중입니다.</main><BottomNav currentPage="analysis" setPage={setPage}/></div>;
 const danger=site.status==='danger', trend=[2,4,3,7,5,9,danger?12:6].map(value=>value+site.id),max=Math.max(...trend);
 return <div className="buzz-commercial-page"><main className="buzz-commercial-content buzz-analysis-page">
  <div className="buzz-page-heading"><h1>실시간 음향 분석</h1><p className="buzz-page-desc">선택 사업장의 최신 음향 상태와 AI 판정을 확인합니다.</p></div>
  <div className="buzz-analysis-site-selector"><div><p className="buzz-kicker">분석 대상</p><b>{site.name}</b></div><select value={site.id} onChange={event=>setSiteId(Number(event.target.value))}>{sites.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
  <section className={`buzz-card buzz-analysis-summary-card ${danger?'danger':''}`}><div className="buzz-analysis-summary-head"><div><p className="buzz-kicker">현재 AI 판정</p><h2>{danger?'말벌 위험':'정상 상태'}</h2></div><span className={`buzz-status-chip ${danger?'danger':''}`}>{danger?'위험':'정상'}</span></div><div className="buzz-analysis-result"><div><span>신뢰도</span><strong>{site.confidence}%</strong></div><div><span>사용 모델</span><strong>CNN</strong></div></div><div className="buzz-analysis-meta"><span>최근 분석 <b>{site.lastAnalyzedAt}</b></span><span>분석 기준 <b>최근 2초 음향 샘플</b></span></div></section>
  <section className="buzz-card"><div className="buzz-card-head"><div><p className="buzz-kicker">최근 7일</p><h2>말벌 감지 추이</h2></div><span className="buzz-history-pending-badge">데모 추이</span></div><div className="buzz-week-chart">{trend.map((value,index)=><div key={DAYS[index]}><b>{value}</b><span style={{height:`${Math.max(12,value/max*100)}%`}}/><small>{DAYS[index]}</small></div>)}</div></section>
  <section className="buzz-card buzz-tech-detail buzz-portfolio-tech">
   <div className="buzz-tech-block"><div className="buzz-tech-title"><div><span>실시간 음향 파형</span><small>시간에 따른 음향 진폭</small></div></div><div className="buzz-wave-chart">{analysis?<WaveformChart data={analysis.waveform}/>:<span>분석 데이터 대기 중</span>}</div></div>
   <div className="buzz-tech-block buzz-tech-main"><div className="buzz-tech-title"><div><span>Mel 스펙트로그램</span><small>주요 주파수 패턴 시각화</small></div></div><div className="buzz-spectrogram-layout buzz-spectrogram-large"><div className="buzz-mel-visual">{analysis?<MelSpectrogram data={analysis.spectrogram}/>:<span>분석 데이터 대기 중</span>}</div></div></div>
   <div className="buzz-tech-block"><div className="buzz-tech-title"><div><span>주파수 스펙트럼</span><small>주파수별 에너지 분포</small></div></div><div className="buzz-fft-chart buzz-fft-detailed">{analysis?<SpectrumChart data={analysis.fft}/>:<span>분석 데이터 대기 중</span>}</div></div>
   <div className="buzz-tech-block"><div className="buzz-tech-title"><div><span>MFCC 특징 맵</span><small>AI 판정에 사용되는 음색 특징</small></div></div><div className="buzz-mfcc-grid">{analysis?<MfccHeatmap data={analysis.mfcc}/>:<span>분석 데이터 대기 중</span>}</div></div>
  </section>
 </main><BottomNav currentPage="analysis" setPage={setPage}/></div>;
}
