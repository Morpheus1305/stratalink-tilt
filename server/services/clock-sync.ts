/**
 * DACT Clock Synchronisation Service — DACT-STD-1.1 Change 7 (revised)
 *
 * Measures the divergence of the host process clock from a traceable UTC
 * source using a genuine NTP UDP exchange (RFC 5905 four-timestamp offset
 * estimator). This measures the same clock — Date.now() — that the DACT tape
 * writer and all relay routes use for event timestamps.
 *
 * Primary path: NTP UDP exchange.
 *   T1 = local clock at client transmit          (Date.now())
 *   T2 = server receive timestamp                (NTP response bytes 32–39)
 *   T3 = server transmit timestamp               (NTP response bytes 40–47)
 *   T4 = local clock at client receive           (Date.now())
 *   offset θ = ((T2 − T1) + (T3 − T4)) / 2     (RFC 5905 §8)
 *   RTT      = (T4 − T1) − (T3 − T2)
 *
 * Fallback: if all NTP servers are unreachable, falls back to HTTPS with
 * 5-sample median filter to reject outliers from variable server latency.
 *
 * Sensitive-data constraint: NTP server identities, IP addresses, and host
 * names are not surfaced in any exported object, API response, or log.
 * The source is described as "host NTP synchronisation state" in all outputs.
 */

import dgram from "node:dgram";

const TOLERANCE_MS = 500;
const POLL_INTERVAL_MS = 60_000;
const NTP_EPOCH_DELTA_S = 2208988800; // seconds: 1900-01-01 → 1970-01-01
const NTP_PORT = 123;
const NTP_TIMEOUT_MS = 4_000;

// NTP server pool — tried in order; identity never surfaced externally.
const NTP_POOL: readonly string[] = [
  "time.google.com",
  "time.cloudflare.com",
  "pool.ntp.org",
];

// HTTP fallback sources — only used when UDP 123 is entirely unreachable.
const HTTP_FALLBACK: readonly string[] = [
  "https://worldtimeapi.org/api/timezone/UTC",
  "https://timeapi.io/api/time/current/zone?timeZone=UTC",
];

const HTTP_FALLBACK_SAMPLES = 5;

// ── Exported interface ─────────────────────────────────────────────────────

export interface ClockSyncMeasurement {
  /** Offset in ms: positive = local ahead of UTC, negative = local behind. */
  divergenceMs: number;
  /** Round-trip time of the measurement exchange in ms. */
  rttMs: number;
  /** Whether divergence is within TOLERANCE_MS. */
  status: "in-tolerance" | "out-of-tolerance" | "unavailable";
  /** Unix ms timestamp of this measurement. */
  measuredAt: number;
  /** Configured tolerance in ms. */
  toleranceMs: number;
  /** Cumulative out-of-tolerance events since process start. */
  sessionBreachCount: number;
  /**
   * Description of the measurement source. Always "host NTP synchronisation
   * state" — no server names, IPs, or addresses are surfaced.
   */
  sourceDescription: "host NTP synchronisation state";
  /** Whether the service has completed at least one successful measurement. */
  initialised: boolean;
}

// ── State ─────────────────────────────────────────────────────────────────

let latest: ClockSyncMeasurement = {
  divergenceMs: 0,
  rttMs: 0,
  status: "unavailable",
  measuredAt: 0,
  toleranceMs: TOLERANCE_MS,
  sessionBreachCount: 0,
  sourceDescription: "host NTP synchronisation state",
  initialised: false,
};

let sessionBreachCount = 0;

// ── NTP helpers ───────────────────────────────────────────────────────────

/** Read a 64-bit NTP timestamp from a buffer at `offset` → Unix milliseconds. */
function readNtpTimestampMs(buf: Buffer, offset: number): number {
  const secs = buf.readUInt32BE(offset) - NTP_EPOCH_DELTA_S;
  const frac = buf.readUInt32BE(offset + 4);
  // frac / 2^32 * 1000 = frac / 4294967.296
  return secs * 1000 + Math.floor(frac / 4294967.296);
}

/** Single NTP UDP exchange against `server`. Returns θ and RTT in ms. */
function ntpExchange(server: string): Promise<{ divergenceMs: number; rttMs: number }> {
  return new Promise((resolve, reject) => {
    const sock = dgram.createSocket("udp4");

    const packet = Buffer.alloc(48, 0);
    packet[0] = 0x23; // LI=0, VN=4, Mode=3 (client)

    const timer = setTimeout(() => {
      try { sock.close(); } catch {}
      reject(new Error(`NTP timeout: ${server}`));
    }, NTP_TIMEOUT_MS);

    sock.once("message", (msg) => {
      const T4 = Date.now();
      clearTimeout(timer);
      try { sock.close(); } catch {}

      if (msg.length < 48) {
        return reject(new Error("NTP response too short"));
      }

      // T2 = server receive timestamp (bytes 32–39)
      // T3 = server transmit timestamp (bytes 40–47)
      const T2 = readNtpTimestampMs(msg, 32);
      const T3 = readNtpTimestampMs(msg, 40);

      // RFC 5905 §8 offset and delay
      const divergenceMs = ((T2 - T1) + (T3 - T4)) / 2;
      const rttMs = (T4 - T1) - (T3 - T2);

      resolve({ divergenceMs, rttMs });
    });

    sock.on("error", (err) => {
      clearTimeout(timer);
      try { sock.close(); } catch {}
      reject(err);
    });

    const T1 = Date.now();
    sock.send(packet, NTP_PORT, server, (err) => {
      if (err) {
        clearTimeout(timer);
        try { sock.close(); } catch {}
        reject(err);
      }
    });
  });
}

/** Try each NTP server in order; return the first successful measurement. */
async function measureViaNtp(): Promise<{ divergenceMs: number; rttMs: number } | null> {
  for (const server of NTP_POOL) {
    try {
      return await ntpExchange(server);
    } catch {
      // try next server
    }
  }
  return null;
}

// ── HTTP fallback helpers ─────────────────────────────────────────────────

/** Extract a UTC millisecond timestamp from a time-API response. */
async function extractRefTimeMs(response: Response): Promise<number> {
  try {
    const body = await response.clone().json();
    // worldtimeapi.org: { utc_datetime: "2024-01-01T00:00:00.123456+00:00" }
    if (typeof body.utc_datetime === "string") {
      return new Date(body.utc_datetime).getTime();
    }
    // timeapi.io: { dateTime: "2024-01-01T00:00:00.1234567" }
    if (typeof body.dateTime === "string") {
      const dt = body.dateTime.endsWith("Z") ? body.dateTime : body.dateTime + "Z";
      return new Date(dt).getTime();
    }
    if (typeof body.unixtime === "number") {
      return body.unixtime * 1000;
    }
  } catch {}
  const dateHeader = response.headers.get("date");
  if (dateHeader) return new Date(dateHeader).getTime();
  throw new Error("could not extract reference time from HTTP response");
}

/** Single HTTP midpoint sample. */
async function httpSample(sourceUrl: string): Promise<number> {
  const t1 = Date.now();
  const response = await fetch(sourceUrl, {
    signal: AbortSignal.timeout(6_000),
    headers: { "Accept": "application/json", "Cache-Control": "no-cache" },
  });
  const t2 = Date.now();
  const refTimeMs = await extractRefTimeMs(response);
  return (t1 + t2) / 2 - refTimeMs;
}

/** Collect `n` HTTP samples and return the median (outlier-resistant). */
async function httpMedianDivergence(sourceUrl: string, n: number): Promise<{ divergenceMs: number; rttMs: number }> {
  const samples: number[] = [];
  const rtts: number[] = [];
  for (let i = 0; i < n; i++) {
    const t1 = Date.now();
    try {
      const response = await fetch(sourceUrl, {
        signal: AbortSignal.timeout(6_000),
        headers: { "Accept": "application/json", "Cache-Control": "no-cache" },
      });
      const t2 = Date.now();
      const refTimeMs = await extractRefTimeMs(response);
      samples.push((t1 + t2) / 2 - refTimeMs);
      rtts.push(t2 - t1);
    } catch {}
    if (i < n - 1) await new Promise(r => setTimeout(r, 200));
  }
  if (samples.length === 0) throw new Error("all HTTP samples failed");
  samples.sort((a, b) => a - b);
  rtts.sort((a, b) => a - b);
  const mid = Math.floor(samples.length / 2);
  return {
    divergenceMs: samples[mid],
    rttMs: rtts[Math.floor(rtts.length / 2)],
  };
}

/** Try each HTTP fallback source; return first successful multi-sample result. */
async function measureViaHttp(): Promise<{ divergenceMs: number; rttMs: number } | null> {
  for (const url of HTTP_FALLBACK) {
    try {
      return await httpMedianDivergence(url, HTTP_FALLBACK_SAMPLES);
    } catch {
      // try next source
    }
  }
  return null;
}

// ── Main poll loop ────────────────────────────────────────────────────────

async function measure(): Promise<void> {
  // Primary: NTP UDP
  let result = await measureViaNtp();

  // Fallback: multi-sample median HTTPS
  if (!result) {
    result = await measureViaHttp();
  }

  if (!result) {
    // All sources failed — preserve last known good, mark unavailable
    latest = {
      ...latest,
      status: "unavailable",
      measuredAt: Date.now(),
      sessionBreachCount,
      initialised: latest.initialised,
    };
    return;
  }

  const { divergenceMs, rttMs } = result;
  const absDrift = Math.abs(divergenceMs);
  const status: ClockSyncMeasurement["status"] =
    absDrift <= TOLERANCE_MS ? "in-tolerance" : "out-of-tolerance";

  if (status === "out-of-tolerance") sessionBreachCount++;

  latest = {
    divergenceMs: Math.round(divergenceMs * 10) / 10,
    rttMs: Math.round(rttMs),
    status,
    measuredAt: Date.now(),
    toleranceMs: TOLERANCE_MS,
    sessionBreachCount,
    sourceDescription: "host NTP synchronisation state",
    initialised: true,
  };
}

// Kick off immediately, then poll
measure().catch(() => undefined);
setInterval(() => measure().catch(() => undefined), POLL_INTERVAL_MS);

export function getClockSync(): ClockSyncMeasurement {
  return { ...latest };
}
