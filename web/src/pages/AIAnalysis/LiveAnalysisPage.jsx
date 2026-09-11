import { useEffect,useState } from 'react';
import { fetchLatestAnalysis, fetchSiteStatuses } from '../../api/buzzApi';
import { MEL_PALETTE, SignalHeatmap, SignalLineChart } from './LiveAnalysisCharts';
import './LiveAnalysisPage.css';
const MFCC_PALETTE=[[30,58,138],[59,130,246],[248,250,252],[239,68,68],[153,27,27]];
export function LiveAnalysisPage(){
 const [sites,setSites]=useState([]),[siteId,setSiteId]=useState(1),[data,setData]=useState(null),[error,setError]=useState('');
 useEffect(()=>{fetchSiteStatuses().then(setSites).catch(()=>{})},[]);
 useEffect(()=>{let dead=false;const load=()=>fetchLatestAnalysis(siteId).then(v=>{if(!dead){setData(v);setError('')}}).catch(e=>!dead&&setError(e.message));load();const t=setInterval(load,2000);return()=>{dead=true;clearInterval(t)}},[siteId]);
 return <div className="la-page"><header><div><p>LIVE ACOUSTIC ANALYSIS</p><h1>상세 음향 분석</h1><span>선택 사업장의 현재 실제 2초 chunk 기준</span></div><select value={siteId} onChange={e=>setSiteId(Number(e.target.value))}>{(sites.length?sites:[{site_id:1,site_name:'사업장 1'},{site_id:2,site_name:'사업장 2'},{site_id:3,site_name:'사업장 3'}]).map(s=><option key={s.site_id} value={s.site_id}>{s.site_name}</option>)}</select></header>
 {!data?<section className="la-empty">{error||'분석 데이터를 기다리는 중입니다.'}</section>:<><section className="la-summary"><div><span>파일</span><b>{data.audio.fileName}</b></div><div><span>판정</span><b>{data.prediction.label==='wasp'?'말벌':'말벌 아님'}</b></div><div><span>신뢰도</span><b>{(data.prediction.confidence*100).toFixed(1)}%</b></div><div><span>모델</span><b>{data.meta.modelName}</b></div></section><section className="la-grid"><article><h2>1. Waveplot</h2><SignalLineChart xValues={data.waveform.time} yValues={data.waveform.amplitude} symmetric color="#2563eb" label="Waveplot"/></article><article><h2>2. FFT Spectrum</h2><SignalLineChart xValues={data.fft.frequency} yValues={data.fft.magnitudeDb} color="#0ea5e9" label="FFT"/></article><article className="wide"><h2>3. Mel-Spectrogram</h2><SignalHeatmap matrix={data.spectrogram.db} palette={MEL_PALETTE} label="Mel"/></article><article className="wide"><h2>4. MFCC</h2><SignalHeatmap matrix={data.mfcc?.coefficients||[]} palette={MFCC_PALETTE} symmetric label="MFCC"/></article></section></>}
 </div>;
}
