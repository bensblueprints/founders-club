'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CalendarDays, CheckCircle2, Clock3, CreditCard, MapPin, ShieldCheck, Ticket, UsersRound } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { callFunction, db, formatDate } from '@/lib/api';

export default function EventRegisterPage() {
    const { slug } = useParams();
    const { user, ready } = useAuth();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [ticketCount, setTicketCount] = useState('1');
    const [guestName, setGuestName] = useState('');
    const [status, setStatus] = useState(null);
    const [busy, setBusy] = useState(false);
    const [registration, setRegistration] = useState(null);

    useEffect(() => {
        if (!slug) return;
        db('events.getBySlug', { slug }).then(setEvent).catch(e => setStatus({ type: 'error', message: e.message })).finally(() => setLoading(false));
    }, [slug]);

    useEffect(() => {
        if (!user || !event?.id) {
            setRegistration(null);
            return;
        }
        db('eventRegistration.status', { slug }).then(data => {
            setRegistration(data);
            const remaining = Number(data?.remainingTickets ?? 2);
            if (remaining <= 1) setTicketCount('1');
        }).catch(() => {});
    }, [user, event, slug]);

    async function refreshRegistration() {
        if (!user || !event?.id) return;
        const data = await db('eventRegistration.status', { slug });
        setRegistration(data);
        if (Number(data?.remainingTickets ?? 2) <= 1) setTicketCount('1');
    }

    async function submit(eventObject) {
        eventObject.preventDefault();
        setBusy(true);
        setStatus(null);
        try {
            await callFunction('register-event', { eventSlug: slug, ticketCount: Number(ticketCount), guestName });
            setStatus({ type: 'success', message: 'Registration request sent. An admin will review it before a 48-hour payment reservation is created.' });
            await refreshRegistration();
        } catch (error) { setStatus({ type: 'error', message: error.message }); }
        finally { setBusy(false); }
    }

    if (!ready || loading) return <div className="loading">Loading registration…</div>;
    if (!user) return <section className="auth-page"><div className="auth-card center"><ShieldCheck size={40}/><h1>Sign in to register.</h1><p className="muted">Existing members use this dedicated registration request. New founders can apply from the landing page.</p><Link className="button primary" href={`/login?next=/events/${slug}/register`}>Sign in</Link><Link className="button ghost" href="/#apply">Apply for access</Link></div></section>;
    if (!event) return <section className="auth-page"><div className="auth-card center"><h1>Event not found.</h1><Link className="button primary" href="/events">Back to events</Link></div></section>;

    const activeOrders = registration?.activeOrders || [];
    const pendingPaymentOrder = activeOrders.find(order => ['pending', 'preparing'].includes(order.status));
    const paidTickets = Number(registration?.paidTickets || 0);
    const pendingPaymentTickets = Number(registration?.pendingPaymentTickets || 0);
    const pendingReviewTickets = Number(registration?.pendingReviewTickets || 0);
    const totalTickets = Number(registration?.totalTickets || 0);
    const remainingTickets = Number(registration?.remainingTickets ?? 2);
    const canRequest = remainingTickets > 0;
    const requestingAdditional = totalTickets > 0;
    const needsGuestName = requestingAdditional || ticketCount === '2';

    return <><section className="page-hero"><div className="container"><span className="eyebrow">Member registration</span><h1 className="display medium">{event.name}</h1><p className="lead">Request up to two seats. Approval creates a 48-hour reservation with the payment methods currently available for this event.</p></div></section><section className="section compact"><div className="container register-layout">
        <aside className="panel register-summary"><span className={`status ${event.status}`}>{event.status}</span><div className="event-meta register-meta"><span><CalendarDays size={16}/>{formatDate(event.event_date, { weekday: 'long' })}</span><span><MapPin size={16}/>{event.location}</span><span><UsersRound size={16}/>{event.max_attendees} seats total</span><span><Ticket size={16}/>${Number(event.dinner_price || 150)} USD per ticket</span></div>
            {totalTickets > 0 && <div className="registration-status-card">
                <b>Your event tickets</b>
                <span>{paidTickets} paid · {pendingPaymentTickets} pending payment · {pendingReviewTickets} in review</span>
                <small>{remainingTickets > 0 ? `You can request ${remainingTickets} more ticket${remainingTickets === 1 ? '' : 's'}.` : 'You have reached the 2-ticket maximum for this event.'}</small>
            </div>}
        </aside>
        <div className="register-stack">
            {pendingPaymentOrder && <article className="panel ticket-pending-card">
                <div className="ticket-pending-icon"><CreditCard size={25}/></div>
                <div><span className="eyebrow">Payment pending</span><h2>Your ticket reservation is waiting for payment.</h2><p className="muted">Complete payment before the 48-hour hold expires to confirm this seat.</p><div className="ticket-pending-meta"><span><Clock3 size={13}/> Pending payment</span><span>{pendingPaymentOrder.ticketCount} ticket{pendingPaymentOrder.ticketCount === 1 ? '' : 's'}</span></div></div>
                <div className="ticket-pending-actions"><Link className="button primary" href={`/payment?order=${pendingPaymentOrder.id}`}>Proceed to Payment</Link></div>
            </article>}
            {paidTickets > 0 && <div className="form-status success"><CheckCircle2 size={17}/>You already have {paidTickets} paid ticket{paidTickets === 1 ? '' : 's'} for this event.</div>}
            {pendingReviewTickets > 0 && <div className="form-status"><Clock3 size={17}/>Your additional ticket request is waiting for admin review.</div>}
            {canRequest ? <form className="panel register-section" onSubmit={submit}><h2>{requestingAdditional ? 'Request one more ticket' : 'Request your seat'}</h2><p className="muted">{requestingAdditional ? 'You can add one co-founder / partner ticket to this account. Admin approval is still required.' : 'Your existing profile information will be attached for admin review.'}</p><div className="ticket-count-options"><label className={ticketCount === '1' ? 'selected' : ''}><input type="radio" value="1" checked={ticketCount === '1'} onChange={() => setTicketCount('1')}/>{requestingAdditional ? '1 additional ticket' : '1 ticket'}<span>{requestingAdditional ? 'For partner / co-founder' : 'For me'}</span></label>{remainingTickets >= 2 && <label className={ticketCount === '2' ? 'selected' : ''}><input type="radio" value="2" checked={ticketCount === '2'} onChange={() => setTicketCount('2')}/>2 tickets<span>Me + partner / co-founder</span></label>}</div>{needsGuestName && <div className="field"><label htmlFor="guestName">Partner / co-founder full name</label><input id="guestName" value={guestName} onChange={e => setGuestName(e.target.value)} required/></div>}{status && <div className={`form-status ${status.type}`}>{status.message}</div>}<button className="button primary" disabled={busy}>{busy ? 'Sending…' : 'Send for admin review'}</button></form> : <article className="panel register-section"><h2>Maximum tickets reached</h2><p className="muted">Each member account can hold up to 2 tickets for this event.</p>{status && <div className={`form-status ${status.type}`}>{status.message}</div>}</article>}
        </div>
    </div></section></>;
}
