# dental-ops

Automated OpenDental reports posted to a Zoom Team Chat channel.

## What it does

Runs on a schedule (GitHub Actions), queries the OpenDental MySQL database,
and posts a formatted summary to a Zoom channel via incoming webhook.

### Current reports

| Query file | What it checks |
|---|---|
| `01-preauths-pending.js` | All pre-auth claims still pending/sent |
| `02-preauth-last-checked.js` | Most recently verified insurance records |
| `03-preauth-last-log.js` | Latest 10 entries in the pre-auth audit log |
| `04-seen-yesterday-no-appt.js` | *(disabled)* Patients seen yesterday with no future appt |
| `05-recall-due-today.js` | *(disabled)* Patients whose recall is due today |

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/YOUR_ORG/dental-ops.git
cd dental-ops
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your MySQL connection details and Zoom webhook URL
```

### 3. Get a Zoom Incoming Webhook URL

1. Go to [Zoom Marketplace](https://marketplace.zoom.us/) → **Develop → Build App**
2. Choose **Incoming Webhook**
3. Name it (e.g. "Dental Ops Bot"), select the channel to post to
4. Copy the **Webhook URL** — paste it into `.env` as `ZOOM_WEBHOOK_URL`

### 4. Test locally

```bash
node index.js all        # run all active queries
node index.js preauths   # run only pre-auth queries
```

If `ZOOM_WEBHOOK_URL` is not set, output is printed to the console (dry-run mode).

---

## GitHub Actions + Self-Hosted Runner

Because your OpenDental MySQL is on a local network, the GitHub Actions workflow
uses a **self-hosted runner** installed on your Windows server.

### Install the runner on Windows

1. Go to your GitHub repo → **Settings → Actions → Runners → New self-hosted runner**
2. Choose **Windows x64**, follow the installation steps
3. Run the runner as a Windows Service so it survives reboots:
   ```powershell
   .\svc.ps1 install
   .\svc.ps1 start
   ```

### Add secrets to GitHub

Go to **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret | Value |
|---|---|
| `DB_HOST` | MySQL host (e.g. `localhost` or `192.168.1.x`) |
| `DB_PORT` | `3306` |
| `DB_USER` | MySQL username |
| `DB_PASSWORD` | MySQL password |
| `DB_NAME` | `opendental` |
| `ZOOM_WEBHOOK_URL` | Your Zoom webhook URL |

### Schedule

The workflow runs **Mon–Fri at 8:00 AM Eastern** by default.
Edit `.github/workflows/report.yml` → `cron: '0 13 * * 1-5'` to change the time.

You can also trigger it manually from **Actions → Dental Ops Report → Run workflow**.

---

## Adding a new query

1. Create a new file in `/queries/` following the pattern of existing files:

```js
export default {
  name: 'My New Check',
  description: 'What this query looks for',
  sql: `
    SELECT ... FROM ...
    WHERE SomeDate = :today   -- :today and :yesterday are auto-injected
  `,
  format(rows) {
    if (rows.length === 0) return '✅ *My New Check* — Nothing to report';
    const lines = rows.map(r => `  • ${r.SomeField}`);
    return `📊 *My New Check (${rows.length})*\n${lines.join('\n')}`;
  },
};
```

2. Import and add it to `index.js` under the appropriate report group.

That's it — the next scheduled run will include it.
