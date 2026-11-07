// Emails you every new help-center or labs message.
// Triggered by a Supabase Database Webhook on INSERT into public.messages.
// Required secrets (supabase secrets set ...):
//   RESEND_API_KEY   from https://resend.com (free tier is fine)
//   FROM_EMAIL       a sender on a domain you verified in Resend, e.g. "Plumbline <hello@your-domain.com>"
//   SUPPORT_INBOX    where help-center messages go
//   LABS_INBOX       where labs requests go (optional; falls back to SUPPORT_INBOX)
//   WEBHOOK_SECRET   any long random string; the webhook must send it in the x-webhook-secret header

type MessageRow = {
  ref: string; kind: 'support' | 'labs'; name: string; email: string;
  topic: string | null; company: string | null; message: string;
  details: Record<string, unknown>; created_at: string;
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const secret = Deno.env.get('WEBHOOK_SECRET');
  if (!secret || req.headers.get('x-webhook-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const r: MessageRow | undefined = body?.record;
  if (!r || body?.type !== 'INSERT') return new Response('Ignored', { status: 200 });

  const support = Deno.env.get('SUPPORT_INBOX') ?? '';
  const to = r.kind === 'labs' ? (Deno.env.get('LABS_INBOX') || support) : support;
  const label = r.kind === 'labs' ? 'Labs request' : 'Support';
  const extra = Object.entries(r.details ?? {}).map(([k, v]) => `${k}: ${v}`).join('\n');

  const text = [
    `${label} · ${r.ref}`,
    '',
    `From: ${r.name} <${r.email}>`,
    r.company ? `Company: ${r.company}` : '',
    r.topic ? `Topic: ${r.topic}` : '',
    extra,
    '',
    r.message,
    '',
    `Received ${r.created_at}. Reply to this email to answer ${r.name} directly.`,
  ].filter((line, i, all) => line !== '' || all[i - 1] !== '').join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: Deno.env.get('FROM_EMAIL'),
      to: [to],
      reply_to: r.email,
      subject: `[${r.ref}] ${label}${r.topic ? ': ' + r.topic : ''} — ${r.name}`,
      text,
    }),
  });

  if (!res.ok) {
    console.error('Resend error', res.status, await res.text());
    return new Response('Email failed', { status: 502 });
  }
  return new Response('Sent', { status: 200 });
});
