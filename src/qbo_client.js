/**
 * Minimal QuickBooks Online API client.
 * Handles OAuth refresh-token rotation and the few endpoints the sync needs:
 * SalesReceipt, Invoice, Refund, Customer, Item.
 */
const fetch = require('node-fetch');

const QBO_BASE = process.env.QBO_BASE || 'https://quickbooks.api.intuit.com';

class QboClient {
  constructor() {
    this.clientId = process.env.QBO_CLIENT_ID;
    this.clientSecret = process.env.QBO_CLIENT_SECRET;
    this.refreshToken = process.env.QBO_REFRESH_TOKEN;
    this.realmId = process.env.QBO_REALM_ID;
    this.accessToken = null;
    this.accessTokenExpiry = 0;
  }

  async refresh() {
    const r = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=refresh_token&refresh_token=${this.refreshToken}`,
    });
    if (!r.ok) throw new Error(`qbo refresh failed: ${r.status}`);
    const data = await r.json();
    this.accessToken = data.access_token;
    this.accessTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    if (data.refresh_token) this.refreshToken = data.refresh_token;
  }

  async ensureToken() {
    if (!this.accessToken || Date.now() >= this.accessTokenExpiry) {
      await this.refresh();
    }
  }

  async post(entity, body) {
    await this.ensureToken();
    const url = `${QBO_BASE}/v3/company/${this.realmId}/${entity}?minorversion=70`;
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const txt = await r.text();
      throw new Error(`qbo POST ${entity} failed: ${r.status} ${txt.slice(0, 300)}`);
    }
    return r.json();
  }

  createSalesReceipt(srBody) { return this.post('salesreceipt', srBody); }
  createInvoice(invBody)     { return this.post('invoice', invBody); }
  createRefund(refundBody)   { return this.post('refundreceipt', refundBody); }
  createCustomer(custBody)   { return this.post('customer', custBody); }
}

module.exports = { QboClient };
