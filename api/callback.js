// /api/callback.js
global.payments = global.payments || {};
let payments = global.payments;

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    const callback = req.body;
    const stk = callback?.Body?.stkCallback;

    if (!stk) return res.status(400).json({ success: false, error: "Invalid callback body" });

    const id = stk.CheckoutRequestID;
    const resultCode = stk.ResultCode;
    const resultDesc = stk.ResultDesc;

    payments[id] = { status: resultCode === 0 ? "SUCCESS" : "FAILED", resultDesc };

    console.log("STK Callback received:", payments[id]);

    return res.status(200).json({ success: true, message: "Callback received" });
  } catch (err) {
    console.error("Callback error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}
