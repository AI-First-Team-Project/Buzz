export function formatOperationalTime(value, { seconds = true } = {}) {
  if (!value) return { time: '대기 중', date: '' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { time: String(value).replace(/[TZ]/g, ' ').split('.')[0], date: '' };
  return {
    time: date.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', ...(seconds ? { second: '2-digit' } : {}) }),
    date: `${date.getFullYear()}.${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')}`,
  };
}
