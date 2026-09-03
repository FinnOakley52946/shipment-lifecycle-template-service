import { z } from "zod";
import { infrai } from "./infrai_email.js";

export const shipmentEventSchema = z.discriminatedUnion("event", [
  z.object({
    event: z.literal("delivered"),
    shipmentId: z.string().min(1),
    recipientEmail: z.string().email(),
    recipientName: z.string().min(1),
    occurredAt: z.string().datetime(),
    proofOfDelivery: z.object({ filename: z.string().min(1), downloadUrl: z.string().url() }),
  }),
  z.object({
    event: z.literal("exception"),
    shipmentId: z.string().min(1),
    recipientEmail: z.string().email(),
    recipientName: z.string().min(1),
    occurredAt: z.string().datetime(),
    exception: z.object({ reason: z.string().min(1), nextStep: z.string().min(1) }),
  }),
]);

export type ShipmentEvent = z.infer<typeof shipmentEventSchema>;

export function templateDecision(input: ShipmentEvent) {
  if (input.event === "delivered") {
    return {
      kind: "proof-of-delivery" as const,
      subject: `Shipment ${input.shipmentId} was delivered`,
      html: "<p>Hello {{recipient_name}}, shipment {{shipment_id}} was delivered at {{occurred_at}}.</p><p><a href=\"{{proof_url}}\">Open {{proof_filename}}</a></p>",
      template_vars: {
        recipient_name: input.recipientName,
        shipment_id: input.shipmentId,
        occurred_at: input.occurredAt,
        proof_filename: input.proofOfDelivery.filename,
        proof_url: input.proofOfDelivery.downloadUrl,
      },
    };
  }
  return {
    kind: "delivery-exception" as const,
    subject: `Action needed for shipment ${input.shipmentId}`,
    html: "<p>Hello {{recipient_name}}, shipment {{shipment_id}} needs attention: {{reason}}.</p><p>Next step: {{next_step}}</p>",
    template_vars: {
      recipient_name: input.recipientName,
      shipment_id: input.shipmentId,
      reason: input.exception.reason,
      next_step: input.exception.nextStep,
    },
  };
}

export async function sendLifecycleMail(input: ShipmentEvent) {
  const decision = templateDecision(input);
  const operation = `${input.shipmentId}:${input.event}:${input.occurredAt}`;
  const sent = await infrai.email.send(
    { to: input.recipientEmail, subject: decision.subject, html: decision.html },
    `${operation}:send`,
  );
  return { shipmentId: input.shipmentId, template: decision.kind, message_id: sent.message_id };
}
