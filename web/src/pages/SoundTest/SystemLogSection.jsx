import { useEffect, useState } from 'react';
import { fetchHistory } from '../../api/buzzApi';
import { formatOperationalTime } from '../../utils/formatDateTime';
import './SystemLogSection.css';
import { Pagination } from '../../components/common/Pagination';
export function SystemLogSection(){
 const [rows,setRows]=useState([]),[error,setError]=useState(''),[page,setPage]=useState(1);const pageCount=Math.max(1,Math.ceil(rows.length/10));const currentPage=Math.min(page,pageCount);const pageRows=rows.slice((currentPage-1)*10,currentPage*10);
 useEffect(()=>{let active=true;fetchHistory(100).then(value=>{if(active)setRows(Array.isArray(value)?value:[])}).catch(reason=>active&&setError(reason?.message||'시스템 로그를 불러오지 못했습니다.'));return()=>{active=false}},[]);
 return <section className="ft-system-log"><header><div><h2>시스템 로그</h2><p>위험 상태 변경과 개폐기 제어 등 시스템 동작 기록입니다.</p></div><span>운영 기록 {rows.length}건</span></header>{error?<p className="ft-log-empty">{error}</p>:<><div className="ft-log-table"><div className="head"><span>시각</span><span>사업장</span><span>유형</span><span>상태</span><span>시스템 동작</span></div>{pageRows.map((row,index)=>{const date=formatOperationalTime(row.timestamp),danger=row.type==='danger';const type=row.type==='gate'?'개폐기':row.type==='recovery'?'복귀':'위험';return <div key={row.id||index}><time>{date.time}</time><span>{row.site_name||`사업장 ${row.site_id}`}</span><span>{type}</span><b className={danger?'danger':'normal'}>{danger?'위험':'처리'}</b><span>{row.action||row.title}</span></div>})}{!rows.length&&<p className="ft-log-empty">표시할 시스템 동작 기록이 없습니다.</p>}</div><Pagination page={currentPage} totalPages={pageCount} onChange={setPage}/></>}</section>;
}
