/** CSV parsing + template generation for the global bulk import engine. */

export type ImportColumn = {
  key: string;
  label: string;
  required?: boolean;
  type?: "text" | "number" | "boolean";
  /** Optional accepted values (Arabic label -> stored value). */
  map?: Record<string, string>;
  example?: string;
};

/** Minimal RFC-4180 CSV parser (handles quotes, commas and newlines inside cells). */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += c;
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === "," || c === ";") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (c !== "\r") cell += c;
  }
  row.push(cell);
  rows.push(row);

  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

export function downloadTemplate(name: string, columns: ImportColumn[]) {
  const header = columns.map((c) => `"${c.label}"`).join(",");
  const sample = columns.map((c) => `"${c.example ?? ""}"`).join(",");
  const blob = new Blob(["\uFEFF" + header + "\n" + sample], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export type ParsedImport = {
  rows: Record<string, unknown>[];
  errors: { line: number; message: string }[];
};

/** Validates a parsed CSV against the column spec and returns clean rows. */
export function mapRows(matrix: string[][], columns: ImportColumn[]): ParsedImport {
  const errors: { line: number; message: string }[] = [];
  const rows: Record<string, unknown>[] = [];
  if (matrix.length < 2) return { rows, errors: [{ line: 0, message: "الملف فارغ أو غير صالح" }] };

  const header = (matrix[0] ?? []).map((h) => h.trim());
  const indexOf = (c: ImportColumn) => {
    const byLabel = header.findIndex((h) => h === c.label);
    if (byLabel >= 0) return byLabel;
    return header.findIndex((h) => h.toLowerCase() === c.key.toLowerCase());
  };
  const positions = new Map(columns.map((c) => [c.key, indexOf(c)]));

  const missing = columns.filter((c) => c.required && (positions.get(c.key) ?? -1) < 0);
  if (missing.length) {
    return { rows, errors: [{ line: 1, message: `أعمدة ناقصة: ${missing.map((m) => m.label).join("، ")}` }] };
  }

  for (let i = 1; i < matrix.length; i++) {
    const raw = matrix[i] ?? [];
    const out: Record<string, unknown> = {};
    let bad = "";
    for (const c of columns) {
      const pos = positions.get(c.key) ?? -1;
      const value = pos >= 0 ? (raw[pos] ?? "").trim() : "";
      if (!value) {
        if (c.required) bad = `القيمة مطلوبة في العمود «${c.label}»`;
        else out[c.key] = null;
        continue;
      }
      if (c.map) {
        const mapped = c.map[value] ?? (Object.values(c.map).includes(value) ? value : undefined);
        if (mapped === undefined) {
          bad = `قيمة غير مقبولة «${value}» في العمود «${c.label}»`;
        } else out[c.key] = mapped;
        continue;
      }
      if (c.type === "number") {
        const n = Number(value.replace(/,/g, ""));
        if (Number.isNaN(n)) bad = `رقم غير صالح «${value}» في العمود «${c.label}»`;
        else out[c.key] = n;
        continue;
      }
      if (c.type === "boolean") {
        out[c.key] = ["نعم", "1", "true", "yes", "y"].includes(value.toLowerCase());
        continue;
      }
      out[c.key] = value;
    }
    if (bad) errors.push({ line: i + 1, message: bad });
    else rows.push(out);
  }
  return { rows, errors };
}
