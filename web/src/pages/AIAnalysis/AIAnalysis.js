import { useSearchParams } from 'react-router-dom';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// AI 분석 - 사업장별 AI 판정, 7일 추이, 상세 신호 분석(Waveplot/FFT/Mel/MFCC)
import { useMemo, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { StatCard } from '../../components/StatCard';
import { AnalysisIcon, CheckCircleIcon, HistoryIcon, WarningIcon } from '../../components/Icons';
import { useMonitoring } from '../../data/MonitoringContext';
import { DOMINANT_BAND_BY_SITE, DURATION_BY_SITE, buildProbs, fftBars, heatColor, melCells, mfccCells, siteNumberFromId, waveBars, } from '../../data/analysisCharts';
import styles from './AIAnalysis.module.css';
const KOREAN_LABEL = { wasp: '말벌', 'non-wasp': '말벌 아님' };
const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];
function siteNumber(site) {
    return siteNumberFromId(site.id);
}
// 최근 7일 말벌 감지 추이(데모용 결정적 패턴). 위험 사업장은 전반적으로 높게 표시됩니다.
function weeklyTrend(siteId, danger) {
    return DAY_LABELS.map((label, i) => {
        const base = ((i + 1) * (siteId + 3) * 7) % 60;
        const value = danger ? 35 + base : 8 + (base % 30);
        return { label, value: Math.min(96, value) };
    });
}
export function AIAnalysis() {
    const { sites, detectionEvents } = useMonitoring();
    const dangerSite = sites.find((s) => s.status === 'danger');
    const [searchParams] = useSearchParams();
    const [selectedId, setSelectedId] = useState(searchParams.get('site') ?? dangerSite?.id ?? sites[0]?.id ?? '');
    const [showDetail, setShowDetail] = useState(true);
    const site = sites.find((s) => s.id === selectedId) ?? sites[0];
    const siteId = site ? siteNumber(site) : 1;
    const danger = site?.status === 'danger';
    const probs = useMemo(() => (site ? buildProbs(site.aiLabel, site.aiConfidence) : { wasp: 0, nonWasp: 0 }), [site]);
    const week = useMemo(() => weeklyTrend(siteId, danger), [siteId, danger]);
    const wave = useMemo(() => waveBars(siteId), [siteId]);
    const fft = useMemo(() => fftBars(siteId), [siteId]);
    const mel = useMemo(() => melCells(siteId), [siteId]);
    const mfcc = useMemo(() => mfccCells(siteId), [siteId]);
    const latestEvent = detectionEvents.find((e) => e.siteName === site?.name);
    const duration = DURATION_BY_SITE[siteId] ?? '15.0초';
    const dominantBand = DOMINANT_BAND_BY_SITE[siteId] ?? '약 1.0~1.8 kHz';
    const dangerCountToday = sites.filter((s) => s.status === 'danger').length;
    const avgConfidence = Math.round(sites.reduce((sum, s) => sum + s.aiConfidence, 0) / (sites.length || 1));
    if (!site) {
        return (_jsxs("div", { children: [_jsx(PageHeader, { title: "\uBD84\uC11D", description: "\uC0AC\uC5C5\uC7A5\uBCC4 AI \uD310\uC815\uACFC \uC74C\uD5A5 \uD2B9\uC9D5\uC744 \uBE44\uAD50\uD558\uACE0, \uC0C1\uC138 \uC2E0\uD638 \uBD84\uC11D\uAE4C\uC9C0 \uD655\uC778\uD558\uC138\uC694." }), _jsx("p", { role: "status", children: "\uD45C\uC2DC\uD560 \uC0AC\uC5C5\uC7A5\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." })] }));
    }
    return (_jsxs("div", { children: [_jsx(PageHeader, { title: "\uBD84\uC11D", description: "\uC0AC\uC5C5\uC7A5\uBCC4 AI \uD310\uC815\uACFC \uC74C\uD5A5 \uD2B9\uC9D5\uC744 \uBE44\uAD50\uD558\uACE0, \uC0C1\uC138 \uC2E0\uD638 \uBD84\uC11D\uAE4C\uC9C0 \uD655\uC778\uD558\uC138\uC694.", action: _jsx("select", { "aria-label": "\uBD84\uC11D \uB300\uC0C1 \uC0AC\uC5C5\uC7A5 \uC120\uD0DD", className: styles.siteSelect, value: selectedId, onChange: (e) => setSelectedId(e.target.value), children: sites.map((s) => (_jsx("option", { value: s.id, children: s.name }, s.id))) }) }), _jsxs("div", { className: styles.statRow, children: [_jsx(StatCard, { icon: AnalysisIcon, label: "\uC624\uB298 \uBD84\uC11D", value: "128" }), _jsx(StatCard, { icon: WarningIcon, label: "\uB9D0\uBC8C \uAC10\uC9C0", value: String(dangerCountToday), tone: "danger" }), _jsx(StatCard, { icon: CheckCircleIcon, label: "\uD3C9\uADE0 \uC2E0\uB8B0\uB3C4", value: `${avgConfidence}%`, tone: "success" }), _jsx(StatCard, { icon: HistoryIcon, label: "\uBAA8\uB378 \uBC84\uC804", value: "v1.0.0", tone: "muted" })] }), _jsxs("section", { className: `${styles.summaryCard} ${danger ? styles.summaryDanger : ''}`, children: [_jsxs("div", { className: styles.summaryBody, children: [_jsxs("div", { className: styles.summaryHead, children: [_jsxs("div", { children: [_jsx("p", { className: styles.kicker, children: "AI \uD310\uC815 \uC694\uC57D" }), _jsxs("h2", { className: styles.summaryTitle, children: [site.name, " \u00B7 \uCD5C\uADFC \uBD84\uC11D"] })] }), _jsx("span", { className: `${styles.statusChip} ${danger ? styles.statusChipDanger : ''}`, children: danger ? '위험' : '정상' })] }), _jsxs("div", { className: styles.resultRow, children: [_jsxs("div", { children: [_jsx("span", { children: "\uCD5C\uC885 \uD310\uC815" }), _jsx("strong", { children: KOREAN_LABEL[site.aiLabel] })] }), _jsxs("div", { children: [_jsx("span", { children: "\uC2E0\uB8B0\uB3C4" }), _jsxs("strong", { className: danger ? styles.dangerText : '', children: [site.aiConfidence, "%"] })] })] }), _jsxs("div", { className: styles.probRow, children: [_jsxs("div", { children: [_jsx("span", { children: "\uB9D0\uBC8C" }), _jsxs("b", { children: [probs.wasp, "%"] })] }), _jsxs("div", { children: [_jsx("span", { children: "\uB9D0\uBC8C \uC544\uB2D8" }), _jsxs("b", { children: [probs.nonWasp, "%"] })] })] }), _jsxs("div", { className: styles.metaRow, children: [_jsxs("span", { children: ["\uBD84\uC11D \uC2DC\uAC01 ", _jsx("b", { children: latestEvent?.time ?? site.lastAnalyzedAt })] }), _jsxs("span", { children: ["\uC74C\uC6D0 \uAE38\uC774 ", _jsx("b", { children: duration })] }), _jsxs("span", { children: ["\uC785\uB825 \uCD9C\uCC98 ", _jsx("b", { children: "\uC6B4\uC601 \uB370\uC774\uD130" })] })] }), _jsx("p", { className: `${styles.conclusion} ${danger ? styles.dangerText : ''}`, children: danger
                                    ? '말벌 특징이 강하게 검출되어 위험 상태로 판정되었고 출입문 자동 폐쇄 조건을 충족했습니다.'
                                    : '말벌이 아닌 음향 패턴으로 판정되어 위험 신호는 확인되지 않았습니다.' })] })] }), _jsxs("section", { className: styles.card, children: [_jsx("div", { className: styles.cardHead, children: _jsxs("div", { children: [_jsx("p", { className: styles.kicker, children: "\uCD5C\uADFC 7\uC77C" }), _jsx("h2", { className: styles.cardTitle, children: "\uB9D0\uBC8C \uAC10\uC9C0 \uC8FC\uAE30" })] }) }), _jsx("div", { className: styles.weekChart, children: week.map((d) => (_jsxs("div", { className: styles.weekBarWrap, children: [_jsx("span", { className: styles.weekBar, style: { height: `${d.value}%` } }), _jsx("small", { children: d.label })] }, d.label))) })] }), _jsxs("section", { className: styles.card, children: [_jsx("div", { className: styles.cardHead, children: _jsxs("div", { children: [_jsx("p", { className: styles.kicker, children: "\uC2E0\uD638 \uBD84\uC11D" }), _jsx("h2", { className: styles.cardTitle, children: "\uC0C1\uC138 \uACB0\uACFC \uBD84\uC11D" })] }) }), _jsx("button", { type: "button", className: styles.toggleButton, onClick: () => setShowDetail((v) => !v), children: showDetail ? '상세 그래프 접기' : '상세 그래프 펼치기' })] }), showDetail && (_jsxs("section", { className: styles.detailGrid, children: [_jsxs("div", { className: styles.techBlock, children: [_jsxs("div", { className: styles.techTitle, children: [_jsx("span", { children: "1. Waveplot" }), _jsx("small", { children: "\uC2DC\uAC04 \uC601\uC5ED \uD30C\uD615" })] }), _jsx("svg", { viewBox: "0 0 100 32", preserveAspectRatio: "none", className: styles.waveSvg, "aria-hidden": "true", children: wave.map((h, i) => {
                                    const barWidth = 100 / wave.length;
                                    const height = (h / 100) * 28;
                                    return (_jsx("rect", { x: i * barWidth + barWidth * 0.15, y: 16 - height / 2, width: barWidth * 0.7, height: height, rx: 0.5, fill: "#f5a623" }, i));
                                }) }), _jsxs("div", { className: styles.axisRow, children: [_jsx("span", { children: "0\uCD08" }), _jsx("span", { children: "5\uCD08" }), _jsx("span", { children: "10\uCD08" }), _jsx("span", { children: duration })] })] }), _jsxs("div", { className: styles.techBlock, children: [_jsxs("div", { className: styles.techTitle, children: [_jsx("span", { children: "2. FFT Spectrum" }), _jsx("small", { children: "\uC8FC\uD30C\uC218\uBCC4 \uC5D0\uB108\uC9C0 \uBD84\uD3EC" })] }), _jsx("div", { className: styles.fftChart, children: fft.map((h, i) => (_jsx("span", { className: styles.fftBar, style: { height: `${h}%` } }, i))) }), _jsxs("div", { className: styles.axisRow, children: [_jsx("span", { children: "0" }), _jsx("span", { children: "1k" }), _jsx("span", { children: "2k" }), _jsx("span", { children: "3k" }), _jsx("span", { children: "4k Hz" })] }), _jsxs("p", { className: styles.insight, children: ["\uC8FC\uC694 \uC5D0\uB108\uC9C0\uAC00 ", _jsx("b", { children: dominantBand }), " \uAD6C\uAC04\uC5D0 \uC0C1\uB300\uC801\uC73C\uB85C \uC9D1\uC911\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4."] })] }), _jsxs("div", { className: styles.techBlock, children: [_jsxs("div", { className: styles.techTitle, children: [_jsx("span", { children: "3. Mel-Spectrogram" }), _jsx("small", { children: "CNN \uC785\uB825 \uD2B9\uC9D5" })] }), _jsx("svg", { viewBox: "0 0 100 100", preserveAspectRatio: "none", className: styles.melSvg, "aria-hidden": "true", children: mel.map((v, i) => {
                                    const cols = 30;
                                    const cellW = 100 / cols;
                                    const cellH = 100 / 10;
                                    const col = i % cols;
                                    const row = Math.floor(i / cols);
                                    return (_jsx("rect", { x: col * cellW, y: row * cellH, width: cellW + 0.5, height: cellH + 0.5, fill: heatColor(v) }, i));
                                }) }), _jsxs("div", { className: styles.axisRow, children: [_jsx("span", { children: "0\uCD08" }), _jsx("span", { children: "5\uCD08" }), _jsx("span", { children: "10\uCD08" }), _jsx("span", { children: duration })] })] }), _jsxs("div", { className: styles.techBlock, children: [_jsxs("div", { className: styles.techTitle, children: [_jsx("span", { children: "4. MFCC" }), _jsx("small", { children: "\uC74C\uC0C9 \uD2B9\uC131 \uC555\uCD95 \uBCA1\uD130" })] }), _jsx("div", { className: styles.mfccGrid, children: mfcc.map((opacity, i) => (_jsx("span", { style: { opacity } }, i))) }), _jsx("p", { className: styles.insight, children: "AI\uAC00 \uB9D0\uBC8C\uACFC \uB9D0\uBC8C \uC544\uB2D8 \uC74C\uC0C9 \uCC28\uC774\uB97C \uBE44\uAD50\uD558\uB294 \uBCF4\uC870 \uD2B9\uC9D5\uAC12\uC73C\uB85C \uC0AC\uC6A9\uD569\uB2C8\uB2E4." })] })] }))] }));
}

