import { useEffect, useRef, useState } from 'react';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../api/buzzApi';

export default function NotificationCenter({ setPage }) {
  const [items,setItems]=useState([]),[open,setOpen]=useState(false),[error,setError]=useState(''),[alert,setAlert]=useState(null);
  const newestFingerprint=useRef(null);
  const load=()=>fetchNotifications().then(rows=>{const newest=rows[0];const fingerprint=newest?`${newest.id}:${newest.detection_id}:${newest.wasp_probability}`:null;if(newest&&fingerprint!==newestFingerprint.current&&!newest.is_read)setAlert(newest);newestFingerprint.current=fingerprint;setItems(rows);setError('')}).catch(()=>setError('알림을 불러오지 못했습니다.'));
  useEffect(()=>{load();const timer=setInterval(load,2000);return()=>clearInterval(timer)},[]);
  const unread=items.filter(item=>!item.is_read).length;
  const select=async item=>{if(!item.is_read)await markNotificationRead(item.id);setOpen(false);setAlert(null);setPage('history')};
  const readAll=async()=>{await markAllNotificationsRead();await load()};
  return <div className="mobile-notification-center"><button className="mobile-notification-bell" aria-label={`알림 ${unread}건`} onClick={()=>setOpen(value=>!value)}>{unread>0&&<b>{unread>99?'99+':unread}</b>}</button>{open&&<section className="mobile-notification-panel"><header><strong>알림</strong>{unread>0&&<button onClick={readAll}>모두 읽음</button>}</header>{error?<p>{error}</p>:items.length?items.slice(0,10).map(item=><button key={item.id} className={!item.is_read?'unread':''} onClick={()=>select(item)}><i/><span><b>{item.site_name}에서 말벌이 감지되었습니다.</b><small>{Math.round(Number(item.wasp_probability)*100)}% · {new Date(`${item.created_at}Z`).toLocaleString('ko-KR')}</small></span></button>):<p>새로운 알림이 없습니다.</p>}</section>}{alert&&<div className="mobile-alert-backdrop"><section className="mobile-alert-modal" role="alertdialog" aria-modal="true"><i>!</i><strong>말벌 감지 경고</strong><h2>{alert.site_name}에서 말벌이 감지되었습니다.</h2><p>말벌 확률 <b>{Math.round(Number(alert.wasp_probability)*100)}%</b></p><div><button onClick={()=>setAlert(null)}>닫기</button><button onClick={()=>select(alert)}>감지 이력 보기</button></div></section></div>}</div>;
}
