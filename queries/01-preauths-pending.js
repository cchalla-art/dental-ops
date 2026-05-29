export default {
  name: 'PreAuths Pending',

  sql: `
    SELECT
      p.PatNum,
      p.LName,
      p.FName,
      COALESCE(
        NULLIF(p.WirelessPhone, ''),
        NULLIF(p.HmPhone, ''),
        NULLIF(p.WkPhone, '')
      )                                       AS Phone,
      c.DateSent                              AS DateSentRaw,
      DATE_FORMAT(c.DateSent, '%m/%d/%Y')     AS DateSent,
      DATEDIFF(CURDATE(), c.DateSent)         AS DaysPending,
      car.CarrierName,
      CASE c.ClaimStatus
        WHEN 'S' THEN 'Sent'
        WHEN 'R' THEN 'Received'
        ELSE c.ClaimStatus
      END                                     AS StatusText,
      (SELECT DATE_FORMAT(MAX(SecDateEntry), '%m/%d/%Y %h:%i %p')
       FROM claim
       WHERE ClaimType = 'PreAuth')           AS LastAdded
    FROM claim c
    JOIN patient p   ON c.PatNum      = p.PatNum
    JOIN inssub s    ON c.InsSubNum   = s.InsSubNum
    JOIN insplan ip  ON s.PlanNum     = ip.PlanNum
    JOIN carrier car ON ip.CarrierNum = car.CarrierNum
    WHERE c.ClaimType = 'PreAuth'
      AND c.ClaimStatus IN ('S', 'R')
      AND c.DateSent >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    ORDER BY c.DateSent DESC
  `,

  format(rows) {
    const lastAdded = rows[0]?.LastAdded ?? 'N/A';

    if (rows.length === 0) {
      return {
        '📋 PreAuths Pending': 'None — all clear!',
        '🕒 Last Added to DB': lastAdded,
      };
    }

    // Sort newest DateSent first using raw date field
    const sorted = [...rows].sort((a, b) => new Date(b.DateSentRaw) - new Date(a.DateSentRaw));
    const top10 = sorted.slice(0, 10).map((r, i) => [
      `${i + 1}. #${r.PatNum} ${r.LName}, ${r.FName}`,
      `📞 ${r.Phone || 'No phone'} | ${r.CarrierName} | ${r.StatusText} | ${r.DaysPending}d`,
    ]);

    return {
      '📋 PreAuths Pending': `${rows.length} open`,
      '🕒 Last Added to DB': lastAdded,
      '──────────────────':  '──────────────────────────────────',
      ...Object.fromEntries(top10),
      ...(rows.length > 10 ? { '   ': `+ ${rows.length - 10} more` } : {}),
    };
  },
};
