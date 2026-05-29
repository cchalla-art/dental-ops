const WEBHOOK_URL = process.env.ZOOM_WEBHOOK_URL;

export async function postToZoom(text) {
  if (!WEBHOOK_URL) {
    console.log('[Zoom dry-run]\n', text);
    return;
  }

  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Zoom integrations.zoom.us webhook format
    body: JSON.stringify({
      body: {
        head: { text: 'Dental Ops' },
        body: [{ type: 'message', text }],
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zoom webhook failed (${res.status}): ${body}`);
  }
}

export function header(title) {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  return `━━━━━━━━━━━━━━━━━━━━━━\n📋 *${title}*\n📅 ${date}\n━━━━━━━━━━━━━━━━━━━━━━`;
}
