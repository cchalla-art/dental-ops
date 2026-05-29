const WEBHOOK_URL   = process.env.ZOOM_WEBHOOK_URL;
const WEBHOOK_TOKEN = process.env.ZOOM_WEBHOOK_TOKEN;

async function send(format, body) {
  if (!WEBHOOK_URL) {
    console.log(`[Zoom dry-run ?format=${format}]`, JSON.stringify(body, null, 2));
    return;
  }

  const res = await fetch(`${WEBHOOK_URL}?format=${format}`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': WEBHOOK_TOKEN ?? '',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoom webhook failed (${res.status}): ${text}`);
  }
}

/**
 * Post a plain text message (header / simple line).
 * Zoom ?format=message — body must be a JSON string.
 */
export async function postMessage(text) {
  await send('message', text);
}

/**
 * Post a structured key-value card.
 * Zoom ?format=fields — body is an object { "Label": "Value", ... }
 * This renders cleanly without any \n issues.
 */
export async function postFields(fieldsObj) {
  await send('fields', fieldsObj);
}

/**
 * Convenience: post a header message then a fields card.
 */
export async function postSection(title, fieldsObj) {
  await postMessage(title);
  await postFields(fieldsObj);
}

/** Format today's date nicely */
export function today() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}
