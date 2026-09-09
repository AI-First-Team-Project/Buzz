// 감지 이력 - 10개 단위 페이지 목록과 이벤트 상세 모달
import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '../../components/Badge';
import { PageHeader } from '../../components/PageHeader';
import { ChevronRightIcon } from '../../components/Icons';
import { useMonitoring } from '../../data/MonitoringContext';
import styles from './History.module.css';

const KOREAN_LABEL = { wasp: '말벌', 'non-wasp': '말벌 아님' };
const PAGE_SIZE = 10;
const PAGE_BUTTON_COUNT = 10;

function Probability({ label, value, danger = false }) {
  return _jsxs('div', { className: styles.probability, children: [
    _jsx('span', { children: label }),
    _jsx('div', { children: _jsx('i', { className: danger ? styles.probabilityDanger : '', style: { width: `${value}%` } }) }),
    _jsxs('b', { children: [value, '%'] }),
  ] });
}

function EventDetailModal({ event, onClose }) {
  const danger = event.kind === 'danger' || event.aiClassification === 'wasp';
  const nonWasp = 100 - event.aiConfidence;
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
      _jsxs('section', { className: styles.modalSection, children: [_jsx('h3', { children: '이진분류 신뢰도' }), _jsx(Probability, { label: '말벌', value: event.aiClassification === 'wasp' ? event.aiConfidence : nonWasp, danger: true }), _jsx(Probability, { label: '말벌 아님', value: event.aiClassification === 'wasp' ? nonWasp : event.aiConfidence })] }),
      _jsxs('section', { className: styles.modalSection, children: [_jsx('h3', { children: '관련 이벤트 흐름' }), _jsx('div', { className: styles.eventFlow, children: flow.map((step, index) => _jsxs('div', { children: [_jsx('i', { className: danger ? styles.flowDanger : '', children: index + 1 }), _jsx('span', { children: step })] }, step)) })] }),
    ] }),
  });
}

export function History() {
  const { detectionEvents, sites } = useMonitoring();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState(null);
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

  useEffect(() => setPage(1), [filter, siteId]);

  return _jsxs('div', { className: styles.historyPage, children: [
    _jsx(PageHeader, { title: '감지 이력', description: '위험 감지와 출입문 동작을 확인하세요.' }),
    _jsxs('div', { className: styles.statRow, children: [
      _jsxs('div', { children: [_jsx('span', { children: '전체 이벤트' }), _jsx('b', { children: String(detectionEvents.length) })] }),
      _jsxs('div', { className: styles.dangerStat, children: [_jsx('span', { children: '위험' }), _jsx('b', { children: String(dangerCount) })] }),
      _jsxs('div', { children: [_jsx('span', { children: '문 제어' }), _jsx('b', { children: String(doorCount) })] }),
    ] }),
    _jsxs('div', { className: styles.controlRow, children: [
      _jsxs('div', { className: styles.filterRow, children: [
        _jsx('button', { type: 'button', className: filter === 'all' ? styles.filterActive : styles.filter, onClick: () => setFilter('all'), children: '전체' }),
        _jsx('button', { type: 'button', className: filter === 'danger' ? styles.filterActive : styles.filter, onClick: () => setFilter('danger'), children: '위험' }),
        _jsx('button', { type: 'button', className: filter === 'door' ? styles.filterActive : styles.filter, onClick: () => setFilter('door'), children: '문 제어' }),
      ] }),
      _jsx('select', { className: styles.select, 'aria-label': '이력 사업장', value: siteId, onChange: (event) => setParams(event.target.value === 'all' ? {} : { site: event.target.value }), children: [
        _jsx('option', { value: 'all', children: '전체 사업장' }), _jsx('option', { value: 'site-1', children: '사업장 1' }), _jsx('option', { value: 'site-2', children: '사업장 2' }), _jsx('option', { value: 'site-3', children: '사업장 3' }),
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
  ] });
}
