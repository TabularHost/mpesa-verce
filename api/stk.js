import axios from "axios";
import { db } from "./db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { phone, amount } = req.body;

  try {
    // Access Token
    const auth = Buffer.from(
      process.env.MPESA_KEY + ":" + process.env.MPESA_SECRET
    ).toString("base64");

    const tokenRes = await axios.get(
      "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      { headers: { Authorization: `Basic ${auth}` } }
    );

    const accessToken = tokenRes.data.access_token;

    // STK Push
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, "")
      .slice(0, 14);

    const password = Buffer.from(
      process.env.MPESA_SHORTCODE +
        process.env.MPESA_PASSKEY +
        timestamp
    ).toString("base64");

    const stk = await axios.post(
      "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phone,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: phone,
        CallBackURL: process.env.CALLBACK_URL,
        AccountReference: "TABULARHOST",
        TransactionDesc: "Payment"
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    await db.query(
      "INSERT INTO mpesa_payments (checkout_id, phone, amount) VALUES (?,?,?)",
      [stk.data.CheckoutRequestID, phone, amount]
    );

    res.json({ success: true, checkout_id: stk.data.CheckoutRequestID });
  } catch (err) {
    res.json({ success: false, message: err.response?.data || err.message });
  }
}
