let sanitizeHtml: ((dirty: string, options?: unknown) => string) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  sanitizeHtml = require("sanitize-html");
} catch {
  sanitizeHtml = null;
}

export function sanitizeString(value: unknown): string {
  if (typeof value !== "string") return "";

  if (sanitizeHtml) {
    return sanitizeHtml(value, {
      allowedTags: [],
      allowedAttributes: {},
    });
  }

  return String(value).replace(/<[^>]*>/g, "");
}

export default sanitizeString;
