
import { useState } from "react";
import BottomNav from "./BottomNav";

function Toggle({ value, onChange }) {
  return (
    <button className={`buzz-setting-switch ${value ? "on" : ""}`} onClick={() => onChange(!value)} aria-label="설정 변경">
      <i />
    </button>
  );
}

function SettingRow({ title, desc, right, onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className={`buzz-setting-row ${onClick ? "clickable" : ""}`} onClick={onClick}>
      <div>
        <b>{title}</b>
        {desc && <small>{desc}</small>}
      </div>
      {right}
    </Tag>
  );
}

export default function SettingsPage({ setPage }) {
  const [notification, setNotification] = useState(true);
  const [autoClose, setAutoClose] = useState(true);
  const [vibration, setVibration] = useState(true);
  const [threshold, setThreshold] = useState(85);
  const [systemOpen, setSystemOpen] = useState(false);

  return (
    <div className="buzz-commercial-page">
      <main className="buzz-commercial-content buzz-settings-page">
        <div className="buzz-page-heading">
          <p className="buzz-kicker">앱 관리</p>
          <h1>설정</h1>
          <p className="buzz-page-desc">운영에 필요한 알림, 자동 보호 정책, 사업장 정보를 관리합니다.</p>
        </div>

        <section className="buzz-settings-section">
          <div className="buzz-settings-section-title">
            <span>알림</span><small>위험 상황을 놓치지 않도록 설정</small>
          </div>
          <div className="buzz-settings-card">
            <SettingRow
              title="말벌 감지 알림"
              desc="위험 판정 시 즉시 알림"
              right={<Toggle value={notification} onChange={setNotification} />}
            />
            <SettingRow
              title="진동"
              desc="위험 알림과 함께 진동 사용"
              right={<Toggle value={vibration} onChange={setVibration} />}
            />
          </div>
        </section>

        <section className="buzz-settings-section">
          <div className="buzz-settings-section-title">
            <span>자동 보호</span><small>말벌 감지 시 가상 출입문 정책</small>
          </div>
          <div className="buzz-settings-card">
            <SettingRow
              title="위험 시 자동 폐쇄"
              desc="말벌 판정 시 출입문을 자동으로 닫음"
              right={<Toggle value={autoClose} onChange={setAutoClose} />}
            />
            <div className="buzz-setting-threshold">
              <div><b>자동 폐쇄 기준</b><span>{threshold}%</span></div>
              <p>말벌 신뢰도가 설정값 이상이면 위험 상태로 처리합니다.</p>
              <input type="range" min="60" max="99" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
              <div className="buzz-threshold-labels"><span>60%</span><span>99%</span></div>
            </div>
          </div>
          <div className="buzz-settings-info">
            말벌 감지 중 사용자가 문을 열어도 안전 정책에 따라 다시 자동으로 닫힙니다.
          </div>
        </section>

        <section className="buzz-settings-section">
          <div className="buzz-settings-section-title">
            <span>사업장</span><small>모니터링 대상 관리</small>
          </div>
          <div className="buzz-settings-card">
            <SettingRow
              title="사업장 관리"
              desc="사업장 이름과 모니터링 대상 확인"
              right={<span className="buzz-setting-arrow">›</span>}
              onClick={() => setPage("site")}
            />
          </div>
        </section>

        <section className="buzz-settings-section">
          <div className="buzz-settings-section-title">
            <span>시스템</span><small>기술 상태는 필요할 때만 확인</small>
          </div>
          <div className="buzz-settings-card">
            <SettingRow
              title="시스템 상태"
              desc="AI 분석 및 데이터 수신 상태"
              right={<span className="buzz-setting-arrow">{systemOpen ? "⌃" : "›"}</span>}
              onClick={() => setSystemOpen((v) => !v)}
            />
            {systemOpen && (
              <div className="buzz-system-detail-list">
                <div><span className="buzz-dot" /><b>AI 분석 서버</b><small>정상</small></div>
                <div><span className="buzz-dot" /><b>데이터 수신</b><small>정상</small></div>
                <div><span className="buzz-dot" /><b>앱 연결</b><small>정상</small></div>
              </div>
            )}
          </div>
        </section>

        <section className="buzz-settings-section">
          <div className="buzz-settings-section-title"><span>정보</span></div>
          <div className="buzz-settings-card">
            <SettingRow title="앱 버전" desc="_buzz" right={<span className="buzz-setting-value">v1.0.0</span>} />
            <SettingRow title="사용자 가이드" right={<span className="buzz-setting-arrow">›</span>} onClick={() => {}} />
            <SettingRow title="앱 정보" right={<span className="buzz-setting-arrow">›</span>} onClick={() => {}} />
          </div>
        </section>

        <p className="buzz-settings-footnote">
          ※ 현재 프로젝트의 출입문 동작은 실제 개폐기가 아닌 앱 내부 시뮬레이션입니다.
        </p>
      </main>
      <BottomNav currentPage="settings" setPage={setPage} />
    </div>
  );
}
