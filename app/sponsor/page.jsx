'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Handshake, LineChart, LockKeyhole, UsersRound } from 'lucide-react';

const packages = [
    ['event', 'Event Sponsor - $1,500/mo'],
    ['growth', 'Growth Sponsor - $2,500/mo'],
    ['platinum', 'Platinum Sponsor - $5,000/mo'],
    ['unsure', "Not sure yet - let's talk"]
];

const faqs = [
    ['What happens after I apply?', "We review every application within 1 business day. If it's a fit, we'll schedule a quick 15-minute alignment call to discuss your goals, then lock in your date and deliverables."],
    ['Can I sponsor a single event?', 'A single event is perfectly fine. Sponsors who commit for 2-3 months usually see stronger recognition and follow-up.'],
    ['Do you offer category exclusivity?', "Platinum sponsors get category exclusivity. Event and Growth tiers avoid direct competitor clashes where possible, but exclusivity isn't guaranteed."],
    ['What results do sponsors typically see?', 'Sponsors typically leave with qualified conversations, direct feedback, and warm follow-up opportunities from a carefully selected room.']
];

export default function SponsorPage() {
    const [submitted, setSubmitted] = useState(null);
    const [busy, setBusy] = useState(false);

    function submit(event) {
        event.preventDefault();
        setBusy(true);
        const data = Object.fromEntries(new FormData(event.currentTarget).entries());
        const applications = JSON.parse(localStorage.getItem('founders_vietnam_sponsor_applications') || '[]');
        const record = {
            id: `sponsor-${Date.now()}`,
            ...data,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        applications.push(record);
        localStorage.setItem('founders_vietnam_sponsor_applications', JSON.stringify(applications));
        event.currentTarget.reset();
        setSubmitted(record);
        setBusy(false);
    }

    return <><section className="page-hero"><div className="container"><span className="eyebrow">Limited Sponsorship Opportunities</span><h1 className="display medium">Reach founders without hijacking the room.</h1><p className="lead">Sponsor the moments around the event where your product can genuinely help founders build, hire, sell, and operate.</p><Link className="button primary" style={{marginTop:24}} href="#apply">Apply to Sponsor <ArrowRight size={17} /></Link></div></section>
        <section className="section compact"><div className="container">
            <div className="card-grid">
                <article className="card"><span className="card-icon"><UsersRound /></span><h3>Relevant rooms</h3><p>Reach carefully selected founders, operators, and investors instead of an anonymous audience.</p></article>
                <article className="card"><span className="card-icon"><LineChart /></span><h3>Useful visibility</h3><p>Show up before, during, and after the dinner in ways that make sense for the room.</p></article>
                <article className="card"><span className="card-icon"><LockKeyhole /></span><h3>Category care</h3><p>We protect the experience and avoid turning a founder dinner into a logo wall.</p></article>
            </div>
        </div></section>
        <section className="section compact" id="apply"><div className="container form-page-layout">
            <div><span className="eyebrow">Apply</span><h2 className="display medium">Sponsor application.</h2><p className="lead">Takes 30 seconds. We review and respond within 1 business day.</p><a className="button ghost" href="https://calendly.com/ben-advancedmarketing/15min" target="_blank" rel="noopener noreferrer">Book a 15-min call instead</a></div>
            <form className="panel form-grid" onSubmit={submit}>
                <div className="field"><label>Your Name *</label><input name="contactName" required /></div>
                <div className="field"><label>Work Email *</label><input name="email" type="email" required /></div>
                <div className="field"><label>Company Name *</label><input name="companyName" required /></div>
                <div className="field"><label>Company Website *</label><input name="website" type="url" placeholder="https://" required /></div>
                <div className="field full"><label>Interested In *</label><select name="package" required><option value="">Select a package</option>{packages.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                {submitted && <div className="form-status success field full"><CheckCircle2 size={17} /> Thank you, {submitted.contactName}. We will reply within 1 business day at {submitted.email}.</div>}
                <button className="button primary field full" disabled={busy}><Handshake size={17} />{busy ? 'Submitting...' : 'Submit Sponsorship Application'}</button>
                <p className="muted field full" style={{fontSize:13, textAlign:'center'}}>Stored locally for admin review, matching the old sponsor workflow.</p>
            </form>
        </div></section>
        <section className="section compact"><div className="container faq-list-app">{faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>
    </>;
}
