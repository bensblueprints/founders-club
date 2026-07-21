'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock3, Copy, CreditCard, LockKeyhole, QrCode, RefreshCw, ShieldCheck } from 'lucide-react';
import { init as initAirwallex } from '@airwallex/components-sdk';
import { useAuth } from '@/components/AuthProvider';
import { db, formatDate } from '@/lib/api';

function formatVnd(value) {
    return `${new Intl.NumberFormat('vi-VN').format(Number(value || 0))} VND`;
}

function PaymentContent() {
    const { user, ready, refresh, logout } = useAuth();
    const params = useSearchParams();
    const router = useRouter();
    const observedPendingPayment = useRef(false);
    const recordedPageView = useRef('');
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
            setError(row ? '' : params.get('order') ? 'access_denied' : 'No payment reservation found.');
            const cachedStatus = user?.account_status || user?.accountStatus;
            if (row?.status === 'pending') observedPendingPayment.current = true;
            if (row?.status === 'paid' && cachedStatus === 'payment_pending') await refresh();
            if (row?.status === 'paid' && observedPendingPayment.current) {
                router.replace(`/meal?order=${encodeURIComponent(row.id)}&from=payment`);
                return;
            }
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
    useEffect(() => {
        if (!order?.id || recordedPageView.current === order.id) return;
        recordedPageView.current = order.id;
        db('payments.markPageViewed', { orderId:order.id }).catch(() => {
            recordedPageView.current = '';
        });
    }, [order?.id]);

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
    async function switchAccount() {
        await logout();
        router.push(`/login?next=${encodeURIComponent(paymentPath)}`);
    }
    if (!ready) return <div className="loading">Loading payment status…</div>;
    if (!user) return <section className="auth-page"><div className="auth-card center"><ShieldCheck size={40}/><h1>Sign in to pay.</h1><p className="muted">Use the credentials from your approval email. After sign-in, we’ll bring you back to this payment reservation.</p><Link className="button primary" href={`/login?next=${encodeURIComponent(paymentPath)}`}>Sign in and continue</Link></div></section>;
    if (loading) return <div className="loading">Loading payment status…</div>;
    if (error === 'access_denied') return <section className="auth-page"><div className="auth-card center"><span className="card-icon"><LockKeyhole/></span><h1>You do not have access to this payment link.</h1><p className="muted">You are signed in as {user.email}. This reservation may belong to a different account. Sign in with the email address that received the approval message.</p><button className="button primary" onClick={switchAccount}>Sign in with another account</button><Link className="button ghost" href="/ticket">View my tickets</Link></div></section>;
    if (error || !order) return <section className="auth-page"><div className="auth-card center"><h1>Payment unavailable.</h1><p className="muted">{error}</p><Link className="button ghost" href="/events">View events</Link></div></section>;

    const paid = order.status === 'paid';
    const unavailable = ['expired', 'cancelled'].includes(order.status) || remaining === 0;
    const supportMessage = encodeURIComponent(`Hi Matthew, I need help completing payment for my FoundersVN reservation. Order: ${order.id}`);
    const supportUrl = `https://wa.me/4915754444113?text=${supportMessage}`;

    return <><section className="page-hero payment-hero"><div className="container"><span className="eyebrow">{order.providerEnvironment === 'sandbox' ? 'Sandbox · no real charge' : 'Seat reservation'}</span><h1 className="display medium">{paid ? 'Payment confirmed.' : unavailable ? 'Reservation expired.' : 'Complete your payment.'}</h1><p className="lead">{order.event.name} · {formatDate(order.event.date)} · {order.ticketCount} ticket{order.ticketCount === 1 ? '' : 's'}</p></div></section>
        <section className="section compact"><div className="container payment-page-grid">
            <aside className="panel payment-status-card">
                <span className={`status ${order.status}`}>{order.status}</span>
                {paid ? <><CheckCircle2 className="payment-state-icon" size={44}/><h2>Your seat{order.ticketCount === 2 ? 's are' : ' is'} confirmed</h2><p className="muted">Paid with {order.paidProvider === 'sepay' ? 'SePay bank transfer' : 'Airwallex card'}.</p><Link className="button primary" href={`/meal?order=${encodeURIComponent(order.id)}`}>Choose your menu</Link><Link className="button ghost" href="/members">Browse attendees</Link></> : unavailable ? <><Clock3 className="payment-state-icon expired" size={44}/><h2>The 48-hour window ended</h2><p className="muted">This reservation expired and its seats have been released. You can request new tickets if registration is still open.</p>{order.event.slug && <Link className="button primary" href={`/events/${order.event.slug}/register`}>Request new tickets</Link>}<Link className="button ghost" href="/events">Browse events</Link><Link className="button ghost" href="/ticket">View my tickets</Link></> : <><div className="payment-countdown"><Clock3 size={18}/><span>Time remaining</span><strong>{countdown}</strong></div><p className="muted">We sent a reminder after 24 hours. The reservation releases automatically when this timer reaches zero.</p><button className="button ghost small" onClick={() => load()}><RefreshCw size={15}/> Refresh status</button></>}
            </aside>

            {!paid && !unavailable && <div className="payment-options-stack">
                <div className="payment-methods">
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
                </div>
                <article className="panel payment-support-card">
                    <div className="payment-support-copy"><span className="eyebrow">Support</span><h2>Having Trouble with Payment?</h2><p className="muted">Message Matthew on WhatsApp at +49 1575 4444113 and we’ll help you complete the reservation.</p></div>
                    <a className="button ghost payment-support-button" href={supportUrl} target="_blank" rel="noopener noreferrer">Request Payment Support Here</a>
                </article>
            </div>}
        </div></section></>;
}

export default function PaymentPage() {
    return <Suspense fallback={<div className="loading">Loading payment…</div>}><PaymentContent/></Suspense>;
}
