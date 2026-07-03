export interface ILUToken {
  symbol: string;
  name: string;
  pair: string;
  category: string;
  categoryLabel: string;
  systemicRole: string;
}

export interface ILUCategory {
  id: string;
  label: string;
  shortLabel: string;
  tokens: ILUToken[];
}

export const ILU_CATEGORIES: ILUCategory[] = [
  {
    id: "reserve",
    label: "Reserve Assets",
    shortLabel: "RESERVE",
    tokens: [
      { symbol: "BTC",  name: "Bitcoin",       pair: "BTC-USD",  category: "reserve",        categoryLabel: "RESERVE",        systemicRole: "Primary store of value, largest collateral asset" },
      { symbol: "ETH",  name: "Ethereum",      pair: "ETH-USD",  category: "reserve",        categoryLabel: "RESERVE",        systemicRole: "Settlement layer for DeFi and tokenised assets" },
    ],
  },
  {
    id: "stablecoin",
    label: "Stablecoin Infrastructure",
    shortLabel: "STABLECOIN",
    tokens: [
      { symbol: "USDT", name: "Tether",        pair: "USDT-USD", category: "stablecoin",     categoryLabel: "STABLECOIN",     systemicRole: "Largest source of trading liquidity" },
      { symbol: "USDC", name: "USD Coin",      pair: "USDC-USD", category: "stablecoin",     categoryLabel: "STABLECOIN",     systemicRole: "Institutional settlement asset and collateral" },
      { symbol: "USDe", name: "Ethena USDe",   pair: "USDe-USD", category: "stablecoin",     categoryLabel: "STABLECOIN",     systemicRole: "Synthetic dollar in derivatives markets" },
      { symbol: "DAI",  name: "DAI",           pair: "DAI-USD",  category: "stablecoin",     categoryLabel: "STABLECOIN",     systemicRole: "Decentralised stablecoin" },
    ],
  },
  {
    id: "exchange",
    label: "Exchange and Trading Infrastructure",
    shortLabel: "EXCHANGE",
    tokens: [
      { symbol: "BNB",  name: "BNB",           pair: "BNB-USD",  category: "exchange",       categoryLabel: "EXCHANGE",       systemicRole: "Central to the Binance ecosystem" },
      { symbol: "HYPE", name: "Hyperliquid",    pair: "HYPE-USD", category: "exchange",       categoryLabel: "EXCHANGE",       systemicRole: "Perpetual futures venue" },
      { symbol: "OKB",  name: "OKB",           pair: "OKB-USD",  category: "exchange",       categoryLabel: "EXCHANGE",       systemicRole: "Key exchange ecosystem token" },
      { symbol: "CRO",  name: "Cronos",        pair: "CRO-USD",  category: "exchange",       categoryLabel: "EXCHANGE",       systemicRole: "Supports the Crypto.com ecosystem" },
    ],
  },
  {
    id: "infrastructure",
    label: "Financial Infrastructure",
    shortLabel: "INFRASTRUCTURE",
    tokens: [
      { symbol: "LINK", name: "Chainlink",     pair: "LINK-USD", category: "infrastructure", categoryLabel: "INFRASTRUCTURE", systemicRole: "Dominant oracle network" },
      { symbol: "MKR",  name: "Maker",         pair: "MKR-USD",  category: "infrastructure", categoryLabel: "INFRASTRUCTURE", systemicRole: "Key lending and stablecoin governance" },
      { symbol: "AAVE", name: "Aave",          pair: "AAVE-USD", category: "infrastructure", categoryLabel: "INFRASTRUCTURE", systemicRole: "Major institutional lending protocol" },
      { symbol: "UNI",  name: "Uniswap",       pair: "UNI-USD",  category: "infrastructure", categoryLabel: "INFRASTRUCTURE", systemicRole: "Largest decentralised exchange" },
    ],
  },
  {
    id: "liquidity",
    label: "High-Volume Liquidity Assets",
    shortLabel: "LIQUIDITY",
    tokens: [
      { symbol: "SOL",  name: "Solana",        pair: "SOL-USD",  category: "liquidity",      categoryLabel: "LIQUIDITY",      systemicRole: "Major trading ecosystem" },
      { symbol: "XRP",  name: "XRP",           pair: "XRP-USD",  category: "liquidity",      categoryLabel: "LIQUIDITY",      systemicRole: "Significant global institutional liquidity" },
      { symbol: "DOGE", name: "Dogecoin",      pair: "DOGE-USD", category: "liquidity",      categoryLabel: "LIQUIDITY",      systemicRole: "Most actively traded meme asset" },
      { symbol: "TON",  name: "Toncoin",       pair: "TON-USD",  category: "liquidity",      categoryLabel: "LIQUIDITY",      systemicRole: "Rapid ecosystem growth" },
      { symbol: "ADA",  name: "Cardano",       pair: "ADA-USD",  category: "liquidity",      categoryLabel: "LIQUIDITY",      systemicRole: "Large capitalisation, broad exchange coverage" },
    ],
  },
  {
    id: "rwa",
    label: "Digital Securities & RWA",
    shortLabel: "RWA",
    tokens: [
      // Phase 1 — commodity tokens & governance
      { symbol: "PAXG",  name: "Paxos Gold",             pair: "PAXG-USD",  category: "rwa", categoryLabel: "RWA", systemicRole: "NYDFS-regulated tokenized gold (1 PAXG = 1 troy oz London Good Delivery gold)" },
      { symbol: "XAUT",  name: "Tether Gold",             pair: "XAUT-USD",  category: "rwa", categoryLabel: "RWA", systemicRole: "Tokenized gold commodity (1 XAUT = 1 troy oz London Good Delivery gold)" },
      { symbol: "ONDO",  name: "Ondo Finance",            pair: "ONDO-USD",  category: "rwa", categoryLabel: "RWA", systemicRole: "Governance token of the leading tokenized securities platform" },
      { symbol: "BUIDL", name: "BlackRock BUIDL",         pair: "BUIDL-USD", category: "rwa", categoryLabel: "RWA", systemicRole: "BlackRock $2.5B tokenized US Treasury fund (via Securitize, USD-pegged)" },
      { symbol: "OUSG",  name: "Ondo OUSG",               pair: "OUSG-USD",  category: "rwa", categoryLabel: "RWA", systemicRole: "Ondo tokenized US Government Bond Fund (yield-accruing, institutional access)" },
      // Phase 2 — security token exchange assets
      { symbol: "BENJI", name: "Franklin OnChain",        pair: "BENJI-USD", category: "rwa", categoryLabel: "RWA", systemicRole: "Franklin Templeton tokenized US Government Money Fund (on-chain shares, multi-chain)" },
      { symbol: "VBILL", name: "VanEck VBILL",            pair: "VBILL-USD", category: "rwa", categoryLabel: "RWA", systemicRole: "VanEck tokenized US Treasury Bills fund (institutional grade, Ethereum)" },
      { symbol: "USDY",  name: "Ondo US Dollar Yield",    pair: "USDY-USD",  category: "rwa", categoryLabel: "RWA", systemicRole: "Ondo yield-bearing stablecoin backed by short-term US Treasuries" },
      { symbol: "BCSPX", name: "Backed CSPX",             pair: "BCSPX-USD", category: "rwa", categoryLabel: "RWA", systemicRole: "Backed Finance tokenized iShares Core S&P 500 ETF (bCSPX, Ethereum)" },
      { symbol: "BIB01", name: "Backed IB01",             pair: "BIB01-USD", category: "rwa", categoryLabel: "RWA", systemicRole: "Backed Finance tokenized iShares Short Treasury Bond ETF (bIB01, Ethereum)" },
      { symbol: "ACRED", name: "Ares Credit",             pair: "ACRED-USD", category: "rwa", categoryLabel: "RWA", systemicRole: "Ares Management tokenized private credit fund (via Securitize, institutional access)" },
    ],
  },
];

export const ILU_TOKENS: ILUToken[] = ILU_CATEGORIES.flatMap(c => c.tokens);
export const ILU_SYMBOLS: string[]  = ILU_TOKENS.map(t => t.symbol);

export function getILUToken(symbol: string): ILUToken | undefined {
  return ILU_TOKENS.find(t => t.symbol === symbol);
}

export function getILUCategory(symbol: string): ILUCategory | undefined {
  return ILU_CATEGORIES.find(c => c.tokens.some(t => t.symbol === symbol));
}
