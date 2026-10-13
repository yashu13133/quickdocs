// 1) {order_id, payment_id, signature}  -> verifies with Razorpay's secret, returns a 15-minute token
// 2) {token}                             -> checks a token is genuine and not expired
const crypto = require('crypto');
const TOKEN_MINUTES = 15;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return json(500, { ok: false, error: 'Payment is not configured on the server.' });

  let b;
  try { b = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { ok: false, error: 'Bad request.' }); }

  // --- check an existing token
  if (b.token) {
    const [payload, sig] = String(b.token).split('.');
    if (!payload || !sig) return json(200, { ok: false });
    const good = sign(payload, secret);
    if (!safeEqual(sig, good)) return json(200, { ok: false });
    try {
      const p = JSON.parse(Buffer.from(payload, 'base64url').toString());
      return json(200, { ok: p.e > Date.now() });
    } catch (e) { return json(200, { ok: false }); }
  }

  // --- verify a payment
  const { order_id, payment_id, signature } = b;
  if (!order_id || !payment_id || !signature) return json(400, { ok: false, error: 'Missing payment details.' });
  const expected = crypto.createHmac('sha256', secret).update(order_id + '|' + payment_id).digest('hex');
  if (!safeEqual(signature, expected)) return json(400, { ok: false, error: 'Payment verification failed.' });

  const payload = Buffer.from(JSON.stringify({ p: payment_id, e: Date.now() + TOKEN_MINUTES * 60 * 1000 })).toString('base64url');
  return json(200, { ok: true, token: payload + '.' + sign(payload, secret), minutes: TOKEN_MINUTES });
};

function sign(payload, secret) {
  return crypto.createHmac('sha256', secret).update('token:' + payload).digest('hex');
}
function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
function json(statusCode, obj) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) };
}
