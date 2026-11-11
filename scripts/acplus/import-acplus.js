// Step 2 of the AC_PLUS import: builds a NEW TexFin database from the .jsonl files
// written by export-acplus.ps1. Never touches an existing database. See README.md.
//   node scripts/acplus/import-acplus.js <exportDir> <newDbPath>
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const [exportDir, outPath] = process.argv.slice(2);
if (!exportDir || !outPath) {
  console.error('Usage: node scripts/acplus/import-acplus.js <exportDir> <newDbPath>');
  process.exit(1);
}
if (fs.existsSync(outPath)) {
  console.error(`${outPath} already exists. Pick a new file name; this script never overwrites.`);
  process.exit(1);
}
process.env.DB_PATH = path.resolve(outPath);
const { initDb, getDb } = require('../../dist/src/backend/db/index.js');
const { reportsService } = require('../../dist/src/backend/services/reports.service.js');
const { reportsRepository } = require('../../dist/src/backend/repositories/reports.repository.js');

const load = t => fs.readFileSync(path.join(exportDir, t + '.jsonl'), 'utf8')
  .split('\n').filter(Boolean).map(l => JSON.parse(l));
const uuid = () => crypto.randomUUID();
const now = new Date().toISOString();
const str = v => (v === null || v === undefined ? '' : String(v)).trim();
const num = v => Number(v) || 0;
const round2 = v => Math.round(v * 100) / 100;
const fyShort = fy => fy.slice(0, 5) + fy.slice(7); // 2024-2025 -> 2024-25
// AC_PLUS keeps some dates as text, 'dd/mm/yyyy' or '__/__/____' when empty.
const textDate = v => { const m = str(v).match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };
// '305' -> 305, '1901/18-19' -> 1901, '2023-24/17' -> 17
const docNumber = v => {
  const s = str(v);
  const part = s.split('/').find(p => /^\d+$/.test(p.trim()));
  const n = parseInt(part !== undefined ? part : s.replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : null;
};
// Company names are stored shifted: character i is (real char + 18 + i).
const decodeName = s => [...s].map((ch, i) => String.fromCharCode(ch.charCodeAt(0) - 18 - i)).join('');

// AC_PLUS primary group number -> TexFin primary group (existing names reused where they mean the same).
const PRIMARY = {
  1: 'Fixed Assets', 2: 'Indirect Expenses', 3: 'Cash In Hand', 4: 'Bank Account', 5: 'Current Assets',
  6: 'Sundry Debtors', 7: 'Stock in Hand', 8: 'Advances', 9: 'Capital Account', 10: 'Secured Loans',
  11: 'Bank OverDraft', 12: 'Unsecured Loans', 13: 'Current Liabilities', 14: 'Sundry Creditors',
  15: 'Other Liabilities', 16: 'Sales', 17: 'Closing Stock', 18: 'Direct Income', 19: 'Indirect Income',
  20: 'Opening Stock', 21: 'Purchase', 22: 'Direct Expenses', 23: 'Indirect Expenses'
};
const VOUCHER_TYPES = {
  BP: 'Bank Payment', BR: 'Bank Receipt', CP: 'Cash Payment', CR: 'Cash Receipt', JV: 'Journal',
  BK: 'Bank Contra', CN: 'Credit Note', DN: 'Debit Note', GC: 'Sales Return (GC)', GD: 'Purchase Return (GD)',
  SB: 'Sales Bill Posting', PB: 'Purchase Bill Posting', ADJ: 'AC_PLUS Adjustment'
};

async function main() {
  const T = {};
  for (const t of ['COMPANY', 'AGGRP', 'AGMAS', 'ABMAS', 'ADCIT', 'ADSTA', 'ATMAS', 'AFMAS', 'ASMAS',
    'ADSRE', 'ACPRE', 'ADCHL', 'AXTRA', 'AFTRA', 'ASTRA', 'AGTRA']) T[t] = load(t);

  await initDb(); // fresh schema + the default company and its two logins
  const db = await getDb();
  const seeded = await db.get('SELECT id FROM companies LIMIT 1');
  const report = [];

  await db.exec('BEGIN');
  // The seeded sample data (dummy customer, supplier, items) is replaced by AC_PLUS's own.
  for (const t of ['accounts', 'groups', 'qualities', 'categories', 'descriptions', 'hsn_codes']) {
    await db.run(`DELETE FROM ${t} WHERE company_id = ?`, [seeded.id]);
  }

  const pgIds = {};
  for (const name of new Set(Object.values(PRIMARY))) {
    const row = await db.get('SELECT id FROM primary_groups WHERE name = ?', [name]);
    pgIds[name] = row ? row.id : uuid();
    if (!row) await db.run('INSERT INTO primary_groups (id, name) VALUES (?, ?)', [pgIds[name], name]);
  }

  const companyHash = (await db.get("SELECT password_hash FROM users WHERE username = 'companyadmin'")).password_hash;

  for (const C of T.COMPANY) {
    const pcom = C.CNUM;
    const by = t => T[t].filter(r => r.PCOM === pcom);
    const name = decodeName(str(C.CNAM));
    const code = 'KCT' + pcom;
    const email = str(C.CTE2).replace(/^email:/i, '');
    const companyFields = [name, code, str(C.CGST) || null, str(C.CPAN) || null,
      [C.CAD1, C.CAD2, C.CAD3, C.CAD4].map(str).filter(Boolean).join(', '),
      [C.CTE1, C.CTE3, C.CTE4].map(str).filter(Boolean).join(', '), email || null,
      str(C.CBK1) || null, str(C.CBK2) || null, str(C.CBK3) || null, str(C.CBK4) || null];
    let cid;
    if (pcom === '01') { // the main firm takes over the seeded company, so companyadmin logs straight into it
      cid = seeded.id;
      await db.run(`UPDATE companies SET name=?, code=?, gst_number=?, pan_number=?, address=?, phone=?, email=?,
        bank1_name=?, bank1_ifsc=?, bank2_name=?, bank2_ifsc=?, updated_at=? WHERE id=?`, [...companyFields, now, cid]);
    } else {
      cid = uuid();
      await db.run(`INSERT INTO companies (id, name, code, gst_number, pan_number, address, phone, email,
        bank1_name, bank1_ifsc, bank2_name, bank2_ifsc, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`, [cid, ...companyFields, now]);
      await db.run(`INSERT INTO users (id, company_id, username, password_hash, role, name, updated_at)
        VALUES (?, ?, ?, ?, 'ADMIN', ?, ?)`, [uuid(), cid, code.toLowerCase() + 'admin', companyHash, name + ' Admin', now]);
    }

    // ---- simple masters
    const nameMaster = async (table, rows, idField, nameField) => {
      const map = {};
      const seen = new Set();
      for (const r of rows) {
        const n = str(r[nameField]);
        map[str(r[idField])] = n;
        if (!n || seen.has(n.toUpperCase())) continue;
        seen.add(n.toUpperCase());
        await db.run(`INSERT INTO ${table} (id, company_id, name, updated_at) VALUES (?, ?, ?, ?)`, [uuid(), cid, n, now]);
      }
      return map;
    };
    const brokerName = await nameMaster('brokers', by('ABMAS'), 'ABRKID', 'AGNAM');
    const transportName = await nameMaster('transports', by('ATMAS'), 'ATRNID', 'ASNAM');
    await nameMaster('cities', by('ADCIT'), 'ADNAM', 'ADNAM');
    await nameMaster('states', by('ADSTA'), 'ADNAM', 'ADNAM');

    // ---- groups and accounts
    const groupName = {};
    for (const g of by('AGGRP')) {
      groupName[g.AGNUM] = str(g.AGNAM);
      await db.run('INSERT INTO groups (id, company_id, name, primary_group_id, updated_at) VALUES (?, ?, ?, ?, ?)',
        [uuid(), cid, str(g.AGNAM), pgIds[PRIMARY[g.AGPRI]] || null, now]);
    }
    const ledger = by('AGTRA');
    const opening = {};
    for (const t of ledger) if (t.AGTTYP === 'OP') opening[t.AGTNUM] = (opening[t.AGTNUM] || 0) + num(t.AGTADB) - num(t.AGTACR);
    const firstFyStart = ledger.reduce((d, t) => (t.AGTDAT && t.AGTDAT < d ? t.AGTDAT : d), '9999');

    const acc = {}; // AC_PLUS account number -> { id, name }
    for (const a of by('AGMAS')) {
      const id = uuid();
      const ob = round2(opening[a.AGNUM] || 0);
      acc[a.AGNUM] = { id, name: str(a.AGNAM) };
      await db.run(`INSERT INTO accounts (id, company_id, name, gst_number, contact_person, mobile_number, address, state,
        opening_balance, opening_balance_date, opening_balance_dc, group_name, city, pin_code, telephone_no, email,
        credit_days, pan_no, vat_tin_no, cst_tin_no, broker, print_order, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
        id, cid, str(a.AGNAM), str(a.AGGST) || null, str(a.AGCON) || null, str(a.AGOMB1) || str(a.AGOMB2) || null,
        [a.AGOAD1, a.AGOAD2, a.AGOAD3].map(str).filter(Boolean).join(', ') || null, str(a.AGSTA) || null,
        Math.abs(ob), ob ? firstFyStart : null, ob < 0 ? 'CR' : 'DR', groupName[a.AGGRP] || null,
        str(a.AGCIT) || null, str(a.AGPIN) || null, [a.AGOTE1, a.AGOTE2].map(str).filter(Boolean).join(', ') || null,
        str(a.AGOEML) || null, num(a.AGDAY), str(a.AGPAN) || null, str(a.AGVAT) || null, str(a.AGCST) || null,
        brokerName[str(a.AGBRK)] || null, str(a.AGORD) || null, now]);
    }
    const accountFor = n => acc[n] || null;

    // ---- items: FINISH lines (AXTRA/AFTRA) use AFMAS qualities, GREY lines (ASTRA) use ASMAS qualities
    const catId = {};
    for (const c of ['FINISH', 'GREY']) {
      catId[c] = uuid();
      await db.run('INSERT INTO categories (id, company_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [catId[c], cid, c, now, now]);
    }
    const qualityIds = {};
    const quality = async (cat, nm) => {
      const key = cat + '|' + nm;
      if (!qualityIds[key]) {
        qualityIds[key] = uuid();
        await db.run('INSERT INTO qualities (id, company_id, category_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          [qualityIds[key], cid, catId[cat], nm, now, now]);
      }
      return qualityIds[key];
    };
    const finishName = Object.fromEntries(by('AFMAS').map(r => [r.AFITMID, str(r.ASNAM)]));
    const greyName = Object.fromEntries(by('ASMAS').map(r => [r.AGITMID, str(r.ASNAM)]));
    const descIds = {};
    const description = async nm => {
      const n = nm || '-';
      const key = n.toUpperCase();
      if (!descIds[key]) {
        descIds[key] = uuid();
        await db.run('INSERT INTO descriptions (id, company_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [descIds[key], cid, n, now, now]);
      }
      return descIds[key];
    };
    const hsnIds = {};
    const hsn = async (code, gst) => {
      const c = parseInt(str(code), 10) || 0;
      if (!hsnIds[c]) {
        hsnIds[c] = uuid();
        await db.run('INSERT INTO hsn_codes (id, company_id, hsn_code, gst_percentage, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          [hsnIds[c], cid, c, num(gst), now, now]);
      }
      return hsnIds[c];
    };
    const lineKey = (fy, ref) => fy + '|' + str(ref);
    const group = (rows, code) => {
      const m = {};
      for (const r of rows) if (r.ASTCOD === code) (m[lineKey(r.ASTFYR, r.ASTREF)] = m[lineKey(r.ASTFYR, r.ASTREF)] || []).push(r);
      for (const k in m) m[k].sort((a, b) => num(a.ASTSRL) - num(b.ASTSRL));
      return m;
    };
    const saleLinesX = group(by('AXTRA'), 'SB'), saleLinesF = group(by('AFTRA'), 'SB');
    const purLinesF = group(by('AFTRA'), 'PB'), purLinesG = group(by('ASTRA'), 'PB');
    const chLines = group(by('AFTRA'), 'CH');
    const item = async (l, grey, fallbackGst) => {
      const taxable = num(l.ASTAMT);
      const gstPct = l.ASTIRT !== null && str(l.ASTIRT) !== '' ? num(l.ASTIRT) : fallbackGst;
      const gstAmt = l.ASTIAM !== undefined && l.ASTIAM !== null
        ? round2(num(l.ASTIAM) + num(l.ASTSAM) + num(l.ASTCAM)) : round2(taxable * gstPct / 100);
      return {
        category_id: catId[grey ? 'GREY' : 'FINISH'],
        quality_id: await quality(grey ? 'GREY' : 'FINISH', (grey ? greyName[l.ASTGID] : finishName[l.ASTFID]) || 'SHIRTING'),
        description_id: await description(str(l.ASTDES)),
        hsn_id: await hsn(l.ASTHSN, gstPct),
        pcs: Math.abs(num(l.ASTPCS)), meters: Math.abs(num(l.ASTQTY)), rate: num(l.ASTRAT),
        gst_percentage: gstPct, taxable_value: taxable, gst_amount: gstAmt, total_amount: round2(taxable + gstAmt),
        lot: parseInt(str(l.ASTLOT), 10) || 0
      };
    };

    // Documents whose party ledger line TexFin derives from the document itself.
    const docTotals = {}; // 'SB|fy|ref|acct' -> total
    const usedNumbers = new Set();
    const uniqueNumber = (kind, fy, n, original) => {
      let v = n === null ? 900000 : n;
      while (usedNumbers.has(kind + fy + '|' + v)) v += 100000;
      if (v !== n) report.push(`${code} ${kind} ${fy} "${original}" saved as number ${v} (number clash or unreadable)`);
      usedNumbers.add(kind + fy + '|' + v);
      return v;
    };

    let counts = { sales: 0, purchases: 0, challans: 0, journals: 0 };
    for (const s of by('ADSRE').filter(s => s.ADSTYP === 'SB')) {
      const cust = accountFor(s.ADSCUS);
      if (!cust) { report.push(`${code} sale ${s.ADSFYR}/${s.ADSBIL} skipped: unknown customer ${s.ADSCUS}`); continue; }
      const fy = fyShort(s.ADSFYR);
      const id = uuid();
      await db.run(`INSERT INTO sales (id, company_id, invoice_number, date, customer_id, financial_year, taxable_value, gst_amount,
        total_amount, updated_at, challan_number, challan_date, credit_days, broker_name, bale_number, order_number, order_date,
        lr_number, lr_date, transport, delivery_at, remark, credit_account, cartage, postage, less, less_add, rounded_off)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
        id, cid, uniqueNumber('SB', fy, docNumber(s.ADSBIL), s.ADSBIL), s.ADSDAT, cust.id, fy, num(s.ADSGMT), num(s.ADSTMT),
        num(s.ADSAMT), now, docNumber(s.ADSCHL), textDate(s.ADSCHD), num(s.ADSDAY), brokerName[str(s.ADSBRK)] || null,
        str(s.ADSBLN) || null, str(s.ADSONM) || null, textDate(s.ADSODT), str(s.ADSLRN) || null, textDate(s.ADSLDT),
        transportName[str(s.ADSTRN)] || null, str(s.ADSDEL) || null, str(s.ADSREM) || null,
        (accountFor(s.ADSGNM) || {}).name || null, num(s.ADSADD), num(s.ADSADD1), num(s.ADSLES), num(s.ADSLES1), num(s.ADSRUN)]);
      for (const l of saleLinesX[lineKey(s.ADSFYR, s.ADSREF)] || saleLinesF[lineKey(s.ADSFYR, s.ADSREF)] || []) {
        const i = await item(l, false, num(s.ADSIRT));
        await db.run(`INSERT INTO sales_items (id, sales_id, company_id, category_id, quality_id, description_id, hsn_id, pcs, meters,
          rate, gst_percentage, taxable_value, gst_amount, total_amount, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [uuid(), id, cid, i.category_id, i.quality_id, i.description_id, i.hsn_id, i.pcs, i.meters, i.rate, i.gst_percentage,
            i.taxable_value, i.gst_amount, i.total_amount, now]);
      }
      const k = `SB|${s.ADSFYR}|${str(s.ADSREF)}|${s.ADSCUS}`;
      docTotals[k] = (docTotals[k] || 0) + num(s.ADSAMT);
      counts.sales++;
    }

    for (const p of by('ACPRE').filter(p => p.ADSTYP === 'PB')) {
      const sup = accountFor(p.ADSSUP);
      if (!sup) { report.push(`${code} purchase ${p.ADSFYR}/${p.ADSREF} skipped: unknown supplier ${p.ADSSUP}`); continue; }
      const fy = fyShort(p.ADSFYR);
      const id = uuid();
      const entry = uniqueNumber('PB', fy, docNumber(p.ADSREF), p.ADSREF);
      await db.run(`INSERT INTO purchases (id, company_id, purchase_number, date, supplier_id, financial_year, taxable_value, gst_amount,
        total_amount, lot_number, updated_at, entry_no, credit_days, broker_name, challan_number, challan_date, lr_number, lr_date,
        transport, remark, debit_account, add_value, less_value, less_add, rounded_off)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
        id, cid, str(p.ADSBIL) || String(entry), p.ADSDAT, sup.id, fy, num(p.ADSGMT), num(p.ADSTMT), num(p.ADSAMT),
        parseInt(str(p.ADSLOT), 10) || null, now, entry, num(p.ADSDAY), brokerName[str(p.ADSBRK)] || null,
        docNumber(p.ADSCHL), textDate(p.ADSCHD), str(p.ADSLRN) || null, textDate(p.ADSLDT), transportName[str(p.ADSTRN)] || null,
        str(p.ADSREM) || null, (accountFor(p.ADSGNM) || {}).name || null, num(p.ADSADD), num(p.ADSLES), num(p.ADSLES1), num(p.ADSRUN)]);
      const key = lineKey(p.ADSFYR, p.ADSREF);
      const lines = [...(purLinesF[key] || []).map(l => [l, false]), ...(purLinesG[key] || []).map(l => [l, true])];
      for (const [l, grey] of lines) {
        const i = await item(l, grey, num(p.ADSIRT));
        await db.run(`INSERT INTO purchase_items (id, purchase_id, company_id, category_id, quality_id, description_id, hsn_id, lot_number,
          pcs, meters, rate, gst_percentage, taxable_value, gst_amount, total_amount, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [uuid(), id, cid, i.category_id, i.quality_id, i.description_id, i.hsn_id, i.lot || parseInt(str(p.ADSLOT), 10) || 0,
            i.pcs, i.meters, i.rate, i.gst_percentage, i.taxable_value, i.gst_amount, i.total_amount, now]);
      }
      const k = `PB|${p.ADSFYR}|${str(p.ADSREF)}|${p.ADSSUP}`;
      docTotals[k] = (docTotals[k] || 0) - num(p.ADSAMT);
      counts.purchases++;
    }

    for (const c of by('ADCHL')) {
      const cust = accountFor(c.ADSCUS);
      if (!cust) { report.push(`${code} challan ${c.ADSFYR}/${c.ADSBIL} skipped: unknown customer ${c.ADSCUS}`); continue; }
      const fy = fyShort(c.ADSFYR);
      const id = uuid();
      await db.run(`INSERT INTO delivery_challans (id, company_id, challan_number, date, customer_id, financial_year, taxable_value,
        gst_amount, total_amount, broker_name, bale_number, order_number, order_date, transport, delivery_at, remark, rounded_off, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
        id, cid, uniqueNumber('CH', fy, docNumber(c.ADSBIL), c.ADSBIL), c.ADSDAT, cust.id, fy, num(c.ADSGMT), num(c.ADSTMT),
        num(c.ADSAMT), brokerName[str(c.ADSBRK)] || null, str(c.ADSBLN) || null, str(c.ADSONM) || null, textDate(c.ADSODT),
        transportName[str(c.ADSTRN)] || null, str(c.ADSDEL) || null, str(c.ADSREM) || null, num(c.ADSRUN), now]);
      for (const l of chLines[lineKey(c.ADSFYR, c.ADSREF)] || []) {
        const i = await item(l, false, num(c.ADSTRT));
        await db.run(`INSERT INTO delivery_challan_items (id, challan_id, company_id, category_id, quality_id, description_id, hsn_id, pcs,
          meters, rate, gst_percentage, taxable_value, gst_amount, total_amount, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [uuid(), id, cid, i.category_id, i.quality_id, i.description_id, i.hsn_id, i.pcs, i.meters, i.rate, i.gst_percentage,
            i.taxable_value, i.gst_amount, i.total_amount, now]);
      }
      counts.challans++;
    }

    // ---- ledger: every AC_PLUS posting becomes a journal line, except opening rows (already on the
    // account) and the customer/supplier line of an imported bill (TexFin derives it from the bill).
    const partyLeg = {};
    const journalRows = [];
    for (const t of ledger) {
      if (t.AGTTYP === 'OP') continue;
      const k = `${t.AGTTYP}|${t.AGTFYR}|${str(t.AGTREF)}|${t.AGTNUM}`;
      if (k in docTotals) { partyLeg[k] = (partyLeg[k] || 0) + num(t.AGTADB) - num(t.AGTACR); continue; }
      journalRows.push({ t, dr: num(t.AGTADB), cr: num(t.AGTACR) });
    }
    // If a bill's total differs from what AC_PLUS actually posted, keep AC_PLUS's ledger figure.
    for (const k in docTotals) {
      const diff = round2((partyLeg[k] || 0) - docTotals[k]);
      if (!diff) continue;
      const [type, fy, ref, accNo] = k.split('|');
      const doc = (type === 'SB' ? by('ADSRE') : by('ACPRE')).find(d => d.ADSFYR === fy && str(d.ADSREF) === ref);
      journalRows.push({ t: { AGTTYP: 'ADJ', AGTFYR: fy, AGTREF: `${type}${ref}`, AGTDAT: doc.ADSDAT, AGTNUM: Number(accNo),
        AGTNAR: `Ledger difference on ${type} ${ref} as posted in AC_PLUS` }, dr: diff > 0 ? diff : 0, cr: diff < 0 ? -diff : 0 });
      report.push(`${code} ${type} ${fy}/${ref}: bill total differs from AC_PLUS ledger by ${diff}; adjustment line added`);
    }
    // TexFin's Trial Balance books each bill's total against its Sales/Purchase account by itself.
    // AC_PLUS's own postings for that side are already imported above, so cancel TexFin's copy.
    const byName = Object.fromEntries(Object.entries(acc).map(([n, a]) => [a.name.toUpperCase(), Number(n)]));
    const offsetAccounts = new Set();
    for (const s of await db.all(`SELECT 'SB' AS type, invoice_number AS no, date, financial_year AS fy, COALESCE(credit_account, 'SALES') AS contra, total_amount AS total FROM sales WHERE company_id = ?1
        UNION ALL SELECT 'PB', entry_no, date, financial_year, COALESCE(debit_account, 'PURCHASE'), -total_amount FROM purchases WHERE company_id = ?1`, [cid])) {
      const accNo = byName[s.contra.toUpperCase()];
      if (accNo === undefined) { report.push(`${code} ${s.type} ${s.fy}/${s.no}: no account named ${s.contra} to balance against`); continue; }
      offsetAccounts.add(accNo);
      journalRows.push({ t: { AGTTYP: s.type, AGTFYR: s.fy.slice(0, 5) + '20' + s.fy.slice(5), AGTREF: `${s.no}-TB`, AGTDAT: s.date, AGTNUM: accNo,
        AGTNAR: 'Balances the Trial Balance for this bill (AC_PLUS import)' }, dr: s.total > 0 ? s.total : 0, cr: s.total < 0 ? -s.total : 0 });
    }
    for (const type of new Set(journalRows.map(j => j.t.AGTTYP))) {
      await db.run('INSERT INTO journal_voucher_types (id, company_id, name, updated_at) VALUES (?, ?, ?, ?)',
        [uuid(), cid, VOUCHER_TYPES[type] || type, now]);
    }
    for (const { t, dr, cr } of journalRows) {
      if (!dr && !cr) continue;
      const a = accountFor(t.AGTNUM);
      if (!a) { report.push(`${code} ledger line ${t.AGTTYP} ${t.AGTFYR}/${t.AGTREF} skipped: unknown account ${t.AGTNUM}`); continue; }
      const extra = [str(t.AGTBNK), num(t.AGTCHQ) ? 'Chq ' + t.AGTCHQ : ''].filter(Boolean).join(' ');
      await db.run(`INSERT INTO journal_vouchers (id, company_id, voucher_no, date, voucher_type, account_id, debit_amount,
        credit_amount, particulars, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`, [
        uuid(), cid, `${t.AGTTYP}-${fyShort(t.AGTFYR)}-${str(t.AGTREF)}`, t.AGTDAT, VOUCHER_TYPES[t.AGTTYP] || t.AGTTYP, a.id,
        dr, cr, [str(t.AGTNAR), extra].filter(Boolean).join(' | ') || null, now]);
      counts.journals++;
    }

    // ---- self-check: the app's own Trial Balance must show every account exactly as AC_PLUS has it,
    // and the party balances the dashboard uses (reportsRepository) must agree too.
    const expected = {};
    for (const t of ledger) expected[t.AGTNUM] = (expected[t.AGTNUM] || 0) + num(t.AGTADB) - num(t.AGTACR);
    const tb = await reportsService.getTrialBalance(cid, '0000-01-01', '9999-12-31', 'with_opening');
    const tbNet = Object.fromEntries(tb.map(r => [r.id, r.debit - r.credit]));
    const partyNet = Object.fromEntries((await reportsRepository.getAccountNetBalances(cid)).map(r => [r.id, r.net_dr]));
    let mismatches = 0;
    const check = (label, n, got) => {
      if (Math.abs(round2(expected[n] || 0) - round2(got || 0)) <= 0.01) return;
      mismatches++;
      report.push(`${code} ${label} MISMATCH ${acc[n].name}: AC_PLUS ${round2(expected[n] || 0)} vs TexFin ${round2(got || 0)}`);
    };
    for (const n in acc) {
      check('TRIAL BALANCE', n, tbNet[acc[n].id]);
      if (!offsetAccounts.has(Number(n))) check('LEDGER', n, partyNet[acc[n].id]);
    }
    if (tb.some(r => !r.id || String(r.id).startsWith('VIRTUAL_'))) {
      mismatches++;
      report.push(`${code} Trial Balance has accounts that are not in AC_PLUS: ${tb.filter(r => String(r.id).startsWith('VIRTUAL_')).map(r => r.name).join(', ')}`);
    }
    console.log(`${code} ${name}: ${Object.keys(acc).length} accounts, ${counts.sales} sales, ${counts.purchases} purchases, ` +
      `${counts.challans} challans, ${counts.journals} ledger lines, balance mismatches: ${mismatches}`);
  }

  await db.exec('COMMIT');
  fs.writeFileSync(outPath + '.import-report.txt', report.join('\n') + '\n');
  console.log(`\nDone: ${outPath}\nNotes (${report.length}): ${outPath}.import-report.txt`);
}

main().catch(e => { console.error(e); process.exit(1); });
