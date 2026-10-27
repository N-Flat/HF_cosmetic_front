import type { MeasureLog } from "./ai/types";
export function csvCell(value: unknown) {
  let s = String(value ?? "");
  if (/^[\s]*[=+@\-]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}
export function logsCsv(logs: MeasureLog[]) {
  const keys: (keyof MeasureLog)[] = [
    "date",
    "note",
    "request_id",
    "endpoint",
    "client_ms",
    "server_total_ms",
    "features",
    "warnings",
    "error_code",
    "mode",
  ];
  return (
    "\uFEFF" +
    [
      keys.join(","),
      ...logs.map((r) => keys.map((k) => csvCell(r[k])).join(",")),
    ].join("\r\n")
  );
}
export function downloadCsv(logs: MeasureLog[]) {
  const url = URL.createObjectURL(
    new Blob([logsCsv(logs)], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `cosme2126-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
