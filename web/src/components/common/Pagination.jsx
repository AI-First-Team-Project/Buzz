import './Pagination.css';

export function Pagination({ page, totalPages, onChange, label = '페이지 이동' }) {
  if (totalPages <= 1) return null;
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => start + index);
  return <nav className="buzz-pagination" aria-label={label}>
    <button type="button" disabled={page === 1} onClick={() => onChange(page - 1)} aria-label="이전 페이지">‹</button>
    {pages.map((number) => <button type="button" key={number} className={number === page ? 'active' : ''} aria-current={number === page ? 'page' : undefined} onClick={() => onChange(number)}>{number}</button>)}
    <button type="button" disabled={page === totalPages} onClick={() => onChange(page + 1)} aria-label="다음 페이지">›</button>
  </nav>;
}
