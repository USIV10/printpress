import React, { useState, useMemo } from 'react';
import { useJobs } from '../utils/useData';
import { ghs, calcProfit, calcCost, getService } from '../utils/helpers';
import { PageHeader, Card, Button } from '../components/UI';
import s from './AllJobs.module.css';

const STATUSES      = ['', 'Paid', 'Pending', 'In progress', 'Cancelled'];
const ALL_STATUSES  = ['In progress', 'Paid', 'Pending', 'Cancelled'];

export default function AllJobs({ currentUser }) {
  const { jobs, loading, deleteJob, updateJob } = useJobs();
  const [filter, setFilter]   = useState('');
  const [search, setSearch]   = useState('');
  const [updating, setUpdating] = useState(null); // id of row being saved

  const filtered = useMemo(() =>
    jobs.filter(j => {
      const matchStatus = !filter || j.status === filter;
      const matchSearch = !search ||
        j.customer.toLowerCase().includes(search.toLowerCase()) ||
        j.description.toLowerCase().includes(search.toLowerCase()) ||
        getService(j.service_type).label.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    }), [jobs, filter, search]);

  const handleStatusChange = async (job, newStatus) => {
    if (job.status === newStatus) return;
    setUpdating(job.id);
    await updateJob({ ...job, status: newStatus });
    setUpdating(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this job? This cannot be undone.')) return;
    await deleteJob(id);
  };

  if (loading) return <div className={s.loading}>Loading…</div>;

  return (
    <div className={s.page}>
      <PageHeader title="All jobs">
        <span className={s.count}>{filtered.length} job{filtered.length !== 1 ? 's' : ''}</span>
        <input
          className={s.search}
          placeholder="Search customer, description…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className={s.filterSelect} value={filter} onChange={e => setFilter(e.target.value)}>
          {STATUSES.map(st => <option key={st} value={st}>{st || 'All statuses'}</option>)}
        </select>
      </PageHeader>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Description</th>
                <th>Service</th>
                <th>Date</th>
                <th>Pages</th>
                <th>Price</th>
                <th>Cost</th>
                <th>Profit</th>
                <th>Margin</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="11" className={s.empty}>No jobs found</td></tr>
              ) : filtered.map(j => {
                const profit = calcProfit(j);
                const cost   = calcCost(j);
                const margin = j.price > 0 ? ((profit / j.price) * 100).toFixed(1) : '0.0';
                const svc    = getService(j.service_type);
                const isSaving = updating === j.id;

                return (
                  <tr key={j.id} className={isSaving ? s.saving : ''}>
                    <td className={s.bold}>{j.customer}</td>
                    <td className={s.muted}>{j.description}</td>
                    <td>
                      <span className={`${s.svcBadge} ${s['svc_' + svc.category]}`}>
                        {svc.label}
                      </span>
                    </td>
                    <td className={s.mono}>{j.date}</td>
                    <td className={s.mono} style={{ color: 'var(--text3)' }}>
                      {j.sheets_used > 0 ? j.sheets_used : '—'}
                    </td>
                    <td className={s.mono}>{ghs(j.price)}</td>
                    <td className={s.mono} style={{ color: 'var(--text3)' }}>{ghs(cost)}</td>
                    <td className={s.mono} style={{ color: profit >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>
                      {ghs(profit)}
                    </td>
                    <td className={s.mono} style={{ color: profit >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {margin}%
                    </td>
                    <td>
                      <select
                        className={`${s.statusSelect} ${s['st_' + j.status.replace(' ', '_')]}`}
                        value={j.status}
                        onChange={e => handleStatusChange(j, e.target.value)}
                        disabled={isSaving}
                      >
                        {ALL_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                      </select>
                    </td>
                    <td>
                      <button className={s.deleteBtn} onClick={() => handleDelete(j.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
