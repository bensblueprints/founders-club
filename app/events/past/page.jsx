import Link from 'next/link';
import { Camera, LockKeyhole } from 'lucide-react';

export const metadata = { title: 'Past events' };

const gallery = ['group-photo.jpg', 'networking-2.jpg', 'venue-wide.jpg', 'dinner-2.jpg'];

export default function PastEventsPage() {
    return <main className="past-events-main">
        <section className="past-events-header">
            <div className="header-content">
                <Link href="/events" className="back-link">← Back to Events</Link>
                <h1>Past Gatherings</h1>
                <p>Relive the moments and connect with fellow attendees</p>
            </div>
        </section>

        <section className="featured-past-event">
            <div className="event-hero">
                <div className="event-hero-content">
                    <div className="event-date-badge">
                        <span className="day">24</span>
                        <span className="month">JAN</span>
                        <span className="year">2026</span>
                    </div>
                    <h2>January Gathering</h2>
                    <p className="event-tagline">Our inaugural gathering brought together Vietnam&apos;s most ambitious founders</p>
                    <div className="event-stats-row">
                        <div className="event-stat"><span className="stat-value">25</span><span className="stat-label">Attendees</span></div>
                        <div className="event-stat"><span className="stat-value">6</span><span className="stat-label">Industries</span></div>
                        <div className="event-stat"><span className="stat-value">30</span><span className="stat-label">Connections Made</span></div>
                    </div>
                </div>
            </div>

            <div className="event-gallery">
                <h3 className="section-title-gold">Event Photos</h3>
                <div className="gallery-grid">
                    {gallery.map(image => <div className="gallery-item" key={image}><img src={`/images/landing/${image}`} alt="FoundersVN past gathering" /></div>)}
                    {!gallery.length && <div className="gallery-placeholder"><Camera size={48}/><p>Photos coming soon</p><span>Check back after the event photos are uploaded</span></div>}
                </div>
            </div>

            <div className="event-attendees">
                <div className="attendees-header">
                    <h3 className="section-title-gold">Who Attended</h3>
                    <p className="attendees-note">Connect with founders you met at this event</p>
                </div>
                <div className="attendees-restricted">
                    <div className="restricted-content">
                        <div className="restricted-icon"><LockKeyhole size={48}/></div>
                        <h4>Attendees Only</h4>
                        <p>Only members who attended this event can view the attendee list and profiles.</p>
                        <p className="restricted-note">Attended this event? Make sure your account is linked to your attendance.</p>
                    </div>
                </div>
            </div>
        </section>

        <section className="other-past-events">
            <h3 className="section-title-gold">All Past Events</h3>
            <div className="past-events-list">
                <div className="past-event-card active">
                    <div className="past-event-date"><span className="day">24</span><span className="month">JAN 2026</span></div>
                    <div className="past-event-info"><h4>January Gathering</h4><p>Inaugural event • Ho Chi Minh City</p></div>
                    <span className="past-event-badge">Latest</span>
                </div>
            </div>
        </section>
    </main>;
}
