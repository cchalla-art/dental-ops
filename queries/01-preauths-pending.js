export default {
  name: 'PreAuths Pending',
  description: 'Count + list of pre-auth claims pending in the last 6 months',

  sql: `
    SELECT
      p.LName,
      p.FName,
      c.ClaimNum,
      DATE_FORMAT(c.DateSent, '%Y-%m-%d')   AS DateSent,
      DATEDIFF(CURDATE(), c.DateSent)        AS DaysPending,
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
      END                                    AS StatusText
    FROM claim c
    JOIN patient p   ON c.PatNum     = p.PatNum
    JOIN inssub s    ON c.InsSubNum  = s.InsSubNum
    JOIN insplan ip  ON s.PlanNum    = ip.PlanNum
    JOIN carrier car ON ip.CarrierNum = car.CarrierNum
    WHERE c.ClaimType = 'PreAuth'
      AND c.ClaimStatus IN (0, 1, 4)
      AND c.DateSent >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    ORDER BY c.DateSent DESC
  `,

  // Returns a fields object → renders as a clean Zoom card
  format(rows) {
    if (rows.length === 0) {
      return { '✅ PreAuths Pending': 'None — all clear!' };
    }

    // Build count by status
    const byStatus = rows.reduce((acc, r) => {
      acc[r.StatusText] = (acc[r.StatusText] || 0) + 1;
      return acc;
    }, {});

    const statusBreakdown = Object.entries(byStatus)
      .map(([status, count]) => `${status}: ${count}`)
      .join(' | ');

    // Sort latest DateSent first (most recently sent at top)
    const sorted = [...rows].sort((a, b) => new Date(b.DateSent) - new Date(a.DateSent));

    // Oldest = most days pending
    const oldest = sorted[sorted.length - 1];

    // List each patient latest → oldest (cap at 10 to keep Zoom card readable)
    const list = sorted.slice(0, 10).map(
      r => `${r.LName}, ${r.FName} | ${r.CarrierName} | ${r.StatusText} | ${r.DaysPending}d`
    );
    if (rows.length > 10) list.push(`... and ${rows.length - 10} more`);

    return {
      '📋 Total Pending':   String(rows.length),
      '📊 By Status':       statusBreakdown,
      '⏳ Oldest Pending':  `${oldest.LName}, ${oldest.FName} — ${oldest.DaysPending} days (${oldest.DateSent})`,
      '─────────────────': '─────────────────────────────────',
      ...Object.fromEntries(list.map((line, i) => [`${i + 1}.`, line])),
    };
  },
};
