const isProd = process.env.NODE_ENV === "production";

function maskSensitive(value: unknown): string {
  if (value instanceof Error) {
    return value.message;
  }
  const s = String(value ?? "");
  // redact JWTs (three parts separated by dots)
  const redacted = s.replace(
    /([A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+)/g,
    "[REDACTED_JWT]"
  );
  // redact long base64/hex-like strings
  return redacted.replace(/([A-Fa-f0-9]{32,})/g, "[REDACTED_SECRET]");
}

export const logger = {
  debug: (...args: unknown[]) => {
    if (!isProd) console.debug(...args);
  },
  info: (...args: unknown[]) => {
    if (isProd) console.info(args.map(maskSensitive).join(" "));
    else console.info(...args);
  },
  warn: (...args: unknown[]) => {
    if (isProd) console.warn(args.map(maskSensitive).join(" "));
    else console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (isProd) {
      // In production, avoid printing stack traces or secrets
      const out = args.map((a) => maskSensitive(a)).join(" ");
      console.error(out);
    } else {
      console.error(...args);
    }
  },
};

export default logger;
