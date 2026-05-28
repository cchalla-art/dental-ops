export default {
  name: 'PreAuths Pending',
  description: 'All insurance pre-authorization claims currently in a pending/sent state',
  sql: `
    SELECT
      p.LName,
      p.FName,
      c.ClaimNum,
      DATE_FORMAT(c.DateSent, '%Y-%m-%d')  AS DateSent,
      DATEDIFF(CURDATE(), c.DateSent)       AS DaysPending,
      car.CarrierName
    FROM claim c
    JOIN patient p   ON c.PatNum  = p.PatNum
    JOIN inssub s    ON c.InsSubNum = s.InsSubNum
    JOIN insplan ip  ON s.PlanNum = ip.PlanNum
    JOIN carrier car ON ip.CarrierNum = car.CarrierNum
    WHERE c.ClaimType = 'PreAuth'
      AND c.ClaimStatus IN (0, 1, 4)
    ORDER BY c.DateSent ASC
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
