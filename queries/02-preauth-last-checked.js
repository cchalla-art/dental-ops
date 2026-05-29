export default {
  name: 'PreAuth Last Checked',

  sql: `
    SELECT
      p.LName,
      p.FName,
      DATE_FORMAT(iv.DateLastVerified, '%m/%d/%Y') AS LastVerified,
      DATEDIFF(CURDATE(), iv.DateLastVerified)      AS DaysAgo,
      car.CarrierName
    FROM insverify iv
    JOIN inssub s    ON iv.FKey = s.InsSubNum AND iv.VerifyType = 1
    JOIN insplan ip  ON s.PlanNum = ip.PlanNum
    JOIN carrier car ON ip.CarrierNum = car.CarrierNum
    JOIN patient p   ON s.Subscriber = p.PatNum
    WHERE iv.DateLastVerified >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    ORDER BY iv.DateLastVerified DESC
    LIMIT 10
  `,

  format(rows) {
    if (rows.length === 0) {
      return { '🗓️ PreAuth Last Checked': 'No verification records found' };
    }

    const mostRecent = rows[0];
    const entries = rows.map(
      (r, i) => [`${i + 1}. ${r.LName}, ${r.FName}`, `${r.CarrierName} | ${r.LastVerified} (${r.DaysAgo}d ago)`]
    );

    return {
      '🗓️ PreAuth Last Checked': `${mostRecent.LastVerified} — ${mostRecent.LName}, ${mostRecent.FName}`,
      '──────────────────':      '──────────────────────────────────',
      ...Object.fromEntries(entries),
    };
  },
};
