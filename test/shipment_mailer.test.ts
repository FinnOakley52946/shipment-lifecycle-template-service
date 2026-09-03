import assert from "node:assert/strict";
import test from "node:test";
import { shipmentEventSchema, templateDecision } from "../src/shipment_mailer.js";

test("an exception selects the action template and exposes its next step", () => {
  const event = shipmentEventSchema.parse({
    event: "exception",
    shipmentId: "SHP-91",
    recipientEmail: "ops@example.com",
    recipientName: "Riley",
    occurredAt: "2026-08-30T09:00:00.000Z",
    exception: { reason: "Address needs confirmation", nextStep: "Confirm the delivery address" },
  });

  const decision = templateDecision(event);
  assert.equal(decision.kind, "delivery-exception");
  assert.equal(decision.template_vars.next_step, "Confirm the delivery address");
  assert.equal(decision.subject, "Action needed for shipment SHP-91");
});
