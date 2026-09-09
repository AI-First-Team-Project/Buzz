// 대시보드 - 사업장 현황 요약
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Badge } from '../../components/Badge';
import { BeeMascot } from '../../components/BeeMascot';
import { PageHeader } from '../../components/PageHeader';
import { SiteScene } from '../../components/SiteScene';
import { StatCard } from '../../components/StatCard';
import {
  CheckCircleIcon,
  ChevronRightIcon,
  DoorIcon,
  HistoryIcon,
  LockIcon,
  SiteIcon,
  WarningIcon,
} from '../../components/Icons';
import { useMonitoring } from '../../data/MonitoringContext';
import type { DoorState } from '../../types';
import styles from './Dashboard.module.css';

const KOREAN_LABEL: Record<string, string> = { wasp: '말벌', bee: '꿀벌', other: '기타' };

export function Dashboard() {
  const { sites, detectionEvents, settings, setDoor } = useMonitoring();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('site') ?? 'all';
  const visibleSites = selectedId === 'all' ? sites : sites.filter((s) => s.id === selectedId);
  const [defaultMonitorId] = useState(() => sites.find((s) => s.status === 'danger')?.id ?? sites[0]?.id);
  const selectedSite = visibleSites.find((s) => s.id === defaultMonitorId) ?? visibleSites[0];
  const dangerSite = visibleSites.find((s) => s.status === 'danger');
  const doorState = selectedSite?.door ?? 'closed';
  const setDoorState = (door: DoorState) => selectedSite && setDoor(selectedSite.id, door);

  const normalCount = visibleSites.filter((s) => s.status === 'normal').length;
  const dangerCount = visibleSites.filter((s) => s.status === 'danger').length;

  // 앱(HomePage)과 동일한 "마지막 분석 N초 전" 표시를 위한 시뮬레이션 타이머.
  // 실제 연동 시에는 FastAPI/Kafka Consumer 결과 수신 시 setLastAnalysisAt(Date.now())를 호출하면 됨.
  const [lastAnalysisAt, setLastAnalysisAt] = useState(Date.now());
  const [lastAnalysisLabel, setLastAnalysisLabel] = useState('방금 전');

  useEffect(() => {
    const timer = window.setInterval(() => {
      const diff = Math.max(0, Math.floor((Date.now() - lastAnalysisAt) / 1000));
      setLastAnalysisLabel(diff < 2 ? '방금 전' : `${diff}초 전`);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lastAnalysisAt]);

  useEffect(() => {
    let timer: number;
    const scheduleNext = () => {
      const delay = 10000 + Math.floor(Math.random() * 20001);
      timer = window.setTimeout(() => {
        setLastAnalysisAt(Date.now());
        scheduleNext();
      }, delay);
    };
    scheduleNext();
    return () => window.clearTimeout(timer);
  }, []);

  const selectedDanger = selectedSite?.status === 'danger';

  return (
    <div>
      <PageHeader
        title="양봉장의 안전을 한눈에"
        description="양봉장의 안전을 확인하세요."
        action={<select aria-label="사업장 선택" className={styles.siteSelect} value={selectedId} onChange={(e) => setSearchParams(e.target.value === 'all' ? {} : { site: e.target.value })}>
          <option value="all">전체 사업장</option>
          {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
        </select>}
      />

      <div className={styles.statRow}>
        <StatCard icon={SiteIcon} label="사업장" value={String(visibleSites.length)} />
        <StatCard icon={CheckCircleIcon} label="정상" value={String(normalCount)} tone="success" />
        <StatCard icon={WarningIcon} label="위험" value={String(dangerCount)} tone="danger" />
        <StatCard icon={HistoryIcon} label="방금 전" value="갱신됨" tone="muted" />
      </div>

      {selectedSite && (
        <section className={`${styles.statusSummary} ${selectedDanger ? styles.statusSummaryDanger : ''}`}>
          <div className={`${styles.statusSymbol} ${selectedDanger ? styles.statusSymbolDanger : ''}`}>
            {selectedDanger ? '!' : '✓'}
          </div>
          <div className={styles.statusBody}>
            <p className={styles.kicker}>현재 상태</p>
            <h1 className={styles.statusTitle}>{selectedDanger ? '말벌 침입 감지' : '정상 감시 중'}</h1>
            <p className={styles.statusDesc}>
              {selectedDanger
                ? '말벌이 감지되어 출입문을 자동으로 닫았습니다.'
                : '현재 양봉장은 안전합니다.'}
            </p>
            <small className={styles.statusMeta}>마지막 분석 {lastAnalysisLabel}</small>
          </div>
          <BeeMascot danger={selectedDanger} />
        </section>
      )}

      {dangerSite && settings.waspAlert && (
        <div className={styles.alertBanner} role="alert">
          <div className={styles.alertLeft}>
            <WarningIcon size={16} />
            <span>
              <strong>{dangerSite.name}</strong> · 말벌 감지 · 위험 알람
            </span>
          </div>
          <Link to={`/?site=${dangerSite.id}`} className={styles.alertLink}>
            전체보기
            <ChevronRightIcon size={14} />
          </Link>
        </div>
      )}

      {selectedSite && (
        <div className={styles.monitorCard}>
          <div className={styles.monitorVideo}>
            <SiteScene tone={selectedSite.photoTone} className={styles.monitorScene} />
            <div className={styles.monitorLabel}>{selectedSite.name} · 야외 카메라</div>
            <div className={styles.monitorTimestamp}>{selectedSite.lastAnalyzedAt}</div>
          </div>

          <div className={styles.monitorInfo}>
            <div className={styles.confidenceRow}>
              <span className={styles.confidenceLabel}>최근 AI 판정</span>
              <span className={styles.confidenceValue}>
                {KOREAN_LABEL[selectedSite.aiLabel]} {selectedSite.aiConfidence}%
              </span>
            </div>
            <div className={styles.confidenceBarTrack}>
              <div
                className={styles.confidenceBarFill}
                style={{ width: `${selectedSite.aiConfidence}%` }}
              />
            </div>

            <section className={styles.doorControl} aria-label="개폐기 제어">
              <div className={styles.doorState}>
                <span className={`${styles.doorSymbol} ${doorState === 'closed' ? styles.doorSymbolClosed : ''}`}>
                  {doorState === 'closed' ? <LockIcon size={26} /> : <DoorIcon size={26} />}
                </span>
                <div>
                  <span className={styles.doorCaption}>개폐기 상태</span>
                  <strong role="status">{doorState === 'closed' ? '닫힘' : '열림'}</strong>
                  <small>{selectedSite.status === 'danger' ? '위험 감지 · 자동 보호 중' : '정상 · 수동 제어 가능'}</small>
                </div>
                <Badge tone={selectedSite.status === 'danger' ? 'danger' : 'success'}>{selectedSite.status === 'danger' ? '위험' : '정상'}</Badge>
              </div>
              <button
                type="button"
                className={`${styles.doorAction} ${selectedSite.status === 'danger' && doorState === 'closed' ? styles.doorActionDanger : ''}`}
                onClick={() => setDoorState(doorState === 'closed' ? 'open' : 'closed')}
              >
                {doorState === 'closed' ? <DoorIcon size={20} /> : <LockIcon size={20} />}
                {doorState === 'closed' ? '개폐기 열기' : '개폐기 닫기'}
              </button>
              <p className={styles.doorNote}>{selectedSite.status === 'danger'
                ? '열기를 누르면 정상으로 전환되고, 1분 뒤 다시 위험이 표시됩니다.'
                : '열기 후 1분 뒤 위험이 다시 표시되며, 설정에 따라 자동으로 닫힙니다.'}</p>
            </section>
          </div>
        </div>
      )}

      {!selectedSite && <p role="status">사업장을 찾을 수 없습니다. 위에서 사업장을 선택하세요.</p>}
      <div className={styles.sectionTitle}>사업장별 현황</div>
      <div className={styles.siteGrid}>
        {visibleSites.map((site) => (
          <div
            key={site.id}
            className={`${styles.siteCard} ${site.status === 'danger' ? styles.siteCardDanger : ''}`}
          >
            <div className={styles.siteCardHead}>
              <span>{site.name}</span>
              <Badge tone={site.status === 'danger' ? 'danger' : 'success'}>
                {site.status === 'danger' ? '위험' : '정상'}
              </Badge>
            </div>
            <div className={styles.siteCardMeta}>
              최근 AI 판정 {KOREAN_LABEL[site.aiLabel]} {site.aiConfidence}%
            </div>
            <div className={styles.siteCardDoor}>
              <DoorIcon size={14} />
              출입문 {site.door === 'closed' ? '닫힘' : '열림'}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.sectionTitle}>최근 이벤트</div>
      <div className={styles.eventList}>
        {detectionEvents.filter((event) => selectedId === 'all' || event.siteName === selectedSite?.name).slice(0, 5).map((event, index) => (
          <div key={`${event.time}-${index}`} className={styles.eventRow}>
            <span className={styles.eventTime}>{event.time}</span>
            <span className={styles.eventSite}>{event.siteName}</span>
            <span className={styles.eventLabel}>{event.label}</span>
            <Badge tone={event.kind === 'danger' ? 'danger' : 'success'}>
              {event.kind === 'danger' ? '위험' : event.kind === 'door' ? '문 제어' : '정상'}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}