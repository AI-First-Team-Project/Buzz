// 공통 탐색 - 상단 경로와 상태 표시
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMonitoring } from '../data/MonitoringContext';
import type { Classification } from '../types';
import { BellIcon, ChevronRightIcon, PlayIcon } from './Icons';
import styles from './Topbar.module.css';

interface TopbarProps {
  breadcrumb: string[];
}

export function Topbar({ breadcrumb }: TopbarProps) {
  const { sites, settings, detect } = useMonitoring();
  const [params] = useSearchParams();
  const [panel, setPanel] = useState<'alerts' | 'simulation' | null>(null);
  const [simulationSite, setSimulationSite] = useState('site-1');
  const [classification, setClassification] = useState<Classification>('wasp');
  const [confidence, setConfidence] = useState(97);
  const alerts = settings.waspAlert ? sites.filter((site) => site.status === 'danger' && site.aiLabel === 'wasp') : [];
  return (
    <header className={styles.topbar}>
      <div className={styles.breadcrumb}>
        {breadcrumb.map((crumb, index) => (
          <span key={crumb} className={styles.crumbGroup}>
            {index > 0 && <ChevronRightIcon size={13} className={styles.crumbSep} />}
            <span className={index === breadcrumb.length - 1 ? styles.crumbCurrent : undefined}>
              {crumb}
            </span>
          </span>
        ))}
      </div>

      <div className={styles.actions}>
        <span className={styles.timestamp}>{new Date().toLocaleString('ko-KR')}</span>
        <button type="button" className={styles.simulationBadge} aria-expanded={panel === 'simulation'} onClick={() => {
          setSimulationSite(sites.some((site) => site.id === params.get('site')) ? params.get('site')! : 'site-1');
          setPanel(panel === 'simulation' ? null : 'simulation');
        }}>
          <PlayIcon size={12} />
          시뮬레이션
        </button>
        <button type="button" className={styles.iconButton} aria-label={`알림 ${alerts.length}건`} aria-expanded={panel === 'alerts'} onClick={() => setPanel(panel === 'alerts' ? null : 'alerts')}>
          <BellIcon size={18} />
          {alerts.length > 0 && <span className={styles.notifDot}>{alerts.length}</span>}
        </button>
        <div className={styles.avatar}>HJ</div>
      </div>
      {panel === 'alerts' && <section className={styles.panel} aria-label="위험 알림 목록">
        <strong>위험 알림 {alerts.length}건</strong>
        <button type="button" onClick={() => setPanel(null)}>닫기</button>
        <div role="status" aria-live="polite">
          {alerts.length === 0 ? <p>{settings.waspAlert ? '현재 위험 알림이 없습니다.' : '말벌 감지 알림이 꺼져 있습니다.'}</p> : alerts.map((site) => (
            <Link key={site.id} className={styles.alertItem} to={`/?site=${site.id}`} onClick={() => setPanel(null)}>
              <BellIcon size={16} /> {site.name} · 말벌 {site.aiConfidence}% · 위험
            </Link>
          ))}
        </div>
      </section>}
      {panel === 'simulation' && <section className={styles.panel} aria-label="감지 시뮬레이션">
        <strong>감지 시뮬레이션</strong>
        <p>샘플 감지 결과를 적용합니다. 실제 장비와 연결되지 않습니다.</p>
        <label>사업장 <select value={simulationSite} onChange={(e) => setSimulationSite(e.target.value)}>
          {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
        </select></label>
        <label>감지 종류 <select value={classification} onChange={(e) => setClassification(e.target.value as Classification)}>
          <option value="wasp">말벌</option><option value="bee">꿀벌</option><option value="other">기타</option>
        </select></label>
        <label>신뢰도 {confidence}% <input aria-label="시뮬레이션 신뢰도" type="range" min="0" max="100" value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} /></label>
        <button type="button" onClick={() => { detect(simulationSite, classification, confidence); setPanel('alerts'); }}>감지 적용</button>
        <button type="button" onClick={() => setPanel(null)}>닫기</button>
      </section>}
      <span className={styles.liveStatus} role="status" aria-live="assertive">{alerts.length > 0 ? alerts.map((site) => `${site.name} 말벌 감지 위험 알람`).join(', ') : '위험 알림 없음'}</span>
    </header>
  );
}
