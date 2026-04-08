export function toCsv(headers: string[], rows: string[][]): string {
  const escape = (v: string) => {
    if (v == null) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [headers.map(escape).join(",")];
  for (const row of rows) {
    lines.push(row.map(escape).join(","));
  }
  return "\uFEFF" + lines.join("\r\n"); // BOM for Excel UTF-8
}
