import { sendLifecycleMail, shipmentEventSchema } from "./shipment_mailer.js";

const recipientEmail = process.env.DEMO_EMAIL_TO;
if (!recipientEmail) throw new Error("DEMO_EMAIL_TO is required");

const event = shipmentEventSchema.parse({
  event: "delivered",
  shipmentId: "SHP-2048",
  recipientEmail,
  recipientName: "Morgan",
  occurredAt: "2026-08-30T10:30:00.000Z",
  proofOfDelivery: {
    filename: "SHP-2048-signed.pdf",
    downloadUrl: "https://logistics.example/proofs/SHP-2048-signed.pdf",
  },
});

console.log(await sendLifecycleMail(event));
