export default {
  name: 'PreAuth Last Checked',

  sql: `
    SELECT
      p.PatNum,
      p.LName,
      p.FName,
      COALESCE(
        NULLIF(p.WirelessPhone, ''),
        NULLIF(p.HmPhone, ''),
        NULLIF(p.WkPhone, '')
      )                                            AS Phone,
      iv.DateLastVerified                           AS LastVerifiedRaw,
      DATE_FORMAT(iv.DateLastVerified, '%m/%d/%Y')  AS LastVerified,
      DATEDIFF(CURDATE(), iv.DateLastVerified)       AS DaysAgo,
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
      return { '🗓️ PreAuth Last Checked': 'No records in the last 6 months' };
    }

    // Sort newest first
    const sorted = [...rows].sort((a, b) => new Date(b.LastVerifiedRaw) - new Date(a.LastVerifiedRaw));
    const mostRecent = sorted[0];
    const entries = sorted.map((r, i) => [
      `${i + 1}. #${r.PatNum} ${r.LName}, ${r.FName}`,
      `📞 ${r.Phone || 'No phone'} | ${r.CarrierName} | ${r.LastVerified} (${r.DaysAgo}d ago)`,
    ]);

    return {
      '🗓️ PreAuth Last Checked': `${mostRecent.LastVerified} — ${mostRecent.LName}, ${mostRecent.FName}`,
      '──────────────────':       '──────────────────────────────────',
      ...Object.fromEntries(entries),
    };
  },
};
