import React, { useState, useMemo } from 'react';
import { useJobs } from '../utils/useData';
import { ghs, calcProfit, calcCost, getService, revenueByType, dailyRevenue, filterByPeriod, exportCSV } from '../utils/helpers';
import { PageHeader, Card, CardHead, MetricCard, BarChart, Button } from '../components/UI';
import s from './SalesReport.module.css';

const STATUS_STYLE = {
  Paid:          { bg: 'var(--green3)', color: 'var(--green)'  },
  Pending:       { bg: 'var(--amber2)', color: 'var(--amber)'  },
  'In progress': { bg: 'var(--blue2)',  color: 'var(--blue)'   },
  Cancelled:     { bg: 'var(--red2)',   color: 'var(--red)'    },
};

export default function SalesReport() {
  const { jobs, loading } = useJobs();
  const [period, setPeriod] = useState('30');

  const filtered = useMemo(() => filterByPeriod(jobs, period), [jobs, period]);
  const active   = useMemo(() => filtered.filter(j => j.status !== 'Cancelled'), [filtered]);

  const summary = useMemo(() => {
    const rev     = active.reduce((t, j) => t + j.price, 0);
    const cost    = active.reduce((t, j) => t + calcCost(j), 0);
    const prof    = rev - cost;
    const margin  = rev > 0 ? ((prof / rev) * 100).toFixed(1) : '0.0';
    const paid    = filtered.filter(j => j.status === 'Paid').reduce((t, j) => t + j.price, 0);
    const pending = filtered.filter(j => j.status === 'Pending').reduce((t, j) => t + j.price, 0);
    const paidCount    = filtered.filter(j => j.status === 'Paid').length;
    const pendingCount = filtered.filter(j => j.status === 'Pending').length;
    const progressCount = filtered.filter(j => j.status === 'In progress').length;
    return { rev, cost, prof, margin, paid, pending, paidCount, pendingCount, progressCount, count: filtered.length };
  }, [active, filtered]);

  const typeData  = useMemo(() => revenueByType(active), [active]);
  const chartData = useMemo(() => dailyRevenue(jobs, 14), [jobs]);
  const maxChart  = Math.max(...chartData.map(d => d.value), 1);

  const handleExport = () => exportCSV(filtered);

  if (loading) return <div className={s.loading}>Loading…</div>;

  return (
    <div className={s.page}>
      <PageHeader title="Sales report">
        <select className={s.periodSelect} value={period} onChange={e => setPeriod(e.target.value)}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="all">All time</option>
        </select>
      </PageHeader>

      {/* Summary metrics */}
      <div className={s.metrics}>
        <MetricCard label="Total revenue"    value={ghs(summary.rev)}   sub={`${summary.count} job${summary.count !== 1 ? 's' : ''}`} />
        <MetricCard label="Total costs"      value={ghs(summary.cost)}  sub="Paper + other costs" />
        <MetricCard label="Net profit"       value={<span style={{ color: summary.prof >= 0 ? 'var(--green)' : 'var(--red)' }}>{ghs(summary.prof)}</span>} sub={`${summary.margin}% margin`} subType={summary.prof >= 0 ? 'up' : 'down'} />
        <MetricCard label="Collected (paid)" value={ghs(summary.paid)}  sub={`${summary.paidCount} paid job${summary.paidCount !== 1 ? 's' : ''}`} />
        <MetricCard label="Outstanding"      value={ghs(summary.pending)} sub={`${summary.pendingCount} pending`} subType={summary.pending > 0 ? 'down' : ''} />
        <MetricCard label="In progress"      value={summary.progressCount} sub="Jobs not yet completed" />
      </div>

      <div className={s.row}>
        {/* Daily bar chart */}
        <Card>
          <CardHead>Daily revenue — last 14 days</CardHead>
          <div className={s.chartBars}>
            {chartData.map((d, i) => (
              <div key={i} className={s.chartBarWrap}>
                <span className={s.chartVal}>{d.value > 0 ? ghs(d.value).replace('GH₵ ', '') : ''}</span>
                <div
                  className={s.chartBar}
                  style={{ height: `${((d.value / maxChart) * 80 + (d.value > 0 ? 4 : 0)).toFixed(0)}px` }}
                  title={ghs(d.value)}
                />
                <span className={s.chartLbl}>{d.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Revenue by service */}
        <Card>
          <CardHead>Revenue by service</CardHead>
          {typeData.length === 0
            ? <p className={s.empty}>No data for this period</p>
            : <BarChart data={typeData} />}
        </Card>
      </div>

      {/* Jobs breakdown table */}
      <Card>
        <CardHead>Jobs breakdown ({filtered.length})</CardHead>
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
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="10" className={s.emptyRow}>No jobs in this period</td></tr>
              ) : filtered.map(j => {
                const profit = calcProfit(j);
                const margin = j.price > 0 ? ((profit / j.price) * 100).toFixed(1) : '0.0';
                const svc    = getService(j.service_type);
                const st     = STATUS_STYLE[j.status] || STATUS_STYLE['In progress'];
                return (
                  <tr key={j.id}>
                    <td className={s.bold}>{j.customer}</td>
                    <td className={s.muted}>{j.description}</td>
                    <td>
                      <span className={`${s.svcBadge} ${s['svc_' + svc.category]}`}>{svc.label}</span>
                    </td>
                    <td className={s.mono}>{j.date}</td>
                    <td className={s.mono} style={{ color: 'var(--text3)' }}>
                      {j.sheets_used > 0 ? j.sheets_used : '—'}
                    </td>
                    <td className={s.mono}>{ghs(j.price)}</td>
                    <td className={s.mono} style={{ color: 'var(--text3)' }}>{ghs(calcCost(j))}</td>
                    <td className={s.mono} style={{ color: profit >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>
                      {ghs(profit)}
                    </td>
                    <td className={s.mono} style={{ color: profit >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {margin}%
                    </td>
                    <td>
                      <span style={{ background: st.bg, color: st.color, fontSize: 10, fontWeight: 500, padding: '3px 9px', borderRadius: 20, fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap' }}>
                        {j.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className={s.totalsRow}>
                  <td colSpan="5" className={s.totalsLabel}>Totals</td>
                  <td className={s.mono}>{ghs(filtered.reduce((t, j) => t + j.price, 0))}</td>
                  <td className={s.mono} style={{ color: 'var(--text3)' }}>{ghs(filtered.reduce((t, j) => t + calcCost(j), 0))}</td>
                  <td className={s.mono} style={{ color: 'var(--green)', fontWeight: 500 }}>{ghs(filtered.reduce((t, j) => t + calcProfit(j), 0))}</td>
                  <td colSpan="2" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {/* Export */}
      <Card>
        <CardHead>Export</CardHead>
        <div className={s.exportRow}>
          <Button onClick={handleExport}>Export CSV</Button>
          <Button onClick={() => window.print()}>Print / Save PDF</Button>
        </div>
        <p className={s.exportNote}>
          CSV includes: customer, description, service, date, pages, price, paper cost, other cost, profit, margin, and status.
        </p>
      </Card>
    </div>
  );
}
