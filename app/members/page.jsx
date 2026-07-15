'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, LockKeyhole, MessageCircle, Pencil, Search, Send, X } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { db, initials } from '@/lib/api';

const filters = [
    ['all', 'All Members'],
    ['saas', 'SaaS'],
    ['ecommerce', 'E-Commerce'],
    ['fintech', 'Fintech'],
    ['agency', 'Agency'],
    ['ai', 'AI/ML']
];

const industryLabels = {
    saas: 'SaaS / Software',
    ecommerce: 'E-Commerce',
    fintech: 'Fintech',
    healthtech: 'Healthtech',
    edtech: 'Edtech',
    agency: 'Agency / Services',
    manufacturing: 'Manufacturing',
    'real-estate': 'Real Estate',
    crypto: 'Crypto / Web3',
    ai: 'AI / ML',
    consumer: 'Consumer Products',
    other: 'Other'
};

function normalizeMember(member) {
    return {
        ...member,
        firstName: member.firstName || member.first_name || '',
        lastName: member.lastName || member.last_name || '',
        profilePhoto: member.profilePhoto || member.profile_photo || ''
    };
}

function industryLabel(value) {
    return industryLabels[value] || value || 'Founder';
}

function truncate(value, length = 100) {
    if (!value || value.length <= length) return value || '';
    return `${value.slice(0, length)}...`;
}

function formatPhone(value) {
    return (value || '').replace(/[\s\-()]/g, '').replace('+', '');
}

function contactLinks(member) {
    const links = [];
    if (member.website) links.push(['Website', member.website, 'website']);
    if (member.whatsapp) links.push(['WhatsApp', `https://wa.me/${formatPhone(member.whatsapp)}`, 'whatsapp', member.whatsapp]);
    if (member.zalo) links.push([`Zalo: ${member.zalo}`, null, 'zalo']);
    if (member.telegram) links.push(['Telegram', `https://t.me/${member.telegram.replace('@', '')}`, 'telegram', member.telegram]);
    if (member.linkedin) links.push(['LinkedIn', member.linkedin, 'linkedin']);
    if (member.twitter) links.push(['X / Twitter', `https://x.com/${member.twitter.replace('@', '')}`, 'twitter', member.twitter]);
    if (member.wechat) links.push([`WeChat: ${member.wechat}`, null, 'wechat']);
    if (member.facebook) links.push(['Facebook', member.facebook, 'facebook']);
    if (member.instagram) links.push(['Instagram', `https://instagram.com/${member.instagram.replace('@', '')}`, 'instagram', member.instagram]);
    return links;
}

function Avatar({ member, size = 'normal' }) {
    return <span className={`avatar member-avatar-img ${size === 'large' ? 'large' : ''}`}>{member.profilePhoto ? <img src={member.profilePhoto} alt="" /> : initials(member)}</span>;
}

export default function MembersPage() {
    const { user, ready } = useAuth();
    const [members, setMembers] = useState(null);
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('all');
    const [error, setError] = useState('');
    const [selected, setSelected] = useState(null);
    const [composeOpen, setComposeOpen] = useState(false);
    const [messageStatus, setMessageStatus] = useState(null);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (!user) return;
        db('members.list')
            .then(rows => setMembers((rows || []).map(normalizeMember).filter(member => member.id !== user.id)))
            .catch(e => { setError(e.message); setMembers([]); });
    }, [user]);

    useEffect(() => {
        document.body.style.overflow = selected ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [selected]);

    const filtered = useMemo(() => {
        const text = query.toLowerCase().trim();
        return (members || []).filter(member => {
            const matchesFilter = filter === 'all' || member.industry === filter;
            const haystack = `${member.firstName} ${member.lastName} ${member.company || ''} ${member.role || ''} ${industryLabel(member.industry)} ${member.bio || ''}`.toLowerCase();
            return matchesFilter && (!text || haystack.includes(text));
        });
    }, [members, query, filter]);

    async function sendMessage(event) {
        event.preventDefault();
        if (!selected) return;
        const body = new FormData(event.currentTarget).get('message')?.trim();
        if (!body) {
            setMessageStatus({ type: 'error', message: 'Please write a message.' });
            return;
        }
        setSending(true);
        setMessageStatus(null);
        try {
            await db('messages.send', { toId: selected.id, body });
            event.currentTarget.reset();
            setMessageStatus({ type: 'success', message: `Message sent to ${selected.firstName}.` });
            setTimeout(() => {
                setComposeOpen(false);
                setSelected(null);
                setMessageStatus(null);
            }, 900);
        } catch (e) {
            setMessageStatus({ type: 'error', message: e.message });
        } finally {
            setSending(false);
        }
    }

    return <><section className="page-hero"><div className="container"><span className="eyebrow">Member Directory</span><h1 className="display medium">Connect with fellow founders.</h1><p className="lead">No business cards needed. Browse paid participants from events you have also paid for.</p></div></section><section className="section compact"><div className="container">
        {!ready ? <div className="loading">Checking access...</div> : !user ? <div className="lock-state"><LockKeyhole size={38} /><h2>Members Only</h2><p className="muted">The member directory is exclusively available to approved Founders Vietnam members.</p><div className="hero-actions" style={{justifyContent:'center'}}><Link className="button primary" href="/login?next=/members">Login to Access</Link><Link className="button ghost" href="/#apply">Apply for Membership</Link></div></div> : members === null ? <div className="loading">Loading your event network...</div> : <>
            <div className="toolbar directory-toolbar"><div><h2>Your event network</h2><p className="muted">Only confirmed, paid participants from your events appear here.</p></div><Link className="button ghost" href="/profile"><Pencil size={16} /> Edit My Profile</Link></div>
            <div className="directory-filters-panel">
                <div className="search-box"><Search size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by name, company, or industry..." /></div>
                <div className="filter-tags">{filters.map(([value, label]) => <button key={value} className={`filter-tag ${filter === value ? 'active' : ''}`} onClick={() => setFilter(value)}>{label}</button>)}</div>
            </div>
            {error && <div className="form-status error">{error}</div>}
            <div className="member-grid">{filtered.map(member => <article className="card member-card directory-card" key={member.id}>
                <div className="member-head"><Avatar member={member} /><div><h3>{member.firstName} {member.lastName}</h3><p>{member.role || 'Founder'} · {member.company || 'Independent'}</p></div></div>
                <span className="member-industry-pill">{industryLabel(member.industry)}</span>
                {member.bio && <p className="member-card-bio">{truncate(member.bio)}</p>}
                <div className="member-quick-links">{contactLinks(member).slice(0, 4).map(([label, href, type]) => href ? <a key={`${type}-${label}`} href={href} target="_blank" rel="noopener noreferrer" className={`quick-link ${type}`} title={label}>{label[0]}</a> : <span key={`${type}-${label}`} className={`quick-link ${type}`} title={label}>{type === 'zalo' ? 'Z' : label[0]}</span>)}</div>
                <button className="button ghost small" onClick={() => { setSelected(member); setComposeOpen(false); setMessageStatus(null); }}>View Full Profile</button>
            </article>)}</div>
            {!filtered.length && <div className="empty">No members found. Try adjusting your search or filters.</div>}
        </>}
    </div></section>

    {selected && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setSelected(null); }}>
        <div className="member-profile-modal">
            <button className="modal-x" onClick={() => setSelected(null)} aria-label="Close profile"><X size={22} /></button>
            <div className="modal-profile-header"><Avatar member={selected} size="large" /><div><h2>{selected.firstName} {selected.lastName}</h2><p>{selected.role || 'Founder'}</p><p className="muted">{selected.company || 'Independent'}</p></div></div>
            <span className="member-industry-pill">{industryLabel(selected.industry)}</span>
            <div className="modal-bio">{selected.bio || 'No bio provided yet.'}</div>
            <h3 className="modal-subtitle">Connect</h3>
            <div className="social-links-list">{contactLinks(selected).length ? contactLinks(selected).map(([label, href, type, value]) => href ? <a key={`${type}-${label}`} href={href} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /><span>{value || label}</span></a> : <span key={`${type}-${label}`}><ExternalLink size={16} /><span>{label}</span></span>) : <p className="muted">No contact links provided.</p>}</div>
            <button className="button primary modal-message-button" onClick={() => { setComposeOpen(true); setMessageStatus(null); }}><MessageCircle size={17} /> Send Message</button>
            {composeOpen && <form className="message-compose-card" onSubmit={sendMessage}>
                <div><span className="muted">To:</span> <b>{selected.firstName} {selected.lastName}</b></div>
                <textarea name="message" rows={5} placeholder="Write your message..." />
                {messageStatus && <div className={`form-status ${messageStatus.type}`}>{messageStatus.message}</div>}
                <div className="message-actions"><button type="button" className="button ghost small" onClick={() => setComposeOpen(false)}>Cancel</button><button className="button primary small" disabled={sending}><Send size={15} />{sending ? 'Sending...' : 'Send'}</button></div>
            </form>}
        </div>
    </div>}
    </>;
}
