const stkRes = await fetch("https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest", {
  method: "POST",
  headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
  body: JSON.stringify(body)
});

let data;
try {
  data = await stkRes.json();
} catch (err) {
  const text = await stkRes.text(); // get raw response
  console.error("Non-JSON response from M-Pesa:", text);
  return res.status(500).json({ success: false, error: "Non-JSON response from M-Pesa. Check logs." });
}
