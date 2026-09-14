import { useEffect, useRef, useState } from 'react';
import { useMonitoring } from '../../data/MonitoringContext';
import { PageHeader } from '../../components/PageHeader';
import { Toggle } from '../../components/Toggle';
import { CheckCircleIcon, CloseIcon, WarningIcon } from '../../components/Icons';
import styles from './Settings.module.css';

export function Settings() {
  const { settings, saveSettings } = useMonitoring();
  const [form, setForm] = useState(settings);
  const [toast, setToast] = useState(null);
  const timer = useRef();
  useEffect(()=>setForm(settings),[settings]);
  useEffect(()=>{if(!toast)return;clearTimeout(timer.current);timer.current=setTimeout(()=>setToast(null),3200);return()=>clearTimeout(timer.current)},[toast]);
  const toggle = key => value => setForm(current=>({...current,[key]:value}));
  const save = async () => {
    try {
      await saveSettings({...form, autoClose:true});
      setToast({type:'success',message:'설정이 서버에 저장되었습니다.'});
    } catch (error) {
      setToast({type:'error',message:error.message});
    }
  };
  return <div><PageHeader title="설정" description="알림과 자동 보호 정책을 관리하세요."/><div className={styles.layout}><div className={styles.panels}>
    <section className={styles.card}><h2 className={styles.cardTitle}>알림 설정</h2>
      <SettingRow label="말벌 감지 알림" description="실제 말벌 감지 이벤트의 알림을 표시합니다."><Toggle checked={form.waspAlert} onChange={toggle('waspAlert')} label="말벌 감지 알림"/></SettingRow>
      <SettingRow label="진동" description="지원되는 모바일 기기에서 짧게 진동합니다."><Toggle checked={form.vibration} onChange={toggle('vibration')} label="진동"/></SettingRow>
    </section>
    <section className={styles.card}><h2 className={styles.cardTitle}>자동 보호</h2>
      <SettingRow label="위험 시 자동 폐쇄" description="안전 정책에 따라 말벌 감지 시 항상 출입문을 닫습니다."><Toggle checked={true} onChange={()=>{}} label="위험 시 자동 폐쇄"/></SettingRow>
      <div className={styles.sliderRow}><div className={styles.sliderHead}><span className={styles.rowLabel}>자동 폐쇄 기준</span><span className={styles.sliderValue}>{form.autoCloseThreshold}%</span></div><input className={styles.slider} type="range" min="60" max="99" value={form.autoCloseThreshold} onChange={event=>setForm(current=>({...current,autoCloseThreshold:Number(event.target.value)}))}/><div className={styles.sliderDesc}>말벌 신뢰도가 기준 이상이면 자동으로 닫습니다.</div></div>
    </section>
    <section className={styles.card}><h2 className={styles.cardTitle}>시스템 상태</h2><StatusRow label="AI 분석"/><StatusRow label="데이터 수신"/><StatusRow label="앱 연결"/></section>
    <section className={styles.card}><div className={styles.versionRow}><span className={styles.rowLabel}>앱 버전</span><span className={styles.versionValue}>v1.0.0</span></div></section>
    <div className={styles.saveRow}><button type="button" className={styles.saveButton} onClick={save}>설정 저장</button></div>
  </div></div>{toast&&<div className={`${styles.toast} ${toast.type==='error'?styles.toastError:''}`} role="status">{toast.type==='success'?<CheckCircleIcon size={20}/>:<WarningIcon size={20}/>}<span className={styles.toastMessage}>{toast.message}</span><button className={styles.toastClose} onClick={()=>setToast(null)} aria-label="닫기"><CloseIcon size={14}/></button></div>}</div>;
}

function SettingRow({label,description,children}){return <div className={styles.row}><div><div className={styles.rowLabel}>{label}</div><div className={styles.rowDesc}>{description}</div></div>{children}</div>}
function StatusRow({label}){return <div className={styles.statusRow}><span className={styles.rowLabel}>{label}</span><span className={styles.statusOk}><span className={styles.statusDot}/>정상</span></div>}
