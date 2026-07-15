'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Mic2, Sparkles, UsersRound } from 'lucide-react';

const topics = [
    ['growth', 'Growth & Scaling'],
    ['fundraising', 'Fundraising'],
    ['sales', 'Sales & Revenue'],
    ['product', 'Product Development'],
    ['leadership', 'Leadership & Team'],
    ['marketing', 'Marketing & Branding'],
    ['operations', 'Operations & Systems'],
    ['mindset', 'Founder Mindset'],
    ['exit', 'Exits & M&A'],
    ['international', 'International Expansion']
];

export default function SpeakPage() {
    const [submitted, setSubmitted] = useState(false);
    const [busy, setBusy] = useState(false);
    const [selectedTopics, setSelectedTopics] = useState([]);

    function toggleTopic(value) {
        setSelectedTopics(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value]);
    }

    function submit(event) {
        event.preventDefault();
        setBusy(true);
        const formData = new FormData(event.currentTarget);
        const data = Object.fromEntries(formData.entries());
        data.topics = selectedTopics;
        data.submittedAt = new Date().toISOString();
        data.status = 'pending';
        data.id = `speaker-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const speakers = JSON.parse(localStorage.getItem('founders_vietnam_speakers') || '[]');
        speakers.unshift(data);
        localStorage.setItem('founders_vietnam_speakers', JSON.stringify(speakers));
        setSubmitted(true);
        setBusy(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (submitted) return <section className="auth-page"><div className="auth-card center"><CheckCircle2 size={52} style={{color:'var(--lime)'}}/><h1>Application submitted.</h1><p className="muted">Thank you for your interest in speaking at Founders Vietnam. Our team will review your application and get back to you within 5 business days.</p><Link className="button primary" href="/">Return to homepage</Link></div></section>;

    return <><section className="page-hero"><div className="container"><span className="eyebrow">Share Your Expertise</span><h1 className="display medium">Apply to speak.</h1><p className="lead">Bring a hard-earned lesson, not a sales deck. Selected speakers attend free and are featured in event promotion.</p><Link className="button primary" style={{marginTop:24}} href="#speaker-form">Start speaker application <ArrowRight size={17} /></Link></div></section>
        <section className="section compact"><div className="container"><div className="card-grid"><article className="card"><span className="card-icon"><Mic2 /></span><h3>Short useful talks</h3><p>Clear lessons from real decisions, mistakes, and changes in the company.</p></article><article className="card"><span className="card-icon"><UsersRound /></span><h3>Conversation first</h3><p>Talks are designed to create questions and deeper table conversations.</p></article><article className="card"><span className="card-icon"><Sparkles /></span><h3>Fee waived</h3><p>Selected speakers attend the event for free and appear in member/event promotion.</p></article></div></div></section>
        <section className="section compact" id="speaker-form"><div className="container">
            <form className="panel speaker-form" onSubmit={submit}>
                <section className="form-section-block"><h2>About You</h2><div className="form-grid"><div className="field"><label>First Name *</label><input name="firstName" required /></div><div className="field"><label>Last Name *</label><input name="lastName" required /></div><div className="field"><label>Email Address *</label><input name="email" type="email" required /></div><div className="field"><label>Phone Number</label><input name="phone" type="tel" placeholder="+84..." /></div><div className="field full"><label>LinkedIn Profile *</label><input name="linkedIn" type="url" placeholder="https://linkedin.com/in/..." required /></div><div className="field full"><label>Headshot URL</label><input name="headshot" type="url" placeholder="Link to your professional photo" /></div></div></section>
                <section className="form-section-block"><h2>Professional Background</h2><div className="form-grid"><div className="field"><label>Company / Venture *</label><input name="company" required /></div><div className="field"><label>Your Role *</label><input name="role" placeholder="Founder & CEO" required /></div><div className="field full"><label>What does your company do? *</label><textarea name="companyDescription" required /></div><div className="field"><label>Year Founded</label><input name="founded" type="number" min="1990" max="2026" placeholder="2020" /></div><div className="field"><label>Team Size</label><select name="teamSize"><option value="">Select...</option><option value="solo">Solo</option><option value="2-5">2-5</option><option value="6-15">6-15</option><option value="16-50">16-50</option><option value="50+">50+</option></select></div><div className="field full"><label>Notable Achievements *</label><textarea name="achievements" placeholder="Revenue milestones, funding raised, awards, press, exits, etc." required /></div></div></section>
                <section className="form-section-block"><h2>Your Talk</h2><div className="form-grid"><div className="field full"><label>Proposed Talk Title *</label><input name="talkTitle" placeholder="How I scaled from $0 to $1M ARR in 18 months" required /></div><div className="field full"><label>Topic Category *</label><div className="topic-tags">{topics.map(([value, label]) => <button type="button" key={value} className={`topic-tag ${selectedTopics.includes(value) ? 'active' : ''}`} onClick={() => toggleTopic(value)}>{label}</button>)}</div></div><div className="field full"><label>Talk Description *</label><textarea name="talkDescription" placeholder="What will attendees learn? What's your unique angle?" required /></div><div className="field full"><label>Talk Outline</label><textarea name="talkOutline" placeholder="Key points you'll cover" /></div><div className="field full"><label>Why should our members hear this? *</label><textarea name="audienceValue" required /></div></div></section>
                <section className="form-section-block"><h2>Availability</h2><div className="form-grid"><div className="field full"><label>Preferred Event Date</label><select name="preferredEvent"><option value="">Flexible / Any upcoming event</option><option value="jul-2026">July 31, 2026</option><option value="aug-2026">August 2026</option></select></div><div className="field full"><label>Previous Speaking Experience</label><textarea name="previousSpeaking" placeholder="Events, podcasts, conferences, recordings..." /></div><div className="field full"><label>Anything else we should know?</label><textarea name="additionalNotes" placeholder="Special requirements, co-speakers, equipment needs..." /></div></div></section>
                <div className="waiver-notice-app"><CheckCircle2 size={20} /><div><b>Membership Fee Waived</b><p>Selected speakers attend the event for free and are featured in the directory and event promotions.</p></div></div>
                <button className="button primary submit-wide" disabled={busy || selectedTopics.length === 0}>{busy ? 'Submitting...' : 'Submit Speaker Application'}<ArrowRight size={17} /></button>
                {selectedTopics.length === 0 && <p className="muted" style={{fontSize:13, textAlign:'center'}}>Choose at least one topic category.</p>}
            </form>
        </div></section>
    </>;
}
