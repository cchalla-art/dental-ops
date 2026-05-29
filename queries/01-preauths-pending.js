export default {
  name: 'PreAuths Pending',
  description: 'All insurance pre-authorization claims currently in a pending/sent state',
  sql: `
SELECT
  p.LName,
  p.FName,
  c.ClaimNum,
  DATE_FORMAT(c.DateSent, '%Y-%m-%d')          AS DateSent,
  DATEDIFF(CURDATE(), c.DateSent)               AS DaysPending,
  car.CarrierName,
  c.ClaimStatus,
  CASE c.ClaimStatus
    WHEN 0 THEN 'Unsent'
    WHEN 1 THEN 'Sent'
    WHEN 2 THEN 'Received'
    WHEN 3 THEN 'Accepted'
    WHEN 4 THEN 'Pending'
    WHEN 5 THEN 'Denied'
    WHEN 6 THEN 'Sending'
    ELSE        'Unknown'
  END                                           AS StatusText
FROM claim c
JOIN patient p   ON c.PatNum    = p.PatNum
JOIN inssub s    ON c.InsSubNum = s.InsSubNum
JOIN insplan ip  ON s.PlanNum   = ip.PlanNum
JOIN carrier car ON ip.CarrierNum = car.CarrierNum
WHERE c.ClaimType = 'PreAuth'
  AND c.ClaimStatus IN (0, 1, 4)
  AND c.DateSent >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
ORDER BY c.DateSent DESC
  `,
  format(rows) {
    if (rows.length === 0) return '✅ *PreAuths Pending* — None pending';
    const lines = rows.map(
      r =>
        `  • ${r.LName}, ${r.FName} | ${r.CarrierName} | Sent: ${r.DateSent} | ${r.DaysPending}d pending`
    );
    return `🔖 *PreAuths Pending (${rows.length})*\n${lines.join('\n')}`;
  },
};
