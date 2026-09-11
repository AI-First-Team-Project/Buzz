// 감지 이력 - 이벤트 조회 및 필터
import { useMemo, useState } from 'react';
import { Badge } from '../../components/Badge';
import { PageHeader } from '../../components/PageHeader';
import { StatCard } from '../../components/StatCard';
import { ChevronRightIcon, DoorIcon, HistoryIcon, InfoIcon, WarningIcon } from '../../components/Icons';
import { useMonitoring } from '../../data/MonitoringContext';
import { useSearchParams } from 'react-router-dom';
import type { Classification } from '../../types';
import styles from './History.module.css';

type Filter = 'all' | 'danger' | 'door';

const KOREAN_LABEL: Record<Classification, string> = { wasp: '말벌', bee: '꿀벌', other: '기타' };

export function History() {
  const { detectionEvents, sites } = useMonitoring();
  const [params, setParams] = useSearchParams();
  const siteId = params.get('site') ?? 'all';
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const detail = detectionEvents.find((event) => event.id === selectedEvent);
  const [filter, setFilter] = useState<Filter>('all');

  const dangerCount = detectionEvents.filter((e) => e.kind === 'danger').length;
  const doorCount = detectionEvents.filter((e) => e.kind === 'door').length;

  const filteredEvents = useMemo(
    () => detectionEvents.filter((e) => (filter === 'all' ? true : e.kind === filter)).filter((e) => siteId === 'all' || e.siteName === sites.find((site) => site.id === siteId)?.name),
    [filter, detectionEvents, sites, siteId],
  );

  return (
    <div>
      <PageHeader title="감지 이력" description="위험 감지와 출입문 동작을 확인하세요." />

      <div className={styles.statRow}>
        <StatCard icon={HistoryIcon} label="전체 이벤트" value={String(detectionEvents.length)} />
        <StatCard icon={WarningIcon} label="위험" value={String(dangerCount)} tone="danger" />
        <StatCard icon={DoorIcon} label="문 제어" value={String(doorCount)} tone="muted" />
      </div>

      <div className={styles.controlRow}>
        <div className={styles.filterRow}>
          <button
            type="button"
            className={filter === 'all' ? styles.filterActive : styles.filter}
            onClick={() => setFilter('all')}
          >
            전체
          </button>
          <button
            type="button"
            className={filter === 'danger' ? styles.filterActive : styles.filter}
            onClick={() => setFilter('danger')}
          >
            위험
          </button>
          <button
            type="button"
            className={filter === 'door' ? styles.filterActive : styles.filter}
            onClick={() => setFilter('door')}
          >
            문 제어
          </button>
        </div>
        <div className={styles.rightControls}>
          <select className={styles.select} aria-label="이력 사업장" value={siteId} onChange={(e) => setParams(e.target.value === 'all' ? {} : { site: e.target.value })}>
            <option value="all">전체 사업장</option>
            <option value="site-1">사업장 1</option>
            <option value="site-2">사업장 2</option>
            <option value="site-3">사업장 3</option>
          </select>
          <span className={styles.dateRange}>샘플 및 현재 세션 이력</span>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>발생 시간</th>
              <th>사업장</th>
              <th>이벤트</th>
              <th>AI 판정</th>
              <th>문 상태</th>
              <th aria-label="상세" />
            </tr>
          </thead>
          <tbody>
            {filteredEvents.map((event) => (
              <tr key={event.id}>
                <td className={styles.timeCell}>{event.time}</td>
                <td>{event.siteName}</td>
                <td>
                  <div className={styles.eventCell}>
                    <Badge tone={event.kind === 'danger' ? 'danger' : 'info'}>
                      {event.kind === 'danger' ? '위험' : event.kind === 'door' ? '문 제어' : '정상 감지'}
                    </Badge>
                    <span>{event.label}</span>
                  </div>
                </td>
                <td>
                  {KOREAN_LABEL[event.aiClassification]} {event.aiConfidence}%
                </td>
                <td className={event.doorState === 'closed' ? styles.doorClosed : styles.doorOpen}>
                  {event.doorState === 'closed' ? '닫힘' : '열림'}
                </td>
                <td>
                  <button type="button" aria-label={`${event.siteName} ${event.time} 상세`} onClick={() => setSelectedEvent(event.id)}><ChevronRightIcon size={16} className={styles.chevron} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={styles.tableFooter}>
          <span>총 {filteredEvents.length}개 이벤트</span>
          <div className={styles.pagination}>
            <button type="button" disabled>
              <ChevronRightIcon size={14} style={{ transform: 'rotate(180deg)' }} />
            </button>
            <span className={styles.pageNumber}>1</span>
            <button type="button" disabled>
              <ChevronRightIcon size={14} />
            </button>
          </div>
        </div>
      </div>

      {detail && <section className={styles.infoBar} aria-label="이벤트 상세">
        <div><strong>{detail.siteName} · {detail.time}</strong><p>{detail.label} · {KOREAN_LABEL[detail.aiClassification]} {detail.aiConfidence}% · 문 {detail.doorState === 'closed' ? '닫힘' : '열림'}</p></div>
        <button type="button" onClick={() => setSelectedEvent(null)}>닫기</button>
      </section>}
      <div className={styles.infoBar}>
        <InfoIcon size={15} />
        이벤트를 선택하면 당시 분석 결과와 동작 흐름을 볼 수 있습니다.
      </div>
    </div>
  );
}
