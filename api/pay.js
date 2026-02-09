const transactions = {};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { phone, amount } = req.body;

  if (!phone || !amount) {
    return res.status(400).json({ success: false, error: "Missing phone or amount" });
  }

  // --- Log incoming request and environment check ---
  console.log("Received request:", { phone, amount });
  console.log("Environment vars check:", {
    key: !!process.env.CONSUMER_KEY,
    secret: !!process.env.CONSUMER_SECRET,
    shortcode: !!process.env.SHORTCODE,
    passkey: !!process.env.PASSKEY,
    callback: !!process.env.CALLBACK_URL
  });

  try {
    // --- 1️⃣ Generate OAuth token for production ---
    const auth = Buffer.from(`${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`).toString("base64");

    const tokenRes = await fetch(
      "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      { headers: { Authorization: "Basic " + auth } }
    );

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("Failed to get token:", tokenData);
      return res.status(500).json({ success: false, error: "Failed to get OAuth token", details: tokenData });
    }

    const token = tokenData.access_token;

    // --- 2️⃣ Prepare STK Push payload ---
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
    const password = Buffer.from(process.env.SHORTCODE + process.env.PASSKEY + timestamp).toString("base64");

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
      AccountReference: "Payment",
      TransactionDesc: "Payment"
    };

    console.log("STK Push payload:", payload);

    // --- 3️⃣ Send STK Push request to production URL ---
    const stkRes = await fetch(
      "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    const stkData = await stkRes.json();
    console.log("STK Push response:", stkData);

    if (stkData.ResponseCode !== "0") {
      return res.json({ success: false, error: stkData });
    }

    // --- 4️⃣ Save transaction for polling ---
    const checkout_id = Date.now().toString();
    transactions[checkout_id] = { status: "PENDING", mpesaCheckoutId: stkData.CheckoutRequestID };

    res.json({ success: true, checkout_id });

  } catch (err) {
    console.error("PAY ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}

export { transactions };
