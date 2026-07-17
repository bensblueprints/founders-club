'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { KeyRound } from 'lucide-react';
import { callFunction } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

function ResetPasswordContent() {
    const router = useRouter();
    const params = useSearchParams();
    const token = params.get('token') || '';
    const { updateUser } = useAuth();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    async function submit(event) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const password = String(form.get('password') || '');
        if (password !== form.get('confirmPassword')) {
            setError('Passwords do not match.');
            return;
        }
        setBusy(true);
        setError('');
        try {
            const result = await callFunction('auth-reset-password', { token, password }, { token: null });
            localStorage.setItem('fvn_session_token', result.token);
            updateUser(result.user);
            router.replace(result.user.is_admin ? '/admin' : (result.user.account_status === 'payment_pending' ? '/payment' : '/profile'));
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    if (!token) {
        return <section className="auth-page"><div className="auth-card center"><h1>Reset link missing.</h1><p className="muted">Please request a new reset link from the login page.</p><Link className="button primary" href="/forgot-password">Request reset link</Link></div></section>;
    }

    return <section className="auth-page">
        <div className="auth-card">
            <span className="card-icon"><KeyRound /></span>
            <h1>Choose a new password.</h1>
            <p className="muted">Use at least 12 characters with uppercase, lowercase, a number, and a symbol.</p>
            <form onSubmit={submit}>
                <div className="field"><label htmlFor="new-password">New password</label><input id="new-password" name="password" type="password" autoComplete="new-password" minLength={12} required /></div>
                <div className="field"><label htmlFor="confirm-password">Confirm password</label><input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength={12} required /></div>
                {error && <div className="form-status error">{error}</div>}
                <button className="button primary" disabled={busy}>{busy ? 'Saving…' : 'Reset password'}</button>
            </form>
        </div>
    </section>;
}

export default function ResetPasswordPage() {
    return <Suspense fallback={<div className="loading">Loading reset link…</div>}><ResetPasswordContent /></Suspense>;
}
