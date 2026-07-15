import LandingAnimations from '@/components/LandingAnimations';

export const metadata = { title: 'The team behind · FoundersVN' };

const people = [
    {
        initial: 'M',
        name: 'Maddy',
        role: 'Co-Founder, Marketing & Community',
        body: "Maddy is a community builder and ecosystem fosterer, connecting founders and operators across Southeast Asia. In 4+ years across SmartDev, Consen.ai, and Techies Lab, she has worked in marketing and product, helping grow a startup community of over 5,000 people. That same builder's instinct now drives FoundersVN.",
        image: 'https://media.licdn.com/dms/image/v2/D4D03AQFPHS7iTkU34Q/profile-displayphoto-scale_400_400/B4DZwhsd3pKEAg-/0/1770091832772?e=1785369600&v=beta&t=BoyMddJ_42nsqL7TZsMNOSeoZR9bzVNlWH6vWTLu3q4',
        email: 'mailto:maddy.lee@buddytrading.com',
        linkedin: 'https://www.linkedin.com/in/maddyl/',
        instagram: 'https://www.instagram.com/maddy_da.techie/'
    },
    {
        initial: 'A',
        name: 'An',
        role: 'Co-Founder & Lead Engineer',
        body: "An is a product and AI builder. He has worked across P&G's supply chain systems and ANZ's cloud platforms, with a Microsoft APAC hackathon win along the way. He leads engineering across the web app, landing page, payments, and attendee data, the technical backbone behind every FoundersVN edition.",
        image: 'https://media.licdn.com/dms/image/v2/D5635AQEpUh5WnQ08AQ/profile-framedphoto-shrink_800_800/B56Z4diUmHH4Ag-/0/1778611997371?e=1784552400&v=beta&t=k5kS9DAY8TpovMQENYfFt4NnjR8SYoLZSSz7_h0DOjU',
        linkedin: 'https://www.linkedin.com/in/an-nguyen-quoc/'
    },
    {
        initial: 'Mt',
        name: 'Matthew',
        role: 'Co-Founder, Operations & Events',
        body: "Matthew's leather goods business has run in Da Nang for over 20 years, moving through one of the city's most diverse local ecosystems: hotel chains, major suppliers, and everything in between. At FoundersVN he leads operations and the night itself: venue, run of show, and every logistic that makes the room work.",
        image: 'https://media.licdn.com/dms/image/v2/D4E03AQG-YaFZDRv6UQ/profile-displayphoto-crop_800_800/B4EZkprN.xHoAM-/0/1757340820522?e=1785369600&v=beta&t=JrHsUQYLkSLJsV_7hJBPsHhsIrFoErlMjFxfxcpEmGY',
        linkedin: 'https://www.linkedin.com/in/matthewnt/'
    },
    {
        initial: 'B',
        name: 'Benji',
        role: 'Co-Founder, Ads & Growth',
        body: 'Benji runs paid acquisition end to end: targeting, creative testing, and funnel tracking, plus secondary technical support for the app.'
    }
];

const logos = [
    ['SmartDev', '/images/landing/logos/smartdev.png'],
    ['HCLTech', '/images/landing/logos/hcltech.svg'],
    ['ANZ', '/images/landing/logos/anz.svg'],
    ['FPT Telecom', '/images/landing/logos/fpt-telecom.svg'],
    ['Yellow Network', '/images/landing/logos/yellow-network.svg'],
    ['Maison Denude', '/images/landing/logos/maison-denude.svg'],
    ['BYD', '/images/landing/logos/byd.svg'],
    ['Techies Lab', '/images/landing/logos/techies-lab.svg']
];

function MailIcon() {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5" /><path d="m3.5 6 8.5 7 8.5-7" /></svg>;
}

function LinkedInIcon() {
    return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.94 8.98H3.76V20h3.18V8.98ZM5.35 4a1.84 1.84 0 1 0 0 3.68A1.84 1.84 0 0 0 5.35 4Zm14.89 9.72c0-3.2-1.7-4.68-3.98-4.68-1.84 0-2.66 1.01-3.12 1.72V8.98h-3.05V20h3.18v-5.46c0-1.44.27-2.83 2.05-2.83 1.76 0 1.78 1.64 1.78 2.92V20h3.14v-6.28Z" /></svg>;
}

function InstagramIcon() {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5.5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" /></svg>;
}

export default function TeamBehindPage() {
    return <main className="legacy-info-page">
        <LandingAnimations />
        <section className="legacy-team-hero">
            <div className="reveal">
                <p className="legacy-eyebrow">About</p>
                <h1>The people behind FoundersVN</h1>
                <p className="legacy-lead">Built by operators who care about better rooms, better introductions, and conversations that continue after the event.</p>
            </div>
            <div className="legacy-cube-wrap reveal">
                <video className="legacy-cube-img" autoPlay muted loop playsInline preload="metadata" poster="/tools/hero-video/out/cube-spin-poster.png" aria-label="FoundersVN mark on a 3D cube">
                    <source src="/tools/hero-video/out/cube-spin.webm" type="video/webm" />
                    <source src="/tools/hero-video/out/cube-spin.mp4" type="video/mp4" />
                </video>
            </div>
        </section>

        <section className="legacy-info-section">
            <p className="legacy-eyebrow reveal">Team</p>
            <p className="legacy-team-lead reveal">Four co-founders who&apos;ve sat on different sides of Vietnam&apos;s business landscape: multinational corporates, fast-moving startups, and a hands-on manufacturing floor.</p>
            <div className="legacy-team-grid">
                {people.map((person) => <article className="legacy-info-card reveal" key={person.name}>
                    <div className={`legacy-avatar${person.image ? ' has-photo' : ''}`}>{person.image ? <img src={person.image} alt="" /> : person.initial}</div>
                    <h2>{person.name}</h2>
                    <p className="legacy-role">{person.role}</p>
                    <p>{person.body}</p>
                    {(person.email || person.linkedin || person.instagram) && <div className="legacy-social-row">
                        {person.email && <a className="legacy-social" href={person.email} aria-label={`Email ${person.name}`}><MailIcon /></a>}
                        {person.linkedin && <a className="legacy-social" href={person.linkedin} target="_blank" rel="noopener noreferrer" aria-label={`${person.name} on LinkedIn`}><LinkedInIcon /></a>}
                        {person.instagram && <a className="legacy-social" href={person.instagram} target="_blank" rel="noopener noreferrer" aria-label={`${person.name} on Instagram`}><InstagramIcon /></a>}
                    </div>}
                </article>)}
            </div>
        </section>

        <section className="legacy-info-section">
            <p className="legacy-eyebrow reveal">We&apos;ve worked with</p>
            <div className="legacy-logo-grid">
                {logos.map(([name, src]) => <div className="legacy-logo-card reveal" key={name}><img src={src} alt={name} /></div>)}
            </div>
        </section>

        <section className="legacy-contact reveal">
            <p className="legacy-eyebrow">Contact</p>
            <h2>Inquiries or collaborations?</h2>
            <p>For partnerships, venue collaborations, future city editions, or press inquiries, contact the FoundersVN team.</p>
            <p><a href="mailto:support@foundersvn.com">support@foundersvn.com</a></p>
        </section>
    </main>;
}
