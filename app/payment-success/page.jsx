'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { callFunction } from '@/lib/api';

function PaymentSuccessContent() {
    const params = useSearchParams();
    const [state, setState] = useState(params.get('mock') === '1' ? 'confirming' : 'received');
    const [error, setError] = useState('');
    useEffect(() => {
        if (params.get('mock') !== '1' || !params.get('order')) return;
        callFunction('mock-payment', { orderId: params.get('order') })
            .then(() => setState('confirmed'))
            .catch(e => { setState('error'); setError(e.message); });
    }, [params]);
    return <section className="auth-page"><div className="auth-card center"><CheckCircle2 size={52} style={{color:'var(--lime)'}}/><h1>{state === 'confirming' ? 'Confirming payment…' : state === 'error' ? 'Could not confirm payment.' : 'Payment confirmed.'}</h1><p className="muted">{error || (state === 'confirmed' ? 'Your local test payment is recorded and attendee access is unlocked.' : 'Your event access updates when the provider webhook is recorded.')}</p><Link className="button primary" href={state === 'confirmed' ? '/meal' : '/payment'}>{state === 'confirmed' ? 'Choose meal option' : 'View payment status'}</Link></div></section>;
}

export default function PaymentSuccessPage() {
    return <Suspense fallback={<div className="loading">Confirming payment…</div>}><PaymentSuccessContent/></Suspense>;
}
