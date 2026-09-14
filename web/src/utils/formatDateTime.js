const KOREA_TIME_ZONE = 'Asia/Seoul';
const EXPLICIT_TIME_ZONE = /(?:Z|[+-]\d{2}:?\d{2})$/i;

export function parseOperationalTime(value) {
  if (value instanceof Date) return value;
  if (typeof value !== 'string') return new Date(value);
  // MySQL DATETIME values are stored in UTC but serialized without a zone.
  const normalized = value.trim().replace(' ', 'T');
  return new Date(EXPLICIT_TIME_ZONE.test(normalized) ? normalized : `${normalized}Z`);
}

export function formatOperationalTime(value, { seconds = true } = {}) {
  if (!value) return { time: '대기 중', date: '' };
  const parsed = parseOperationalTime(value);
  if (Number.isNaN(parsed.getTime())) return { time: String(value).replace(/[TZ]/g, ' ').split('.')[0], date: '' };

  const parts = Object.fromEntries(new Intl.DateTimeFormat('ko-KR', {
    timeZone: KOREA_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', ...(seconds ? { second: '2-digit' } : {}),
    hourCycle: 'h23',
  }).formatToParts(parsed).map(({ type, value: part }) => [type, part]));

  return {
    time: `${parts.hour}:${parts.minute}${seconds ? `:${parts.second}` : ''}`,
    date: `${parts.year}.${parts.month}.${parts.day}`,
  };
}

export function koreanDate(value = new Date()) {
  return formatOperationalTime(value).date.replaceAll('.', '-');
}

export function koreanDayBoundaryUtc(date, end = false) {
  const localTime = end ? '23:59:59.999' : '00:00:00';
  return new Date(`${date}T${localTime}+09:00`).toISOString().replace(/Z$/, '');
}
