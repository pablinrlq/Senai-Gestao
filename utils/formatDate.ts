export function parseToDate(v: unknown): Date | null {
  if (!v && v !== 0) return null;
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null;
    return v;
  }

  if (typeof v === "string") {
    // YYYY-MM-DD -> treat as local date (avoid timezone shift)
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const [y, m, d] = v.split("-").map((s) => Number(s));
      const dt = new Date(y, m - 1, d);
      return isNaN(dt.getTime()) ? null : dt;
    }

    // ISO midnight (e.g. 2025-11-13T00:00:00Z or with offset): treat as local date
    const isoMidnight = v.match(
      /^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.0+)?(?:Z|[+-]\d{2}:?\d{2})?$/
    );
    if (isoMidnight) {
      const [y, m, d] = isoMidnight[1].split("-").map((s) => Number(s));
      const dt = new Date(y, m - 1, d);
      return isNaN(dt.getTime()) ? null : dt;
    }

    // ISO / timestamp strings -> let Date parse
    const dt = new Date(v);
    return isNaN(dt.getTime()) ? null : dt;
  }

  try {
    const dt = new Date(v as any);
    return isNaN(dt.getTime()) ? null : dt;
  } catch {
    return null;
  }
}

export function formatDateForDisplay(v: unknown): string {
  const dt = parseToDate(v);
  if (!dt) return "";
  return dt.toLocaleDateString("pt-BR");
}

export const formatDate = formatDateForDisplay;
