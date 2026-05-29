/**
 * Zoom webhook format finder — tries every known payload format
 * until one works. Run: node test-zoom.js
 */

import 'dotenv/config';

const WEBHOOK_URL = process.env.ZOOM_WEBHOOK_URL;

if (!WEBHOOK_URL) {
  console.error('❌  ZOOM_WEBHOOK_URL is not set in your .env file.');
  process.exit(1);
}

console.log(`🔗  Testing URL: ${WEBHOOK_URL}\n`);

const formats = [
  {
    label: 'Format A — { content }',
    body: { content: 'Dental Ops test message' },
  },
  {
    label: 'Format B — { text }',
    body: { text: 'Dental Ops test message' },
  },
  {
    label: 'Format C — { message }',
    body: { message: 'Dental Ops test message' },
  },
  {
    label: 'Format D — { body: { head, body[] } }',
    body: {
      body: {
        head: { text: 'Dental Ops' },
        body: [{ type: 'message', text: 'Dental Ops test message' }],
      },
    },
  },
  {
    label: 'Format E — { head, body[] } (flat)',
    body: {
      head: { text: 'Dental Ops' },
      body: [{ type: 'message', text: 'Dental Ops test message' }],
    },
  },
  {
    label: 'Format F — { body: string }',
    body: { body: 'Dental Ops test message' },
  },
  {
    label: 'Format G — { payload: { text } }',
    body: { payload: { text: 'Dental Ops test message' } },
  },
];

for (const fmt of formats) {
  process.stdout.write(`  Testing ${fmt.label} ... `);

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fmt.body),
    });

    const raw = await res.text();

    if (res.ok) {
      console.log(`✅  SUCCESS (HTTP ${res.status})`);
      console.log(`\n🎉  Working format found!\n`);
      console.log('    Payload:', JSON.stringify(fmt.body, null, 2));
      console.log('\n    Check your Zoom channel for the test message.');
      process.exit(0);
    } else {
      console.log(`❌  HTTP ${res.status} — ${raw}`);
    }
  } catch (err) {
    console.log(`❌  Network error: ${err.message}`);
  }
}

console.log('\n⚠️  No format worked. The webhook URL itself may be the issue.');
console.log('    Try regenerating the webhook URL from the Zoom channel.');
