const FUNCTION_ROOT = '/api/function';

export function getToken() {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('fvn_session_token');
}

export async function callFunction(name, body, options = {}) {
    const token = options.token === undefined ? getToken() : options.token;
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${FUNCTION_ROOT}/${name}`, {
        method: options.method || 'POST',
        headers,
        credentials: 'include',
        body: (options.method || 'POST') === 'GET' ? undefined : JSON.stringify(body || {})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || data.details || 'Request failed');
    return data;
}

export async function db(action, payload = {}) {
    const response = await callFunction('db-api', { action, payload });
    return response.data;
}

export function formatDate(value, options = {}) {
    if (!value) return 'Date to be announced';
    return new Intl.DateTimeFormat('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', ...options
    }).format(new Date(value));
}

export function initials(person) {
    const first = person?.firstName || person?.first_name || '';
    const last = person?.lastName || person?.last_name || '';
    return `${first[0] || ''}${last[0] || ''}`.toUpperCase() || 'FV';
}
