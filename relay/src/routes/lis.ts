import { fetchCoinbaseDepth } from "../adapters/coinbaseDepth";

router.get("/coinbase/depth", async (req, res) => {
  const symbol = req.query.symbol as string;

  if (!symbol) {
    return res.status(400).json({ error: "symbol required" });
  }

  try {
    const snapshot = await fetchCoinbaseDepth(symbol);
    res.json(snapshot);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});