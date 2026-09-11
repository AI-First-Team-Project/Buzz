// 공통 탐색 - 사이드바 메뉴
import { NavLink } from 'react-router-dom';
import {
  AnalysisIcon,
  DashboardIcon,
  HistoryIcon,
  SettingsIcon,
  SiteIcon,
  SoundTestIcon,
} from './Icons';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { to: '/', label: '대시보드', icon: DashboardIcon, end: true },
  { to: '/sites', label: '사업장', icon: SiteIcon, end: false },
  { to: '/analysis', label: '분석', icon: AnalysisIcon, end: false },
  { to: '/history', label: '이력', icon: HistoryIcon, end: false },
  { to: '/settings', label: '설정', icon: SettingsIcon, end: false },
  { to: '/sound-test', label: '테스트', icon: SoundTestIcon, end: false },
];

export function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <svg width="30" height="30" viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <defs><linearGradient id="webBuzzGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#FFD86B" /><stop offset="55%" stopColor="#F7B500" /><stop offset="100%" stopColor="#E38A00" /></linearGradient></defs>
          <polygon points="32,2 58.5,17 58.5,47 32,62 5.5,47 5.5,17" fill="url(#webBuzzGrad)" />
          <polygon points="32,8 52.6,20.3 52.6,43.7 32,56 11.4,43.7 11.4,20.3" fill="#0A0E1A" />
          <text x="32" y="41.5" textAnchor="middle" fontFamily="'Chakra Petch', 'Outfit', sans-serif" fontWeight="700" fontSize="27" fill="#F7B500">B</text>
          <path d="M49 5.5 L43.5 15.5 h4.5 l-4 9" stroke="#F7B500" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className={styles.brandName}>BUZZ</span>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={styles.footer}>BUZZ / SOUND INTELLIGENCE</div>
    </aside>
  );
}
