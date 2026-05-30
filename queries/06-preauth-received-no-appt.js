/**
 * PreAuth Received — No Appointment Scheduled
 *
 * Shows every patient whose pre-authorization was RECEIVED (approved by insurance)
 * but who has NO future scheduled/confirmed appointment on the calendar.
 * These are the patients that need to be called to book their procedure.
 *
 * Filters: last 6 months, ClaimStatus = 'R', no AptStatus IN (1,3) after NOW()
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
      c.DateSent                                AS DateSentRaw,
      DATE_FORMAT(c.DateSent, '%m/%d/%Y')       AS PreAuthSent,
      DATEDIFF(CURDATE(), c.DateSent)           AS DaysSinceSent,
      car.CarrierName
    FROM claim c
    JOIN patient  p   ON c.PatNum      = p.PatNum
    JOIN inssub   s   ON c.InsSubNum   = s.InsSubNum
    JOIN insplan  ip  ON s.PlanNum     = ip.PlanNum
    JOIN carrier  car ON ip.CarrierNum = car.CarrierNum
    WHERE c.ClaimType   = 'PreAuth'
      AND c.ClaimStatus = 'R'
      AND c.DateSent   >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      AND p.PatNum NOT IN (
            SELECT PatNum
            FROM   appointment
            WHERE  AptStatus IN (1, 3)
              AND  AptDateTime > NOW()
      )
    ORDER BY c.DateSent DESC
  `,

  format(rows) {
    if (rows.length === 0) {
      return {
        '✅ PreAuth Received — Not Scheduled': 'All cleared! Every received preauth patient has an appointment.',
      };
    }

    const entries = rows.slice(0, 10).map((r, i) => [
      `${i + 1}. #${r.PatNum} ${r.LName}, ${r.FName}`,
      `📞 ${r.Phone || 'No phone'} | ${r.CarrierName} | Sent ${r.PreAuthSent} (${r.DaysSinceSent}d ago)`,
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
