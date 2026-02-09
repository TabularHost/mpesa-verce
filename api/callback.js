// /api/callback.js
let payments = global.payments || {}; // same in-memory object
global.payments = payments;

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const callback = req.body;

  try {
    const id = callback.Body.stkCallback.CheckoutRequestID;
    const resultCode = callback.Body.stkCallback.ResultCode;
    const resultDesc = callback.Body.stkCallback.ResultDesc;

    if (!id) return res.status(400).json({ error: "Invalid callback" });

    payments[id] = {
      status: resultCode === 0 ? "SUCCESS" : "FAILED",
      resultDesc
    };

    console.log("STK Callback received:", payments[id]);

    res.json({ message: "Callback received" });
  } catch (err) {
    console.error("Callback error:", err);
    res.status(500).json({ error: "Server error" });
  }
}
