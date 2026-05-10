/**
 * Shopify webhook receiver. Verifies HMAC, normalizes the event,
 * and queues it for QBO posting via the worker.
 */
const express = require('express');
const crypto = require('crypto');
const { enqueue } = require('./queue');

const app = express();

// Capture raw body for HMAC verification
app.use('/webhook/shopify', express.raw({ type: 'application/json' }));

function verifyShopifyHmac(req) {
  const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!hmacHeader || !secret) return false;
  const digest = crypto
    .createHmac('sha256', secret)
    .update(req.body)
    .digest('base64');
  return crypto.timingSafeEqual(
    Buffer.from(hmacHeader, 'utf8'),
    Buffer.from(digest, 'utf8'),
  );
}

app.post('/webhook/shopify', async (req, res) => {
  if (!verifyShopifyHmac(req)) {
    return res.status(401).send('invalid hmac');
  }
  const topic = req.get('X-Shopify-Topic');
  const shop = req.get('X-Shopify-Shop-Domain');
  let payload;
  try {
    payload = JSON.parse(req.body.toString('utf8'));
  } catch (e) {
    return res.status(400).send('invalid json');
  }
  const idempotencyKey = `${topic}:${payload.id}`;
  await enqueue({ topic, shop, payload, idempotencyKey });
  res.status(200).send('ok');
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`shopify-qbo-sync listening on :${port}`));
