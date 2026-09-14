import { useEffect, useState } from 'react';
import { fetchAnalysisLogs } from '../../api/buzzApi';
import { formatOperationalTime } from '../../utils/formatDateTime';
import './SystemLogSection.css';
import { Pagination } from '../../components/common/Pagination';
export function SystemLogSection(){
 const [rows,setRows]=useState([]),[error,setError]=useState(''),[page,setPage]=useState(1);const pageCount=Math.max(1,Math.ceil(rows.length/10));const currentPage=Math.min(page,pageCount);const pageRows=rows.slice((currentPage-1)*10,currentPage*10);
 useEffect(()=>{let active=true;fetchAnalysisLogs(20).then(value=>{if(active)setRows(Array.isArray(value)?value:[])}).catch(reason=>active&&setError(reason?.message||'시스템 로그를 불러오지 못했습니다.'));return()=>{active=false}},[]);
 return <section className="ft-system-log"><header><div><h2>시스템 로그</h2><p>테스트 실행과 AI 처리 상태를 확인합니다.</p></div><span>최근 20건</span></header>{error?<p className="ft-log-empty">{error}</p>:<><div className="ft-log-table"><div className="head"><span>시각</span><span>대상</span><span>이벤트</span><span>상태</span><span>결과 요약</span></div>{pageRows.map((row,index)=>{const date=formatOperationalTime(row.detected_at),wasp=row.prediction==='wasp';return <div key={row.analysis_id||row.id||index}><time>{date.time}</time><span>{row.site_id?`사업장 ${row.site_id}`:'파일 테스트'}</span><span>{row.analysis_type==='test'?'AI 테스트 분석':'실시간 분석'}</span><b className={wasp?'danger':'normal'}>{wasp?'위험':'정상'}</b><span>{row.prediction?`${wasp?'말벌':'정상'} · ${(Number(row.confidence||0)*100).toFixed(1)}%`:'처리 완료'}</span></div>})}{!rows.length&&<p className="ft-log-empty">표시할 시스템 로그가 없습니다.</p>}</div><Pagination page={currentPage} totalPages={pageCount} onChange={setPage}/></>}</section>;
}
