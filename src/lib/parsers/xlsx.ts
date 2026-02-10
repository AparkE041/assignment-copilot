/**
 * Extract text from XLSX buffer.
 * Returns sheet names and cell text (limited size).
 */

import * as XLSX from "xlsx";

const MAX_CELLS = 5000;
const MAX_CELL_LENGTH = 500;

export interface XlsxExtractResult {
  text: string;
  sheetNames: string[];
}

export async function extractTextFromXlsx(
  buffer: Buffer
): Promise<XlsxExtractResult> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetNames = workbook.SheetNames;
  const parts: string[] = [];

  let cellCount = 0;
  for (const name of sheetNames) {
    parts.push(`Sheet: ${name}`);
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;

    const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
    for (let R = range.s.r; R <= range.e.r && cellCount < MAX_CELLS; R++) {
      for (let C = range.s.c; C <= range.e.c && cellCount < MAX_CELLS; C++) {
        const ref = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = sheet[ref];
        if (cell && cell.v != null) {
          const val = String(cell.v).slice(0, MAX_CELL_LENGTH);
          if (val.trim()) parts.push(val);
          cellCount++;
        }
      }
    }
  }

  return {
    text: parts.join("\n"),
    sheetNames,
  };
}
