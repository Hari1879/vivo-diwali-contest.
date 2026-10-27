import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EligibleImei, ImeiUpload, Store } from '../entities';
import { cleanStoreName, normalizeBranch, Row } from './spreadsheet';

const CHUNK = 1000;

function chunks<T>(arr: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Store list format (vivo): header row "Store code | Store name | Zone*".
 * Columns are found by header name, so column order does not matter.
 */
export async function importStores(ds: DataSource, rows: Row[]) {
  if (rows.length < 2) throw new BadRequestException('The store file is empty');
  const header = rows[0].map((h) => h.toLowerCase());
  const codeCol = header.findIndex((h) => h.includes('code'));
  const nameCol = header.findIndex((h) => h.includes('name'));
  const branchCol = header.findIndex((h) => h.includes('zone') || h.includes('branch'));
  if (codeCol < 0 || nameCol < 0 || branchCol < 0) {
    throw new BadRequestException(
      'Store file needs columns: Store code, Store name, Zone (or Branch)',
    );
  }

  const byCode = new Map<string, Store>();
  let invalid = 0;
  for (const r of rows.slice(1)) {
    const code = (r[codeCol] ?? '').trim().toUpperCase();
    const name = cleanStoreName(r[nameCol] ?? '');
    const branch = normalizeBranch(r[branchCol] ?? '');
    if (!/^[A-Z0-9]{3,32}$/.test(code) || !name || !branch) {
      invalid++;
      continue;
    }
    byCode.set(code, Object.assign(new Store(), { code, name, branch, active: true }));
  }

  for (const part of chunks([...byCode.values()])) {
    await ds
      .createQueryBuilder()
      .insert()
      .into(Store)
      .values(part)
      .orUpdate(['name', 'branch', 'active'], ['code'])
      .execute();
  }
  return { imported: byCode.size, invalidRows: invalid };
}

/**
 * IMEI list: any .xlsx/.csv. Every column whose header contains "IMEI" is read
 * (so IMEI1 / IMEI2 both work); if no header says IMEI, the first column is used.
 * New IMEIs are added to the existing list; nothing is removed.
 */
export async function importImeis(
  ds: DataSource,
  rows: Row[],
  fileName: string,
  uploadedBy: string,
) {
  if (!rows.length) throw new BadRequestException('The IMEI file is empty');
  const header = rows[0].map((h) => h.toLowerCase());
  let cols = header.map((h, i) => (h.includes('imei') ? i : -1)).filter((i) => i >= 0);
  let dataRows = rows.slice(1);
  if (!cols.length) {
    cols = [0];
    // No header row: the first row is data too.
    if (/^\d{15}$/.test((rows[0][0] ?? '').replace(/\D/g, ''))) dataRows = rows;
  }

  const found = new Set<string>();
  let invalid = 0;
  for (const r of dataRows) {
    for (const c of cols) {
      const raw = (r[c] ?? '').replace(/[\s'-]/g, '');
      if (!raw) continue;
      if (/^\d{15}$/.test(raw)) found.add(raw);
      else invalid++;
    }
  }
  if (!found.size) {
    throw new BadRequestException(
      'No valid 15-digit IMEI numbers found. If the file came from Excel, make sure the IMEI column is formatted as Text or Number (not scientific notation like 8.6E+14).',
    );
  }

  return ds.transaction(async (m) => {
    const upload = await m.save(
      Object.assign(new ImeiUpload(), {
        fileName: fileName.slice(0, 255),
        totalFound: found.size,
        added: 0,
        alreadyPresent: 0,
        invalidRows: invalid,
        uploadedBy,
      }),
    );
    let added = 0;
    for (const part of chunks([...found])) {
      const res = await m
        .createQueryBuilder()
        .insert()
        .into(EligibleImei)
        .values(part.map((imei) => ({ imei, uploadId: upload.id })))
        .orIgnore()
        .returning(['imei'])
        .execute();
      added += (res.raw as unknown[]).length;
    }
    upload.added = added;
    upload.alreadyPresent = found.size - added;
    await m.save(upload);
    return upload;
  });
}
