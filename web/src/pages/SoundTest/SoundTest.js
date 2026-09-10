// 사운드 테스트 - 음원 업로드와 말벌 이진분류 화면
import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useMemo, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { CloseIcon, UploadMusicIcon } from '../../components/Icons';
import { MelSpectrogram } from './MelSpectrogram';
import { Waveform } from './Waveform';
import styles from './SoundTest.module.css';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

export function SoundTest() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState('');
  const waveformSeed = useMemo(() => Array.from({ length: 64 }, (_, index) => index), []);

  function handleFileChange(event) {
    setSelectedFile(event.target.files?.[0] ?? null);
    setAnalysisResult(null);
    setError('');
  }

  async function handleAnalyze() {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    setError('');
    try {
      const body = new FormData();
      body.append('file', selectedFile);
      const response = await fetch(`${API_BASE_URL}/api/test/analyze`, { method: 'POST', body });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.detail || `분석 요청 실패 (${response.status})`);
      setAnalysisResult(data);
    } catch (requestError) {
      setAnalysisResult(null);
      setError(requestError instanceof Error ? requestError.message : '서버에 연결할 수 없습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  return _jsxs('div', { children: [
    _jsx(PageHeader, { title: '음원 테스트', description: '음원을 업로드하고 AI 분류 결과를 확인하세요.' }),
    _jsxs('div', { className: `${styles.topGrid} ${analysisResult ? '' : styles.uploadOnly}`, children: [
      _jsxs('section', { className: styles.card, children: [
        _jsx('h2', { className: styles.cardTitle, children: '음원 업로드' }),
        _jsxs('label', { className: styles.dropzone, children: [
          _jsx('input', { type: 'file', accept: 'audio/mpeg,audio/wav', className: styles.hiddenInput, onChange: handleFileChange }),
          _jsx(UploadMusicIcon, { size: 26 }),
          _jsx('span', { className: styles.dropzoneText, children: '음원 파일을 놓아주세요' }),
          _jsx('span', { className: styles.dropzoneHint, children: 'MP3 또는 WAV' }),
          _jsx('span', { className: styles.selectButton, children: '파일 선택' }),
        ] }),
        selectedFile && _jsxs('div', { className: styles.fileRow, children: [
          _jsx(Waveform, { seed: waveformSeed, className: styles.fileWaveform }),
          _jsx('span', { className: styles.fileName, children: selectedFile.name }),
          _jsx('span', { className: styles.fileDuration, children: analysisResult ? `${analysisResult.audio.duration.toFixed(1)}초` : '' }),
          _jsx('button', { type: 'button', className: styles.fileRemove, onClick: () => { setSelectedFile(null); setAnalysisResult(null); setError(''); }, 'aria-label': '파일 제거', children: _jsx(CloseIcon, { size: 14 }) }),
        ] }),
        _jsx('button', { type: 'button', className: styles.analyzeButton, onClick: handleAnalyze, disabled: !selectedFile || isAnalyzing, children: isAnalyzing ? '분석 중…' : '분석하기' }),
      ] }),
      analysisResult ? _jsx(AnalysisResult, { result: analysisResult }) : _jsx(TestGuide, {}),
    ] }),
    error && _jsx('p', { className: styles.errorMessage, role: 'alert', children: error }),
    analysisResult && _jsxs('div', { className: styles.chartGrid, children: [
      _jsxs('section', { className: styles.card, children: [_jsx('h2', { className: styles.cardTitle, children: '오디오 파형' }), _jsx(Waveform, { values: analysisResult.waveform.amplitude, className: styles.bigChart })] }),
      _jsxs('section', { className: styles.card, children: [_jsx('h2', { className: styles.cardTitle, children: 'Mel Spectrogram' }), _jsx(MelSpectrogram, { db: analysisResult.spectrogram.db, className: styles.bigChart })] }),
    ] }),
  ] });
}

function TestGuide() {
  const steps = [
    ['음원 업로드', 'MP3 또는 WAV 파일을 선택합니다.'],
    ['AI 분석', '파일 선택 후 분석하기를 누릅니다.'],
    ['결과 확인', '신뢰도와 파형을 확인합니다.'],
  ];
  return _jsxs('section', { className: `${styles.card} ${styles.guideCard}`, children: [
    _jsx('p', { className: styles.guideKicker, children: 'BUZZ AI SOUND' }),
    _jsx('h2', { className: styles.guideTitle, children: '음원을 올리면 바로 분석합니다' }),
    _jsx('p', { className: styles.guideDescription, children: '수집한 음원을 AI가 말벌 여부로 이진분류합니다.' }),
    _jsx('ol', { className: styles.guideSteps, children: steps.map(([title, description], index) => _jsxs('li', { children: [
      _jsx('span', { children: index + 1 }),
      _jsxs('div', { children: [_jsx('strong', { children: title }), _jsx('small', { children: description })] }),
    ] }, title)) }),
    _jsxs('div', { className: styles.binaryInfo, children: [_jsx('strong', { children: '이진분류 기준' }), _jsx('span', { children: '말벌 · 말벌 아님' })] }),
  ] });
}

function AnalysisResult({ result }) {
  const wasp = result.prediction.probabilities.wasp * 100;
  const nonWasp = result.prediction.probabilities.non_wasp * 100;
  const isWasp = result.prediction.label === 'wasp';
  const label = isWasp ? '말벌' : '말벌 아님';
  return _jsxs('section', { className: styles.card, children: [
    _jsxs('div', { className: styles.resultHead, children: [_jsx('h2', { className: styles.cardTitle, children: '분석 결과' }), _jsx('span', { className: styles.exampleTag, children: '분석 완료' })] }),
    _jsxs('div', { className: styles.resultTop, children: [_jsxs('div', { className: styles.resultLead, children: [_jsx('span', { className: styles.resultLeadLabel, children: label }), _jsxs('span', { className: styles.resultLeadValue, children: [(result.prediction.confidence * 100).toFixed(1), '%'] })] }), _jsx('span', { className: styles.dangerTag, children: isWasp ? '위험 탐지' : '정상' })] }),
    _jsxs('div', { className: styles.breakdown, children: [_jsx(BreakdownBar, { label: '말벌', value: wasp, tone: 'danger' }), _jsx(BreakdownBar, { label: '정상', value: nonWasp, tone: 'brand' })] }),
    _jsxs('div', { className: styles.metaRow, children: [_jsxs('span', { children: ['모델 ', result.meta.modelName] }), _jsxs('span', { children: ['분석 시각 ', new Date(result.meta.timestamp).toLocaleString('ko-KR')] })] }),
    _jsx('a', { href: '#detail', className: styles.detailLink, children: '분석 상세 보기 →' }),
  ] });
}

function BreakdownBar({ label, value, tone }) {
  return _jsxs('div', { className: styles.breakdownRow, children: [
    _jsx('span', { className: styles.breakdownLabel, children: label }),
    _jsx('div', { className: styles.breakdownTrack, children: _jsx('div', { className: `${styles.breakdownFill} ${styles[tone]}`, style: { width: `${value}%` } }) }),
    _jsxs('span', { className: styles.breakdownValue, children: [value.toFixed(1), '%'] }),
  ] });
}
