export default {
  name: 'Last PreAuth Log',

  sql: `
    SELECT
      p.LName,
      p.FName,
      DATE_FORMAT(ivh.DateLastVerified, '%m/%d/%Y %h:%i %p') AS VerifiedAt,
      u.UserName,
      car.CarrierName
    FROM insverifyhist ivh
    JOIN inssub s    ON ivh.FKey = s.InsSubNum AND ivh.VerifyType = 1
    JOIN insplan ip  ON s.PlanNum = ip.PlanNum
    JOIN carrier car ON ip.CarrierNum = car.CarrierNum
    JOIN patient p   ON s.Subscriber = p.PatNum
    LEFT JOIN userod u ON ivh.UserNum = u.UserNum
    WHERE ivh.DateLastVerified >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    ORDER BY ivh.DateLastVerified DESC
    LIMIT 10
  `,

  format(rows) {
    if (rows.length === 0) {
      return { '📝 Last PreAuth Log': 'No log entries found' };
    }

    const latest = rows[0];
    const entries = rows.map(
      (r, i) => [`${i + 1}. ${r.LName}, ${r.FName}`, `${r.CarrierName} | ${r.VerifiedAt} | by ${r.UserName || 'Unknown'}`]
    );

    return {
      '📝 Last PreAuth Log':  `${latest.VerifiedAt} — ${latest.LName}, ${latest.FName}`,
      '──────────────────':   '──────────────────────────────────',
      ...Object.fromEntries(entries),
    };
  },
};
