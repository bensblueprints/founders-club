'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CalendarDays, CheckCircle2, Clock3, Download, MapPin, Printer, QrCode, UsersRound } from 'lucide-react';
import QRCode from 'qrcode';
import { useAuth } from '@/components/AuthProvider';
import { db, formatDate } from '@/lib/api';

function TicketCard({ order, attendee }) {
    const [qrDataUrl, setQrDataUrl] = useState('');
    const paid = order.status === 'paid';
    useEffect(() => {
        if (!paid) return;
        QRCode.toDataURL(`FVN:${order.id}`, { width:280, margin:2, errorCorrectionLevel:'M', color:{ dark:'#001e16', light:'#ffffff' } })
            .then(setQrDataUrl).catch(() => setQrDataUrl(''));
    }, [order.id, paid]);
    if (!paid) {
        const pending = order.status === 'pending';
        return <article className="panel ticket-pending-card">
            <div className="ticket-pending-icon">{pending ? <Clock3 size={28}/> : <AlertCircle size={28}/>}</div>
            <div>
                <span className={`status ${order.status}`}>{pending ? 'payment pending' : order.status}</span>
                <h2>{pending ? 'Payment required before ticket is issued' : 'Ticket unavailable'}</h2>
                <p className="muted">{pending
                    ? 'Your seat reservation is active, but the ticket QR and check-in details only unlock after payment is completed.'
                    : `This reservation is ${order.status} and cannot be used for entry.`}</p>
                <div className="ticket-pending-meta">
                    <span>{order.event.name}</span>
                    <span>{formatDate(order.event.date, { weekday:'long' })}</span>
                    <span>{order.ticketCount} ticket{order.ticketCount === 1 ? '' : 's'}</span>
                </div>
            </div>
            <div className="ticket-pending-actions">
                {pending ? <Link className="button primary" href={`/payment?order=${order.id}`}>Proceed to Payment</Link> : <Link className="button ghost" href="/events">View events</Link>}
            </div>
        </article>;
    }
    return <article className="ticket-record">
        <div className="digital-ticket">
            <div className="ticket-top"><div><span className="brand-text">FOUNDERS</span><span className="brand-accent"> VIETNAM</span></div><span className={`status ${order.status}`}>{paid ? 'confirmed' : order.status}</span></div>
            <div className="ticket-divider"><span/><i/><i/></div>
            <div className="ticket-body">
                <h2>{order.event.name}</h2><p className="ticket-name">{order.ticketCount} event ticket{order.ticketCount === 1 ? '' : 's'}</p>
                <div className="ticket-detail-grid"><div><span>Date</span><b>{formatDate(order.event.date, { weekday:'long' })}</b></div><div><span>Time</span><b>{String(order.event.time || '18:00').slice(0,5)}</b></div><div className="full"><span>Venue</span><b>{order.event.venueName || order.event.location || 'FoundersVN venue'}</b>{order.event.venueAddress && <small>{order.event.venueAddress}</small>}</div></div>
                <div className="ticket-attendee"><span>Attendee</span><b>{attendee}</b></div>{order.guestName && <div className="ticket-attendee"><span>Partner / co-founder</span><b>{order.guestName}</b></div>}
                <div className="ticket-ref"><span>Booking ref</span><b>{order.id}</b></div>
            </div>
            <div className="ticket-qr">{qrDataUrl ? <img className="ticket-qr-image" src={qrDataUrl} alt={`Scannable ticket reference ${order.id}`}/> : <QrCode size={96}/>}<p>Present this QR or booking reference at check-in</p></div>
            <div className="ticket-footer-line">foundersvietnam.com</div>
        </div>
        <aside className="ticket-side">
            <div className="panel"><h2>Event details</h2><div className="event-meta register-meta"><span><CalendarDays size={16}/>{formatDate(order.event.date, { weekday:'long' })}</span><span><MapPin size={16}/>{order.event.venueName || order.event.location || 'Vietnam'}</span>{order.event.venueAddress && <span><MapPin size={16}/>{order.event.venueAddress}</span>}<span><UsersRound size={16}/>{order.ticketCount} ticket{order.ticketCount === 1 ? '' : 's'}</span></div></div>
            <div className="panel ticket-actions-panel"><button className="button primary" onClick={()=>window.print()}><Printer size={17}/> Print ticket</button><button className="button ghost" onClick={()=>window.print()}><Download size={17}/> Save as PDF</button><Link className="button ghost" href="/meal">Choose meal</Link><Link className="button primary" href="/members">Member directory</Link></div>
        </aside>
    </article>;
}

function TicketContent() {
    const { user, ready } = useAuth();
    const params = useSearchParams();
    const [orders, setOrders] = useState(null);
    const [selectedId, setSelectedId] = useState('');
    const [error, setError] = useState('');
    useEffect(() => {
        if (!ready || !user) return;
        let active = true;
        db('payments.list').then(rows => { if (active) setOrders(rows || []); }).catch(e => { if (active) setError(e.message); });
        return () => { active = false; };
    }, [ready, user]);
    const attendee = useMemo(() => `${user?.firstName || user?.first_name || ''} ${user?.lastName || user?.last_name || ''}`.trim() || user?.email || '', [user]);
    const sorted = useMemo(() => {
        const list = [...(orders || [])];
        const requested = params.get('id');
        return list.sort((a, b) => {
            if (requested) {
                if (a.id === requested) return -1;
                if (b.id === requested) return 1;
            }
            const rank = order => order.status === 'pending' ? 0 : order.status === 'paid' ? 1 : 2;
            const ranked = rank(a) - rank(b);
            if (ranked !== 0) return ranked;
            return new Date(b.createdAt || b.created_at || b.event?.date || 0) - new Date(a.createdAt || a.created_at || a.event?.date || 0);
        });
    }, [orders, params]);
    useEffect(() => {
        if (!sorted.length) return;
        const requested = params.get('id');
        const requestedOrder = requested && sorted.find(order => order.id === requested);
        const currentOrder = selectedId && sorted.find(order => order.id === selectedId);
        if (requestedOrder && requestedOrder.id !== selectedId) setSelectedId(requestedOrder.id);
        else if (!currentOrder) setSelectedId(sorted[0].id);
    }, [sorted, params, selectedId]);
    if (!ready || (user && orders === null && !error)) return <div className="loading">Loading all tickets…</div>;
    if (!user) return <section className="auth-page"><div className="auth-card center"><QrCode style={{color:'var(--lime)'}} size={40}/><h1>Sign in to view your tickets.</h1><Link className="button primary" href="/login?next=/ticket">Sign in</Link></div></section>;
    if (error || !sorted.length) return <section className="auth-page"><div className="auth-card center"><AlertCircle style={{color:'var(--orange)'}} size={40}/><h1>{error || 'No tickets found'}</h1><p className="muted">Register for an upcoming event to see it here.</p><Link className="button primary" href="/events">View events</Link></div></section>;
    const paidCount = sorted.filter(order => order.status === 'paid').length;
    const pendingCount = sorted.filter(order => order.status === 'pending').length;
    const selectedOrder = sorted.find(order => order.id === selectedId) || sorted[0];
    return <><section className="ticket-success-hero"><div className="container center"><CheckCircle2 size={48}/><h1>Your tickets</h1><p>{sorted.length} registration{sorted.length === 1 ? '' : 's'} · {paidCount} confirmed{pendingCount ? ` · ${pendingCount} pending payment` : ''}</p></div></section><section className="section compact"><div className="container ticket-collection">
        <div className="panel ticket-picker">
            <div className="ticket-picker-heading"><h2>Select a registration</h2><p className="muted">Pending payments are shown first.</p></div>
            <div className="ticket-picker-list" role="listbox" aria-label="Your ticket registrations">
                {sorted.map(order => <button type="button" key={order.id} className={`ticket-picker-item ${selectedOrder.id === order.id ? 'selected' : ''}`} onClick={() => setSelectedId(order.id)} role="option" aria-selected={selectedOrder.id === order.id}>
                    <span className={`status ${order.status}`}>{order.status === 'pending' ? 'payment pending' : order.status === 'paid' ? 'confirmed' : order.status}</span>
                    <strong>{order.event.name}</strong>
                    <small>{formatDate(order.event.date, { weekday:'long' })} · {order.ticketCount} ticket{order.ticketCount === 1 ? '' : 's'}</small>
                </button>)}
            </div>
        </div>
        <TicketCard key={selectedOrder.id} order={selectedOrder} attendee={attendee}/>
    </div></section></>;
}

export default function TicketPage() {
    return <Suspense fallback={<div className="loading">Loading tickets…</div>}><TicketContent/></Suspense>;
}
