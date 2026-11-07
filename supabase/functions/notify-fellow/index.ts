// Emails a fellow each new notification.
// Triggered by a Supabase Database Webhook on INSERT into public.notifications.
// Uses the same secrets as notify-message: RESEND_API_KEY, FROM_EMAIL, WEBHOOK_SECRET.

type NotificationRow = { email: string | null; title: string; body: string | null };

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const secret = Deno.env.get('WEBHOOK_SECRET');
  if (!secret || req.headers.get('x-webhook-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const r: NotificationRow | undefined = body?.record;
  if (!r || body?.type !== 'INSERT' || !r.email) return new Response('Ignored', { status: 200 });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: Deno.env.get('FROM_EMAIL'),
      to: [r.email],
      subject: `Plumbline: ${r.title}`,
      text: [r.title, r.body ?? '', 'See the details in your Plumbline workspace.'].filter(Boolean).join('\n\n'),
    }),
  });

  if (!res.ok) {
    console.error('Resend error', res.status, await res.text());
    return new Response('Email failed', { status: 502 });
  }
  return new Response('Sent', { status: 200 });
});
