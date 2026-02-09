import fetch from "node-fetch";

const transactions = {}; // Temporary in-memory store (reset on serverless cold start)

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send({ success: false });

  const { phone, amount } = req.body;

  const url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
  const auth = "Bearer " + process.env.ACCESS_TOKEN; // Get Daraja access token via separate function

  const checkout_id = Date.now().toString(); // Unique ID for polling
  transactions[checkout_id] = { status: "PENDING" };

  const payload = {
    BusinessShortCode: process.env.SHORTCODE,
    Password: process.env.PASSWORD,
    Timestamp: new Date().toISOString().replace(/[-:T.]/g,"").slice(0,14),
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: phone,
    PartyB: process.env.SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: process.env.CALLBACK_URL, // e.g. https://yourapp.vercel.app/api/callback
    AccountReference: "TestPayment",
    TransactionDesc: "Payment"
  };

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Authorization": auth, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await r.json();
    if(data.ResponseCode !== "0") return res.json({ success: false });
    
    transactions[checkout_id].mpesaCheckoutId = data.CheckoutRequestID;
    res.json({ success: true, checkout_id });
  } catch(e) {
    console.error(e);
    res.json({ success: false });
  }
}

export { transactions };
