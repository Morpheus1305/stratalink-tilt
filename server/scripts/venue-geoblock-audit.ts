/**
 * Venue API Geo-Block Audit
 * Tests every venue API endpoint from the Replit environment.
 * Run: npx tsx server/scripts/venue-geoblock-audit.ts
 */

const VENUE_TESTS = [
  { name: "Binance",    url: "https://api.binance.com/api/v3/depth?symbol=BTCUSDT&limit=5",                                                           type: "CEX" },
  { name: "OKX",        url: "https://www.okx.com/api/v5/market/books?instId=BTC-USDT&sz=5",                                                          type: "CEX" },
  { name: "Bybit",      url: "https://api.bybit.com/v5/market/orderbook?category=spot&symbol=BTCUSDT&limit=5",                                         type: "CEX" },
  { name: "Kraken",     url: "https://api.kraken.com/0/public/Depth?pair=XBTUSD&count=5",                                                             type: "CEX" },
  { name: "Coinbase",   url: "https://api.exchange.coinbase.com/products/BTC-USD/book?level=2",                                                        type: "CEX" },
  { name: "Bitget",     url: "https://api.bitget.com/api/v2/spot/market/orderbook?symbol=BTCUSDT&limit=5",                                             type: "CEX" },
  { name: "dYdX",       url: "https://indexer.dydx.trade/v4/orderbooks/perpetualMarket/BTC-USD",                                                      type: "DEX" },
  { name: "Deribit",    url: "https://www.deribit.com/api/v2/public/get_order_book?instrument_name=BTC-PERPETUAL&depth=5",                             type: "CEX" },
  { name: "Hyperliquid",url: "https://api.hyperliquid.xyz/info", method: "POST", body: JSON.stringify({ type: "l2Book", coin: "BTC" }), headers: { "Content-Type": "application/json" }, type: "DEX" },
  { name: "CoinGecko",  url: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",                                           type: "DATA" },
];

async function testVenue(venue: any) {
  const startTime = Date.now();
  try {
    const options: any = { method: venue.method || "GET", headers: venue.headers || {}, signal: AbortSignal.timeout(10_000) };
    if (venue.body) options.body = venue.body;
    const response = await fetch(venue.url, options);
    const latency = Date.now() - startTime;
    const status = response.status;

    if (status === 403 || status === 451) {
      return { venue: venue.name, type: venue.type, status: "BLOCKED",      httpStatus: status, latency: `${latency}ms`, detail: status === 403 ? "HTTP 403 Forbidden - geo-blocked" : "HTTP 451 Unavailable For Legal Reasons", impact: "Falls back to synthetic/modelled data" };
    }
    if (status === 429) {
      return { venue: venue.name, type: venue.type, status: "RATE_LIMITED", httpStatus: status, latency: `${latency}ms`, detail: "HTTP 429 Too Many Requests - rate limited but not blocked", impact: "May need API key or slower polling" };
    }
    if (!response.ok) {
      return { venue: venue.name, type: venue.type, status: "ERROR",        httpStatus: status, latency: `${latency}ms`, detail: `HTTP ${status} - unexpected error`, impact: "Investigate - may need different endpoint or auth" };
    }

    const data = await response.json();
    const hasData = JSON.stringify(data).length > 100;
    return { venue: venue.name, type: venue.type, status: hasData ? "LIVE" : "EMPTY", httpStatus: status, latency: `${latency}ms`, detail: hasData ? "Real order book data returned" : "200 OK but response appears empty", impact: hasData ? "Live data - no action needed" : "Check if endpoint is correct" };

  } catch (error: any) {
    return { venue: venue.name, type: venue.type, status: "NETWORK_ERROR", httpStatus: null, latency: `${Date.now() - startTime}ms`, detail: `Network error: ${error.message}`, impact: "Cannot reach venue API - DNS, firewall or network issue" };
  }
}

async function runAudit() {
  console.log("==============================================");
  console.log("VENUE API GEO-BLOCK AUDIT");
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Environment: Replit`);
  console.log("==============================================\n");

  const results: any[] = [];
  for (const venue of VENUE_TESTS) {
    const result = await testVenue(venue);
    results.push(result);
    const icon = result.status === "LIVE" ? "OK" : result.status === "BLOCKED" ? "XX" : result.status === "RATE_LIMITED" ? "!!" : "??";
    console.log(`[${icon}] ${result.venue.padEnd(22)} ${result.status.padEnd(15)} HTTP ${String(result.httpStatus).padEnd(5)} ${result.latency.padEnd(9)} ${result.detail}`);
  }

  const live    = results.filter(r => r.status === "LIVE");
  const blocked = results.filter(r => r.status === "BLOCKED");
  const other   = results.filter(r => !["LIVE", "BLOCKED"].includes(r.status));

  console.log("\n==============================================");
  console.log("SUMMARY");
  console.log("==============================================");
  console.log(`LIVE (real data):     ${live.length} venues - ${live.map(r => r.venue).join(", ") || "none"}`);
  console.log(`BLOCKED (geo):        ${blocked.length} venues - ${blocked.map(r => r.venue).join(", ") || "none"}`);
  console.log(`OTHER (investigate):  ${other.length} venues - ${other.map(r => r.venue).join(", ") || "none"}`);

  console.log("\n==============================================");
  console.log("RECOMMENDATION");
  console.log("==============================================");
  if (blocked.length > 0) {
    console.log(`\n${blocked.length} venue(s) are geo-blocked from this Replit environment.`);
    console.log("These venues fall back to synthetic/modelled depth data.");
    console.log("To fix: route these venue API calls through the Frankfurt DigitalOcean");
    console.log("relay (relay.stratalink.ai) — same treatment as Binance.\n");
    console.log("Blocked venues needing Frankfurt relay:");
    blocked.forEach(r => console.log(`  - ${r.venue}: ${r.detail}`));
  } else {
    console.log("\nNo geo-blocked venues detected. All venue APIs return live data.");
  }

  try {
    const ipResp  = await fetch("https://api.ipify.org?format=json");
    const ipData  = await ipResp.json() as any;
    console.log(`\nReplit outbound IP: ${ipData.ip}`);
    const geoResp = await fetch(`https://ipapi.co/${ipData.ip}/json/`);
    const geoData = await geoResp.json() as any;
    console.log(`Replit location:    ${geoData.city}, ${geoData.region}, ${geoData.country_name}`);
    console.log(`This explains which venue geo-restrictions apply.\n`);
  } catch {
    console.log("\nCould not determine Replit outbound IP.\n");
  }
}

runAudit();
