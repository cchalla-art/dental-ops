// "For later" query — not included in default report yet
// Patients whose recall (hygiene) is due today
export default {
  name: 'Recall Due Today',
  description: 'Patients whose recall date is today and have no scheduled hygiene appointment',
  sql: `
    SELECT
      p.PatNum,
      p.LName,
      p.FName,
      p.HmPhone,
      p.WirelessPhone,
      DATE_FORMAT(r.DateDue, '%Y-%m-%d')    AS RecallDue,
      rt.Description                         AS RecallType
    FROM recall r
    JOIN patient p    ON r.PatNum = p.PatNum
    JOIN recalltype rt ON r.RecallTypeNum = rt.RecallTypeNum
    WHERE DATE(r.DateDue) = :today
      AND r.IsDisabled = 0
      AND p.PatStatus = 0
      AND r.PatNum NOT IN (
        SELECT PatNum FROM appointment
        WHERE AptDateTime > NOW()
          AND AptStatus IN (1, 3)
      )
    ORDER BY p.LName, p.FName
  `,
  format(rows) {
    if (rows.length === 0) return '✅ *Recall Due Today* — None due or all scheduled';
    const lines = rows.map(
      r =>
        `  • ${r.LName}, ${r.FName} | ${r.RecallType} | Ph: ${r.WirelessPhone || r.HmPhone || 'N/A'}`
    );
    return `🦷 *Recall Due Today (${rows.length})*\n${lines.join('\n')}`;
  },
};
