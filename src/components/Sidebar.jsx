import React from 'react';
import s from './Sidebar.module.css';

const ADMIN_NAV = [
  { section: 'Overview' },
  { id: 'dashboard', label: 'Dashboard',       icon: 'grid'  },
  { section: 'Jobs' },
  { id: 'newjob',    label: 'New job',          icon: 'plus'  },
  { id: 'alljobs',   label: 'All jobs',         icon: 'list'  },
  { section: 'Finance' },
  { id: 'report',    label: 'Sales report',     icon: 'chart' },
  { id: 'momo',      label: 'MOMO payments',    icon: 'card'  },
  { section: 'Settings' },
  { id: 'stock',     label: 'Paper stock',      icon: 'stack' },
  { id: 'email',     label: 'Email reports',    icon: 'mail'  },
  { id: 'users',     label: 'User management',  icon: 'users' },
];

const SALES_NAV = [
  { section: 'Overview' },
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { section: 'Jobs' },
  { id: 'newjob',    label: 'New job',   icon: 'plus' },
  { id: 'alljobs',   label: 'All jobs',  icon: 'list' },
];

const ICONS = {
  grid:  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>,
  plus:  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="7"/><line x1="8" y1="5" x2="8" y2="11"/><line x1="5" y1="8" x2="11" y2="8"/></svg>,
  list:  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="8" x2="14" y2="8"/><line x1="2" y1="12" x2="14" y2="12"/></svg>,
  chart: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="1,13 5,7 8,10 11,5 15,2"/><line x1="1" y1="15" x2="15" y2="15"/></svg>,
  card:  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="3" width="14" height="10" rx="2"/><line x1="1" y1="7" x2="15" y2="7"/><rect x="3" y="9" width="3" height="2" rx="0.5"/></svg>,
  stack: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="14" height="4" rx="1"/><rect x="1" y="6" width="14" height="4" rx="1"/><rect x="1" y="11" width="14" height="4" rx="1"/></svg>,
  mail:  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="3" width="14" height="10" rx="2"/><polyline points="1,3 8,9 15,3"/></svg>,
  users: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6" cy="5" r="3"/><path d="M1 14c0-3 2-5 5-5s5 2 5 5"/><circle cx="13" cy="5" r="2"/><path d="M13 10c1.5 0 3 1 3 4"/></svg>,
};

export default function Sidebar({ current, onNavigate, user, onLogout }) {
  const nav      = user.role === 'admin' ? ADMIN_NAV : SALES_NAV;
  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <aside className={s.sidebar}>
      <div className={s.logo}>
        <h1>PrintPress</h1>
        <p>Sales Manager v1.0</p>
      </div>
      <nav className={s.nav}>
        {nav.map((item, i) =>
          item.section ? (
            <div key={i} className={s.section}>{item.section}</div>
          ) : (
            <button
              key={item.id}
              className={`${s.navBtn} ${current === item.id ? s.active : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <span className={s.icon}>{ICONS[item.icon]}</span>
              {item.label}
            </button>
          )
        )}
      </nav>
      <div className={s.userBar}>
        <div className={s.avatar}>{initials}</div>
        <div className={s.userInfo}>
          <div className={s.userName}>{user.name}</div>
          <div className={s.userRole}>{user.role === 'admin' ? 'Administrator' : 'Sales personnel'}</div>
        </div>
        <button className={s.logoutBtn} onClick={onLogout} title="Sign out">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 3H3a1 1 0 00-1 1v8a1 1 0 001 1h3"/>
            <polyline points="10,5 13,8 10,11"/>
            <line x1="13" y1="8" x2="5" y2="8"/>
          </svg>
        </button>
      </div>
    </aside>
  );
}
