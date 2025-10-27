
// Utility function for normalising dates to allow comparision with json serialized objects
export function normalizeDates(obj: any): any {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return obj.toISOString(); // or obj.getTime()
  if (Array.isArray(obj)) return obj.map(normalizeDates);

  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = normalizeDates(v);
  }
  return out;
}