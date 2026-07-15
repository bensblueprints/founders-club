import Link from 'next/link';
import ApplicationForm from '@/components/ApplicationForm';
import LandingAnimations from '@/components/LandingAnimations';

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
const testimonials = [
    ['The group was small enough to have proper conversations, and the table arrangement made it easy to meet people outside my usual circle. I left with three useful introductions already lined up.', 'avatar-1.jpg', 'Arjun Mehta', 'Founder, Rove Studio'],
    ['The hosts were warm, attentive, and genuinely helpful. They remembered what each person was looking for and introduced me to two founders who were especially relevant to my business.', 'avatar-2.jpg', 'Khoa Tran', 'Product Lead, Waverly'],
    ['Everything felt thoughtfully organised, from the dinner at 4U Lounge to the attendee profiles in the app. I knew who I wanted to speak with before arriving and could reconnect easily afterwards.', 'avatar-3.jpg', 'Ethan Cole', 'Founder, Cortex AI']
];
const agenda = [
    ['6:00 PM', 'Welcome', 'Arrival, check-in, first drinks.'],
    ['6:30 PM', "A founder's story", 'A short guest share to open the room.'],
    ['7:00 PM', 'Dinner', 'The meal, hosted at tables of 6 to 8.'],
    ['8:00 PM', 'Bonding & intros', 'Light games, then real introductions.'],
    ['8:30 PM', 'Open floor', 'Free-flow conversation to close the night.']
];
const faqs = [
    ['Who is this for?', 'Founders, business owners, operators, and people directly building or growing a company. We curate by level and quality, not by industry.'],
    ['Why apply first?', 'Because there are only 25 seats. We want everyone in the room to have a reason to meet the others.'],
    ['Do I need strong English?', "No. The event has Vietnamese/English hosting. If you're not comfortable in English, the team can help you prepare a short intro before the event."],
    ['What does phone-free mean?', 'During the main parts of the night, we ask people to put phones away and focus on the conversation. You can still use your phone when necessary.'],
    ['What does $150 include?', "Dinner with steak, shrimp, chicken, or vegan options, bilingual hosting, and access to the attendee directory before and after the event. Most of all, you're paying for the quality of the room."],
    ['What if the event is cancelled?', "You get a refund. If you've paid and the final fit does not work, the team will handle refund or rescheduling clearly."],
    ['Will there be another event after Da Nang?', 'Yes. FoundersVN plans to run the next edition in Ho Chi Minh City in August, shaped by what we learn from the Da Nang pilot.']
];

function Tick() {
    return <span className="ck"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="m5 12.5 4.5 4.5L19 7" /></svg></span>;
}

export default function HomePage() {
    return <>
        <div className="landing-original">
            <LandingAnimations />
            <section className="hero" id="top">
                <video className="hero-media" autoPlay muted loop playsInline preload="metadata" poster="/video/poster.jpg" aria-hidden="true"><source src="/video/hero.webm" type="video/webm" /></video>
                <div className="hero-shade" />
                <div className="hero-in"><div className="hero-content">
                    <h1><span>Phone-Free</span><span><em>Networking</em> <b>for</b></span><span>Founders</span></h1>
                    <p className="hero-sub">An intimate founder dinner in Da Nang, designed for deeper conversations and quietly supported by technology so every introduction feels natural.</p>
                    <aside className="infocard" aria-label="Event details">
                        <div className="ic"><span className="ic-l">Date</span><span className="ic-v">Friday 31/07/2026</span></div>
                        <div className="ic"><span className="ic-l">Venue</span><span className="ic-v">4U Lounge, Da Nang</span></div>
                        <div className="ic"><span className="ic-l">Capacity</span><span className="ic-v">25 seats</span></div>
                        <div className="ic"><span className="ic-l">Ticket</span><span className="ic-v">$150</span></div>
                    </aside>
                    <div className="hero-cta"><Link className="legacy-btn" href="#apply">Apply for a seat <span>→</span></Link><Link className="link-quiet" href="#how">How it works <span>→</span></Link></div>
                </div></div>
            </section>

            <section className="pos" id="about"><div className="wrap"><div className="pos-grid">
                <div className="pos-copy" data-reveal><p className="kicker">Why FoundersVN</p><h2>Not another crowded meetup.</h2><p>A small, curated dinner for people actively building or running a business.</p><p>Curated by quality, role, and the ability to create value for each other, not by industry.</p></div>
                <figure className="pos-fig" data-reveal="right"><img src="/images/landing/networking-1.jpg" alt="Founders in conversation across hosted tables at 4U Lounge, Da Nang" /><figcaption>A real venue. Real people. 4U Lounge on Võ Nguyên Giáp, Da Nang.</figcaption></figure>
            </div></div></section>

            <section className="how" id="how"><div className="wrap"><div className="sec-head" data-reveal="down"><h2>How it works</h2></div><div className="how-grid">
                <div className="step" data-reveal><div className="step-top"><span className="step-no">01</span><span className="step-line" /></div><h3>Know the room</h3><p>Open the FoundersVN app before you arrive and see who&apos;s coming, what they do, and where you can help each other.</p></div>
                <div className="step" data-reveal><div className="step-top"><span className="step-no">02</span><span className="step-line" /></div><h3>Share good food and conversation</h3><p>Enjoy the meal and the people at your table. No need to pull out your phone to swap contacts, just be present.</p></div>
                <div className="step" data-reveal><div className="step-top"><span className="step-no">03</span><span className="step-line" /></div><h3>Follow up after</h3><p>After the dinner, reconnect through the app. Save contacts and reach out to the people worth following up with.</p></div>
            </div></div></section>

            <section className="app-layer" id="app"><div className="wrap"><div className="app-grid">
                <div className="app-copy" data-reveal><p className="kicker">Digital layer</p><h2>The Digital Layer Behind Every Conversation</h2><p>Before dinner, browse attendee profiles and see who&apos;s coming to future editions. After the event, contacts are saved in the app, so nobody needs to swap numbers on the spot.</p><div className="app-points"><span>Attendee profiles before you arrive</span><span>See upcoming FoundersVN editions</span><span>Contacts saved, ready to follow up</span></div></div>
                <figure className="app-fig" data-reveal="right"><img className="app-watermark" src="/assets/brand/founders-vn-wavy-icon-white.svg" alt="" /><img className="app-shot" src="/images/landing/app-mockup-final.png" alt="FoundersVN app attendee directory and profiles" /><span className="app-badge"><img src="/assets/brand/founders-vn-wavy-icon-rounded-square-2048.png" alt="" /></span></figure>
            </div></div></section>

            <section className="offer" id="offer"><div className="wrap"><div className="offer-grid">
                <div className="offer-copy" data-reveal><p className="kicker">The ticket</p><h2>Your seat includes</h2><p className="legacy-lead">$150 includes both the curated networking experience and your choice of steak, shrimp, chicken, or vegan dinner at 4U Lounge, not just a seat in the room.</p><Link className="legacy-btn" href="#apply">Apply for a seat <span>→</span></Link><p className="offer-refund">✓ <span>Full refund if we cancel the event.</span></p></div>
                <div className="incl">{['A curated room of 25 founders & operators','Steak, shrimp, chicken, or vegan dinner option','Dinner at 4U Lounge, Da Nang','Attendee directory, before and after','Hosted introductions in Vietnamese & English','A phone-free setting'].map(item => <div className="incl-item" data-reveal key={item}><Tick /><p>{item}</p></div>)}</div>
            </div></div></section>

            <section className="agenda" id="agenda"><div className="wrap">
                <div className="sec-head" data-reveal="down"><p className="kicker">The evening</p><h2>A rough shape for the night</h2></div>
                <div className="agenda-line" data-stagger>
                    {agenda.map(([time, title, body]) => <article className="agenda-stop" data-reveal key={time}>
                        <span className="ag-time">{time}</span>
                        <span className="ag-dot" />
                        <h3>{title}</h3>
                        <p>{body}</p>
                    </article>)}
                </div>
            </div></section>

            <section className="gallery" aria-label="Photos from FoundersVN gatherings"><div className="marq"><div className="marq-track">{[...gallery, ...gallery].map((image, index) => <img key={`${image}-${index}`} src={image} alt={index < gallery.length ? 'FoundersVN gathering' : ''} />)}</div></div></section>

            <section className="people"><div className="wrap"><div className="sec-head" data-reveal="down"><p className="kicker">Attendee reviews</p><h2>What attendees say about FoundersVN</h2></div><div className="testi-grid">{testimonials.map(([quote, image, name, role]) => <article className="testi-card" data-reveal key={name}><blockquote>{quote}</blockquote><div className="testi-who"><img src={`/images/landing/${image}`} alt="" /><p>{name}<small>{role}</small></p></div></article>)}</div></div></section>

            <section className="faq" id="faq"><div className="wrap"><div className="sec-head" data-reveal="down"><p className="kicker">FAQ</p><h2>Questions, answered straight.</h2></div><div className="faq-list">{faqs.map(([question, answer]) => <details data-reveal key={question}><summary><span>{question}</span><span className="pm" /></summary><p>{answer}</p></details>)}</div></div></section>

            <section className="legacy-apply" id="apply"><div className="wrap"><div className="apply-grid">
                <div className="apply-copy" data-reveal><p className="kicker">Apply</p><h2>Apply for your seat.</h2><p className="event-line">Da Nang · Friday, July 31, 2026</p><p className="apply-intro">Takes around 2 minutes. We only ask what helps us curate the room and introduce you to the right people.</p>
                    <div className="apply-facts"><div><span>Venue</span><strong>4U Lounge, Da Nang</strong></div><div><span>Room</span><strong>25 founders & operators</strong></div><div><span>Ticket</span><strong>$150 · meal included</strong></div><div><span>Meal</span><strong>Steak, shrimp, chicken, or vegan</strong></div></div>
                    <p className="apply-note">If accepted, we create your account and email your temporary login with a secure payment link. Once paid, you can browse other confirmed attendees.</p>
                </div>
                <div data-reveal="right"><ApplicationForm legacy initialEvent="danang-jul-2026" hideEventPicker /></div>
            </div></div></section>

            <div className="band-wrap"><div className="band" data-reveal>
                <div className="band-tx"><p className="kicker">Da Nang · Friday, July 31</p><h2>25 seats for<br />Da Nang.</h2><p>A better room. Better conversations.<br />Apply now.</p></div>
                <Link className="band-button" href="#apply">Apply for a seat <span>→</span></Link>
            </div></div>

            <footer className="legacy-footer"><div className="wrap foot-in">
                <div className="foot-brand"><img className="foot-logo" src="/assets/brand/founders-vn-logo.svg" alt="FoundersVN" /><p>Curated, phone-free dinners for founders and operators building in Vietnam.</p><div className="foot-social">
                    <a href="https://www.facebook.com/profile.php?id=61592081271397" target="_blank" rel="noopener noreferrer" aria-label="FoundersVN on Facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-7.6h2.6l.4-3h-3v-1.9c0-.87.24-1.46 1.5-1.46h1.6V4.14C15.9 4.06 15 4 13.9 4c-2.3 0-3.9 1.4-3.9 4v2.4H7.4v3H10V21h3.5Z" /></svg></a>
                    <a href="https://www.instagram.com/foundersvn/" target="_blank" rel="noopener noreferrer" aria-label="FoundersVN on Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5.5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" /></svg></a>
                </div></div>
                <div className="foot-col"><h3>Next Event</h3><p><b>Da Nang</b><span>Friday, July 31, 2026</span><span>4U Lounge · 25 seats</span></p></div>
                <div className="foot-col"><h3>Explore</h3><Link href="/events">Events</Link><Link href="/members">Members</Link><Link href="/sponsor">Sponsor</Link><Link href="/speak">Speak</Link></div>
                <div className="foot-col"><h3>Account</h3><Link href="/login">Member & Admin login</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/refund">Refund policy</Link></div>
            </div><div className="wrap foot-bottom"><p>Next edition: Ho Chi Minh City, August 2026</p><p>© 2026 FoundersVN · Da Nang, Vietnam</p></div></footer>
        </div>
    </>;
}
