// ========================================
// FOUNDERS VIETNAM - Authentication (client)
// ========================================
//
// SECURITY: There are NO hardcoded users or plaintext passwords in this file
// anymore. Login is SERVER-VERIFIED: Auth.signIn()/login() POST the credentials
// to /.netlify/functions/auth-login, which checks a bcrypt hash in Neon and
// returns a signed JWT. The browser only ever holds the opaque JWT + a
// hash-free public user object.
//
// Storage keys:
//   fvn_session  -> the JWT (Authorization: Bearer <token> for db-api calls)
//   fvn_user     -> cached public user object (no hash) for synchronous reads
//
// The SAME method names the pages already call are preserved:
//   Auth.login(email,password)  (login.html)         -> boolean
//   Auth.signIn(email,password)                       -> { error }
//   Auth.getCurrentUser()  / getCurrentUserSync()     -> user | null   (sync)
//   Auth.isLoggedIn() / isLoggedInSync()              -> boolean       (sync)
//   Auth.isAdmin()                                     -> boolean
//   Auth.logout() / signOut()
//   Auth.updateProfile(data)                          -> Promise
//   Auth.getMembers() / getMemberById(id)             -> Neon-backed

const Auth = {
    SESSION_KEY: 'fvn_session',
    USER_KEY: 'fvn_user',

    LOGIN_ENDPOINT: '/.netlify/functions/auth-login',
    ME_ENDPOINT: '/.netlify/functions/auth-me',
    LOGOUT_ENDPOINT: '/.netlify/functions/auth-logout',

    ADMIN_ROLES: ['owner', 'admin', 'organiser'],

    init() {
        // Nothing to seed anymore — no sample members, no localStorage passwords.
    },

    // ---- token helpers ------------------------------------------------------

    getToken() {
        try { return localStorage.getItem(this.SESSION_KEY); } catch (_e) { return null; }
    },

    // Decode a JWT payload WITHOUT verifying the signature (verification is the
    // server's job). Used only to read `exp` for a cheap client-side guard.
    _decodePayload(token) {
        if (!token || token.split('.').length !== 3) return null;
        try {
            let p = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            while (p.length % 4) p += '=';
            return JSON.parse(atob(p));
        } catch (_e) {
            return null;
        }
    },

    _tokenValid(token) {
        const payload = this._decodePayload(token);
        if (!payload) return false;
        if (payload.exp && Math.floor(Date.now() / 1000) >= payload.exp) return false;
        return true;
    },

    // ---- session state (synchronous) ---------------------------------------

    isLoggedInSync() {
        const token = this.getToken();
        if (!token || !this._tokenValid(token)) {
            // Expired/garbage token — clear it.
            if (token) this._clearSession();
            return false;
        }
        return true;
    },

    isLoggedIn() {
        return this.isLoggedInSync();
    },

    getCurrentUserSync() {
        if (!this.isLoggedInSync()) return null;
        try {
            const raw = localStorage.getItem(this.USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (_e) {
            return null;
        }
    },

    getCurrentUser() {
        return this.getCurrentUserSync();
    },

    isAdmin() {
        const user = this.getCurrentUserSync();
        if (!user) return false;
        return user.is_admin === true || this.ADMIN_ROLES.includes(user.memberType);
    },

    _storeSession(token, user) {
        localStorage.setItem(this.SESSION_KEY, token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    },

    _clearSession() {
        localStorage.removeItem(this.SESSION_KEY);
        localStorage.removeItem(this.USER_KEY);
    },

    // ---- login / logout -----------------------------------------------------

    // Returns { error: null } on success, { error: message } on failure.
    async signIn(email, password) {
        try {
            const res = await fetch(this.LOGIN_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok || !body.token) {
                return { error: body.error || 'Invalid email or password' };
            }
            this._storeSession(body.token, body.user);
            return { error: null, user: body.user };
        } catch (e) {
            return { error: 'Could not reach the login server. Please try again.' };
        }
    },

    // Boolean-returning wrapper kept for login.html.
    async login(email, password) {
        const { error } = await this.signIn(email, password);
        return !error;
    },

    async logout() {
        this._clearSession();
        // Best-effort: clear the HttpOnly cookie too. Fire-and-forget.
        try { await fetch(this.LOGOUT_ENDPOINT, { method: 'POST' }); } catch (_e) { /* ignore */ }
        // Clear legacy/masquerade keys so nothing stale lingers.
        try {
            localStorage.removeItem('founders_vietnam_auth');
            localStorage.removeItem('founders_vietnam_original_admin');
        } catch (_e) { /* ignore */ }
    },

    async signOut() {
        return this.logout();
    },

    // Optional server re-validation (page guards may call this). Refreshes the
    // cached user from Neon; returns the user or null.
    async validateSession() {
        const token = this.getToken();
        if (!token) return null;
        try {
            const res = await fetch(this.ME_ENDPOINT, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (!res.ok) { this._clearSession(); return null; }
            const body = await res.json();
            if (body.user) localStorage.setItem(this.USER_KEY, JSON.stringify(body.user));
            return body.user || null;
        } catch (_e) {
            // Network hiccup — keep the local session rather than logging out.
            return this.getCurrentUserSync();
        }
    },

    // Registration is by APPLICATION (server-side, with a hashed password), not
    // self-serve here. Kept so login.html doesn't throw.
    async register() {
        return false;
    },

    // ---- members ------------------------------------------------------------
    //
    // These are kept SYNCHRONOUS (many callers use them without await, e.g.
    // events.html / events-data.js / past-events.js / admin.js). There is no
    // client-side member cache anymore, so they return empty. Pages that need
    // the real member list load it asynchronously straight from Neon via
    // `Database.getMembers()` / `Database.getMemberById()` (see members.js,
    // messages.html). Provided as a safe no-op to avoid breaking sync callers.
    getMembers() {
        return [];
    },

    getMembersSync() {
        return [];
    },

    getMemberById() {
        return null;
    },

    getMemberByIdSync() {
        return null;
    },

    // ---- profile ------------------------------------------------------------

    async updateProfile(data) {
        const user = this.getCurrentUserSync();
        if (!user) return false;
        if (window.Database && Database.updateMemberProfile) {
            const { data: updated, error } = await Database.updateMemberProfile(user.id, data);
            if (!error && updated) {
                // Refresh the cached user with the new fields.
                const merged = { ...user, ...data };
                localStorage.setItem(this.USER_KEY, JSON.stringify(merged));
                return true;
            }
            return false;
        }
        return false;
    }
};

// ========================================
// APPLICATIONS (admin review helpers — server-backed accept flow lives in
// netlify/functions/accept-application.js; this localStorage shim is only a
// read helper for any legacy admin view).
// ========================================
const Applications = {
    STORAGE_KEY: 'founders_vietnam_applications',

    getApplications() {
        return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
    },

    getApplicationById(id) {
        return this.getApplications().find(a => a.id == id);
    },

    getApplicationsByStatus(status) {
        return this.getApplications().filter(a => a.status === status);
    },

    getCounts() {
        const apps = this.getApplications();
        return {
            total: apps.length,
            pending: apps.filter(a => a.status === 'pending').length,
            accepted: apps.filter(a => a.status === 'accepted').length,
            rejected: apps.filter(a => a.status === 'rejected').length
        };
    }
};

// ========================================
// MESSAGING (real, server-backed via Neon — the sender identity is taken from
// the JWT server-side; the browser cannot spoof `from`). All methods are async.
// ========================================
const Messages = {
    async send(toId, body) {
        if (!(window.Database && Database.sendMessage)) return { error: 'Messaging unavailable' };
        return await Database.sendMessage(toId, body);
    },

    async inbox() {
        if (!(window.Database && Database.getInbox)) return [];
        return await Database.getInbox();
    },

    async thread(otherId) {
        if (!(window.Database && Database.getThread)) return { messages: [], other: null };
        return await Database.getThread(otherId);
    },

    async markRead(otherId) {
        if (!(window.Database && Database.markMessagesRead)) return;
        return await Database.markMessagesRead(otherId);
    },

    async getUnreadCount() {
        if (!(window.Database && Database.getUnreadCount)) return 0;
        return await Database.getUnreadCount();
    }
};

// Initialize on load
Auth.init();

// Expose globally (pages reference these as globals).
if (typeof window !== 'undefined') {
    window.Auth = Auth;
    window.Applications = Applications;
    window.Messages = Messages;
}
