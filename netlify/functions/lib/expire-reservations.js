async function expireOverdueReservations(sql, memberId = null) {
    return await sql`
        WITH expired_orders AS (
            UPDATE payment_orders po SET status = 'expired', updated_at = NOW()
            WHERE po.status IN ('pending', 'preparing')
              AND po.expires_at <= NOW()
              AND (CAST(${memberId} AS text) IS NULL OR po.member_id::text = ${memberId})
            RETURNING po.id, po.application_id, po.member_id
        ), expired_applications AS (
            UPDATE applications a SET status = 'expired', payment_status = 'expired'
            FROM expired_orders eo WHERE a.id = eo.application_id
            RETURNING a.id
        ), released_attendance AS (
            UPDATE event_attendance ea SET payment_status = 'expired'
            FROM expired_orders eo WHERE ea.application_id = eo.application_id
            RETURNING ea.id
        ), released_members AS (
            UPDATE members m SET account_status = 'active', payment_access_expires_at = NULL, updated_at = NOW()
            WHERE (m.id IN (SELECT member_id FROM expired_orders) OR m.account_status = 'locked')
              AND (CAST(${memberId} AS text) IS NULL OR m.id::text = ${memberId})
              AND NOT EXISTS (
                  SELECT 1 FROM payment_orders active_order
                  WHERE active_order.member_id = m.id
                    AND active_order.status IN ('pending', 'preparing')
                    AND active_order.expires_at > NOW()
              )
            RETURNING m.id
        )
        SELECT id FROM expired_orders`;
}

module.exports = { expireOverdueReservations };
