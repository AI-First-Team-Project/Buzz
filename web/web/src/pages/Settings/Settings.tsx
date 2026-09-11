// 설정 - 감지 및 자동 제어 옵션
import { useMonitoring } from '../../data/MonitoringContext';
import { useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { Toggle } from '../../components/Toggle';
import styles from './Settings.module.css';

const AUTO_CLOSE_MIN = 60;
const AUTO_CLOSE_MAX = 99;

export function Settings() {
  const { settings, saveSettings } = useMonitoring();
  const [saveMessage, setSaveMessage] = useState('');
  const [waspAlert, setWaspAlert] = useState(settings.waspAlert);
  const [vibration, setVibration] = useState(true);
  const [autoClose, setAutoClose] = useState(true);
  const [autoCloseThreshold, setAutoCloseThreshold] = useState(settings.autoCloseThreshold);

  return (
    <div>
      <PageHeader title="설정" description="알림과 자동 보호 정책을 관리하세요." />

      <div className={styles.layout}>
        <div className={styles.panels}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>알림</h2>
            <div className={styles.row}>
              <div>
                <div className={styles.rowLabel}>말벌 감지 알림</div>
                <div className={styles.rowDesc}>위험 감지 시 알림을 표시합니다.</div>
              </div>
              <Toggle checked={waspAlert} onChange={setWaspAlert} label="말벌 감지 알림" />
            </div>
            <div className={styles.row}>
              <div>
                <div className={styles.rowLabel}>진동</div>
                <div className={styles.rowDesc}>알림 발생 시 진동으로도 알립니다.</div>
              </div>
              <Toggle checked={vibration} onChange={setVibration} label="진동" />
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>자동 보호</h2>
            <div className={styles.row}>
              <div>
                <div className={styles.rowLabel}>위험 시 자동 폐쇄</div>
                <div className={styles.rowDesc}>말벌이 감지되면 출입문을 자동으로 닫습니다.</div>
              </div>
              <Toggle checked={autoClose} onChange={setAutoClose} label="위험 시 자동 폐쇄" />
            </div>
            <div className={styles.sliderRow}>
              <div className={styles.sliderHead}>
                <span className={styles.rowLabel}>자동 폐쇄 기준</span>
                <span className={styles.sliderValue}>{autoCloseThreshold}%</span>
              </div>
              <input
                type="range"
                min={AUTO_CLOSE_MIN}
                max={AUTO_CLOSE_MAX}
                value={autoCloseThreshold}
                onChange={(e) => setAutoCloseThreshold(Number(e.target.value))}
                className={styles.slider}
              />
              <div className={styles.sliderDesc}>말벌 신뢰도 기준 이상이면 자동으로 닫습니다.</div>
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>시스템 상태</h2>
            <StatusRow label="AI 분석" />
            <StatusRow label="데이터 수신" />
            <StatusRow label="앱 연결" />
          </section>

          <section className={styles.card}>
            <div className={styles.versionRow}>
              <span className={styles.rowLabel}>앱 버전</span>
              <span className={styles.versionValue}>v1.0.0</span>
            </div>
            <div className={styles.rowDesc}>현재 설치된 BUZZ 시스템 버전입니다.</div>
          </section>

          <div className={styles.saveRow}>
            <button type="button" className={styles.saveButton} onClick={() => setSaveMessage(saveSettings({ waspAlert, vibration, autoClose, autoCloseThreshold }) ? '설정이 저장되었습니다.' : '설정을 저장할 수 없습니다. 브라우저 저장소를 확인하세요.')} >
              설정 저장
            </button>
            <span role="status">{saveMessage}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label }: { label: string }) {
  return (
    <div className={styles.statusRow}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.statusOk}>
        <span className={styles.statusDot} />
        정상
      </span>
    </div>
  );
}