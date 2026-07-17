'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Camera, Check, Globe2, KeyRound, LogOut, Plus, Save, Send, Trash2, UserRound, UsersRound, X } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { db, initials } from '@/lib/api';

const industries = [
    ['saas', 'SaaS / Software'],
    ['ecommerce', 'E-Commerce'],
    ['fintech', 'Fintech'],
    ['healthtech', 'Healthtech'],
    ['edtech', 'Edtech'],
    ['agency', 'Agency / Services'],
    ['manufacturing', 'Manufacturing'],
    ['real-estate', 'Real Estate'],
    ['crypto', 'Crypto / Web3'],
    ['ai', 'AI / Machine Learning'],
    ['consumer', 'Consumer Products'],
    ['other', 'Other']
];

const contactFields = [
    ['whatsapp', 'WhatsApp', '+84 xxx xxx xxx'],
    ['zalo', 'Zalo', '+84 xxx xxx xxx or Zalo ID'],
    ['telegram', 'Telegram', '@username'],
    ['linkedin', 'LinkedIn', 'https://linkedin.com/in/username'],
    ['twitter', 'X (Twitter)', '@username'],
    ['wechat', 'WeChat', 'WeChat ID'],
    ['facebook', 'Facebook', 'https://facebook.com/username'],
    ['instagram', 'Instagram', '@username']
];

function userValue(user, camel, snake = camel) {
    return user?.[camel] ?? user?.[snake] ?? '';
}

function websitesFor(user) {
    if (Array.isArray(user?.websites)) return user.websites.length ? user.websites : [''];
    if (typeof user?.websites === 'string') {
        try {
            const parsed = JSON.parse(user.websites);
            if (Array.isArray(parsed) && parsed.length) return parsed;
        } catch (_) {}
    }
    return user?.website ? [user.website] : [''];
}

function resizeImage(file, maxWidth = 400, maxHeight = 400) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = event => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const side = Math.min(img.width, img.height);
                const sourceX = (img.width - side) / 2;
                const sourceY = (img.height - side) / 2;
                canvas.width = maxWidth;
                canvas.height = maxHeight;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, sourceX, sourceY, side, side, 0, 0, maxWidth, maxHeight);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.onerror = reject;
            img.src = event.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export default function ProfilePage() {
    const { user, ready, logout, updateUser } = useAuth();
    const [status, setStatus] = useState(null);
    const [inviteStatus, setInviteStatus] = useState(null);
    const [busy, setBusy] = useState(false);
    const [websites, setWebsites] = useState(['']);
    const [profilePhoto, setProfilePhoto] = useState('');
    const [setupMode, setSetupMode] = useState(false);
    const fileInput = useRef(null);

    useEffect(() => {
        if (!user) return;
        setWebsites(websitesFor(user));
        setProfilePhoto(user.profilePhoto || user.profile_photo || '');
    }, [user]);
    useEffect(() => {
        setSetupMode(new URLSearchParams(window.location.search).get('setup') === 'true');
    }, []);

    const memberType = userValue(user, 'memberType', 'member_type') || 'founding';
    const isPlatinum = memberType === 'platinum_founding';
    const avatarText = useMemo(() => initials(user), [user]);

    if (!ready) return <div className="loading">Loading profile...</div>;
    if (!user) return <section className="auth-page"><div className="auth-card center"><span className="card-icon" style={{margin:'auto'}}><UserRound /></span><h1>Sign in to view your profile.</h1><Link className="button primary" href="/login?next=/profile">Sign in</Link></div></section>;

    function updateWebsite(index, value) {
        setWebsites(current => current.map((item, i) => i === index ? value : item));
    }

    function addWebsite() {
        setWebsites(current => [...current, '']);
    }

    function removeWebsite(index) {
        setWebsites(current => {
            const next = current.filter((_, i) => i !== index);
            return next.length ? next : [''];
        });
    }

    async function handlePhoto(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setStatus({ type: 'error', message: 'Please choose an image file.' });
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setStatus({ type: 'error', message: 'Image must be less than 5MB.' });
            return;
        }
        try {
            const resized = await resizeImage(file);
            setProfilePhoto(resized);
            setStatus({ type: 'success', message: 'Profile photo ready. Save your profile to sync it.' });
        } catch (_) {
            setStatus({ type: 'error', message: 'Could not process that image. Please try another one.' });
        }
    }

    async function submit(event) {
        event.preventDefault();
        setBusy(true);
        setStatus(null);
        const form = new FormData(event.currentTarget);
        const data = Object.fromEntries(form.entries());
        const cleanWebsites = websites.map(item => item.trim()).filter(Boolean);
        data.websites = cleanWebsites;
        data.website = cleanWebsites[0] || '';
        data.profilePhoto = profilePhoto || null;
        try {
            const updated = await db('members.update', { id: user.id, profile: data });
            const next = {
                ...user,
                ...updated,
                ...data,
                firstName: updated?.first_name || data.firstName,
                lastName: updated?.last_name || data.lastName,
                profilePhoto: updated?.profile_photo ?? data.profilePhoto,
                profile_photo: updated?.profile_photo ?? data.profilePhoto
            };
            updateUser(next);
            setStatus({ type: 'success', message: 'Profile saved to the database.' });
            setTimeout(() => { window.location.href = '/members'; }, 900);
        } catch (e) {
            updateUser({ ...user, ...data, profilePhoto: data.profilePhoto, profile_photo: data.profilePhoto });
            setStatus({ type: 'error', message: `Saved locally, but database sync failed: ${e.message}` });
        } finally {
            setBusy(false);
        }
    }

    function sendInvite(event) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const invite = {
            id: `invite-${Date.now()}`,
            senderName: `${userValue(user, 'firstName', 'first_name')} ${userValue(user, 'lastName', 'last_name')}`.trim(),
            senderEmail: user.email,
            recipientName: form.get('inviteName'),
            recipientEmail: form.get('inviteEmail'),
            message: form.get('inviteMessage'),
            status: 'sent',
            createdAt: new Date().toISOString()
        };
        const invites = JSON.parse(localStorage.getItem('founders_vietnam_invites') || '[]');
        invites.push(invite);
        localStorage.setItem('founders_vietnam_invites', JSON.stringify(invites));
        event.currentTarget.reset();
        setInviteStatus(`Invitation saved for ${invite.recipientName}.`);
    }

    return <><section className="page-hero"><div className="container"><span className="eyebrow">Member profile</span><h1 className="display medium">{setupMode ? 'Complete your profile.' : 'Edit your profile.'}</h1><p className="lead">Keep your profile updated so other members can connect with you at events.</p></div></section>
        <section className="section compact"><div className="container profile-edit-layout">
            <aside className="panel profile-summary">
                <button type="button" className="profile-photo-control" onClick={() => fileInput.current?.click()}>
                    {profilePhoto ? <img src={profilePhoto} alt="" /> : <span className="avatar">{avatarText}</span>}
                    <span><Camera size={17} /> Upload</span>
                </button>
                <input ref={fileInput} type="file" accept="image/*" hidden onChange={handlePhoto} />
                <p className="muted">Click to upload a profile photo. 400x400 pixels recommended.</p>
                {profilePhoto && <button type="button" className="button ghost small" onClick={() => { setProfilePhoto(''); if (fileInput.current) fileInput.current.value = ''; }}><Trash2 size={15} /> Remove photo</button>}
                <div className="profile-side-card">
                    <h2>{userValue(user, 'firstName', 'first_name')} {userValue(user, 'lastName', 'last_name')}</h2>
                    <p>{user.role || 'Founder'} · {user.company || 'Independent'}</p>
                    <small>{user.email}</small>
                </div>
                <Link className="button ghost" href="/change-password"><KeyRound size={16} /> Change password</Link>
                <button className="button ghost" onClick={async () => { await logout(); window.location.href = '/'; }}><LogOut size={16} /> Logout</button>
            </aside>

            <div className="profile-stack">
                <form className="profile-editor" onSubmit={submit}>
                    <section className="panel profile-section-card">
                        <h2>Basic Information</h2>
                        <div className="form-grid">
                            <div className="field"><label>First Name</label><input name="firstName" defaultValue={userValue(user, 'firstName', 'first_name')} required /></div>
                            <div className="field"><label>Last Name</label><input name="lastName" defaultValue={userValue(user, 'lastName', 'last_name')} required /></div>
                            <div className="field full"><label>Email Address</label><input type="email" value={user.email || ''} readOnly /><small className="field-hint">Email cannot be changed.</small></div>
                            <div className="field full"><label>Short Bio</label><textarea name="bio" maxLength={280} defaultValue={user.bio || ''} placeholder="Tell other founders about yourself and what you're working on..." /><small className="field-hint">Max 280 characters.</small></div>
                        </div>
                    </section>

                    <section className="panel profile-section-card">
                        <h2>Company Information</h2>
                        <div className="form-grid">
                            <div className="field full"><label>Company / Venture Name</label><input name="company" defaultValue={user.company || ''} required /></div>
                            <div className="field"><label>Your Role</label><input name="role" defaultValue={user.role || ''} placeholder="Founder, CEO, etc." /></div>
                            <div className="field"><label>Industry</label><select name="industry" defaultValue={user.industry || ''}><option value="">Select industry</option>{industries.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                            <div className="field full"><label>Company Website(s)</label><div className="website-list">{websites.map((website, index) => <div className="website-row" key={index}><Globe2 size={17} /><input type="url" value={website} onChange={event => updateWebsite(index, event.target.value)} onKeyDown={event => { if (event.key === 'Enter') event.preventDefault(); }} placeholder={index === 0 ? 'https://yourcompany.com' : 'https://anothersite.com'} />{websites.length > 1 && <button type="button" className="icon-link" onClick={() => removeWebsite(index)} aria-label="Remove website"><X size={15} /></button>}</div>)}</div><button type="button" className="button ghost small" onClick={addWebsite}><Plus size={15} /> Add Another Website</button></div>
                        </div>
                    </section>

                    <section className="panel profile-section-card">
                        <h2>Contact & Social Links</h2>
                        <p className="muted">These are visible to other paid participants in your event directory.</p>
                        <div className="social-input-grid">{contactFields.map(([name, label, placeholder]) => <div className="field social-field" key={name}><label>{label}</label><input name={name} defaultValue={user[name] || ''} placeholder={placeholder} /></div>)}</div>
                    </section>

                    {status && <div className={`form-status ${status.type}`}>{status.type === 'success' && <Check size={17} />} {status.message}</div>}
                    <div className="profile-actions-row"><button className="button primary" disabled={busy}><Save size={17} />{busy ? 'Saving...' : 'Save Profile'}</button><Link className="button ghost" href="/members">Cancel</Link></div>
                </form>

                <section className="panel profile-section-card">
                    <h2>Membership & Events</h2>
                    <div className="membership-status-card">
                        <span className={`status ${isPlatinum ? 'paid' : 'approved'}`}>{isPlatinum ? 'Platinum Founding Member' : 'Founding Member'}</span>
                        <p>{isPlatinum ? 'You have VIP access to all events.' : 'Upgrade to Platinum for VIP access and exclusive experiences at every event.'}</p>
                        {!isPlatinum && <Link href="/events">Book a Platinum event to upgrade &rarr;</Link>}
                    </div>
                    <div className="quick-actions"><Link className="button primary" href="/events"><CalendarDays size={17} /> Book Events</Link><Link className="button ghost" href="/members"><UsersRound size={17} /> Member Directory</Link></div>
                </section>

                <section className="panel profile-section-card">
                    <h2>Invite a Founder</h2>
                    <p className="muted">Know a qualified founder who should join? Save a personal invite for follow-up.</p>
                    <form className="invite-form" onSubmit={sendInvite}>
                        <div className="form-grid"><div className="field"><label>Their Name</label><input name="inviteName" placeholder="Full name" required /></div><div className="field"><label>Their Email</label><input name="inviteEmail" type="email" placeholder="email@company.com" required /></div><div className="field full"><label>Personal Message</label><textarea name="inviteMessage" rows={2} placeholder="Add a personal note to your invitation..." /></div></div>
                        {inviteStatus && <div className="form-status success">{inviteStatus}</div>}
                        <button className="button secondary"><Send size={17} /> Send Invite</button>
                    </form>
                </section>
            </div>
        </div></section></>;
}
