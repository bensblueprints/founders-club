'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { KeyRound } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { callFunction } from '@/lib/api';

export default function ChangePasswordPage() {
    const router = useRouter();
    const { user, ready, updateUser } = useAuth();
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    async function submit(event) {
        event.preventDefault();
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        const password = String(form.get('password') || '');
        if (password !== form.get('confirmPassword')) return setError('Passwords do not match.');
        setBusy(true); setError('');
        try {
            const result = await callFunction('auth-change-password', { password });
            localStorage.setItem('fvn_session_token', result.token);
            updateUser(result.user);
            router.replace(result.user.account_status === 'payment_pending' ? '/payment' : '/profile');
        } catch (e) { setError(e.message); } finally { setBusy(false); }
    }
    if (!ready) return <div className="loading">Checking account…</div>;
    if (!user) return <section className="auth-page"><div className="auth-card center"><h1>Sign in first.</h1><Link className="button primary" href="/login?next=/change-password">Sign in</Link></div></section>;
    return <section className="auth-page"><div className="auth-card"><span className="card-icon"><KeyRound/></span><h1>Set your password.</h1><p className="muted">Replace the temporary password before continuing. Use at least 12 characters with uppercase, lowercase, a number, and a symbol.</p><form onSubmit={submit}><div className="field"><label htmlFor="new-password">New password</label><input id="new-password" name="password" type="password" autoComplete="new-password" minLength={12} required/></div><div className="field"><label htmlFor="confirm-password">Confirm password</label><input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength={12} required/></div>{error && <div className="form-status error">{error}</div>}<button className="button primary" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button></form></div></section>;
}
