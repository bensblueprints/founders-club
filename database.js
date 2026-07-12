// ========================================
// FOUNDERS VIETNAM - Database Service (Neon via Netlify Functions)
// ========================================
//
// The browser NEVER talks to Postgres directly. Every DB operation goes through
// the consolidated Netlify Function `/.netlify/functions/db-api`, which runs the
// parameterized SQL against Neon. This file keeps the SAME public method names
// and signatures the rest of the app (admin.js, auth.js, events.html, ...) uses,
// so nothing else had to change.
//
// If db-api is unreachable / not configured (no DATABASE_URL), reads return
// empty and writes fall back to localStorage exactly as before.
//
// AUTH NOTE: login stays CLIENT-SIDE (auth.js + localStorage). The auth methods
// below are retained for signature-compatibility but are no-ops now that there
// is no Supabase Auth — auth.js detects Database.usesRemoteAuth() === false and
// uses its localStorage path.

const DB_API_URL = '/.netlify/functions/db-api';

const Database = {
    // ========================================
    // INTERNAL: call the db-api function
    // ========================================

    // Returns { data, error }. `error` is a string on failure (network,
    // not-configured, or a query error) so callers can fall back gracefully.
    async _call(action, payload = {}) {
        try {
            const headers = { 'Content-Type': 'application/json' };
            // Attach the admin token for privileged actions if the admin set it.
            const adminToken = (typeof localStorage !== 'undefined')
                ? localStorage.getItem('fvn_admin_token') : null;
            if (adminToken) headers['x-admin-token'] = adminToken;

            const res = await fetch(DB_API_URL, {
                method: 'POST',
                headers,
                body: JSON.stringify({ action, payload })
            });

            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                return { data: null, error: body.error || `HTTP ${res.status}`, notConfigured: !!body.notConfigured };
            }
            return { data: body.data, error: null };
        } catch (e) {
            // Network failure (offline / function unavailable).
            return { data: null, error: e.message, notConfigured: true };
        }
    },

    async init() {
        // No client-side DB config anymore. The server owns DATABASE_URL.
        // We can't know config state without a call, so just report ready.
        return true;
    },

    // Kept for backwards-compat; nothing should rely on a client anymore.
    getClient() {
        return null;
    },

    // auth.js checks this to decide whether to use remote auth. Always false now.
    usesRemoteAuth() {
        return false;
    },

    // ========================================
    // AUTHENTICATION (retained no-op stubs — login is client-side now)
    // ========================================

    async signUp() {
        return { data: null, error: 'Remote auth disabled — using client-side auth.' };
    },

    async signIn() {
        return { data: null, error: 'Remote auth disabled — using client-side auth.' };
    },

    async signOut() {
        return;
    },

    async getCurrentUser() {
        return null;
    },

    async isLoggedIn() {
        return false;
    },

    // ========================================
    // MEMBERS
    // ========================================

    async getMembers() {
        const { data } = await this._call('members.list');
        return data || [];
    },

    async getMemberById(id) {
        const { data } = await this._call('members.get', { id });
        return data || null;
    },

    async updateMemberProfile(id, profileData) {
        const { data, error } = await this._call('members.update', { id, profile: profileData });
        if (error) return { data: null, error };
        return { data, error: null };
    },

    // ========================================
    // APPLICATIONS
    // ========================================

    async submitApplication(applicationData) {
        const { data, error } = await this._call('applications.create', applicationData);
        if (!error && data) {
            return { data, error: null };
        }
        // localStorage fallback (offline / DB down)
        const application = {
            id: 'app-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            status: 'pending',
            submittedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            firstName: applicationData.firstName,
            lastName: applicationData.lastName,
            email: applicationData.email,
            age: applicationData.age,
            socialLink: applicationData.socialLink,
            company: applicationData.company,
            role: applicationData.role,
            industry: applicationData.industry,
            revenue: applicationData.revenue,
            teamSize: applicationData.teamSize,
            biggestChallenge: applicationData.biggestChallenge,
            uniqueValue: applicationData.uniqueValue,
            goals12Month: applicationData.goals12Month,
            whyJoin: applicationData.whyJoin,
            referral: applicationData.referral,
            referrerName: applicationData.referrerName,
            event: applicationData.event,
            membership: applicationData.membership,
            paymentIntentId: applicationData.paymentIntentId || null,
            paymentStatus: applicationData.paymentStatus || 'pending',
            amountPaid: applicationData.amountPaid || 0
        };

        const apps = JSON.parse(localStorage.getItem('founders_vietnam_applications') || '[]');
        apps.unshift(application);
        localStorage.setItem('founders_vietnam_applications', JSON.stringify(apps));

        return { data: application, error: null };
    },

    async getApplications(status = null) {
        const { data } = await this._call('applications.list', status ? { status } : {});
        return data || [];
    },

    // ========================================
    // EVENTS
    // ========================================

    async getEvents(status = null) {
        const { data } = await this._call('events.list', status ? { status } : {});
        return data || [];
    },

    async createEvent(eventData) {
        const slug = eventData.slug || (eventData.name || 'event')
            .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'event-' + Date.now();

        const { data, error } = await this._call('events.create', {
            slug,
            name: eventData.name,
            date: eventData.date,
            time: eventData.time || '18:00',
            location: eventData.location,
            description: eventData.description,
            price: eventData.price,
            capacity: eventData.capacity,
            status: eventData.status || 'open'
        });

        if (!error && data) {
            return { data, error: null };
        }

        // localStorage fallback — write to the same store the admin/booking UI reads
        const event = {
            id: eventData.id || 'evt-' + Date.now(),
            slug: slug,
            name: eventData.name,
            type: 'gathering',
            date: eventData.date,
            displayDate: eventData.displayDate || eventData.date,
            time: eventData.time || '',
            location: eventData.location || '',
            city: eventData.city || '',
            image: eventData.image || '/images/gathering-event.jpg',
            description: eventData.description || '',
            capacity: eventData.capacity || 0,
            dinnerCapacity: eventData.capacity || 0,
            spotsRemaining: eventData.capacity || 0,
            dinnerSpotsRemaining: eventData.capacity || 0,
            isPlatinumEvent: false,
            tickets: [
                {
                    id: 'dinner-' + slug,
                    name: 'Founders Dinner',
                    price: Number(eventData.price) || 0,
                    currency: 'USD',
                    description: eventData.description || '',
                    capacity: eventData.capacity || 0,
                    perks: []
                }
            ],
            status: eventData.status || 'open'
        };

        const events = JSON.parse(localStorage.getItem('founders_vietnam_upcoming') || '[]');
        events.push(event);
        localStorage.setItem('founders_vietnam_upcoming', JSON.stringify(events));

        return { data: event, error: null };
    },

    async getEventBySlug(slug) {
        const { data } = await this._call('events.getBySlug', { slug });
        return data || null;
    },

    async getPastEvents() {
        const { data } = await this._call('events.past');
        return data || [];
    },

    // ========================================
    // EVENT ATTENDANCE
    // ========================================

    async getEventAttendees(eventId) {
        const { data } = await this._call('attendance.byEvent', { eventId });
        return data || [];
    },

    async didUserAttendEvent(memberId, eventId) {
        const { data } = await this._call('attendance.check', { memberId, eventId });
        return !!data;
    },

    async registerForEvent(memberId, eventId, ticketType) {
        const { data, error } = await this._call('attendance.register', { memberId, eventId, ticketType });
        if (error) return { data: null, error };
        return { data, error: null };
    },

    // ========================================
    // EVENT PHOTOS
    // ========================================

    async getEventPhotos(eventId) {
        const { data } = await this._call('event_photos.list', { eventId });
        return data || [];
    },

    async addEventPhoto(eventId, photoUrl, caption = '') {
        const user = await this.getCurrentUser();
        const { data, error } = await this._call('event_photos.add', {
            eventId, photoUrl, caption, uploadedBy: user?.id
        });
        if (error) return { data: null, error };
        return { data, error: null };
    },

    // ========================================
    // TRANSACTIONS
    // ========================================

    async createTransaction(transactionData) {
        const transaction = {
            id: transactionData.id || 'txn-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            user_id: transactionData.userId || null,
            user_email: transactionData.email,
            user_name: transactionData.firstName + ' ' + transactionData.lastName,
            amount: transactionData.amount,
            currency: transactionData.currency || 'USD',
            status: transactionData.status || 'attempted',
            payment_intent_id: transactionData.paymentIntentId || null,
            payment_method: transactionData.paymentMethod || 'card',
            product_id: transactionData.productId,
            product_name: transactionData.productName,
            event_id: transactionData.eventId,
            error_message: transactionData.errorMessage || null,
            metadata: transactionData.metadata || {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await this._call('transactions.create', transaction);
        if (!error && data) {
            console.log('Transaction saved to database:', data);
            return { data, error: null };
        }

        // Return the transaction object even if DB save failed
        console.log('Transaction created (DB unavailable):', transaction);
        return { data: transaction, error: null };
    },

    async updateTransactionStatus(transactionId, status, errorMessage = null) {
        const { data, error } = await this._call('transactions.updateStatus', {
            id: transactionId, status, errorMessage
        });
        if (!error && data) {
            console.log('Transaction status updated:', data);
            return { data, error: null };
        }
        return { data: { id: transactionId, status, updated_at: new Date().toISOString(), error_message: errorMessage }, error: null };
    },

    async getTransactionsByUser(userId) {
        const { data } = await this._call('transactions.byUser', { userId });
        return data || [];
    },

    async getTransactionsByEmail(email) {
        const { data } = await this._call('transactions.byEmail', { email });
        return data || [];
    },

    async getAllTransactions(limit = 100) {
        const { data } = await this._call('transactions.all', { limit });
        return data || [];
    },

    // ========================================
    // BOOKINGS
    // ========================================

    async createBooking(bookingData) {
        const booking = {
            id: bookingData.id || 'bkg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            user_id: bookingData.userId || null,
            user_email: bookingData.email,
            user_name: bookingData.firstName + ' ' + bookingData.lastName,
            event_id: bookingData.eventId,
            ticket_type: bookingData.ticketType || bookingData.ticketId,
            ticket_name: bookingData.ticketName,
            ticket_price: bookingData.ticketPrice,
            transaction_id: bookingData.transactionId || null,
            payment_status: bookingData.paymentStatus || 'pending',
            booking_status: bookingData.bookingStatus || 'confirmed',
            created_at: new Date().toISOString()
        };

        const { data, error } = await this._call('bookings.create', booking);
        if (!error && data) {
            console.log('Booking saved to database:', data);
            return { data, error: null };
        }

        // Return the booking object even if DB save failed
        console.log('Booking created (DB unavailable):', booking);
        return { data: booking, error: null };
    },

    async getBookingsByUser(userId) {
        const { data } = await this._call('bookings.byUser', { userId });
        return data || [];
    },

    async getBookingsByEmail(email) {
        const { data } = await this._call('bookings.byEmail', { email });
        return data || [];
    },

    async getBookingsByEvent(eventId) {
        const { data } = await this._call('bookings.byEvent', { eventId });
        return data || [];
    },

    async getAllBookings(limit = 100) {
        const { data } = await this._call('bookings.all', { limit });
        return data || [];
    },

    async getBookingStats(eventId) {
        const { data } = await this._call('bookings.stats', { eventId });
        return data || { dinner: 0, cruise: 0, total: 0 };
    }
};

// Make available globally
window.Database = Database;
