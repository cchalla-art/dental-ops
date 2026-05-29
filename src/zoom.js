const WEBHOOK_URL   = process.env.ZOOM_WEBHOOK_URL;
const WEBHOOK_TOKEN = process.env.ZOOM_WEBHOOK_TOKEN; // Verification token from Zoom

/**
 * Post a plain text message to Zoom Team Chat.
 * Zoom incoming webhook format: POST ?format=message with Authorization header.
 */
export async function postToZoom(text) {
  if (!WEBHOOK_URL) {
    console.log('[Zoom dry-run]\n', text);
    return;
  }

  const url = `${WEBHOOK_URL}?format=message`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': WEBHOOK_TOKEN ?? '',
    },
    body: JSON.stringify(text),   // plain string body for ?format=message
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zoom webhook failed (${res.status}): ${body}`);
  }
}

/**
 * Post a key-value fields card to Zoom (great for structured reports).
 * Pass an object like { "PreAuths Pending": "3", "Last Checked": "2026-05-29" }
 */
export async function postFieldsToZoom(fields) {
  if (!WEBHOOK_URL) {
    console.log('[Zoom dry-run fields]\n', fields);
    return;
  }

  const url = `${WEBHOOK_URL}?format=fields`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': WEBHOOK_TOKEN ?? '',
    },
    body: JSON.stringify(fields),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zoom webhook (fields) failed (${res.status}): ${body}`);
  }
}

export function header(title) {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  return `━━━━━━━━━━━━━━━━━━━━━━\n📋 *${title}*\n📅 ${date}\n━━━━━━━━━━━━━━━━━━━━━━`;
}
