import { Link, useLocation } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { MEL_PALETTE, SignalHeatmap, SignalLineChart } from '../AIAnalysis/LiveAnalysisCharts';
import styles from './SoundTestDetail.module.css';

const LAST_TEST_KEY = 'buzz:last-test-analysis';
const MFCC_PALETTE = [[30,58,138],[59,130,246],[248,250,252],[239,68,68],[153,27,27]];

function loadCachedResult() {
  try {
    const raw = sessionStorage.getItem(LAST_TEST_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function SoundTestDetail() {
  const location = useLocation();
  const result = location.state?.result ?? loadCachedResult();
  if (!result) {
    return (
      <div>
        <PageHeader title="테스트 파일 상세보기" description="분석된 테스트 음원의 상세 신호를 확인합니다." />
        <section className={styles.emptyCard}>
          <h2>표시할 테스트 결과가 없습니다.</h2>
          <p>음원 테스트에서 파일을 먼저 분석한 뒤 상세보기를 열어주세요.</p>
          <Link to="/sound-test" className={styles.backButton}>음원 테스트로 돌아가기</Link>
        </section>
      </div>
    );
  }

  const wasp = result.prediction.label === 'wasp';
  const confidence = (Number(result.prediction.confidence) * 100).toFixed(1);
  const waspProb = (Number(result.prediction.probabilities.wasp) * 100).toFixed(1);
  const nonWaspProb = (Number(result.prediction.probabilities.non_wasp) * 100).toFixed(1);
  const duration = `${Number(result.audio.duration).toFixed(1)}초`;
  return (
    <div>
      <PageHeader title="테스트 파일 상세보기" description="FastAPI가 반환한 실제 파형·주파수·특징 데이터를 확인합니다." action={<Link to="/sound-test" className={styles.backButton}>← 테스트로 돌아가기</Link>} />

      <section className={`${styles.summaryCard} ${wasp ? styles.danger : ''}`}>
        <div><span>파일</span><strong>{result.audio.fileName}</strong></div>
        <div><span>판정</span><strong>{wasp ? '말벌' : '말벌 아님'}</strong></div>
        <div><span>신뢰도</span><strong>{confidence}%</strong></div>
        <div><span>말벌 / 비말벌</span><strong>{waspProb}% / {nonWaspProb}%</strong></div>
        <div><span>모델</span><strong>{result.meta.modelName}</strong></div>
        <div><span>분석 ID</span><strong className={styles.mono}>{result.analysisId}</strong></div>
      </section>

      <section className={styles.grid}>
        <article className={styles.chartCard}>
          <div className={styles.chartHead}><h2>1. Waveplot</h2><span>{duration}</span></div>
          <SignalLineChart xValues={result.waveform.time} yValues={result.waveform.amplitude} symmetric color="#2563eb" label="테스트 음원의 실제 시간 영역 파형" />
        </article>
        <article className={styles.chartCard}>
          <div className={styles.chartHead}><h2>2. FFT Spectrum</h2><span>주파수별 상대 크기(dB)</span></div>
          <SignalLineChart xValues={result.fft.frequency} yValues={result.fft.magnitudeDb} color="#0ea5e9" label="테스트 음원의 실제 FFT 스펙트럼" />
        </article>
        <article className={`${styles.chartCard} ${styles.wide}`}>
          <div className={styles.chartHead}><h2>3. Mel-Spectrogram</h2><span>CNN 입력 특징</span></div>
          <SignalHeatmap matrix={result.spectrogram.db} palette={MEL_PALETTE} label="테스트 음원의 실제 Mel Spectrogram" />
        </article>
        {result.mfcc?.coefficients && (
          <article className={`${styles.chartCard} ${styles.wide}`}>
            <div className={styles.chartHead}><h2>4. MFCC</h2><span>음색 특징 계수</span></div>
            <SignalHeatmap matrix={result.mfcc.coefficients} palette={MFCC_PALETTE} symmetric label="테스트 음원의 실제 MFCC" />
          </article>
        )}
      </section>
    </div>
  );
}
