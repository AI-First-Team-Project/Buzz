import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../api/buzzApi';
import { useMonitoring } from '../data/MonitoringContext';
import { BellIcon, ChevronRightIcon } from './Icons';
import styles from './Topbar.module.css';

const probability = value => `${Math.round((Number(value) || 0) * 100)}%`;
const timestamp = value => new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`).toLocaleString('ko-KR', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' });

export function Topbar({ breadcrumb }) {
  const navigate = useNavigate();
  const { settings } = useMonitoring();
  const [notifications, setNotifications] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const newestFingerprint = useRef(null);

  const refresh = async () => {
    try {
      const rows = await fetchNotifications(100);
      const newest = rows[0];
      const fingerprint = newest ? `${newest.id}:${newest.detection_id}:${newest.wasp_probability}` : null;
      if (newest && fingerprint !== newestFingerprint.current && !newest.is_read && settings.waspAlert) {
        setToast(newest);
        if (settings.vibration) navigator.vibrate?.([200, 100, 200]);
      }
      newestFingerprint.current = fingerprint;
      setNotifications(rows);
      setError('');
    } catch { setError('알림을 불러오지 못했습니다.'); }
  };

  useEffect(() => { refresh(); const timer=window.setInterval(refresh,2000); return()=>window.clearInterval(timer); }, [settings.waspAlert, settings.vibration]);

  const enabledNotifications = settings.waspAlert ? notifications : [];
  const unread = enabledNotifications.filter(item => !item.is_read).length;
  const openNotification = async item => {
    if (!item.is_read) { await markNotificationRead(item.id); await refresh(); }
    setPanelOpen(false); setShowAll(false); setToast(null);
    navigate(`/monitoring?tab=history&detectionId=${item.detection_id}&site=${item.site_id}`);
  };
  const readAll = async () => { await markAllNotificationsRead(); await refresh(); };
  const visible = showAll ? enabledNotifications : enabledNotifications.slice(0, 7);

  return <header className={styles.topbar}>
    <div className={styles.breadcrumb}>{breadcrumb.map((crumb,index)=><span className={styles.crumbGroup} key={crumb}>{index>0&&<ChevronRightIcon size={13}/>}<span className={index===breadcrumb.length-1?styles.crumbCurrent:undefined}>{crumb}</span></span>)}</div>
    <div className={styles.actions}><span className={styles.timestamp}>{new Date().toLocaleDateString('ko-KR')}</span><button type="button" className={styles.iconButton} aria-label={`알림 ${unread}건`} aria-expanded={panelOpen} onClick={()=>setPanelOpen(value=>!value)}><BellIcon size={19}/>{unread>0&&<span className={styles.notifDot}>{unread>99?'99+':unread}</span>}</button></div>
    {panelOpen&&<section className={`${styles.panel} ${showAll?styles.panelAll:''}`} aria-label="알림 목록"><header><div><strong>알림</strong><span>읽지 않음 {unread}</span></div>{unread>0&&<button type="button" onClick={readAll}>모두 읽음</button>}</header>{!settings.waspAlert?<p className={styles.empty}>말벌 감지 알림이 꺼져 있습니다.</p>:error?<p className={styles.error}>{error}</p>:visible.length?<div className={styles.list}>{visible.map(item=><button type="button" key={item.id} className={`${styles.alertItem} ${!item.is_read?styles.unread:''}`} onClick={()=>openNotification(item)}><i/><span><b>{item.site_name}에서 말벌이 감지되었습니다.</b><small>{timestamp(item.created_at)} · 말벌 확률 {probability(item.wasp_probability)}</small></span></button>)}</div>:<p className={styles.empty}>새로운 알림이 없습니다.</p>}{enabledNotifications.length>7&&<button type="button" className={styles.showAll} onClick={()=>setShowAll(value=>!value)}>{showAll?'최근 알림만 보기':'모든 알림 보기'}</button>}</section>}
    {toast&&<div className={styles.alertBackdrop}><section className={styles.alertModal} role="alertdialog" aria-modal="true" aria-labelledby="wasp-alert-title"><div className={styles.alertSymbol}>!</div><strong id="wasp-alert-title">말벌 감지 경고</strong><h2>{toast.site_name}에서 말벌이 감지되었습니다.</h2><div className={styles.alertFacts}><span>말벌 확률 <b>{probability(toast.wasp_probability)}</b></span><span>발생 시각 <b>{timestamp(toast.created_at)}</b></span></div><p>현장 상태와 감지 상세 정보를 확인해 주세요.</p><div className={styles.alertActions}><button type="button" onClick={()=>setToast(null)}>닫기</button><button type="button" className={styles.alertPrimary} onClick={()=>openNotification(toast)}>감지 상세 보기</button></div></section></div>}
  </header>;
}
