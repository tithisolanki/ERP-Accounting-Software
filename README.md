# TexFin - Offline Desktop Textile Accounting ERP

TexFin is a professional Windows desktop ERP software tailored for textile trading businesses. It helps trading firms manage fabric purchases, invoices, stock inventory, double-entry party ledgers, GST filings, and payment books completely offline.

---

## Technical Stack

- **Shell**: Electron
- **Client**: React (TypeScript) + Tailwind CSS + Recharts
- **Server**: Express.js
- **Database**: SQLite3
- **Authentication**: JWT & Bcryptjs
- **PDF Engines**: pdf-lib
- **Excel Exports**: xlsx
- **Cloud Sync**: Supabase Client

---

## Project Structure

```
d:\ac-clone\
├── src/
│   ├── main.ts              # Electron core setup
│   ├── preload.ts           # Preload IPC bridge
│   ├── backend/
│   │   ├── index.ts         # Express server config
│   │   ├── db.ts            # SQLite engine & database seeds
│   │   ├── routes/          # Auth, Masters, Transactions, Reports, Settings
│   │   └── services/        # PDF layout, Excel compiler, Sync agent
│   └── frontend/
│       ├── main.tsx         # React root entry
│       ├── index.css        # Base styling and HSL theme tokens
│       ├── store/           # Zustand state store
│       └── pages/           # Dashboard, Masters, Vouchers, Ledgers, Reports, Settings
├── tsconfig.json            # Frontend compiler options
├── tsconfig.electron.json   # Backend compiler options
├── vite.config.ts           # Vite compile build settings
└── package.json             # Scripts & node dependencies
```

---

## Getting Started

### 1. Install Dependencies
Make sure you have Node.js and NPM installed, then run:
```bash
npm install
```

### 2. Run in Development Mode
Launch the React frontend dev server and Electron wrapper simultaneously:
```bash
npm run dev
```

### 3. Run Backend Integration Tests
Execute the automated test suite verifying SQLite database queries, stock re-balancers, and account ledger sheets:
```bash
npm run test:backend
```

### 4. Build and Package
To compile the production bundles and package the application as a standalone Windows EXE installer:
```bash
npm run package
```
Standalones are compiled into the `release/` directory.

---

## Key Features

1. **Company & Role scopes**: Every data table is scoped by `company_id`. Built-in role checks restrict operadores from deleting documents or creating master entries.
2. **Double-Entry Party Ledger**: Computes real-time chronologically sorted statements with running balances automatically.
3. **Auto-Balancing Inventory**: Purchases automatically increase available meters for specific lot numbers, and sales invoices check and decrease stock levels.
4. **GST Splitting**: Compares company and customer states to automatically split CGST/SGST (intra-state) or apply IGST (inter-state).
5. **PDF Invoicing**: Generates A4 layout-stable invoices with totals, GST grids, and terms & conditions.
6. **Robust Backup & Restore**: Creates raw ZIP files of the SQLite database. Overwrites and restores databases dynamically by safely closing and reopening active SQLite file streams.
7. **Cloud Synchronization**: Pushes dirty local records (`is_dirty = 1`) to Supabase and pulls remote updates, resolving conflicts through timestamps.
