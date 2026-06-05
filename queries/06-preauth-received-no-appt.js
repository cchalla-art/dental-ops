/**
 * PreAuth Received — No Appointment Scheduled
 *
 * Shows every patient whose pre-authorization was RECEIVED (approved by insurance)
 * but who has NO future scheduled/confirmed appointment on the calendar.
 * These are the patients that need to be called to book their procedure.
 *
 * Filters: last 6 months, ClaimStatus = 'R', no AptStatus IN (1,3) after PreAuth received date
 */
export default {
  name: 'PreAuth Received — Not Scheduled',

  sql: `
    SELECT
      p.PatNum,
      p.LName,
      p.FName,
      COALESCE(
        NULLIF(p.WirelessPhone, ''),
        NULLIF(p.HmPhone,       ''),
        NULLIF(p.WkPhone,       '')
      )                                         AS Phone,
      c.DateReceived                            AS DateReceivedRaw,
      DATE_FORMAT(c.DateReceived, '%m/%d/%Y')   AS PreAuthReceived,
      DATEDIFF(CURDATE(), c.DateReceived)       AS DaysSinceReceived,
      (SELECT DATE_FORMAT(MIN(a.AptDateTime), '%m/%d/%Y %h:%i %p')
       FROM appointment a
       WHERE a.PatNum = c.PatNum
         AND a.AptStatus IN (1, 3)
         AND a.AptDateTime > c.DateReceived)    AS AptDateTime,
      car.CarrierName
    FROM claim c
    JOIN patient  p   ON c.PatNum      = p.PatNum
    JOIN inssub   s   ON c.InsSubNum   = s.InsSubNum
    JOIN insplan  ip  ON s.PlanNum     = ip.PlanNum
    JOIN carrier  car ON ip.CarrierNum = car.CarrierNum
    WHERE c.ClaimType   = 'PreAuth'
      AND c.ClaimStatus = 'R'
      AND c.DateReceived >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      AND NOT EXISTS (
            SELECT 1
            FROM   appointment a
            WHERE  a.PatNum      = c.PatNum
              AND  a.AptStatus   IN (1, 3)
              AND  a.AptDateTime > c.DateReceived
      )
    ORDER BY c.DateReceived DESC
  `,

  format(rows) {
    if (rows.length === 0) {
      return {
        '✅ PreAuth Received — Not Scheduled': 'All cleared! Every received preauth patient has an appointment.',
      };
    }

    const entries = rows.slice(0, 10).map((r, i) => [
      `${i + 1}. #${r.PatNum} ${r.LName}, ${r.FName}`,
      `📞 ${r.Phone || 'No phone'} | ${r.CarrierName} | Received ${r.PreAuthReceived} (${r.DaysSinceReceived}d ago) | 📅 ${r.AptDateTime || 'No appt date'}`,
    ]);

    return {
      '📵 PreAuth Received — No Appt': `${rows.length} patient${rows.length !== 1 ? 's' : ''} need to be called`,
      '──────────────────':            '──────────────────────────────────',
      ...Object.fromEntries(entries),
      ...(rows.length > 10
        ? { '   ': `+ ${rows.length - 10} more — view full report on dashboard` }
        : {}),
    };
  },
};
