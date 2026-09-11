// AI 분석 - 사업장별 AI 판정, 7일 추이, 상세 신호 분석(Waveplot/FFT/Mel/MFCC)
import { useMemo, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { StatCard } from '../../components/StatCard';
import { AnalysisIcon, CheckCircleIcon, HistoryIcon, WarningIcon } from '../../components/Icons';
import { useMonitoring } from '../../data/MonitoringContext';
import type { Classification, Site } from '../../types';
import styles from './AIAnalysis.module.css';

const KOREAN_LABEL: Record<Classification, string> = { wasp: '말벌', bee: '꿀벌', other: '기타' };

const DURATION_BY_SITE: Record<number, string> = { 1: '18.0초', 2: '12.0초', 3: '15.0초' };
const DOMINANT_BAND_BY_SITE: Record<number, string> = {
  1: '약 0.8~1.5 kHz',
  2: '약 1.0~1.7 kHz',
  3: '약 1.5~2.2 kHz',
};
const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

function siteNumber(site: Site) {
  return Number(site.id.replace(/\D/g, '')) || 1;
}

// 확률 분포는 실제 API 연동 전까지 site.aiLabel / aiConfidence를 기반으로
// 결정적으로 파생시킨 값입니다(랜덤 없음 → 새로고침해도 값이 안정적).
function buildProbs(site: Site) {
  const conf = Math.max(0, Math.min(100, Math.round(site.aiConfidence)));
  const rest = 100 - conf;
  const other = Math.max(1, Math.round(rest * 0.35));
  const secondary = Math.max(0, rest - other);
  if (site.aiLabel === 'wasp') {
    return { wasp: conf, bee: secondary, other };
  }
  return { wasp: secondary, bee: conf, other };
}

// 최근 7일 말벌 감지 추이(데모용 결정적 패턴). 위험 사업장은 전반적으로 높게 표시됩니다.
function weeklyTrend(siteId: number, danger: boolean) {
  return DAY_LABELS.map((label, i) => {
    const base = ((i + 1) * (siteId + 3) * 7) % 60;
    const value = danger ? 35 + base : 8 + (base % 30);
    return { label, value: Math.min(96, value) };
  });
}

// Waveplot: 사업장별로 다른 시드를 사용해 서로 다른 파형처럼 보이도록 함
function waveBars(siteId: number) {
  return Array.from({ length: 42 }, (_, i) => {
    const t = i + siteId * 5;
    const v = Math.sin(t * 0.7) * 0.5 + Math.sin(t * 1.9 + siteId) * 0.3 + Math.sin(t * 0.31) * 0.2;
    return 12 + Math.abs(v) * 82;
  });
}

// FFT 스펙트럼: 낮은 주파수대에서 사업장별로 다른 위치에 에너지가 몰리도록 구성
function fftBars(siteId: number) {
  return Array.from({ length: 32 }, (_, i) => {
    const t = i / 31;
    const peak = 0.18 + siteId * 0.12;
    const v = Math.exp(-Math.pow((t - peak) * 5.5, 2)) * 0.85 + Math.sin(i * 0.9 + siteId) * 0.08;
    return Math.max(6, Math.min(100, 8 + v * 92));
  });
}

// Mel-Spectrogram: 시간 x 주파수 히트맵 (사업장별 시드로 패턴 변화)
function melCells(siteId: number) {
  const cols = 30;
  const rows = 10;
  return Array.from({ length: cols * rows }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const t = col / cols;
    const f = row / rows;
    const energy =
      Math.sin(t * 12 + f * 3 + siteId) * 0.4 +
      Math.sin(t * 4 - f * 8 + siteId * 2) * 0.35 +
      Math.cos(f * 10) * 0.25;
    return Math.max(0, Math.min(1, 0.5 + energy * 0.6 - f * 0.15));
  });
}

function heatColor(v: number) {
  const stops: [number, string][] = [
    [0, '#1a1033'],
    [0.35, '#5b1a63'],
    [0.6, '#b7325f'],
    [0.8, '#f0793c'],
    [1, '#fbdf6a'],
  ];
  for (let i = 0; i < stops.length - 1; i += 1) {
    const [p0, c0] = stops[i];
    const [p1, c1] = stops[i + 1];
    if (v >= p0 && v <= p1) return v - p0 < p1 - v ? c0 : c1;
  }
  return stops[stops.length - 1][1];
}

// MFCC: 음색 특징 벡터를 압축해 보여주는 작은 그리드
function mfccCells(siteId: number) {
  return Array.from({ length: 13 * 6 }, (_, i) => 0.18 + ((i * (siteId + 5)) % 10) / 12);
}

export function AIAnalysis() {
  const { sites, detectionEvents } = useMonitoring();
  const dangerSite = sites.find((s) => s.status === 'danger');
  const [selectedId, setSelectedId] = useState(dangerSite?.id ?? sites[0]?.id ?? '');
  const [showDetail, setShowDetail] = useState(true);

  const site = sites.find((s) => s.id === selectedId) ?? sites[0];
  const siteId = site ? siteNumber(site) : 1;
  const danger = site?.status === 'danger';

  const probs = useMemo(() => (site ? buildProbs(site) : { wasp: 0, bee: 0, other: 0 }), [site]);
  const week = useMemo(() => weeklyTrend(siteId, danger), [siteId, danger]);
  const wave = useMemo(() => waveBars(siteId), [siteId]);
  const fft = useMemo(() => fftBars(siteId), [siteId]);
  const mel = useMemo(() => melCells(siteId), [siteId]);
  const mfcc = useMemo(() => mfccCells(siteId), [siteId]);

  const latestEvent = detectionEvents.find((e) => e.siteName === site?.name);
  const duration = DURATION_BY_SITE[siteId] ?? '15.0초';
  const dominantBand = DOMINANT_BAND_BY_SITE[siteId] ?? '약 1.0~1.8 kHz';
  const dangerCountToday = sites.filter((s) => s.status === 'danger').length;
  const avgConfidence = Math.round(
    sites.reduce((sum, s) => sum + s.aiConfidence, 0) / (sites.length || 1),
  );

  if (!site) {
    return (
      <div>
        <PageHeader title="분석" description="사업장별 AI 판정과 음향 특징을 비교하고, 상세 신호 분석까지 확인하세요." />
        <p role="status">표시할 사업장이 없습니다.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="분석"
        description="사업장별 AI 판정과 음향 특징을 비교하고, 상세 신호 분석까지 확인하세요."
        action={
          <select
            aria-label="분석 대상 사업장 선택"
            className={styles.siteSelect}
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        }
      />

      <div className={styles.statRow}>
        <StatCard icon={AnalysisIcon} label="사업장 수" value={String(sites.length)} />
        <StatCard icon={WarningIcon} label="위험 판정" value={String(dangerCountToday)} tone="danger" />
        <StatCard icon={CheckCircleIcon} label="평균 신뢰도" value={`${avgConfidence}%`} tone="success" />
        <StatCard icon={HistoryIcon} label="모델 버전" value="v1.0.0" tone="muted" />
      </div>

      <section className={`${styles.summaryCard} ${danger ? styles.summaryDanger : ''}`}>
        <div className={styles.summaryVideo}>
          <video
            key={siteId}
            src={`${import.meta.env.BASE_URL}videos/site-${siteId}.mp4`}
            poster={`${import.meta.env.BASE_URL}images/${danger ? 'wasp' : 'honeybee'}.jpg`}
            autoPlay
            muted
            loop
            playsInline
            className={styles.summaryVideoEl}
          />
        </div>

        <div className={styles.summaryBody}>
          <div className={styles.summaryHead}>
            <div>
              <p className={styles.kicker}>AI 판정 요약</p>
              <h2 className={styles.summaryTitle}>{site.name} · 최근 분석</h2>
            </div>
            <span className={`${styles.statusChip} ${danger ? styles.statusChipDanger : ''}`}>
              {danger ? '위험' : '정상'}
            </span>
          </div>

          <div className={styles.resultRow}>
            <div>
              <span>최종 판정</span>
              <strong>{KOREAN_LABEL[site.aiLabel]}</strong>
            </div>
            <div>
              <span>신뢰도</span>
              <strong className={danger ? styles.dangerText : ''}>{site.aiConfidence}%</strong>
            </div>
          </div>

          <div className={styles.probRow}>
            <div>
              <span>말벌</span>
              <b>{probs.wasp}%</b>
            </div>
            <div>
              <span>꿀벌</span>
              <b>{probs.bee}%</b>
            </div>
            <div>
              <span>기타</span>
              <b>{probs.other}%</b>
            </div>
          </div>

          <div className={styles.metaRow}>
            <span>
              분석 시각 <b>{latestEvent?.time ?? site.lastAnalyzedAt}</b>
            </span>
            <span>
              음원 길이 <b>{duration}</b>
            </span>
            <span>
              입력 출처 <b>운영 데이터</b>
            </span>
          </div>

          <p className={`${styles.conclusion} ${danger ? styles.dangerText : ''}`}>
            {danger
              ? '말벌 특징이 강하게 검출되어 위험 상태로 판정되었고 출입문 자동 폐쇄 조건을 충족했습니다.'
              : '꿀벌 음향 패턴이 우세하며 위험 신호는 확인되지 않았습니다.'}
          </p>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <div>
            <p className={styles.kicker}>최근 7일</p>
            <h2 className={styles.cardTitle}>말벌 감지 주기</h2>
          </div>
        </div>
        <div className={styles.weekChart}>
          {week.map((d) => (
            <div key={d.label} className={styles.weekBarWrap}>
              <span className={styles.weekBar} style={{ height: `${d.value}%` }} />
              <small>{d.label}</small>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <div>
            <p className={styles.kicker}>신호 분석</p>
            <h2 className={styles.cardTitle}>상세 결과 분석</h2>
          </div>
        </div>
        <p className={styles.cardDesc}>
          Waveplot → FFT → Mel-Spectrogram → MFCC 순서로 원본 신호부터 AI 입력 특징까지 확인할 수 있습니다.
        </p>
        <button type="button" className={styles.toggleButton} onClick={() => setShowDetail((v) => !v)}>
          {showDetail ? '상세 그래프 접기' : '상세 그래프 펼치기'}
        </button>
      </section>

      {showDetail && (
        <section className={styles.detailGrid}>
          <div className={styles.techBlock}>
            <div className={styles.techTitle}>
              <span>1. Waveplot</span>
              <small>시간 영역 파형</small>
            </div>
            <svg viewBox="0 0 100 32" preserveAspectRatio="none" className={styles.waveSvg} aria-hidden="true">
              {wave.map((h, i) => {
                const barWidth = 100 / wave.length;
                const height = (h / 100) * 28;
                return (
                  <rect
                    key={i}
                    x={i * barWidth + barWidth * 0.15}
                    y={16 - height / 2}
                    width={barWidth * 0.7}
                    height={height}
                    rx={0.5}
                    fill="#f5a623"
                  />
                );
              })}
            </svg>
            <div className={styles.axisRow}>
              <span>0초</span>
              <span>5초</span>
              <span>10초</span>
              <span>{duration}</span>
            </div>
          </div>

          <div className={styles.techBlock}>
            <div className={styles.techTitle}>
              <span>2. FFT Spectrum</span>
              <small>주파수별 에너지 분포</small>
            </div>
            <div className={styles.fftChart}>
              {fft.map((h, i) => (
                <span key={i} className={styles.fftBar} style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className={styles.axisRow}>
              <span>0</span>
              <span>1k</span>
              <span>2k</span>
              <span>3k</span>
              <span>4k Hz</span>
            </div>
            <p className={styles.insight}>
              주요 에너지가 <b>{dominantBand}</b> 구간에 상대적으로 집중되어 있습니다.
            </p>
          </div>

          <div className={styles.techBlock}>
            <div className={styles.techTitle}>
              <span>3. Mel-Spectrogram</span>
              <small>CNN 입력 특징</small>
            </div>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={styles.melSvg} aria-hidden="true">
              {mel.map((v, i) => {
                const cols = 30;
                const cellW = 100 / cols;
                const cellH = 100 / 10;
                const col = i % cols;
                const row = Math.floor(i / cols);
                return (
                  <rect
                    key={i}
                    x={col * cellW}
                    y={row * cellH}
                    width={cellW + 0.5}
                    height={cellH + 0.5}
                    fill={heatColor(v)}
                  />
                );
              })}
            </svg>
            <div className={styles.axisRow}>
              <span>0초</span>
              <span>5초</span>
              <span>10초</span>
              <span>{duration}</span>
            </div>
          </div>

          <div className={styles.techBlock}>
            <div className={styles.techTitle}>
              <span>4. MFCC</span>
              <small>음색 특성 압축 벡터</small>
            </div>
            <div className={styles.mfccGrid}>
              {mfcc.map((opacity, i) => (
                <span key={i} style={{ opacity }} />
              ))}
            </div>
            <p className={styles.insight}>
              AI가 말벌·꿀벌·기타의 음색 차이를 비교하는 보조 특징값으로 사용합니다.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}