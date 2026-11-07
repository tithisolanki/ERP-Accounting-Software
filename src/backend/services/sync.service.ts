import { createClient } from '@supabase/supabase-js';
import { getDb, insertAuditLog } from '../db/index';

const ws = require('ws');

interface SyncResult {
  success: boolean;
  message: string;
  details?: {
    [key: string]: { pushed: number; pulled: number };
  };
}

export async function runSync(companyId: string, supabaseUrl: string, supabaseKey: string, userId: string, username: string): Promise<SyncResult> {
  const db = await getDb();
  
  // Create Supabase Client
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    realtime: { transport: ws }
  });

  // Parents before children, so foreign keys hold when rows are pulled on another PC.
  // primary_groups is not synced: it has no is_dirty/updated_at and is seeded on every install.
  const tablesToSync = [
    { name: 'companies', filterByCompany: false },
    { name: 'users', filterByCompany: true },
    { name: 'settings', filterByCompany: false },
    { name: 'groups', filterByCompany: true },
    { name: 'brokers', filterByCompany: true },
    { name: 'cities', filterByCompany: true },
    { name: 'states', filterByCompany: true },
    { name: 'transports', filterByCompany: true },
    { name: 'journal_voucher_types', filterByCompany: true },
    { name: 'accounts', filterByCompany: true },
    { name: 'categories', filterByCompany: true },
    { name: 'qualities', filterByCompany: true },
    { name: 'descriptions', filterByCompany: true },
    { name: 'hsn_codes', filterByCompany: true },
    { name: 'stock_opening_balances', filterByCompany: true },
    { name: 'purchases', filterByCompany: true },
    { name: 'purchase_items', filterByCompany: true },
    { name: 'delivery_challans', filterByCompany: true },
    { name: 'delivery_challan_items', filterByCompany: true },
    { name: 'sales', filterByCompany: true },
    { name: 'sales_items', filterByCompany: true },
    { name: 'payments', filterByCompany: true },
    { name: 'receipts', filterByCompany: true },
    { name: 'journal_vouchers', filterByCompany: true },
    { name: 'audit_logs', filterByCompany: true }
  ];

  // PostgREST error codes for "this table does not exist in the cloud database".
  const isMissingTable = (err: any) => err && (err.code === 'PGRST205' || err.code === '42P01');
  const skippedTables: string[] = [];

  const syncStats: { [key: string]: { pushed: number; pulled: number } } = {};
  
  try {
    for (const table of tablesToSync) {
      syncStats[table.name] = { pushed: 0, pulled: 0 };
      
      // ----------------------------------------
      // 1. PUSH local dirty changes to Supabase
      // ----------------------------------------
      let queryStr = `SELECT * FROM ${table.name} WHERE is_dirty = 1`;
      let queryParams: any[] = [];
      
      if (table.filterByCompany) {
        queryStr += ` AND company_id = ?`;
        queryParams.push(companyId);
      }

      const dirtyRows = await db.all(queryStr, queryParams);

      if (dirtyRows.length > 0) {
        // Prepare rows for Supabase (remove is_dirty for cloud DB, or send it as 0)
        const rowsToUpsert = dirtyRows.map(row => {
          const { is_dirty, ...rest } = row;
          return {
            ...rest,
            // Ensure fields are formatted correctly for Supabase (e.g. numeric types)
            is_dirty: 0
          };
        });

        // Batch upsert to Supabase
        const { error } = await supabase
          .from(table.name)
          .upsert(rowsToUpsert, { onConflict: 'id' });

        if (isMissingTable(error)) {
          skippedTables.push(table.name);
          continue;
        }
        if (error) {
          console.error(`Supabase push error on table ${table.name}:`, error);
          throw new Error(`Sync failed pushing table ${table.name}: ${error.message}`);
        }

        // Mark local rows as clean
        const ids = dirtyRows.map(r => r.id);
        const placeholders = ids.map(() => '?').join(',');
        await db.run(
          `UPDATE ${table.name} SET is_dirty = 0 WHERE id IN (${placeholders})`,
          ...ids
        );

        syncStats[table.name].pushed = dirtyRows.length;
      }

      // ----------------------------------------
      // 2. PULL remote updates from Supabase
      // ----------------------------------------
      // We will pull records updated recently. We check what the latest updated_at is locally for clean records.
      let latestCleanRow = null;
      if (table.filterByCompany) {
        latestCleanRow = await db.get(
          `SELECT updated_at FROM ${table.name} WHERE company_id = ? AND is_dirty = 0 ORDER BY updated_at DESC LIMIT 1`,
          [companyId]
        );
      } else {
        latestCleanRow = await db.get(
          `SELECT updated_at FROM ${table.name} WHERE is_dirty = 0 ORDER BY updated_at DESC LIMIT 1`
        );
      }

      const lastSyncedTime = latestCleanRow?.updated_at || '1970-01-01T00:00:00.000Z';

      let remoteQuery = supabase
        .from(table.name)
        .select('*')
        .gt('updated_at', lastSyncedTime);

      if (table.filterByCompany) {
        remoteQuery = remoteQuery.eq('company_id', companyId);
      }

      const { data: remoteRows, error: pullError } = await remoteQuery;

      if (isMissingTable(pullError)) {
        skippedTables.push(table.name);
        continue;
      }
      if (pullError) {
        console.error(`Supabase pull error on table ${table.name}:`, pullError);
        throw new Error(`Sync failed pulling table ${table.name}: ${pullError.message}`);
      }

      if (remoteRows && remoteRows.length > 0) {
        for (const remoteRow of remoteRows) {
          // Check if local copy is dirty. If dirty, resolve conflict: Last-write-wins based on updated_at
          const localRow = await db.get(`SELECT * FROM ${table.name} WHERE id = ?`, [remoteRow.id]);
          
          let shouldUpdateLocal = true;
          if (localRow && localRow.is_dirty === 1) {
            const localTime = new Date(localRow.updated_at).getTime();
            const remoteTime = new Date(remoteRow.updated_at).getTime();
            if (localTime > remoteTime) {
              shouldUpdateLocal = false; // Local is newer, keep local dirty
            }
          }

          if (shouldUpdateLocal) {
            // Build dynamic SQLite insert/replace command
            const keys = Object.keys(remoteRow);
            const placeholders = keys.map(() => '?').join(',');
            const values = keys.map(k => remoteRow[k]);

            // Set is_dirty = 0 for pulled records
            const isDirtyIndex = keys.indexOf('is_dirty');
            if (isDirtyIndex !== -1) {
              values[isDirtyIndex] = 0;
            }

            await db.run(
              `INSERT OR REPLACE INTO ${table.name} (${keys.join(',')}) VALUES (${placeholders})`,
              ...values
            );
            
            syncStats[table.name].pulled++;
          }
        }
      }
    }

    const totalPushed = Object.values(syncStats).reduce((sum, val) => sum + val.pushed, 0);
    const totalPulled = Object.values(syncStats).reduce((sum, val) => sum + val.pulled, 0);

    const skippedNote = skippedTables.length
      ? ` Not synced (table missing in Supabase, see RUNBOOK.md): ${skippedTables.join(', ')}.`
      : '';

    await insertAuditLog(
      companyId,
      userId,
      username,
      'Data Synced',
      `Manual sync succeeded. Pushed: ${totalPushed} rows, Pulled: ${totalPulled} rows.${skippedNote}`
    );

    return {
      success: true,
      message: `Sync complete! Pushed ${totalPushed} items, pulled ${totalPulled} items.${skippedNote}`,
      details: syncStats
    };

  } catch (error: any) {
    console.error('Sync service error:', error);
    return {
      success: false,
      message: error.message || 'Unknown syncing failure.'
    };
  }
}
