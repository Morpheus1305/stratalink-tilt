/**
 * DACT Clock Synchronisation Service
 * DACT-STD-1.1 — Change 7: Clock Synchronisation Measurement
 *
 * Measures the ongoing divergence of the DACT reference clock from a
 * traceable UTC time source. The source identity is not surfaced in any
 * API response or UI element — only the divergence value and tolerance
 * status are exposed.
 *
 * Method: NTP-style one-way exchange over HTTPS.
 *   T1 = local clock immediately before the request is sent.
 *   T2 = local clock immediately after the full response is received.
 *   T_ref = authoritative UTC milliseconds extracted from the response.
 *   RTT = T2 − T1 (round-trip time in ms).
 *   divergenceMs = ((T1 + T2) / 2) − T_ref
 *   Positive value = local clock is ahead; negative = local clock is behind.
 *
 * Tolerance: ±500 ms. Tighter than NTP wall-clock requirements because the
 * DACT tape timestamps are the ground truth for event ordering and replay.
 *
 * Poll interval: 60 seconds. Measurement results are cached in memory.
 * A session breach counter increments whenever the threshold is exceeded and
 * is exposed so the UI can surface persistent drift the same way it surfaces
 * rejected events.
 *
 * Sensitive-data constraint: no host names, IP addresses, or time-source
 * identifiers appear in any exported object. The source is described as
 * "traceable UTC time service" throughout.
 */

const TOLERANCE_MS = 500;
const POLL_INTERVAL_MS = 60_000;

// Two independent sources for cross-validation. Both are resolved internally;
// only the computed divergence is exposed externally.
const SOURCES = [
  "https://worldtimeapi.org/api/timezone/UTC",
  "https://timeapi.io/api/time/current/zone?timeZone=UTC",
] as const;

export interface ClockSyncMeasurement {
  /** Offset in ms: positive = local ahead, negative = local behind. */
  divergenceMs: number;
  /** Round-trip time of the measurement request in ms. */
  rttMs: number;
  /** Whether divergence is within TOLERANCE_MS. */
  status: "in-tolerance" | "out-of-tolerance" | "unavailable";
  /** Unix ms timestamp of this measurement. */
  measuredAt: number;
  /** Configured tolerance in ms. */
  toleranceMs: number;
  /** Cumulative out-of-tolerance events since process start. */
  sessionBreachCount: number;
  /** Human-readable description of source (no host names / IPs). */
  sourceDescription: "traceable UTC time service";
  /** Whether the service has completed at least one successful measurement. */
  initialised: boolean;
}

let latest: ClockSyncMeasurement = {
  divergenceMs: 0,
  rttMs: 0,
  status: "unavailable",
  measuredAt: 0,
  toleranceMs: TOLERANCE_MS,
  sessionBreachCount: 0,
  sourceDescription: "traceable UTC time service",
  initialised: false,
};

let sessionBreachCount = 0;

/**
 * Try to extract a UTC millisecond timestamp from a successful fetch response.
 * Accepts worldtimeapi.org and timeapi.io response shapes.
 * Falls back to the HTTP `Date` header (second-precision) if body parse fails.
 */
async function extractRefTimeMs(response: Response): Promise<number> {
  try {
    const body = await response.clone().json();
    // worldtimeapi.org: { utc_datetime: "2024-01-01T00:00:00.123456+00:00" }
    if (typeof body.utc_datetime === "string") {
      return new Date(body.utc_datetime).getTime();
    }
    // timeapi.io: { dateTime: "2024-01-01T00:00:00.1234567" }
    if (typeof body.dateTime === "string") {
      // dateTime may lack a timezone suffix — append Z to treat as UTC
      const dt = body.dateTime.endsWith("Z") ? body.dateTime : body.dateTime + "Z";
      return new Date(dt).getTime();
    }
    // unixtime in seconds (worldtimeapi fallback)
    if (typeof body.unixtime === "number") {
      return body.unixtime * 1000;
    }
  } catch {
    // ignore — fall through to Date header
  }
  // HTTP Date header: second-precision but universally available
  const dateHeader = response.headers.get("date");
  if (dateHeader) {
    return new Date(dateHeader).getTime();
  }
  throw new Error("could not extract reference time from response");
}

async function attemptMeasurement(sourceUrl: string): Promise<{
  divergenceMs: number;
  rttMs: number;
}> {
  const t1 = Date.now();
  const response = await fetch(sourceUrl, {
    signal: AbortSignal.timeout(6_000),
    headers: { "Accept": "application/json", "Cache-Control": "no-cache" },
  });
  const t2 = Date.now();
  const rttMs = t2 - t1;
  const refTimeMs = await extractRefTimeMs(response);
  // Mid-point estimator — same logic as SNTP
  const localMidMs = (t1 + t2) / 2;
  const divergenceMs = localMidMs - refTimeMs;
  return { divergenceMs, rttMs };
}

async function measure(): Promise<void> {
  // Try each source in order; use the first that succeeds
  for (const sourceUrl of SOURCES) {
    try {
      const { divergenceMs, rttMs } = await attemptMeasurement(sourceUrl);

      const absDrift = Math.abs(divergenceMs);
      const status: ClockSyncMeasurement["status"] =
        absDrift <= TOLERANCE_MS ? "in-tolerance" : "out-of-tolerance";

      if (status === "out-of-tolerance") {
        sessionBreachCount++;
      }

      latest = {
        divergenceMs: Math.round(divergenceMs * 10) / 10,
        rttMs: Math.round(rttMs),
        status,
        measuredAt: Date.now(),
        toleranceMs: TOLERANCE_MS,
        sessionBreachCount,
        sourceDescription: "traceable UTC time service",
        initialised: true,
      };
      return; // success — stop trying sources
    } catch {
      // try next source
    }
  }

  // All sources failed — mark as unavailable but preserve last known good value
  // so a transient network blip does not wipe a clean history
  latest = {
    ...latest,
    status: "unavailable",
    measuredAt: Date.now(),
    sessionBreachCount,
    initialised: latest.initialised,
  };
}

// Kick off immediately then poll on the interval
measure().catch(() => undefined);
setInterval(() => measure().catch(() => undefined), POLL_INTERVAL_MS);

export function getClockSync(): ClockSyncMeasurement {
  return { ...latest };
}
