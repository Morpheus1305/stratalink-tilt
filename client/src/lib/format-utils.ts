/**
 * Format utilities — timezone-aware timestamps and locale-aware numbers.
 * Reads from UserSettings (or falls back to UTC / period-comma defaults).
 */

export interface FormatSettings {
  timezone: string;
  decimalSeparator: string;
  thousandsSeparator: string;
}

/**
 * Format a Date (or epoch ms) into a human-readable string for the user's timezone.
 * Returns e.g. "2026-06-30 14:22 UTC" or "30 Jun 14:22 GST"
 */
export function formatTimestamp(
  dateOrMs: Date | number,
  settings: Pick<FormatSettings, "timezone">,
  opts?: { includeDate?: boolean; compact?: boolean }
): string {
  const d = typeof dateOrMs === "number" ? new Date(dateOrMs) : dateOrMs;
  const tz = settings.timezone || "UTC";
  try {
    if (opts?.compact) {
      return d.toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
    }
    if (opts?.includeDate === false) {
      return d.toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
    }
    return d.toLocaleString("en-GB", {
      timeZone: tz,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).replace(",", "");
  } catch {
    return d.toISOString().slice(0, 16).replace("T", " ") + " UTC";
  }
}

/**
 * Format a number with custom decimal/thousands separators.
 */
export function formatNumber(
  value: number,
  settings: Pick<FormatSettings, "decimalSeparator" | "thousandsSeparator">,
  opts?: { decimals?: number; prefix?: string; suffix?: string }
): string {
  const decimals = opts?.decimals ?? 2;
  const dec = settings.decimalSeparator ?? ".";
  const thou = settings.thousandsSeparator ?? ",";

  const [intPart, fracPart] = Math.abs(value).toFixed(decimals).split(".");
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thou);
  const formatted = decimals > 0 ? `${formattedInt}${dec}${fracPart}` : formattedInt;
  const signed = value < 0 ? `-${formatted}` : formatted;

  return `${opts?.prefix ?? ""}${signed}${opts?.suffix ?? ""}`;
}

/**
 * Format a relative time string (e.g. "2 min ago") in a given timezone.
 * The timezone affects how "Yesterday 14:22" is computed.
 */
export function formatRelativeTime(ts: number, settings: Pick<FormatSettings, "timezone">): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  if (hrs < 48) {
    const t = formatTimestamp(ts, settings, { includeDate: false });
    return `Yesterday ${t}`;
  }
  return formatTimestamp(ts, settings);
}
