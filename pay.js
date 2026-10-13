/* Shared payment flow for biodata.html and resume.html (₹15, Razorpay).
   Needs an element with id="msg" on the page. isPaid() resolves true only after a verified payment. */
const FN = '/.netlify/functions/';
async function post(fn, body) {
  const r = await fetch(FN + fn, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok && !j.error) j.error = 'Server error (' + r.status + ').';
  return j;
}
async function hasValidToken() {
  let t = null;
  try { t = sessionStorage.getItem('pay-token'); } catch(e){}
  if (!t) return false;
  const j = await post('verify-payment', { token: t });
  return j.ok === true;
}
async function isPaid() {
  if (await hasValidToken()) return true;               // already paid in the last 15 min
  if (!window.Razorpay) throw new Error('Payment window failed to load. Check your internet and retry.');
  document.getElementById('msg').textContent = 'Opening payment…';
  const o = await post('create-order', {});
  if (!o.order_id) throw new Error(o.error || 'Could not start payment.');
  return new Promise((resolve, reject) => {
    const rz = new Razorpay({
      key: o.key_id, amount: o.amount, currency: o.currency, order_id: o.order_id,
      name: 'BioMaker', description: 'Biodata PDF download',
      theme: { color: '#8c2f39' },
      modal: { ondismiss: () => resolve(false) },
      handler: async (resp) => {
        const v = await post('verify-payment', {
          order_id: resp.razorpay_order_id, payment_id: resp.razorpay_payment_id, signature: resp.razorpay_signature });
        if (!v.ok) return reject(new Error(v.error || 'Payment could not be verified. If money was deducted, contact support with payment ID ' + resp.razorpay_payment_id));
        try { sessionStorage.setItem('pay-token', v.token); } catch(e){}
        resolve(true);
      }
    });
    rz.on('payment.failed', r => reject(new Error((r.error && r.error.description) || 'Payment failed.')));
    rz.open();
  });
}

