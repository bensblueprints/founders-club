'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock3, Copy, CreditCard, QrCode, RefreshCw, ShieldCheck } from 'lucide-react';
import { init as initAirwallex } from '@airwallex/components-sdk';
import { useAuth } from '@/components/AuthProvider';
import { db, formatDate } from '@/lib/api';

function formatVnd(value) {
    return `${new Intl.NumberFormat('vi-VN').format(Number(value || 0))} VND`;
}

function PaymentContent() {
    const { user, ready, refresh } = useAuth();
    const params = useSearchParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [now, setNow] = useState(Date.now());
    const [copied, setCopied] = useState('');
    const [cardError, setCardError] = useState('');
    const [cardLoading, setCardLoading] = useState(false);

    async function load(silent = false) {
        if (!user) return;
        if (!silent) setLoading(true);
        try {
            const row = await db('payments.current', { orderId: params.get('order') || undefined });
            setOrder(row);
            setError(row ? '' : 'No payment reservation found.');
            const cachedStatus = user?.account_status || user?.accountStatus;
            if (row?.status === 'paid' && cachedStatus === 'payment_pending') await refresh();
        } catch (e) { setError(e.message); }
        finally { if (!silent) setLoading(false); }
    }

    useEffect(() => {
        if (!ready) return;
        if (!user) {
            setLoading(false);
            return;
        }
        load();
    }, [ready, user]);
    useEffect(() => {
        const tick = setInterval(() => setNow(Date.now()), 1000);
        const poll = setInterval(() => load(true), 10000);
        return () => { clearInterval(tick); clearInterval(poll); };
    }, [user, params]);

    const remaining = useMemo(() => order ? Math.max(0, new Date(order.expiresAt).getTime() - now) : 0, [order, now]);
    const countdown = `${String(Math.floor(remaining / 3600000)).padStart(2, '0')}:${String(Math.floor((remaining % 3600000) / 60000)).padStart(2, '0')}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')}`;

    async function copy(value, label) {
        await navigator.clipboard.writeText(String(value));
        setCopied(label);
        setTimeout(() => setCopied(''), 1200);
    }

    async function startAirwallex() {
        setCardLoading(true); setCardError('');
        try {
            const checkout = await db('payments.ensureAirwallexCheckout', { orderId:order.id });
            const { payments } = await initAirwallex({ env:checkout.environment, enabledElements:['payments'] });
            const returnBase = window.location.protocol === 'https:' ? window.location.origin : 'https://foundersvn.com';
            payments.redirectToCheckout({
                env:checkout.environment, mode:'payment', intent_id:checkout.intentId,
                client_secret:checkout.clientSecret, currency:checkout.currency,
                country_code:'VN', methods:['card'],
                successUrl:`${returnBase}/payment-success?order=${order.id}`,
                cancelUrl:`${returnBase}/payment?order=${order.id}`,
                appearance:{ mode:'dark', variables:{ colorBrand:'#ef654b' } }
            });
        } catch (error) { setCardError(error.message); setCardLoading(false); }
    }

    const paymentPath = `/payment${params.get('order') ? `?order=${encodeURIComponent(params.get('order'))}` : ''}`;
    if (!ready) return <div className="loading">Loading payment status…</div>;
    if (!user) return <section className="auth-page"><div className="auth-card center"><ShieldCheck size={40}/><h1>Sign in to pay.</h1><p className="muted">Use the credentials from your approval email. After sign-in, we’ll bring you back to this payment reservation.</p><Link className="button primary" href={`/login?next=${encodeURIComponent(paymentPath)}`}>Sign in and continue</Link></div></section>;
    if (loading) return <div className="loading">Loading payment status…</div>;
    if (error || !order) return <section className="auth-page"><div className="auth-card center"><h1>Payment unavailable.</h1><p className="muted">{error}</p><Link className="button ghost" href="/events">View events</Link></div></section>;

    const paid = order.status === 'paid';
    const unavailable = ['expired', 'cancelled'].includes(order.status) || remaining === 0;
    const supportMessage = encodeURIComponent(`Hi Matthew, I need help completing payment for my FoundersVN reservation. Order: ${order.id}`);
    const supportUrl = `https://wa.me/4915754444113?text=${supportMessage}`;

    return <><section className="page-hero payment-hero"><div className="container"><span className="eyebrow">{order.providerEnvironment === 'sandbox' ? 'Sandbox · no real charge' : 'Seat reservation'}</span><h1 className="display medium">{paid ? 'Payment confirmed.' : unavailable ? 'Reservation expired.' : 'Complete your payment.'}</h1><p className="lead">{order.event.name} · {formatDate(order.event.date)} · {order.ticketCount} ticket{order.ticketCount === 1 ? '' : 's'}</p></div></section>
        <section className="section compact"><div className="container payment-page-grid">
            <aside className="panel payment-status-card">
                <span className={`status ${order.status}`}>{order.status}</span>
                {paid ? <><CheckCircle2 className="payment-state-icon" size={44}/><h2>Your seat{order.ticketCount === 2 ? 's are' : ' is'} confirmed</h2><p className="muted">Paid with {order.paidProvider === 'sepay' ? 'SePay bank transfer' : 'Airwallex card'}.</p><Link className="button primary" href="/meal">Choose meal option</Link><Link className="button ghost" href="/members">Browse attendees</Link></> : unavailable ? <><Clock3 className="payment-state-icon expired" size={44}/><h2>The 48-hour window ended</h2><p className="muted">The payment options are disabled and the seat reservation has been released.</p></> : <><div className="payment-countdown"><Clock3 size={18}/><span>Time remaining</span><strong>{countdown}</strong></div><p className="muted">We sent a reminder after 24 hours. The reservation releases automatically when this timer reaches zero.</p><button className="button ghost small" onClick={() => load()}><RefreshCw size={15}/> Refresh status</button></>}
            </aside>

            {!paid && !unavailable && <div className="payment-methods">
                <article className="panel payment-method-card">
                    <div className="payment-method-heading"><CreditCard size={24}/><div><span className="eyebrow">International</span><h2>Pay by card</h2></div></div>
                    <div className="payment-breakdown"><div><span>Ticket total</span><b>${order.baseAmountUsd.toFixed(2)} USD</b></div><div><span>Airwallex platform fee · 5%</span><b>${order.airwallexFeeUsd.toFixed(2)} USD</b></div><div className="total"><span>Total</span><strong>${order.airwallexTotalUsd.toFixed(2)} USD</strong></div></div>
                    {cardError && <p className="form-status error">{cardError}</p>}
                    <button className="button primary wide" onClick={startAirwallex} disabled={cardLoading}>{cardLoading ? 'Opening secure checkout…' : 'Continue to Airwallex'}</button>
                </article>

                <article className="panel payment-method-card sepay-card">
                    <div className="payment-method-heading"><QrCode size={24}/><div><span className="eyebrow">Vietnam</span><h2>SePay QR transfer</h2></div></div>
                    <p className="muted">No platform fee. Transfer the exact amount with the exact payment code.</p>
                    {order.sepayQrUrl ? <img className="sepay-qr" src={order.sepayQrUrl} alt={`SePay QR for ${formatVnd(order.sepayAmountVnd)}`} /> : null}
                    <div className="sepay-details"><div><span>Amount</span><b>{formatVnd(order.sepayAmountVnd)}</b><button onClick={() => copy(order.sepayAmountVnd, 'amount')} aria-label="Copy amount"><Copy size={14}/></button></div><div><span>Bank</span><b>{order.sepayBank || '—'}</b></div><div><span>Account</span><b>{order.sepayAccount || '—'}</b><button onClick={() => copy(order.sepayAccount, 'account')} aria-label="Copy account"><Copy size={14}/></button></div>{order.sepayAccountName && <div><span>Name</span><b>{order.sepayAccountName}</b></div>}<div><span>Transfer content</span><b>{order.sepayCode}</b><button onClick={() => copy(order.sepayCode, 'code')} aria-label="Copy transfer content"><Copy size={14}/></button></div></div>
                    {copied && <div className="copy-toast">Copied {copied}</div>}
                </article>
                <article className="panel payment-support-card">
                    <div><span className="eyebrow">Support</span><h2>Having Trouble with Payment?</h2><p className="muted">Message Matthew on WhatsApp and we’ll help you complete the reservation.</p></div>
                    <a className="button ghost wide" href={supportUrl} target="_blank" rel="noopener noreferrer">Request Payment Support Here</a>
                </article>
            </div>}
        </div></section></>;
}

export default function PaymentPage() {
    return <Suspense fallback={<div className="loading">Loading payment…</div>}><PaymentContent/></Suspense>;
}
