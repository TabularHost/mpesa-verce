import { readTransactions, writeTransactions } from "./store";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const { phone, amount } = req.body || {};
    if (!phone || !amount) {
      return res.status(400).json({ success: false, error: "Missing phone or amount" });
    }

    // --- Read environment variables ---
    const CONSUMER_KEY = process.env.CONSUMER_KEY;
    const CONSUMER_SECRET = process.env.CONSUMER_SECRET;
    const SHORTCODE = process.env.SHORTCODE;
    const PASSKEY = process.env.PASSKEY;
    const CALLBACK_URL = process.env.CALLBACK_URL;

    const missingVars = [CONSUMER_KEY, CONSUMER_SECRET, SHORTCODE, PASSKEY, CALLBACK_URL]
      .map((v,i)=>v ? null : ["CONSUMER_KEY","CONSUMER_SECRET","SHORTCODE","PASSKEY","CALLBACK_URL"][i])
      .filter(Boolean);

    if (missingVars.length) {
      console.error("Missing env vars:", missingVars);
      return res.status(500).json({ success: false, error: "Missing environment variables: " + missingVars.join(", ") });
    }

    console.log("Starting STK Push for:", phone, amount);

    // --- Get OAuth token ---
    const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
    const tokenRes = await fetch("https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
      headers: { Authorization: "Basic " + auth }
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("Failed to get token:", tokenData);
      return res.status(500).json({ success: false, error: "Failed to get OAuth token", details: tokenData });
    }

    const token = tokenData.access_token;

    // --- Prepare STK push payload ---
    const timestamp = new Date().toISOString().replace(/[-:T.]/g,"").slice(0,14);
    const password = Buffer.from(SHORTCODE + PASSKEY + timestamp).toString("base64");

    const payload = {
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

    console.log("STK Push payload:", payload);

    // --- Send STK push ---
    const stkRes = await fetch("https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest", {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    let stkData;
    try {
      stkData = await stkRes.json();
    } catch(e) {
      const text = await stkRes.text();
      console.error("Invalid JSON from STK push:", text);
      return res.status(500).json({ success: false, error: "Invalid JSON from M-Pesa", raw: text });
    }

    console.log("STK push response:", stkData);

    if (stkData.ResponseCode !== "0") {
      return res.json({ success: false, error: stkData });
    }

    // --- Save transaction to JSON store ---
    const checkout_id = Date.now().toString();
    const transactions = readTransactions();
    transactions[checkout_id] = { status: "PENDING", mpesaCheckoutId: stkData.CheckoutRequestID };
    writeTransactions(transactions);

    res.json({ success: true, checkout_id });

  } catch (err) {
    console.error("PAY ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}
