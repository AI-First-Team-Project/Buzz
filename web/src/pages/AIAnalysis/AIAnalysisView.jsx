import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { StatCard } from '../../components/StatCard';
import { AnalysisIcon, WarningIcon } from '../../components/Icons';
import { fetchLatestAnalysis } from '../../api/buzzApi';
import { useMonitoring } from '../../data/MonitoringContext';
import { MEL_PALETTE, SignalHeatmap, SignalLineChart } from './LiveAnalysisCharts';
import styles from './AIAnalysis.module.css';

const KOREAN_LABEL = { wasp: '말벌', 'non-wasp': '말벌 아님' };
const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

function siteNumber(site) {
  return Number(String(site.id).replace('site-', ''));
}

function lastValue(values, fallback = 0) {
  return values?.length ? Number(values[values.length - 1]) : fallback;
}

function seconds(value) {
  return `${Number(value || 0).toFixed(1)}초`;
}

export function AIAnalysis() {
  const { sites } = useMonitoring();
  const [selectedId, setSelectedId] = useState(sites[0]?.id ?? '');
  const [showDetail, setShowDetail] = useState(true);
  const [analysisBySite, setAnalysisBySite] = useState({});
  const [analysisError, setAnalysisError] = useState('');
  const site = sites.find((item) => item.id === selectedId) ?? sites[0];
  const siteId = site ? siteNumber(site) : 1;
  const danger = site?.status === 'danger';
  const latestAnalysis = analysisBySite[siteId] ?? null;

  useEffect(() => {
    if (site && !sites.some((item) => item.id === selectedId)) setSelectedId(site.id);
  }, [site, selectedId, sites]);

  useEffect(() => {
    let active = true;
    setAnalysisError('');
    if (!site?.latestAnalysisId) return () => { active = false; };
    fetchLatestAnalysis(siteId)
      .then((analysis) => {
        if (active && analysis) {
          setAnalysisBySite((previous) => ({ ...previous, [siteId]: analysis }));
        }
      })
      .catch((error) => {
        if (active) setAnalysisError(error?.message || '최신 분석 그래프를 불러오지 못했습니다.');
      });
    return () => { active = false; };
  }, [siteId, site?.latestAnalysisId]);

  if (!site) {
    return (
      <div>
        <PageHeader title="분석" description="사업장별 AI 판정과 음향 특징을 확인하세요." />
        <p role="status">표시할 사업장이 없습니다.</p>
      </div>
    );
  }

  const duration = latestAnalysis ? seconds(latestAnalysis.audio.duration) : '최신 데이터 대기';
  const frequencyMax = lastValue(latestAnalysis?.fft.frequency);
  const melFrequencyMax = lastValue(latestAnalysis?.spectrogram.frequency);
  const latestLabel = KOREAN_LABEL[site.aiLabel] ?? '분석 대기';
  const probabilities = site.probabilities ?? { wasp: 0, nonWasp: 0 };
  const latestPredictionDanger = site.aiLabel === 'wasp';

  return (
    <div>
      <PageHeader
        title="분석"
        description="선택한 사업장의 최신 AI 판정과 실제 음향 특징을 확인하세요."
        action={(
          <select aria-label="분석 대상 사업장 선택" className={styles.siteSelect} value={site.id} onChange={(event) => setSelectedId(event.target.value)}>
            {sites.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
          </select>
        )}
      />

      <div className={styles.statRow}>
        <StatCard icon={AnalysisIcon} label={`${site.name} · 오늘 분석`} value="DB 연결 후" />
        <StatCard icon={WarningIcon} label={`${site.name} · 오늘 말벌 탐지`} value="DB 연결 후" tone="danger" />
      </div>

      <section className={`${styles.summaryCard} ${danger ? styles.summaryDanger : ''}`}>
        <div className={styles.summaryBody}>
          <div className={styles.summaryHead}>
            <div><p className={styles.kicker}>AI 판정 요약</p><h2 className={styles.summaryTitle}>{site.name} · 최근 분석</h2></div>
            <span className={`${styles.statusChip} ${danger ? styles.statusChipDanger : ''}`}>{danger ? '위험' : '정상'}</span>
          </div>
          <div className={styles.summaryGrid}>
            <div className={`${styles.predictionPanel} ${latestPredictionDanger ? styles.predictionPanelDanger : ''}`}>
              <span className={styles.panelLabel}>최근 AI 판정</span>
              <strong>{latestLabel}</strong>
              <div className={styles.confidenceLine}>
                <span>판정 신뢰도</span><b>{site.aiConfidence}%</b>
              </div>
            </div>

            <div className={styles.probabilityPanel}>
              <span className={styles.panelLabel}>클래스별 확률</span>
              <div className={styles.probabilityItem}>
                <div><span>말벌</span><b>{probabilities.wasp}%</b></div>
                <span className={styles.probabilityTrack}><i className={styles.waspBar} style={{ width: `${probabilities.wasp}%` }} /></span>
              </div>
              <div className={styles.probabilityItem}>
                <div><span>말벌 아님</span><b>{probabilities.nonWasp}%</b></div>
                <span className={styles.probabilityTrack}><i className={styles.safeBar} style={{ width: `${probabilities.nonWasp}%` }} /></span>
              </div>
            </div>

            <div className={styles.analysisInfoPanel}>
              <span className={styles.panelLabel}>분석 정보</span>
              <dl>
                <div><dt>분석 시각</dt><dd>{site.lastAnalyzedAt}</dd></div>
                <div><dt>분석 구간</dt><dd>{duration}</dd></div>
                <div><dt>입력 출처</dt><dd>음원 Worker</dd></div>
              </dl>
            </div>
          </div>
          <p className={`${styles.conclusion} ${danger ? styles.dangerText : ''}`}>
            {danger
              ? '시스템 위험 상태입니다. 정상 판정이 3회 연속 확인되면 정상 상태로 복귀합니다.'
              : '시스템 정상 상태입니다. 말벌 판정이 3회 연속 확인되면 위험 상태로 전환합니다.'}
          </p>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <div><p className={styles.kicker}>최근 7일</p><h2 className={styles.cardTitle}>{site.name} · 말벌 감지 추이</h2></div>
          <span className={styles.pendingBadge}>DB 연결 후 제공</span>
        </div>
        <div className={`${styles.weekChart} ${styles.weekChartPending}`} aria-label="최근 7일 말벌 감지 추이 DB 연결 대기">
          {DAY_LABELS.map((label) => (
            <div className={styles.weekBarWrap} key={label}>
              <span className={styles.weekPlaceholderBar} />
              <small>{label}</small>
            </div>
          ))}
          <p>이력 DB 연결 후 일별 감지 건수가 표시됩니다.</p>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <div><p className={styles.kicker}>실시간 신호 분석</p><h2 className={styles.cardTitle}>최신 2초 구간 상세 결과</h2></div>
          <button type="button" className={styles.toggleButton} onClick={() => setShowDetail((value) => !value)}>
            {showDetail ? '상세 그래프 접기' : '상세 그래프 펼치기'}
          </button>
        </div>
        <p className={styles.cardDesc}>이 화면이 열려 있을 때만 최신 분석 ID가 바뀔 때 상세 그래프 데이터를 가져옵니다.</p>
      </section>

      {showDetail && (
        <section className={styles.detailGrid}>
          {!latestAnalysis && <p className={styles.liveNotice} role="status">{analysisError || 'Worker의 최신 분석 데이터를 기다리고 있습니다.'}</p>}
          {latestAnalysis && (
            <>
              <div className={styles.techBlock}>
                <div className={styles.techTitle}><span>1. Waveplot</span><small>시간 영역 진폭</small></div>
                <SignalLineChart xValues={latestAnalysis.waveform.time} yValues={latestAnalysis.waveform.amplitude} symmetric color="#2563eb" label="최신 음원의 시간 영역 파형" />
                <div className={styles.axisRow}><span>0초</span><span>{duration}</span></div>
              </div>
              <div className={styles.techBlock}>
                <div className={styles.techTitle}><span>2. FFT Spectrum</span><small>주파수별 상대 에너지</small></div>
                <SignalLineChart xValues={latestAnalysis.fft.frequency} yValues={latestAnalysis.fft.magnitudeDb} color="#0ea5e9" label="최신 음원의 FFT 스펙트럼" />
                <div className={styles.axisRow}><span>0 Hz</span><span>{Math.round(frequencyMax).toLocaleString()} Hz</span></div>
              </div>
              <div className={`${styles.techBlock} ${styles.liveChartWide}`}>
                <div className={styles.techTitle}><span>3. Mel-Spectrogram</span><small>전체 주파수 대역 · 128 Mel bins</small></div>
                <SignalHeatmap matrix={latestAnalysis.spectrogram.db} palette={MEL_PALETTE} label="전체 주파수 구간의 시간별 Mel 에너지" />
                <div className={styles.heatmapAxes}><span>세로: 0–{Math.round(melFrequencyMax).toLocaleString()} Hz</span><span>가로: 0–{duration}</span></div>
                <p className={styles.insight}>전체 주파수 대역을 표시합니다. 밝은 색일수록 해당 시간과 주파수 구간의 에너지가 큽니다.</p>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
