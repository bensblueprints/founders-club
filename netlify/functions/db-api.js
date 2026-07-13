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
const { isAdminRequest, getBearerToken, verifyToken, hashPassword } = require('./lib/auth');

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
    'event_photos.add'
]);

// Actions that require ANY logged-in member (a valid member JWT). The current
// member id is taken from the verified token — NEVER from client-supplied input.
const MEMBER_ACTIONS = new Set([
    'messages.send',
    'messages.thread',
    'messages.inbox',
    'messages.unreadCount',
    'messages.markRead'
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
            VALUES (${from}, ${to}, ${text})
            RETURNING *`;
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
        isAdmin: claims ? claims.is_admin === true : false,
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
        if (!ctx.memberId) return json(401, { error: 'Unauthorized' });
    }

    try {
        const data = await handler(payload, ctx);
        return json(200, { data });
    } catch (e) {
        console.error(`[db-api] action ${action} failed:`, e);
        return json(500, { error: 'Query failed', details: e.message });
    }
};

// Exported for unit testing the router without a live DB.
exports._handlers = handlers;
exports._ADMIN_ACTIONS = ADMIN_ACTIONS;
exports._MEMBER_ACTIONS = MEMBER_ACTIONS;
