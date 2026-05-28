export default {
  name: 'Last PreAuth Log',
  description: 'Most recent insurance verification history entries (audit log)',
  sql: `
    SELECT
      p.LName,
      p.FName,
      DATE_FORMAT(ivh.DateLastVerified, '%Y-%m-%d %H:%i') AS VerifiedAt,
      ivh.UserNum,
      u.UserName,
      car.CarrierName
    FROM insverifyhist ivh
    JOIN inssub s    ON ivh.FKey = s.InsSubNum AND ivh.VerifyType = 1
    JOIN insplan ip  ON s.PlanNum = ip.PlanNum
    JOIN carrier car ON ip.CarrierNum = car.CarrierNum
    JOIN patient p   ON s.Subscriber = p.PatNum
    LEFT JOIN userod u ON ivh.UserNum = u.UserNum
    ORDER BY ivh.DateLastVerified DESC
    LIMIT 10
  `,
  format(rows) {
    if (rows.length === 0) return 'ℹ️ *Last PreAuth Log* — No log entries found';
    const lines = rows.map(
      r =>
        `  • ${r.LName}, ${r.FName} | ${r.CarrierName} | ${r.VerifiedAt} by ${r.UserName || r.UserNum}`
    );
    return `📝 *Last PreAuth Log (recent 10)*\n${lines.join('\n')}`;
  },
};
