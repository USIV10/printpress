import React, { useMemo } from 'react';
import { useJobs } from '../utils/useData';
import { ghs, calcProfit, calcCost, revenueByType, getService } from '../utils/helpers';
import { PageHeader, MetricCard, Card, CardHead, Badge, BarChart } from '../components/UI';
import s from './Dashboard.module.css';

export default function Dashboard() {
  const { jobs, loading } = useJobs();

  const summary = useMemo(() => {
    const active = jobs.filter(j => j.status !== 'Cancelled');
    const rev    = active.reduce((t, j) => t + j.price, 0);
    const cost   = active.reduce((t, j) => t + calcCost(j), 0);
    const prof   = rev - cost;
    const margin = rev > 0 ? ((prof / rev) * 100).toFixed(1) : '0.0';
    const paid   = jobs.filter(j => j.status === 'Paid').length;
    const inProg = jobs.filter(j => j.status === 'In progress').length;
    return { rev, cost, prof, margin, paid, inProg, total: jobs.length };
  }, [jobs]);

  const typeData = useMemo(() => revenueByType(jobs), [jobs]);
  const recent   = jobs.slice(0, 6);
  const todayStr = new Date().toLocaleDateString('en-GH', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  if (loading) return <div className={s.loading}>Loading…</div>;

  return (
    <div className={s.page}>
      <PageHeader title="Dashboard">
        <span className={s.date}>{todayStr}</span>
      </PageHeader>

      <div className={s.metrics}>
        <MetricCard label="Total revenue" value={ghs(summary.rev)} sub={`${summary.paid} paid jobs`} />
        <MetricCard label="Total costs"   value={ghs(summary.cost)} sub="Paper cost + other costs" />
        <MetricCard label="Net profit"    value={<span style={{color:'var(--green)'}}>{ghs(summary.prof)}</span>} sub={`${summary.margin}% margin`} subType="up" />
        <MetricCard label="Total jobs"    value={summary.total} sub={`${summary.inProg} in progress`} />
      </div>

      <div className={s.row}>
        <Card>
          <CardHead>Recent jobs</CardHead>
          {recent.length === 0 && <p className={s.empty}>No jobs yet. Add your first job.</p>}
          {recent.map(j => {
            const svc = getService(j.service_type);
            return (
              <div key={j.id} className={s.jobRow}>
                <div>
                  <div className={s.jobName}>{j.description}</div>
                  <div className={s.jobMeta}>
                    {j.customer}
                    <span className={`${s.svcPill} ${s['cat_'+svc.category]}`}>{svc.label}</span>
                    {j.sheets_used > 0 && <span>{j.sheets_used} sheets</span>}
                    <span style={{color:'var(--green)'}}>+{ghs(calcProfit(j))}</span>
                  </div>
                </div>
                <div className={s.rowRight}>
                  <span className={s.price}>{ghs(j.price)}</span>
                  <Badge status={j.status} />
                </div>
              </div>
            );
          })}
        </Card>

        <Card>
          <CardHead>Revenue by service</CardHead>
          {typeData.length === 0
            ? <p className={s.empty}>No data yet</p>
            : <BarChart data={typeData} />}
          <div className={s.formula}>
            <span className={s.formulaLabel}>Profit =</span>
            <span className={s.pill}>Revenue</span>
            <span className={s.op}>−</span>
            <span className={s.pill}>Paper cost</span>
            <span className={s.op}>−</span>
            <span className={s.pill}>Other costs</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
