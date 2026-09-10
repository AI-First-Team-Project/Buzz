import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// 사업장 - 목록 조회 및 검색
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../components/Badge';
import { PageHeader } from '../../components/PageHeader';
import { DoorIcon, SearchIcon } from '../../components/Icons';
import { useMonitoring } from '../../data/MonitoringContext';
import styles from './Worksites.module.css';
const KOREAN_LABEL = { wasp: '말벌 확률' };
export function Worksites() {
    const navigate = useNavigate();
    const { sites: monitoredSites } = useMonitoring();
    const sites = useMemo(() => monitoredSites.map((site) => ({
        ...site,
        aiLabel: 'wasp',
        aiConfidence: site.probabilities?.wasp ?? 0,
    })), [monitoredSites]);
    const [filter, setFilter] = useState('all');
    const [query, setQuery] = useState('');
    const normalCount = sites.filter((s) => s.status === 'normal').length;
    const dangerCount = sites.filter((s) => s.status === 'danger').length;
    const filteredSites = useMemo(() => {
        return sites
            .filter((s) => (filter === 'all' ? true : s.status === filter))
            .filter((s) => s.name.includes(query.trim()));
    }, [filter, query, sites]);
    return (_jsxs("div", { children: [_jsx(PageHeader, { title: "\uC0AC\uC5C5\uC7A5", description: "\uBAA8\uB4E0 \uC0AC\uC5C5\uC7A5\uC758 \uD604\uC7AC \uC0C1\uD0DC\uB97C \uD655\uC778\uD558\uC138\uC694.", action: _jsxs("div", { className: styles.searchBox, children: [_jsx(SearchIcon, { size: 15 }), _jsx("input", { value: query, onChange: (e) => setQuery(e.target.value), placeholder: "\uC0AC\uC5C5\uC7A5 \uAC80\uC0C9" })] }) }), _jsxs("div", { className: styles.siteSummary, children: [_jsxs("div", { children: [_jsx("b", { children: normalCount }), _jsx("span", { children: "정상" })] }), _jsxs("div", { className: styles.dangerCount, children: [_jsx("b", { children: dangerCount }), _jsx("span", { children: "위험" })] }), _jsxs("small", { children: ["총 ", sites.length, "개 사업장"] })] }), _jsxs("div", { className: styles.filterRow, children: [_jsxs("button", { type: "button", className: filter === 'all' ? styles.filterActive : styles.filter, onClick: () => setFilter('all'), children: ["\uC804\uCCB4 ", sites.length] }), _jsxs("button", { type: "button", className: filter === 'normal' ? styles.filterActive : styles.filter, onClick: () => setFilter('normal'), children: ["\uC815\uC0C1 ", normalCount] }), _jsxs("button", { type: "button", className: filter === 'danger' ? styles.filterActive : styles.filter, onClick: () => setFilter('danger'), children: ["\uC704\uD5D8 ", dangerCount] })] }), _jsx("div", { className: styles.grid, children: filteredSites.map((site) => (_jsxs("div", { className: styles.card, children: [_jsx("div", { className: styles.photo, children: _jsx("video", { src: `${import.meta.env.BASE_URL}videos/${site.id}.mp4`, className: styles.photoScene, autoPlay: true, muted: true, loop: true, playsInline: true }) }), _jsxs("div", { className: styles.cardBody, children: [_jsxs("div", { className: styles.cardHead, children: [_jsx("span", { className: styles.cardName, children: site.name }), _jsx(Badge, { tone: site.status === 'danger' ? 'danger' : 'success', children: site.status === 'danger' ? '위험' : '정상' })] }), _jsxs("div", { className: styles.metaRow, children: ["\uCD5C\uADFC AI \uD310\uC815: ", KOREAN_LABEL[site.aiLabel], " ", site.aiConfidence, "%"] }), _jsxs("div", { className: styles.metaRow, children: [_jsx(DoorIcon, { size: 13 }), " \uCD9C\uC785\uBB38:", ' ', _jsx("span", { className: site.door === 'closed' ? styles.doorClosed : styles.doorOpen, children: site.door === 'closed' ? '닫힘' : '열림' })] }), _jsxs("div", { className: styles.metaRow, children: ["\uCD5C\uADFC \uBD84\uC11D: ", site.lastAnalyzedAt] }), _jsx("button", { type: "button", className: styles.monitorButton, onClick: () => navigate(`/?site=${site.id}`), children: "\uBAA8\uB2C8\uD130\uB9C1 \uBCF4\uAE30" })] })] }, site.id))) }), _jsx("div", { className: styles.sectionTitle, children: "\uC0AC\uC5C5\uC7A5 \uC0C1\uD0DC \uC694\uC57D" }), _jsx("div", { className: styles.tableWrap, children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "\uC0AC\uC5C5\uC7A5" }), _jsx("th", { children: "\uAC10\uC9C0 \uC0C1\uD0DC" }), _jsx("th", { children: "AI \uC2E0\uB8B0\uB3C4" }), _jsx("th", { children: "\uCD9C\uC785\uBB38" }), _jsx("th", { children: "\uCD5C\uADFC \uBD84\uC11D" })] }) }), _jsx("tbody", { children: filteredSites.map((site) => (_jsxs("tr", { children: [_jsx("td", { children: site.name }), _jsx("td", { children: _jsx(Badge, { tone: site.status === 'danger' ? 'danger' : 'success', children: site.status === 'danger' ? '위험' : '정상' }) }), _jsxs("td", { children: [KOREAN_LABEL[site.aiLabel], " ", site.aiConfidence, "%"] }), _jsx("td", { className: site.door === 'closed' ? styles.doorClosed : styles.doorOpen, children: site.door === 'closed' ? '닫힘' : '열림' }), _jsx("td", { className: styles.mutedCell, children: site.lastAnalyzedAt })] }, site.id))) })] }) })] }));
}

