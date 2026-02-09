import fetch from "node-fetch";

const CONSUMER_KEY = process.env.CONSUMER_KEY;
const CONSUMER_SECRET = process.env.CONSUMER_SECRET;
const SHORTCODE = process.env.SHORTCODE;
const PASSKEY = process.env.PASSKEY;
const CALLBACK_URL = process.env.CALLBACK_URL;

// Temporary in-memory storage (sandbox only)
let payments = {};

let accessToken = "";

async function getAccessToken() {
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
  const res = await fetch("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
    headers: { Authorization: `Basic ${auth}` }
  });
  const data = await res.json();
  accessToken = data.access_token;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { phone, amount } = req.body;

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
    AccountReference: "TestPayment",
    TransactionDesc: "Payment"
  };

  try {
    const stkRes = await fetch("https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    const data = await stkRes.json();

    if (data.ResponseCode !== "0") {
      return res.json({ success: false, error: data.ResponseDescription });
    }

    payments[data.CheckoutRequestID] = { status: "PENDING" };
    res.json({ success: true, checkout_id: data.CheckoutRequestID });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
}
