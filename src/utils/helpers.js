export const ghs = (val) => `GH₵ ${parseFloat(val || 0).toFixed(2)}`;

export const SERVICE_TYPES = [
  { id: 'printing_bw',    label: 'Printing (B&W)',       category: 'print',   usesSheets: true,  unit: 'pages'  },
  { id: 'printing_color', label: 'Printing (Color)',      category: 'print',   usesSheets: true,  unit: 'pages'  },
  { id: 'photocopy',      label: 'Photocopying',          category: 'print',   usesSheets: true,  unit: 'pages'  },
  { id: 'scanning',       label: 'Scanning',              category: 'digital', usesSheets: false, unit: 'pages'  },
  { id: 'passport_photo', label: 'Passport Photos',       category: 'photo',   usesSheets: false, unit: 'sets'   },
  { id: 'online_app',     label: 'Online Application',    category: 'digital', usesSheets: false, unit: 'job'    },
  { id: 'software_dev',   label: 'Software Development',  category: 'digital', usesSheets: false, unit: 'job'    },
  { id: 'momo_service',   label: 'MoMo Service',          category: 'momo',    usesSheets: false, unit: 'job'    },
  { id: 'other_digital',  label: 'Other Digital Service', category: 'digital', usesSheets: false, unit: 'job'    },
];

// Default selling price per unit for each service
// These auto-fill the price field when qty is entered
export const DEFAULT_RATES = {
  printing_bw:    1,    // GH₵ 1 per page
  printing_color: 4,    // GH₵ 4 per page
  photocopy:      1,    // GH₵ 1 per page
  scanning:       2,    // GH₵ 2 per page
  passport_photo: 8,    // GH₵ 8 per 4-set
  online_app:     25,   // GH₵ 25 flat
  software_dev:   0,    // varies — manual entry
  momo_service:   0,    // varies — manual entry
  other_digital:  0,    // varies — manual entry
};

export const getService   = (id) => SERVICE_TYPES.find(s => s.id === id) || SERVICE_TYPES[0];
export const STOCK_SERVICE_MAP = {
  printing_bw:    'printing_bw',
  printing_color: 'printing_color',
  photocopy:      'photocopy',
};

// Profit = price − paper_cost − extras
export const calcProfit = (j) => j.price - (j.paper_cost || 0) - (j.extras || 0);
export const calcCost   = (j) => (j.paper_cost || 0) + (j.extras || 0);
export const calcMargin = (j) => j.price > 0 ? ((calcProfit(j) / j.price) * 100).toFixed(1) : '0.0';

export const costPerSheet = (stock) =>
  stock && stock.sheets_per_ream > 0 ? stock.ream_price / stock.sheets_per_ream : 0;

export const today = () => new Date().toISOString().split('T')[0];

export const readableDate = (iso) =>
  new Date(iso).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' });

export const revenueByType = (jobs) => {
  const map = {};
  jobs.filter(j => j.status !== 'Cancelled').forEach(j => {
    const label = getService(j.service_type)?.label || j.service_type;
    map[label] = (map[label] || 0) + j.price;
  });
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value, display: ghs(value) }));
};

export const dailyRevenue = (jobs, days = 14) => {
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    const rev = jobs.filter(j => j.date === ds && j.status !== 'Cancelled').reduce((s, j) => s + j.price, 0);
    result.push({ label: d.toLocaleDateString('en', { weekday: 'short' }).slice(0, 2), date: ds, value: rev });
  }
  return result;
};

export const filterByPeriod = (jobs, period) => {
  if (period === 'all') return jobs;
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - parseInt(period));
  return jobs.filter(j => new Date(j.date) >= cutoff);
};

export const exportCSV = (jobs) => {
  const headers = ['Customer','Description','Service','Date','Price (GH₵)','Paper Cost (GH₵)','Other Cost (GH₵)','Total Cost (GH₵)','Profit (GH₵)','Margin %','Status'];
  const rows = jobs.map(j => [
    j.customer, j.description, getService(j.service_type)?.label || j.service_type, j.date,
    j.price.toFixed(2), (j.paper_cost||0).toFixed(2), (j.extras||0).toFixed(2),
    calcCost(j).toFixed(2), calcProfit(j).toFixed(2), calcMargin(j), j.status,
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = `printpress-report-${today()}.csv`;
  a.click();
};
