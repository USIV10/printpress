import React, { useState, useEffect } from 'react';
import { useJobs, useStock } from '../utils/useData';
import { ghs, today, SERVICE_TYPES, getService, STOCK_SERVICE_MAP, costPerSheet, DEFAULT_RATES } from '../utils/helpers';
import { PageHeader, Card, CardHead, Button, FormGroup } from '../components/UI';
import s from './NewJob.module.css';

const SERVICE_ICONS = {
  printing_bw:    '⬛',
  printing_color: '🎨',
  photocopy:      '📄',
  scanning:       '🔍',
  passport_photo: '🪪',
  online_app:     '🌐',
  software_dev:   '💻',
  momo_service:   '📱',
  other_digital:  '⚡',
};

const PLACEHOLDERS = {
  printing_bw:    'e.g. CV — 3 pages, 2 copies',
  printing_color: 'e.g. Certificate — 1 page color',
  photocopy:      'e.g. Land document — 5 pages',
  scanning:       'e.g. ID card front & back',
  passport_photo: 'e.g. Passport photo — 2 sets',
  online_app:     'e.g. SSNIT registration',
  software_dev:   'e.g. Inventory system for client',
  momo_service:   'e.g. MoMo withdrawal — GH₵ 200',
  other_digital:  'e.g. Data entry — 50 records',
};

// Services where qty drives the price automatically
const QTY_SERVICES = new Set(['printing_bw','printing_color','photocopy','scanning','passport_photo']);
// Services with a flat price (no qty)
const FLAT_SERVICES = new Set(['online_app','software_dev','momo_service','other_digital']);

const empty = () => ({
  customer: '', description: '', service_type: 'printing_bw',
  qty: '', price: '', extras: '', notes: '', date: today(),
  priceEdited: false,
});

export default function NewJob({ currentUser }) {
  const { createJob }   = useJobs();
  const { stock }       = useStock();
  const [form, setForm] = useState(empty());
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const service    = getService(form.service_type);
  const stockEntry = stock.find(x => x.service_type === STOCK_SERVICE_MAP[form.service_type]);
  const cps        = costPerSheet(stockEntry);   // cost per sheet from ream price
  const qty        = parseInt(form.qty) || 0;
  const rate       = DEFAULT_RATES[form.service_type] || 0;

  // Auto price: qty × rate (unless user has manually overridden it)
  const autoPrice  = QTY_SERVICES.has(form.service_type) && qty > 0 ? qty * rate
                   : FLAT_SERVICES.has(form.service_type) && rate > 0 && !form.priceEdited ? rate
                   : null;
  const displayPrice = form.priceEdited ? form.price : (autoPrice !== null ? String(autoPrice) : form.price);

  // Paper cost: only for sheet-based services, using ream cost
  const paperCost = service.usesSheets && cps > 0 && qty > 0 ? cps * qty : 0;

  const n         = v => parseFloat(v) || 0;
  const price     = n(displayPrice);
  const totalCost = paperCost + n(form.extras);
  const profit    = price - totalCost;
  const margin    = price > 0 ? ((profit / price) * 100).toFixed(1) : null;

  // When service changes: reset qty, reset price override, auto-set flat prices
  const switchService = (id) => {
    setForm(f => ({
      ...f,
      service_type: id,
      qty: '',
      price: '',
      priceEdited: false,
      description: '',
    }));
  };

  // When qty changes: update qty and clear manual price override so auto takes over
  const handleQtyChange = (e) => {
    setForm(f => ({ ...f, qty: e.target.value, priceEdited: false }));
  };

  // When price is manually typed: mark as edited so auto-fill stops overriding
  const handlePriceChange = (e) => {
    setForm(f => ({ ...f, price: e.target.value, priceEdited: true }));
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.customer.trim())    return alert('Please enter the customer name.');
    if (!form.description.trim()) return alert('Please enter a description.');
    if (price <= 0)               return alert('Please enter a selling price.');
    setSaving(true);
    await createJob({
      customer:     form.customer.trim(),
      description:  form.description.trim(),
      service_type: form.service_type,
      status:       'In progress',
      price,
      sheets_used:  qty,
      paper_cost:   paperCost,
      extras:       n(form.extras),
      notes:        form.notes.trim(),
      date:         form.date,
      created_by:   currentUser?.id || null,
    });
    setForm(empty());
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // Label for qty field depends on service
  const qtyLabel = form.service_type === 'passport_photo' ? 'Number of sets (4 photos each)'
                 : form.service_type === 'scanning'        ? 'Number of pages to scan'
                 : 'Number of pages';

  const showQty = QTY_SERVICES.has(form.service_type);

  return (
    <div className={s.page}>
      <PageHeader title="New job" />
      <div className={s.layout}>
        <Card className={s.formCard}>

          {/* Service selector */}
          <div className={s.serviceGrid}>
            {SERVICE_TYPES.map(sv => (
              <button
                key={sv.id}
                type="button"
                className={`${s.serviceBtn} ${form.service_type === sv.id ? s.serviceBtnActive : ''} ${s['cat_' + sv.category]}`}
                onClick={() => switchService(sv.id)}
              >
                <span className={s.serviceIcon}>{SERVICE_ICONS[sv.id]}</span>
                <span className={s.serviceLabel}>{sv.label}</span>
                {DEFAULT_RATES[sv.id] > 0 && (
                  <span className={s.serviceRate}>
                    {sv.id === 'passport_photo' ? `${ghs(DEFAULT_RATES[sv.id])}/set`
                     : sv.id === 'online_app'   ? ghs(DEFAULT_RATES[sv.id])
                     : `${ghs(DEFAULT_RATES[sv.id])}/pg`}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className={s.divider} />

          <div className={s.grid}>
            <FormGroup label="Customer name" full>
              <input value={form.customer} onChange={set('customer')} placeholder="e.g. Kwame Asante" autoFocus />
            </FormGroup>

            <FormGroup label="Description" full>
              <input value={form.description} onChange={set('description')} placeholder={PLACEHOLDERS[form.service_type]} />
            </FormGroup>

            {/* Qty field — auto-calculates price */}
            {showQty && (
              <FormGroup label={qtyLabel}>
                <input
                  type="number"
                  value={form.qty}
                  onChange={handleQtyChange}
                  placeholder="e.g. 5"
                  min="1" step="1"
                />
              </FormGroup>
            )}

            {/* Price — auto-filled but editable */}
            <FormGroup label={`Selling price (GH₵)${autoPrice !== null && !form.priceEdited ? ' — auto' : ''}`}>
              <input
                type="number"
                value={displayPrice}
                onChange={handlePriceChange}
                placeholder="0.00"
                min="0" step="0.01"
                style={autoPrice !== null && !form.priceEdited ? { borderColor: 'var(--green)', color: 'var(--green)' } : {}}
              />
            </FormGroup>

            <FormGroup label="Other cost (GH₵)">
              <input type="number" value={form.extras} onChange={set('extras')} placeholder="0.00" min="0" step="0.01" />
            </FormGroup>

<FormGroup label="Date">
              <input type="date" value={form.date} onChange={set('date')} />
            </FormGroup>

            <FormGroup label="Notes (optional)" full>
              <textarea value={form.notes} onChange={set('notes')} placeholder="Any extra details…" rows={2} />
            </FormGroup>
          </div>

          <div className={s.btnRow}>
            {saved && <span className={s.savedMsg}>✓ Job saved!</span>}
            <Button onClick={() => setForm(empty())}>Clear</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save job'}
            </Button>
          </div>
        </Card>

        {/* Live profit preview */}
        <div className={s.sidePanel}>
          <Card>
            <CardHead>Profit preview</CardHead>
            <div className={s.previewRows}>
              <div className={s.pRow}>
                <span>Selling price</span>
                <span>{ghs(price)}</span>
              </div>

              {showQty && qty > 0 && rate > 0 && !form.priceEdited && (
                <div className={s.pRowSub}>{qty} {service.unit || 'pages'} × {ghs(rate)}</div>
              )}

              {service.usesSheets && (
                <>
                  <div className={s.pRow}>
                    <span>Paper cost</span>
                    <span style={{ color: paperCost > 0 ? 'inherit' : 'var(--text3)' }}>
                      − {ghs(paperCost)}
                    </span>
                  </div>
                  {stockEntry && qty > 0 && cps > 0 && (
                    <div className={s.pRowSub}>{qty} sheets × {ghs(cps)}/sheet</div>
                  )}
                  {!stockEntry && (
                    <div className={s.pRowWarn}>
                      ⚠ Set ream price in Settings → Paper stock to track paper cost
                    </div>
                  )}
                  {stockEntry && cps === 0 && (
                    <div className={s.pRowWarn}>
                      ⚠ Ream price is GH₵ 0 — update in Settings → Paper stock
                    </div>
                  )}
                </>
              )}

              {n(form.extras) > 0 && (
                <div className={s.pRow}><span>Other cost</span><span>− {ghs(n(form.extras))}</span></div>
              )}

              <div className={`${s.pRow} ${s.totalRow}`}>
                <span>Total cost</span><span>{ghs(totalCost)}</span>
              </div>
              <div className={`${s.pRow} ${s.profitRow}`} style={{ color: profit >= 0 ? 'var(--green)' : 'var(--red)' }}>
                <span>Net profit</span><span>{ghs(profit)}</span>
              </div>
              {margin && (
                <div className={s.pRow}>
                  <span>Margin</span>
                  <span style={{ color: profit >= 0 ? 'var(--green)' : 'var(--red)' }}>{margin}%</span>
                </div>
              )}
            </div>

            {/* Paper stock info */}
            {service.usesSheets && stockEntry && (
              <div className={s.stockInfo}>
                <div className={s.stockInfoRow}><span>Ream price</span><strong>{ghs(stockEntry.ream_price)}</strong></div>
                <div className={s.stockInfoRow}><span>Sheets/ream</span><strong>{stockEntry.sheets_per_ream}</strong></div>
                <div className={s.stockInfoRow}><span>Cost/sheet</span><strong style={{ color: 'var(--green)' }}>{ghs(cps)}</strong></div>
              </div>
            )}

            {/* Rate reminder */}
            {rate > 0 && (
              <div className={s.rateInfo}>
                <span>Your rate:</span>
                <strong>
                  {form.service_type === 'passport_photo' ? `${ghs(rate)} per 4-set`
                   : form.service_type === 'online_app'   ? `${ghs(rate)} flat`
                   : `${ghs(rate)} per page`}
                </strong>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
