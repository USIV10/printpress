import React, { useState, useEffect } from 'react';
import { PageHeader, Card, CardHead, Button, FormGroup } from '../components/UI';
import { today } from '../utils/helpers';
import s from './EmailSettings.module.css';

const PRESETS = {
  gmail:   { smtp_host: 'smtp.gmail.com',        smtp_port: 587, smtp_secure: 0, label: 'Gmail'              },
  yahoo:   { smtp_host: 'smtp.mail.yahoo.com',   smtp_port: 587, smtp_secure: 0, label: 'Yahoo Mail'         },
  outlook: { smtp_host: 'smtp-mail.outlook.com', smtp_port: 587, smtp_secure: 0, label: 'Outlook / Hotmail'  },
  custom:  { smtp_host: '',                       smtp_port: 587, smtp_secure: 0, label: 'Custom SMTP'        },
};

const empty = () => ({
  recipient: '', smtp_host: 'smtp.gmail.com', smtp_port: 587,
  smtp_user: '', smtp_pass: '', smtp_secure: 0,
  send_time: '20:00', enabled: 0,
});

export default function EmailSettings() {
  const [form, setForm]       = useState(empty());
  const [preset, setPreset]   = useState('gmail');
  const [showPw, setShowPw]   = useState(false);
  const [saving, setSaving]   = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg]         = useState(null);
  const [loaded, setLoaded]   = useState(false);

  useEffect(() => {
    (async () => {
      if (window.api) {
        const saved = await window.api.email.getSettings();
        if (saved) {
          setForm({ ...empty(), ...saved });
          const found = Object.entries(PRESETS).find(([, p]) => p.smtp_host === saved.smtp_host);
          setPreset(found ? found[0] : 'custom');
        }
      }
      setLoaded(true);
    })();
  }, []);

  const set    = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setNum = k => e => setForm(f => ({ ...f, [k]: parseInt(e.target.value) || 0 }));

  const applyPreset = (key) => {
    setPreset(key);
    if (key !== 'custom') setForm(f => ({ ...f, ...PRESETS[key] }));
  };

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 6000);
  };

  // Validate form fields and return error string or null
  const validate = () => {
    if (!form.recipient.trim()) return 'Please enter a recipient email address.';
    if (!form.smtp_host.trim()) return 'Please enter the SMTP host.';
    if (!form.smtp_user.trim()) return 'Please enter your email / username.';
    if (!form.smtp_pass.trim()) return 'Please enter your password or app password.';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) return flash('error', err);
    setSaving(true);
    try {
      const payload = {
        recipient:   form.recipient.trim(),
        smtp_host:   form.smtp_host.trim(),
        smtp_port:   parseInt(form.smtp_port) || 587,
        smtp_user:   form.smtp_user.trim(),
        smtp_pass:   form.smtp_pass,
        smtp_secure: form.smtp_secure ? 1 : 0,
        send_time:   form.send_time,
        enabled:     form.enabled ? 1 : 0,
      };
      const res = window.api
        ? await window.api.email.saveSettings(payload)
        : { success: true };
      res.success
        ? flash('success', `Settings saved! Daily reports will be sent at ${form.send_time}.`)
        : flash('error', res.message || 'Failed to save settings.');
    } catch (e) {
      flash('error', e.message);
    }
    setSaving(false);
  };

  // Test send — passes current form values directly so user doesn't need to save first
  const handleTest = async () => {
    const err = validate();
    if (err) return flash('error', err);
    setTesting(true);
    try {
      const payload = {
        recipient:   form.recipient.trim(),
        smtp_host:   form.smtp_host.trim(),
        smtp_port:   parseInt(form.smtp_port) || 587,
        smtp_user:   form.smtp_user.trim(),
        smtp_pass:   form.smtp_pass,
        smtp_secure: form.smtp_secure ? 1 : 0,
        enabled:     1, // force enabled for test
      };
      const res = window.api
        ? await window.api.email.testSend(payload)
        : { success: false, message: 'Test only works in the desktop app, not the browser.' };
      res.success
        ? flash('success', `✓ Test email sent to ${form.recipient.trim()}`)
        : flash('error', `Failed: ${res.message}`);
    } catch (e) {
      flash('error', e.message);
    }
    setTesting(false);
  };

  // Send today's report manually — bypass enabled check
  const handleSendNow = async () => {
    const err = validate();
    if (err) return flash('error', 'Please fill in and save your settings first.');
    setTesting(true);
    try {
      const res = window.api
        ? await window.api.email.sendNow(today())
        : { success: false, message: 'Only works in the desktop app.' };
      res.success
        ? flash('success', `✓ Today's report sent to ${form.recipient.trim()}`)
        : flash('error', `Failed: ${res.message}`);
    } catch (e) {
      flash('error', e.message);
    }
    setTesting(false);
  };

  if (!loaded) return <div className={s.loading}>Loading settings…</div>;

  return (
    <div className={s.page}>
      <PageHeader title="Email reports" />

      {/* Flash message */}
      {msg && (
        <div className={msg.type === 'success' ? s.flashSuccess : s.flashError}>
          {msg.text}
        </div>
      )}

      {/* Enable / disable toggle */}
      <Card>
        <div className={s.enableRow}>
          <div>
            <div className={s.enableLabel}>Automatic daily report</div>
            <div className={s.enableSub}>
              Send a profit summary to your email every day at your chosen time
            </div>
          </div>
          <label className={s.toggle}>
            <input
              type="checkbox"
              checked={form.enabled === 1 || form.enabled === true}
              onChange={e => setForm(f => ({ ...f, enabled: e.target.checked ? 1 : 0 }))}
            />
            <span className={s.toggleTrack}><span className={s.toggleThumb} /></span>
          </label>
        </div>
      </Card>

      {/* Recipient & send time */}
      <Card>
        <CardHead>Delivery settings</CardHead>
        <div className={s.grid}>
          <FormGroup label="Send report to (your email)" full>
            <input
              type="email"
              value={form.recipient}
              onChange={set('recipient')}
              placeholder="e.g. youremail@gmail.com"
            />
          </FormGroup>
          <FormGroup label="Send time (daily)">
            <input type="time" value={form.send_time} onChange={set('send_time')} />
          </FormGroup>
          <div className={s.hint}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="7"/><line x1="8" y1="5" x2="8" y2="8.5"/>
              <circle cx="8" cy="11" r=".5" fill="currentColor"/>
            </svg>
            The app must be open and running on your PC at the send time for the email to go out.
          </div>
        </div>
      </Card>

      {/* SMTP configuration */}
      <Card>
        <CardHead>Email provider (SMTP)</CardHead>

        <div className={s.presetRow}>
          {Object.entries(PRESETS).map(([key, p]) => (
            <button
              key={key}
              type="button"
              className={`${s.presetBtn} ${preset === key ? s.presetActive : ''}`}
              onClick={() => applyPreset(key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === 'gmail' && (
          <div className={s.infoBox}>
            <strong>Gmail users:</strong> Google blocks regular passwords for SMTP.
            You must create an <strong>App Password</strong>:
            <ol className={s.steps}>
              <li>Go to your Google Account → Security → 2-Step Verification (must be ON)</li>
              <li>Scroll down to <strong>App passwords</strong> and click it</li>
              <li>Choose app: <em>Mail</em>, device: <em>Windows Computer</em> → Generate</li>
              <li>Copy the 16-character password and paste it in the password field below</li>
            </ol>
            <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer">
              Open App Passwords page ↗
            </a>
          </div>
        )}

        {preset === 'outlook' && (
          <div className={s.infoBox}>
            <strong>Outlook / Hotmail:</strong> Use your regular Microsoft account password.
            If it fails, go to your Microsoft Account security settings and allow "less secure apps"
            or generate an app password.
          </div>
        )}

        <div className={s.grid} style={{ marginTop: 16 }}>
          <FormGroup label="SMTP host">
            <input value={form.smtp_host} onChange={set('smtp_host')} placeholder="smtp.gmail.com" />
          </FormGroup>
          <FormGroup label="SMTP port">
            <input type="number" value={form.smtp_port} onChange={setNum('smtp_port')} placeholder="587" min="1" max="65535" />
          </FormGroup>
          <FormGroup label="Your email address">
            <input type="email" value={form.smtp_user} onChange={set('smtp_user')} placeholder="youremail@gmail.com" />
          </FormGroup>
          <FormGroup label="App password / email password">
            <div className={s.pwWrap}>
              <input
                type={showPw ? 'text' : 'password'}
                value={form.smtp_pass}
                onChange={set('smtp_pass')}
                placeholder="Paste your app password here"
                style={{ paddingRight: 40 }}
              />
              <button type="button" className={s.pwEye} onClick={() => setShowPw(v => !v)}>
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
          </FormGroup>
          <FormGroup label="Connection security">
            <select
              value={form.smtp_secure}
              onChange={e => setForm(f => ({ ...f, smtp_secure: parseInt(e.target.value) }))}
            >
              <option value={0}>STARTTLS — port 587 (recommended)</option>
              <option value={1}>SSL/TLS — port 465</option>
            </select>
          </FormGroup>
        </div>
      </Card>

      {/* Action buttons */}
      <Card>
        <CardHead>Actions</CardHead>
        <div className={s.btnGroup}>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </Button>
          <Button onClick={handleTest} disabled={testing || saving}>
            {testing ? 'Sending…' : 'Send test email'}
          </Button>
          <Button onClick={handleSendNow} disabled={testing || saving}>
            {testing ? 'Sending…' : "Send today's report now"}
          </Button>
        </div>
        <div className={s.btnHints}>
          <p><strong>Save settings</strong> — saves your configuration and schedules the daily send.</p>
          <p><strong>Send test email</strong> — sends a test using your current form values. You don't need to save first.</p>
          <p><strong>Send today's report now</strong> — immediately sends today's full profit report.</p>
        </div>
      </Card>

      {/* What's in the report */}
      <Card>
        <CardHead>What's included in each report</CardHead>
        <div className={s.included}>
          {[
            ['Revenue & profit', 'Total sales, total cost, net profit, and profit margin for the day'],
            ['Job breakdown', 'Every job with customer name, description, price, profit, and status'],
            ['Revenue by service', 'Which services earned the most (printing, photocopying, etc.)'],
            ['MOMO payments', 'Total MoMo transactions logged for the day'],
            ['Cost breakdown', 'Paper cost vs other costs side by side'],
          ].map(([title, desc]) => (
            <div key={title} className={s.includedRow}>
              <div className={s.dot} />
              <div><strong>{title}</strong> — {desc}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
