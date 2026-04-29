# PrintPress — Sales & Profit Management System

A desktop app for printing press businesses built with Electron + React + SQLite.

## Features
- Dashboard with live revenue, cost, and profit summary
- New job form with automatic profit & margin calculation
- All jobs list with search, filter, and delete
- Sales report with daily chart, period filter, and CSV export
- MOMO payment log (MTN, Vodafone, AirtelTigo)

---

## Project Structure

```
printpress/
├── electron/
│   ├── main.js          # Electron main process + SQLite database
│   └── preload.js       # Secure IPC bridge to renderer
├── src/
│   ├── main.jsx         # React entry point
│   ├── App.jsx          # Root component + page routing
│   ├── App.module.css
│   ├── components/
│   │   ├── Sidebar.jsx          # Navigation sidebar
│   │   ├── Sidebar.module.css
│   │   ├── UI.jsx               # Reusable components (Card, Badge, Button, etc.)
│   │   └── UI.module.css
│   ├── pages/
│   │   ├── Dashboard.jsx        # Overview page
│   │   ├── Dashboard.module.css
│   │   ├── NewJob.jsx           # Add new job with live profit preview
│   │   ├── NewJob.module.css
│   │   ├── AllJobs.jsx          # Jobs table with filter & search
│   │   ├── AllJobs.module.css
│   │   ├── SalesReport.jsx      # Reports with chart and CSV export
│   │   ├── SalesReport.module.css
│   │   ├── MomoPayments.jsx     # MOMO payment logger
│   │   └── MomoPayments.module.css
│   ├── utils/
│   │   ├── helpers.js           # Profit calc, CSV export, date utilities
│   │   └── useData.js           # React hooks for jobs and MOMO data
│   └── styles/
│       └── global.css           # Global CSS variables and resets
├── assets/
│   └── icon.png                 # App icon (add your own)
├── index.html
├── vite.config.js
└── package.json
```

---

## Setup & Installation

### 1. Install Node.js
Download from https://nodejs.org (version 18 or higher)

### 2. Install dependencies
```bash
cd printpress
npm install
```

### 3. Run in development mode (browser only, no Electron)
```bash
npm run dev
# Open http://localhost:5173 in your browser
```

### 4. Run as a desktop app (Electron)
```bash
npm run electron:dev
```

### 5. Build a distributable (.exe for Windows, .dmg for Mac)
```bash
npm run electron:build
# Output goes to /dist-electron
```

---

## How profit is calculated

For every job:
```
Net Profit = Selling Price − Materials − Labour − Overhead
Margin %   = (Net Profit / Selling Price) × 100
```

These are calculated automatically when you fill in the New Job form, and stored in the database.

---

## Database

The app uses SQLite via `better-sqlite3`. The database file is stored at:
- **Windows:** `C:\Users\<you>\AppData\Roaming\PrintPress\printpress.db`
- **Mac:**     `~/Library/Application Support/PrintPress/printpress.db`
- **Linux:**   `~/.config/PrintPress/printpress.db`

You can open this file with any SQLite viewer (e.g. DB Browser for SQLite).

---

## Adding your app icon

Place your icon files in the `/assets` folder:
- `icon.ico` — Windows
- `icon.icns` — macOS
- `icon.png` — Linux (512×512px recommended)

---

## Tech Stack

| Layer      | Technology            |
|------------|-----------------------|
| Desktop    | Electron 29           |
| Frontend   | React 18 + Vite       |
| Styling    | CSS Modules           |
| Database   | SQLite (better-sqlite3) |
| Fonts      | DM Sans + DM Mono     |
| CSV Export | Native JS             |
