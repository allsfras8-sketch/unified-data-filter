export type ExportColumn = { key: string; label: string };

function escapeCell(value: unknown) {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

/** Downloads a CSV file readable by Excel with Arabic text (UTF-8 BOM). */
export function exportCsv(filename: string, columns: ExportColumn[], rows: Record<string, unknown>[]) {
  const header = columns.map((c) => escapeCell(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => escapeCell(r[c.key])).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + header + "\n" + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function printPage() {
  window.print();
}
