export default {
  name: 'Last PreAuth Log',

  sql: `
    SELECT
      p.PatNum,
      p.LName,
      p.FName,
      COALESCE(
        NULLIF(p.WirelessPhone, ''),
        NULLIF(p.HmPhone, ''),
        NULLIF(p.WkPhone, '')
      )                                                    AS Phone,
      ivh.DateLastVerified                                     AS VerifiedAtRaw,
      DATE_FORMAT(ivh.DateLastVerified, '%m/%d/%Y %h:%i %p')  AS VerifiedAt,
      u.UserName,
      car.CarrierName,
      (SELECT DATE_FORMAT(MIN(a.AptDateTime), '%m/%d/%Y')
       FROM appointment a
       WHERE a.PatNum = p.PatNum
         AND a.AptStatus IN (1, 3)
         AND a.AptDateTime > NOW())                              AS NextAppt
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
      return { '📝 Last PreAuth Log': 'No log entries in the last 6 months' };
    }

    // Sort newest first
    const sorted = [...rows].sort((a, b) => new Date(b.VerifiedAtRaw) - new Date(a.VerifiedAtRaw));
    const latest = sorted[0];
    const entries = sorted.map((r, i) => [
      `${i + 1}. #${r.PatNum} ${r.LName}, ${r.FName}`,
      `📞 ${r.Phone || 'No phone'} | ${r.CarrierName} | ${r.VerifiedAt} | by ${r.UserName || 'Unknown'} | 📅 ${r.NextAppt || '⚠️ No appt'}`,
    ]);

    return {
      '📝 Last PreAuth Log':  `${latest.VerifiedAt} — ${latest.LName}, ${latest.FName}`,
      '──────────────────':   '──────────────────────────────────',
      ...Object.fromEntries(entries),
    };
  },
};
