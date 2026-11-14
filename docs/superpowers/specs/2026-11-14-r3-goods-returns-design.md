# R3 (part 1): Goods Returns — Sales Return / Purchase Return — Design

**Spec status:** approved approach (dedicated tables), scope-split from full R3 per the
user's explicit call — this covers only the itemized Goods Return pair (AC_PLUS's
`ASALRTENTRY1`/"Sales Return (Goods Credit Note)" and `APURRETENTRY`/"Purchase Return
(Goods Debit Note)"). The simpler, non-itemized Credit Note/Debit Note screens
(`ACNOTEENTRY`/`ADNOTEENTRY`) are a separate, smaller follow-on, out of scope here.

## Intent and why

ROADMAP.md's R3: *"Credit notes, debit notes, sales and purchase returns — Missing
entirely. Returns, rate differences and kasar are daily events. Faking them with
journals makes GST returns wrong."* Goods physically come back in textile trading
(wrong quality, damaged lot, short-shipment) and today TexFin has no way to record
that without hand-editing a Journal Voucher — which can't touch GST, can't itemize
which quality/HSN came back, and can't reduce the original bill's own outstanding
balance in a way Outstanding Ledger or Print Allocation would ever see.

## Goals

- A Sales Return (customer sent goods back) and a Purchase Return (sent goods back to
  a supplier) each get their own itemized voucher, matching AC_PLUS's real grid shape.
- Each return references exactly one original bill (`Against Bill No. + Bill Date`,
  AC_PLUS's own field — singular, not a multi-bill split like R7/R20's allocations).
- A return correctly reverses GST (reduces output/input tax liability for the returned
  quantity) and correctly reduces the customer's/supplier's net balance — shows up in
  Trial Balance, Account Ledger, and Outstanding Ledger the same way a bill does, just
  with the opposite sign.
- A Register + Print screen per side, consistent with every other voucher type.

## Non-goals (this pass)

- The non-itemized Credit Note/Debit Note screens (rate-adjustment only, no goods
  movement) — separate follow-on, per the user's own scope split.
- Real stock integration. R11 ("no stock check on sale, no lot-wise stock report") is
  its own unbuilt roadmap item; a return doesn't need to touch a stock balance that
  doesn't exist yet. It still records quality/meters/HSN per line, so R11 can read
  returns the same way it'll eventually read sales/purchases.
- GST Title Master-style per-rate input/output ledger account mapping. R4 ("GST done
  properly") is a separate, unbuilt roadmap item; Sales/Purchase invoices today use a
  flat `gst_percentage` per line with no per-rate ledger mapping (confirmed in
  `voucherCalculation.service.ts` — no GST Title Master exists in this codebase yet),
  so a return reuses that same flat model rather than anticipating R4's design.
- Credit limit checks, approval workflows, or any business rule AC_PLUS itself doesn't
  enforce (confirmed: AC_PLUS_DATA_FLOW.md already notes validation order isn't
  recoverable from stored data and wasn't pursued).

## Anti-goals

- Don't let a return silently create a bill whose "Against Bill" doesn't exist, isn't
  for the same account, or whose remaining quantity/value the return already exceeds
  without at least a clear warning path (see Review Focus).
- Don't duplicate `sales`/`purchases` rows for returns (ruled out as Approach B in the
  brainstorm — a return is its own row, not a negative-amount sale).

## Constraints

- Follow this codebase's existing voucher pattern exactly: a header table + an items
  table, a `buildX`-style shared builder function used by both create and update
  (`sales.service.ts`'s `buildSale` is the template), `calculateItemTotals`/
  `calculateVoucherTotals`/`roundMoney`/`parseDocNumber` from
  `voucherCalculation.service.ts` reused as-is, `resolveDescriptionAndHsn` reused as-is.
- Numbering: its own independent sequence per side, FY-scoped, mirroring
  `getNextInvoiceNumber`/`findMaxInvoiceNumber`'s exact shape — confirmed from real
  AC_PLUS data this session (Print Allocation's printed sample showed "Goods D.Note 9",
  "1", "2", "3" — small, independent counters, not sharing the Purchase Bill sequence).
- GST sign: a return's `taxable_value`/`gst_amount` are stored positive (same convention
  as sales/purchases — AC_PLUS's own `AXTRA`/`AFTRA` store returns with **signed negative
  quantities**, confirmed in `AC_PLUS_DATA_FLOW.md`, but TexFin's ledger-sign reversal
  happens at the posting/net-balance layer instead, not in the stored row — simpler and
  consistent with how `sales`/`purchases` already store positive amounts and let the
  Dr/Cr side of the UNION query carry the sign).

## Approaches considered (from the brainstorm, user picked A)

- **A — dedicated tables** (chosen): `sales_returns`/`sales_return_items`,
  `purchase_returns`/`purchase_return_items`, mirroring `sales`/`sales_items` and
  `purchases`/`purchase_items` exactly. Matches this codebase's existing convention of
  one dedicated table per voucher type (`delivery_challans` is already separate from
  `sales` for the same reason).
- **B — reuse `sales`/`purchases` with a return flag/negative amounts** (rejected):
  matches AC_PLUS's own polymorphic `AFTRA` internally, but `AC_PLUS_DATA_FLOW.md`
  already flagged that exact pattern as "an Access-era performance workaround" this
  project doesn't need to replicate; would force every existing sales/purchases query
  (Outstanding Ledger, GST calc, Trial Balance) to special-case a possibly-negative row.
- **C — model a return as an R20 Allocation Entry** (rejected): loses item-level detail
  (which quality, how many meters, which HSN) a goods return structurally needs.

## Schema

```sql
CREATE TABLE sales_returns (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  return_number INTEGER NOT NULL,
  date TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  financial_year TEXT NOT NULL,
  against_sale_id TEXT NOT NULL,     -- "Against Bill No." -- exactly one original bill
  against_bill_date TEXT NOT NULL,   -- "Bill Date", as AC_PLUS's own field separately stores it
  return_type TEXT NOT NULL,         -- 'Grey' or 'Finish' -- AC_PLUS's Option1 radio
  taxable_value REAL NOT NULL,
  gst_amount REAL NOT NULL,
  total_amount REAL NOT NULL,
  remark TEXT,
  is_dirty INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(customer_id) REFERENCES accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY(against_sale_id) REFERENCES sales(id) ON DELETE RESTRICT
);

CREATE TABLE sales_return_items (
  id TEXT PRIMARY KEY,
  sales_return_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  quality_id TEXT NOT NULL,
  description_id TEXT NOT NULL,
  hsn_id TEXT NOT NULL,
  pcs INTEGER DEFAULT 0,
  meters REAL NOT NULL,
  rate REAL NOT NULL,
  gst_percentage REAL NOT NULL,
  taxable_value REAL NOT NULL,
  gst_amount REAL NOT NULL,
  total_amount REAL NOT NULL,
  is_dirty INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(sales_return_id) REFERENCES sales_returns(id) ON DELETE CASCADE,
  FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  FOREIGN KEY(quality_id) REFERENCES qualities(id) ON DELETE RESTRICT,
  FOREIGN KEY(description_id) REFERENCES descriptions(id) ON DELETE RESTRICT,
  FOREIGN KEY(hsn_id) REFERENCES hsn_codes(id) ON DELETE RESTRICT
);

CREATE INDEX idx_sales_returns_company ON sales_returns(company_id);
CREATE INDEX idx_sales_returns_against_sale ON sales_returns(against_sale_id);
CREATE UNIQUE INDEX ux_sales_returns_number ON sales_returns(company_id, financial_year, return_number);
```

`purchase_returns`/`purchase_return_items` mirror the above, with `supplier_id` +
`against_purchase_id` (→ `purchases.id`) in place of `customer_id` + `against_sale_id`,
**plus one extra column `purchase_returns` has that `sales_returns` doesn't:
`broker_name TEXT`** — confirmed from the live binary's `APURRETENTRY` form (a `BrkList`
control) that Purchase Return carries a broker, while `ASALRTENTRY1`'s confirmed field
list (`AC_PLUS_SCREEN_MAP.md`) and its own control list have no broker field at all.
Both new index/table pairs go in `db/schema/voucher.sql`, following
the existing file's layout; a matching `ensureSchemaUpdates` mirror block goes in
`src/backend/db/index.ts` for existing installs (same pattern as every other table this
session added — see the Allocation Entry tables for the exact shape to copy).

## Service/repository layer

`sales-return.service.ts` + `sales-return.repository.ts` (and the purchase-return
mirror), structured exactly like `sales.service.ts`/`salesRepository`:

- `buildSalesReturn(db, companyId, returnId, body)` — same shape as `buildSale`:
  validates `againstSaleId`/`date`/`customerId`/`financialYear`/`items`, resolves
  HSN/description per line via `resolveDescriptionAndHsn`, computes per-line and
  voucher totals via the existing `calculateItemTotals`/`calculateVoucherTotals`.
  **New validation `buildSale` doesn't need:** `againstSaleId` must reference a real
  sale under this `companyId`, and (see Review Focus) the return shouldn't silently
  exceed what's left to return against that bill.
- `createSalesReturn`/`updatePurchaseReturn`/`deleteSalesReturn` — same transaction
  shape as `createSale`/`updatePurchase`/`deleteSale`.
- `getNextSalesReturnNumber(companyId, financialYear)` →
  `findMaxSalesReturnNumber` — identical shape to `getNextInvoiceNumber`.

## Ledger integration

Four places need a touch -- the first three additive (a new UNION branch, no existing
branch changes), the fourth a real change to existing balance logic:

- `reportsRepository.getAccountNetBalances` (`reports.repository.ts`): add
  `UNION ALL SELECT customer_id, 0, total_amount FROM sales_returns WHERE company_id=?1`
  (credits the customer — a return reduces what they owe, the mirror image of a sale's
  `SELECT customer_id, total_amount, 0`) and the supplier mirror
  (`SELECT supplier_id, total_amount, 0 FROM purchase_returns` — debits the supplier).
- `reportsRepository.getAccountPostings`: one new `UNION ALL` block per return type,
  same shape as the existing Sales/Purchase blocks, labelled `'Sales Return'`/
  `'Purchase Return'` with the credit/debit column swapped from the equivalent bill.
- **`reportsRepository.getSalesGst`/`getPurchasesGst`** (feeding
  `reportsService.getGstReport`, `reports.service.ts:207`): each needs a sibling query
  (`getSalesReturnsGst`/`getPurchaseReturnsGst`) returning the same shape
  (`invoice_number`/`return_number`, date, taxable_value, gst_amount, party_name,
  gst_number, party_state) from `sales_returns`/`purchase_returns`. `getGstReport`
  appends these as their own rows in the existing `salesList`/`purchasesList` -- not
  netted into the original invoice's row -- with taxable/CGST/SGST/IGST stored negative,
  the same way a real GSTR-1 filing reports Credit/Debit Notes as their own line items
  in their own section, not folded into the original invoice. This is not optional
  scope: it's the literal problem ROADMAP.md's R3 entry names ("faking them with
  journals makes GST returns wrong") and it's cheap -- the same shape as the other three
  touch points here, no new infrastructure. (The GST Summary Report itself is still the
  simplified, pre-R4 version -- flat rate, no GST Title Master -- this only makes that
  existing report correctly reflect returns, it doesn't rebuild it.)
- **`accVoucherRepository.getOutstandingBills`/`getOutstandingBillsForAccounts`** (used
  by Outstanding Ledger, Print Allocation, and the receipt/payment bill-picker): the
  `against_sale_id` bill's own `balanceDue` calculation needs its matching return's
  `total_amount` subtracted, the same way `receipt_allocations`/`allocation_entry_bills`
  already are — a bill with ₹10,000 total, ₹2,000 returned, and ₹3,000 paid should show
  ₹5,000 due, not ₹8,000. This is the one place a return's bill-linkage actually changes
  existing query logic, not just adds a new branch.

**Over-return handling (my call, settling the brainstorm's open anti-goal):** allow,
don't hard-reject -- unlike the account-mismatch case (always a real error, always
rejected), a return that would take a bill's remaining balance negative is flagged as a
warning the caller must explicitly confirm, not silently blocked. `buildSalesReturn`
computes the bill's current `balanceDue` (reusing the same calculation
`getOutstandingBills` already does) and throws a distinguishable `OverReturnError` if
the new return's `total_amount` would exceed it and the request didn't set
`confirmOverage: true`; the frontend catches that specific error and shows a
confirmation dialog ("This exceeds the bill's remaining balance by ₹X — continue?")
before resubmitting with the flag set. This check is at the whole-bill `total_amount`
level only, not per line/quality -- consistent with this document's own Non-goal of no
stock/quantity tracking, since there's no FK from `sales_return_items` back to the
original `sales_items` row to check against at line granularity.

## API

`POST /api/sales-returns`, `PUT /api/sales-returns/:id`, `DELETE /api/sales-returns/:id`,
`GET /api/sales-returns` (register), `GET /api/sales-returns/next-number`,
`GET /api/sales-returns/print-pdf` — same route shape as `/api/transactions/sales`,
purchase-return mirror under its own prefix. Follows `AuthenticatedRequest`/
`req.user.company_id` scoping used everywhere else in this codebase. The POST/PUT body
takes an optional `confirmOverage: boolean` (default false) per the over-return
handling in Ledger Integration; the controller passes it straight through to
`buildSalesReturn`/`buildPurchaseReturn` and returns the `OverReturnError`'s message
as a 409 (not 400/500) so the frontend can distinguish "needs confirmation" from a
real validation failure.

## Frontend

Two new voucher entry pages (`SalesReturnPage.tsx`/`PurchaseReturnPage.tsx`), reusing
the existing `VoucherHeaders`/`ProductGridTable` components from
`src/frontend/modules/vouchers/components/` the same way the Sales Invoice/Purchase
Bill pages already do, plus:
- An "Against Bill No." picker — a single-select dropdown of the chosen account's bills
  (reuse the data `getOutstandingBills` already returns, narrowed to one account, no
  multi-select needed since this is a single reference, not an allocation).
- The Grey/Finish Return radio (`return_type`).
- A Register page (list + filters, matching `PurchaseRegister`/`SalesRegister`'s
  existing shape) and a Print PDF (reuse `generateInvoicePdf`'s layout conventions,
  titled "Goods Credit Note"/"Goods Debit Note" per AC_PLUS's own confirmed form
  captions).

Navigation: direct siblings of Sales Invoice/Purchase Bill under Data Entry, matching
how AC_PLUS itself places "Sales Return Entry" under Data Entry ▸ Sales Invoice and
"Purchase Return Entry" under Data Entry ▸ Purchase Bill (confirmed in
`AC_PLUS_SCREEN_MAP.md`) — not a new top-level menu.

## Review Focus

- **A return against a bill from a different account than the one selected.** AC_PLUS's
  form doesn't show this is prevented; TexFin should reject it outright (the account
  picked for the return and the `customer_id`/`supplier_id` on the referenced bill must
  match) rather than silently letting a return land on the wrong ledger.
- **A return whose total exceeds what's left on the bill** (already fully paid off, or
  already partly returned past the original amount). Resolved in Ledger Integration
  above (`OverReturnError` + `confirmOverage`) -- the test here is that the warning
  path actually fires at the right threshold (bill `balanceDue`, not `total_amount`,
  so a partly-paid bill's remaining room is correctly smaller) and that a confirmed
  overage still saves rather than looping back to the same error.
- **Financial year mismatch**: a return dated in a different FY than its original bill.
  Confirmed plausible in real data (goods returned months after an invoice). The return
  keeps its own `financial_year` (the date it happened), and the bill-balance query
  must still find the original bill correctly regardless of FY difference — this is
  exactly the kind of cross-FY lookup R9's own numbering fix already had to get right.
- **Deleting/editing a return** after its bill's own balance has since changed (e.g. a
  receipt was recorded against it later). The existing `getOutstandingBills`
  `excludeLineIds` pattern already solves this shape of problem for receipts/payments;
  the same `exclude this return's own prior effect before recomputing` logic applies
  here on edit.
- **GST sign correctness**: a return's `taxable_value`/`gst_amount` must reduce the
  correct output/input GST figure, not just the customer/supplier balance — worth an
  explicit test asserting the net-balance query's GST-bearing accounts move the right
  direction, not just that the customer/supplier balance does.

## What's left to the builder

- Exact validation error message wording (follow this codebase's existing style:
  short, specific, e.g. `"Purchase entry number ${n} already exists in ${fy}."`).
- Whether the Register page's filters match `PurchaseRegister`'s exact filter set or
  need adjusting for returns' narrower field set (no challan number on either side, no
  broker on the Sales Return side — see Schema for the confirmed broker-field split).
- The exact PDF layout's column set for Print (reuse `generateInvoicePdf`'s structure,
  swap the title and the "Against Bill" reference line in).
