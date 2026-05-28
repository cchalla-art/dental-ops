export default {
  name: 'PreAuth Last Checked Date',
  description: 'Most recently verified insurance records — last date each active patient\'s insurance was verified',
  sql: `
    SELECT
      p.LName,
      p.FName,
      DATE_FORMAT(iv.DateLastVerified, '%Y-%m-%d')   AS LastVerified,
      DATE_FORMAT(iv.DateLastAssigned, '%Y-%m-%d')   AS LastAssigned,
      iv.VerifyType,
      DATEDIFF(CURDATE(), iv.DateLastVerified)        AS DaysSinceVerified,
      car.CarrierName
    FROM insverify iv
    JOIN inssub s    ON iv.FKey = s.InsSubNum AND iv.VerifyType = 1
    JOIN insplan ip  ON s.PlanNum = ip.PlanNum
    JOIN carrier car ON ip.CarrierNum = car.CarrierNum
    JOIN patient p   ON s.Subscriber = p.PatNum
    WHERE iv.DateLastVerified != '0001-01-01'
    ORDER BY iv.DateLastVerified DESC
    LIMIT 20
  `,
  format(rows) {
    if (rows.length === 0) return 'ℹ️ *PreAuth Last Checked* — No verification records found';
    const lines = rows.map(
      r =>
        `  • ${r.LName}, ${r.FName} | ${r.CarrierName} | Last checked: ${r.LastVerified} (${r.DaysSinceVerified}d ago)`
    );
    return `🗓️ *PreAuth Last Checked (recent 20)*\n${lines.join('\n')}`;
  },
};
