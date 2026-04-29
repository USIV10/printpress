const { app, BrowserWindow, ipcMain } = require('electron');
const path    = require('path');
const Database = require('better-sqlite3');
const crypto  = require('crypto');
const nodemailer = require('nodemailer');
const cron    = require('node-cron');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'printpress.db');
const db = new Database(dbPath);

// ── Schema ────────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    username   TEXT NOT NULL UNIQUE,
    password   TEXT NOT NULL,
    role       TEXT NOT NULL DEFAULT 'sales',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS paper_stock (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    label           TEXT NOT NULL,
    service_type    TEXT NOT NULL,
    ream_price      REAL NOT NULL DEFAULT 0,
    sheets_per_ream INTEGER NOT NULL DEFAULT 500,
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    customer      TEXT NOT NULL,
    description   TEXT NOT NULL,
    service_type  TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'In progress',
    price         REAL NOT NULL DEFAULT 0,
    sheets_used   INTEGER NOT NULL DEFAULT 0,
    paper_cost    REAL NOT NULL DEFAULT 0,
    extras        REAL NOT NULL DEFAULT 0,
    date          TEXT NOT NULL,
    notes         TEXT NOT NULL DEFAULT '',
    created_by    INTEGER,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS momo_payments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    customer   TEXT NOT NULL,
    amount     REAL NOT NULL,
    network    TEXT NOT NULL,
    reference  TEXT,
    date       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS email_settings (
    id            INTEGER PRIMARY KEY CHECK (id = 1),
    recipient     TEXT NOT NULL DEFAULT '',
    smtp_host     TEXT NOT NULL DEFAULT '',
    smtp_port     INTEGER NOT NULL DEFAULT 587,
    smtp_user     TEXT NOT NULL DEFAULT '',
    smtp_pass     TEXT NOT NULL DEFAULT '',
    smtp_secure   INTEGER NOT NULL DEFAULT 0,
    send_time     TEXT NOT NULL DEFAULT '20:00',
    enabled       INTEGER NOT NULL DEFAULT 0,
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ── Seed ──────────────────────────────────────────────────────────────────────
const hash = (pw) => crypto.createHash('sha256').update(pw).digest('hex');

if (db.prepare('SELECT COUNT(*) as c FROM users').get().c === 0) {
  db.prepare('INSERT INTO users (name,username,password,role) VALUES (?,?,?,?)').run('Administrator','admin',hash('admin123'),'admin');
  db.prepare('INSERT INTO users (name,username,password,role) VALUES (?,?,?,?)').run('Sales Staff','sales',hash('sales123'),'sales');
}
if (db.prepare('SELECT COUNT(*) as c FROM paper_stock').get().c === 0) {
  [
    { label:'A4 Ream — Printing (B&W)',   service_type:'printing_bw',    ream_price:60, sheets_per_ream:500 },
    { label:'A4 Ream — Printing (Color)', service_type:'printing_color', ream_price:60, sheets_per_ream:500 },
    { label:'A4 Ream — Photocopying',     service_type:'photocopy',      ream_price:60, sheets_per_ream:500 },
  ].forEach(s => db.prepare('INSERT INTO paper_stock (label,service_type,ream_price,sheets_per_ream) VALUES (@label,@service_type,@ream_price,@sheets_per_ream)').run(s));
}
if (db.prepare('SELECT COUNT(*) as c FROM email_settings').get().c === 0) {
  db.prepare('INSERT INTO email_settings (id) VALUES (1)').run();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const ghs = (v) => `GH₵ ${parseFloat(v || 0).toFixed(2)}`;

function buildDailyReport(dateStr) {
  const jobs  = db.prepare("SELECT * FROM jobs WHERE date = ? AND status != 'Cancelled'").all(dateStr);
  const momos = db.prepare("SELECT * FROM momo_payments WHERE date = ?").all(dateStr);

  const revenue    = jobs.reduce((t, j) => t + j.price, 0);
  const paperCost  = jobs.reduce((t, j) => t + j.paper_cost, 0);
  const otherCost  = jobs.reduce((t, j) => t + j.extras, 0);
  const totalCost  = paperCost + otherCost;
  const profit     = revenue - totalCost;
  const margin     = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : '0.0';
  const momoTotal  = momos.reduce((t, p) => t + p.amount, 0);

  const paidJobs    = jobs.filter(j => j.status === 'Paid').length;
  const pendingJobs = jobs.filter(j => j.status === 'Pending').length;
  const inProgJobs  = jobs.filter(j => j.status === 'In progress').length;

  const SERVICE_LABELS = {
    printing_bw:'Printing (B&W)', printing_color:'Printing (Color)', photocopy:'Photocopying',
    scanning:'Scanning', passport_photo:'Passport Photos', online_app:'Online Application',
    software_dev:'Software Development', momo_service:'MoMo Service', other_digital:'Other Digital',
  };

  const byService = {};
  jobs.forEach(j => {
    const lbl = SERVICE_LABELS[j.service_type] || j.service_type;
    byService[lbl] = (byService[lbl] || 0) + j.price;
  });
  const serviceRows = Object.entries(byService)
    .sort((a,b) => b[1]-a[1])
    .map(([lbl,v]) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #2a3447;color:#8a9ab8">${lbl}</td><td style="padding:6px 12px;border-bottom:1px solid #2a3447;text-align:right;font-family:monospace;color:#e8edf5">${ghs(v)}</td></tr>`)
    .join('');

  const jobRows = jobs.slice(0,10)
    .map(j => `<tr>
      <td style="padding:6px 12px;border-bottom:1px solid #2a3447;color:#e8edf5">${j.customer}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #2a3447;color:#8a9ab8">${j.description}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #2a3447;color:#8a9ab8">${SERVICE_LABELS[j.service_type]||j.service_type}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #2a3447;text-align:right;font-family:monospace;color:#e8edf5">${ghs(j.price)}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #2a3447;text-align:right;font-family:monospace;color:${(j.price-j.paper_cost-j.extras)>=0?'#2dd4a0':'#f56060'}">${ghs(j.price-j.paper_cost-j.extras)}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #2a3447"><span style="background:${j.status==='Paid'?'#0d4535':j.status==='Pending'?'#7a5010':'#1a2e6b'};color:${j.status==='Paid'?'#2dd4a0':j.status==='Pending'?'#f5a623':'#5b8def'};padding:2px 8px;border-radius:12px;font-size:11px">${j.status}</span></td>
    </tr>`).join('');

  const formattedDate = new Date(dateStr).toLocaleDateString('en-GH', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#0f1117;font-family:'Segoe UI',Arial,sans-serif;color:#e8edf5">
<div style="max-width:620px;margin:0 auto;padding:24px">

  <!-- Header -->
  <div style="background:#161b24;border:1px solid #2a3447;border-top:3px solid #2dd4a0;border-radius:12px;padding:24px;margin-bottom:16px">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px">
      <span style="font-size:22px;font-weight:700;letter-spacing:-0.5px">PrintPress</span>
      <span style="background:#0d4535;color:#2dd4a0;font-size:11px;padding:3px 10px;border-radius:20px">Daily Report</span>
    </div>
    <p style="margin:0;color:#4d5f7a;font-size:13px">${formattedDate}</p>
  </div>

  <!-- Key metrics -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
    <div style="background:#161b24;border:1px solid #2a3447;border-radius:10px;padding:16px">
      <div style="font-size:10px;color:#4d5f7a;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px">Revenue</div>
      <div style="font-size:24px;font-weight:700;font-family:monospace;color:#e8edf5">${ghs(revenue)}</div>
      <div style="font-size:11px;color:#4d5f7a;margin-top:4px">${jobs.length} job${jobs.length!==1?'s':''} today</div>
    </div>
    <div style="background:#161b24;border:1px solid #2a3447;border-radius:10px;padding:16px">
      <div style="font-size:10px;color:#4d5f7a;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px">Net Profit</div>
      <div style="font-size:24px;font-weight:700;font-family:monospace;color:${profit>=0?'#2dd4a0':'#f56060'}">${ghs(profit)}</div>
      <div style="font-size:11px;color:#4d5f7a;margin-top:4px">${margin}% margin</div>
    </div>
    <div style="background:#161b24;border:1px solid #2a3447;border-radius:10px;padding:16px">
      <div style="font-size:10px;color:#4d5f7a;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px">Total Cost</div>
      <div style="font-size:20px;font-weight:700;font-family:monospace;color:#e8edf5">${ghs(totalCost)}</div>
      <div style="font-size:11px;color:#4d5f7a;margin-top:4px">Paper: ${ghs(paperCost)} · Other: ${ghs(otherCost)}</div>
    </div>
    <div style="background:#161b24;border:1px solid #2a3447;border-radius:10px;padding:16px">
      <div style="font-size:10px;color:#4d5f7a;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px">Job Status</div>
      <div style="font-size:20px;font-weight:700;font-family:monospace;color:#e8edf5">${jobs.length}</div>
      <div style="font-size:11px;color:#4d5f7a;margin-top:4px">Paid: ${paidJobs} · Pending: ${pendingJobs} · Active: ${inProgJobs}</div>
    </div>
  </div>

  ${momoTotal > 0 ? `
  <!-- MOMO -->
  <div style="background:#161b24;border:1px solid #2a3447;border-radius:10px;padding:16px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">
    <div>
      <div style="font-size:11px;color:#4d5f7a;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:4px">MOMO Payments</div>
      <div style="font-size:13px;color:#8a9ab8">${momos.length} transaction${momos.length!==1?'s':''} recorded today</div>
    </div>
    <div style="font-size:22px;font-weight:700;font-family:monospace;color:#2dd4a0">${ghs(momoTotal)}</div>
  </div>` : ''}

  ${serviceRows ? `
  <!-- By service -->
  <div style="background:#161b24;border:1px solid #2a3447;border-radius:10px;overflow:hidden;margin-bottom:16px">
    <div style="padding:12px 16px;border-bottom:1px solid #2a3447;font-size:11px;color:#4d5f7a;text-transform:uppercase;letter-spacing:0.6px">Revenue by service</div>
    <table style="width:100%;border-collapse:collapse">${serviceRows}</table>
  </div>` : ''}

  ${jobRows ? `
  <!-- Jobs table -->
  <div style="background:#161b24;border:1px solid #2a3447;border-radius:10px;overflow:hidden;margin-bottom:16px">
    <div style="padding:12px 16px;border-bottom:1px solid #2a3447;font-size:11px;color:#4d5f7a;text-transform:uppercase;letter-spacing:0.6px">Today's jobs${jobs.length>10?' (top 10)':''}</div>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr>
        <th style="padding:8px 12px;text-align:left;font-size:10px;color:#4d5f7a;font-weight:500;border-bottom:1px solid #2a3447">Customer</th>
        <th style="padding:8px 12px;text-align:left;font-size:10px;color:#4d5f7a;font-weight:500;border-bottom:1px solid #2a3447">Description</th>
        <th style="padding:8px 12px;text-align:left;font-size:10px;color:#4d5f7a;font-weight:500;border-bottom:1px solid #2a3447">Service</th>
        <th style="padding:8px 12px;text-align:right;font-size:10px;color:#4d5f7a;font-weight:500;border-bottom:1px solid #2a3447">Price</th>
        <th style="padding:8px 12px;text-align:right;font-size:10px;color:#4d5f7a;font-weight:500;border-bottom:1px solid #2a3447">Profit</th>
        <th style="padding:8px 12px;font-size:10px;color:#4d5f7a;font-weight:500;border-bottom:1px solid #2a3447">Status</th>
      </tr></thead>
      <tbody>${jobRows}</tbody>
    </table>
  </div>` : `
  <div style="background:#161b24;border:1px solid #2a3447;border-radius:10px;padding:24px;text-align:center;margin-bottom:16px">
    <p style="color:#4d5f7a;font-size:13px;margin:0">No jobs recorded for today.</p>
  </div>`}

  <!-- Footer -->
  <div style="text-align:center;padding:16px 0">
    <p style="color:#4d5f7a;font-size:11px;margin:0">Sent by PrintPress · Daily Report · ${formattedDate}</p>
  </div>
</div>
</body></html>`;

  const text = `PrintPress Daily Report — ${formattedDate}

SUMMARY
Revenue:    ${ghs(revenue)}
Net Profit: ${ghs(profit)}  (${margin}% margin)
Total Cost: ${ghs(totalCost)}
Jobs today: ${jobs.length}  (Paid: ${paidJobs}, Pending: ${pendingJobs}, Active: ${inProgJobs})
${momoTotal > 0 ? `MOMO Total: ${ghs(momoTotal)}\n` : ''}
JOBS
${jobs.map(j=>`${j.customer} | ${j.description} | ${ghs(j.price)} | ${j.status}`).join('\n') || 'No jobs today.'}
`;

  return { html, text, subject: `PrintPress Daily Report — ${formattedDate} | Profit: ${ghs(profit)}` };
}

// Send email — skipEnabledCheck=true for manual sends & test
async function sendDailyReport(settings, dateStr, skipEnabledCheck = false) {
  if (!settings) return { success: false, message: 'No email settings found.' };
  if (!skipEnabledCheck && !settings.enabled)
    return { success: false, message: 'Daily reports are disabled. Enable the toggle first.' };
  if (!settings.recipient) return { success: false, message: 'No recipient email address set.' };
  if (!settings.smtp_host) return { success: false, message: 'No SMTP host configured.' };
  if (!settings.smtp_user) return { success: false, message: 'No email username configured.' };
  if (!settings.smtp_pass) return { success: false, message: 'No email password configured.' };

  const transporter = nodemailer.createTransport({
    host:   settings.smtp_host,
    port:   parseInt(settings.smtp_port) || 587,
    secure: settings.smtp_secure === 1 || settings.smtp_secure === true,
    auth:   { user: settings.smtp_user, pass: settings.smtp_pass },
    tls:    { rejectUnauthorized: false }, // allow self-signed certs
  });

  // Verify connection before sending
  await transporter.verify();

  const { html, text, subject } = buildDailyReport(dateStr);
  await transporter.sendMail({
    from:    `"PrintPress" <${settings.smtp_user}>`,
    to:      settings.recipient,
    subject,
    html,
    text,
  });
  return { success: true };
}

// ── Email Settings IPC ────────────────────────────────────────────────────────
ipcMain.handle('email:getSettings', () =>
  db.prepare('SELECT * FROM email_settings WHERE id = 1').get());

ipcMain.handle('email:saveSettings', (_, s) => {
  // Destructure only the columns we need — avoids passing extra fields like id/updated_at
  const { recipient, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, send_time, enabled } = s;
  db.prepare(`
    UPDATE email_settings SET
      recipient=@recipient, smtp_host=@smtp_host, smtp_port=@smtp_port,
      smtp_user=@smtp_user, smtp_pass=@smtp_pass, smtp_secure=@smtp_secure,
      send_time=@send_time, enabled=@enabled, updated_at=datetime('now')
    WHERE id = 1
  `).run({ recipient, smtp_host, smtp_port: parseInt(smtp_port)||587, smtp_user, smtp_pass, smtp_secure: smtp_secure?1:0, send_time, enabled: enabled?1:0 });
  scheduleDailyJob();
  return { success: true };
});

// Test send — passes SMTP settings directly from DB, bypasses enabled check
ipcMain.handle('email:testSend', async (_, overrideSettings) => {
  try {
    // Use override settings if provided (so user can test before saving)
    const settings = overrideSettings
      ? { ...db.prepare('SELECT * FROM email_settings WHERE id = 1').get(), ...overrideSettings }
      : db.prepare('SELECT * FROM email_settings WHERE id = 1').get();
    const dateStr = new Date().toISOString().split('T')[0];
    return await sendDailyReport(settings, dateStr, true); // skip enabled check
  } catch (err) {
    return { success: false, message: err.message };
  }
});

// Send report for a specific date manually — also bypasses enabled check
ipcMain.handle('email:sendNow', async (_, dateStr) => {
  try {
    const settings = db.prepare('SELECT * FROM email_settings WHERE id = 1').get();
    const date = dateStr || new Date().toISOString().split('T')[0];
    return await sendDailyReport(settings, date, true); // skip enabled check
  } catch (err) {
    return { success: false, message: err.message };
  }
});

// ── Cron scheduler ────────────────────────────────────────────────────────────
let cronJob = null;

function scheduleDailyJob() {
  if (cronJob) { cronJob.stop(); cronJob = null; }
  const settings = db.prepare('SELECT * FROM email_settings WHERE id = 1').get();
  if (!settings?.enabled || !settings.send_time) return;

  const [hh, mm] = settings.send_time.split(':').map(Number);
  const pattern  = `${mm} ${hh} * * *`;   // e.g. "0 20 * * *" for 20:00

  cronJob = cron.schedule(pattern, async () => {
    const today = new Date().toISOString().split('T')[0];
    try {
      await sendDailyReport(settings, today);
      console.log(`[PrintPress] Daily report sent for ${today}`);
    } catch (err) {
      console.error(`[PrintPress] Failed to send report: ${err.message}`);
    }
  });
  console.log(`[PrintPress] Daily report scheduled at ${settings.send_time} (cron: ${pattern})`);
}

// ── Auth ──────────────────────────────────────────────────────────────────────
ipcMain.handle('auth:login', (_, { username, password }) => {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim().toLowerCase());
  if (!user) return { success: false, message: 'Username not found.' };
  if (user.password !== hash(password)) return { success: false, message: 'Incorrect password.' };
  return { success: true, user: { id: user.id, name: user.name, username: user.username, role: user.role } };
});
ipcMain.handle('auth:getUsers', () =>
  db.prepare('SELECT id, name, username, role, created_at FROM users ORDER BY id').all());
ipcMain.handle('auth:createUser', (_, { name, username, password, role }) => {
  if (db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim().toLowerCase()))
    return { success: false, message: 'Username already exists.' };
  db.prepare('INSERT INTO users (name,username,password,role) VALUES (?,?,?,?)')
    .run(name.trim(), username.trim().toLowerCase(), hash(password), role);
  return { success: true };
});
ipcMain.handle('auth:deleteUser', (_, id) => {
  const user  = db.prepare('SELECT role FROM users WHERE id = ?').get(id);
  const count = db.prepare('SELECT COUNT(*) as c FROM users WHERE role = "admin"').get();
  if (user?.role === 'admin' && count.c <= 1) return { success: false, message: 'Cannot delete the only admin.' };
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return { success: true };
});
ipcMain.handle('auth:changePassword', (_, { id, oldPassword, newPassword }) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return { success: false, message: 'User not found.' };
  if (user.password !== hash(oldPassword)) return { success: false, message: 'Current password is incorrect.' };
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash(newPassword), id);
  return { success: true };
});

// ── Paper Stock ───────────────────────────────────────────────────────────────
ipcMain.handle('stock:getAll', () =>
  db.prepare('SELECT * FROM paper_stock ORDER BY id').all());
ipcMain.handle('stock:upsert', (_, s) => {
  db.prepare(`UPDATE paper_stock SET ream_price=@ream_price, sheets_per_ream=@sheets_per_ream, updated_at=datetime('now') WHERE id=@id`).run(s);
  return { success: true };
});

// ── Jobs ──────────────────────────────────────────────────────────────────────
ipcMain.handle('jobs:getAll', () =>
  db.prepare('SELECT * FROM jobs ORDER BY created_at DESC').all());
ipcMain.handle('jobs:create', (_, job) => {
  const r = db.prepare(`
    INSERT INTO jobs (customer,description,service_type,status,price,sheets_used,paper_cost,extras,date,notes,created_by)
    VALUES (@customer,@description,@service_type,@status,@price,@sheets_used,@paper_cost,@extras,@date,@notes,@created_by)
  `).run(job);
  return db.prepare('SELECT * FROM jobs WHERE id = ?').get(r.lastInsertRowid);
});
ipcMain.handle('jobs:update', (_, job) => {
  db.prepare(`
    UPDATE jobs SET customer=@customer,description=@description,service_type=@service_type,
      status=@status,price=@price,sheets_used=@sheets_used,paper_cost=@paper_cost,
      extras=@extras,date=@date,notes=@notes WHERE id=@id
  `).run(job);
  return db.prepare('SELECT * FROM jobs WHERE id = ?').get(job.id);
});
ipcMain.handle('jobs:delete', (_, id) => {
  db.prepare('DELETE FROM jobs WHERE id = ?').run(id);
  return { success: true };
});

// ── MOMO ──────────────────────────────────────────────────────────────────────
ipcMain.handle('momo:getAll', () =>
  db.prepare('SELECT * FROM momo_payments ORDER BY created_at DESC').all());
ipcMain.handle('momo:create', (_, p) => {
  const r = db.prepare('INSERT INTO momo_payments (customer,amount,network,reference,date) VALUES (@customer,@amount,@network,@reference,@date)').run(p);
  return db.prepare('SELECT * FROM momo_payments WHERE id = ?').get(r.lastInsertRowid);
});
ipcMain.handle('momo:delete', (_, id) => {
  db.prepare('DELETE FROM momo_payments WHERE id = ?').run(id);
  return { success: true };
});

// ── Window ────────────────────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1200, height: 750, minWidth: 900, minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false,
    },
    icon: path.join(__dirname, '../assets/icon.png'),
  });
  isDev ? win.loadURL('http://localhost:5173') : win.loadFile(path.join(__dirname, '../dist/index.html'));
}

app.whenReady().then(() => {
  createWindow();
  scheduleDailyJob(); // start cron on launch
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
