import React, { useState } from 'react';
import { useStock } from '../utils/useData';
import { ghs, costPerSheet } from '../utils/helpers';
import { PageHeader, Card, CardHead, Button } from '../components/UI';
import s from './PaperStock.module.css';

export default function PaperStock() {
  const { stock, loading, upsert } = useStock();
  const [editing, setEditing] = useState({});   // { [id]: { ream_price, sheets_per_ream } }
  const [saved, setSaved]     = useState(null);

  const startEdit = (item) => setEditing(e => ({
    ...e, [item.id]: { ream_price: item.ream_price, sheets_per_ream: item.sheets_per_ream }
  }));

  const setVal = (id, key, val) =>
    setEditing(e => ({ ...e, [id]: { ...e[id], [key]: val } }));

  const handleSave = async (item) => {
    const ed = editing[item.id];
    if (!ed) return;
    const ream_price     = parseFloat(ed.ream_price) || 0;
    const sheets_per_ream = parseInt(ed.sheets_per_ream) || 500;
    if (ream_price <= 0) return alert('Ream price must be greater than 0.');
    if (sheets_per_ream <= 0) return alert('Sheets per ream must be greater than 0.');
    await upsert({ id: item.id, ream_price, sheets_per_ream });
    setEditing(e => { const n = { ...e }; delete n[item.id]; return n; });
    setSaved(item.id);
    setTimeout(() => setSaved(null), 2000);
  };

  const cancel = (id) => setEditing(e => { const n = { ...e }; delete n[id]; return n; });

  if (loading) return <div className={s.loading}>Loading…</div>;

  // Calculate sheets remaining if we track usage (future feature note)
  const totalSheetValue = stock.reduce((t, s) => t + s.ream_price, 0);

  return (
    <div className={s.page}>
      <PageHeader title="Paper stock & pricing" />

      <div className={s.intro}>
        <p>Set the cost of each A4 ream for printing and photocopying. The app uses this to automatically calculate your paper cost and profit for every job.</p>
      </div>

      <div className={s.cards}>
        {stock.map(item => {
          const ed  = editing[item.id];
          const cps = costPerSheet(ed ? { ...item, ...ed } : item);
          const rp  = ed ? parseFloat(ed.ream_price)||0    : item.ream_price;
          const sp  = ed ? parseInt(ed.sheets_per_ream)||0 : item.sheets_per_ream;

          return (
            <Card key={item.id} className={s.stockCard}>
              <div className={s.cardTitle}>{item.label}</div>

              {ed ? (
                // Edit mode
                <div className={s.editForm}>
                  <div className={s.editRow}>
                    <label>Ream price (GH₵)</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={ed.ream_price}
                      onChange={e => setVal(item.id, 'ream_price', e.target.value)}
                    />
                  </div>
                  <div className={s.editRow}>
                    <label>Sheets per ream</label>
                    <input
                      type="number" min="1" step="1"
                      value={ed.sheets_per_ream}
                      onChange={e => setVal(item.id, 'sheets_per_ream', e.target.value)}
                    />
                  </div>
                  <div className={s.cpsPreview}>
                    Cost per sheet: <strong>{ghs(rp > 0 && sp > 0 ? rp/sp : 0)}</strong>
                  </div>
                  <div className={s.editBtns}>
                    <Button onClick={() => cancel(item.id)}>Cancel</Button>
                    <Button variant="primary" onClick={() => handleSave(item)}>
                      {saved === item.id ? '✓ Saved' : 'Save'}
                    </Button>
                  </div>
                </div>
              ) : (
                // Display mode
                <div className={s.displayMode}>
                  <div className={s.statRow}>
                    <div className={s.stat}>
                      <span className={s.statLabel}>Ream price</span>
                      <span className={s.statVal}>{ghs(item.ream_price)}</span>
                    </div>
                    <div className={s.stat}>
                      <span className={s.statLabel}>Sheets/ream</span>
                      <span className={s.statVal}>{item.sheets_per_ream}</span>
                    </div>
                    <div className={s.stat}>
                      <span className={s.statLabel}>Cost/sheet</span>
                      <span className={s.statVal} style={{ color: 'var(--green)' }}>{ghs(cps)}</span>
                    </div>
                  </div>
                  <div className={s.exampleBox}>
                    <span className={s.exLabel}>Example: 10 sheets costs</span>
                    <span className={s.exVal}>{ghs(cps * 10)}</span>
                  </div>
                  <Button onClick={() => startEdit(item)}>Edit prices</Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHead>How paper cost works</CardHead>
        <div className={s.explainer}>
          <div className={s.step}>
            <div className={s.stepNum}>1</div>
            <div>
              <strong>You set the ream price</strong> — Enter how much you paid for a ream of A4 paper (e.g. GH₵ 60).
            </div>
          </div>
          <div className={s.step}>
            <div className={s.stepNum}>2</div>
            <div>
              <strong>You enter sheets used</strong> — When adding a print or photocopy job, enter the number of sheets used.
            </div>
          </div>
          <div className={s.step}>
            <div className={s.stepNum}>3</div>
            <div>
              <strong>App calculates automatically</strong> — Paper cost = sheets used × (ream price ÷ sheets per ream). This is deducted from your selling price to give you the net profit.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
