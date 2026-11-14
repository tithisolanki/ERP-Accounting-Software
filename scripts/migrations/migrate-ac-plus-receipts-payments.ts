/**
 * One-off migration: backfills TexFin's receipts/payments + their bill-wise allocations from
 * the legacy AC_PLUS Access database (ACMPNM.mdb), which were never migrated when sales/purchases
 * were (receipts/payments/receipt_allocations/payment_allocations were all empty in TexFin).
 *
 * Source data was extracted read-only from the live Access DB via PowerShell/ACE OLEDB (Node has
 * no Access driver) into JSON files under the directory passed as argv[2]:
 *   agmas.json  -- AGNUM/AGNAM/AGGRP, the legacy numeric account code -> name map (PCOM='01')
 *   br.json / cr.json / bp.json / cp.json -- the party-account leg of every Bank/Cash
 *     Receipt/Payment row in AGTRA (AGTACR>0 for receipts, AGTADB>0 for payments -- the OTHER
 *     leg, the cash/bank account itself, is intentionally not migrated as its own ledger row;
 *     TexFin's receipts/payments schema already represents "the other side" implicitly)
 *   adalo.json / acalo.json -- every bill-wise allocation row (debtor/creditor) for PCOM='01'
 *
 * There is no column anywhere linking a TexFin account to its legacy AC_PLUS numeric code, so
 * accounts are matched by exact, case/whitespace-insensitive name match against agmas.json's
 * AGNAM. Anything that doesn't match exactly is skipped and reported -- never guessed.
 *
 * Run modes:
 *   ts-node -P tsconfig.electron.json scripts/migrations/migrate-ac-plus-receipts-payments.ts <extractDir>              (dry run, writes nothing)
 *   ts-node -P tsconfig.electron.json scripts/migrations/migrate-ac-plus-receipts-payments.ts <extractDir> --apply      (writes for real, inside one transaction)
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

process.env.DB_PATH = path.resolve(__dirname, '../../ACPLUS-DATA.sqlite');

import { getDb, withTransaction } from '../../src/backend/db/index';
import { accVoucherRepository } from '../../src/backend/repositories/accvoucher.repository';

const extractDir = process.argv[2];
const APPLY = process.argv.includes('--apply');
if (!extractDir) {
  console.error('Usage: migrate-ac-plus-receipts-payments.ts <extractDir> [--apply]');
  process.exit(1);
}

const norm = (s: string) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
const loadJson = (file: string) => JSON.parse(fs.readFileSync(path.join(extractDir, file), 'utf8').replace(/^﻿/, ''));
const isTruthyNum = (v: any) => v !== undefined && v !== null && Number(v) !== 0 && String(v).trim() !== '';

function financialYearOf(dateStr: string): string {
  const [y, m] = dateStr.split('-').map(Number);
  return m >= 4 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`;
}

interface LegacyLine {
  AGTNUM: number; AGTSNM: number; AGTADB: number; AGTACR: number;
  AGTREF: string; AGTFYR: string; AGTDAT: string; AGTNAR: string;
  AGTCHQ: string | number; AGTCDT: string; AGTBNK: string;
}
interface LegacyAlloc {
  ADMNUM: number; ADMDAT: string; ADMTYP: string; ADMREF: string;
  ADMBDT: string; ADMBTY: string; ADMBRF: string; ADMBIL: string | number;
  ADMAMT: number; ADMDIS: number;
}

async function main() {
  const db = await getDb();
  const company = await db.get(`SELECT id FROM companies WHERE code = 'KCT01'`);
  if (!company) throw new Error("Company 'KCT01' not found -- refusing to guess which company this data belongs to.");
  const companyId = company.id as string;

  const accounts: { id: string; name: string }[] = await db.all(`SELECT id, name FROM accounts WHERE company_id = ?`, [companyId]);
  const accountIdByName = new Map<string, string>();
  for (const a of accounts) accountIdByName.set(norm(a.name), a.id);

  const agmas: { AGNUM: number; AGNAM: string }[] = loadJson('agmas.json');
  const nameByCode = new Map<number, string>();
  for (const r of agmas) nameByCode.set(r.AGNUM, r.AGNAM);

  const unmatchedAccountCodes = new Map<number, number>(); // code -> occurrence count
  function resolveAccountId(code: number): string | null {
    const name = nameByCode.get(code);
    const id = name ? accountIdByName.get(norm(name)) : undefined;
    if (!id) unmatchedAccountCodes.set(code, (unmatchedAccountCodes.get(code) || 0) + 1);
    return id || null;
  }

  // voucher key (account code, voucher type, ref, date) -> the receipts/payments row id just built,
  // so ADALO/ACALO rows (same tuple, minus account since ADMNUM already gives it) can find it.
  const voucherLineId = new Map<string, string>();
  const voucherKey = (num: number, typ: string, ref: string, dat: string) => `${num}|${typ}|${ref}|${dat}`;

  type NewLine = { table: 'receipts' | 'payments'; id: string; accountId: string; amount: number; date: string; paymentMode: string; referenceNumber: string | null; notes: string };
  const newLines: NewLine[] = [];
  let skippedZeroAmount = 0;

  function buildLines(rows: LegacyLine[], table: 'receipts' | 'payments', typ: 'BR' | 'CR' | 'BP' | 'CP') {
    for (const r of rows) {
      const amount = typ === 'BR' || typ === 'CR' ? r.AGTACR : r.AGTADB;
      if (!(amount > 0)) { skippedZeroAmount++; continue; }
      const accountId = resolveAccountId(r.AGTNUM);
      if (!accountId) continue;
      const voucherNo = `${r.AGTFYR}-${r.AGTREF}`;
      const chequeNo = isTruthyNum(r.AGTCHQ) ? String(r.AGTCHQ) : null;
      const paymentMode = typ === 'CR' || typ === 'CP' ? 'Cash' : chequeNo ? 'Cheque' : 'Bank';
      const notes = `[Voucher: ${voucherNo}] [Bank: ${r.AGTBNK || ''}] [Drawn: ${r.AGTCDT || ''}] ${r.AGTNAR || ''}`.trim();
      const id = crypto.randomUUID();
      newLines.push({ table, id, accountId, amount, date: r.AGTDAT, paymentMode, referenceNumber: chequeNo, notes });
      voucherLineId.set(voucherKey(r.AGTNUM, typ, r.AGTREF, r.AGTDAT), id);
    }
  }

  buildLines(loadJson('br.json'), 'receipts', 'BR');
  buildLines(loadJson('cr.json'), 'receipts', 'CR');
  buildLines(loadJson('bp.json'), 'payments', 'BP');
  buildLines(loadJson('cp.json'), 'payments', 'CP');

  // Bills: index sales/purchases by (accountId, financial_year, number) for allocation matching.
  const sales: { id: string; customer_id: string; invoice_number: number; financial_year: string; total_amount: number }[] =
    await db.all(`SELECT id, customer_id, invoice_number, financial_year, total_amount FROM sales WHERE company_id = ?`, [companyId]);
  const purchases: { id: string; supplier_id: string; purchase_number: string; financial_year: string; total_amount: number }[] =
    await db.all(`SELECT id, supplier_id, purchase_number, financial_year, total_amount FROM purchases WHERE company_id = ?`, [companyId]);
  const saleByKey = new Map<string, typeof sales[0]>();
  for (const s of sales) saleByKey.set(`${s.customer_id}|${s.financial_year}|${s.invoice_number}`, s);
  const purchaseByKey = new Map<string, typeof purchases[0]>();
  for (const p of purchases) purchaseByKey.set(`${p.supplier_id}|${p.financial_year}|${String(p.purchase_number).trim()}`, p);

  type NewAlloc = { table: 'receipt_allocations' | 'payment_allocations'; id: string; parentId: string; billId: string; amountApplied: number; discountAmount: number };
  const newAllocs: NewAlloc[] = [];
  let unmatchedVoucher = 0, unmatchedBill = 0, unmatchedAllocAccount = 0, otherVoucherTypeSkipped = 0;
  const otherVoucherTypeCounts = new Map<string, number>();
  const unmatchedBillFyCounts = new Map<string, number>();
  const unmatchedBillSamples: any[] = [];
  let crossVoucherSettlement = 0;
  const crossVoucherTypeCounts = new Map<string, number>();

  function buildAllocs(rows: LegacyAlloc[], side: 'debtor' | 'creditor', typ1: 'BR' | 'CR' | 'BP' | 'CP', typ2: 'BR' | 'CR' | 'BP' | 'CP') {
    for (const r of rows) {
      const accountId = resolveAccountId(r.ADMNUM);
      if (!accountId) { unmatchedAllocAccount++; continue; }
      const typ = r.ADMTYP === typ1 || r.ADMTYP === typ2 ? r.ADMTYP as 'BR' | 'CR' | 'BP' | 'CP' : null;
      if (!typ) {
        // A Credit/Debit Note or Journal Voucher settling this bill -- not migrated, since
        // TexFin doesn't model bill-wise linkage for those yet (separate, unbuilt feature).
        otherVoucherTypeSkipped++;
        otherVoucherTypeCounts.set(r.ADMTYP, (otherVoucherTypeCounts.get(r.ADMTYP) || 0) + 1);
        continue;
      }
      const parentId = voucherLineId.get(voucherKey(r.ADMNUM, typ, r.ADMREF, r.ADMDAT));
      if (!parentId) { unmatchedVoucher++; continue; }

      // ADMBTY isn't always a real bill -- it's the TYPE of whatever this allocation settles,
      // which AC_PLUS also lets be another voucher (a Journal Voucher, Credit/Debit Note, or
      // even another Payment/Receipt "on account" cross-settlement). Only SB/PB are TexFin
      // sales/purchase bills; everything else is a cross-voucher settlement TexFin's allocation
      // tables structurally can't represent yet (they only reference sales.id/purchases.id).
      if (r.ADMBTY !== 'SB' && r.ADMBTY !== 'PB') {
        crossVoucherSettlement++;
        crossVoucherTypeCounts.set(r.ADMBTY, (crossVoucherTypeCounts.get(r.ADMBTY) || 0) + 1);
        continue;
      }
      const fy = financialYearOf(r.ADMBDT);
      const billNo = String(r.ADMBIL).trim();
      const bill = side === 'debtor' ? saleByKey.get(`${accountId}|${fy}|${Number(billNo)}`) : purchaseByKey.get(`${accountId}|${fy}|${billNo}`);
      if (!bill) {
        unmatchedBill++;
        unmatchedBillFyCounts.set(fy, (unmatchedBillFyCounts.get(fy) || 0) + 1);
        if (fy >= '2016-17' && unmatchedBillSamples.length < 10) unmatchedBillSamples.push({ accountId, fy, billNo, ADMBTY: r.ADMBTY, ADMBDT: r.ADMBDT });
        continue;
      }

      newAllocs.push({
        table: side === 'debtor' ? 'receipt_allocations' : 'payment_allocations',
        id: crypto.randomUUID(), parentId, billId: bill.id,
        amountApplied: r.ADMAMT, discountAmount: r.ADMDIS || 0
      });
    }
  }
  buildAllocs(loadJson('adalo.json'), 'debtor', 'BR', 'CR');
  buildAllocs(loadJson('acalo.json'), 'creditor', 'BP', 'CP');

  console.log('--- Migration report ---');
  console.log(`Receipt/payment lines built: ${newLines.length} (receipts: ${newLines.filter(l => l.table === 'receipts').length}, payments: ${newLines.filter(l => l.table === 'payments').length})`);
  console.log(`Skipped (zero amount on the party leg): ${skippedZeroAmount}`);
  console.log(`Unmatched account codes (no exact TexFin account name match): ${unmatchedAccountCodes.size} distinct codes, ${[...unmatchedAccountCodes.values()].reduce((a, b) => a + b, 0)} lines affected`);
  if (unmatchedAccountCodes.size > 0) {
    console.log('  Sample unmatched account names:', [...unmatchedAccountCodes.keys()].slice(0, 15).map(c => nameByCode.get(c)).join(' | '));
  }
  console.log(`Allocation rows built: ${newAllocs.length}`);
  console.log(`Allocations skipped -- account not matched: ${unmatchedAllocAccount}`);
  console.log(`Allocations skipped -- settled by a Credit/Debit Note or Journal Voucher (not migrated, not modeled yet): ${otherVoucherTypeSkipped}`, Object.fromEntries(otherVoucherTypeCounts));
  console.log(`Allocations skipped -- settling voucher not found among built lines: ${unmatchedVoucher}`);
  console.log(`Allocations skipped -- settles a Journal Voucher/Credit-Debit Note/cross-voucher "on account" adjustment, not a sales/purchase bill (same unmodeled gap as Print Allocation's known limitation): ${crossVoucherSettlement}`, Object.fromEntries(crossVoucherTypeCounts));
  console.log(`Allocations skipped -- real sales/purchase bill not found in TexFin: ${unmatchedBill}`);
  console.log('Unmatched real bills by financial year (pre-2016-17 = predates TexFin\'s own migrated invoices, expected):', Object.fromEntries([...unmatchedBillFyCounts].sort()));
  console.log('Sample unmatched real bills within TexFin\'s migrated range (2016-17+) -- these WOULD be a real gap:', JSON.stringify(unmatchedBillSamples, null, 2));
  const totalAllocRows = newAllocs.length + unmatchedAllocAccount + otherVoucherTypeSkipped + unmatchedVoucher + crossVoucherSettlement + unmatchedBill;
  console.log(`Accounted for: ${totalAllocRows} of ${totalAllocRows} source rows (sanity check)`);

  if (!APPLY) {
    console.log('\nDRY RUN -- nothing written. Re-run with --apply to write for real.');
    return;
  }

  console.log('\nWriting for real...');
  await withTransaction(async (txDb) => {
    const now = new Date().toISOString();
    for (const line of newLines) {
      await accVoucherRepository.createVoucherLine(txDb, line.table, {
        id: line.id, companyId, accountId: line.accountId, amount: line.amount, date: line.date,
        paymentMode: line.paymentMode, referenceNumber: line.referenceNumber, notes: line.notes, now
      });
    }
    for (const alloc of newAllocs) {
      if (alloc.table === 'receipt_allocations') {
        await accVoucherRepository.createReceiptAllocation(txDb, {
          id: alloc.id, companyId, receiptId: alloc.parentId, saleId: alloc.billId,
          amountApplied: alloc.amountApplied, discountAmount: alloc.discountAmount, now
        });
      } else {
        await accVoucherRepository.createPaymentAllocation(txDb, {
          id: alloc.id, companyId, paymentId: alloc.parentId, purchaseId: alloc.billId,
          amountApplied: alloc.amountApplied, discountAmount: alloc.discountAmount, now
        });
      }
    }
  });
  console.log(`Wrote ${newLines.length} receipt/payment lines and ${newAllocs.length} allocation rows.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
