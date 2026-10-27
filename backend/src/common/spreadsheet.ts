import ExcelJS from 'exceljs';

export type Row = string[];

/** Converts any Excel cell value to a clean string (keeps long numbers such as IMEIs exact). */
function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toFixed(0) : String(value);
  }
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('text' in value && typeof value.text === 'string') return value.text.trim();
    if ('result' in value) return cellToString(value.result as ExcelJS.CellValue);
    if ('richText' in value) return value.richText.map((r) => r.text).join('').trim();
  }
  return String(value).trim();
}

function parseCsv(text: string): Row[] {
  const rows: Row[] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field.trim());
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field.trim());
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field.trim());
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c !== ''));
}

/** Reads the first sheet of an .xlsx file, or a .csv file, into rows of strings. */
export async function readSpreadsheet(buffer: Buffer, fileName: string): Promise<Row[]> {
  if (fileName.toLowerCase().endsWith('.csv')) {
    return parseCsv(buffer.toString('utf8'));
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const rows: Row[] = [];
  ws.eachRow({ includeEmpty: false }, (r) => {
    const values: string[] = [];
    for (let c = 1; c <= r.cellCount; c++) values.push(cellToString(r.getCell(c).value));
    if (values.some((v) => v !== '')) rows.push(values);
  });
  return rows;
}

/** "south chennai" -> "South Chennai"; keeps "MT Chennai" as typed. */
export function normalizeBranch(raw: string): string {
  const s = raw.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
  if (s === s.toLowerCase()) {
    return s.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return s;
}

/** Store names in vivo's list end with "(Area) (Store)"; strip that for display. */
export function cleanStoreName(raw: string): string {
  return raw.replace(/\s*\(Area\)\s*\(Store\)\s*$/i, '').replace(/\s+/g, ' ').trim();
}

export function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
