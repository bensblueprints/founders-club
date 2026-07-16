'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ApplicationForm from '@/components/ApplicationForm';
import LandingAnimations from '@/components/LandingAnimations';
import { useLanguage } from '@/components/LanguageProvider';
import { RotatingCube } from '@/components/ResponsiveEventMedia';
import { LANDING_COPY } from '@/lib/landing-copy';

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
function Tick() {
    return <span className="ck"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="m5 12.5 4.5 4.5L19 7" /></svg></span>;
}

function LandingGallery() {
    const [active, setActive] = useState(null);
    const close = () => setActive(null);
    const move = (direction) => setActive(index => (index + direction + gallery.length) % gallery.length);

    useEffect(() => {
        if (active === null) return undefined;
        const onKey = (event) => {
            if (event.key === 'Escape') close();
            if (event.key === 'ArrowLeft') move(-1);
            if (event.key === 'ArrowRight') move(1);
        };
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', onKey);
        };
    }, [active]);

    return <>
        <section className="gallery" aria-label="Photos from FoundersVN gatherings">
            <div className="marq">
                <div className="marq-track">
                    {[0, 1].map(group => <div className="marq-group" aria-hidden={group === 1} key={group}>
                        {gallery.map((image, index) => <button className="marq-item" type="button" onClick={() => setActive(index)} tabIndex={group === 1 ? -1 : 0} key={`${group}-${image}`}>
                            <img src={image} alt={group === 0 ? `FoundersVN gathering ${index + 1}` : ''} />
                        </button>)}
                    </div>)}
                </div>
            </div>
        </section>
        {active !== null && <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label="FoundersVN gallery" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
            <button className="lightbox-close" type="button" onClick={close} aria-label="Close gallery">×</button>
            <button className="lightbox-nav lightbox-prev" type="button" onClick={() => move(-1)} aria-label="Previous image">‹</button>
            <figure>
                <img src={gallery[active]} alt={`FoundersVN gathering ${active + 1}`} />
                <figcaption>{active + 1} / {gallery.length}</figcaption>
            </figure>
            <button className="lightbox-nav lightbox-next" type="button" onClick={() => move(1)} aria-label="Next image">›</button>
        </div>}
    </>;
}

export default function HomePage() {
    const { language } = useLanguage();
    const copy = LANDING_COPY[language] || LANDING_COPY.en;
    return <>
        <div className="landing-original">
            <LandingAnimations />
            <section className="hero" id="top">
                <video className="hero-media" autoPlay muted loop playsInline preload="metadata" poster="/video/poster.jpg" aria-hidden="true"><source src="/video/hero.webm" type="video/webm" /></video>
                <div className="hero-shade" />
                <div className="hero-in"><div className="hero-content">
                    <h1>{language === 'en' ? <><span>{copy.hero.lines[0]}</span><span><em>{copy.hero.lines[1].before}</em> <b>{copy.hero.lines[1].after}</b></span><span>{copy.hero.lines[2]}</span></> : copy.hero.lines.map(line => <span key={line}>{line}</span>)}</h1>
                    <p className="hero-sub">{copy.hero.sub}</p>
                    <aside className="infocard" aria-label="Event details">
                        {Object.entries(copy.panel).map(([key, [label, value]]) => <div className="ic" key={key}><span className="ic-l">{label}</span><span className="ic-v">{value}</span></div>)}
                    </aside>
                    <div className="hero-cta"><Link className="legacy-btn" href="#apply">{copy.hero.cta} <span>→</span></Link><Link className="link-quiet" href="#how">{copy.hero.cta2} <span>→</span></Link></div>
                </div></div>
            </section>

            <section className="pos" id="about"><div className="wrap"><div className="pos-grid">
                <div className="pos-copy" data-reveal><p className="kicker">{copy.pos.kicker}</p><h2>{copy.pos.title}</h2>{copy.pos.body.map(item => <p key={item}>{item}</p>)}</div>
                <div className="pos-fig-wrap" data-reveal="right">
                    <figure className="pos-fig"><img src="/images/landing/networking-1.jpg" alt={copy.pos.alt} /><figcaption>{copy.pos.caption}</figcaption></figure>
                    <RotatingCube className="pos-cube" label="" />
                </div>
            </div></div></section>

            <section className="how" id="how"><div className="wrap"><div className="sec-head" data-reveal="down"><h2>{copy.how.title}</h2></div><div className="how-grid">
                {copy.how.steps.map(([title, body], index) => <div className="step" data-reveal key={title}><div className="step-top"><span className="step-no">{String(index + 1).padStart(2, '0')}</span><span className="step-line" /></div><h3>{title}</h3><p>{body}</p></div>)}
            </div></div></section>

            <section className="app-layer" id="app"><div className="wrap"><div className="app-grid">
                <div className="app-copy" data-reveal><p className="kicker">{copy.app.kicker}</p><h2>{copy.app.title}</h2><p>{copy.app.body}</p><div className="app-points">{copy.app.points.map(item => <span key={item}>{item}</span>)}</div></div>
                <figure className="app-fig" data-reveal="right"><img className="app-watermark" src="/assets/brand/founders-vn-wavy-icon-white.svg" alt="" /><img className="app-shot" src="/images/landing/app-mockup-final.png" alt="FoundersVN app attendee directory and profiles" /><span className="app-badge"><img src="/assets/brand/founders-vn-wavy-icon-rounded-square-2048.png" alt="" /></span></figure>
            </div></div></section>

            <section className="offer" id="offer"><div className="wrap"><div className="offer-grid">
                <div className="offer-copy" data-reveal><p className="kicker">{copy.offer.kicker}</p><h2>{copy.offer.title}</h2><p className="legacy-lead">{copy.offer.sub}</p><Link className="legacy-btn" href="#apply">{copy.hero.cta} <span>→</span></Link><p className="offer-refund">✓ <span>{copy.offer.refund}</span></p></div>
                <div className="incl">{copy.offer.items.map(item => <div className="incl-item" data-reveal key={item}><Tick /><p>{item}</p></div>)}</div>
            </div></div></section>

            <section className="agenda" id="agenda"><div className="wrap">
                <div className="sec-head" data-reveal="down"><p className="kicker">{copy.agenda.kicker}</p><h2>{copy.agenda.title}</h2></div>
                <div className="agenda-line" data-stagger>
                    {copy.agenda.items.map(([time, title, body]) => <article className="agenda-stop" data-reveal key={time}>
                        <span className="ag-time">{time}</span>
                        <span className="ag-dot" />
                        <h3>{title}</h3>
                        <p>{body}</p>
                    </article>)}
                </div>
            </div></section>

            <LandingGallery />

            <section className="people"><div className="wrap"><div className="sec-head" data-reveal="down"><p className="kicker">{copy.testimonials.kicker}</p><h2>{copy.testimonials.title}</h2></div><div className="testi-grid">{copy.testimonials.items.map(([quote, image, name, role]) => <article className="testi-card" data-reveal key={name}><blockquote>{quote}</blockquote><div className="testi-who"><img src={`/images/landing/${image}`} alt="" /><p>{name}<small>{role}</small></p></div></article>)}</div></div></section>

            <section className="faq" id="faq"><div className="wrap"><div className="sec-head" data-reveal="down"><p className="kicker">FAQ</p><h2>{copy.faq.title}</h2></div><div className="faq-list">{copy.faq.items.map(([question, answer]) => <details data-reveal key={question}><summary><span>{question}</span><span className="pm" /></summary><p>{answer}</p></details>)}</div></div></section>

            <section className="legacy-apply" id="apply"><div className="wrap"><div className="apply-grid">
                <div className="apply-copy" data-reveal><p className="kicker">{copy.apply.kicker}</p><h2>{copy.apply.title}</h2><p className="event-line">{copy.apply.eventLine}</p><p className="apply-intro">{copy.apply.intro}</p>
                    <div className="apply-facts">{copy.apply.facts.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
                    <p className="apply-note">{copy.apply.note}</p>
                </div>
                <div data-reveal="right"><ApplicationForm legacy initialEvent="danang-jul-2026" hideEventPicker /></div>
            </div></div></section>

            <div className="band-wrap"><div className="band" data-reveal>
                <div className="band-tx"><p className="kicker">{copy.band.kicker}</p><h2>{copy.band.title.split('\n').map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h2><p>{copy.band.lead.split('\n').map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</p></div>
                <Link className="band-button" href="#apply">{copy.hero.cta} <span>→</span></Link>
            </div></div>

            <footer className="legacy-footer"><div className="wrap foot-in">
                <div className="foot-brand"><img className="foot-logo" src="/assets/brand/founders-vn-logo.svg" alt="FoundersVN" /><p>{copy.footer.tag}</p><div className="foot-social">
                    <a href="https://www.facebook.com/profile.php?id=61592081271397" target="_blank" rel="noopener noreferrer" aria-label="FoundersVN on Facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-7.6h2.6l.4-3h-3v-1.9c0-.87.24-1.46 1.5-1.46h1.6V4.14C15.9 4.06 15 4 13.9 4c-2.3 0-3.9 1.4-3.9 4v2.4H7.4v3H10V21h3.5Z" /></svg></a>
                    <a href="https://www.instagram.com/foundersvn/" target="_blank" rel="noopener noreferrer" aria-label="FoundersVN on Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5.5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" /></svg></a>
                </div></div>
                <div className="foot-col"><h3>{copy.footer.next[0]}</h3><p><b>{copy.footer.next[1]}</b><span>{copy.footer.next[2]}</span><span>{copy.footer.next[3]}</span></p></div>
                <div className="foot-col"><h3>{copy.footer.explore}</h3><Link href="/events">Events</Link><Link href="/members">Members</Link><Link href="/sponsor">Sponsor</Link><Link href="/speak">Speak</Link></div>
                <div className="foot-col"><h3>{copy.footer.account}</h3><Link href="/login">{copy.footer.login}</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/refund">Refund policy</Link></div>
            </div><div className="wrap foot-bottom"><p>{copy.footer.bottomLeft}</p><p>{copy.footer.bottomRight}</p></div></footer>
        </div>
    </>;
}
