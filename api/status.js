// /api/status.js
let payments = global.payments || {}; // global so all serverless invocations can share in dev (sandbox only)
global.payments = payments;

export default function handler(req, res) {
  const id = req.query.id;

  if (!id || !payments[id]) {
    return res.json({ status: "UNKNOWN" });
  }

  res.json(payments[id]);
}
