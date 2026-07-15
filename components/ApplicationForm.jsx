'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { callFunction, db, formatDate } from '@/lib/api';

const CHIP_GROUPS = {
    industry: ['Tech / SaaS', 'E-commerce', 'Agency / Services', 'F&B / Hospitality', 'Retail / Consumer', 'Manufacturing', 'Finance', 'Media / Creative', 'Other'],
    looking: ['Investment', 'Customers / Clients', 'Talent / Hiring', 'Partnerships', 'Suppliers', 'Mentorship / Advice', 'Other'],
    offer: ['Expertise / Advice', 'Introductions', 'Investment', 'Hiring / Jobs', 'Partnership', 'Product feedback', 'Other']
};

export default function ApplicationForm({ initialEvent, legacy = false, hideEventPicker = false }) {
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(initialEvent || '');
    const [status, setStatus] = useState(null);
    const [busy, setBusy] = useState(false);
    const [chips, setChips] = useState({ industry: [], looking: [], offer: [] });
    const [ticketCount, setTicketCount] = useState('1');

    function toggleChip(group, value) {
        setChips(current => ({
            ...current,
            [group]: current[group].includes(value)
                ? current[group].filter(item => item !== value)
                : [...current[group], value]
        }));
    }

    useEffect(() => {
        db('events.list').then(rows => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const available = rows.filter(e => ['open', 'upcoming'].includes(e.status) && new Date(e.event_date) >= today);
            setEvents(available);
            setSelectedEvent(current => current || available.find(e => e.slug === 'danang-jul-2026')?.slug || available[0]?.slug || '');
        }).catch(() => {});
    }, []);

    async function submit(event) {
        event.preventDefault();
        const formElement = event.currentTarget;
        setStatus(null);
        const form = new FormData(formElement);
        if (!form.get('event_slug')) {
            setStatus({ type: 'error', message: 'Please choose an event.' });
            return;
        }
        const missingChipGroup = Object.keys(CHIP_GROUPS).find(group => chips[group].length === 0);
        if (missingChipGroup) {
            const labels = { industry: 'your industry', looking: 'what you are looking for', offer: 'what you can offer' };
            setStatus({ type: 'error', message: `Please select at least one option for ${labels[missingChipGroup]}.` });
            return;
        }
        setBusy(true);
        try {
            const payload = Object.fromEntries(form.entries());
            const withOther = (group, otherName) => [
                ...chips[group].filter(value => value !== 'Other'),
                ...(chips[group].includes('Other') && payload[otherName] ? [payload[otherName]] : [])
            ].join(', ');
            payload.industry = withOther('industry', 'industry_other');
            payload.looking_for = withOther('looking', 'looking_other');
            payload.can_offer = withOther('offer', 'offer_other');
            payload.page_language = 'en';
            await callFunction('submit-application', payload, { token: null });
            formElement.reset();
            setChips({ industry: [], looking: [], offer: [] });
            setTicketCount('1');
            setStatus({ type: 'success', message: 'Application received. We’ll review it and email you with the next step.' });
        } catch (error) {
            setStatus({ type: 'error', message: error.message });
        } finally {
            setBusy(false);
        }
    }

    return (
        <form className="panel form-grid" onSubmit={submit}>
            <div className="field"><label htmlFor="name">Full name</label><input id="name" name="name" autoComplete="name" required /></div>
            <div className="field"><label htmlFor="email">Work email</label><input id="email" name="email" type="email" autoComplete="email" required /></div>
            <div className="field"><label htmlFor="company">Company / project</label><input id="company" name="company" autoComplete="organization" required /></div>
            <div className="field"><label htmlFor="role">Your role</label><input id="role" name="role" placeholder="Founder, CEO, Co-founder" required /></div>
            <div className="field full">
                {hideEventPicker ? <input type="hidden" id="event_slug" name="event_slug" value={selectedEvent} /> : <>
                    <label htmlFor="event_slug">Choose an event</label>
                    {legacy ? <>
                    <div className="legacy-event-tabs" role="group" aria-label="Choose an event">
                        {events.map(item => <button type="button" key={item.id} className={selectedEvent === item.slug ? 'selected' : ''} onClick={() => setSelectedEvent(item.slug)}>{item.slug === 'danang-jul-2026' ? 'Da Nang · Jul 31' : item.slug === 'hcmc-aug-2026' ? 'HCMC · Aug 15 to 16' : `${item.location || item.name} · ${formatDate(item.event_date)}`}</button>)}
                    </div>
                    <input type="hidden" id="event_slug" name="event_slug" value={selectedEvent} />
                </> : <select id="event_slug" name="event_slug" value={selectedEvent} onChange={event => setSelectedEvent(event.target.value)} required>
                    <option value="" disabled>Select an open event</option>
                    {events.map(item => <option key={item.id} value={item.slug}>{item.name} — {formatDate(item.event_date)}</option>)}
                </select>}
                </>}
            </div>
            <div className="field full"><label htmlFor="company_link">Company website or LinkedIn</label><input id="company_link" name="company_link" type="text" inputMode="url" placeholder="https://…" required /></div>
            <div className="field full ticket-count-field">
                <label>How many tickets?</label>
                <div className="ticket-count-options" role="radiogroup" aria-label="Ticket quantity">
                    <label className={ticketCount === '1' ? 'selected' : ''}><input type="radio" name="ticket_count" value="1" checked={ticketCount === '1'} onChange={event => setTicketCount(event.target.value)} required />1 ticket <span>For me</span></label>
                    <label className={ticketCount === '2' ? 'selected' : ''}><input type="radio" name="ticket_count" value="2" checked={ticketCount === '2'} onChange={event => setTicketCount(event.target.value)} required />2 tickets <span>Me + partner / co-founder · same price per ticket</span></label>
                </div>
                {ticketCount === '2' && <input name="guest_name" placeholder="Partner / co-founder full name" required />}
            </div>
            {Object.entries(CHIP_GROUPS).map(([group, values]) => <div className="field full chip-field" key={group}>
                <label>{group === 'industry' ? 'Your industry' : group === 'looking' ? 'What are you looking for?' : 'What can you offer?'} <span className="chip-hint">tap all that apply</span></label>
                <div className="legacy-answer-chips" role="group" aria-required="true">{values.map(value => <button type="button" key={value} aria-pressed={chips[group].includes(value)} onClick={() => toggleChip(group, value)}>{value}</button>)}</div>
                {chips[group].includes('Other') && <input name={`${group === 'offer' ? 'offer' : group}_other`} placeholder={group === 'industry' ? 'Which industry?' : 'Tell us more'} required />}
            </div>)}
            <div className="field full"><label htmlFor="what_you_do">In one line, what are you building?</label><input id="what_you_do" name="what_you_do" required /></div>
            <div className="field"><label htmlFor="links">Your links (LinkedIn / Zalo / portfolio)</label><input id="links" name="links" type="text" placeholder="https://…" required /></div>
            <div className="field"><label htmlFor="language">Which language are you most comfortable using at the event?</label><select id="language" name="language" defaultValue="vi" required><option value="vi">Vietnamese</option><option value="en">English</option><option value="both">Both are fine</option></select></div>
            {status && <div className={`form-status ${status.type} field full`}>{status.type === 'success' && <CheckCircle2 size={17} />} {status.message}</div>}
            <div className="field full"><button className="button primary submit-application" disabled={busy}>{busy ? 'Sending application…' : <>Submit <ArrowRight size={18} /></>}</button></div>
            <p className="legacy-form-privacy field full">Your answers are only used to curate the room and are never shared publicly without your consent.</p>
        </form>
    );
}
