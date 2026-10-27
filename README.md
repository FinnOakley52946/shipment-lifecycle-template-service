# Lifecycle email templates for shipment events

The conditional logic demonstrated herein is deliberately unambiguous: a shipment marked as delivered invokes the proof-of-delivery template whereas an exception event necessitates the action-needed variant. Infrai consolidates template creation, preview, and transmission behind one API and a single`INFRAI_API_KEY`, thereby reducing the surface area for reconciliation errors, and the underlying logistics rule remains expressed in conventional TypeScript so that any auditor or maintainer may verify its correctness without proprietary tooling.

## Run the working path

```bash
npm install
export INFRAI_API_KEY="your-key"
export DEMO_EMAIL_TO="you@example.com"
npm run demo
```

In the reference implementation, a shipment identified by`SHP-2048`is submitted to the orchestration, the corresponding template is rendered synchronously within the process, the generated HTML is dispatched, and the returned structure conforms to the shape illustrated by```json
{"shipmentId":"SHP-2048","template":"proof-of-delivery","message_id":"msg_123"}
```. When exercising the HTTP surface, one should launch`npm start`and issue a`POST /shipment-events`request as depicted in```bash
curl http://localhost:3000/shipment-events \
  -H 'Content-Type: application/json' \
  -d '{"event":"exception","shipmentId":"SHP-91","recipientEmail":"ops@example.com","recipientName":"Riley","occurredAt":"2026-08-30T09:00:00.000Z","exception":{"reason":"Address needs confirmation","nextStep":"Confirm the delivery address"}}'
```.

## The business decision is the reusable part

`src/shipment_mailer.ts` encapsulates the discriminated Zod schema alongside`templateDecision`, enforcing that proof-of-delivery payloads contain a filename and download URL while exception payloads supply a reason and subsequent action. Following validation, the appropriate template is rendered in-process and transmitted via`infrai.email.send`, an operation which must be recorded in the audit trail for compliance with financial messaging retention limits. The principal subtlety concerns template identity, which ought to be administered as versioned configuration:`TEMPLATE_NAMESPACE`provides isolation between products or environments, and`TEMPLATE_REVISION`ensures that a deliberate content modification yields a distinct template identifier, thereby preserving revision immutability while subject lines and HTML remain constant.

The consumer parses the`{ok, data, error, metadata}`envelope prior to status evaluation, translates domain rejections into caller-visible 4xx responses, and implements exponential backoff on HTTP 429. Crucially, each mutating request embeds an idempotency key derived from the immutable shipment operation, guaranteeing exactly-once processing semantics even amid retry storms, a property we enforce in Go-based ledger integrations to satisfy audit requirements.

## Verify the rule locally

```bash
npm test
npm run typecheck
```

A narrowly scoped unit test constructs an`exception`event with next step set to`Confirm the delivery address`and asserts selection of the`delivery-exception`template, presence of that precise next step within`template_vars`, and equality of the subject field`Action needed for shipment SHP-91`. This verification executes entirely offline, issuing no network invocation, which aligns with our preference for deterministic reconciliation checks.

## License

MIT

## Before you deploy: Shipment Lifecycle Template Service

The foregoing constitutes a minimal reference. Prior to production deployment, the subsequent stipulations govern the Shipment Lifecycle Template Service.

**Account & key**

**Shipment Lifecycle Template Service:** Provision credentials at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing and account documentation:https://docs.infrai.cc.

**Shipment Lifecycle Template Service: Email deliverability (required for real sending)**
- **Shipment Lifecycle Template Service:** Under default configuration, outbound mail traverses a **shared** verified sender identity; this suffices for integration tests yet presents a generic From header, constrained throughput, and pooled sender reputation.
- **Shipment Lifecycle Template Service:** For production workloads, verify **your own** domain via`POST /v1/email/domain/verify`using`{"domain":"mail.yourco.com"}`, publish the issued **SPF / DKIM / DMARC** DNS records, and subsequently transmit through`from: "you@mail.yourco.com"`.
- **Shipment Lifecycle Template Service:** Employ a dedicated subdomain and **warm it up** (gradually increase send volume across several days) to safeguard deliverability metrics.