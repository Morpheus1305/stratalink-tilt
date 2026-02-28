import { Router, Request, Response } from "express";
import { tsleBuffer, tsleStateEngine, type LISSnapshot } from "../services/tsle-buffer";

const router = Router();
const TIMEOUT_MS = 5000;
const TEMPLATE_ID = "StratalinkLiquidity:LiquidityAttestation";
const SUPPORTED_SYMBOLS = ["BTC", "ETH", "USDC", "SOL", "BNB"];

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", USDC: "usd-coin", SOL: "solana", BNB: "binancecoin",
};
const HARDCODED_FALLBACK: Record<string, number> = { BTC: 65000, ETH: 1900, USDC: 1.0, SOL: 80, BNB: 600 };

let refPriceCache: Record<string, { price: number; ts: number }> = {};

async function getRefPrice(symbol: string): Promise<number> {
  if (symbol === "USDC") return 1.0;
  const cached = refPriceCache[symbol];
  if (cached && Date.now() - cached.ts < 30_000) return cached.price;
  const cgId = COINGECKO_IDS[symbol];
  if (!cgId) return HARDCODED_FALLBACK[symbol] ?? 1;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const resp = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd`, { signal: controller.signal });
    clearTimeout(timer);
    if (resp.ok) {
      const data = (await resp.json()) as any;
      const price = data?.[cgId]?.usd ?? 0;
      if (price > 0) {
        refPriceCache[symbol] = { price, ts: Date.now() };
        return price;
      }
    }
  } catch {}
  return cached?.price ?? HARDCODED_FALLBACK[symbol] ?? 1;
}

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

async function attestationToSnapshot(symbol: string, attestedDepth: number): Promise<LISSnapshot> {
  const oraclePrice = await getRefPrice(symbol);
  const bands: Record<string, { bid_notional: number; ask_notional: number; total_notional: number }> = {};
  for (const bps of [0.1, 0.25, 0.5, 1, 2]) {
    const total = attestedDepth * (bps / 100) * 0.5;
    bands[`pct_${bps}`] = { bid_notional: Math.round(total), ask_notional: Math.round(total), total_notional: Math.round(total * 2) };
  }
  const spreadBps = 0.5;
  return { venue: "canton", symbol: symbol.toUpperCase(), timestamp: Date.now(), mid_price: oraclePrice, spread: { absolute: oraclePrice * (spreadBps / 10_000), bps: spreadBps }, bands };
}

const SYNTHETIC_ATTESTED_DEPTH: Record<string, number> = { BTC: 120_000_000, ETH: 80_000_000, USDC: 200_000_000, SOL: 30_000_000, BNB: 25_000_000 };

async function buildSyntheticSnapshot(symbol: string): Promise<LISSnapshot> {
  const refPrice = await getRefPrice(symbol);
  const attestedDepth = SYNTHETIC_ATTESTED_DEPTH[symbol] ?? 50_000_000;
  const bands: Record<string, { bid_notional: number; ask_notional: number; total_notional: number }> = {};
  for (const bps of [0.1, 0.25, 0.5, 1, 2]) {
    const total = attestedDepth * (bps / 100) * 0.5;
    bands[`pct_${bps}`] = { bid_notional: Math.round(total), ask_notional: Math.round(total), total_notional: Math.round(total * 2) };
  }
  const spreadBps = 0.8;
  return { venue: "canton", symbol: symbol.toUpperCase(), timestamp: Date.now(), mid_price: refPrice, spread: { absolute: refPrice * (spreadBps / 10_000), bps: spreadBps }, bands };
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
  let snapshot: LISSnapshot;
  let synthetic = false;
  let attestation: any = null;
  if (!process.env.CANTON_LEDGER_URL) {
    snapshot = await buildSyntheticSnapshot(symbol);
    synthetic = true;
    console.log(`[Canton] CANTON_LEDGER_URL not configured, synthetic fallback for ${symbol}`);
  } else {
    try {
      attestation = await fetchAttestation(symbol);
      snapshot = await attestationToSnapshot(symbol, attestation.attestedDepth);
    } catch (e: any) {
      console.log(`[Canton] Live ledger unavailable (${e.message}), synthetic fallback for ${symbol}`);
      snapshot = await buildSyntheticSnapshot(symbol);
      synthetic = true;
    }
  }
  tsleBuffer.record(snapshot);
  const tsle = tsleStateEngine.transition("canton", symbol, tsleBuffer.getHistory("canton", symbol), snapshot.spread.bps);
  (snapshot as any).tsle = tsle;
  (snapshot as any).provenance = { sourceVenue: "canton", transport: synthetic ? "synthetic" : "relay", scope: "attestation", synthetic };
  if (attestation) {
    (snapshot as any).attestation = { attestationHash: attestation.attestationHash, issuerParty: attestation.issuerParty, contractId: attestation.contractId, poliTier: "L5", trustMultiplier: 1.15 };
  }
  res.json({ ok: true, ...snapshot });
});

router.get("/health", async (_req: Request, res: Response) => {
  if (!process.env.CANTON_LEDGER_URL) return res.json({ ok: false, venue: "canton", status: "unconfigured", note: "CANTON_LEDGER_URL not configured — requires Digital Asset partner onboarding" });
  try {
    const data = await cantonFetch("/v1/ledger-end");
    res.json({ ok: true, venue: "canton", ledgerOffset: data?.result?.offset ?? data?.offset ?? null, ts: Date.now() });
  } catch (e: any) { res.json({ ok: false, venue: "canton", error: e.message }); }
});

export default router;
