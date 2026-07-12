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

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(statusCode, obj) {
    return { statusCode, headers: { 'Content-Type': 'application/json', ...CORS }, body: JSON.stringify(obj) };
}

// Actions that require the admin token. Everything else is public.
// (Applications are administrative to READ — under the old Supabase RLS the
//  anon role could not select them — but anyone could INSERT one to apply.)
const ADMIN_ACTIONS = new Set([
    'applications.list',
    'applications.get',
    'events.create',
    'event_photos.add'
]);

// ---- action handlers -------------------------------------------------------
// Each returns the plain data (array / object / null) the browser expects.

const handlers = {
    // ---------- MEMBERS ----------
    async 'members.list'() {
        const rows = await sql`
            SELECT * FROM members
            WHERE is_approved = true
            ORDER BY created_at DESC`;
        return rows;
    },

    async 'members.get'({ id }) {
        if (!id) return null;
        const rows = await sql`SELECT * FROM members WHERE id = ${id} LIMIT 1`;
        return rows[0] || null;
    },

    async 'members.create'(p) {
        const rows = await sql`
            INSERT INTO members
                (id, email, first_name, last_name, company, role, industry, is_approved, password_hash)
            VALUES
                (COALESCE(${p.id || null}, gen_random_uuid()), ${p.email}, ${p.first_name || ''},
                 ${p.last_name || ''}, ${p.company || null}, ${p.role || null}, ${p.industry || null},
                 ${p.is_approved ?? true}, ${p.password_hash || null})
            ON CONFLICT (email) DO UPDATE SET
                first_name = EXCLUDED.first_name,
                last_name  = EXCLUDED.last_name,
                company    = EXCLUDED.company,
                role       = EXCLUDED.role,
                industry   = EXCLUDED.industry
            RETURNING *`;
        return rows[0] || null;
    },

    async 'members.update'({ id, profile }) {
        if (!id) return null;
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
                websites   = COALESCE(${p.websites ? JSON.stringify(p.websites) : null}::jsonb, websites),
                profile_photo = COALESCE(${p.profilePhoto ?? null}, profile_photo),
                whatsapp   = COALESCE(${p.whatsapp ?? null}, whatsapp),
                zalo       = COALESCE(${p.zalo ?? null}, zalo),
                telegram   = COALESCE(${p.telegram ?? null}, telegram),
                linkedin   = COALESCE(${p.linkedin ?? null}, linkedin),
                twitter    = COALESCE(${p.twitter ?? null}, twitter),
                wechat     = COALESCE(${p.wechat ?? null}, wechat),
                facebook   = COALESCE(${p.facebook ?? null}, facebook),
                instagram  = COALESCE(${p.instagram ?? null}, instagram)
            WHERE id = ${id}
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
        if (status) {
            return await sql`SELECT * FROM applications WHERE status = ${status} ORDER BY created_at DESC`;
        }
        return await sql`SELECT * FROM applications ORDER BY created_at DESC`;
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
            return await sql`SELECT * FROM events WHERE status = ${status} ORDER BY event_date ASC`;
        }
        return await sql`SELECT * FROM events ORDER BY event_date ASC`;
    },

    async 'events.getBySlug'({ slug }) {
        if (!slug) return null;
        const rows = await sql`SELECT * FROM events WHERE slug = ${slug} LIMIT 1`;
        return rows[0] || null;
    },

    async 'events.past'() {
        return await sql`SELECT * FROM events WHERE status = 'completed' ORDER BY event_date DESC`;
    },

    // Admin-gated.
    async 'events.create'(p) {
        const rows = await sql`
            INSERT INTO events
                (slug, name, event_date, event_time, location, description,
                 dinner_price, max_attendees, status)
            VALUES
                (${p.slug}, ${p.name}, ${p.date}, ${p.time || '18:00'}, ${p.location || null},
                 ${p.description || null}, ${p.price || null}, ${p.capacity || null},
                 ${p.status || 'open'})
            ON CONFLICT (slug) DO UPDATE SET
                name = EXCLUDED.name,
                event_date = EXCLUDED.event_date,
                event_time = EXCLUDED.event_time,
                location = EXCLUDED.location,
                description = EXCLUDED.description,
                dinner_price = EXCLUDED.dinner_price,
                max_attendees = EXCLUDED.max_attendees,
                status = EXCLUDED.status
            RETURNING *`;
        return rows[0] || null;
    },

    // ---------- EVENT ATTENDANCE ----------
    async 'attendance.byEvent'({ eventId }) {
        // Returns the member rows for attendees of an event.
        if (!eventId) return [];
        return await sql`
            SELECT m.* FROM event_attendance a
            JOIN members m ON m.id = a.member_id
            WHERE a.event_id = ${eventId}`;
    },

    async 'attendance.check'({ memberId, eventId }) {
        if (!memberId || !eventId) return false;
        const rows = await sql`
            SELECT id FROM event_attendance
            WHERE event_id = ${eventId} AND member_id = ${memberId} LIMIT 1`;
        return rows.length > 0;
    },

    async 'attendance.register'({ memberId, eventId, ticketType }) {
        const rows = await sql`
            INSERT INTO event_attendance (event_id, member_id, ticket_type)
            VALUES (${eventId}, ${memberId}, ${ticketType})
            ON CONFLICT (event_id, member_id) DO UPDATE SET ticket_type = EXCLUDED.ticket_type
            RETURNING *`;
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
    async 'transactions.create'(p) {
        const rows = await sql`
            INSERT INTO transactions
                (id, user_id, user_email, user_name, amount, currency, status,
                 payment_intent_id, payment_method, product_id, product_name,
                 event_id, error_message, metadata)
            VALUES
                (${p.id}, ${p.user_id || null}, ${p.user_email || null}, ${p.user_name || null},
                 ${p.amount || null}, ${p.currency || 'USD'}, ${p.status || 'attempted'},
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

    async 'transactions.byUser'({ userId }) {
        if (!userId) return [];
        return await sql`SELECT * FROM transactions WHERE user_id = ${userId} ORDER BY created_at DESC`;
    },

    async 'transactions.byEmail'({ email }) {
        if (!email) return [];
        return await sql`SELECT * FROM transactions WHERE user_email = ${email} ORDER BY created_at DESC`;
    },

    async 'transactions.all'({ limit } = {}) {
        const lim = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 1000);
        return await sql`SELECT * FROM transactions ORDER BY created_at DESC LIMIT ${lim}`;
    },

    // ---------- BOOKINGS ----------
    async 'bookings.create'(p) {
        const rows = await sql`
            INSERT INTO bookings
                (id, user_id, user_email, user_name, event_id, ticket_type, ticket_name,
                 ticket_price, transaction_id, payment_status, booking_status)
            VALUES
                (${p.id}, ${p.user_id || null}, ${p.user_email || null}, ${p.user_name || null},
                 ${p.event_id || null}, ${p.ticket_type || null}, ${p.ticket_name || null},
                 ${p.ticket_price || null}, ${p.transaction_id || null},
                 ${p.payment_status || 'pending'}, ${p.booking_status || 'confirmed'})
            ON CONFLICT (id) DO NOTHING
            RETURNING *`;
        return rows[0] || null;
    },

    async 'bookings.byUser'({ userId }) {
        if (!userId) return [];
        return await sql`SELECT * FROM bookings WHERE user_id = ${userId} ORDER BY created_at DESC`;
    },

    async 'bookings.byEmail'({ email }) {
        if (!email) return [];
        return await sql`SELECT * FROM bookings WHERE user_email = ${email} ORDER BY created_at DESC`;
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

    // Auth gate for privileged actions.
    if (ADMIN_ACTIONS.has(action)) {
        const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
        if (!ADMIN_TOKEN) return json(500, { error: 'Server not configured (missing ADMIN_TOKEN).' });
        const provided = event.headers['x-admin-token'] || event.headers['X-Admin-Token'];
        if (provided !== ADMIN_TOKEN) return json(401, { error: 'Unauthorized' });
    }

    try {
        const data = await handler(payload);
        return json(200, { data });
    } catch (e) {
        console.error(`[db-api] action ${action} failed:`, e);
        return json(500, { error: 'Query failed', details: e.message });
    }
};

// Exported for unit testing the router without a live DB.
exports._handlers = handlers;
exports._ADMIN_ACTIONS = ADMIN_ACTIONS;
