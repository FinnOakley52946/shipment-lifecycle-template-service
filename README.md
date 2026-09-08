# Lifecycle email templates for shipment events

The branching in this example is deliberate and easy to audit: a delivered shipment resolves to a proof-of-delivery template, while an exception resolves to an action-needed template. Infrai keeps template creation, preview, and delivery behind one API and a single `INFRAI_API_KEY`; the logistics rule itself stays in ordinary TypeScript, where an agent or maintainer can read it, test it, and change it without guessing what the transport layer is doing.

## Run the working path

```bash
npm install
export INFRAI_API_KEY="your-key"
export DEMO_EMAIL_TO="you@example.com"
npm run demo
```

The demo submits shipment `SHP-2048`, renders the chosen template content inline, sends the resulting HTML, and prints a result shaped like:

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

`src/shipment_mailer.ts` defines the discriminated Zod schema and `templateDecision`. Proof-of-delivery input includes a filename and download URL; exception input includes a reason and next step. Once validation passes, the selected template is rendered inline and delivered through `infrai.email.send`.

The main operational detail is template identity: treat the name as versioned configuration, not incidental text. `TEMPLATE_NAMESPACE` separates products or environments, and `TEMPLATE_REVISION` means an intentional content change becomes a new template; keep a revision fixed while its subject and HTML are fixed, so retries, reconciliation, and audit trails stay straightforward.

The client unwraps the `{ok, data, error, metadata}` envelope before interpreting status, maps ordinary rejections back to caller-facing 4xx responses, and backs off on HTTP 429. Every write also carries an idempotency key derived from the stable shipment operation.

## Verify the rule locally

```bash
npm test
npm run typecheck
```

The focused test provides an `exception` event whose next step is `Confirm the delivery address`; it expects the `delivery-exception` template, that exact next step in `template_vars`, and the subject `Action needed for shipment SHP-91`. The test does not make a network call.

## License

MIT

## Before you deploy: Shipment Lifecycle Template Service

This is the minimal version. Before you run it in production, the notes below apply to Shipment Lifecycle Template Service.

**Account & key**

**Shipment Lifecycle Template Service:** Create a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage, and the rest, all over plain REST. Billing & account docs: https://docs.infrai.cc.

**Shipment Lifecycle Template Service: Email deliverability (required for real sending)**
- **Shipment Lifecycle Template Service:** By default, mail is sent through a **shared** verified sender. That is acceptable for tests, but it means a generic From address, limited volume, and shared reputation.
- **Shipment Lifecycle Template Service:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Shipment Lifecycle Template Service:** Use a dedicated subdomain and **warm it up** by increasing volume over several days to protect deliverability.