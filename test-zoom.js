/**
 * Quick Zoom webhook test.
 * Usage:  node test-zoom.js
 *
 * Make sure ZOOM_WEBHOOK_URL is set in your .env file first.
 */

import 'dotenv/config';

const WEBHOOK_URL = process.env.ZOOM_WEBHOOK_URL;

if (!WEBHOOK_URL) {
  console.error('❌  ZOOM_WEBHOOK_URL is not set in your .env file.');
  console.error('    Add it like:  ZOOM_WEBHOOK_URL=https://insidemsg.zoom.us/webhook/sendTo?token=xxx');
  process.exit(1);
}

console.log('🔗  Sending test message to Zoom...');
console.log(`    URL: ${WEBHOOK_URL.slice(0, 60)}...`);

try {
  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: '✅ *Dental Ops — Zoom connection test*\nIf you see this, the webhook is working correctly!',
    }),
  });

  const body = await res.text();

  if (res.ok) {
    console.log(`✅  Success! (HTTP ${res.status})`);
    console.log('    Check your Zoom channel — you should see a test message.');
  } else {
    console.error(`❌  Zoom returned an error (HTTP ${res.status})`);
    console.error('    Response:', body);
    console.error('\n    Common fixes:');
    console.error('    • Double-check the webhook URL in your .env file');
    console.error('    • Make sure you copied the full URL from the Zoom channel message');
  }
} catch (err) {
  console.error('❌  Network error — could not reach Zoom.');
  console.error('    Details:', err.message);
  console.error('\n    Common fixes:');
  console.error('    • Check your internet connection');
  console.error('    • Make sure nothing is blocking outbound HTTPS on this machine');
}
