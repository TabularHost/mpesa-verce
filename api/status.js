import { transactions } from "./pay";

export default async function handler(req, res) {
  try {
    const { id } = req.query;
    console.log("Status request for:", id);

    if (!id || !transactions[id]) {
      console.warn("Unknown transaction ID:", id);
      return res.json({ status: "UNKNOWN" });
    }

    const t = transactions[id];
    console.log(`Transaction ${id} status: ${t.status}`);

    res.json({
      status: t.status,
      resultDesc: t.resultDesc || null
    });
  } catch (err) {
    console.error("Status handler error:", err);
    res.status(500).json({ status: "ERROR", error: err.message });
  }
}
