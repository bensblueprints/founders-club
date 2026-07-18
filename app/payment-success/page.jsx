'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, LoaderCircle } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { callFunction, db } from '@/lib/api';

function PaymentSuccessContent() {
    const params = useSearchParams();
    const router = useRouter();
    const { user, ready, refresh } = useAuth();
    const orderId = params.get('order');
    const isMock = params.get('mock') === '1';
    const redirectStarted = useRef(false);
    const [state, setState] = useState('confirming');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!ready || !user || !orderId) return undefined;
        let cancelled = false;
        let pollTimer;
        let attempts = 0;

        async function openMenu() {
            if (cancelled || redirectStarted.current) return;
            redirectStarted.current = true;
            setState('confirmed');
            await refresh().catch(() => {});
            window.setTimeout(() => { if (!cancelled) router.replace(`/meal?order=${encodeURIComponent(orderId)}&from=payment`); }, 450);
        }

        async function checkStatus() {
            try {
                const order = await db('payments.current', { orderId });
                if (order?.status === 'paid') return openMenu();
                attempts += 1;
                if (attempts >= 24) {
                    setState('pending');
                    return;
                }
                pollTimer = window.setTimeout(checkStatus, 1500);
            } catch (statusError) {
                setState('error');
                setError(statusError.message);
            }
        }

        async function confirm() {
            try {
                if (isMock) {
                    await callFunction('mock-payment', { orderId });
                    return openMenu();
                }
                return checkStatus();
            } catch (confirmationError) {
                setState('error');
                setError(confirmationError.message);
            }
        }
        confirm();
        return () => { cancelled = true; window.clearTimeout(pollTimer); };
    }, [ready, user, orderId, isMock]);

    if (!ready) return <div className="loading">Confirming payment…</div>;
    if (!user) return <section className="auth-page"><div className="auth-card center"><h1>Sign in to continue.</h1><p className="muted">Your payment return is waiting. Sign in and we’ll take you to menu selection.</p><Link className="button primary" href={`/login?next=${encodeURIComponent(`/payment-success?order=${orderId || ''}`)}`}>Sign in</Link></div></section>;
    const confirmed = state === 'confirmed';
    return <section className="auth-page"><div className="auth-card center">
        {confirmed ? <CheckCircle2 size={52} style={{color:'var(--lime)'}}/> : <LoaderCircle className={state === 'confirming' ? 'spin' : ''} size={48} style={{color:'var(--orange)'}}/>}
        <h1>{confirmed ? 'Payment confirmed.' : state === 'pending' ? 'Payment received.' : state === 'error' ? 'Could not confirm payment.' : 'Confirming payment…'}</h1>
        <p className="muted">{error || (confirmed ? 'Taking you straight to menu selection…' : state === 'pending' ? 'The provider webhook is still processing. Your menu unlocks as soon as it is recorded.' : 'Please keep this page open. This usually takes only a few seconds.')}</p>
        {state === 'pending' && <Link className="button primary" href={`/payment${orderId ? `?order=${encodeURIComponent(orderId)}` : ''}`}>View payment status</Link>}
        {state === 'error' && <Link className="button ghost" href="/payment">Return to payment</Link>}
    </div></section>;
}

export default function PaymentSuccessPage() {
    return <Suspense fallback={<div className="loading">Confirming payment…</div>}><PaymentSuccessContent/></Suspense>;
}
