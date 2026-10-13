// Creates a Razorpay order. The price is fixed HERE on the server (₹15 = 1500 paise),
// so users cannot change the amount from the browser.
const AMOUNT_PAISE = 1500;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  const keyId = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !secret) return json(500, { error: 'Payment is not configured on the server.' });

  try {
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + Buffer.from(keyId + ':' + secret).toString('base64')
      },
      body: JSON.stringify({ amount: AMOUNT_PAISE, currency: 'INR', receipt: 'bio_' + Date.now() })
    });
    const order = await res.json();
    if (!res.ok) return json(502, { error: (order.error && order.error.description) || 'Could not create order.' });
    return json(200, { order_id: order.id, amount: order.amount, currency: order.currency, key_id: keyId });
  } catch (e) {
    return json(500, { error: 'Could not reach the payment service.' });
  }
};

function json(statusCode, obj) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) };
}
