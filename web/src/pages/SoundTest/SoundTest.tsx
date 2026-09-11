// 사운드 테스트 - 음원 선택 및 분석 화면
import { useMemo, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { CloseIcon, UploadMusicIcon } from '../../components/Icons';
import type { ClassificationBreakdown } from '../../types';
import { MelSpectrogram } from './MelSpectrogram';
import { Waveform } from './Waveform';
import styles from './SoundTest.module.css';

const EXAMPLE_FILE_NAME = 'wasp_sample.wav';
const EXAMPLE_DURATION = '2초';
const EXAMPLE_ANALYZED_AT = '2026.09.08 14:30:25';

const EXAMPLE_RESULT: ClassificationBreakdown = { wasp: 97, bee: 2, other: 1 };

export function SoundTest() {
  const [selectedFile, setSelectedFile] = useState<string | null>(EXAMPLE_FILE_NAME);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const waveformSeed = useMemo(() => Array.from({ length: 64 }, (_, i) => i), []);

  function handleAnalyze() {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    window.setTimeout(() => setIsAnalyzing(false), 900);
  }

  return (
    <div>
      <PageHeader
        title="음원 테스트"
        description="음원을 업로드하고 AI 분류 결과를 확인하세요."
        action={<button className={styles.exampleLink}>예시 분석 결과</button>}
      />

      <div className={styles.topGrid}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>음원 업로드</h2>
          <label className={styles.dropzone}>
            <input
              type="file"
              accept="audio/mpeg,audio/wav"
              className={styles.hiddenInput}
              onChange={(e) => setSelectedFile(e.target.files?.[0]?.name ?? selectedFile)}
            />
            <UploadMusicIcon size={26} />
            <span className={styles.dropzoneText}>음원 파일을 놓아주세요</span>
            <span className={styles.dropzoneHint}>MP3 또는 WAV</span>
            <span className={styles.selectButton}>파일 선택</span>
          </label>

          {selectedFile && (
            <div className={styles.fileRow}>
              <Waveform seed={waveformSeed} className={styles.fileWaveform} />
              <span className={styles.fileName}>{selectedFile}</span>
              <span className={styles.fileDuration}>{EXAMPLE_DURATION}</span>
              <button
                type="button"
                className={styles.fileRemove}
                onClick={() => setSelectedFile(null)}
                aria-label="파일 제거"
              >
                <CloseIcon size={14} />
              </button>
            </div>
          )}

          <button
            type="button"
            className={styles.analyzeButton}
            onClick={handleAnalyze}
            disabled={!selectedFile || isAnalyzing}
          >
            {isAnalyzing ? '분석 중…' : '분석하기'}
          </button>
        </section>

        <section className={styles.card}>
          <div className={styles.resultHead}>
            <h2 className={styles.cardTitle}>분석 결과</h2>
            <span className={styles.exampleTag}>예시</span>
          </div>

          <div className={styles.resultTop}>
            <div className={styles.resultLead}>
              <span className={styles.resultLeadLabel}>말벌</span>
              <span className={styles.resultLeadValue}>{EXAMPLE_RESULT.wasp}%</span>
            </div>
            <span className={styles.dangerTag}>위험 탐지</span>
          </div>

          <div className={styles.breakdown}>
            <BreakdownBar label="말벌" value={EXAMPLE_RESULT.wasp} tone="danger" />
            <BreakdownBar label="꿀벌" value={EXAMPLE_RESULT.bee} tone="brand" />
            <BreakdownBar label="기타" value={EXAMPLE_RESULT.other} tone="muted" />
          </div>

          <div className={styles.metaRow}>
            <span>소요 시간 {EXAMPLE_DURATION}</span>
            <span>분석 시각 {EXAMPLE_ANALYZED_AT}</span>
          </div>

          <a href="#detail" className={styles.detailLink}>
            분석 상세 보기 →
          </a>
        </section>
      </div>

      <div className={styles.chartGrid}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>오디오 파형</h2>
          <Waveform seed={waveformSeed} className={styles.bigChart} />
        </section>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Mel Spectrogram</h2>
          <MelSpectrogram className={styles.bigChart} />
        </section>
      </div>
    </div>
  );
}

function BreakdownBar({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'danger' | 'brand' | 'muted';
}) {
  return (
    <div className={styles.breakdownRow}>
      <span className={styles.breakdownLabel}>{label}</span>
      <div className={styles.breakdownTrack}>
        <div className={`${styles.breakdownFill} ${styles[tone]}`} style={{ width: `${value}%` }} />
      </div>
      <span className={styles.breakdownValue}>{value}%</span>
    </div>
  );
}
