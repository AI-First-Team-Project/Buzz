// 대시보드 - 사업장 현황 요약
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Badge } from '../../components/Badge';
import { BeeMascot } from '../../components/BeeMascot';
import { PageHeader } from '../../components/PageHeader';
import { Waveform } from '../SoundTest/Waveform';
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
import type { DoorState, Site } from '../../types';
import styles from './Dashboard.module.css';

const KOREAN_LABEL: Record<string, string> = { wasp: '말벌', bee: '꿀벌', other: '기타' };

// AI 분석 페이지와 동일한 방식: aiConfidence 기반으로 결정적으로 파생시킨
// 표시용 신호 정보(랜덤 없음 → 새로고침해도 값이 안정적).
const FREQ_BAND_BY_SITE: Record<number, string> = {
  1: '0.8-1.5 kHz',
  2: '1.0-1.7 kHz',
  3: '1.8-4.2 kHz',
};

function siteNumber(site: Site) {
  return Number(site.id.replace(/\D/g, '')) || 1;
}

function signalStats(site: Site) {
  const n = siteNumber(site);
  const conf = site.aiConfidence;
  return {
    freqBand: FREQ_BAND_BY_SITE[n] ?? '1.0-1.8 kHz',
    signalDb: `-${8 + (n % 3) * 2}dB`,
    duration: `${(6 + (conf % 10) * 0.3).toFixed(1)}초`,
    intensity: conf >= 90 ? '강함' : conf >= 70 ? '보통' : '약함',
  };
}

function waveSeed(site: Site) {
  const n = siteNumber(site);
  return Array.from({ length: 48 }, (_, i) => i + n * 5);
}

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
          <div className={styles.monitorWave}>
            <div className={styles.monitorWaveHead}>
              <span>{selectedSite.name} · 실시간 모니터링</span>
              <span className={styles.monitorWaveTime}>{selectedSite.lastAnalyzedAt}</span>
            </div>
            <div className={styles.monitorWaveBox}>
              <Waveform seed={waveSeed(selectedSite)} className={styles.monitorWaveSvg} />
            </div>
          </div>

          <div className={styles.monitorInfo}>
            <div className={styles.confidenceRow}>
              <span className={styles.confidenceLabel}>AI 판정</span>
            </div>
            <div className={styles.confidenceValue}>
              {KOREAN_LABEL[selectedSite.aiLabel]} {selectedSite.aiConfidence}%
            </div>
            <div className={styles.confidenceBarTrack}>
              <div
                className={styles.confidenceBarFill}
                style={{ width: `${selectedSite.aiConfidence}%` }}
              />
            </div>

            <div className={styles.signalGrid}>
              {(() => {
                const s = signalStats(selectedSite);
                return (
                  <>
                    <div className={styles.signalCell}>
                      <span>주파수 대역</span>
                      <b>{s.freqBand}</b>
                    </div>
                    <div className={styles.signalCell}>
                      <span>신호 감도</span>
                      <b>{s.signalDb}</b>
                    </div>
                    <div className={styles.signalCell}>
                      <span>감지 지속시간</span>
                      <b>{s.duration}</b>
                    </div>
                    <div className={styles.signalCell}>
                      <span>감지 강도</span>
                      <b>{s.intensity}</b>
                    </div>
                  </>
                );
              })()}
            </div>

            <Link to={`/analysis?site=${selectedSite.id}`} className={styles.detailButton}>
              상세 분석 보기
            </Link>
          </div>
        </div>
      )}

      {selectedSite && (
        <section
          className={styles.doorControlCard}
          aria-label="개폐기 제어"
        >
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
            <Waveform seed={waveSeed(site)} className={styles.siteCardWave} />
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