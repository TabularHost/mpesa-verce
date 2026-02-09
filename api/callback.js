import { readTransactions, writeTransactions } from "./store";

export default async function handler(req, res) {
  try {
    const body = req.body || {};

    if (!body.Body || !body.Body.stkCallback) {
      console.warn("Callback accessed without valid M-Pesa payload");
      return res.json({ success: true, message: "No callback data received" });
    }

    const callback = body.Body.stkCallback;
    const checkoutIdFromMpesa = callback.CheckoutRequestID;
    const resultCode = callback.ResultCode;
    const resultDesc = callback.ResultDesc;

    const transactions = readTransactions();
    let found = false;

    for (const id in transactions) {
      if (transactions[id].mpesaCheckoutId === checkoutIdFromMpesa) {
        transactions[id].status = resultCode === 0 ? "SUCCESS" : "FAILED";
        transactions[id].resultDesc = resultDesc;
        found = true;
        console.log(`Transaction ${id} updated: ${transactions[id].status}`);
      }
    }

    if (!found) console.warn("Callback received for unknown CheckoutRequestID:", checkoutIdFromMpesa);

    writeTransactions(transactions);
    res.json({ success: true });
  } catch (err) {
    console.error("Callback handler error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}
