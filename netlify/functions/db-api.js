// ============================================================
// FoundersVN — consolidated data API (Neon Postgres).
//
// Single Netlify Function that the browser (database.js) calls instead of
// talking to a database directly. Body: { action, payload }.
//
// Security model (Neon has no anon role; the browser never connects to PG):
//   * PUBLIC actions  — normal user flows (apply, browse events, checkout,
//     view members/photos). No auth required.
//   * ADMIN actions   — administrative reads/writes. Require the
//     `x-admin-token` request header to equal process.env.ADMIN_TOKEN
//     (same shared-secret pattern accept-application.js uses; admin.js stores
//     the token in localStorage as 'fvn_admin_token').
//
// All SQL uses tagged-template parameter binding (values -> $1,$2,...), so
// there is NO string interpolation and SQL injection is prevented by design.
// ============================================================

const { sql, isConfigured } = require('./lib/neon');
const crypto = require('crypto');
const { isAdminRequest, getBearerToken, verifyToken, hashPassword } = require('./lib/auth');
const { decrypt } = require('./lib/field-crypto');
const { encrypt } = require('./lib/field-crypto');
const { config: sepayConfig, qrUrl: sepayQrUrl } = require('./lib/sepay');
const { createPaymentIntent, isConfigured: airwallexConfigured } = require('./lib/airwallex');
const { paymentProviderEnabled, paymentEnvironment } = require('./lib/payment-environment');
const { MEAL_CREDIT_VND, normalizeMealOrder } = require('../../lib/meal-menu.cjs');
const { syncResendStatuses } = require('./lib/resend-status');
const { expireOverdueReservations } = require('./lib/expire-reservations');

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-token, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(statusCode, obj) {
    return { statusCode, headers: { 'Content-Type': 'application/json', ...CORS }, body: JSON.stringify(obj) };
}

// Actions that require the admin token. Everything else is public.
// (Applications are administrative to READ — under the old Supabase RLS the
//  anon role could not select them — but anyone could INSERT one to apply.)
const ADMIN_ACTIONS = new Set([
    'members.create',
    'applications.list',
    'applications.get',
    'events.create',
    'events.update',
    'events.delete',
    'event_photos.add',
    'transactions.updateStatus',
    'transactions.all',
    'bookings.byEvent',
    'bookings.all',
    'bookings.stats',
    'attendance.adminCheckinList',
    'attendance.checkIn'
]);

// Actions that require ANY logged-in member (a valid member JWT). The current
// member id is taken from the verified token — NEVER from client-supplied input.
const MEMBER_ACTIONS = new Set([
    'members.list',
    'members.get',
    'members.update',
    'attendance.byEvent',
    'attendance.check',
    'attendance.register',
    'eventRegistration.status',
    'transactions.create',
    'transactions.byUser',
    'transactions.byEmail',
    'bookings.create',
    'bookings.byUser',
    'bookings.byEmail',
    'bookings.get',
    'bookings.latest',
    'messages.send',
    'messages.thread',
    'messages.inbox',
    'messages.unreadCount',
    'messages.markRead',
    'payments.current',
    'payments.list',
    'payments.ensureAirwallexCheckout',
    'meals.get',
    'meals.update'
]);

const PENDING_ACCOUNT_ACTIONS = new Set(['members.update', 'payments.current', 'payments.list', 'payments.ensureAirwallexCheckout']);

function publicPaymentOrder(order) {
    if (!order) return null;
    let airwallexUrl = null;
    try { airwallexUrl = decrypt(order.airwallex_url_encrypted); } catch (_) {}
    let mealOrder = order.meal_order || null;
    if (typeof mealOrder === 'string') {
        try { mealOrder = JSON.parse(mealOrder); } catch (_) { mealOrder = null; }
    }
    const sepay = sepayConfig();
    return {
        id: order.id,
        status: ['pending', 'preparing'].includes(order.status) && new Date(order.expires_at).getTime() <= Date.now() ? 'expired' : order.status,
        providerEnvironment: order.provider_environment,
        ticketCount: Number(order.ticket_count), guestName: order.guest_name,
        baseAmountUsd: Number(order.base_amount_usd), airwallexFeeUsd: Number(order.airwallex_fee_usd),
        airwallexTotalUsd: Number(order.airwallex_total_usd), airwallexUrl,
        sepayAmountVnd: Number(order.sepay_amount_vnd), sepayCode: order.sepay_code,
        sepayQrUrl: sepayQrUrl({ amountVnd: order.sepay_amount_vnd, code: order.sepay_code }),
        sepayBank: sepay.bank, sepayAccount: sepay.account, sepayAccountName: sepay.accountName,
        paidProvider: order.paid_provider, paidAt: order.paid_at, expiresAt: order.expires_at,
        createdAt: order.created_at,
        meal: mealOrder || order.meal_submitted_at ? {
            items:Array.isArray(mealOrder?.items) ? mealOrder.items : [],
            notes:mealOrder?.notes || '',
            subtotalVnd:Number(order.meal_subtotal_vnd || mealOrder?.subtotalVnd || 0),
            vatVnd:Number(order.meal_vat_vnd || mealOrder?.vatVnd || 0),
            serviceVnd:Number(order.meal_service_vnd || mealOrder?.serviceVnd || 0),
            totalVnd:Number(order.meal_total_vnd || mealOrder?.totalVnd || 0),
            creditVnd:Number(order.meal_credit_vnd || mealOrder?.creditVnd || 0),
            amountDueVnd:Number(order.meal_amount_due_vnd || mealOrder?.amountDueVnd || 0),
            submittedAt:order.meal_submitted_at || null,
            updatedAt:order.meal_updated_at || null
        } : null,
        event: { id: order.event_id, slug: order.event_slug, name: order.event_name, date: order.event_date,
            time: order.event_time, location: order.event_location,
            venueName: order.event_venue_name, venueAddress: order.event_venue_address }
    };
}

// ---- action handlers -------------------------------------------------------
// Each returns the plain data (array / object / null) the browser expects.

const handlers = {
    // ---------- MEMBERS ----------
    async 'members.list'(_payload, ctx) {
        if (ctx.isAdmin) {
            return await sql`
                SELECT id, email, first_name, last_name, age, company, role, industry,
                       bio, website, websites, profile_photo, whatsapp, zalo, telegram,
                       linkedin, twitter, wechat, facebook, instagram, social_link,
                       is_approved, is_admin, member_type, created_at, updated_at
                FROM members
                WHERE is_approved = true
                ORDER BY created_at DESC`;
        }
        return await sql`
            SELECT DISTINCT m.id, m.email, m.first_name, m.last_name, m.age,
                   m.company, m.role, m.industry, m.bio, m.website, m.websites,
                   m.profile_photo, m.whatsapp, m.zalo, m.telegram, m.linkedin,
                   m.twitter, m.wechat, m.facebook, m.instagram, m.social_link,
                   m.is_approved, m.is_admin, m.member_type, m.created_at, m.updated_at
            FROM event_attendance viewer
            JOIN event_attendance attendee
              ON attendee.event_id = viewer.event_id
             AND attendee.payment_status = 'paid'
            JOIN members m ON m.id = attendee.member_id
            WHERE viewer.member_id = ${ctx.memberId}
              AND viewer.payment_status = 'paid'
              AND m.is_approved = true
            ORDER BY m.created_at DESC`;
    },

    async 'members.get'({ id }, ctx) {
        if (!id) return null;
        const rows = ctx.isAdmin
            ? await sql`
                SELECT id, email, first_name, last_name, age, company, role, industry,
                       bio, website, websites, profile_photo, whatsapp, zalo, telegram,
                       linkedin, twitter, wechat, facebook, instagram, social_link,
                       is_approved, is_admin, member_type, created_at, updated_at
                FROM members WHERE id = ${id} LIMIT 1`
            : await sql`
                SELECT DISTINCT m.id, m.email, m.first_name, m.last_name, m.age,
                       m.company, m.role, m.industry, m.bio, m.website, m.websites,
                       m.profile_photo, m.whatsapp, m.zalo, m.telegram, m.linkedin,
                       m.twitter, m.wechat, m.facebook, m.instagram, m.social_link,
                       m.is_approved, m.is_admin, m.member_type, m.created_at, m.updated_at
                FROM members m
                WHERE m.id = ${id}
                  AND (
                    m.id = ${ctx.memberId}
                    OR EXISTS (
                      SELECT 1
                      FROM event_attendance mine
                      JOIN event_attendance theirs ON theirs.event_id = mine.event_id
                      WHERE mine.member_id = ${ctx.memberId}
                        AND mine.payment_status = 'paid'
                        AND theirs.member_id = m.id
                        AND theirs.payment_status = 'paid'
                    )
                  )
                LIMIT 1`;
        return rows[0] || null;
    },

    // Admin-gated (see ADMIN_ACTIONS). Accepts a PLAINTEXT `password` and hashes
    // it server-side with bcrypt — the browser never sends or receives a hash.
    // A pre-hashed `password_hash` in the payload is IGNORED (never trusted).
    async 'members.create'(p) {
        // Hash the plaintext password server-side (if provided). Any client-sent
        // `password_hash` is deliberately dropped so the browser can't inject one.
        const passwordHash = (typeof p.password === 'string' && p.password.length)
            ? await hashPassword(p.password)
            : null;
        const isAdmin = p.is_admin === true;
        const isApproved = p.is_approved ?? true;
        const mustReset = p.must_reset_password === true;

        const rows = await sql`
            INSERT INTO members
                (id, email, first_name, last_name, company, role, industry,
                 is_approved, is_admin, password_hash, must_reset_password)
            VALUES
                (COALESCE(${p.id || null}, gen_random_uuid()), ${p.email}, ${p.first_name || ''},
                 ${p.last_name || ''}, ${p.company || null}, ${p.role || null}, ${p.industry || null},
                 ${isApproved}, ${isAdmin}, ${passwordHash}, ${mustReset})
            ON CONFLICT (email) DO UPDATE SET
                first_name = EXCLUDED.first_name,
                last_name  = EXCLUDED.last_name,
                company    = EXCLUDED.company,
                role       = EXCLUDED.role,
                industry   = EXCLUDED.industry,
                is_admin   = EXCLUDED.is_admin,
                is_approved = EXCLUDED.is_approved,
                -- Only overwrite the password when a new one was supplied.
                password_hash = COALESCE(EXCLUDED.password_hash, members.password_hash),
                must_reset_password = EXCLUDED.must_reset_password
            RETURNING *`;
        return rows[0] || null;
    },

    async 'members.update'({ id, profile }, ctx) {
        const targetId = ctx.isAdmin ? id : ctx.memberId;
        if (!targetId) return null;
        const p = profile || {};
        const rows = await sql`
            UPDATE members SET
                first_name = COALESCE(${p.firstName ?? null}, first_name),
                last_name  = COALESCE(${p.lastName ?? null}, last_name),
                bio        = COALESCE(${p.bio ?? null}, bio),
                company    = COALESCE(${p.company ?? null}, company),
                role       = COALESCE(${p.role ?? null}, role),
                industry   = COALESCE(${p.industry ?? null}, industry),
                website    = COALESCE(${p.website ?? null}, website),
                websites   = CASE WHEN ${Array.isArray(p.websites)} THEN ${Array.isArray(p.websites) ? JSON.stringify(p.websites) : null}::jsonb ELSE websites END,
                profile_photo = CASE WHEN ${Object.prototype.hasOwnProperty.call(p, 'profilePhoto')} THEN ${p.profilePhoto ?? null} ELSE profile_photo END,
                whatsapp   = COALESCE(${p.whatsapp ?? null}, whatsapp),
                zalo       = COALESCE(${p.zalo ?? null}, zalo),
                telegram   = COALESCE(${p.telegram ?? null}, telegram),
                linkedin   = COALESCE(${p.linkedin ?? null}, linkedin),
                twitter    = COALESCE(${p.twitter ?? null}, twitter),
                wechat     = COALESCE(${p.wechat ?? null}, wechat),
                facebook   = COALESCE(${p.facebook ?? null}, facebook),
                instagram  = COALESCE(${p.instagram ?? null}, instagram)
            WHERE id = ${targetId}
            RETURNING *`;
        return rows[0] || null;
    },

    // ---------- APPLICATIONS ----------
    // Public: anyone may submit. Upsert on email (re-submit updates pending row).
    async 'applications.create'(p) {
        const rows = await sql`
            INSERT INTO applications
                (first_name, last_name, email, age, social_link, company, role, industry,
                 revenue, team_size, biggest_challenge, unique_value, goals_12_month, why_join,
                 referral, referrer_name, event_interest, membership_type)
            VALUES
                (${p.firstName || ''}, ${p.lastName || '-'}, ${String(p.email || '').toLowerCase()},
                 ${p.age || null}, ${p.socialLink || null}, ${p.company || null}, ${p.role || null},
                 ${p.industry || null}, ${p.revenue || null}, ${p.teamSize || null},
                 ${p.biggestChallenge || null}, ${p.uniqueValue || null}, ${p.goals12Month || null},
                 ${p.whyJoin || null}, ${p.referral || null}, ${p.referrerName || null},
                 ${p.event || null}, ${p.membership || null})
            ON CONFLICT (email) DO UPDATE SET
                first_name = EXCLUDED.first_name,
                last_name  = EXCLUDED.last_name,
                company    = EXCLUDED.company,
                role       = EXCLUDED.role,
                industry   = EXCLUDED.industry,
                revenue    = EXCLUDED.revenue,
                team_size  = EXCLUDED.team_size
            RETURNING *`;
        return rows[0] || null;
    },

    // Admin-gated.
    async 'applications.list'({ status } = {}) {
        await expireOverdueReservations(sql);
        if (status) {
            const rows = await sql`
                SELECT a.*, e.name AS event_name, e.max_attendees,
                       po.id AS payment_order_id, po.status AS order_status,
                       po.ticket_count AS reserved_ticket_count, po.expires_at AS payment_expires_at,
                       po.paid_provider, po.paid_at AS order_paid_at,
                       m.id AS existing_member_id, m.account_status AS existing_account_status,
                       m.last_login_at, COALESCE(m.login_count, 0)::int AS login_count,
                       m.login_tracking_started_at,
                       (m.id IS NOT NULL) AS has_existing_account,
                       latest_email.email_type AS latest_email_type,
                       latest_email.provider_email_id AS latest_email_provider_id,
                       latest_email.status AS latest_email_status,
                       latest_email.sent_at AS latest_email_sent_at,
                       latest_email.event_at AS latest_email_event_at,
                       latest_email.error AS latest_email_error,
                       COALESCE(email_activity.email_opened, false) AS email_opened,
                       COALESCE(email_activity.email_clicked, false) AS email_clicked,
                       COALESCE(email_activity.email_tracking_available, false) AS email_tracking_available
                FROM applications a
                LEFT JOIN events e ON e.id = a.event_id
                LEFT JOIN payment_orders po ON po.application_id = a.id
                LEFT JOIN members m ON LOWER(m.email) = LOWER(a.email)
                LEFT JOIN LATERAL (
                    SELECT ed.provider_email_id, ed.email_type, ed.status, ed.sent_at, ed.event_at, ed.error
                    FROM email_deliveries ed WHERE ed.application_id = a.id
                    ORDER BY ed.updated_at DESC LIMIT 1
                ) latest_email ON true
                LEFT JOIN LATERAL (
                    SELECT BOOL_OR(ed.status IN ('opened', 'clicked') OR EXISTS (
                               SELECT 1 FROM email_webhook_events ewe
                               WHERE ewe.provider_email_id = ed.provider_email_id
                                 AND ewe.event_type IN ('email.opened', 'email.clicked')
                           )) AS email_opened,
                           BOOL_OR(ed.status = 'clicked' OR EXISTS (
                               SELECT 1 FROM email_webhook_events ewe
                               WHERE ewe.provider_email_id = ed.provider_email_id
                                 AND ewe.event_type = 'email.clicked'
                           )) AS email_clicked,
                           BOOL_OR(ed.engagement_tracking_enabled) AS email_tracking_available
                    FROM email_deliveries ed WHERE ed.application_id = a.id
                ) email_activity ON true
                WHERE a.status = ${status} ORDER BY a.created_at DESC`;
            return await syncResendStatuses(rows, { sql });
        }
        const rows = await sql`
            SELECT a.*, e.name AS event_name, e.max_attendees,
                   po.id AS payment_order_id, po.status AS order_status,
                   po.ticket_count AS reserved_ticket_count, po.expires_at AS payment_expires_at,
                   po.paid_provider, po.paid_at AS order_paid_at,
                   m.id AS existing_member_id, m.account_status AS existing_account_status,
                   m.last_login_at, COALESCE(m.login_count, 0)::int AS login_count,
                   m.login_tracking_started_at,
                   (m.id IS NOT NULL) AS has_existing_account,
                   latest_email.email_type AS latest_email_type,
                   latest_email.provider_email_id AS latest_email_provider_id,
                   latest_email.status AS latest_email_status,
                   latest_email.sent_at AS latest_email_sent_at,
                   latest_email.event_at AS latest_email_event_at,
                   latest_email.error AS latest_email_error,
                   COALESCE(email_activity.email_opened, false) AS email_opened,
                   COALESCE(email_activity.email_clicked, false) AS email_clicked,
                   COALESCE(email_activity.email_tracking_available, false) AS email_tracking_available
            FROM applications a
            LEFT JOIN events e ON e.id = a.event_id
            LEFT JOIN payment_orders po ON po.application_id = a.id
            LEFT JOIN members m ON LOWER(m.email) = LOWER(a.email)
            LEFT JOIN LATERAL (
                SELECT ed.provider_email_id, ed.email_type, ed.status, ed.sent_at, ed.event_at, ed.error
                FROM email_deliveries ed WHERE ed.application_id = a.id
                ORDER BY ed.updated_at DESC LIMIT 1
            ) latest_email ON true
            LEFT JOIN LATERAL (
                SELECT BOOL_OR(ed.status IN ('opened', 'clicked') OR EXISTS (
                           SELECT 1 FROM email_webhook_events ewe
                           WHERE ewe.provider_email_id = ed.provider_email_id
                             AND ewe.event_type IN ('email.opened', 'email.clicked')
                       )) AS email_opened,
                       BOOL_OR(ed.status = 'clicked' OR EXISTS (
                           SELECT 1 FROM email_webhook_events ewe
                           WHERE ewe.provider_email_id = ed.provider_email_id
                             AND ewe.event_type = 'email.clicked'
                       )) AS email_clicked,
                       BOOL_OR(ed.engagement_tracking_enabled) AS email_tracking_available
                FROM email_deliveries ed WHERE ed.application_id = a.id
            ) email_activity ON true
            ORDER BY a.created_at DESC`;
        return await syncResendStatuses(rows, { sql });
    },

    async 'applications.get'({ id, email } = {}) {
        if (id) {
            const rows = await sql`SELECT * FROM applications WHERE id = ${id} LIMIT 1`;
            return rows[0] || null;
        }
        if (email) {
            const rows = await sql`SELECT * FROM applications WHERE email = ${String(email).toLowerCase()} LIMIT 1`;
            return rows[0] || null;
        }
        return null;
    },

    // ---------- EVENTS ----------
    async 'events.list'({ status } = {}) {
        if (status) {
            return await sql`
                SELECT e.*,
                    COALESCE((SELECT SUM(ea.seat_count) FROM event_attendance ea WHERE ea.event_id = e.id AND ea.payment_status IN ('preparing', 'awaiting', 'paid')), 0)::int AS reserved_seats,
                    COALESCE((SELECT SUM(ea.seat_count) FROM event_attendance ea WHERE ea.event_id = e.id AND ea.payment_status = 'paid'), 0)::int AS paid_seats
                FROM events e WHERE e.status = ${status} ORDER BY e.event_date ASC`;
        }
        return await sql`
            SELECT e.*,
                COALESCE((SELECT SUM(ea.seat_count) FROM event_attendance ea WHERE ea.event_id = e.id AND ea.payment_status IN ('preparing', 'awaiting', 'paid')), 0)::int AS reserved_seats,
                COALESCE((SELECT SUM(ea.seat_count) FROM event_attendance ea WHERE ea.event_id = e.id AND ea.payment_status = 'paid'), 0)::int AS paid_seats
            FROM events e ORDER BY e.event_date ASC`;
    },

    async 'events.getBySlug'({ slug }) {
        if (!slug) return null;
        const rows = await sql`SELECT * FROM events WHERE slug = ${slug} LIMIT 1`;
        return rows[0] || null;
    },

    async 'eventRegistration.status'({ slug }, ctx) {
        if (!ctx.memberId) throw new Error('Not authenticated');
        if (!slug) throw new Error('Missing event');
        await expireOverdueReservations(sql, ctx.memberId);
        const eventRows = await sql`
            SELECT e.*, m.email
            FROM events e CROSS JOIN members m
            WHERE e.slug = ${slug} AND m.id = ${ctx.memberId}
            LIMIT 1`;
        const event = eventRows[0];
        if (!event) return null;

        const orderRows = await sql`
            SELECT po.*, a.payment_link, a.guest_name, e.name AS event_name,
                   e.event_date, e.event_time, e.location AS event_location,
                   e.venue_name AS event_venue_name, e.venue_address AS event_venue_address
            FROM payment_orders po
            JOIN applications a ON a.id = po.application_id
            JOIN events e ON e.id = po.event_id
            WHERE po.member_id = ${ctx.memberId}
              AND po.event_id = ${event.id}
              AND (po.status = 'paid' OR (po.status IN ('pending', 'preparing') AND po.expires_at > NOW()))
            ORDER BY CASE WHEN po.status = 'pending' THEN 0 WHEN po.status = 'preparing' THEN 1 ELSE 2 END,
                     po.created_at DESC`;
        const pendingApplicationRows = await sql`
            SELECT id, ticket_count, guest_name, created_at
            FROM applications a
            WHERE a.event_id = ${event.id}
              AND LOWER(a.email) = LOWER(${event.email})
              AND a.status = 'pending'
              AND NOT EXISTS (SELECT 1 FROM payment_orders po WHERE po.application_id = a.id)
            ORDER BY a.created_at DESC`;

        const activeOrders = orderRows.map(publicPaymentOrder);
        const orderTickets = activeOrders.reduce((sum, order) => sum + Number(order.ticketCount || 0), 0);
        const pendingReviewTickets = pendingApplicationRows.reduce((sum, app) => sum + Number(app.ticket_count || 0), 0);
        const totalTickets = Math.min(2, orderTickets + pendingReviewTickets);
        return {
            eventId: event.id,
            activeOrders,
            pendingApplications: pendingApplicationRows.map(app => ({
                id: app.id,
                ticketCount: Number(app.ticket_count || 0),
                guestName: app.guest_name,
                createdAt: app.created_at
            })),
            paidTickets: activeOrders.filter(order => order.status === 'paid').reduce((sum, order) => sum + Number(order.ticketCount || 0), 0),
            pendingPaymentTickets: activeOrders.filter(order => ['pending', 'preparing'].includes(order.status)).reduce((sum, order) => sum + Number(order.ticketCount || 0), 0),
            pendingReviewTickets,
            totalTickets,
            remainingTickets: Math.max(0, 2 - totalTickets)
        };
    },

    async 'events.past'() {
        return await sql`SELECT * FROM events WHERE status = 'completed' ORDER BY event_date DESC`;
    },

    // Admin-gated.
    async 'events.create'(p) {
        if (!p.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)) throw new Error('Event slug must use lowercase letters, numbers, and hyphens');
        if (!p.name || !p.date) throw new Error('Event name and date are required');
        if (Number(p.capacity) < 1) throw new Error('Capacity must be at least 1');
        const rows = await sql`
            INSERT INTO events
                (slug, name, event_date, event_time, location, venue_name, venue_address, description,
                 dinner_price, max_attendees, status)
            VALUES
                (${p.slug}, ${p.name}, ${p.date}, ${p.time || '18:00'}, ${p.location || null},
                 ${p.venueName || p.venue_name || null}, ${p.venueAddress || p.venue_address || null}, ${p.description || null},
                 ${Number(p.price || 150)},
                 ${Number(p.capacity)}, ${p.status || 'open'})
            RETURNING *`;
        return rows[0] || null;
    },

    async 'events.update'(p) {
        if (!p.id) throw new Error('Missing event');
        if (!p.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)) throw new Error('Event slug must use lowercase letters, numbers, and hyphens');
        if (!p.name || !p.date) throw new Error('Event name and date are required');
        if (Number(p.capacity) < 1) throw new Error('Capacity must be at least 1');
        const rows = await sql`
            UPDATE events SET slug = ${p.slug}, name = ${p.name}, event_date = ${p.date},
                event_time = ${p.time || '18:00'}, location = ${p.location || null},
                venue_name = ${p.venueName || p.venue_name || null}, venue_address = ${p.venueAddress || p.venue_address || null},
                description = ${p.description || null}, dinner_price = ${Number(p.price || 150)},
                max_attendees = ${Number(p.capacity)}, status = ${p.status || 'open'}
            WHERE id = ${p.id} RETURNING *`;
        if (!rows[0]) throw new Error('Event not found');
        return rows[0];
    },

    async 'events.delete'({ id }) {
        if (!id) throw new Error('Missing event');
        const dependencies = await sql`
            SELECT
              (SELECT COUNT(*)::int FROM applications WHERE event_id = ${id}) AS applications,
              (SELECT COUNT(*)::int FROM event_attendance WHERE event_id = ${id}) AS attendance`;
        if (Number(dependencies[0]?.applications || 0) > 0 || Number(dependencies[0]?.attendance || 0) > 0) {
            throw new Error('This event has applications or registrations. Close it instead of deleting it.');
        }
        const rows = await sql`DELETE FROM events WHERE id = ${id} RETURNING id`;
        if (!rows[0]) throw new Error('Event not found');
        return { id: rows[0].id, deleted: true };
    },

    // ---------- EVENT ATTENDANCE ----------
    async 'attendance.byEvent'({ eventId }, ctx) {
        // Returns the member rows for attendees of an event.
        if (!eventId) return [];
        return await sql`
            SELECT m.id, m.email, m.first_name, m.last_name, m.company, m.role,
                   m.industry, m.bio, m.website, m.websites, m.profile_photo,
                   m.whatsapp, m.zalo, m.telegram, m.linkedin, m.twitter,
                   m.wechat, m.facebook, m.instagram, m.social_link
            FROM event_attendance a
            JOIN members m ON m.id = a.member_id
            WHERE a.event_id = ${eventId}
              AND a.payment_status = 'paid'
              AND (
                ${ctx.isAdmin} = true
                OR EXISTS (
                  SELECT 1 FROM event_attendance viewer
                  WHERE viewer.event_id = a.event_id
                    AND viewer.member_id = ${ctx.memberId}
                    AND viewer.payment_status = 'paid'
                )
              )`;
    },

    async 'attendance.adminCheckinList'({ eventId }) {
        if (!eventId) throw new Error('Missing event');
        return await sql`
            SELECT ea.id AS attendance_id, ea.event_id, ea.ticket_type, ea.seat_count,
                   ea.guest_name, ea.meal_option, ea.guest_meal_option,
                   ea.meal_order, ea.meal_subtotal_vnd, ea.meal_vat_vnd,
                   ea.meal_service_vnd, ea.meal_total_vnd, ea.meal_credit_vnd,
                   ea.meal_amount_due_vnd, ea.meal_submitted_at, ea.meal_updated_at,
                   ea.approved_at, ea.paid_at, ea.payment_status, ea.checked_in, ea.checked_in_at,
                   m.id AS member_id, m.first_name, m.last_name, m.email,
                   m.age, m.company, m.role, m.industry, m.bio, m.website, m.websites, m.profile_photo,
                   m.whatsapp, m.zalo, m.telegram, m.linkedin, m.twitter, m.wechat,
                   m.facebook, m.instagram, m.social_link, m.member_type, m.account_status,
                   e.name AS event_name, e.event_date, e.event_time, e.location,
                   e.venue_name, e.venue_address,
                   po.id AS payment_order_id, po.paid_provider,
                   po.provider_transaction_id, po.paid_amount, po.paid_currency,
                   po.base_amount_usd, po.airwallex_fee_usd, po.airwallex_total_usd,
                   po.sepay_amount_vnd, po.sepay_code, po.status AS payment_order_status,
                   po.expires_at AS payment_expires_at, po.created_at AS order_created_at,
                   COALESCE(email_summary.status,
                     CASE WHEN po.confirmation_email_sent_at IS NOT NULL OR po.reminder_sent_at IS NOT NULL OR a.approval_email_sent_at IS NOT NULL THEN 'sent' ELSE 'not_sent' END) AS email_status,
                   COALESCE(email_summary.email_type,
                     CASE WHEN po.confirmation_email_sent_at IS NOT NULL THEN 'payment_confirmation' WHEN po.reminder_sent_at IS NOT NULL THEN 'payment_reminder' WHEN a.approval_email_sent_at IS NOT NULL THEN 'approval' END) AS email_type,
                   COALESCE(email_summary.sent_at, po.confirmation_email_sent_at, po.reminder_sent_at, a.approval_email_sent_at) AS email_sent_at,
                   email_summary.event_at AS email_status_at, email_summary.error AS email_error,
                   a.id AS application_id, a.status AS application_status,
                   a.payment_status AS application_payment_status, a.ticket_count AS requested_ticket_count,
                   a.accepted_at, a.reviewed_at, a.created_at AS applied_at,
                   a.revenue, a.team_size, a.company_link,
                   a.looking_for, a.can_offer, a.what_you_do, a.biggest_challenge,
                   a.unique_value, a.goals_12_month, a.why_join, a.referral,
                   a.referrer_name, a.membership_type, a.page_language
            FROM event_attendance ea
            JOIN members m ON m.id = ea.member_id
            JOIN events e ON e.id = ea.event_id
            LEFT JOIN applications a ON a.id = ea.application_id
            LEFT JOIN payment_orders po ON po.application_id = ea.application_id
            LEFT JOIN LATERAL (
              SELECT ed.status, ed.email_type, ed.sent_at, ed.event_at, ed.error
              FROM email_deliveries ed
              WHERE ed.event_id = ea.event_id AND ed.member_id = ea.member_id
              ORDER BY ed.event_at DESC NULLS LAST, ed.sent_at DESC
              LIMIT 1
            ) email_summary ON true
            WHERE ea.event_id = ${eventId} AND ea.payment_status = 'paid'
            ORDER BY LOWER(m.last_name), LOWER(m.first_name), ea.paid_at ASC`;
    },

    async 'attendance.checkIn'({ eventId, reference, checkedIn = true }, ctx) {
        const ref = String(reference || '').trim().replace(/^FVN:/i, '');
        if (!eventId || !ref) throw new Error('Event and ticket reference are required');
        const rows = await sql`
            UPDATE event_attendance ea SET
                checked_in = ${Boolean(checkedIn)},
                checked_in_at = CASE WHEN ${Boolean(checkedIn)} THEN NOW() ELSE NULL END
            FROM payment_orders po, members m
            WHERE ea.application_id = po.application_id
              AND ea.member_id = m.id
              AND ea.event_id = ${eventId}
              AND ea.payment_status = 'paid'
              AND (ea.id::text = ${ref} OR po.id::text = ${ref} OR UPPER(po.sepay_code) = UPPER(${ref}))
            RETURNING ea.id AS attendance_id, ea.checked_in, ea.checked_in_at,
                      m.first_name, m.last_name, m.email, po.id AS booking_reference`;
        if (!rows[0]) throw new Error('No paid ticket matching this reference was found for this event');
        return rows[0];
    },

    async 'attendance.check'({ eventId }, ctx) {
        if (!ctx.memberId || !eventId) return false;
        const rows = await sql`
            SELECT id FROM event_attendance
            WHERE event_id = ${eventId} AND member_id = ${ctx.memberId}
              AND payment_status = 'paid' LIMIT 1`;
        return rows.length > 0;
    },

    async 'attendance.register'({ eventId, ticketType }, ctx) {
        const memberId = ctx.memberId;
        if (!memberId) throw new Error('Not authenticated');
        if (!eventId) throw new Error('Missing event');
        const rows = await sql`
            INSERT INTO event_attendance (event_id, member_id, ticket_type, payment_status, paid_at)
            VALUES (${eventId}, ${memberId}, ${ticketType || 'dinner'}, 'pending', NULL)
            ON CONFLICT (event_id, member_id) DO UPDATE SET
                ticket_type = EXCLUDED.ticket_type,
                payment_status = CASE WHEN event_attendance.payment_status = 'paid' THEN 'paid' ELSE 'pending' END
            RETURNING *`;
        return rows[0] || null;
    },

    // ---------- PAYMENT STATUS ----------
    async 'payments.current'({ orderId } = {}, ctx) {
        await expireOverdueReservations(sql, ctx.memberId);
        const rows = orderId
            ? await sql`
                SELECT po.*, a.payment_link, a.guest_name, e.slug AS event_slug, e.name AS event_name,
                       e.event_date, e.event_time, e.location AS event_location,
                       e.venue_name AS event_venue_name, e.venue_address AS event_venue_address
                FROM payment_orders po
                JOIN applications a ON a.id = po.application_id
                JOIN events e ON e.id = po.event_id
                WHERE po.id = ${orderId} AND po.member_id = ${ctx.memberId} LIMIT 1`
            : await sql`
                SELECT po.*, a.payment_link, a.guest_name, e.slug AS event_slug, e.name AS event_name,
                       e.event_date, e.event_time, e.location AS event_location,
                       e.venue_name AS event_venue_name, e.venue_address AS event_venue_address
                FROM payment_orders po
                JOIN applications a ON a.id = po.application_id
                JOIN events e ON e.id = po.event_id
                WHERE po.member_id = ${ctx.memberId}
                ORDER BY po.created_at DESC LIMIT 1`;
        return publicPaymentOrder(rows[0]);
    },

    async 'payments.list'(_payload, ctx) {
        await expireOverdueReservations(sql, ctx.memberId);
        const rows = await sql`
            SELECT po.*, a.payment_link, a.guest_name, e.slug AS event_slug, e.name AS event_name,
                   e.event_date, e.event_time, e.location AS event_location,
                   e.venue_name AS event_venue_name, e.venue_address AS event_venue_address,
                   ea.meal_order, ea.meal_subtotal_vnd, ea.meal_vat_vnd,
                   ea.meal_service_vnd, ea.meal_total_vnd, ea.meal_credit_vnd,
                   ea.meal_amount_due_vnd, ea.meal_submitted_at, ea.meal_updated_at
            FROM payment_orders po
            JOIN applications a ON a.id = po.application_id
            JOIN events e ON e.id = po.event_id
            LEFT JOIN event_attendance ea ON ea.application_id = po.application_id
              AND ea.member_id = po.member_id AND ea.event_id = po.event_id
            WHERE po.member_id = ${ctx.memberId}
            ORDER BY e.event_date DESC, po.created_at DESC`;
        return rows.map(publicPaymentOrder);
    },

    async 'payments.ensureAirwallexCheckout'({ orderId }, ctx) {
        if (!orderId) throw new Error('Missing payment order');
        if (!paymentProviderEnabled('airwallex') || !airwallexConfigured()) {
            throw new Error('Airwallex sandbox is not configured');
        }
        const rows = await sql`
            SELECT po.*, e.name AS event_name, m.email, m.first_name, m.last_name
            FROM payment_orders po JOIN events e ON e.id = po.event_id JOIN members m ON m.id = po.member_id
            WHERE po.id = ${orderId} AND po.member_id = ${ctx.memberId}
              AND po.status = 'pending' AND po.expires_at > NOW() LIMIT 1`;
        const order = rows[0];
        if (!order) throw new Error('No active pending reservation found');
        if (order.provider_environment !== paymentEnvironment()) throw new Error('Payment environment mismatch');
        const createdAt = order.airwallex_intent_created_at && new Date(order.airwallex_intent_created_at).getTime();
        if (order.airwallex_intent_id && order.airwallex_client_secret_encrypted && createdAt > Date.now() - 50 * 60 * 1000) {
            return { intentId:order.airwallex_intent_id, clientSecret:decrypt(order.airwallex_client_secret_encrypted),
                currency:'USD', environment:order.provider_environment === 'production' ? 'prod' : 'demo' };
        }
        const configuredUrl = String(process.env.URL || '');
        const publicBase = configuredUrl.startsWith('https://') ? configuredUrl : 'https://foundersvn.com';
        const intent = await createPaymentIntent({
            amount:Number(order.airwallex_total_usd), currency:'USD', orderId:order.id,
            requestId:crypto.randomUUID(), returnUrl:`${publicBase}/payment-success?order=${order.id}`,
            customer:{ email:order.email, firstName:order.first_name, lastName:order.last_name }
        });
        await sql`UPDATE payment_orders SET airwallex_intent_id = ${intent.id},
            airwallex_client_secret_encrypted = ${encrypt(intent.clientSecret)},
            airwallex_intent_created_at = NOW(), updated_at = NOW() WHERE id = ${order.id}`;
        return { intentId:intent.id, clientSecret:intent.clientSecret, currency:'USD',
            environment:order.provider_environment === 'production' ? 'prod' : 'demo' };
    },

    // ---------- MEAL SELECTION (paid registrations only) ----------
    async 'meals.get'({ orderId } = {}, ctx) {
        if (!orderId) throw new Error('Choose a paid ticket before selecting a meal');
        const rows = await sql`
            SELECT ea.meal_option, ea.guest_meal_option, ea.guest_name, ea.seat_count,
                   ea.meal_order, ea.meal_subtotal_vnd, ea.meal_vat_vnd,
                   ea.meal_service_vnd, ea.meal_total_vnd, ea.meal_credit_vnd,
                   ea.meal_amount_due_vnd, ea.meal_submitted_at, ea.meal_updated_at,
                   ea.id AS attendance_id, po.id AS payment_order_id,
                   e.id AS event_id, e.name AS event_name, e.event_date
            FROM event_attendance ea
            JOIN payment_orders po ON po.event_id = ea.event_id
              AND po.member_id = ea.member_id
            JOIN events e ON e.id = ea.event_id
            WHERE po.id = ${orderId} AND po.member_id = ${ctx.memberId}
              AND po.status = 'paid' AND ea.payment_status = 'paid'
            LIMIT 1`;
        return rows[0] || null;
    },

    async 'meals.update'({ orderId, items, notes }, ctx) {
        const current = await handlers['meals.get']({ orderId }, ctx);
        if (!current) throw new Error('A paid event registration is required');
        // Never trust prices or totals sent by the browser. Rebuild every line
        // from the canonical menu before persisting the restaurant preorder.
        const order = normalizeMealOrder(items || [], MEAL_CREDIT_VND, notes || '');
        const rows = await sql`
            UPDATE event_attendance SET
                meal_order = ${JSON.stringify(order)}::jsonb,
                meal_subtotal_vnd = ${order.subtotalVnd},
                meal_vat_vnd = ${order.vatVnd},
                meal_service_vnd = ${order.serviceVnd},
                meal_total_vnd = ${order.totalVnd},
                meal_credit_vnd = ${order.creditVnd},
                meal_amount_due_vnd = ${order.amountDueVnd},
                meal_submitted_at = COALESCE(meal_submitted_at, NOW()),
                meal_updated_at = NOW()
            WHERE id = ${current.attendance_id}
            RETURNING meal_option, guest_meal_option, guest_name, seat_count,
                meal_order, meal_subtotal_vnd, meal_vat_vnd, meal_service_vnd,
                meal_total_vnd, meal_credit_vnd, meal_amount_due_vnd,
                meal_submitted_at, meal_updated_at`;
        return rows[0] || null;
    },

    // ---------- EVENT PHOTOS ----------
    async 'event_photos.list'({ eventId }) {
        if (!eventId) return [];
        return await sql`
            SELECT * FROM event_photos
            WHERE event_id = ${eventId}
            ORDER BY display_order ASC`;
    },

    // Admin-gated.
    async 'event_photos.add'({ eventId, photoUrl, caption, uploadedBy }) {
        const rows = await sql`
            INSERT INTO event_photos (event_id, photo_url, caption, uploaded_by)
            VALUES (${eventId}, ${photoUrl}, ${caption || ''}, ${uploadedBy || null})
            RETURNING *`;
        return rows[0] || null;
    },

    // ---------- TRANSACTIONS ----------
    async 'transactions.create'(p, ctx) {
        const rows = await sql`
            INSERT INTO transactions
                (id, user_id, user_email, user_name, amount, currency, status,
                 payment_intent_id, payment_method, product_id, product_name,
                 event_id, error_message, metadata)
            VALUES
                (${p.id}, ${ctx.memberId || p.user_id || null}, ${ctx.email || p.user_email || null}, ${p.user_name || null},
                 ${p.amount || null}, ${p.currency || 'USD'}, 'attempted',
                 ${p.payment_intent_id || null}, ${p.payment_method || 'card'},
                 ${p.product_id || null}, ${p.product_name || null}, ${p.event_id || null},
                 ${p.error_message || null}, ${JSON.stringify(p.metadata || {})}::jsonb)
            ON CONFLICT (id) DO UPDATE SET
                status = EXCLUDED.status,
                updated_at = NOW()
            RETURNING *`;
        return rows[0] || null;
    },

    async 'transactions.updateStatus'({ id, status, errorMessage }) {
        const rows = await sql`
            UPDATE transactions SET
                status = ${status},
                error_message = COALESCE(${errorMessage ?? null}, error_message),
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING *`;
        return rows[0] || null;
    },

    async 'transactions.byUser'(_payload, ctx) {
        if (!ctx.memberId) return [];
        return await sql`SELECT * FROM transactions WHERE user_id = ${ctx.memberId} ORDER BY created_at DESC`;
    },

    async 'transactions.byEmail'(_payload, ctx) {
        if (!ctx.email) return [];
        return await sql`SELECT * FROM transactions WHERE user_email = ${ctx.email} ORDER BY created_at DESC`;
    },

    async 'transactions.all'({ limit } = {}) {
        const lim = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 1000);
        return await sql`SELECT * FROM transactions ORDER BY created_at DESC LIMIT ${lim}`;
    },

    // ---------- BOOKINGS ----------
    async 'bookings.create'(p, ctx) {
        const rows = await sql`
            INSERT INTO bookings
                (id, user_id, user_email, user_name, event_id, ticket_type, ticket_name,
                 ticket_price, transaction_id, payment_status, booking_status)
            VALUES
                (${p.id}, ${ctx.memberId || p.user_id || null}, ${ctx.email || p.user_email || null}, ${p.user_name || null},
                 ${p.event_id || null}, ${p.ticket_type || null}, ${p.ticket_name || null},
                 ${p.ticket_price || null}, ${p.transaction_id || null},
                 'pending', 'pending_payment')
            ON CONFLICT (id) DO NOTHING
            RETURNING *`;
        return rows[0] || null;
    },

    async 'bookings.byUser'(_payload, ctx) {
        if (!ctx.memberId) return [];
        return await sql`SELECT * FROM bookings WHERE user_id = ${ctx.memberId} ORDER BY created_at DESC`;
    },

    async 'bookings.get'({ id }, ctx) {
        if (!id) return null;
        const rows = ctx.isAdmin
            ? await sql`SELECT * FROM bookings WHERE id = ${id} LIMIT 1`
            : await sql`
                SELECT * FROM bookings
                WHERE id = ${id}
                  AND (user_id = ${ctx.memberId} OR user_email = ${ctx.email || ''})
                LIMIT 1`;
        return rows[0] || null;
    },

    async 'bookings.latest'(_payload, ctx) {
        if (!ctx.memberId && !ctx.email) return null;
        const rows = await sql`
            SELECT * FROM bookings
            WHERE user_id = ${ctx.memberId || ''} OR user_email = ${ctx.email || ''}
            ORDER BY created_at DESC
            LIMIT 1`;
        return rows[0] || null;
    },

    async 'bookings.byEmail'(_payload, ctx) {
        if (!ctx.email) return [];
        return await sql`SELECT * FROM bookings WHERE user_email = ${ctx.email} ORDER BY created_at DESC`;
    },

    async 'bookings.byEvent'({ eventId }) {
        if (!eventId) return [];
        return await sql`SELECT * FROM bookings WHERE event_id = ${eventId} ORDER BY created_at DESC`;
    },

    async 'bookings.all'({ limit } = {}) {
        const lim = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 1000);
        return await sql`SELECT * FROM bookings ORDER BY created_at DESC LIMIT ${lim}`;
    },

    async 'bookings.stats'({ eventId }) {
        if (!eventId) return { dinner: 0, cruise: 0, total: 0 };
        const rows = await sql`
            SELECT ticket_type FROM bookings
            WHERE event_id = ${eventId} AND booking_status = 'confirmed'`;
        const dinner = rows.filter(b => b.ticket_type === 'dinner').length;
        const cruise = rows.filter(b => b.ticket_type === 'cruise' || b.ticket_type === 'full').length;
        return { dinner, cruise, total: rows.length };
    },

    // ---------- MESSAGES (member-gated; sender = ctx.memberId from the JWT) ----------
    async 'messages.send'({ toId, body }, ctx) {
        const from = ctx && ctx.memberId;
        if (!from) throw new Error('Not authenticated');
        const to = toId;
        const text = String(body || '').trim();
        if (!to) throw new Error('Missing recipient');
        if (!text) throw new Error('Message body is empty');
        if (to === from) throw new Error('Cannot message yourself');
        const rows = await sql`
            INSERT INTO messages (from_member, to_member, body)
            SELECT ${from}, ${to}, ${text}
            WHERE EXISTS (
                SELECT 1 FROM event_attendance mine
                JOIN event_attendance theirs ON theirs.event_id = mine.event_id
                WHERE mine.member_id = ${from} AND mine.payment_status = 'paid'
                  AND theirs.member_id = ${to} AND theirs.payment_status = 'paid'
            )
            RETURNING *`;
        if (!rows[0]) throw new Error('You can only message paid attendees from your events');
        return rows[0] || null;
    },

    // Full conversation between the current member and `otherId`, oldest first.
    // Side effect: marks the current member's inbound messages from otherId read.
    async 'messages.thread'({ otherId }, ctx) {
        const me = ctx && ctx.memberId;
        if (!me) throw new Error('Not authenticated');
        if (!otherId) return { messages: [], other: null };

        await sql`
            UPDATE messages SET read = true
            WHERE to_member = ${me} AND from_member = ${otherId} AND read = false`;

        const rows = await sql`
            SELECT * FROM messages
            WHERE (from_member = ${me} AND to_member = ${otherId})
               OR (from_member = ${otherId} AND to_member = ${me})
            ORDER BY created_at ASC`;

        const messages = rows.map(r => ({
            id: r.id,
            body: r.body,
            created_at: r.created_at,
            from_me: r.from_member === me
        }));

        const others = await sql`
            SELECT id, first_name, last_name, company FROM members WHERE id = ${otherId} LIMIT 1`;
        const o = others[0] || null;

        return {
            messages,
            other: o ? { id: o.id, firstName: o.first_name, lastName: o.last_name, company: o.company } : null
        };
    },

    // Conversation list for the current member: one entry per counterpart, with
    // the last message + unread count + the counterpart's display info.
    async 'messages.inbox'(_p, ctx) {
        const me = ctx && ctx.memberId;
        if (!me) throw new Error('Not authenticated');

        const rows = await sql`
            SELECT * FROM messages
            WHERE from_member = ${me} OR to_member = ${me}
            ORDER BY created_at DESC`;

        const byOther = new Map();
        for (const r of rows) {
            const otherId = r.from_member === me ? r.to_member : r.from_member;
            if (!byOther.has(otherId)) {
                byOther.set(otherId, {
                    otherId,
                    lastBody: r.body,
                    lastCreatedAt: r.created_at,
                    lastFromMe: r.from_member === me,
                    unreadCount: 0
                });
            }
            // Count unread inbound (to me, from this other, not yet read).
            if (r.to_member === me && r.from_member === otherId && r.read === false) {
                byOther.get(otherId).unreadCount++;
            }
        }

        const otherIds = Array.from(byOther.keys());
        if (otherIds.length) {
            const members = await sql`
                SELECT id, first_name, last_name, company FROM members WHERE id = ANY(${otherIds})`;
            const info = new Map(members.map(m => [m.id, m]));
            for (const conv of byOther.values()) {
                const m = info.get(conv.otherId);
                conv.otherFirstName = m ? m.first_name : '';
                conv.otherLastName = m ? m.last_name : '';
                conv.otherCompany = m ? m.company : '';
            }
        }

        // Most-recent conversation first (map preserves insertion order = DESC).
        return Array.from(byOther.values());
    },

    async 'messages.unreadCount'(_p, ctx) {
        const me = ctx && ctx.memberId;
        if (!me) throw new Error('Not authenticated');
        const rows = await sql`
            SELECT COUNT(*)::int AS n FROM messages
            WHERE to_member = ${me} AND read = false`;
        return { count: rows[0] ? rows[0].n : 0 };
    },

    async 'messages.markRead'({ otherId }, ctx) {
        const me = ctx && ctx.memberId;
        if (!me) throw new Error('Not authenticated');
        if (!otherId) return { ok: true };
        await sql`
            UPDATE messages SET read = true
            WHERE to_member = ${me} AND from_member = ${otherId} AND read = false`;
        return { ok: true };
    }
};

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

    if (!isConfigured()) {
        // No DATABASE_URL — the browser (database.js) treats this as "DB unavailable"
        // and falls back to localStorage. Return a clear, non-500 signal.
        return json(503, { error: 'Database not configured (missing DATABASE_URL)', notConfigured: true });
    }

    let action, payload;
    try {
        const parsed = JSON.parse(event.body || '{}');
        action = parsed.action;
        payload = parsed.payload || {};
    } catch (e) {
        return json(400, { error: 'Invalid JSON body' });
    }

    const handler = handlers[action];
    if (!handler) {
        return json(400, { error: `Unknown action: ${action}` });
    }

    // Resolve the current member from a JWT (if present). Used both for
    // member-gated actions and to authorize admin actions via an admin JWT.
    const token = getBearerToken(event);
    const claims = token ? verifyToken(token) : null;
    const ctx = {
        memberId: claims ? claims.sub : null,
        email: claims ? claims.email : null,
        isAdmin: (claims ? claims.is_admin === true : false) || isAdminRequest(event),
        claims
    };

    // Auth gate for admin-privileged actions: a valid admin JWT OR the shared
    // ADMIN_TOKEN header (backward-compatible / server-to-server).
    if (ADMIN_ACTIONS.has(action)) {
        if (!isAdminRequest(event)) return json(401, { error: 'Unauthorized' });
    }

    // Auth gate for member actions: any valid member JWT. The sender/member id
    // is taken from the token (ctx.memberId), never from the request body.
    if (MEMBER_ACTIONS.has(action)) {
        if (!ctx.memberId && !ctx.isAdmin) return json(401, { error: 'Unauthorized' });
        if (ctx.memberId && !ctx.isAdmin && ctx.claims?.must_reset_password === true && !PENDING_ACCOUNT_ACTIONS.has(action)) {
            return json(403, { error: 'Set a permanent password before using this feature', passwordResetRequired: true });
        }
        if (ctx.memberId && !ctx.isAdmin && ctx.claims?.account_status === 'payment_pending') {
            // Payment-pending sessions can transition to locked while their JWT
            // is still valid, so refresh this one state on every protected call.
            const rows = await sql`SELECT account_status FROM members WHERE id = ${ctx.memberId} LIMIT 1`;
            const accountStatus = rows[0]?.account_status || 'payment_pending';
            if (accountStatus === 'locked') return json(423, { error: 'Account locked' });
            if (accountStatus === 'payment_pending' && !PENDING_ACCOUNT_ACTIONS.has(action)) {
                return json(403, { error: 'Complete payment to unlock this feature', paymentRequired: true });
            }
        }
    }

    try {
        const data = await handler(payload, ctx);
        return json(200, { data });
    } catch (e) {
        console.error(`[db-api] action ${action} failed:`, e);
        if (action === 'meals.update') return json(400, { error:e.message });
        return json(500, { error: 'Query failed', details: e.message });
    }
};

// Exported for unit testing the router without a live DB.
exports._handlers = handlers;
exports._ADMIN_ACTIONS = ADMIN_ACTIONS;
exports._MEMBER_ACTIONS = MEMBER_ACTIONS;
