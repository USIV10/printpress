import { useState, useEffect, useCallback } from 'react';

let localJobs  = JSON.parse(localStorage.getItem('pp_jobs2')  || '[]');
let localMomos = JSON.parse(localStorage.getItem('pp_momos') || '[]');
let localStock = JSON.parse(localStorage.getItem('pp_stock') || JSON.stringify([
  { id:1, label:'A4 Ream — Printing (B&W)',   service_type:'printing_bw',    ream_price:60, sheets_per_ream:500 },
  { id:2, label:'A4 Ream — Printing (Color)', service_type:'printing_color', ream_price:60, sheets_per_ream:500 },
  { id:3, label:'A4 Ream — Photocopying',     service_type:'photocopy',      ream_price:60, sheets_per_ream:500 },
]));
const save = () => {
  localStorage.setItem('pp_jobs2',  JSON.stringify(localJobs));
  localStorage.setItem('pp_momos', JSON.stringify(localMomos));
  localStorage.setItem('pp_stock', JSON.stringify(localStock));
};

// ── Auth ──────────────────────────────────────────────────────────────────────
export function useAuth() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('pp_user') || 'null'); } catch { return null; }
  });
  const login = async (username, password) => {
    if (window.api) return await window.api.auth.login({ username, password });
    const defaults = {
      admin: { id:1, name:'Administrator', username:'admin', role:'admin' },
      sales: { id:2, name:'Sales Staff',   username:'sales', role:'sales' },
    };
    if (username==='admin'&&password==='admin123') return { success:true, user:defaults.admin };
    if (username==='sales'&&password==='sales123') return { success:true, user:defaults.sales };
    return { success:false, message:'Invalid credentials.' };
  };
  const setLoggedIn = (u) => { sessionStorage.setItem('pp_user', JSON.stringify(u)); setUser(u); };
  const logout = () => { sessionStorage.removeItem('pp_user'); setUser(null); };
  return { user, login, setLoggedIn, logout };
}

// ── Paper Stock ───────────────────────────────────────────────────────────────
export function useStock() {
  const [stock, setStock]   = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    if (window.api) setStock(await window.api.stock.getAll());
    else setStock([...localStock]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const upsert = async (s) => {
    if (window.api) await window.api.stock.upsert(s);
    else { const i = localStock.findIndex(x => x.id === s.id); if (i !== -1) { localStock[i] = { ...localStock[i], ...s }; save(); } }
    await load();
  };

  return { stock, loading, upsert };
}

// ── Jobs ──────────────────────────────────────────────────────────────────────
export function useJobs() {
  const [jobs, setJobs]       = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    if (window.api) setJobs(await window.api.jobs.getAll());
    else setJobs([...localJobs].reverse());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createJob = async (job) => {
    if (window.api) await window.api.jobs.create(job);
    else { localJobs.push({ ...job, id: Date.now(), created_at: new Date().toISOString() }); save(); }
    await load();
  };
  const updateJob = async (job) => {
    if (window.api) await window.api.jobs.update(job);
    else { const i = localJobs.findIndex(j => j.id === job.id); if (i !== -1) { localJobs[i] = { ...localJobs[i], ...job }; save(); } }
    await load();
  };

  const deleteJob = async (id) => {
    if (window.api) await window.api.jobs.delete(id);
    else { localJobs = localJobs.filter(j => j.id !== id); save(); }
    await load();
  };

  return { jobs, loading, createJob, updateJob, deleteJob, reload: load };
}

// ── Momo ──────────────────────────────────────────────────────────────────────
export function useMomo() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    if (window.api) setPayments(await window.api.momo.getAll());
    else setPayments([...localMomos].reverse());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createPayment = async (p) => {
    if (window.api) await window.api.momo.create(p);
    else { localMomos.push({ ...p, id: Date.now(), created_at: new Date().toISOString() }); save(); }
    await load();
  };
  const deletePayment = async (id) => {
    if (window.api) await window.api.momo.delete(id);
    else { localMomos = localMomos.filter(p => p.id !== id); save(); }
    await load();
  };

  return { payments, loading, createPayment, deletePayment };
}
