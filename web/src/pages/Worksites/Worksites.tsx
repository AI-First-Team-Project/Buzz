// 사업장 - 목록 조회 및 검색
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../components/Badge';
import { PageHeader } from '../../components/PageHeader';
import { SiteScene } from '../../components/SiteScene';
import { DoorIcon, SearchIcon } from '../../components/Icons';
import { useMonitoring } from '../../data/MonitoringContext';
import type { Classification } from '../../types';
import styles from './Worksites.module.css';

type Filter = 'all' | 'normal' | 'danger';

const KOREAN_LABEL: Record<Classification, string> = { wasp: '말벌', bee: '꿀벌', other: '기타' };

export function Worksites() {
  const navigate = useNavigate();
  const { sites } = useMonitoring();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const normalCount = sites.filter((s) => s.status === 'normal').length;
  const dangerCount = sites.filter((s) => s.status === 'danger').length;

  const filteredSites = useMemo(() => {
    return sites
      .filter((s) => (filter === 'all' ? true : s.status === filter))
      .filter((s) => s.name.includes(query.trim()));
  }, [filter, query, sites]);

  return (
    <div>
      <PageHeader
        title="사업장"
        description="모든 사업장의 현재 상태를 확인하세요."
        action={
          <div className={styles.searchBox}>
            <SearchIcon size={15} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="사업장 검색"
            />
          </div>
        }
      />

      <div className={styles.filterRow}>
        <button
          type="button"
          className={filter === 'all' ? styles.filterActive : styles.filter}
          onClick={() => setFilter('all')}
        >
          전체 {sites.length}
        </button>
        <button
          type="button"
          className={filter === 'normal' ? styles.filterActive : styles.filter}
          onClick={() => setFilter('normal')}
        >
          정상 {normalCount}
        </button>
        <button
          type="button"
          className={filter === 'danger' ? styles.filterActive : styles.filter}
          onClick={() => setFilter('danger')}
        >
          위험 {dangerCount}
        </button>
      </div>

      <div className={styles.grid}>
        {filteredSites.map((site) => (
          <div key={site.id} className={styles.card}>
            <div className={styles.photo}>
              <SiteScene tone={site.photoTone} className={styles.photoScene} />
            </div>
            <div className={styles.cardBody}>
              <div className={styles.cardHead}>
                <span className={styles.cardName}>{site.name}</span>
                <Badge tone={site.status === 'danger' ? 'danger' : 'success'}>
                  {site.status === 'danger' ? '위험' : '정상'}
                </Badge>
              </div>
              <div className={styles.metaRow}>
                최근 AI 판정: {KOREAN_LABEL[site.aiLabel]} {site.aiConfidence}%
              </div>
              <div className={styles.metaRow}>
                <DoorIcon size={13} /> 출입문:{' '}
                <span className={site.door === 'closed' ? styles.doorClosed : styles.doorOpen}>
                  {site.door === 'closed' ? '닫힘' : '열림'}
                </span>
              </div>
              <div className={styles.metaRow}>최근 분석: {site.lastAnalyzedAt}</div>
              <button type="button" className={styles.monitorButton} onClick={() => navigate(`/?site=${site.id}`)}>
                모니터링 보기
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.sectionTitle}>사업장 상태 요약</div>
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>사업장</th>
              <th>감지 상태</th>
              <th>AI 신뢰도</th>
              <th>출입문</th>
              <th>최근 분석</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((site) => (
              <tr key={site.id}>
                <td>{site.name}</td>
                <td>
                  <Badge tone={site.status === 'danger' ? 'danger' : 'success'}>
                    {site.status === 'danger' ? '위험' : '정상'}
                  </Badge>
                </td>
                <td>
                  {KOREAN_LABEL[site.aiLabel]} {site.aiConfidence}%
                </td>
                <td className={site.door === 'closed' ? styles.doorClosed : styles.doorOpen}>
                  {site.door === 'closed' ? '닫힘' : '열림'}
                </td>
                <td className={styles.mutedCell}>{site.lastAnalyzedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
