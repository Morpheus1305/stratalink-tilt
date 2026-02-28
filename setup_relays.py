import os

base = os.path.expanduser("~/workspace/server/routes")

files = {}

files["curve-relay.ts"] = '''/**
 * Curve Finance Relay — server/routes/curve-relay.ts
 * SRIS v1.3-compliant relay for Curve Finance DEX.
 * Routes (mounted at /curve in routes.ts):
 *   GET /spot/depth?symbol=BTC|ETH|USDC
 *   GET /health
 */
import { Router, Request, Response } from "express";
import { tsleBuffer, tsleStateEngine, type LISSnapshot } from "../services/tsle-buffer";

const router = Router();
const CURVE_API = "https://api.curve.fi/api";
const TIMEOUT_MS = 5000;

const POOL_REGISTRY: Record<string, { address: string; api: string }> = {
  BTC:  { address: "0xd51a44d3fae010294c616388b506acda1bfaae46", api: `${CURVE_API}/getPools/ethereum/crypto` },
  ETH:  { address: "0xdc24316b9ae028f1497c275eb9192a3ea0f67022", api: `${CURVE_API}/getPools/ethereum/crypto` },
  USDC: { address: "0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7", api: `${CURVE_API}/getPools/ethereum/main`   },
};

const FALLBACK_PRICES: Record<string, number> = { BTC: 95000, ETH: 3200, USDC: 1.0 };
const FALLBACK_POOL_USD: Record<string, number> = { BTC: 180_000_000, ETH: 320_000_000, USDC: 250_000_000 };

function authCheck(req: Request, res: Response): boolean {
  const secret = process.env.RELAY_SECRET;
  if (!secret) return true;
  const provided = req.headers["x-relay-secret"] as string;
  if (provided !== secret) { res.status(401).json({ ok: false, error: "Unauthorized" }); return false; }
  return true;
}

async function curveFetch(url: string): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "StrataLink-LIS/1.0", Accept: "application/json" } });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`Curve API HTTP ${resp.status}`);
    return resp.json();
  } catch (e: any) {
    clearTimeout(timer);
    throw new Error(e.name === "AbortError" ? `Timeout after ${TIMEOUT_MS}ms` : e.message);
  }
}

function buildSnapshot(symbol: string, midPrice: number, poolUsdTotal: number): LISSnapshot {
  const bpsLevels = [0.1, 0.25, 0.5, 1, 2];
  const bands: Record<string, { bid_notional: number; ask_notional: number; total_notional: number }> = {};
  for (const bps of bpsLevels) {
    const half = poolUsdTotal * (bps / 100) * 0.5;
    bands[`pct_${bps}`] = { bid_notional: Math.round(half), ask_notional: Math.round(half), total_notional: Math.round(half * 2) };
  }
  const spreadBps = symbol === "USDC" ? 0.02 : 0.04;
  return { venue: "curve", symbol: symbol.toUpperCase(), timestamp: Date.now(), mid_price: midPrice, spread: { absolute: midPrice * (spreadBps / 10_000), bps: spreadBps }, bands };
}

async function fetchCurveDepth(symbol: string): Promise<{ snapshot: LISSnapshot; synthetic: boolean }> {
  const pool = POOL_REGISTRY[symbol];
  let liveError = "";
  try {
    const data = await curveFetch(pool.api);
    const pools: any[] = data?.data?.poolData ?? [];
    const match = pools.find((p: any) => p.address?.toLowerCase() === pool.address.toLowerCase());
    if (match) {
      const usdTotal = parseFloat(match.usdTotal ?? match.tvl ?? "0");
      const virtualPrice = parseFloat(match.virtualPrice ?? match.virtual_price ?? "1");
      const midPrice = symbol === "USDC" ? 1.0 : virtualPrice * (FALLBACK_PRICES[symbol] ?? 1);
      if (usdTotal > 0 && midPrice > 0) return { snapshot: buildSnapshot(symbol, midPrice, usdTotal), synthetic: false };
      liveError = "usdTotal=0";
    } else { liveError = `Pool ${pool.address} not found`; }
  } catch (e: any) { liveError = e.message; }
  console.log(`[Curve] Live unavailable (${liveError}), synthetic fallback for ${symbol}`);
  return { snapshot: buildSnapshot(symbol, FALLBACK_PRICES[symbol] ?? 1, FALLBACK_POOL_USD[symbol] ?? 100_000_000), synthetic: true };
}

router.get("/spot/depth", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;
  const symbol = ((req.query.symbol as string) || "ETH").toUpperCase();
  if (!POOL_REGISTRY[symbol]) return res.status(400).json({ ok: false, error: `Symbol ${symbol} not in Curve pool registry. Supported: ${Object.keys(POOL_REGISTRY).join(", ")}` });
  try {
    const { snapshot, synthetic } = await fetchCurveDepth(symbol);
    tsleBuffer.record(snapshot);
    const tsle = tsleStateEngine.transition("curve", symbol, tsleBuffer.getHistory("curve", symbol), snapshot.spread.bps);
    (snapshot as any).tsle = tsle;
    (snapshot as any).provenance = { sourceVenue: "curve", transport: synthetic ? "synthetic" : "relay", scope: "spot", synthetic };
    return res.json({ ok: true, ...snapshot });
  } catch (e: any) { return res.status(502).json({ ok: false, error: e.message }); }
});

router.get("/health", async (_req: Request, res: Response) => {
  try {
    const data = await curveFetch(`${CURVE_API}/getPools/ethereum/crypto`);
    res.json({ ok: true, venue: "curve", poolCount: data?.data?.poolData?.length ?? 0, ts: Date.now() });
  } catch (e: any) { res.json({ ok: false, venue: "curve", error: e.message }); }
});

export default router;
'''

files["otc-relay.ts"] = '''/**
 * OTC / RFQ Relay — server/routes/otc-relay.ts
 * SRIS v1.3-compliant relay for bilateral OTC dark liquidity.
 * Routes (mounted at /otc in routes.ts):
 *   GET /spot/depth?symbol=BTC
 *   GET /perps/depth?symbol=BTC
 *   GET /health
 * Env vars: OTC_RFQ_URL, OTC_API_KEY, OTC_API_SECRET, OTC_VENUE_NAME
 */
import { Router, Request, Response } from "express";
import crypto from "crypto";
import { tsleBuffer, tsleStateEngine, type LISSnapshot } from "../services/tsle-buffer";

const router = Router();
const TIMEOUT_MS = 5000;
const SUPPORTED_SYMBOLS = ["BTC", "ETH", "SOL", "XRP", "BNB", "AVAX", "ARB", "OP"];
const FALLBACK_PRICES: Record<string, number> = { BTC: 95000, ETH: 3200, SOL: 180, XRP: 0.60, BNB: 600, AVAX: 38, ARB: 1.2, OP: 2.5 };

function authCheck(req: Request, res: Response): boolean {
  const secret = process.env.RELAY_SECRET;
  if (!secret) return true;
  const provided = req.headers["x-relay-secret"] as string;
  if (provided !== secret) { res.status(401).json({ ok: false, error: "Unauthorized" }); return false; }
  return true;
}

function signRequest(method: string, path: string, body: string, secret: string): string {
  const ts = Date.now().toString();
  return `${ts}.${crypto.createHmac("sha256", secret).update(`${ts}${method.toUpperCase()}${path}${body}`).digest("hex")}`;
}

async function otcFetch(path: string, body: Record<string, any> = {}): Promise<any> {
  const rfqUrl = process.env.OTC_RFQ_URL;
  const apiKey = process.env.OTC_API_KEY;
  const apiSecret = process.env.OTC_API_SECRET;
  if (!rfqUrl) throw new Error("OTC_RFQ_URL not configured — this relay requires institutional onboarding");
  const bodyStr = JSON.stringify(body);
  const sig = apiSecret ? signRequest("POST", path, bodyStr, apiSecret) : "";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(`${rfqUrl}${path}`, { method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json", "User-Agent": "StrataLink-LIS/1.0", ...(apiKey ? { "X-API-Key": apiKey } : {}), ...(sig ? { "X-Signature": sig } : {}) }, body: bodyStr });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`OTC API HTTP ${resp.status}`);
    return resp.json();
  } catch (e: any) {
    clearTimeout(timer);
    throw new Error(e.name === "AbortError" ? `OTC timeout after ${TIMEOUT_MS}ms` : e.message);
  }
}

function buildSyntheticSnapshot(symbol: string, midPrice: number, poolSize: number): LISSnapshot {
  const spreadBps = 2.5;
  const bands: Record<string, { bid_notional: number; ask_notional: number; total_notional: number }> = {};
  for (const bps of [0.1, 0.25, 0.5, 1, 2]) {
    const total = poolSize * (bps / 2) * (0.8 + Math.random() * 0.4);
    bands[`pct_${bps}`] = { bid_notional: Math.round(total * 0.5), ask_notional: Math.round(total * 0.5), total_notional: Math.round(total) };
  }
  return { venue: "otc", symbol: symbol.toUpperCase(), timestamp: Date.now(), mid_price: midPrice, spread: { absolute: midPrice * (spreadBps / 10_000), bps: spreadBps }, bands };
}

async function fetchOtcDepth(symbol: string, scope: "spot" | "perps"): Promise<{ snapshot: LISSnapshot; synthetic: boolean }> {
  if (!process.env.OTC_RFQ_URL) {
    return { snapshot: buildSyntheticSnapshot(symbol, FALLBACK_PRICES[symbol] ?? 1, symbol === "BTC" ? 50_000_000 : 20_000_000), synthetic: true };
  }
  const notionals = [1_000_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000];
  let liveError = "";
  try {
    const quotesRaw = await Promise.all(notionals.map(n => otcFetch("/rfq/indicative", { symbol: `${symbol}USD`, side: "two-way", notional: n, currency: "USD", scope })));
    const quotes = quotesRaw.map((q: any, i) => ({ notional: notionals[i], bid: parseFloat(q.bid ?? q.bidPrice ?? "0"), ask: parseFloat(q.ask ?? q.askPrice ?? "0") }));
    if (quotes[0].bid > 0) {
      const mid = (quotes[0].bid + quotes[0].ask) / 2;
      const spreadBps = ((quotes[0].ask - quotes[0].bid) / mid) * 10_000;
      const bands: Record<string, { bid_notional: number; ask_notional: number; total_notional: number }> = {};
      [0.1, 0.25, 0.5, 1, 2].forEach((bps, i) => {
        const q = quotes[Math.min(i, quotes.length - 1)];
        bands[`pct_${bps}`] = { bid_notional: Math.round(q.notional / 2), ask_notional: Math.round(q.notional / 2), total_notional: q.notional };
      });
      const snapshot: LISSnapshot = { venue: "otc", symbol: symbol.toUpperCase(), timestamp: Date.now(), mid_price: mid, spread: { absolute: quotes[0].ask - quotes[0].bid, bps: spreadBps }, bands };
      return { snapshot, synthetic: false };
    }
    liveError = "Zero bid in RFQ response";
  } catch (e: any) { liveError = e.message; }
  console.log(`[OTC] Live RFQ unavailable (${liveError}), synthetic fallback for ${symbol}`);
  return { snapshot: buildSyntheticSnapshot(symbol, FALLBACK_PRICES[symbol] ?? 1, symbol === "BTC" ? 50_000_000 : 20_000_000), synthetic: true };
}

router.get("/spot/depth", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;
  const symbol = ((req.query.symbol as string) || "BTC").toUpperCase();
  if (!SUPPORTED_SYMBOLS.includes(symbol)) return res.status(400).json({ ok: false, error: `Symbol ${symbol} not supported. Supported: ${SUPPORTED_SYMBOLS.join(", ")}` });
  try {
    const { snapshot, synthetic } = await fetchOtcDepth(symbol, "spot");
    tsleBuffer.record(snapshot);
    const tsle = tsleStateEngine.transition("otc", symbol, tsleBuffer.getHistory("otc", symbol), snapshot.spread.bps);
    (snapshot as any).tsle = tsle;
    (snapshot as any).provenance = { sourceVenue: process.env.OTC_VENUE_NAME ?? "OTC (RFQ)", transport: synthetic ? "synthetic" : "relay", scope: "spot", synthetic };
    return res.json({ ok: true, ...snapshot });
  } catch (e: any) { return res.status(502).json({ ok: false, error: e.message }); }
});

router.get("/perps/depth", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;
  const symbol = ((req.query.symbol as string) || "BTC").toUpperCase();
  if (!SUPPORTED_SYMBOLS.includes(symbol)) return res.status(400).json({ ok: false, error: `Symbol ${symbol} not supported` });
  try {
    const { snapshot, synthetic } = await fetchOtcDepth(symbol, "perps");
    tsleBuffer.record(snapshot);
    const tsle = tsleStateEngine.transition("otc", symbol, tsleBuffer.getHistory("otc", symbol), snapshot.spread.bps);
    (snapshot as any).tsle = tsle;
    (snapshot as any).provenance = { sourceVenue: process.env.OTC_VENUE_NAME ?? "OTC (RFQ)", transport: synthetic ? "synthetic" : "relay", scope: "perps", synthetic };
    return res.json({ ok: true, ...snapshot });
  } catch (e: any) { return res.status(502).json({ ok: false, error: e.message }); }
});

router.get("/health", async (_req: Request, res: Response) => {
  const rfqUrl = process.env.OTC_RFQ_URL;
  const venueName = process.env.OTC_VENUE_NAME ?? "OTC (RFQ)";
  if (!rfqUrl) return res.json({ ok: false, venue: "otc", venueName, status: "unconfigured", note: "OTC_RFQ_URL not configured — requires institutional onboarding" });
  try {
    const data = await otcFetch("/health", {});
    res.json({ ok: true, venue: "otc", venueName, ts: Date.now(), ...data });
  } catch (e: any) { res.json({ ok: false, venue: "otc", venueName, error: e.message }); }
});

export default router;
'''

files["canton-relay.ts"] = '''/**
 * Canton Network Relay — server/routes/canton-relay.ts
 * SRIS v1.3-compliant relay for Canton Network (Digital Asset).
 * Routes (mounted at /canton in routes.ts):
 *   GET /attestation/liquidity?symbol=BTC
 *   GET /attestation/depth?symbol=BTC
 *   GET /health
 * Env vars: CANTON_LEDGER_URL, CANTON_AUTH_TOKEN, CANTON_PARTY_ID
 */
import { Router, Request, Response } from "express";
import { tsleBuffer, tsleStateEngine, type LISSnapshot } from "../services/tsle-buffer";

const router = Router();
const TIMEOUT_MS = 5000;
const TEMPLATE_ID = "StratalinkLiquidity:LiquidityAttestation";
const SUPPORTED_SYMBOLS = ["BTC", "ETH", "USDC", "SOL", "BNB"];
const ORACLE_PRICES: Record<string, number> = { BTC: 95000, ETH: 3200, USDC: 1.0, SOL: 180, BNB: 600 };

function authCheck(req: Request, res: Response): boolean {
  const secret = process.env.RELAY_SECRET;
  if (!secret) return true;
  const provided = req.headers["x-relay-secret"] as string;
  if (provided !== secret) { res.status(401).json({ ok: false, error: "Unauthorized" }); return false; }
  return true;
}

async function cantonFetch(path: string): Promise<any> {
  const ledgerUrl = process.env.CANTON_LEDGER_URL;
  const authToken = process.env.CANTON_AUTH_TOKEN;
  if (!ledgerUrl) throw new Error("CANTON_LEDGER_URL not configured — requires Digital Asset partner onboarding");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(`${ledgerUrl}${path}`, { signal: controller.signal, headers: { "User-Agent": "StrataLink-LIS/1.0", Accept: "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) } });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`Canton Ledger API HTTP ${resp.status}`);
    return resp.json();
  } catch (e: any) {
    clearTimeout(timer);
    throw new Error(e.name === "AbortError" ? `Canton timeout after ${TIMEOUT_MS}ms` : e.message);
  }
}

async function fetchAttestation(symbol: string) {
  const partyId = process.env.CANTON_PARTY_ID ?? "";
  const url = `/v1/active-contracts?templateId=${encodeURIComponent(TEMPLATE_ID)}&party=${encodeURIComponent(partyId)}&filter=symbol:${symbol}`;
  const data = await cantonFetch(url);
  const contracts: any[] = data?.result ?? data?.activeContracts ?? [];
  if (!contracts.length) throw new Error(`No active ${symbol} attestation found for party ${partyId}`);
  const contract = contracts[0];
  const payload = contract?.payload ?? contract?.argument ?? {};
  return {
    attestedDepth: parseFloat(payload.attestedDepth ?? payload.depth ?? "0"),
    attestationHash: payload.attestationHash ?? payload.hash ?? null,
    issuerParty: payload.issuerParty ?? contract.signatories?.[0] ?? null,
    contractId: contract.contractId ?? null,
    timestamp: payload.timestamp ?? payload.ts ?? Date.now(),
  };
}

function attestationToSnapshot(symbol: string, attestedDepth: number): LISSnapshot {
  const oraclePrice = ORACLE_PRICES[symbol] ?? 1;
  const bands: Record<string, { bid_notional: number; ask_notional: number; total_notional: number }> = {};
  for (const bps of [0.1, 0.25, 0.5, 1, 2]) {
    const total = attestedDepth * (bps / 100) * 0.5;
    bands[`pct_${bps}`] = { bid_notional: Math.round(total), ask_notional: Math.round(total), total_notional: Math.round(total * 2) };
  }
  const spreadBps = 0.5;
  return { venue: "canton", symbol: symbol.toUpperCase(), timestamp: Date.now(), mid_price: oraclePrice, spread: { absolute: oraclePrice * (spreadBps / 10_000), bps: spreadBps }, bands };
}

router.get("/attestation/liquidity", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;
  const symbol = ((req.query.symbol as string) || "BTC").toUpperCase();
  if (!SUPPORTED_SYMBOLS.includes(symbol)) return res.status(400).json({ ok: false, error: `Symbol ${symbol} not supported` });
  if (!process.env.CANTON_LEDGER_URL) return res.json({ ok: false, venue: "canton", error: "CANTON_LEDGER_URL not configured — requires Digital Asset partner onboarding" });
  try {
    const attestation = await fetchAttestation(symbol);
    res.json({ ok: true, venue: "canton", symbol, ...attestation });
  } catch (e: any) { res.status(502).json({ ok: false, venue: "canton", error: e.message }); }
});

router.get("/attestation/depth", async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;
  const symbol = ((req.query.symbol as string) || "BTC").toUpperCase();
  if (!SUPPORTED_SYMBOLS.includes(symbol)) return res.status(400).json({ ok: false, error: `Symbol ${symbol} not supported` });
  if (!process.env.CANTON_LEDGER_URL) return res.json({ ok: false, venue: "canton", error: "CANTON_LEDGER_URL not configured — requires Digital Asset partner onboarding" });
  try {
    const attestation = await fetchAttestation(symbol);
    const snapshot = attestationToSnapshot(symbol, attestation.attestedDepth);
    tsleBuffer.record(snapshot);
    const tsle = tsleStateEngine.transition("canton", symbol, tsleBuffer.getHistory("canton", symbol), snapshot.spread.bps);
    (snapshot as any).tsle = tsle;
    (snapshot as any).provenance = { sourceVenue: "canton", transport: "relay", scope: "attestation", synthetic: false };
    (snapshot as any).attestation = { attestationHash: attestation.attestationHash, issuerParty: attestation.issuerParty, contractId: attestation.contractId, poliTier: "L5", trustMultiplier: 1.15 };
    res.json({ ok: true, ...snapshot });
  } catch (e: any) { res.status(502).json({ ok: false, venue: "canton", error: e.message }); }
});

router.get("/health", async (_req: Request, res: Response) => {
  if (!process.env.CANTON_LEDGER_URL) return res.json({ ok: false, venue: "canton", status: "unconfigured", note: "CANTON_LEDGER_URL not configured — requires Digital Asset partner onboarding" });
  try {
    const data = await cantonFetch("/v1/ledger-end");
    res.json({ ok: true, venue: "canton", ledgerOffset: data?.result?.offset ?? data?.offset ?? null, ts: Date.now() });
  } catch (e: any) { res.json({ ok: false, venue: "canton", error: e.message }); }
});

export default router;
'''

for filename, content in files.items():
    filepath = os.path.join(base, filename)
    with open(filepath, "w") as f:
        f.write(content)
    print(f"✓ Created {filepath}")

print("\nDone. Now add to server/routes.ts:")
print('  import curveRoutes  from "./routes/curve-relay";')
print('  import otcRoutes    from "./routes/otc-relay";')
print('  import cantonRoutes from "./routes/canton-relay";')
print('  app.use("/curve",  curveRoutes);')
print('  app.use("/otc",    otcRoutes);')
print('  app.use("/canton", cantonRoutes);')
