'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CalendarDays, CheckCircle2, MapPin, ShieldCheck, Ticket, UsersRound } from 'lucide-react';
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
    const [alreadyPaid, setAlreadyPaid] = useState(false);

    useEffect(() => {
        if (!slug) return;
        db('events.getBySlug', { slug }).then(setEvent).catch(e => setStatus({ type: 'error', message: e.message })).finally(() => setLoading(false));
    }, [slug]);
    useEffect(() => {
        if (user && event?.id) db('attendance.check', { eventId: event.id }).then(setAlreadyPaid).catch(() => {});
    }, [user, event]);

    async function submit(eventObject) {
        eventObject.preventDefault();
        setBusy(true);
        setStatus(null);
        try {
            await callFunction('register-event', { eventSlug: slug, ticketCount: Number(ticketCount), guestName });
            setStatus({ type: 'success', message: 'Registration request sent. An admin will review it before a 48-hour payment reservation is created.' });
        } catch (error) { setStatus({ type: 'error', message: error.message }); }
        finally { setBusy(false); }
    }

    if (!ready || loading) return <div className="loading">Loading registration…</div>;
    if (!user) return <section className="auth-page"><div className="auth-card center"><ShieldCheck size={40}/><h1>Sign in to register.</h1><p className="muted">Existing members use this dedicated registration request. New founders can apply from the landing page.</p><Link className="button primary" href={`/login?next=/events/${slug}/register`}>Sign in</Link><Link className="button ghost" href="/#apply">Apply for access</Link></div></section>;
    if (!event) return <section className="auth-page"><div className="auth-card center"><h1>Event not found.</h1><Link className="button primary" href="/events">Back to events</Link></div></section>;

    return <><section className="page-hero"><div className="container"><span className="eyebrow">Member registration</span><h1 className="display medium">{event.name}</h1><p className="lead">Request one or two seats. Approval creates a 48-hour reservation with the payment methods currently available for this event.</p></div></section><section className="section compact"><div className="container register-layout">
        <aside className="panel register-summary"><span className={`status ${event.status}`}>{event.status}</span><div className="event-meta register-meta"><span><CalendarDays size={16}/>{formatDate(event.event_date, { weekday: 'long' })}</span><span><MapPin size={16}/>{event.location}</span><span><UsersRound size={16}/>{event.max_attendees} seats total</span><span><Ticket size={16}/>${Number(event.dinner_price || 150)} USD per ticket</span></div>{alreadyPaid && <div className="form-status success"><CheckCircle2 size={17}/>You are already confirmed for this event.</div>}</aside>
        <form className="panel register-section" onSubmit={submit}><h2>Request your seat</h2><p className="muted">Your existing profile information will be attached for admin review.</p><div className="ticket-count-options"><label className={ticketCount === '1' ? 'selected' : ''}><input type="radio" value="1" checked={ticketCount === '1'} onChange={() => setTicketCount('1')}/>1 ticket<span>For me</span></label><label className={ticketCount === '2' ? 'selected' : ''}><input type="radio" value="2" checked={ticketCount === '2'} onChange={() => setTicketCount('2')}/>2 tickets<span>Me + partner / co-founder</span></label></div>{ticketCount === '2' && <div className="field"><label htmlFor="guestName">Partner / co-founder full name</label><input id="guestName" value={guestName} onChange={e => setGuestName(e.target.value)} required/></div>}{status && <div className={`form-status ${status.type}`}>{status.message}</div>}<button className="button primary" disabled={busy || alreadyPaid}>{busy ? 'Sending…' : alreadyPaid ? 'Already confirmed' : 'Send for admin review'}</button></form>
    </div></section></>;
}
