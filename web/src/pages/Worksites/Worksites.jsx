// 사업장 - 음향 중심 목록 조회 및 검색
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AcousticSignal } from '../../components/AcousticSignal.tsx';
import { Badge } from '../../components/Badge';
import { PageHeader } from '../../components/PageHeader';
import { DoorIcon, SearchIcon } from '../../components/Icons';
import { useMonitoring } from '../../data/MonitoringContext';
import styles from './Worksites.module.css';

const KOREAN_LABEL = { wasp: '말벌', 'non-wasp': '말벌 아님' };

export function Worksites() {
  const navigate = useNavigate();
  const { sites } = useMonitoring();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const normalCount = sites.filter((site) => site.status === 'normal').length;
  const dangerCount = sites.filter((site) => site.status === 'danger').length;
  const filteredSites = useMemo(() => sites.filter((site) => (filter === 'all' || site.status === filter) && site.name.includes(query.trim())), [filter, query, sites]);

  return <div>
    <PageHeader title="사업장" description="모든 사업장의 현재 상태를 확인하세요." action={<div className={styles.searchBox}><SearchIcon size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="사업장 검색" /></div>} />
    <div className={styles.siteSummary}><div><b>{normalCount}</b><span>정상</span></div><div className={styles.dangerCount}><b>{dangerCount}</b><span>위험</span></div><small>총 {sites.length}개 사업장</small></div>
    <div className={styles.filterRow}>{['all', 'normal', 'danger'].map((value) => {
      const count = value === 'all' ? sites.length : value === 'normal' ? normalCount : dangerCount;
      const label = value === 'all' ? '전체' : value === 'normal' ? '정상' : '위험';
      return <button key={value} type="button" className={filter === value ? styles.filterActive : styles.filter} onClick={() => setFilter(value)}>{label} {count}</button>;
    })}</div>
    <div className={styles.grid}>{filteredSites.map((site) => {
      const imageName = site.status === 'danger' ? 'wasp' : site.id.endsWith('1') ? 'honeybee' : 'honeycomb-dark';
      return <div key={site.id} className={styles.card}>
        <div className={styles.cardHead}><span className={styles.cardName}>{site.name}</span><Badge tone={site.status === 'danger' ? 'danger' : 'success'}>{site.status === 'danger' ? '위험' : '정상'}</Badge></div>
        <div className={styles.photo}><video className={styles.photoScene} src={`${import.meta.env.BASE_URL}videos/site-${site.id.replace(/\D/g, '')}.mp4`} poster={`${import.meta.env.BASE_URL}images/${imageName}.jpg`} muted playsInline preload="metadata" /></div>
        <AcousticSignal seed={Number(site.id.replace(/\D/g, ''))} danger={site.status === 'danger'} compact />
        <div className={styles.metaRow}>최근 AI 판정: {KOREAN_LABEL[site.aiLabel]} {site.aiConfidence}%</div>
        <div className={styles.metaRow}><DoorIcon size={13} /> 출입문: <span className={site.door === 'closed' ? styles.doorClosed : styles.doorOpen}>{site.door === 'closed' ? '닫힘' : '열림'}</span></div>
        <div className={styles.metaRow}>최근 분석: {site.lastAnalyzedAt}</div>
        <button type="button" className={styles.monitorButton} onClick={() => navigate(`/?site=${site.id}`)}>모니터링 보기</button>
      </div>;
    })}</div>
  </div>;
}
