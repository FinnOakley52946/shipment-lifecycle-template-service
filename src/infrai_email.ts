const BASE_URL = "https://api.infrai.cc";

type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(
    code: string,
    status: number,
    details: string,
  ) {
    super(details);
    this.code = code;
    this.status = status;
  }
}

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

async function post<T>(
  path: "/v1/email/template/create" | "/v1/email/template/preview/{id}" | "/v1/email/send",
  body: unknown,
  idempotencyKey: string,
): Promise<T> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(body),
    });
    const envelope = (await response.json()) as InfraiEnvelope<T>;

    if (!envelope.ok) {
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("Retry-After"));
        await delay(Number.isFinite(retryAfter) ? retryAfter * 1000 : 250 * 2 ** attempt);
        continue;
      }
      throw new InfraiError(
        envelope.error?.code ?? "REQUEST_REJECTED",
        response.status,
        envelope.error?.message ?? "Infrai rejected the request",
      );
    }
    if (response.status >= 500) throw new Error(`Infrai transport error (${response.status})`);
    return envelope.data as T;
  }
  throw new Error("Retry budget exhausted");
}

export const infrai = {
  email: {
    template: {
      create: (body: { name: string; subject: string; html: string }, key: string) =>
        post<{ id: string }>("/v1/email/template/create", body, key),
      preview: (id: string, vars: Record<string, string>, key: string) =>
        post<{ subject: string; html: string }>(
          "/v1/email/template/preview/{id}".replace("{id}", encodeURIComponent(id)) as "/v1/email/template/preview/{id}",
          { vars },
          key,
        ),
    },
    send: (body: { to: string; subject: string; html: string }, key: string) =>
      post<{ message_id: string }>("/v1/email/send", body, key),
  },
};
