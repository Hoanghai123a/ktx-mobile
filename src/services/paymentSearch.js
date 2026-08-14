export function filterWorkerPaymentRows(rows = [], query = "") {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) return rows;

  return rows.filter((row) => {
    const workerName = String(row?.workerName || "").toLowerCase();
    const employeeCode = String(row?.employeeCode || "").toLowerCase();
    return workerName.includes(normalizedQuery) || employeeCode.includes(normalizedQuery);
  });
}
