// /api/status.js
global.payments = global.payments || {};
let payments = global.payments;

export default function handler(req, res) {
  const id = req.query.id;
  if (!id) return res.status(400).json({ success: false, error: "Missing id" });

  const payment = payments[id];
  if (!payment) return res.status(200).json({ status: "UNKNOWN" });

  return res.status(200).json(payment);
}
