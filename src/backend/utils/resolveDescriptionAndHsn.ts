import crypto from 'crypto';

/**
 * Helper to resolve or dynamically insert description and HSN code
 */
export async function resolveDescriptionAndHsn(
  db: any,
  companyId: string,
  descriptionName: any,
  descriptionId: any,
  hsnCode: any,
  hsnId: any,
  gstPercentage: any
): Promise<{ descriptionId: string; hsnId: string }> {
  let resolvedDescriptionId = descriptionId;
  const descNameStr = descriptionName !== undefined && descriptionName !== null ? String(descriptionName).trim() : '';
  if (descNameStr) {
    const existing = await db.get(
      'SELECT id FROM descriptions WHERE company_id = ? AND LOWER(name) = LOWER(?)',
      [companyId, descNameStr]
    );
    if (existing) {
      resolvedDescriptionId = existing.id;
    } else {
      resolvedDescriptionId = crypto.randomUUID();
      const now = new Date().toISOString();
      await db.run(
        'INSERT INTO descriptions (id, company_id, name, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)',
        [resolvedDescriptionId, companyId, descNameStr, now, now]
      );
    }
  }

  let resolvedHsnId = hsnId;
  const hsnStr = hsnCode !== undefined && hsnCode !== null ? String(hsnCode).trim() : '';
  if (hsnStr) {
    const numericHsn = parseInt(hsnStr, 10);
    if (!isNaN(numericHsn)) {
      const existing = await db.get(
        'SELECT id FROM hsn_codes WHERE company_id = ? AND hsn_code = ?',
        [companyId, numericHsn]
      );
      if (existing) {
        resolvedHsnId = existing.id;
      } else {
        resolvedHsnId = crypto.randomUUID();
        const now = new Date().toISOString();
        const gstVal = gstPercentage !== undefined && gstPercentage !== null ? Number(gstPercentage) : 5;
        await db.run(
          'INSERT INTO hsn_codes (id, company_id, hsn_code, gst_percentage, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)',
          [resolvedHsnId, companyId, numericHsn, gstVal, now, now]
        );
      }
    }
  }

  if (!resolvedDescriptionId) {
    throw new Error('Description is required.');
  }
  if (!resolvedHsnId) {
    throw new Error('HSN Code is required.');
  }

  return { descriptionId: resolvedDescriptionId, hsnId: resolvedHsnId };
}
