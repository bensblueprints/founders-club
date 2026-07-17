'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { KeyRound } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { callFunction } from '@/lib/api';

function safeNextFromLocation() {
    if (typeof window === 'undefined') return '';
    const raw = new URLSearchParams(window.location.search).get('next');
    if (!raw) return '';
    try {
        const url = new URL(raw, window.location.origin);
        if (url.origin !== window.location.origin) return '';
        return `${url.pathname}${url.search}${url.hash}`;
    } catch (_) {
        return raw.startsWith('/') && !raw.startsWith('//') ? raw : '';
    }
}

export default function ChangePasswordPage() {
    const router = useRouter();
    const { user, ready, updateUser } = useAuth();
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const mustReset = user?.must_reset_password === true || user?.mustResetPassword === true;
    async function submit(event) {
        event.preventDefault();
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        const password = String(form.get('password') || '');
        const currentPassword = String(form.get('currentPassword') || '');
        if (password !== form.get('confirmPassword')) return setError('Passwords do not match.');
        setBusy(true); setError('');
        try {
            const result = await callFunction('auth-change-password', { currentPassword, password });
            localStorage.setItem('fvn_session_token', result.token);
            updateUser(result.user);
            const next = safeNextFromLocation();
            router.replace(next || (result.user.account_status === 'payment_pending' ? '/payment' : '/profile'));
        } catch (e) { setError(e.message); } finally { setBusy(false); }
    }
    if (!ready) return <div className="loading">Checking account…</div>;
    if (!user) return <section className="auth-page"><div className="auth-card center"><h1>Sign in first.</h1><Link className="button primary" href="/login?next=/change-password">Sign in</Link></div></section>;
    return <section className="auth-page"><div className="auth-card"><span className="card-icon"><KeyRound/></span><h1>{mustReset ? 'Set your password.' : 'Change your password.'}</h1><p className="muted">{mustReset ? 'Replace the temporary password before continuing.' : 'Enter your current password, then choose a new one.'} Use at least 12 characters with uppercase, lowercase, a number, and a symbol.</p><form onSubmit={submit}>{!mustReset && <div className="field"><label htmlFor="current-password">Current password</label><input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required/></div>}<div className="field"><label htmlFor="new-password">New password</label><input id="new-password" name="password" type="password" autoComplete="new-password" minLength={12} required/></div><div className="field"><label htmlFor="confirm-password">Confirm password</label><input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength={12} required/></div>{error && <div className="form-status error">{error}</div>}<button className="button primary" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button></form></div></section>;
}
