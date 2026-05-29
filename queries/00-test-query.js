/**
 * TEST QUERY — safe read-only check, no real dental data needed.
 * Run with:  node index.js test
 */

export default {
  name: 'End-to-End Test',

  sql: `
    SELECT
      (SELECT COUNT(*) FROM appointment
        WHERE DATE(AptDateTime) = CURDATE()
          AND AptStatus NOT IN (5,6))  AS appts_today,
      (SELECT COUNT(*) FROM patient
        WHERE PatStatus = 0)           AS active_patients,
      (SELECT COUNT(*) FROM claim
        WHERE ClaimType = 'PreAuth')   AS total_preauths,
      DATE_FORMAT(CURDATE(), '%M %d, %Y') AS run_date
  `,

  // Return a plain object — renders as a clean fields card in Zoom
  format(rows) {
    if (!rows.length) return { Status: '⚠️ No data returned' };
    const r = rows[0];
    return {
      '✅ Status':          'Pipeline working!',
      '📅 Run Date':        r.run_date,
      '🦷 Active Patients': Number(r.active_patients).toLocaleString(),
      '📆 Appts Today':     Number(r.appts_today).toLocaleString(),
      '📋 Total Pre-Auths': Number(r.total_preauths).toLocaleString(),
    };
  },
};
