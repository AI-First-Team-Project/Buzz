
const nav = [
  { page: "home", label: "홈", path: "M2.25 12 12 2.25 21.75 12M4.5 9.75V21h5.25v-6h4.5v6h5.25V9.75" },
  { page: "site", label: "사업장", path: "M3.75 21V5.25h8.5V21M12.25 9h8v12M6.75 8.25h2.5m-2.5 3h2.5m-2.5 3h2.5m6-2.25h2m-2 3h2M2.25 21h19.5" },
  { page: "analysis", label: "분석", path: "M4 19V9m5 10V5m5 14v-7m5 7V3" },
  { page: "history", label: "이력", path: "M12 8v4l2.5 1.5M21 12a9 9 0 1 1-2.64-6.36M21 4v5h-5" },
  { page: "settings", label: "설정", path: "M12 15.25A3.25 3.25 0 1 0 12 8.75a3.25 3.25 0 0 0 0 6.5ZM19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6l-.04.08H10l-.04-.08a1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.87.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1l-.08-.04V10l.08-.04a1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6l.04-.08H14l.04.08a1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.87-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.1.38.3.72.6 1l.08.04V14l-.08.04c-.3.28-.5.62-.6.96Z" },
  { page: "test", label: "테스트", path: "M9 3h6m-5 0v5l-5 9a2 2 0 0 0 1.75 3h10.5A2 2 0 0 0 19 17l-5-9V3m-6 11h8" },
];

export default function BottomNav({ currentPage, setPage }) {
  return (
    <nav className="buzz-bottom-nav">
      {nav.map((item) => {
        const active = currentPage === item.page;
        return (
          <button key={item.page} className={active ? "active" : ""} onClick={() => setPage(item.page)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d={item.path} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
