import React from 'react';
import s from './UI.module.css';

export function PageHeader({ title, children }) {
  return (
    <div className={s.header}>
      <h2 className={s.title}>{title}</h2>
      <div className={s.actions}>{children}</div>
    </div>
  );
}

export function Card({ children, className = '', style }) {
  return <div className={`${s.card} ${className}`} style={style}>{children}</div>;
}

export function CardHead({ children }) {
  return <div className={s.cardHead}>{children}</div>;
}

export function MetricCard({ label, value, sub, subType }) {
  return (
    <div className={s.metric}>
      <div className={s.mLabel}>{label}</div>
      <div className={s.mValue}>{value}</div>
      {sub && <div className={`${s.mSub} ${subType === 'up' ? s.up : subType === 'down' ? s.down : ''}`}>{sub}</div>}
    </div>
  );
}

export function Badge({ status }) {
  const map = { Paid: s.paid, Pending: s.pending, 'In progress': s.progress, Cancelled: s.cancelled };
  return <span className={`${s.badge} ${map[status] || s.pending}`}>{status}</span>;
}

export function Button({ children, variant = 'ghost', onClick, type = 'button', disabled }) {
  return (
    <button
      type={type}
      className={`${s.btn} ${variant === 'primary' ? s.primary : s.ghost}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function FormGroup({ label, children, full }) {
  return (
    <div className={`${s.formGroup} ${full ? s.full : ''}`}>
      <label className={s.label}>{label}</label>
      {children}
    </div>
  );
}

export function BarChart({ data, maxVal }) {
  const max = maxVal || Math.max(...data.map(d => d.value), 1);
  return (
    <div className={s.barChart}>
      {data.map((d, i) => (
        <div key={i} className={s.barRow}>
          <span className={s.barLabel}>{d.label}</span>
          <div className={s.barTrack}>
            <div className={s.barFill} style={{ width: `${(d.value / max * 100).toFixed(0)}%` }} />
          </div>
          <span className={s.barVal}>{d.display}</span>
        </div>
      ))}
    </div>
  );
}
