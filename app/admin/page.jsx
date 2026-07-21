'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck, Clock3, Download, ExternalLink, LogIn, Mail, MessageCircle, MousePointerClick, Pencil, Plus, RefreshCw, Save, ScanLine, ShieldCheck, Ticket, Trash2, UserCheck, UsersRound, Utensils, X } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { callFunction, db, formatDate } from '@/lib/api';
import trackingModel from '@/lib/application-tracking.cjs';

const { loginActivity, emailClickActivity } = trackingModel;

const REVIEW_SECTIONS = [
    {
        title: 'Applicant and company',
        fields: [
            ['Full name', app => `${app.first_name || ''} ${app.last_name || ''}`.trim()],
            ['Work email', 'email'], ['Age', 'age'], ['Company / project', 'company'],
            ['Role', 'role'], ['Industry', 'industry'], ['Company website or LinkedIn', 'company_link'],
            ['Profile / social link', 'social_link'], ['Revenue', 'revenue'], ['Team size', 'team_size']
        ]
    },
    {
        title: 'Networking profile',
        fields: [
            ['What they do', 'what_you_do'], ['Looking for', 'looking_for'], ['Can offer', 'can_offer'],
            ['Biggest challenge', 'biggest_challenge'], ['Unique value', 'unique_value'],
            ['Goals for the next 12 months', 'goals_12_month'], ['Why they want to join', 'why_join']
        ]
    },
    {
        title: 'Event request',
        fields: [
            ['Event', app => app.event_name || app.event || app.event_interest],
            ['Tickets requested', app => `${app.ticket_count || 1} ticket${Number(app.ticket_count || 1) === 1 ? '' : 's'}`],
            ['Partner / co-founder', 'guest_name'], ['Membership request', 'membership_type'],
            ['Referral source', 'referral'], ['Referred by', 'referrer_name'],
            ['Form language', 'page_language'], ['Submitted', app => app.created_at ? new Date(app.created_at).toLocaleString() : null]
        ]
    }
];

function ReviewValue({ label, value }) {
    const resolved = typeof value === 'string' ? value.trim() : value;
    const isLink = typeof resolved === 'string' && /^https?:\/\//i.test(resolved);
    return <div className="review-field"><dt>{label}</dt><dd>{resolved || <span className="not-provided">Not provided</span>}{isLink && <a href={resolved} target="_blank" rel="noreferrer" aria-label={`Open ${label}`}><ExternalLink size={14}/></a>}</dd></div>;
}

function ApplicationReview({ app }) {
    const login = loginActivity(app);
    const emailClick = emailClickActivity(app);
    return <div className="application-review">
        <div className={`account-path ${app.has_existing_account ? 'existing' : 'new'}`}>
            <UserCheck size={20}/><div><b>{app.has_existing_account ? 'Existing member account will be reused' : 'A new member account will be created'}</b><span>{app.has_existing_account ? `Approval keeps the current password and sends only the 48-hour payment notice. Account status: ${app.existing_account_status || 'active'}.` : 'Approval creates one account, emails temporary credentials, and reserves the requested seats for 48 hours.'}</span></div>
        </div>
        {REVIEW_SECTIONS.map(section => <section className="review-section" key={section.title}><h4>{section.title}</h4><dl className="review-grid">{section.fields.map(([label, accessor]) => <ReviewValue key={label} label={label} value={typeof accessor === 'function' ? accessor(app) : app[accessor]}/>)}</dl></section>)}
        <section className="review-section"><h4>Review and payment lifecycle</h4><dl className="review-grid">
            <ReviewValue label="Application status" value={app.status}/><ReviewValue label="Payment status" value={app.order_status || app.payment_status}/>
            <ReviewValue label="Reservation expires" value={app.payment_expires_at ? new Date(app.payment_expires_at).toLocaleString() : null}/><ReviewValue label="Paid via" value={app.paid_provider}/>
            <ReviewValue label="Paid at" value={app.order_paid_at ? new Date(app.order_paid_at).toLocaleString() : null}/><ReviewValue label="Reviewed at" value={app.reviewed_at ? new Date(app.reviewed_at).toLocaleString() : null}/>
            <ReviewValue label="Login activity" value={login.label}/><ReviewValue label="Tracked login count" value={String(app.login_count || 0)}/>
            <ReviewValue label="Latest email" value={app.latest_email_type?.replaceAll('_', ' ')}/><ReviewValue label="Email status" value={app.latest_email_status?.replaceAll('_', ' ')}/>
            <ReviewValue label="Email link activity" value={emailClick.label}/><ReviewValue label="Click measurement" value={app.email_tracking_available ? 'Enabled for at least one email' : 'Unavailable for emails sent before tracking'}/>
            <ReviewValue label="Willing to pay event fee" value={app.fee_willingness == null ? 'Not applicable' : app.fee_willingness ? 'Yes - awaiting manual review' : 'No'}/>
        </dl></section>
    </div>;
}

function applicationStage(app) {
    if (app.status === 'rejected') return 'declined';
    if (app.order_status === 'paid' || app.payment_status === 'paid') return 'paid';
    if (app.status === 'expired' || app.order_status === 'expired' || app.payment_status === 'expired') return 'expired';
    if (app.status === 'pending') return 'pending';
    if (app.status === 'approved' && Number(app.login_count || 0) > 0) return 'logged-in-unpaid';
    if (app.status === 'approved' && app.email_clicked) return 'clicked-no-login';
    if (app.status === 'approved') return 'approved-no-login';
    return app.status || 'pending';
}

const STAGE_LABELS = {
    declined: 'Auto declined', paid: 'Paid', pending: 'Pending review',
    'approved-no-login': 'Approved - no login', 'clicked-no-login': 'Clicked - no login',
    'logged-in-unpaid': 'Logged in - unpaid', expired: 'Reservation expired'
};

function whatsappUrl(app) {
    const raw = String(app.social_link || '').match(/^WhatsApp:\s*(.+)$/i)?.[1] || '';
    const number = raw.replace(/\D/g, '');
    if (!number) return null;
    const message = `Hi ${app.first_name || 'there'}, this is FoundersVN. Your application for ${app.event_name || app.event || 'our upcoming event'} was approved. We noticed your ticket payment is not complete yet. Would you like any help?`;
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function emailDeliveryState(app) {
    const status = app.latest_email_status || '';
    if (['delivered', 'opened', 'clicked'].includes(status)) return { tone:'success', label:status === 'clicked' ? 'Delivered and clicked' : status === 'opened' ? 'Delivered and opened' : 'Delivered successfully' };
    if (app.latest_email_sync_error && !app.latest_email_error) return { tone:'warning', label:'Delivery status unavailable' };
    if (['bounced', 'failed', 'complained', 'suppressed', 'canceled'].includes(status)) return { tone:'error', label:'Not delivered' };
    if (status === 'delayed') return { tone:'warning', label:'Delivery delayed' };
    if (['queued', 'sent'].includes(status)) return { tone:'warning', label:status === 'sent' ? 'Sent - awaiting delivery' : 'Queued for delivery' };
    if (status === 'mock') return { tone:'mock', label:'Test email recorded' };
    return { tone:'neutral', label:'No delivery record' };
}

function EmailDelivery({ app }) {
    const state = emailDeliveryState(app);
    const resendUrl = app.latest_email_provider_id ? `https://resend.com/emails/${encodeURIComponent(app.latest_email_provider_id)}` : null;
    const statusTime = app.latest_email_event_at || app.latest_email_sent_at;
    return <div className={`email-delivery-panel ${state.tone}`}>
        <span className="email-delivery-icon"><Mail size={17}/></span>
        <div><strong>{state.label}</strong><span>{app.latest_email_type ? app.latest_email_type.replaceAll('_', ' ') : 'Approval email'}{statusTime ? ` · last updated ${new Date(statusTime).toLocaleString()}` : ''}</span>{app.latest_email_error && <p>{app.latest_email_error}</p>}{app.latest_email_sync_error && <p>{app.latest_email_sync_error} The last known provider state was {app.latest_email_status || 'unknown'}.</p>}</div>
        {resendUrl && <a href={resendUrl} target="_blank" rel="noreferrer">Open in Resend <ExternalLink size={13}/></a>}
    </div>;
}

function EmailPreviewModal({ preview, sending, onClose, onConfirm }) {
    useEffect(() => {
        const closeOnEscape = event => { if (event.key === 'Escape' && !sending) onClose(); };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [sending, onClose]);
    const label = ['accept', 'resend_approval'].includes(preview.action) ? 'approval and payment email' : 'payment reminder';
    return <div className="modal-backdrop email-preview-backdrop" role="presentation">
        <section className="email-preview-modal" role="dialog" aria-modal="true" aria-labelledby="email-preview-title">
            <button className="modal-x" onClick={onClose} disabled={sending} aria-label="Close email preview"><X size={18}/></button>
            <header><span className="eyebrow">Confirm before sending</span><h2 id="email-preview-title">Preview {label}</h2><p>Review the recipient, subject, and complete email below.</p></header>
            <dl className="email-preview-details"><div><dt>To</dt><dd>{preview.email}</dd></div><div><dt>Subject</dt><dd>{preview.subject}</dd></div></dl>
            <div className="email-preview-frame-wrap"><iframe title={`Email preview for ${preview.email}`} srcDoc={preview.html} sandbox=""/></div>
            <footer><button className="button ghost" onClick={onClose} disabled={sending}>Cancel</button><button className="button primary" onClick={onConfirm} disabled={sending}><Mail size={16}/>{sending ? 'Sending…' : 'Confirm and send'}</button></footer>
        </section>
    </div>;
}

function DeleteApplicationModal({ app, deleting, onClose, onConfirm }) {
    const paid = app.order_status === 'paid' || app.payment_status === 'paid';
    return <div className="modal-backdrop" role="presentation">
        <section className="application-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-application-title">
            <button className="modal-x" onClick={onClose} disabled={deleting} aria-label="Close delete confirmation"><X size={18}/></button>
            <header><span className="eyebrow">Permanent database action</span><h2 id="delete-application-title">Delete this application?</h2><p><b>{app.first_name} {app.last_name}</b><br/>{app.email}</p></header>
            <div className="application-delete-warning">
                <p>This removes the application, its reservation and payment order, attendance ticket and saved meal, related payment events, and tracked email records.</p>
                {paid && <p><b>This application is paid.</b> Its ticket and event attendance record will also be permanently removed.</p>}
                <p>The member account is preserved and can be used for another application.</p>
            </div>
            <footer><button className="button ghost" onClick={onClose} disabled={deleting}>Cancel</button><button className="button danger" onClick={onConfirm} disabled={deleting}><Trash2 size={16}/>{deleting ? 'Deleting...' : 'Delete permanently'}</button></footer>
        </section>
    </div>;
}

function ApplicationCard({ app, reviewing, processingId, onAccept, onAction, onReview, onDelete }) {
    const stage = applicationStage(app);
    const login = loginActivity(app);
    const emailClick = emailClickActivity(app);
    const whatsapp = whatsappUrl(app);
    const unpaid = app.status === 'approved' && ['pending', 'preparing'].includes(app.order_status);
    const busy = action => processingId === `${app.id}:${action}`;
    return <article className={`application-row admin-application-card ${reviewing ? 'review-open' : ''}`}>
        <div className="application-summary"><div>
            <div className="application-status-line">
                <span className={`status ${app.status}`}>{app.status}</span>
                <span className={`status funnel-${stage}`}>{STAGE_LABELS[stage] || stage}</span>
                {app.latest_email_status && <span className={`status email-${app.latest_email_status}`}>email {app.latest_email_status}</span>}
            </div>
            <h3>{app.first_name} {app.last_name}</h3>
            <p>{app.role || 'Founder'} at {app.company || '—'} · {app.email}</p>
            <p style={{marginTop:8}}>{app.what_you_do || app.why_join || 'No additional introduction.'}</p>
            <div className="application-meta-grid">
                <span><CalendarDays size={15}/>{app.event_name || app.event || app.event_interest || 'Event not assigned'}</span>
                <span><Ticket size={15}/>{app.ticket_count || 1} ticket{Number(app.ticket_count || 1) === 1 ? '' : 's'}</span>
                <span><span className="meta-dot"/>Revenue: {app.revenue || 'Not provided'}</span>
                {app.fee_willingness != null && <span><span className="meta-dot"/>Entrance fee: {app.fee_willingness ? 'willing to pay' : 'not willing to pay'}</span>}
                <span className={`tracking-${login.state}`}><LogIn size={15}/>{login.label}</span>
                <span className={`tracking-${emailClick.state}`}><MousePointerClick size={15}/>{emailClick.label}</span>
                {app.payment_expires_at && <span><Clock3 size={15}/>Hold ends {new Date(app.payment_expires_at).toLocaleString()}</span>}
            </div>
            <EmailDelivery app={app}/>
        </div><div className="application-actions">
            {app.status === 'pending' && <button className="button primary small" disabled={busy('accept')} onClick={()=>onAccept(app.id)}>{busy('accept') ? 'Loading preview…' : app.has_existing_account ? 'Approve registration' : 'Approve & create account'}</button>}
            {unpaid && <button className="button primary small" disabled={busy('resend_approval')} onClick={()=>onAction(app.id, 'resend_approval') }><Mail size={15}/>{busy('resend_approval') ? 'Loading preview…' : 'Resend approval'}</button>}
            {unpaid && <button className="button ghost small" disabled={busy('send_reminder')} onClick={()=>onAction(app.id, 'send_reminder')}><Clock3 size={15}/>{busy('send_reminder') ? 'Loading preview…' : 'Send reminder'}</button>}
            {unpaid && whatsapp && <a className="button ghost small" href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={15}/> WhatsApp</a>}
            {app.payment_link && <a className="button ghost small" href={app.payment_link} target="_blank" rel="noreferrer">Payment page</a>}
            <button className="button ghost small review-toggle" aria-expanded={reviewing} onClick={onReview}>{reviewing ? <ChevronUp size={16}/> : <ChevronDown size={16}/>} {reviewing ? 'Hide details' : 'Review all details'}</button>
            <button className="button danger small" onClick={()=>onDelete(app)}><Trash2 size={15}/> Delete</button>
        </div></div>
        {reviewing && <ApplicationReview app={app}/>}
    </article>;
}

const MEAL_LABELS = { steak: 'Steak', shrimp: 'Shrimp', chicken: 'Chicken', vegan: 'Vegan' };
const formatMealVnd = value => `${new Intl.NumberFormat('vi-VN').format(Number(value || 0))} ₫`;
function mealOrder(row) {
    if (row?.meal_order && typeof row.meal_order === 'object') return row.meal_order;
    try { return JSON.parse(row?.meal_order || 'null'); } catch (_) { return null; }
}
function mealOrderText(row) {
    const order = mealOrder(row);
    return order?.items?.map(item => `${item.quantity}× ${item.name}${item.detail ? ` (${item.detail})` : ''}`).join('; ') || '';
}
function mealLabel(row) {
    const order = mealOrder(row);
    if (row.meal_submitted_at || order) {
        const count = order?.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0;
        const due = Number(row.meal_amount_due_vnd || order?.amountDueVnd || 0);
        return `${count} item${count === 1 ? '' : 's'}${due > 0 ? ` · ${formatMealVnd(due)} due` : ' · within credit'}`;
    }
    return MEAL_LABELS[row.meal_option] || 'Not selected';
}
const isUpcomingEvent = event => event.status !== 'completed' && new Date(`${String(event.event_date).slice(0, 10)}T23:59:59`).getTime() >= Date.now();

function attendeeTicketRows(registrations = []) {
    return registrations.flatMap(registration => {
        const primary = {
            ...registration,
            registrationId: registration.attendance_id,
            attendee: `${registration.first_name || ''} ${registration.last_name || ''}`.trim(),
            type: 'Member', email: registration.email || '', company: registration.company || '',
            meal: mealLabel(registration), mealStatus:registration.meal_submitted_at || mealOrder(registration) ? 'Menu saved' : 'Not selected',
            paidVia: registration.paid_provider || '—', paidAt: registration.paid_at
        };
        if (Number(registration.seat_count || 1) !== 2) return [primary];
        return [primary, {
            ...registration,
            registrationId: registration.attendance_id,
            attendee: registration.guest_name || 'Guest name not provided', type: 'Guest',
            email: '', company: registration.company || '',
            meal:registration.meal_submitted_at || mealOrder(registration) ? 'Shared booking order' : MEAL_LABELS[registration.guest_meal_option] || 'Not selected',
            mealStatus:registration.meal_submitted_at || mealOrder(registration) ? 'Menu saved' : 'Not selected',
            paidVia: registration.paid_provider || '—', paidAt: registration.paid_at
        }];
    });
}

function downloadCsv(filename, rows) {
    const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const columns = ['Checked in', 'Attendee', 'Type', 'Email', 'Age', 'Company', 'Role', 'Industry', 'Ticket type',
        'Seat count', 'Guest name', 'Menu status', 'Food order', 'Food subtotal VND', 'Food VAT VND', 'Food service VND',
        'Food total VND', 'Food credit VND', 'Due at restaurant VND', 'Legacy member meal', 'Legacy guest meal', 'Phone / WhatsApp', 'Zalo', 'Telegram',
        'LinkedIn', 'Website', 'What they do', 'Looking for', 'Can offer', 'Revenue', 'Team size', 'Referral',
        'Paid via', 'Paid amount', 'Currency', 'Paid at', 'Payment transaction ID', 'Payment order ID', 'Registration ID'];
    const data = rows.map(row => [row.checked_in ? 'Yes' : '', row.attendee, row.type, row.email, row.age, row.company,
        row.role, row.industry, row.ticket_type, row.seat_count, row.guest_name, row.mealStatus, mealOrderText(row),
        row.meal_subtotal_vnd, row.meal_vat_vnd, row.meal_service_vnd, row.meal_total_vnd, row.meal_credit_vnd, row.meal_amount_due_vnd,
        MEAL_LABELS[row.meal_option] || 'Not selected', MEAL_LABELS[row.guest_meal_option] || 'Not selected',
        row.whatsapp, row.zalo, row.telegram, row.linkedin, row.website || row.social_link, row.what_you_do,
        row.looking_for, row.can_offer, row.revenue, row.team_size, row.referral, row.paidVia,
        row.paid_amount, row.paid_currency, row.paidAt ? new Date(row.paidAt).toLocaleString() : '',
        row.provider_transaction_id, row.payment_order_id, row.registrationId]);
    const blob = new Blob(['\ufeff', [columns, ...data].map(line => line.map(quote).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function printCheckinList(event, registrations) {
    const rows = attendeeTicketRows(registrations);
    const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);
    const mealCounts = rows.reduce((counts, row) => ({ ...counts, [row.mealStatus]: (counts[row.mealStatus] || 0) + 1 }), {});
    const eventDate = event?.event_date ? new Date(event.event_date).toLocaleDateString(undefined, { weekday:'long', year:'numeric', month:'long', day:'numeric' }) : '';
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escape(event?.name)} check-in</title><style>
      @page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,"Helvetica Neue",sans-serif;color:#17231f;margin:0;font-size:10px}
      header{display:flex;justify-content:space-between;gap:24px;border-bottom:3px solid #ef654b;padding-bottom:12px;margin-bottom:14px}h1{font-size:24px;margin:0 0 5px}p{margin:3px 0;color:#53625d}.summary{text-align:right}.summary b{font-size:16px;color:#17231f}
      .meals{display:flex;gap:8px;margin-bottom:12px}.meal{border:1px solid #cfd8d4;border-radius:6px;padding:5px 9px}.meal b{color:#ef654b}
      table{width:100%;border-collapse:collapse;table-layout:fixed}th{background:#0b241b;color:white;text-align:left;padding:7px 6px;font-size:9px;text-transform:uppercase;letter-spacing:.04em}td{border-bottom:1px solid #dce3e0;padding:7px 6px;vertical-align:top;overflow-wrap:anywhere}tbody tr:nth-child(even){background:#f5f7f6}
      .check{width:14px;height:14px;border:1.5px solid #17231f;display:inline-block}.num{width:28px}.check-col{width:48px}.type{width:52px}.meal-col{width:160px}.paid{width:92px}.email{width:165px}.company{width:130px}
      footer{margin-top:10px;display:flex;justify-content:space-between;color:#71807a;font-size:9px}@media print{button{display:none}}
    </style></head><body><header><div><h1>${escape(event?.name || 'Event')} - Check-in list</h1><p>${escape(eventDate)}${event?.event_time ? ` at ${escape(event.event_time)}` : ''}</p><p>${escape(event?.venue_name || event?.location || '')}</p>${event?.venue_address ? `<p>${escape(event.venue_address)}</p>` : ''}</div><div class="summary"><b>${rows.length} attendee${rows.length === 1 ? '' : 's'}</b><p>${registrations.length} paid registration${registrations.length === 1 ? '' : 's'}</p></div></header>
    <div class="meals">${Object.entries(mealCounts).map(([meal,count]) => `<span class="meal">${escape(meal)}: <b>${count}</b></span>`).join('')}</div>
    <table><thead><tr><th class="num">#</th><th class="check-col">In</th><th>Attendee</th><th class="type">Type</th><th class="email">Email</th><th class="company">Company</th><th class="meal-col">Meal</th><th class="paid">Payment</th></tr></thead><tbody>
    ${rows.map((row,index) => `<tr><td>${index+1}</td><td><span class="check"></span></td><td><b>${escape(row.attendee)}</b></td><td>${escape(row.type)}</td><td>${escape(row.email || '—')}</td><td>${escape(row.company || '—')}</td><td>${escape(row.meal)}</td><td>${escape(row.paidVia)}</td></tr>`).join('')}</tbody></table>
    <footer><span>FoundersVN event operations</span><span>Generated ${escape(new Date().toLocaleString())}</span></footer></body></html>`;
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    Object.assign(frame.style, { position:'fixed', width:'1px', height:'1px', right:'0', bottom:'0', border:'0', opacity:'0' });
    document.body.appendChild(frame);
    const printDocument = frame.contentWindow.document;
    printDocument.open(); printDocument.write(html); printDocument.close();
    setTimeout(() => {
        frame.contentWindow.focus(); frame.contentWindow.print();
        setTimeout(() => frame.remove(), 1000);
    }, 250);
}

function CheckinDetail({ row }) {
    const fields = [
        ['Full name', row.attendee], ['Record type', row.type], ['Email', row.email], ['Age', row.age],
        ['Company', row.company], ['Role', row.role], ['Industry', row.industry], ['Member type', row.member_type],
        ['Account status', row.account_status], ['WhatsApp', row.whatsapp], ['Zalo', row.zalo], ['Telegram', row.telegram],
        ['LinkedIn', row.linkedin], ['Website', row.website], ['Social profile', row.social_link], ['Other websites', Array.isArray(row.websites) ? row.websites.join(', ') : row.websites],
        ['Ticket type', row.ticket_type], ['Seats', row.seat_count], ['Guest', row.guest_name], ['Menu status', row.mealStatus],
        ['Food order', mealOrderText(row)], ['Special requests', mealOrder(row)?.notes],
        ['Menu subtotal', row.meal_submitted_at ? formatMealVnd(row.meal_subtotal_vnd) : null],
        ['VAT', row.meal_submitted_at ? formatMealVnd(row.meal_vat_vnd) : null], ['Service charge', row.meal_submitted_at ? formatMealVnd(row.meal_service_vnd) : null],
        ['Restaurant total', row.meal_submitted_at ? formatMealVnd(row.meal_total_vnd) : null], ['Food credit', row.meal_submitted_at ? formatMealVnd(row.meal_credit_vnd) : null],
        ['Due at restaurant', row.meal_submitted_at ? formatMealVnd(row.meal_amount_due_vnd) : null], ['Menu last updated', row.meal_updated_at ? new Date(row.meal_updated_at).toLocaleString() : null],
        ['Legacy member meal', MEAL_LABELS[row.meal_option] || null],
        ['Legacy guest meal', Number(row.seat_count) === 2 ? MEAL_LABELS[row.guest_meal_option] || null : null],
        ['Applied', row.applied_at ? new Date(row.applied_at).toLocaleString() : null], ['Approved', row.approved_at ? new Date(row.approved_at).toLocaleString() : null],
        ['Paid', row.paid_at ? new Date(row.paid_at).toLocaleString() : null], ['Paid via', row.paid_provider],
        ['Paid amount', row.paid_amount != null ? `${Number(row.paid_amount).toLocaleString()} ${row.paid_currency || ''}` : null],
        ['Payment transaction', row.provider_transaction_id], ['Payment order', row.payment_order_id],
        ['Latest email', row.email_type ? row.email_type.replaceAll('_', ' ') : null], ['Email status', row.email_status?.replaceAll('_', ' ')],
        ['Email status updated', row.email_status_at ? new Date(row.email_status_at).toLocaleString() : null], ['Email error', row.email_error],
        ['Checked in', row.checked_in ? `Yes${row.checked_in_at ? ` · ${new Date(row.checked_in_at).toLocaleString()}` : ''}` : 'No'],
        ['Revenue', row.revenue], ['Team size', row.team_size], ['Company link', row.company_link],
        ['What they do', row.what_you_do], ['Looking for', row.looking_for], ['Can offer', row.can_offer],
        ['Biggest challenge', row.biggest_challenge], ['Unique value', row.unique_value], ['12-month goals', row.goals_12_month],
        ['Why join', row.why_join], ['Referral', row.referral], ['Referred by', row.referrer_name],
        ['Membership request', row.membership_type], ['Form language', row.page_language], ['Bio', row.bio]
    ];
    return <div className="checkin-detail-grid">{fields.map(([label,value])=><div key={label}><span>{label}</span><strong>{value || '—'}</strong></div>)}</div>;
}

function CheckinView({ events, selectedEventId, setSelectedEventId, registrations, loading, notice, refresh }) {
    const [expanded, setExpanded] = useState(null);
    const [reference, setReference] = useState('');
    const [checking, setChecking] = useState(false);
    const event = events?.find(item => item.id === selectedEventId);
    const rows = attendeeTicketRows(registrations || []);
    const mealCounts = rows.reduce((counts, row) => ({ ...counts, [row.mealStatus]: (counts[row.mealStatus] || 0) + 1 }), {});
    const slug = (event?.slug || event?.name || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    async function checkIn(value = reference, checkedIn = true) {
        const cleaned = String(value || '').trim();
        if (!cleaned) return notice('Scan or enter a booking reference.');
        setChecking(true);
        try {
            const result = await db('attendance.checkIn', { eventId:selectedEventId, reference:cleaned, checkedIn });
            setReference(''); await refresh();
            notice(`${result.first_name} ${result.last_name} ${checkedIn ? 'checked in' : 'marked as not checked in'}.`, 'success');
        } catch (error) { notice(error.message); }
        finally { setChecking(false); }
    }
    async function scan() {
        if (!('BarcodeDetector' in window)) return notice('QR camera scanning is not supported in this browser. Enter the booking reference instead.');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'environment' } });
            const video = document.createElement('video'); video.srcObject = stream; video.playsInline = true; await video.play();
            const detector = new window.BarcodeDetector({ formats:['qr_code'] });
            const deadline = Date.now() + 20000;
            while (Date.now() < deadline) {
                const codes = await detector.detect(video);
                if (codes[0]?.rawValue) { stream.getTracks().forEach(track=>track.stop()); return checkIn(codes[0].rawValue); }
                await new Promise(resolve=>setTimeout(resolve,250));
            }
            stream.getTracks().forEach(track=>track.stop()); notice('No QR was detected. Try again or enter the reference.');
        } catch (error) { notice(error.message || 'Could not open the camera.'); }
    }
    return <div className="checkin-admin">
        <div className="panel checkin-controls"><div className="field"><label htmlFor="checkin-event">Upcoming event</label><select id="checkin-event" value={selectedEventId || ''} onChange={e=>setSelectedEventId(e.target.value)}>{events?.filter(isUpcomingEvent).map(item=><option key={item.id} value={item.id}>{item.name} · {formatDate(item.event_date)}</option>)}</select></div><div className="checkin-export-actions"><button className="button ghost small" disabled={!rows.length} onClick={()=>downloadCsv(`${slug}-checkin.csv`, rows)}><Download size={15}/> Export CSV</button><button className="button primary small" disabled={!rows.length} onClick={()=>{try{printCheckinList(event, registrations);}catch(error){notice(error.message);}}}><Download size={15}/> Export PDF / Print</button></div></div>
        <form className="panel checkin-scanner" onSubmit={e=>{e.preventDefault();checkIn();}}><div><span className="eyebrow">Door check-in</span><h3>Scan QR or enter booking reference</h3><p className="muted">Accepts the ticket booking ref, attendance ID, or SePay transfer code.</p></div><div className="checkin-scanner-actions"><input aria-label="Booking reference" placeholder="FVN:9f4c9a0e-…" value={reference} onChange={e=>setReference(e.target.value)}/><button type="button" className="button ghost" onClick={scan}><ScanLine size={17}/> Scan QR</button><button className="button primary" disabled={checking}>{checking?'Checking…':'Check in'}</button></div></form>
        {loading ? <div className="loading">Loading paid attendees…</div> : <><div className="checkin-stats"><div className="panel"><span>Paid registrations</span><strong>{registrations?.length || 0}</strong></div><div className="panel"><span>Confirmed attendees</span><strong>{rows.length}</strong></div>{Object.entries(mealCounts).map(([meal,count])=><div className="panel" key={meal}><span>{meal}</span><strong>{count}</strong></div>)}</div>
        <div className="panel table-wrap"><table className="data-table checkin-table"><thead><tr><th>Attendee</th><th>Ticket</th><th>Menu</th><th>Email</th><th>Attendance</th><th>Details</th></tr></thead><tbody>{rows.flatMap((row,index)=>{const key=`${row.registrationId}-${row.type}-${index}`; const open=expanded===key; return [<tr key={key}><td><b>{row.attendee}</b>{row.email && <><br/><span className="muted">{row.email}</span></>}</td><td>{row.type}<br/><span className="muted">{row.ticket_type} · {row.seat_count} seat{Number(row.seat_count)===1?'':'s'}</span></td><td><span className={`meal-pill ${row.mealStatus === 'Not selected' ? 'missing' : ''}`}><Utensils size={13}/>{row.meal}</span></td><td><span className={`status email-${row.email_status}`}><Mail size={12}/>{row.email_status || 'not sent'}</span><br/><span className="muted">{row.email_type?.replaceAll('_',' ') || '—'}</span></td><td>{row.type==='Member'?<button className={`button small ${row.checked_in?'ghost':'primary'}`} onClick={()=>checkIn(row.payment_order_id,!row.checked_in)}>{row.checked_in?'Undo check-in':'Check in'}</button>:<span className="muted">With member</span>}</td><td><button className="button ghost small" aria-expanded={open} onClick={()=>setExpanded(open?null:key)}>{open?<ChevronUp size={14}/>:<ChevronDown size={14}/>} {open?'Hide':'All info'}</button></td></tr>, open?<tr className="checkin-detail-row" key={`${key}-details`}><td colSpan="6"><CheckinDetail row={row}/></td></tr>:null];})}</tbody></table>{!rows.length && <div className="empty">No paid attendees for this event yet.</div>}</div></>}
    </div>;
}

const EMPTY_EVENT = { slug:'', name:'', date:'', time:'18:00', location:'', venueName:'', venueAddress:'', description:'', price:150, capacity:25, status:'open' };

function EventManager({ events, reload, notify }) {
    const router = useRouter();
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [eventStatusFilter, setEventStatusFilter] = useState('open');
    const [eventLocationFilter, setEventLocationFilter] = useState('all');
    const editorRef = useRef(null);
    const eventRows = useMemo(() => {
        const statusRank = { open:0, upcoming:1, closed:2, completed:3 };
        return [...(events || [])]
            .filter(event => eventStatusFilter === 'all' || event.status === eventStatusFilter)
            .filter(event => eventLocationFilter === 'all' || (event.location || 'unassigned') === eventLocationFilter)
            .sort((a, b) => {
                const ranked = (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9);
                if (ranked !== 0) return ranked;
                return new Date(a.event_date || 0) - new Date(b.event_date || 0);
            });
    }, [events, eventStatusFilter, eventLocationFilter]);
    const eventLocations = useMemo(() => Array.from(new Set((events || []).map(event => event.location || 'unassigned'))).sort((a, b) => a.localeCompare(b)), [events]);
    const openEditor = next => {
        setEditing(next);
        window.setTimeout(() => {
            editorRef.current?.scrollIntoView({ behavior:'smooth', block:'start' });
            editorRef.current?.querySelector('input, textarea, select')?.focus({ preventScroll:true });
        }, 0);
    };
    const beginEdit = event => openEditor({
        id:event.id, slug:event.slug || '', name:event.name || '', date:String(event.event_date || '').slice(0,10),
        time:String(event.event_time || '18:00').slice(0,5), location:event.location || '',
        venueName:event.venue_name || '', venueAddress:event.venue_address || '', description:event.description || '',
        price:Number(event.dinner_price || 150),
        capacity:Number(event.max_attendees || 25), status:event.status || 'open'
    });
    async function save(eventObject) {
        eventObject.preventDefault(); setSaving(true);
        try {
            await db(editing.id ? 'events.update' : 'events.create', editing);
            notify('success', editing.id ? 'Event updated.' : 'Event created.');
            setEditing(null); await reload();
        } catch (error) { notify('error', error.message); }
        finally { setSaving(false); }
    }
    async function remove(event) {
        if (!window.confirm(`Delete “${event.name}”? Events with applications or registrations cannot be deleted.`)) return;
        try { await db('events.delete', { id:event.id }); notify('success', 'Event deleted.'); await reload(); }
        catch (error) { notify('error', error.message); }
    }
    const update = (field, value) => setEditing(current => ({ ...current, [field]:value }));
    return <div className="event-manager">
        <div className="event-manager-heading"><p className="muted">Create and maintain event details, pricing, capacity, and publishing status.</p><button className="button primary small" onClick={()=>openEditor({...EMPTY_EVENT})}><Plus size={15}/> New event</button></div>
        <div className="panel application-filters event-filters"><div className="field"><label htmlFor="event-status-filter">Event status</label><select id="event-status-filter" value={eventStatusFilter} onChange={e=>setEventStatusFilter(e.target.value)}><option value="open">Open events only</option><option value="upcoming">Upcoming drafts</option><option value="closed">Closed</option><option value="completed">Completed</option><option value="all">All statuses</option></select></div><div className="field"><label htmlFor="event-location-filter">Location</label><select id="event-location-filter" value={eventLocationFilter} onChange={e=>setEventLocationFilter(e.target.value)}><option value="all">All locations</option>{eventLocations.map(location=><option key={location} value={location}>{location === 'unassigned' ? 'No location' : location}</option>)}</select></div><p className="muted">{eventRows.length} of {events?.length || 0} events shown.</p></div>
        {editing && <form ref={editorRef} className="panel event-editor" onSubmit={save}><div className="event-editor-title"><div><span className="eyebrow">{editing.id ? 'Edit event' : 'New event'}</span><h3>{editing.name || 'Untitled event'}</h3></div><button type="button" className="admin-icon-button" aria-label="Close event editor" onClick={()=>setEditing(null)}><X size={18}/></button></div><div className="event-form-grid">
            <div className="field"><label htmlFor="event-name">Event name</label><input id="event-name" value={editing.name} onChange={e=>update('name',e.target.value)} required/></div>
            <div className="field"><label htmlFor="event-slug">URL slug</label><input id="event-slug" value={editing.slug} onChange={e=>update('slug',e.target.value.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,''))} required/></div>
            <div className="field"><label htmlFor="event-date">Date</label><input id="event-date" type="date" value={editing.date} onChange={e=>update('date',e.target.value)} required/></div>
            <div className="field"><label htmlFor="event-time">Time</label><input id="event-time" type="time" value={editing.time} onChange={e=>update('time',e.target.value)} required/></div>
            <div className="field"><label htmlFor="event-location">City / location</label><input id="event-location" value={editing.location} onChange={e=>update('location',e.target.value)} placeholder="Da Nang" required/></div>
            <div className="field"><label htmlFor="event-venue-name">Venue name</label><input id="event-venue-name" value={editing.venueName} onChange={e=>update('venueName',e.target.value)} placeholder="FOR YOU STEAKHOUSE"/></div>
            <div className="field wide"><label htmlFor="event-venue-address">Venue address</label><input id="event-venue-address" value={editing.venueAddress} onChange={e=>update('venueAddress',e.target.value)} placeholder="Full street address"/></div>
            <div className="field"><label htmlFor="event-price">Dinner ticket (USD)</label><input id="event-price" type="number" min="0" step="0.01" value={editing.price} onChange={e=>update('price',e.target.value)} required/></div>
            <div className="field"><label htmlFor="event-capacity">Total capacity</label><input id="event-capacity" type="number" min="1" value={editing.capacity} onChange={e=>update('capacity',e.target.value)} required/></div>
            <div className="field"><label htmlFor="event-status">Status</label><select id="event-status" value={editing.status} onChange={e=>update('status',e.target.value)}><option value="upcoming">Upcoming</option><option value="open">Open</option><option value="closed">Closed</option><option value="completed">Completed</option></select></div>
            <div className="field wide"><label htmlFor="event-description">Description</label><textarea id="event-description" rows="4" value={editing.description} onChange={e=>update('description',e.target.value)}/></div>
        </div><div className="event-editor-actions"><button className="button primary" disabled={saving}><Save size={16}/>{saving ? 'Saving…' : 'Save event'}</button><button type="button" className="button ghost" onClick={()=>setEditing(null)}>Cancel</button></div></form>}
            <div className="panel table-wrap"><table className="data-table events-admin-table"><thead><tr><th>Event</th><th>Date & location</th><th>Venue</th><th>Pricing</th><th>Capacity</th><th>Status</th><th>Actions</th></tr></thead><tbody>{eventRows.map(event=>{const overflow=Math.max(0,Number(event.reserved_seats||0)-Number(event.max_attendees||0));return <tr className="admin-event-row" key={event.id} tabIndex="0" role="link" aria-label={`Open ${event.name}`} onClick={()=>router.push(`/admin/events/${encodeURIComponent(event.id)}`)} onKeyDown={keyEvent=>{if(keyEvent.key==='Enter'||keyEvent.key===' '){keyEvent.preventDefault();router.push(`/admin/events/${encodeURIComponent(event.id)}`);}}}><td><b>{event.name}</b><br/><span className="muted">/{event.slug}</span></td><td>{formatDate(event.event_date)} · {String(event.event_time || '').slice(0,5)}<br/><span className="muted">{event.location || '—'}</span></td><td>{event.venue_name || <span className="muted">—</span>}<br/><span className="muted">{event.venue_address || 'No address set'}</span></td><td>${Number(event.dinner_price || 0).toFixed(2)} dinner</td><td><b>{event.reserved_seats || 0} / {event.max_attendees}</b><br/>{overflow>0?<span className="capacity-overflow">{overflow} over capacity</span>:<span className="muted">{event.paid_seats || 0} paid</span>}</td><td><span className={`status ${event.status}`}>{event.status}</span></td><td><div className="row-actions"><Link className="admin-icon-button" aria-label={`View ${event.name}`} title="View event" href={`/admin/events/${encodeURIComponent(event.id)}`} onClick={clickEvent=>clickEvent.stopPropagation()}><ExternalLink size={16}/></Link><button className="admin-icon-button" aria-label={`Edit ${event.name}`} title="Edit event" onClick={clickEvent=>{clickEvent.stopPropagation();beginEdit(event);}}><Pencil size={16}/></button><button className="admin-icon-button danger" aria-label={`Delete ${event.name}`} title="Delete event" onClick={clickEvent=>{clickEvent.stopPropagation();remove(event);}}><Trash2 size={16}/></button></div></td></tr>})}</tbody></table>{events && !eventRows.length && <div className="empty">No events match these filters.</div>}</div>
    </div>;
}

export default function AdminPage() {
    const { user, ready } = useAuth();
    const [tab, setTab] = useState('applications');
    const [applications, setApplications] = useState(null);
    const [members, setMembers] = useState(null);
    const [events, setEvents] = useState(null);
    const [notice, setNotice] = useState(null);
    const [processingId, setProcessingId] = useState(null);
    const [reviewingId, setReviewingId] = useState(null);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [applicationEventFilter, setApplicationEventFilter] = useState('all');
    const [applicationStatusFilter, setApplicationStatusFilter] = useState('all');
    const [applicationStageFilter, setApplicationStageFilter] = useState('needs-follow-up');
    const [checkinRows, setCheckinRows] = useState(null);
    const [checkinLoading, setCheckinLoading] = useState(false);
    const [emailPreview, setEmailPreview] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deletingApplication, setDeletingApplication] = useState(false);

    useEffect(() => {
        const requestedTab = new URLSearchParams(window.location.search).get('tab');
        if (['applications', 'checkin', 'members', 'events'].includes(requestedTab)) setTab(requestedTab);
    }, []);

    async function load() {
        try {
            const [apps, people, eventRows] = await Promise.all([db('applications.list'), db('members.list'), db('events.list')]);
            setApplications(apps); setMembers(people); setEvents(eventRows);
            setSelectedEventId(current => current || eventRows.find(isUpcomingEvent)?.id || '');
        } catch(e) { setNotice({type:'error', message:e.message}); }
    }
    async function loadCheckin(eventId = selectedEventId) {
        if (!eventId) return;
        setCheckinLoading(true);
        try { setCheckinRows(await db('attendance.adminCheckinList', { eventId })); }
        catch (error) { setNotice({ type:'error', message:error.message }); }
        finally { setCheckinLoading(false); }
    }
    useEffect(() => { if (user?.is_admin) load(); }, [user]);
    useEffect(() => {
        if (!user?.is_admin || !selectedEventId) return;
        loadCheckin(selectedEventId);
    }, [user, selectedEventId]);

    const filteredApplications = useMemo(() => {
        const rows = applications || [];
        return rows.filter(app => {
            const eventMatches = applicationEventFilter === 'all' || app.event_id === applicationEventFilter;
            const statusMatches = applicationStatusFilter === 'all' || app.status === applicationStatusFilter;
            const stage = applicationStage(app);
            const stageMatches = applicationStageFilter === 'all'
                || (applicationStageFilter === 'needs-follow-up' && ['pending', 'approved-no-login', 'clicked-no-login', 'logged-in-unpaid'].includes(stage))
                || (applicationStageFilter === 'email-not-clicked' && app.status === 'approved' && app.order_status !== 'paid' && app.email_tracking_available && !app.email_clicked)
                || stage === applicationStageFilter;
            return eventMatches && statusMatches && stageMatches;
        });
    }, [applications, applicationEventFilter, applicationStatusFilter, applicationStageFilter]);

    const pendingApplicationCount = useMemo(() => (applications || []).filter(app => app.status === 'pending').length, [applications]);
    const funnel = useMemo(() => {
        const rows = applications || [];
        const count = stage => rows.filter(app => applicationStage(app) === stage).length;
        return {
            declined: count('declined'), noLogin: count('approved-no-login'), clickedNoLogin: count('clicked-no-login'),
            loggedUnpaid: count('logged-in-unpaid'), paid: count('paid'),
            notClicked: rows.filter(app => app.status === 'approved' && app.order_status !== 'paid' && app.email_tracking_available && !app.email_clicked).length
        };
    }, [applications]);

    function showApprovalResult(result, id) {
        const email = result.member?.email || applications?.find(app => app.id === id)?.email || 'the applicant';
        const message = result.alreadyAccepted
            ? `This application already has a reservation${result.accountReused ? ' on the existing member account' : ''}.`
            : result.accountReused
                ? `Approved and reserved for 48 hours. The existing account and password for ${email} were kept.${result.emailSent || result.emailMock ? ' The payment notice was sent.' : ' The payment notice could not be sent; ask the member to sign in and pay from their account.'}`
                : `Approved and reserved for 48 hours. Account created for ${email}.${result.emailMock ? ` Local email mock used; temporary password: ${result.tempPassword}` : result.emailSent ? ' Credentials and both payment options were emailed.' : ` Email failed - securely deliver this one-time password: ${result.tempPassword}`}`;
        setNotice({type:'success', message});
    }

    async function accept(id) {
        setNotice(null);
        setProcessingId(`${id}:accept`);
        try {
            const result = await callFunction('accept-application', { id, preview:true });
            setEmailPreview({ ...result, id, action:'accept' });
        } catch(e) { setNotice({type:'error', message:e.message}); }
        finally { setProcessingId(null); }
    }

    async function previewFollowUp(id, action) {
        setNotice(null);
        setProcessingId(`${id}:${action}`);
        try {
            const result = await callFunction('admin-application-action', { id, action, preview:true });
            setEmailPreview({ ...result, id, action });
        } catch (error) {
            setNotice({ type:'error', message:error.message });
        } finally {
            setProcessingId(null);
        }
    }

    async function sendFollowUp() {
        if (!emailPreview) return;
        const { id, action } = emailPreview;
        setNotice(null);
        setProcessingId(`${id}:${action}`);
        try {
            if (action === 'accept') {
                const result = await callFunction('accept-application', { id });
                showApprovalResult(result, id);
            } else {
                const result = await callFunction('admin-application-action', { id, action });
                setNotice({ type:'success', message: action === 'resend_approval' ? `Approval and payment email sent to ${result.email}.` : `Payment reminder sent to ${result.email}.` });
            }
            setEmailPreview(null);
            await load();
        } catch (error) {
            setNotice({ type:'error', message:error.message });
        } finally {
            setProcessingId(null);
        }
    }

    async function deleteApplication() {
        if (!deleteTarget) return;
        setDeletingApplication(true);
        setNotice(null);
        try {
            const result = await db('applications.delete', { id:deleteTarget.id });
            setDeleteTarget(null);
            setReviewingId(current => current === result.id ? null : current);
            setNotice({ type:'success', message:`Application for ${result.email} was permanently deleted. The member account was preserved.` });
            await load();
        } catch (error) {
            setNotice({ type:'error', message:error.message });
        } finally {
            setDeletingApplication(false);
        }
    }

    if (!ready) return <div className="loading">Checking admin access…</div>;
    if (!user?.is_admin) return <section className="auth-page"><div className="auth-card center"><ShieldCheck style={{color:'var(--lime)'}} size={40}/><h1>Admin access required.</h1><p className="muted">Sign in with an administrator account to review applications.</p><Link className="button primary" href="/login?next=/admin">Admin sign in</Link></div></section>;

    return <><section className="page-hero"><div className="container"><span className="eyebrow">Operations</span><h1 className="display medium">Admin workspace.</h1><p className="lead">Review applicants, create accounts, and monitor the event network.</p></div></section><section className="section compact"><div className="container dashboard">
        <aside className="side-nav"><button className={tab==='applications'?'active':''} onClick={()=>setTab('applications')}><CheckCircle2 size={17}/> Applications</button><button className={tab==='checkin'?'active':''} onClick={()=>setTab('checkin')}><ClipboardCheck size={17}/> Event check-in</button><button className={tab==='members'?'active':''} onClick={()=>setTab('members')}><UsersRound size={17}/> Members</button><button className={tab==='events'?'active':''} onClick={()=>setTab('events')}><CalendarDays size={17}/> Events</button></aside>
        <div><div className="toolbar"><div><h2>{tab === 'checkin' ? 'Event check-in' : tab[0].toUpperCase()+tab.slice(1)}</h2><p className="muted">{tab === 'applications' ? `${pendingApplicationCount} applications pending review${applicationStatusFilter === 'all' ? ` · ${filteredApplications.length} shown` : ''}` : tab === 'checkin' ? 'Paid attendees, tickets, meals, and event-day exports' : tab === 'members' ? `${members?.length || 0} member profiles` : `${events?.length || 0} events`}</p></div><button className="button ghost small" onClick={()=>{load(); if(tab === 'checkin') loadCheckin();}}><RefreshCw size={15}/> Refresh</button></div>
            {notice && <div className={`form-status ${notice.type}`} style={{marginBottom:16}}>{notice.message}</div>}
            {tab==='applications' && <>
                <div className="application-funnel">
                    <button className={applicationStageFilter==='approved-no-login'?'active':''} onClick={()=>setApplicationStageFilter('approved-no-login')}><span>Approved - no login</span><strong>{funnel.noLogin}</strong></button>
                    <button className={applicationStageFilter==='clicked-no-login'?'active':''} onClick={()=>setApplicationStageFilter('clicked-no-login')}><span>Email clicked - no login</span><strong>{funnel.clickedNoLogin}</strong></button>
                    <button className={applicationStageFilter==='logged-in-unpaid'?'active':''} onClick={()=>setApplicationStageFilter('logged-in-unpaid')}><span>Logged in - unpaid</span><strong>{funnel.loggedUnpaid}</strong></button>
                    <button className={applicationStageFilter==='email-not-clicked'?'active':''} onClick={()=>setApplicationStageFilter('email-not-clicked')}><span>No tracked email click</span><strong>{funnel.notClicked}</strong></button>
                    <button className={applicationStageFilter==='paid'?'active':''} onClick={()=>setApplicationStageFilter('paid')}><span>Paid</span><strong>{funnel.paid}</strong></button>
                    <button className={applicationStageFilter==='declined'?'active':''} onClick={()=>setApplicationStageFilter('declined')}><span>Auto declined</span><strong>{funnel.declined}</strong></button>
                </div>
                <div className="panel application-filters application-tracking-filters">
                    <div className="field"><label htmlFor="application-event-filter">Event</label><select id="application-event-filter" value={applicationEventFilter} onChange={e=>setApplicationEventFilter(e.target.value)}><option value="all">All events</option>{events?.map(event=><option key={event.id} value={event.id}>{event.name} · {formatDate(event.event_date)}</option>)}</select></div>
                    <div className="field"><label htmlFor="application-stage-filter">Follow-up stage</label><select id="application-stage-filter" value={applicationStageFilter} onChange={e=>setApplicationStageFilter(e.target.value)}><option value="needs-follow-up">Needs follow-up</option><option value="approved-no-login">Approved - no login recorded</option><option value="clicked-no-login">Email clicked - no login</option><option value="logged-in-unpaid">Logged in - unpaid</option><option value="email-not-clicked">No tracked email click</option><option value="paid">Paid</option><option value="declined">Auto declined</option><option value="pending">Pending review</option><option value="all">All stages</option></select></div>
                    <div className="field"><label htmlFor="application-status-filter">Application status</label><select id="application-status-filter" value={applicationStatusFilter} onChange={e=>setApplicationStatusFilter(e.target.value)}><option value="all">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="expired">Expired</option></select></div>
                    <p className="muted">{applications === null ? 'Loading filters…' : `${filteredApplications.length} of ${applications.length} applications shown.`}</p>
                </div>
                <div className="application-list">{applications === null ? <div className="loading">Loading applications…</div> : filteredApplications.map(app => <ApplicationCard key={app.id} app={app} reviewing={reviewingId === app.id} processingId={processingId} onAccept={accept} onAction={previewFollowUp} onReview={()=>setReviewingId(reviewingId === app.id ? null : app.id)} onDelete={setDeleteTarget}/>)}{applications && !filteredApplications.length && <div className="empty">{applications.length ? 'No applications match these filters.' : 'No applications yet.'}</div>}</div>
            </>}
            {tab==='members' && <div className="panel table-wrap"><table className="data-table"><thead><tr><th>Member</th><th>Company</th><th>Industry</th><th>Status</th></tr></thead><tbody>{members?.map(m=><tr key={m.id}><td><b>{m.first_name} {m.last_name}</b><br/><span className="muted">{m.email}</span></td><td>{m.role}<br/><span className="muted">{m.company}</span></td><td>{m.industry || '—'}</td><td><span className={`status ${m.is_approved?'approved':'pending'}`}>{m.is_approved?'approved':'pending'}</span></td></tr>)}</tbody></table></div>}
            {tab==='events' && <EventManager events={events} reload={load} notify={(type,message)=>setNotice({type,message})}/>}
            {tab==='checkin' && <CheckinView events={events} selectedEventId={selectedEventId} setSelectedEventId={setSelectedEventId} registrations={checkinRows} loading={checkinLoading} refresh={()=>loadCheckin(selectedEventId)} notice={(message,type='error')=>setNotice({type, message})}/>} 
        </div>
    </div></section>{emailPreview && <EmailPreviewModal preview={emailPreview} sending={processingId === `${emailPreview.id}:${emailPreview.action}`} onClose={()=>setEmailPreview(null)} onConfirm={sendFollowUp}/>} {deleteTarget && <DeleteApplicationModal app={deleteTarget} deleting={deletingApplication} onClose={()=>setDeleteTarget(null)} onConfirm={deleteApplication}/>}</>;
}
