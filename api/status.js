import { transactions } from "./pay";

export default function handler(req, res) {
  const { id } = req.query;
  if (!id || !transactions[id]) return res.json({ status: "UNKNOWN" });

  res.json({ status: transactions[id].status });
}
