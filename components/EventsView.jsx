'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CalendarDays, MapPin, UsersRound } from 'lucide-react';
import { db, formatDate } from '@/lib/api';
import { useAuth } from './AuthProvider';

const fallback = [
    { id: 'danang', slug: 'danang-jul-2026', name: 'Founders Dinner · Da Nang', event_date: '2026-07-31', location: 'FOR YOU SteakHouse, Da Nang', dinner_price: 150, status: 'open', description: 'A phone-free dinner for a carefully selected group of founders.', image_url: '/images/gallery/venue-wide.jpg' },
    { id: 'hcmc', slug: 'hcmc-aug-2026', name: 'Founders Dinner · Ho Chi Minh City', event_date: '2026-08-28', location: 'Ho Chi Minh City', dinner_price: 150, status: 'open', description: 'An intimate evening for founders building ambitious companies in Vietnam.', image_url: '/images/gallery/networking-2.jpg' }
];

export default function EventsView({ past = false }) {
    const { user } = useAuth();
    const [events, setEvents] = useState(null);
    useEffect(() => {
        db('events.list').then(rows => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            setEvents(rows.filter(e => past
                ? e.status === 'completed' || new Date(e.event_date) < today
                : e.status !== 'completed' && new Date(e.event_date) >= today));
        }).catch(() => setEvents(past ? [] : fallback));
    }, [past]);
    const rows = useMemo(() => events || [], [events]);

    if (!events) return <div className="loading">Loading events…</div>;
    return <div className="event-grid">
        {rows.map((event, index) => <article className="event-card" key={event.id || event.slug}>
            <Image className="event-card-image" src={event.image_url || fallback[index % fallback.length].image_url} alt="" width={760} height={440} />
            <div className="event-card-body"><span className="pill">{event.status || (past ? 'completed' : 'open')}</span><h2>{event.name || event.title}</h2><p className="muted">{event.description || 'A curated founder gathering built for meaningful conversations.'}</p>
                <div className="event-meta"><span><CalendarDays size={16} /> {formatDate(event.event_date || event.date, { weekday: 'long' })}</span><span><MapPin size={16} /> {event.location || event.venue || 'Vietnam'}</span><span><UsersRound size={16} /> {event.max_attendees || event.seats || 25} seats · ${Number(event.dinner_price || event.price || 150)}</span></div>
                {!past && <div className="event-card-actions">
                    <Link className="button primary" href={user ? `/events/${event.slug}/register` : `/login?next=/events/${event.slug}/register`}>
                        {user ? 'Register for event' : 'Sign in to register'}
                    </Link>
                    {!user && <Link className="button ghost" href="/#apply">Apply for access</Link>}
                </div>}
            </div>
        </article>)}
        {!rows.length && <div className="empty">No {past ? 'past' : 'upcoming'} events found.</div>}
    </div>;
}
