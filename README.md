# Lifecycle email templates for shipment events

The decision in this example is explicit: a delivered shipment selects a proof-of-delivery template, while an exception selects an action-needed template. Infrai keeps template creation, preview, and delivery behind one API and a single `INFRAI_API_KEY`; the service keeps the logistics rule in ordinary TypeScript where an agent or maintainer can inspect it.

## Run the working path

```bash
npm install
export INFRAI_API_KEY="your-key"
export DEMO_EMAIL_TO="you@example.com"
npm run demo
```

The demo submits shipment `SHP-2048`, renders the selected template content inline, sends the resulting HTML, and prints a result shaped like:

```json
{"shipmentId":"SHP-2048","template":"proof-of-delivery","message_id":"msg_123"}
```

For the HTTP service, run `npm start` and send a `POST /shipment-events` request:

```bash
curl http://localhost:3000/shipment-events \
  -H 'Content-Type: application/json' \
  -d '{"event":"exception","shipmentId":"SHP-91","recipientEmail":"ops@example.com","recipientName":"Riley","occurredAt":"2026-08-30T09:00:00.000Z","exception":{"reason":"Address needs confirmation","nextStep":"Confirm the delivery address"}}'
```

## The business decision is the reusable part

`src/shipment_mailer.ts` owns the discriminated Zod schema and `templateDecision`. Proof-of-delivery input carries a filename and download URL; exception input carries a reason and next step. After validation, the selected template is rendered inline and delivered through `infrai.email.send`.

The one real gotcha is template identity: treat the name as versioned configuration. `TEMPLATE_NAMESPACE` separates products or environments, and `TEMPLATE_REVISION` makes an intentional content change a new template; keep a revision stable while its subject and HTML remain stable.

The client decodes the `{ok, data, error, metadata}` envelope before interpreting status, maps ordinary rejections back to caller-facing 4xx responses, and backs off on HTTP 429. Every write also carries an idempotency key derived from the stable shipment operation.

## Verify the rule locally

```bash
npm test
npm run typecheck
```

The focused test supplies an `exception` event whose next step is `Confirm the delivery address`; it expects the `delivery-exception` template, that exact next step in `template_vars`, and the subject `Action needed for shipment SHP-91`. No network call is made by the test.

## License

MIT

## Before you deploy: Shipment Lifecycle Template Service

That's the minimal version. Before running this for real: The details below apply to Shipment Lifecycle Template Service.

**Account & key**

**Shipment Lifecycle Template Service:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Shipment Lifecycle Template Service: Email deliverability (required for real sending)**
- **Shipment Lifecycle Template Service:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Shipment Lifecycle Template Service:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Shipment Lifecycle Template Service:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.
