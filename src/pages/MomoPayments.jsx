import React, { useState } from 'react';
import { useMomo } from '../utils/useData';
import { ghs, today } from '../utils/helpers';
import { PageHeader, Card, CardHead, Button, FormGroup } from '../components/UI';
import s from './MomoPayments.module.css';

const NETWORKS = ['MTN MoMo', 'Vodafone Cash', 'AirtelTigo Cash'];

const emptyForm = () => ({ customer: '', amount: '', network: 'MTN MoMo', reference: '', date: today() });

const NET_STYLE = {
  'MTN MoMo':        { bg: '#3a2800', color: '#f5a623' },
  'Vodafone Cash':   { bg: '#1a0028', color: '#b07ef5' },
  'AirtelTigo Cash': { bg: '#001a28', color: '#5b8def' },
};

export default function MomoPayments() {
  const { payments, loading, createPayment, deletePayment } = useMomo();
  const [form, setForm]   = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const total = payments.reduce((t, p) => t + p.amount, 0);

  const handleSave = async () => {
    if (!form.customer.trim()) return alert('Please enter a customer name.');
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) return alert('Please enter a valid amount.');
    setSaving(true);
    await createPayment({ customer: form.customer.trim(), amount, network: form.network, reference: form.reference.trim() || '—', date: form.date });
    setForm(emptyForm());
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this payment record?')) return;
    await deletePayment(id);
  };

  if (loading) return <div className={s.loading}>Loading…</div>;

  return (
    <div className={s.page}>
      <PageHeader title="MOMO payments">
        <span className={s.total}>Total logged: <strong>{ghs(total)}</strong></span>
      </PageHeader>

      <Card>
        <CardHead>Log a payment</CardHead>
        <div className={s.grid}>
          <FormGroup label="Customer name">
            <input value={form.customer} onChange={set('customer')} placeholder="Name or phone" />
          </FormGroup>
          <FormGroup label="Amount (GH₵)">
            <input type="number" value={form.amount} onChange={set('amount')} placeholder="0.00" min="0" step="0.01" />
          </FormGroup>
          <FormGroup label="Network">
            <select value={form.network} onChange={set('network')}>
              {NETWORKS.map(n => <option key={n}>{n}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Reference / note">
            <input value={form.reference} onChange={set('reference')} placeholder="e.g. Payment for Job #12" />
          </FormGroup>
          <FormGroup label="Date">
            <input type="date" value={form.date} onChange={set('date')} />
          </FormGroup>
        </div>
        <div className={s.btnRow}>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Record payment'}
          </Button>
        </div>
      </Card>

      <Card>
        <CardHead>Payment log ({payments.length})</CardHead>
        {payments.length === 0 ? (
          <p className={s.empty}>No payments recorded yet.</p>
        ) : (
          payments.map(p => {
            const ns = NET_STYLE[p.network] || NET_STYLE['MTN MoMo'];
            return (
              <div key={p.id} className={s.payRow}>
                <div className={s.payLeft}>
                  <div className={s.payName}>{p.customer}</div>
                  <div className={s.payMeta}>
                    <span className={s.netTag} style={{ background: ns.bg, color: ns.color }}>{p.network}</span>
                    <span>{p.reference}</span>
                    <span>·</span>
                    <span>{p.date}</span>
                  </div>
                </div>
                <div className={s.payRight}>
                  <span className={s.payAmount}>{ghs(p.amount)}</span>
                  <button className={s.delBtn} onClick={() => handleDelete(p.id)}>×</button>
                </div>
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}
