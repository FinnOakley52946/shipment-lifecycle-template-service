import { createServer } from "node:http";
import { InfraiError } from "./infrai_email.js";
import { sendLifecycleMail, shipmentEventSchema } from "./shipment_mailer.js";

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/shipment-events") {
    response.writeHead(404).end();
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const input = shipmentEventSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const result = await sendLifecycleMail(input);
    response.writeHead(202, { "Content-Type": "application/json" }).end(JSON.stringify(result));
  } catch (error) {
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      response.writeHead(status, { "Content-Type": "application/json" }).end(
        JSON.stringify({ error: { code: error.code, message: error.message } }),
      );
      return;
    }
    response.writeHead(400, { "Content-Type": "application/json" }).end(
      JSON.stringify({ error: { code: "INVALID_REQUEST", message: "Request body is invalid" } }),
    );
  }
});

server.listen(Number(process.env.PORT ?? 3000), () => {
  console.log("Shipment lifecycle service listening on http://localhost:3000");
});
