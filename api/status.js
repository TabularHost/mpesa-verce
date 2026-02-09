import { readTransactions } from "./store";

export default async function handler(req, res) {
  try {
    const { id } = req.query;
    if (!id) return res.json({ status: "UNKNOWN" });

    const transactions = readTransactions();
    if (!transactions[id]) return res.json({ status: "UNKNOWN" });

    const t = transactions[id];
    res.json({ status: t.status, resultDesc: t.resultDesc || null });
  } catch (err) {
    console.error("Status handler error:", err);
    res.status(500).json({ status: "ERROR", error: err.message });
  }
}
