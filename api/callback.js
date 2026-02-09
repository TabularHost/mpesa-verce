import { transactions } from "./pay";

export default function handler(req, res) {
  const body = req.body;

  // Daraja sends confirmation here
  const checkoutId = body.Body?.stkCallback?.CheckoutRequestID;
  const resultCode = body.Body?.stkCallback?.ResultCode;

  for (let id in transactions) {
    if (transactions[id].mpesaCheckoutId === checkoutId) {
      transactions[id].status = resultCode === 0 ? "SUCCESS" : "FAILED";
    }
  }

  res.status(200).json({ success: true });
}
