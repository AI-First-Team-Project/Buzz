import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// 설정 - 감지 및 자동 제어 옵션
import { useMonitoring } from '../../data/MonitoringContext';
import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { Toggle } from '../../components/Toggle';
import { CheckCircleIcon, CloseIcon, WarningIcon } from '../../components/Icons';
import styles from './Settings.module.css';
const AUTO_CLOSE_MIN = 60;
const AUTO_CLOSE_MAX = 99;
export function Settings() {
    const { settings, saveSettings } = useMonitoring();
    const [toast, setToast] = useState(null);
    const [waspAlert, setWaspAlert] = useState(settings.waspAlert);
    const [vibration, setVibration] = useState(true);
    const [autoClose, setAutoClose] = useState(true);
    const [autoCloseThreshold, setAutoCloseThreshold] = useState(settings.autoCloseThreshold);
    const hideTimer = useRef();
    const handleSave = () => {
        const ok = saveSettings({ waspAlert, vibration, autoClose, autoCloseThreshold });
        setToast(ok
            ? { type: 'success', message: '설정이 저장되었습니다.' }
            : { type: 'error', message: '설정을 저장할 수 없습니다. 브라우저 저장소를 확인하세요.' });
    };
    useEffect(() => {
        if (!toast)
            return;
        window.clearTimeout(hideTimer.current);
        hideTimer.current = window.setTimeout(() => setToast(null), 3200);
        return () => window.clearTimeout(hideTimer.current);
    }, [toast]);
    return (_jsxs("div", { children: [_jsx(PageHeader, { title: "\uC124\uC815", description: "\uC54C\uB9BC\uACFC \uC790\uB3D9 \uBCF4\uD638 \uC815\uCC45\uC744 \uAD00\uB9AC\uD558\uC138\uC694." }), _jsx("div", { className: styles.layout, children: _jsxs("div", { className: styles.panels, children: [_jsxs("section", { className: styles.card, children: [_jsx("h2", { className: styles.cardTitle, children: "\uC54C\uB9BC" }), _jsxs("div", { className: styles.row, children: [_jsxs("div", { children: [_jsx("div", { className: styles.rowLabel, children: "\uB9D0\uBC8C \uAC10\uC9C0 \uC54C\uB9BC" }), _jsx("div", { className: styles.rowDesc, children: "\uC704\uD5D8 \uAC10\uC9C0 \uC2DC \uC54C\uB9BC\uC744 \uD45C\uC2DC\uD569\uB2C8\uB2E4." })] }), _jsx(Toggle, { checked: waspAlert, onChange: setWaspAlert, label: "\uB9D0\uBC8C \uAC10\uC9C0 \uC54C\uB9BC" })] }), _jsxs("div", { className: styles.row, children: [_jsxs("div", { children: [_jsx("div", { className: styles.rowLabel, children: "\uC9C4\uB3D9" }), _jsx("div", { className: styles.rowDesc, children: "\uC54C\uB9BC \uBC1C\uC0DD \uC2DC \uC9C4\uB3D9\uC73C\uB85C\uB3C4 \uC54C\uB9BD\uB2C8\uB2E4." })] }), _jsx(Toggle, { checked: vibration, onChange: setVibration, label: "\uC9C4\uB3D9" })] })] }), _jsxs("section", { className: styles.card, children: [_jsx("h2", { className: styles.cardTitle, children: "\uC790\uB3D9 \uBCF4\uD638" }), _jsxs("div", { className: styles.row, children: [_jsxs("div", { children: [_jsx("div", { className: styles.rowLabel, children: "\uC704\uD5D8 \uC2DC \uC790\uB3D9 \uD3D0\uC1C4" }), _jsx("div", { className: styles.rowDesc, children: "\uB9D0\uBC8C\uC774 \uAC10\uC9C0\uB418\uBA74 \uCD9C\uC785\uBB38\uC744 \uC790\uB3D9\uC73C\uB85C \uB2EB\uC2B5\uB2C8\uB2E4." })] }), _jsx(Toggle, { checked: autoClose, onChange: setAutoClose, label: "\uC704\uD5D8 \uC2DC \uC790\uB3D9 \uD3D0\uC1C4" })] }), _jsxs("div", { className: styles.sliderRow, children: [_jsxs("div", { className: styles.sliderHead, children: [_jsx("span", { className: styles.rowLabel, children: "\uC790\uB3D9 \uD3D0\uC1C4 \uAE30\uC900" }), _jsxs("span", { className: styles.sliderValue, children: [autoCloseThreshold, "%"] })] }), _jsx("input", { type: "range", min: AUTO_CLOSE_MIN, max: AUTO_CLOSE_MAX, value: autoCloseThreshold, onChange: (e) => setAutoCloseThreshold(Number(e.target.value)), className: styles.slider }), _jsx("div", { className: styles.sliderDesc, children: "\uB9D0\uBC8C \uC2E0\uB8B0\uB3C4 \uAE30\uC900 \uC774\uC0C1\uC774\uBA74 \uC790\uB3D9\uC73C\uB85C \uB2EB\uC2B5\uB2C8\uB2E4." })] })] }), _jsxs("section", { className: styles.card, children: [_jsx("h2", { className: styles.cardTitle, children: "\uC2DC\uC2A4\uD15C \uC0C1\uD0DC" }), _jsx(StatusRow, { label: "AI \uBD84\uC11D" }), _jsx(StatusRow, { label: "\uB370\uC774\uD130 \uC218\uC2E0" }), _jsx(StatusRow, { label: "\uC571 \uC5F0\uACB0" })] }), _jsxs("section", { className: styles.card, children: [_jsxs("div", { className: styles.versionRow, children: [_jsx("span", { className: styles.rowLabel, children: "\uC571 \uBC84\uC804" }), _jsx("span", { className: styles.versionValue, children: "v1.0.0" })] }), _jsx("div", { className: styles.rowDesc, children: "\uD604\uC7AC \uC124\uCE58\uB41C BUZZ \uC2DC\uC2A4\uD15C \uBC84\uC804\uC785\uB2C8\uB2E4." })] }), _jsx("div", { className: styles.saveRow, children: _jsx("button", { type: "button", className: styles.saveButton, onClick: handleSave, children: "\uC124\uC815 \uC800\uC7A5" }) })] }) }), toast && (_jsxs("div", { className: `${styles.toast} ${toast.type === 'error' ? styles.toastError : ''}`, role: "status", children: [toast.type === 'success' ? _jsx(CheckCircleIcon, { size: 20 }) : _jsx(WarningIcon, { size: 20 }), _jsx("span", { className: styles.toastMessage, children: toast.message }), _jsx("button", { type: "button", className: styles.toastClose, "aria-label": "\uB2EB\uAE30", onClick: () => setToast(null), children: _jsx(CloseIcon, { size: 14 }) })] }))] }));
}
function StatusRow({ label }) {
    return (_jsxs("div", { className: styles.statusRow, children: [_jsx("span", { className: styles.rowLabel, children: label }), _jsxs("span", { className: styles.statusOk, children: [_jsx("span", { className: styles.statusDot }), "\uC815\uC0C1"] })] }));
}
