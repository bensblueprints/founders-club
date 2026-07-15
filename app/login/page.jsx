'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

function LoginContent() {
    const router = useRouter();
    const params = useSearchParams();
    const { user, login, ready } = useAuth();
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    useEffect(() => { if (ready && user) router.replace(user.must_reset_password || user.mustResetPassword ? '/change-password' : params.get('next') || (user.is_admin ? '/admin' : '/members')); }, [ready, user, router, params]);

    async function submit(event) {
        event.preventDefault();
        setBusy(true); setError('');
        const form = new FormData(event.currentTarget);
        try {
            const nextUser = await login(form.get('email'), form.get('password'));
            router.replace(nextUser.must_reset_password || nextUser.mustResetPassword ? '/change-password' : params.get('next') || (nextUser.is_admin ? '/admin' : '/members'));
        } catch (e) { setError(e.message); } finally { setBusy(false); }
    }

    return <section className="auth-page"><div className="auth-card">
        <span className="card-icon"><LockKeyhole /></span><h1>Welcome back.</h1><p className="muted">Use the credentials in your acceptance email.</p>
        <form onSubmit={submit}>
            <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required /></div>
            <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required /></div>
            {error && <div className="form-status error">{error}</div>}
            <button className="button primary" disabled={busy}>{busy ? 'Signing in…' : <>Sign in <ArrowRight size={17} /></>}</button>
        </form>
        <p className="muted" style={{fontSize: 13, marginTop: 20}}>No account yet? <Link href="/#apply" style={{color: 'var(--lime)'}}>Apply for an event</Link>. Accounts are created after approval.</p>
    </div></section>;
}

export default function LoginPage() {
    return <Suspense fallback={<div className="loading">Loading sign in…</div>}><LoginContent /></Suspense>;
}
