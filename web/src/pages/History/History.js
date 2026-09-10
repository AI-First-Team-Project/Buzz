// 감지 이력 - 10개 단위 페이지 목록과 이벤트 상세 모달
import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '../../components/Badge';
import { PageHeader } from '../../components/PageHeader';
import { StatCard } from '../../components/StatCard';
import { ChevronRightIcon, DoorIcon, HistoryIcon, WarningIcon } from '../../components/Icons';
import { useMonitoring } from '../../data/MonitoringContext';
import styles from './History.module.css';

const KOREAN_LABEL = { wasp: '말벌', 'non-wasp': '말벌 아님' };
const PAGE_SIZE = 10;
const PAGE_BUTTON_COUNT = 10;
const REPORT_END_DATE = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const REPORT_START_DATE = new Date(new Date(`${REPORT_END_DATE}T00:00:00`).getTime() - 6 * 86400000).toISOString().slice(0, 10);

function Probability({ label, value, danger = false }) {
  return _jsxs('div', { className: styles.probability, children: [
    _jsx('span', { children: label }),
    _jsx('div', { children: _jsx('i', { className: danger ? styles.probabilityDanger : '', style: { width: `${value}%` } }) }),
    _jsxs('b', { children: [value, '%'] }),
  ] });
}

function EventDetailModal({ event, onClose }) {
  const danger = event.kind === 'danger' || event.aiClassification === 'wasp';
  const wasp = event.probabilities?.wasp ?? (event.aiClassification === 'wasp' ? event.aiConfidence : 100 - event.aiConfidence);
  const nonWasp = event.probabilities?.nonWasp ?? (event.aiClassification === 'wasp' ? 100 - event.aiConfidence : event.aiConfidence);
  const flow = event.kind === 'danger'
    ? ['말벌 위험 감지', '위험 알림 기록', event.doorState === 'closed' ? '개폐기 자동 닫힘' : '운영자 확인 대기']
    : [event.label, `개폐기 ${event.doorState === 'closed' ? '닫힘' : '열림'}`, '이력에 제어 결과 저장'];

  return _jsx('div', {
    className: styles.detailOverlay, role: 'dialog', 'aria-modal': 'true', 'aria-label': '이력 상세', onClick: onClose,
    children: _jsxs('section', { className: styles.detailModal, onClick: (event) => event.stopPropagation(), children: [
      _jsxs('header', { className: styles.modalHead, children: [
        _jsxs('div', { children: [_jsx('p', { className: styles.kicker, children: '이력 상세' }), _jsx('h2', { children: event.label }), _jsxs('span', { children: [event.siteName, ' · ', event.time] })] }),
        _jsx('button', { type: 'button', onClick: onClose, 'aria-label': '닫기', children: '×' }),
      ] }),
      _jsx('p', { className: styles.modalIntro, children: '감지 당시의 AI 판정, 개폐기 상태와 동작 흐름을 확인합니다.' }),
      _jsxs('div', { className: `${styles.modalStatus} ${danger ? styles.modalDanger : styles.modalNormal}`, children: [_jsxs('div', { children: [_jsx('span', { children: 'AI 판정' }), _jsx('b', { children: KOREAN_LABEL[event.aiClassification] })] }), _jsxs('strong', { children: [event.aiConfidence, '%'] })] }),
      _jsxs('div', { className: styles.modalGrid, children: [
        _jsxs('div', { children: [_jsx('span', { children: '개폐기 상태' }), _jsx('b', { children: event.doorState === 'closed' ? '닫힘' : '열림' })] }),
        _jsxs('div', { children: [_jsx('span', { children: '이벤트' }), _jsx('b', { children: event.kind === 'danger' ? '위험 알림' : '개폐기 제어' })] }),
        _jsxs('div', { children: [_jsx('span', { children: '감지 시각' }), _jsx('b', { children: event.time })] }),
        _jsxs('div', { children: [_jsx('span', { children: '사업장' }), _jsx('b', { children: event.siteName })] }),
      ] }),
      _jsxs('section', { className: styles.modalSection, children: [_jsx('h3', { children: '이진분류 신뢰도' }), _jsx(Probability, { label: '말벌', value: wasp, danger: true }), _jsx(Probability, { label: '말벌 아님', value: nonWasp })] }),
      _jsxs('section', { className: styles.modalSection, children: [_jsx('h3', { children: '관련 이벤트 흐름' }), _jsx('div', { className: styles.eventFlow, children: flow.map((step, index) => _jsxs('div', { children: [_jsx('i', { className: danger ? styles.flowDanger : '', children: index + 1 }), _jsx('span', { children: step })] }, step)) })] }),
    ] }),
  });
}

function HistoryReportModal({ events, siteName, period, setPeriod, startDate, setStartDate, endDate, setEndDate, rangeStart, rangeEnd, onClose }) {
  const dangerCount = events.filter((event) => event.kind === 'danger').length;
  const doorCount = events.filter((event) => event.kind === 'door').length;
  const latest = events[0];
  const periodLabel = period === 'day' ? '하루' : period === 'week' ? '최근 일주일' : `${startDate} ~ ${endDate}`;
  const dailyReports = [];
  for (let day = new Date(`${rangeStart}T00:00:00Z`); day <= new Date(`${rangeEnd}T00:00:00Z`); day.setUTCDate(day.getUTCDate() + 1)) {
    const date = day.toISOString().slice(0, 10);
    const dayEvents = events.filter((event) => event.date === date);
    const dayDangerCount = dayEvents.filter((event) => event.kind === 'danger').length;
    const dayDoorCount = dayEvents.filter((event) => event.kind === 'door').length;
    dailyReports.push({ date, count: dayEvents.length, dangerCount: dayDangerCount, doorCount: dayDoorCount });
  }

  return _jsx('div', {
    className: styles.reportOverlay, role: 'dialog', 'aria-modal': 'true', 'aria-label': '이력 보고서', onClick: onClose,
    children: _jsxs('section', { className: styles.reportModal, onClick: (event) => event.stopPropagation(), children: [
      _jsxs('header', { className: styles.reportHead, children: [
        _jsxs('div', { children: [_jsx('p', { className: styles.kicker, children: '감지 이력 보고서' }), _jsx('h2', { children: siteName ?? '전체 사업장' })] }),
        _jsxs('div', { className: styles.reportHeadActions, children: [
          _jsx('button', { type: 'button', className: styles.printButton, onClick: () => window.print(), children: '출력하기' }),
          _jsx('button', { type: 'button', className: styles.closeButton, onClick: onClose, 'aria-label': '닫기', children: '×' }),
        ] }),
      ] }),
      _jsxs('div', { className: styles.reportControls, children: [
        _jsxs('label', { children: [_jsx('span', { children: '조회 기간' }), _jsxs('select', { value: period, onChange: (event) => setPeriod(event.target.value), children: [
          _jsx('option', { value: 'day', children: '하루' }),
          _jsx('option', { value: 'week', children: '최근 일주일' }),
          _jsx('option', { value: 'custom', children: '직접 지정' }),
        ] })] }),
        period === 'custom' && _jsxs('div', { className: styles.reportDateRange, children: [
          _jsx('input', { type: 'date', value: startDate, onChange: (event) => setStartDate(event.target.value), 'aria-label': '시작일' }),
          _jsx('span', { children: '–' }),
          _jsx('input', { type: 'date', value: endDate, onChange: (event) => setEndDate(event.target.value), 'aria-label': '종료일' }),
        ] }),
      ] }),
      _jsxs('section', { className: styles.reportPaper, children: [
        _jsxs('div', { className: styles.reportPaperHead, children: [_jsx('span', { children: periodLabel }), _jsx('span', { children: siteName ?? '전체 사업장' })] }),
        _jsx('h3', { children: '감지·출입문 운영 요약' }),
        _jsxs('div', { className: styles.reportStats, children: [
          _jsxs('div', { children: [_jsx('span', { children: '전체 이벤트' }), _jsx('b', { children: events.length })] }),
          _jsxs('div', { className: styles.reportDanger, children: [_jsx('span', { children: '위험 알림' }), _jsx('b', { children: dangerCount })] }),
          _jsxs('div', { children: [_jsx('span', { children: '문 제어' }), _jsx('b', { children: doorCount })] }),
        ] }),
        _jsxs('div', { className: styles.reportFinding, children: [
          _jsx('span', { children: '최근 상태' }),
          _jsx('b', { children: latest ? `${latest.siteName} · ${latest.label}` : '조회된 이력이 없습니다.' }),
          _jsx('p', { children: dangerCount > 0 ? `위험 알림 ${dangerCount}건이 기록되어 출입문 동작 이력을 함께 확인해야 합니다.` : '위험 알림 없이 안정적으로 운영되고 있습니다.' }),
        ] }),
        _jsxs('section', { className: styles.dailyReport, children: [
          _jsx('h4', { children: '일별 보고' }),
          _jsx('div', { className: styles.dailyReportList, children: dailyReports.map((day) => _jsxs('div', { children: [
            _jsx('b', { children: day.date }),
            _jsxs('span', { children: ['이벤트 ', day.count, '건'] }),
            _jsxs('span', { className: day.dangerCount ? styles.dailyDanger : '', children: ['위험 ', day.dangerCount, '건'] }),
            _jsxs('span', { children: ['문 제어 ', day.doorCount, '건'] }),
            _jsx('small', { children: day.count ? (day.dangerCount ? '위험 감지 이력 확인 필요' : '정상 운영 기록') : '기록 없음' }),
          ] }, day.date)) }),
        ] }),
      ] }),
    ] }),
  });
}

export function History() {
  const { detectionEvents, sites } = useMonitoring();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportPeriod, setReportPeriod] = useState('week');
  const [reportStartDate, setReportStartDate] = useState(REPORT_START_DATE);
  const [reportEndDate, setReportEndDate] = useState(REPORT_END_DATE);
  const siteId = params.get('site') ?? 'all';
  const selectedSiteName = sites.find((site) => site.id === siteId)?.name;
  const detail = detectionEvents.find((event) => event.id === selectedEvent);
  const filteredEvents = useMemo(() => detectionEvents
    .filter((event) => filter === 'all' || event.kind === filter)
    .filter((event) => siteId === 'all' || event.siteName === selectedSiteName), [detectionEvents, filter, siteId, selectedSiteName]);
  const pageCount = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageEvents = filteredEvents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pageGroupStart = Math.floor((currentPage - 1) / PAGE_BUTTON_COUNT) * PAGE_BUTTON_COUNT + 1;
  const pageNumbers = Array.from({ length: Math.min(PAGE_BUTTON_COUNT, pageCount - pageGroupStart + 1) }, (_, index) => pageGroupStart + index);
  const dangerCount = detectionEvents.filter((event) => event.kind === 'danger').length;
  const doorCount = detectionEvents.filter((event) => event.kind === 'door').length;
  const reportRange = useMemo(() => {
    const end = reportPeriod === 'custom' ? reportEndDate : REPORT_END_DATE;
    const start = reportPeriod === 'day'
      ? end
      : reportPeriod === 'week'
        ? new Date(new Date(`${end}T00:00:00`).getTime() - 6 * 86400000).toISOString().slice(0, 10)
        : reportStartDate;
    return { start, end };
  }, [reportPeriod, reportStartDate, reportEndDate]);
  const reportEvents = useMemo(() => {
    const { start, end } = reportRange;
    return filteredEvents.filter((event) => {
      const eventDate = event.date;
      return eventDate >= start && eventDate <= end;
    });
  }, [filteredEvents, reportRange]);

  useEffect(() => setPage(1), [filter, siteId]);

  return _jsxs('div', { className: styles.historyPage, children: [
    _jsx(PageHeader, { title: '감지 이력', description: '위험 감지와 출입문 동작을 확인하세요.' }),
    _jsxs('div', { className: styles.statRow, children: [
      _jsx(StatCard, { icon: HistoryIcon, label: '전체 이벤트', value: String(detectionEvents.length) }),
      _jsx(StatCard, { icon: WarningIcon, label: '위험', value: String(dangerCount), tone: 'danger' }),
      _jsx(StatCard, { icon: DoorIcon, label: '문 제어', value: String(doorCount), tone: 'success' }),
    ] }),
    _jsxs('div', { className: styles.controlRow, children: [
      _jsxs('div', { className: styles.filterRow, children: [
        _jsx('button', { type: 'button', className: filter === 'all' ? styles.filterActive : styles.filter, onClick: () => setFilter('all'), children: '전체' }),
        _jsx('button', { type: 'button', className: filter === 'danger' ? styles.filterActive : styles.filter, onClick: () => setFilter('danger'), children: '위험' }),
        _jsx('button', { type: 'button', className: filter === 'door' ? styles.filterActive : styles.filter, onClick: () => setFilter('door'), children: '문 제어' }),
      ] }),
      _jsxs('div', { className: styles.reportActions, children: [
        _jsx('select', { className: styles.select, 'aria-label': '이력 사업장', value: siteId, onChange: (event) => setParams(event.target.value === 'all' ? {} : { site: event.target.value }), children: [
          _jsx('option', { value: 'all', children: '전체 사업장' }), _jsx('option', { value: 'site-1', children: '사업장 1' }), _jsx('option', { value: 'site-2', children: '사업장 2' }), _jsx('option', { value: 'site-3', children: '사업장 3' }),
        ] }),
        _jsx('button', { type: 'button', className: styles.reportButton, onClick: () => setReportOpen(true), children: '보고서 보기' }),
      ] }),
    ] }),
    _jsxs('div', { className: styles.tableWrap, children: [
      _jsxs('table', { children: [
        _jsx('thead', { children: _jsxs('tr', { children: [_jsx('th', { children: '발생 시간' }), _jsx('th', { children: '사업장' }), _jsx('th', { children: '이벤트' }), _jsx('th', { children: 'AI 판정' }), _jsx('th', { children: '문 상태' }), _jsx('th', { 'aria-label': '상세' })] }) }),
        _jsx('tbody', { children: pageEvents.map((event) => _jsxs('tr', { children: [
          _jsx('td', { className: styles.timeCell, children: event.time }), _jsx('td', { children: event.siteName }),
          _jsx('td', { children: _jsxs('div', { className: styles.eventCell, children: [_jsx(Badge, { tone: event.kind === 'danger' ? 'danger' : 'info', children: event.kind === 'danger' ? '위험' : event.kind === 'door' ? '문 제어' : '정상 감지' }), _jsx('span', { children: event.label })] }) }),
          _jsxs('td', { children: [KOREAN_LABEL[event.aiClassification], ' ', event.aiConfidence, '%'] }),
          _jsx('td', { className: event.doorState === 'closed' ? styles.doorClosed : styles.doorOpen, children: event.doorState === 'closed' ? '닫힘' : '열림' }),
          _jsx('td', { children: _jsxs('button', { type: 'button', className: styles.detailButton, 'aria-label': `${event.siteName} ${event.time} 상세`, onClick: () => setSelectedEvent(event.id), children: [_jsx('span', { children: '상세' }), _jsx(ChevronRightIcon, { size: 16 })] }) }),
        ] }, event.id)) }),
      ] }),
      _jsxs('div', { className: styles.tableFooter, children: [
        _jsxs('span', { children: ['총 ', filteredEvents.length, '개 이벤트 · ', currentPage, '/', pageCount, ' 페이지'] }),
        _jsxs('div', { className: styles.pagination, children: [
          _jsx('button', { type: 'button', disabled: pageGroupStart === 1, onClick: () => setPage(pageGroupStart - 1), 'aria-label': '이전 페이지 묶음', children: _jsx(ChevronRightIcon, { size: 14, style: { transform: 'rotate(180deg)' } }) }),
          pageNumbers.map((number) => _jsx('button', { type: 'button', className: number === currentPage ? styles.pageNumber : styles.pageButton, onClick: () => setPage(number), 'aria-label': `${number}페이지`, 'aria-current': number === currentPage ? 'page' : undefined, children: number }, number)),
          _jsx('button', { type: 'button', disabled: pageGroupStart + PAGE_BUTTON_COUNT > pageCount, onClick: () => setPage(pageGroupStart + PAGE_BUTTON_COUNT), 'aria-label': '다음 페이지 묶음', children: _jsx(ChevronRightIcon, { size: 14 }) }),
        ] }),
      ] }),
    ] }),
    detail && _jsx(EventDetailModal, { event: detail, onClose: () => setSelectedEvent(null) }),
    reportOpen && _jsx(HistoryReportModal, { events: reportEvents, siteName: selectedSiteName, period: reportPeriod, setPeriod: setReportPeriod, startDate: reportStartDate, setStartDate: setReportStartDate, endDate: reportEndDate, setEndDate: setReportEndDate, rangeStart: reportRange.start, rangeEnd: reportRange.end, onClose: () => setReportOpen(false) }),
  ] });
}
