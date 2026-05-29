/**
 * TEST QUERY — safe read-only check, no real dental data needed.
 * Pulls today's appointment count + a few recent patients.
 * Use this to verify the full pipeline: DB → format → Zoom.
 *
 * Run with:  node index.js test
 */

export default {
  name: 'End-to-End Test',
  description: 'Confirms DB connection, query execution, and Zoom posting all work.',

  sql: `
    SELECT
      (SELECT COUNT(*) FROM appointment
        WHERE DATE(AptDateTime) = CURDATE()
          AND AptStatus NOT IN (5,6)) AS appts_today,

      (SELECT COUNT(*) FROM patient
        WHERE PatStatus = 0)           AS active_patients,

      (SELECT COUNT(*) FROM claim
        WHERE ClaimType = 'PreAuth')   AS total_preauths,

      CURDATE()                        AS run_date
  `,

  format(rows) {
    if (!rows.length) return '⚠️ Test query returned no rows.';

    const r = rows[0];
    return [
      `🧪 *End-to-End Test — PASSED*`,
      ``,
      `📅 Run date:        ${r.run_date}`,
      `🦷 Active patients: ${Number(r.active_patients).toLocaleString()}`,
      `📆 Appts today:     ${Number(r.appts_today).toLocaleString()}`,
      `📋 Total pre-auths: ${Number(r.total_preauths).toLocaleString()}`,
      ``,
      `✅ DB → Query → Zoom pipeline is working!`,
    ].join('\n');
  },
};
