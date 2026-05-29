/**
 * Zoom webhook connection test.
 * Usage:  node test-zoom.js
 *
 * Requires in .env:
 *   ZOOM_WEBHOOK_URL=https://integrations.zoom.us/chat/webhooks/incomingwebhook/xxx
 *   ZOOM_WEBHOOK_TOKEN=your_verification_token
 */

import 'dotenv/config';

const WEBHOOK_URL   = process.env.ZOOM_WEBHOOK_URL;
const WEBHOOK_TOKEN = process.env.ZOOM_WEBHOOK_TOKEN;

if (!WEBHOOK_URL) {
  console.error('❌  ZOOM_WEBHOOK_URL is not set in your .env file.');
  process.exit(1);
}

if (!WEBHOOK_TOKEN) {
  console.warn('⚠️   ZOOM_WEBHOOK_TOKEN is not set — request may fail if token is required.');
}

console.log(`🔗  Sending test message to Zoom...`);
console.log(`    URL:   ${WEBHOOK_URL}`);
console.log(`    Token: ${WEBHOOK_TOKEN ? '✓ set' : '✗ missing'}\n`);

try {
  const res = await fetch(`${WEBHOOK_URL}?format=message`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': WEBHOOK_TOKEN ?? '',
    },
    body: JSON.stringify('✅ Dental Ops — Zoom connection test successful! Reports will appear here.'),
  });

  const raw = await res.text();

  if (res.ok) {
    console.log(`✅  Success! (HTTP ${res.status})`);
    console.log('    Check your Zoom channel — you should see the test message.');
  } else {
    console.error(`❌  Zoom returned an error (HTTP ${res.status})`);
    console.error('    Response:', raw);
    console.error('\n    Things to check:');
    console.error('    1. Copy the verification token from the Zoom webhook setup page');
    console.error('       (same place you got the webhook URL)');
    console.error('    2. Add it to .env as:  ZOOM_WEBHOOK_TOKEN=your_token_here');
    console.error('    3. Make sure the webhook URL is complete and not expired');
  }
} catch (err) {
  console.error('❌  Network error:', err.message);
}
