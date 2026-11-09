/** Appends one record to the day's JSONL file via the log route. Fire and forget. */
export function logRecord(record: Record<string, unknown>): void {
  fetch("/api/evals/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
    keepalive: true,
  }).catch((error) => console.warn("[evals] log failed:", error));
}
