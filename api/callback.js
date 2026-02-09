import { transactions } from "./pay";

export default async function handler(req, res) {
  try {
    const body = req.body;

    console.log("Received M-Pesa callback:", JSON.stringify(body, null, 2));

    const callback = body.Body?.stkCallback;
    if (!callback) {
      console.error("Invalid callback structure");
      return res.status(400).json({ success: false, error: "Invalid callback structure" });
    }

    const checkoutId = callback.CheckoutRequestID;
    const resultCode = callback.ResultCode;
    const resultDesc = callback.ResultDesc;

    // Find the transaction in memory
    let found = false;
    for (const id in transactions) {
      if (transactions[id].mpesaCheckoutId === checkoutId) {
        transactions[id].status = resultCode === 0 ? "SUCCESS" : "FAILED";
        transactions[id].resultDesc = resultDesc;
        found = true;
        console.log(`Transaction ${id} updated: ${transactions[id].status}`);
      }
    }

    if (!found) {
      console.warn("Callback received for unknown CheckoutRequestID:", checkoutId);
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Callback handler error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}
