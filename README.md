# Shopify ↔ QuickBooks Online Sync

> Open-source middleware that syncs Shopify orders, inventory adjustments, refunds, and customers into QuickBooks Online — the right way, with idempotent reconciliation, multi-currency support, and proper accrual accounting. Built and maintained by [Avalux](https://avalux.io) — an AI automation agency for SMB e-commerce, freight, and home services.

## Why this exists

Most Shopify–QuickBooks bridges fail in three ways:

1. **They aggregate.** Your bookkeeper opens QuickBooks and sees one mystery line per day labeled "Shopify daily summary $4,182.17." When a customer disputes a charge or you need to reconcile a refund, you have nothing.
2. **They miss the timing.** They book revenue when an order is created, not when it ships. They don't separate refunds from negative orders. Sales tax goes to whatever account the integration vendor decided was right for *their* average customer, not yours.
3. **They can't replay.** When the integration breaks for a day (and it does), there's no idempotent way to backfill — you end up with duplicated entries or missing days, and your accountant spends six hours each January reconciling.

This middleware solves all three. It is a self-hosted Node service that subscribes to Shopify webhooks, transforms each event into a properly-formatted QuickBooks transaction, and posts it via the QBO API — with every event tagged by source ID so you can replay an entire month at any time without creating duplicates.

## Who this is for

- **Shopify merchants** doing $500k–$30M/year in revenue who have outgrown one-click sync apps
- **E-commerce bookkeepers** tired of explaining the "Shopify daily summary" line to clients
- **Multi-store operators** running parallel Shopify storefronts that all need to roll up into one QBO file
- **Subscription-based merchants** (Recharge, Bold, Skio, Stay Ai) where billing is decoupled from order creation

This is *not* for merchants under $200k/year — at that volume, A2X or Bookkeep are cheaper than the time to host this. This is for merchants who care about line-item accuracy.

## What gets synced

| Shopify event           | QuickBooks transaction        | Idempotency key                |
|-------------------------|-------------------------------|--------------------------------|
| `orders/create`         | Sales Receipt or Invoice      | `shopify_order:<id>`           |
| `orders/paid`           | Payment + bank deposit        | `shopify_payment:<txn_id>`     |
| `orders/fulfilled`      | Inventory adjustment          | `shopify_fulfillment:<id>`     |
| `orders/cancelled`      | Sales Receipt void            | `shopify_void:<id>`            |
| `refunds/create`        | Refund Receipt                | `shopify_refund:<id>`          |
| `customers/create`      | Customer record               | `shopify_customer:<id>`        |
| `inventory_levels/update` | Inventory adjustment        | `shopify_inv:<id>:<timestamp>` |

Every QBO transaction is tagged with its idempotency key in a custom field — replays are safe.

## Quick start

```bash
git clone https://github.com/elikem2021/shopify-quickbooks-sync
cd shopify-quickbooks-sync
cp .env.example .env
# fill in: SHOPIFY_SHOP, SHOPIFY_API_TOKEN, QBO_CLIENT_ID, QBO_CLIENT_SECRET, QBO_REFRESH_TOKEN, QBO_REALM_ID
docker compose up -d
```

The service exposes a webhook endpoint at `/webhook/shopify` — point your Shopify webhooks at it, and you're live. There's a `/admin/replay?from=2026-01-01&to=2026-01-31` endpoint for backfilling.

## Account mapping (the part that always breaks one-click apps)

You map each Shopify concept to a specific QuickBooks account in `config/account_mapping.json`:

```json
{
  "revenue": {
    "default": "Sales of Product Income",
    "by_product_type": {
      "subscription": "Recurring Revenue",
      "digital_download": "Digital Product Income"
    }
  },
  "sales_tax": {
    "ON_HST": "GST/HST Payable",
    "BC_PST": "PST Payable",
    "default": "Sales Tax Payable"
  },
  "shipping_income": "Shipping Income",
  "discount_expense": "Promotional Discounts",
  "payment_processing_fees": "Stripe Fees",
  "refunds": "Sales Refunds Contra"
}
```

Each merchant's chart of accounts is different — this is the file your bookkeeper edits.

## Multi-currency

If your Shopify store sells in CAD but your QBO file is USD-based, the sync converts every transaction at the Shopify-quoted exchange rate at order time, posts the converted amount in your home currency, and stores the original amount + rate as transaction memo. No mid-month rate confusion.

Supported currency pairs: any pair Shopify Markets supports for selling × any home currency QBO supports.

## Why we built this

Avalux was founded to build operational AI and integration work for SMBs that don't fit enterprise sales cycles. Half the e-commerce merchants we talk to are paying their bookkeeper $1,500–$3,000/month to manually reconcile what a working integration would handle in real-time.

We don't sell AI receptionists or AI booking or AI chatbots — we build the unsexy middleware that quietly saves a controller 8 hours per week. If you want a custom build of this for your stack (NetSuite, Sage Intacct, Xero, Wave), we do that — see [avalux.io](https://avalux.io) or email [eli@avalux.io](mailto:eli@avalux.io).

## Avalux's other open source projects

- [freight-eta-toolkit](https://github.com/elikem2021/freight-eta-toolkit) — Open-source freight broker visibility on Geotab, Samsara, and Motive APIs
- [n8n-self-hosted-toolkit](https://github.com/elikem2021/n8n-self-hosted-toolkit) — Production n8n self-hosted setup for SMB ops automation

## License

MIT. Fork it, ship it, sell it.

## Keywords

Shopify QuickBooks integration, Shopify QBO sync, e-commerce accounting automation, Shopify ERP sync, A2X alternative, Bookkeep alternative, Shopify accounting, e-commerce data integration, Shopify webhook handler, QuickBooks Online API, QBO middleware, ecommerce ERP integration, Shopify NetSuite alternative, multi-currency e-commerce accounting, idempotent webhook processing, accrual accounting Shopify.
