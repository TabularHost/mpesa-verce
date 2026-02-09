// /api/pay.js
import fetch from "node-fetch";

const CONSUMER_KEY = process.env.CONSUMER_KEY;
const CONSUMER_SECRET = process.env.CONSUMER_SECRET;
const SHORTCODE = process.env.SHORTCODE;
const PASSKEY = process.env.PASSKEY;
const CALLBACK_URL = process.env.CALLBACK_URL;

// global object for temporary storage (sandbox/testing only)
global.payments = global.payments || {};
let payments = global.payments;

let accessToken = "";

async function getAccessToken() {
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
  const res = await fetch(
    "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    { headers: { Authorization: `Basic ${auth}` } }
  );
  const data = await res.json();
  accessToken = data.access_token;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  const { phone, amount } = req.body;
  if (!phone || !amount) return res.status(400).json({ success: false, error: "Phone and amount are required" });

  try {
    if (!accessToken) await getAccessToken();

    const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
    const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString("base64");

    const body = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phone,
      PartyB: SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: CALLBACK_URL,
      AccountReference: "Payment",
      TransactionDesc: "Payment"
    };

    const stkRes = await fetch("https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await stkRes.json();

    if (data.ResponseCode !== "0") {
      return res.status(200).json({ success: false, error: data.ResponseDescription || "STK push failed" });
    }

    payments[data.CheckoutRequestID] = { status: "PENDING" };
    return res.status(200).json({ success: true, checkout_id: data.CheckoutRequestID });

  } catch (err) {
    console.error("Pay API error:", err);
    return res.status(500).json({ success: false, error: "Server error: " + err.message });
  }
}
