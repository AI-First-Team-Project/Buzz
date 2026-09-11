import { useState } from 'react';
import { Link } from 'react-router-dom';
import { analyzeTestAudio, API_BASE_URL } from '../../api/buzzApi';
import { PageHeader } from '../../components/PageHeader';
import { CloseIcon, UploadMusicIcon } from '../../components/Icons';
import { MelSpectrogram } from './MelSpectrogram';
import { Waveform } from './Waveform';
import styles from './SoundTest.module.css';

const LAST_TEST_KEY = 'buzz:last-test-analysis';

export function SoundTest() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  function handleFileChange(event) {
    setSelectedFile(event.target.files?.[0] ?? null);
    setResult(null);
    setError('');
  }

  async function handleAnalyze() {
    if (!selectedFile || isAnalyzing) return;
    setIsAnalyzing(true);
    setError('');
    try {
      const analysis = await analyzeTestAudio(selectedFile);
      setResult(analysis);
      try { sessionStorage.setItem(LAST_TEST_KEY, JSON.stringify(analysis)); } catch { /* optional cache */ }
    } catch (analysisError) {
      setResult(null);
      setError(analysisError instanceof Error ? analysisError.message : '음원 분석에 실패했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div>
      <PageHeader title="음원 테스트" description="음원을 FastAPI로 전송해 실제 AI 분류 결과를 확인하세요." />
      <div className={`${styles.topGrid} ${result ? '' : styles.uploadOnly}`}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>음원 업로드</h2>
          <label className={styles.dropzone}>
            <input type="file" accept="audio/mpeg,audio/wav,.mp3,.wav" className={styles.hiddenInput} onChange={handleFileChange} disabled={isAnalyzing} />
            <UploadMusicIcon size={26} />
            <span className={styles.dropzoneText}>음원 파일을 놓아주세요</span>
            <span className={styles.dropzoneHint}>MP3 또는 WAV · 최대 30MB</span>
            <span className={styles.selectButton}>파일 선택</span>
          </label>

          {selectedFile && (
            <div className={styles.fileRow}>
              <Waveform amplitude={result?.waveform?.amplitude} className={styles.fileWaveform} />
              <span className={styles.fileName}>{selectedFile.name}</span>
              <span className={styles.fileDuration}>{result ? `${Number(result.audio.duration).toFixed(1)}초` : '분석 대기'}</span>
              <button type="button" className={styles.fileRemove} onClick={() => { setSelectedFile(null); setResult(null); setError(''); }} aria-label="파일 제거">
                <CloseIcon size={14} />
              </button>
            </div>
          )}

          <button type="button" className={styles.analyzeButton} onClick={handleAnalyze} disabled={!selectedFile || isAnalyzing}>
            {isAnalyzing ? 'AI 분석 중…' : '분석하기'}
          </button>
          <small className={styles.endpoint}>연결 서버: {API_BASE_URL || 'Docker Web proxy (/api)'}</small>
          {error && <p className={styles.error} role="alert">{error}</p>}
        </section>

        {result ? <AnalysisResult data={result} /> : <TestGuide />}
      </div>

      {result && (
        <div className={styles.chartGrid}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>오디오 파형</h2>
            <Waveform amplitude={result.waveform.amplitude} className={styles.bigChart} />
          </section>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Mel Spectrogram</h2>
            <MelSpectrogram matrix={result.spectrogram.db} className={styles.bigChart} />
          </section>
        </div>
      )}
    </div>
  );
}

function TestGuide() {
  const steps = [
    ['음원 업로드', 'MP3 또는 WAV 파일을 선택합니다.'],
    ['AI 분석', '파일 선택 후 분석하기를 누릅니다.'],
    ['결과 확인', '실제 CNN 판정과 파형을 확인합니다.'],
  ];
  return (
    <section className={`${styles.card} ${styles.guideCard}`}>
      <p className={styles.guideKicker}>BUZZ AI SOUND</p>
      <h2 className={styles.guideTitle}>음원을 올리면 실제 CNN으로 분석합니다</h2>
      <p className={styles.guideDescription}>FastAPI가 업로드 음원을 24kHz / mono / 2초 기준으로 처리해 말벌 여부를 판정합니다.</p>
      <ol className={styles.guideSteps}>
        {steps.map(([title, description], index) => (
          <li key={title}><span>{index + 1}</span><div><strong>{title}</strong><small>{description}</small></div></li>
        ))}
      </ol>
      <div className={styles.binaryInfo}><strong>이진분류 기준</strong><span>말벌 · 말벌 아님</span></div>
    </section>
  );
}

function AnalysisResult({ data }) {
  const wasp = data.prediction.label === 'wasp';
  const waspValue = Number((data.prediction.probabilities.wasp * 100).toFixed(1));
  const nonWaspValue = Number((data.prediction.probabilities.non_wasp * 100).toFixed(1));
  const confidence = Number((data.prediction.confidence * 100).toFixed(1));
  return (
    <section className={styles.card}>
      <div className={styles.resultHead}><h2 className={styles.cardTitle}>분석 결과</h2><span className={styles.exampleTag}>실제 분석 완료</span></div>
      <div className={styles.resultTop}>
        <div className={styles.resultLead}><span className={styles.resultLeadLabel}>{wasp ? '말벌' : '말벌 아님'}</span><span className={styles.resultLeadValue}>{confidence}%</span></div>
        <span className={wasp ? styles.dangerTag : styles.normalTag}>{wasp ? '위험 탐지' : '정상'}</span>
      </div>
      <div className={styles.breakdown}>
        <BreakdownBar label="말벌" value={waspValue} tone="danger" />
        <BreakdownBar label="말벌 아님" value={nonWaspValue} tone="brand" />
      </div>
      <div className={styles.metaRow}><span>분석 구간 {Number(data.audio.duration).toFixed(1)}초</span><span>사용 모델 {data.meta.modelName}</span></div>
      <Link to="/sound-test/detail" state={{ result: data }} className={styles.detailLink}>분석 상세 보기 →</Link>
    </section>
  );
}

function BreakdownBar({ label, value, tone }) {
  return (
    <div className={styles.breakdownRow}>
      <span className={styles.breakdownLabel}>{label}</span>
      <div className={styles.breakdownTrack}><div className={`${styles.breakdownFill} ${styles[tone]}`} style={{ width: `${value}%` }} /></div>
      <span className={styles.breakdownValue}>{value}%</span>
    </div>
  );
}
