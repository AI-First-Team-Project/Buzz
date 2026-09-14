import { useEffect, useState } from "react";
import { fetchDetectionSettings, saveDetectionSettings } from "../api/buzzApi.js";
import BottomNav from "./BottomNavV2.jsx";

function Toggle({ value, onChange, disabled=false }) {
  return <button type="button" disabled={disabled} className={`buzz-setting-switch ${value ? "on" : ""}`}
    onClick={() => !disabled && onChange(!value)} aria-label="설정 변경"><i /></button>;
}

function SettingRow({ title, desc, right, onClick }) {
  const Tag = onClick ? "button" : "div";
  return <Tag className={`buzz-setting-row ${onClick ? "clickable" : ""}`} onClick={onClick}>
    <div><b>{title}</b>{desc && <small>{desc}</small>}</div>{right}
  </Tag>;
}

export default function SettingsPage({ setPage }) {
  const [settings,setSettings]=useState(null),[saving,setSaving]=useState(false),[message,setMessage]=useState("");
  useEffect(()=>{let active=true;fetchDetectionSettings().then(value=>active&&setSettings(value)).catch(error=>active&&setMessage(error.message));return()=>{active=false}},[]);
  const update=(key,value)=>setSettings(current=>({...current,[key]:value}));
  const save=async()=>{setSaving(true);setMessage("");try{const result=await saveDetectionSettings({...settings,auto_close:true});setSettings(result);setMessage("설정이 서버에 저장되었습니다.")}catch(error){setMessage(error.message)}finally{setSaving(false)}};
  const value=settings??{wasp_alert:true,vibration:true,auto_close:true,wasp_threshold_percent:70};
  return <div className="buzz-commercial-page"><main className="buzz-commercial-content buzz-settings-page">
    <div className="buzz-page-heading"><h1>설정</h1><p className="buzz-page-desc">알림과 자동 보호 정책을 관리하세요.</p></div>
    <section className="buzz-settings-section"><div className="buzz-settings-section-title"><span>알림</span><small>위험 상황을 놓치지 않도록 설정</small></div><div className="buzz-settings-card">
      <SettingRow title="말벌 감지 알림" desc="위험 판정 시 즉시 알림" right={<Toggle value={value.wasp_alert} onChange={v=>update('wasp_alert',v)}/>}/>
      <SettingRow title="진동" desc="위험 알림과 함께 진동 사용" right={<Toggle value={value.vibration} onChange={v=>update('vibration',v)}/>}/>
    </div></section>
    <section className="buzz-settings-section"><div className="buzz-settings-section-title"><span>자동 보호</span><small>말벌 감지 시 출입문 안전 정책</small></div><div className="buzz-settings-card">
      <SettingRow title="위험 시 자동 폐쇄" desc="안전 정책에 따라 항상 사용됩니다." right={<Toggle value={true} disabled onChange={()=>{}}/>}/>
      <div className="buzz-setting-threshold"><div><b>말벌 판정 기준</b><span>{value.wasp_threshold_percent}%</span></div><p>이 확률 이상이면 말벌로 판정하며 즉시 위험 상태로 전환합니다.</p><input type="range" min="60" max="99" value={value.wasp_threshold_percent} onChange={e=>update('wasp_threshold_percent',Number(e.target.value))}/><div className="buzz-threshold-labels"><span>60%</span><span>99%</span></div><button type="button" className="buzz-threshold-save" onClick={save} disabled={saving||!settings}>{saving?"저장 중...":"설정 저장"}</button>{message&&<p role="status" className="buzz-threshold-message">{message}</p>}</div>
    </div><div className="buzz-settings-info">말벌 판정 즉시 위험 상태로 전환되고 출입문이 닫힙니다.</div></section>
    <section className="buzz-settings-section"><div className="buzz-settings-section-title"><span>사업장</span></div><div className="buzz-settings-card"><SettingRow title="사업장 관리" desc="사업장 이름과 모니터링 대상 확인" right={<span className="buzz-setting-arrow">›</span>} onClick={()=>setPage("site")}/></div></section>
    <p className="buzz-settings-footnote">※ 현재 프로젝트의 출입문 동작은 실제 개폐기가 아닌 앱 내부 시뮬레이션입니다.</p>
  </main><BottomNav currentPage="settings" setPage={setPage}/></div>;
}
