'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';
import { callFunction } from '@/lib/api';

export default function ForgotPasswordPage() {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    async function submit(event) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setBusy(true);
        setError('');
        setMessage('');
        try {
            const result = await callFunction('auth-forgot-password', { email: form.get('email') }, { token: null });
            setMessage(result.message || 'If an account exists for that email, we sent password reset instructions.');
            event.currentTarget.reset();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    return <section className="auth-page">
        <div className="auth-card">
            <span className="card-icon"><Mail /></span>
            <h1>Reset your password.</h1>
            <p className="muted">Enter the email for your FoundersVN account. If it exists, we’ll send a secure reset link that expires in 60 minutes.</p>
            <form onSubmit={submit}>
                <div className="field">
                    <label htmlFor="email">Email</label>
                    <input id="email" name="email" type="email" autoComplete="email" required />
                </div>
                {error && <div className="form-status error">{error}</div>}
                {message && <div className="form-status success">{message}</div>}
                <button className="button primary" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
            </form>
            <p className="muted" style={{ fontSize: 13, marginTop: 20 }}>
                <Link href="/login" style={{ color: 'var(--lime)' }}><ArrowLeft size={14} style={{ verticalAlign: '-2px' }} /> Back to login</Link>
            </p>
        </div>
    </section>;
}
