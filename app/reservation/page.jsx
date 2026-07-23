'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    CalendarDays, Check, CheckCircle2, Clock3, Copy, CreditCard,
    LockKeyhole, MapPin, QrCode, RefreshCw, ShieldCheck, Ticket
} from 'lucide-react';
import { init as initAirwallex } from '@airwallex/components-sdk';
import { callFunction } from '@/lib/api';
import './reservation.css';

const EVENT_SLUG = 'danang-jul-2026';
const STORAGE_PREFIX = 'fvn_quick_reservation_';

function usd(value) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
}

function vnd(value) {
    return `${new Intl.NumberFormat('vi-VN').format(Number(value || 0))} VND`;
}

function dateText(value) {
    if (!value) return 'Friday, July 31, 2026';
    return new Intl.DateTimeFormat('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
    }).format(new Date(value));
}

function accessStorageKey(orderId) {
    return `${STORAGE_PREFIX}${orderId}`;
}

function QuickReservationContent() {
    const params = useSearchParams();
    const router = useRouter();
    const [form, setForm] = useState({
        fullName: '', phone: '', email: '', ticketCount: 1, paymentMethod: 'sepay'
    });
    const [order, setOrder] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [cardLoading, setCardLoading] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState('');
    const [now, setNow] = useState(Date.now());

    const accessToken = order?.accessToken || params.get('access') || (
        typeof window !== 'undefined' && params.get('order')
            ? window.localStorage.getItem(accessStorageKey(params.get('order')))
            : ''
    );

    const refreshStatus = useCallback(async (silent = false) => {
        const orderId = order?.id || params.get('order');
        const token = order?.accessToken || params.get('access') || (
            typeof window !== 'undefined' && orderId
                ? window.localStorage.getItem(accessStorageKey(orderId))
                : ''
        );
        if (!orderId || !token) {
            if (orderId && !silent) setError('This payment link is missing its secure access code. Start a new reservation below.');
            return;
        }
        try {
            const result = await callFunction('quick-reservation', {
                action: 'status', orderId, accessToken: token
            }, { token: null });
            setOrder(result.order);
            setError('');
        } catch (statusError) {
            if (!silent) setError(statusError.message);
        }
    }, [order?.id, order?.accessToken, params]);

    useEffect(() => {
        if (params.get('order')) refreshStatus();
    }, []);

    useEffect(() => {
        if (!order || !['pending', 'preparing'].includes(order.status)) return undefined;
        const timer = window.setInterval(() => refreshStatus(true), 3500);
        return () => window.clearInterval(timer);
    }, [order?.id, order?.status, refreshStatus]);

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    const remaining = useMemo(() => Math.max(0, new Date(order?.expiresAt || 0).getTime() - now), [order?.expiresAt, now]);
    const countdown = useMemo(() => {
        const hours = Math.floor(remaining / 3600000);
        const minutes = Math.floor((remaining % 3600000) / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, [remaining]);

    async function startCard(targetOrder = order) {
        if (!targetOrder) return;
        setCardLoading(true);
        setError('');
        try {
            if (targetOrder.mockPayments) {
                await callFunction('quick-reservation', {
                    action: 'mockPay', orderId: targetOrder.id,
                    accessToken: targetOrder.accessToken, provider: 'airwallex'
                }, { token: null });
                await refreshStatus();
                return;
            }
            const checkout = await callFunction('quick-reservation', {
                action: 'card', orderId: targetOrder.id, accessToken: targetOrder.accessToken
            }, { token: null });
            const { payments } = await initAirwallex({
                env: checkout.environment,
                enabledElements: ['payments']
            });
            payments.redirectToCheckout({
                intent_id: checkout.intentId,
                client_secret: checkout.clientSecret,
                currency: checkout.currency
            });
        } catch (cardError) {
            setError(cardError.message);
        } finally {
            setCardLoading(false);
        }
    }

    async function submit(event) {
        event.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            const result = await callFunction('quick-reservation', {
                action: 'create',
                eventSlug: EVENT_SLUG,
                fullName: form.fullName,
                phone: form.phone,
                email: form.email,
                ticketCount: Number(form.ticketCount)
            }, { token: null });
            const created = result.order;
            setOrder(created);
            window.localStorage.setItem(accessStorageKey(created.id), created.accessToken);
            router.replace(`/reservation?order=${encodeURIComponent(created.id)}`, { scroll: false });
            if (form.paymentMethod === 'card') await startCard(created);
        } catch (submitError) {
            setError(submitError.message);
        } finally {
            setSubmitting(false);
        }
    }

    async function copy(value, label) {
        try {
            await navigator.clipboard.writeText(String(value || ''));
            setCopied(label);
            window.setTimeout(() => setCopied(''), 1500);
        } catch (_) {
            setCopied('Select and copy');
        }
    }

    function startOver() {
        if (order?.id) window.localStorage.removeItem(accessStorageKey(order.id));
        setOrder(null);
        setError('');
        router.replace('/reservation', { scroll: false });
    }

    const shownEvent = order?.event;
    const paid = order?.status === 'paid';
    const unavailable = order && ['expired', 'cancelled'].includes(order.status);
    const credentials = order?.credentials;

    return <div className="quick-reservation">
        <section className="quick-hero" id="top">
            <video className="quick-hero-media" autoPlay muted loop playsInline preload="metadata" poster="/video/poster.jpg" aria-hidden="true">
                <source src="/video/hero.webm" type="video/webm" />
            </video>
            <div className="quick-hero-shade" />
            <div className="quick-hero-inner">
                <div className="quick-hero-grid">
                    <div className="quick-intro">
                        <p className="quick-eyebrow">FoundersVN - Da Nang</p>
                        <h1>Claim your FoundersVN seat.</h1>
                        <p className="quick-lead">A direct, secure checkout for the curated FoundersVN founder dinner. Your ticket and account are created automatically after payment is verified.</p>
                        <div className="quick-event-facts" aria-label="Event details">
                            <div><CalendarDays size={18}/><span><small>Date and time</small><strong>{shownEvent ? dateText(shownEvent.date) : 'Friday, July 31, 2026'}<br/>6PM - 9PM</strong></span></div>
                            <div><MapPin size={18}/><span><small>Venue</small><strong>{shownEvent?.venueName || 'FOR YOU STEAKHOUSE'}<br/>{shownEvent?.location || 'Da Nang'}</strong></span></div>
                            <div><Ticket size={18}/><span><small>Format</small><strong>Private dinner<br/>25-seat room</strong></span></div>
                            <div><ShieldCheck size={18}/><span><small>Included</small><strong>Ticket and<br/>member access</strong></span></div>
                        </div>
                    </div>

                    <article className="quick-checkout" id="claim">
                        {!order && <>
                            <div className="quick-panel-head">
                                <span className="quick-panel-icon"><LockKeyhole size={19}/></span>
                                <div><h2>Reserve your seat</h2><p>Enter your contact details and choose how to pay.</p></div>
                            </div>
                            <form onSubmit={submit} className="quick-form">
                                <label><span>Full name</span><input required autoComplete="name" value={form.fullName} onChange={event => setForm({...form, fullName:event.target.value})} placeholder="Your full name"/></label>
                                <label><span>Email</span><input required type="email" autoComplete="email" value={form.email} onChange={event => setForm({...form, email:event.target.value})} placeholder="you@company.com"/></label>
                                <label className="quick-field-wide"><span>Phone / WhatsApp / Zalo</span><input required type="tel" autoComplete="tel" value={form.phone} onChange={event => setForm({...form, phone:event.target.value})} placeholder="+84 ..."/></label>
                                <label className="quick-field-wide"><span>Tickets</span><select value={form.ticketCount} onChange={event => setForm({...form, ticketCount:Number(event.target.value)})}><option value={1}>1 seat</option><option value={2}>2 seats</option></select></label>
                                <fieldset className="quick-methods quick-field-wide">
                                    <legend>Payment method</legend>
                                    <label className={form.paymentMethod === 'sepay' ? 'selected' : ''}>
                                        <input type="radio" name="paymentMethod" value="sepay" checked={form.paymentMethod === 'sepay'} onChange={() => setForm({...form, paymentMethod:'sepay'})}/>
                                        <QrCode size={20}/><span><b>SePay QR transfer</b><small>No platform fee</small></span><Check size={16}/>
                                    </label>
                                    <label className={form.paymentMethod === 'card' ? 'selected' : ''}>
                                        <input type="radio" name="paymentMethod" value="card" checked={form.paymentMethod === 'card'} onChange={() => setForm({...form, paymentMethod:'card'})}/>
                                        <CreditCard size={20}/><span><b>International card</b><small>5% platform fee</small></span><Check size={16}/>
                                    </label>
                                </fieldset>
                                <div className="quick-estimate quick-field-wide">
                                    <div><span>Ticket subtotal</span><b>{usd(150 * form.ticketCount)}</b></div>
                                    <div><span>Processing fee</span><b>{form.paymentMethod === 'card' ? usd(7.5 * form.ticketCount) : usd(0)}</b></div>
                                    <div><strong>Total due</strong><strong>{form.paymentMethod === 'card' ? usd(157.5 * form.ticketCount) : `${usd(150 * form.ticketCount)} converted to VND`}</strong></div>
                                </div>
                                {error && <p className="quick-error quick-field-wide">{error}</p>}
                                <button className="quick-primary quick-field-wide" disabled={submitting}>{submitting ? 'Creating secure payment...' : 'Continue to payment'}</button>
                                <p className="quick-micro quick-field-wide"><LockKeyhole size={13}/> Prices and payment references are generated securely by FoundersVN.</p>
                            </form>
                        </>}

                        {order && paid && <div className="quick-result">
                            <span className="quick-success-icon"><CheckCircle2 size={34}/></span>
                            <p className="quick-eyebrow">Payment confirmed</p>
                            <h2>Your seat{order.ticketCount === 2 ? 's are' : ' is'} secured.</h2>
                            <p>Your ticket is registered and the normal paid confirmation email has been sent to <strong>{order.email}</strong>.</p>
                            {credentials && <div className="quick-credentials">
                                <h3>{credentials.existingAccount ? 'Use your existing FoundersVN account' : 'Your temporary account credentials'}</h3>
                                <div><span>Email</span><code>{credentials.email}</code><button type="button" onClick={() => copy(credentials.email, 'email')} aria-label="Copy email"><Copy size={15}/></button></div>
                                {credentials.temporaryPassword && <div><span>Temporary password</span><code>{credentials.temporaryPassword}</code><button type="button" onClick={() => copy(credentials.temporaryPassword, 'password')} aria-label="Copy temporary password"><Copy size={15}/></button></div>}
                                {credentials.temporaryPassword && <p>Save these details now. You will set a permanent password after signing in.</p>}
                            </div>}
                            {copied && <p className="quick-copied">Copied {copied}</p>}
                            <div className="quick-result-actions">
                                <Link className="quick-primary" href={`/login?email=${encodeURIComponent(order.email)}&next=${encodeURIComponent(`/meal?order=${order.id}`)}`}>Sign in and choose your menu</Link>
                                <Link className="quick-secondary" href="/ticket">View ticket</Link>
                            </div>
                        </div>}

                        {order && unavailable && <div className="quick-result">
                            <span className="quick-expired-icon"><Clock3 size={32}/></span>
                            <p className="quick-eyebrow">Reservation ended</p>
                            <h2>This payment window has expired.</h2>
                            <p>No payment was recorded and no ticket was issued. You can start a new checkout now.</p>
                            <button className="quick-primary" type="button" onClick={startOver}>Start a new reservation</button>
                        </div>}

                        {order && !paid && !unavailable && <div className="quick-result quick-pending">
                            <div className="quick-pending-head">
                                <div><p className="quick-eyebrow">Payment pending</p><h2>Complete your payment</h2></div>
                                <button type="button" className="quick-icon-button" onClick={() => refreshStatus()} aria-label="Refresh status"><RefreshCw size={18}/></button>
                            </div>
                            <div className="quick-countdown"><Clock3 size={17}/><span>Secure checkout expires in</span><strong>{countdown}</strong></div>
                            <div className="quick-order-summary">
                                <div><span>{order.ticketCount} ticket{order.ticketCount === 1 ? '' : 's'}</span><b>{usd(order.baseAmountUsd)}</b></div>
                                <div><span>Event</span><b>{order.event.name}</b></div>
                            </div>
                            {order.providers.sepay && <div className="quick-pay-option">
                                <div className="quick-pay-title"><QrCode size={21}/><span><b>SePay QR transfer</b><small>No platform fee</small></span></div>
                                {order.sepayQrUrl && <img className="quick-qr" src={order.sepayQrUrl} alt={`Payment QR for ${vnd(order.sepayAmountVnd)}`}/>}
                                <div className="quick-transfer">
                                    <div><span>Exact amount</span><b>{vnd(order.sepayAmountVnd)}</b><button type="button" onClick={() => copy(order.sepayAmountVnd, 'amount')}><Copy size={14}/></button></div>
                                    <div><span>Bank</span><b>{order.sepayBank}</b></div>
                                    <div><span>Account</span><b>{order.sepayAccount}</b><button type="button" onClick={() => copy(order.sepayAccount, 'account')}><Copy size={14}/></button></div>
                                    <div><span>Transfer content</span><b>{order.sepayCode}</b><button type="button" onClick={() => copy(order.sepayCode, 'reference')}><Copy size={14}/></button></div>
                                </div>
                                {order.mockPayments && <button type="button" className="quick-secondary" onClick={async () => {
                                    await callFunction('quick-reservation', { action:'mockPay', orderId:order.id, accessToken, provider:'sepay' }, { token:null });
                                    await refreshStatus();
                                }}>Simulate QR payment</button>}
                            </div>}
                            {order.providers.airwallex && <div className="quick-pay-option quick-card-option">
                                <div className="quick-pay-title"><CreditCard size={21}/><span><b>International card</b><small>{usd(order.airwallexTotalUsd)} including 5% fee</small></span></div>
                                <button type="button" className="quick-primary" disabled={cardLoading} onClick={() => startCard()}>{cardLoading ? 'Opening checkout...' : 'Pay securely with Airwallex'}</button>
                            </div>}
                            {copied && <p className="quick-copied">Copied {copied}</p>}
                            {error && <p className="quick-error">{error}</p>}
                            <p className="quick-micro"><RefreshCw size={13}/> This page checks automatically. Keep it open until payment is confirmed.</p>
                        </div>}
                    </article>
                </div>
            </div>
        </section>

        <section className="quick-details" id="details">
            <div className="quick-wrap">
                <header><p className="quick-eyebrow">Before you arrive</p><h2>Not another crowded meetup.</h2><p>A small, curated dinner for people actively building or running a business. Your paid ticket includes the dinner and access to the attendee network.</p></header>
                <div className="quick-steps">
                    <article><span>01</span><h3>Pay securely</h3><p>Use a Vietnamese QR transfer or international card. We verify the exact amount through the provider webhook.</p></article>
                    <article><span>02</span><h3>Receive your account</h3><p>After payment, your ticket, attendance record, and FoundersVN login are created automatically.</p></article>
                    <article><span>03</span><h3>Choose your meal</h3><p>Sign in with the credentials shown here and emailed to you, then select your menu before the event.</p></article>
                </div>
            </div>
        </section>

        <section className="quick-included">
            <div className="quick-wrap quick-included-grid">
                <div><p className="quick-eyebrow">The FoundersVN experience</p><h2>A private founder dinner, curated around the right people.</h2><p>Each place includes dinner at FOR YOU SteakHouse, bilingual hosting, thoughtful introductions, and access to the attendee network.</p></div>
                <ul>
                    {['A curated room of founders and operators', 'Curated meal at FOR YOU SteakHouse', 'Vietnamese and English hosting', 'Attendee directory before and after the event', '750,000 VND food credit per paid ticket'].map(item => <li key={item}><Check size={17}/><span>{item}</span></li>)}
                </ul>
            </div>
        </section>
    </div>;
}

export default function ReservationPage() {
    return <Suspense fallback={<div className="quick-loading">Loading secure checkout...</div>}><QuickReservationContent/></Suspense>;
}
