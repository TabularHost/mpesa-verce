import fetch from "node-fetch";

const transactions = {}; // Temporary in-memory store

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { phone, amount } = req.body;

  if (!phone || !amount) {
    return res.status(400).json({ success: false, error: "Missing phone or amount" });
  }

  try {
    // 1️⃣ Generate OAuth token directly
    const auth = Buffer.from(`${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`).toString("base64");
    const tokenRes = await fetch(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      { headers: { Authorization: "Basic " + auth } }
    );
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      throw new Error("Failed to get OAuth token: " + JSON.stringify(tokenData));
    }

    const token = tokenData.access_token;

    // 2️⃣ Generate STK Push password and timestamp
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
    const password = Buffer.from(process.env.SHORTCODE + process.env.PASSKEY + timestamp).toString("base64");

    // 3️⃣ Build payload
    const payload = {
      BusinessShortCode: process.env.SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phone,
      PartyB: process.env.SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: process.env.CALLBACK_URL,
      AccountReference: "TestPayment",
      TransactionDesc: "Payment"
    };

    // 4️⃣ Send STK Push
    const stkRes = await fetch("https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const stkData = await stkRes.json();

    if (stkData.ResponseCode !== "0") {
      return res.json({ success: false, error: stkData });
    }

    // 5️⃣ Save transaction for polling
    const checkout_id = Date.now().toString();
    transactions[checkout_id] = { status: "PENDING", mpesaCheckoutId: stkData.CheckoutRequestID };

    res.json({ success: true, checkout_id });

  } catch (err) {
    console.error("PAY ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}

export { transactions };
