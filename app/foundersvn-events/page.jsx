import LandingAnimations from '@/components/LandingAnimations';
import { EventHeroMedia, RotatingCube } from '@/components/ResponsiveEventMedia';

export const metadata = { title: 'FoundersVN events' };

const modelCards = [
    ['Curated room', 'Selected for relevance, seriousness, and contribution potential, not just industry.'],
    ['Hosted tables', 'Multiple smaller tables, guided lightly by hosts. Not one long table.'],
    ['Digital layer', 'The app shows attendee profiles and upcoming editions, and keeps contacts saved for follow-up.'],
    ['Follow-up loop', 'Contacts stay saved in the app after dinner so the strongest conversations continue.']
];

const timeline = [
    ['Da Nang, Edition 01', 'Friday, July 31, 2026 · 4U Lounge, Võ Nguyên Giáp · 25 seats'],
    ['Ho Chi Minh City, Planned', 'August 15 to 16, 2026 · shaped by what we learn from Da Nang'],
    ['Future editions', 'More city chapters and collaborations to be announced.']
];

const gallery = [
    '/images/landing/venue-wide.jpg',
    '/images/landing/networking-1.jpg',
    '/assets/event-generated/founders-vn-steak-lobster-dinner.png',
    '/images/landing/dinner-2.jpg',
    '/images/landing/group-photo.jpg',
    '/images/landing/networking-2.jpg',
    '/assets/event-generated/founders-vn-steak-lobster-waiter-pov.png',
    '/images/landing/venue-detail.jpg'
];

export default function FoundersVNEventsPage() {
    return <main className="legacy-info-page legacy-events-page">
        <LandingAnimations />
        <section className="legacy-event-hero">
            <EventHeroMedia />
            <div className="legacy-event-hero-wrap">
                <div className="legacy-event-hero-grid">
                    <div className="reveal">
                        <p className="legacy-eyebrow">About</p>
                        <h1>FoundersVN events</h1>
                        <p className="legacy-lead">A phone-free networking series built around curated rooms, hosted tables, and a digital layer that keeps the logistics quiet.</p>
                    </div>
                    <div className="legacy-cube-wrap legacy-event-cube-wrap reveal">
                        <RotatingCube className="legacy-cube-img legacy-event-cube-img" />
                    </div>
                </div>
            </div>
        </section>

        <section className="legacy-info-section reveal">
            <p className="legacy-eyebrow">The model</p>
            <div className="legacy-model-grid">
                {modelCards.map(([title, body]) => <article className="legacy-info-card" key={title}>
                    <h2>{title}</h2>
                    <p>{body}</p>
                </article>)}
            </div>
        </section>

        <section className="legacy-info-section reveal">
            <p className="legacy-eyebrow">Timeline</p>
            <div className="legacy-timeline">
                {timeline.map(([title, body]) => <div className="legacy-timeline-event" key={title}>
                    <strong>{title}</strong>
                    <p>{body}</p>
                </div>)}
            </div>
        </section>

        <section className="legacy-info-section legacy-recap reveal">
            <p className="legacy-eyebrow">From past gatherings</p>
            <h2>A glimpse of the room</h2>
            <p className="legacy-lead small">Real venue, real people. The full Da Nang Edition 01 recap lands right here after July 31, with attendees, quotes, and key moments.</p>
            <div className="legacy-marq" aria-label="Photos from FoundersVN gatherings">
                <div className="legacy-marq-track">
                    {[...gallery, ...gallery].map((image, index) => <img key={`${image}-${index}`} src={image} alt={index < gallery.length ? 'FoundersVN gathering' : ''} />)}
                </div>
            </div>
        </section>
    </main>;
}
