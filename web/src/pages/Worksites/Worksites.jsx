import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DoorIcon, SearchIcon } from '../../components/Icons';
import { useMonitoring } from '../../data/MonitoringContext';
import styles from './Worksites.module.css';
import './WorksiteModal.css';
import { formatOperationalTime } from '../../utils/formatDateTime';
import { createSite, fetchSites } from '../../api/buzzApi';

const LOCATIONS = { 'site-1': '경기도 양평군 양서면', 'site-2': '충청남도 공주시 정안면', 'site-3': '전라북도 완주군 구이면' };
const formatTime = (value) => formatOperationalTime(value, { seconds: false }).time;

export function Worksites() {
  const navigate = useNavigate();
  const { sites, refreshMonitoring } = useMonitoring();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [records, setRecords] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: '', location: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const loadRecords = () => fetchSites().then(setRecords).catch(() => {});
  useEffect(() => { loadRecords(); }, []);
  const normalCount = sites.filter((site) => site.status === 'normal').length;
  const dangerCount = sites.filter((site) => site.status === 'danger').length;
  const locationFor = (site) => records.find((record) => Number(record.id) === Number(site.id.replace('site-', '')))?.location || LOCATIONS[site.id] || '위치 미등록';
  const filteredSites = useMemo(() => { const keyword=query.trim().toLowerCase(); return sites.filter((site) => (filter==='all'||site.status===filter) && (!keyword||`${site.name} ${locationFor(site)}`.toLowerCase().includes(keyword))); }, [filter,query,sites,records]);
  const submit = async (event) => { event.preventDefault(); setSaving(true); setFormError(''); try { await createSite(form); await Promise.all([loadRecords(), refreshMonitoring()]); setForm({ name:'', location:'', description:'' }); setFormOpen(false); } catch (error) { setFormError(error?.message || '사업장을 등록하지 못했습니다.'); } finally { setSaving(false); } };
  return <div className={styles.page}>
    <header className={styles.header}><div><h1>사업장 관리</h1><p>등록된 사업장 정보를 확인하고 운영 상태를 관리할 수 있습니다.</p></div><button className={styles.addButton} type="button" onClick={()=>setFormOpen(true)}>＋ 사업장 등록</button></header>
    <section className={styles.toolbar} aria-label="사업장 필터와 검색"><div className={styles.filters}><button type="button" className={filter==='all'?styles.filterActive:styles.filter} onClick={()=>setFilter('all')}>전체 {sites.length}</button><button type="button" className={filter==='normal'?styles.normalActive:styles.filter} onClick={()=>setFilter('normal')}>정상 {normalCount}</button><button type="button" className={filter==='danger'?styles.dangerActive:styles.filter} onClick={()=>setFilter('danger')}>위험 {dangerCount}</button></div><label className={styles.searchBox}><SearchIcon size={16}/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="사업명 또는 위치 검색"/></label></section>
    <section className={styles.tableWrap}><table><thead><tr><th>사업장</th><th>위치</th><th>상태</th><th>개폐기</th><th>최근 감지</th><th>관리</th></tr></thead><tbody>{filteredSites.map((site)=><tr key={site.id}>
      <td><div className={styles.siteCell}><video src={`${import.meta.env.BASE_URL}videos/${site.id}.mp4`} muted playsInline preload="metadata"/><div><strong>{site.name}</strong><small>계정</small></div></div></td><td className={styles.location}>{locationFor(site)}</td>
      <td><span className={`${styles.status} ${site.status==='danger'?styles.danger:styles.normal}`}><i/>{site.status==='danger'?'위험':'정상'}</span></td><td><span className={`${styles.door} ${site.door==='closed'?styles.closed:''}`}><DoorIcon size={14}/>{site.door==='closed'?'닫힘':'열림'}</span></td><td className={styles.time}>{formatTime(site.lastAnalyzedAt)}</td><td><button className={styles.manageButton} type="button" onClick={()=>navigate(`/?site=${site.id.replace('site-', '')}`)}>관리하기</button></td>
    </tr>)}</tbody></table>{!filteredSites.length&&<p className={styles.empty}>조건에 맞는 사업장이 없습니다.</p>}</section>
    {formOpen&&<div className="modalBackdrop" onMouseDown={()=>setFormOpen(false)}><form className="modal" onSubmit={submit} onMouseDown={(event)=>event.stopPropagation()}><header><div><h2>사업장 등록</h2><p>운영에 표시할 기본 정보를 입력하세요.</p></div><button type="button" onClick={()=>setFormOpen(false)} aria-label="닫기">×</button></header><label>사업장명<input required maxLength="100" value={form.name} onChange={(event)=>setForm({...form,name:event.target.value})}/></label><label>위치 / 주소<input required maxLength="255" value={form.location} onChange={(event)=>setForm({...form,location:event.target.value})}/></label><label>설명 (선택)<textarea maxLength="500" value={form.description} onChange={(event)=>setForm({...form,description:event.target.value})}/></label>{formError&&<p className="formError" role="alert">{formError}</p>}<footer><button type="button" onClick={()=>setFormOpen(false)}>취소</button><button type="submit" disabled={saving}>{saving?'등록 중':'등록'}</button></footer></form></div>}
  </div>;
}
