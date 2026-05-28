// "For later" query — not included in default report yet
// Patients seen yesterday who have no future appointment scheduled
export default {
  name: 'Seen Yesterday — No Future Appt',
  description: 'Patients who had a visit yesterday but have no upcoming appointment booked',
  sql: `
    SELECT DISTINCT
      p.PatNum,
      p.LName,
      p.FName,
      p.HmPhone,
      p.WirelessPhone,
      DATE_FORMAT(MAX(pl.ProcDate), '%Y-%m-%d') AS LastVisit
    FROM procedurelog pl
    JOIN patient p ON pl.PatNum = p.PatNum
    WHERE pl.ProcDate = :yesterday
      AND pl.ProcStatus = 2
      AND p.PatStatus = 0
      AND p.PatNum NOT IN (
        SELECT PatNum FROM appointment
        WHERE AptDateTime > NOW()
          AND AptStatus IN (1, 3)
      )
    GROUP BY p.PatNum, p.LName, p.FName, p.HmPhone, p.WirelessPhone
    ORDER BY p.LName, p.FName
  `,
  format(rows) {
    if (rows.length === 0) return '✅ *Seen Yesterday / No Appt* — All patients have future appointments';
    const lines = rows.map(
      r =>
        `  • ${r.LName}, ${r.FName} | Ph: ${r.WirelessPhone || r.HmPhone || 'N/A'} | Seen: ${r.LastVisit}`
    );
    return `📞 *Seen Yesterday — No Future Appt (${rows.length})*\n${lines.join('\n')}`;
  },
};
