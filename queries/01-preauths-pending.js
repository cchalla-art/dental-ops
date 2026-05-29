export default {
  name: 'PreAuths Pending',

  sql: `
    SELECT
      p.LName,
      p.FName,
      DATE_FORMAT(c.DateSent, '%m/%d/%Y')    AS DateSent,
      DATEDIFF(CURDATE(), c.DateSent)         AS DaysPending,
      car.CarrierName,
      CASE c.ClaimStatus
        WHEN 0 THEN 'Unsent'
        WHEN 1 THEN 'Sent'
        WHEN 2 THEN 'Received'
        WHEN 3 THEN 'Accepted'
        WHEN 4 THEN 'Pending'
        WHEN 5 THEN 'Denied'
        WHEN 6 THEN 'Sending'
        ELSE        'Unknown'
      END                                     AS StatusText,
      (SELECT DATE_FORMAT(MAX(SecDateTEdit), '%m/%d/%Y %h:%i %p')
       FROM claim
       WHERE ClaimType = 'PreAuth')           AS LastUpdated
    FROM claim c
    JOIN patient p   ON c.PatNum      = p.PatNum
    JOIN inssub s    ON c.InsSubNum   = s.InsSubNum
    JOIN insplan ip  ON s.PlanNum     = ip.PlanNum
    JOIN carrier car ON ip.CarrierNum = car.CarrierNum
    WHERE c.ClaimType = 'PreAuth'
      AND c.ClaimStatus IN (0, 1, 4)
      AND c.DateSent >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    ORDER BY c.DateSent DESC
  `,

  format(rows) {
    const lastUpdated = rows[0]?.LastUpdated ?? 'N/A';

    if (rows.length === 0) {
      return {
        '📋 PreAuths Pending': 'None — all clear!',
        '🕒 Last Updated':     lastUpdated,
      };
    }

    // Top 10 latest → oldest
    const top10 = rows.slice(0, 10).map(
      (r, i) => [`${i + 1}. ${r.LName}, ${r.FName}`, `${r.CarrierName} | ${r.StatusText} | ${r.DaysPending}d`]
    );

    return {
      '📋 PreAuths Pending': `${rows.length} open`,
      '🕒 Last Updated':     lastUpdated,
      '──────────────────':  '──────────────────────────────────',
      ...Object.fromEntries(top10),
      ...(rows.length > 10 ? { '   ': `+ ${rows.length - 10} more` } : {}),
    };
  },
};
