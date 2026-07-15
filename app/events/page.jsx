import Link from 'next/link';
import EventsView from '@/components/EventsView';

export const metadata = { title: 'Events' };
export default function EventsPage() {
    return <><section className="page-hero"><div className="container"><span className="eyebrow">Founder gatherings</span><h1 className="display medium">Rooms worth showing up for.</h1><p className="lead">Small tables, thoughtful people, and enough time to get past the rehearsed answers.</p></div></section><section className="section compact"><div className="container"><div className="toolbar"><h2>Upcoming events</h2><Link className="button ghost small" href="/events/past">View past events</Link></div><EventsView /></div></section></>;
}
