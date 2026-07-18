'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
    ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, Download, FileText, Settings2,
    ShieldCheck, Ticket, UserCheck, UsersRound, UtensilsCrossed, X
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { db, formatDate } from '@/lib/api';

const formatVnd = value => `${new Intl.NumberFormat('vi-VN').format(Number(value || 0))} ₫`;
const fullName = row => `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email || 'Unnamed member';

function parsedMeal(row) {
    if (row?.meal_order && typeof row.meal_order === 'object') return row.meal_order;
    try { return JSON.parse(row?.meal_order || 'null'); } catch (_) { return null; }
}

function mealSummary(row) {
    const meal = parsedMeal(row);
    if (!meal && !row.meal_submitted_at) return 'Not selected';
    const count = meal?.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0;
    return `${count} item${count === 1 ? '' : 's'}${Number(row.meal_amount_due_vnd || 0) > 0 ? ` - ${formatVnd(row.meal_amount_due_vnd)} due` : ' - within credit'}`;
}

function displayValue(value) {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

function flattenObject(value, prefix = '', output = {}) {
    Object.entries(value || {}).forEach(([key, item]) => {
        const nextKey = prefix ? `${prefix}.${key}` : key;
        if (item && typeof item === 'object' && !Array.isArray(item)) flattenObject(item, nextKey, output);
        else output[nextKey] = Array.isArray(item) ? JSON.stringify(item) : item;
    });
    return output;
}

function exportRows(event, registrations) {
    const eventFields = Object.fromEntries(Object.entries(event || {}).map(([key, value]) => [`event.${key}`, value]));
    return registrations.flatMap(registration => {
        const bookingFields = { ...eventFields, ...registration, meal_order:parsedMeal(registration) };
        const member = {
            person_type:'Member', person_name:fullName(registration), person_email:registration.email || '',
            booking_member_name:fullName(registration), booking_member_email:registration.email || '', ...bookingFields
        };
        if (Number(registration.seat_count || 1) < 2) return [member];
        return [member, {
            person_type:'Guest', person_name:registration.guest_name || 'Guest name not provided', person_email:'',
            booking_member_name:fullName(registration), booking_member_email:registration.email || '', ...bookingFields
        }];
    });
}

function downloadBlob(filename, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a');
    link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const RECOMMENDED_REPORT_FIELDS = [
    'person_type', 'person_name', 'person_email', 'booking_member_name', 'booking_member_email',
    'event.name', 'event.event_date', 'event.event_time', 'event.venue_name', 'event.venue_address',
    'company', 'role', 'seat_count', 'guest_name', 'ticket_type', 'checked_in',
    'meal_order.items', 'meal_order.notes', 'meal_total_vnd', 'meal_amount_due_vnd',
    'paid_provider', 'paid_amount', 'paid_currency'
];

function reportRows(event, registrations) {
    return exportRows(event, registrations).map(row => flattenObject(row));
}

function reportColumns(event, registrations) {
    const preferred = ['person_type', 'person_name', 'person_email', 'booking_member_name', 'booking_member_email'];
    const eventKeys = Object.keys(event || {}).map(key => `event.${key}`);
    const keys = Array.from(new Set([...eventKeys, ...reportRows(event, registrations).flatMap(row => Object.keys(row))]));
    return [...preferred, ...keys.filter(key => !preferred.includes(key)).sort()];
}

function reportFieldLabel(key) {
    return key.replace(/^event\./, '').replace(/^meal_order\./, 'meal ').replaceAll('.', ' / ').replaceAll('_', ' ')
        .replace(/\b\w/g, character => character.toUpperCase());
}

function reportFieldGroup(key) {
    if (key.startsWith('person_') || key.startsWith('booking_member_')) return 'Attendee';
    if (key.startsWith('event.')) return 'Event';
    if (key.startsWith('meal_') || key.startsWith('meal_order.')) return 'Meal order';
    if (/paid|payment|provider|sepay|airwallex|transaction|email_/.test(key)) return 'Payment and email';
    if (/application|applied|accepted|reviewed|what_you_do|looking_for|can_offer|biggest_challenge|unique_value|goals_12_month|why_join|referral|membership|page_language|revenue|team_size/.test(key)) return 'Application';
    if (/website|profile|social|linkedin|twitter|facebook|instagram|whatsapp|zalo|telegram|wechat|bio|company|role|industry|age|account|member_/.test(key)) return 'Member profile';
    return 'Ticket and attendance';
}

function downloadSelectedCsv(event, registrations, columns) {
    const flattened = exportRows(event, registrations).map(row => flattenObject(row));
    const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const header = columns.map(key => quote(reportFieldLabel(key))).join(',');
    const body = flattened.map(row => columns.map(key => quote(row[key])).join(',')).join('\r\n');
    downloadBlob(`${event.slug || 'event'}-guest-report.csv`, `\ufeff${header}\r\n${body}`, 'text/csv;charset=utf-8');
}

function downloadCompleteJson(event, registrations) {
    downloadBlob(`${event.slug || 'event'}-complete-guest-data.json`, JSON.stringify({
        exportedAt:new Date().toISOString(), event, attendees:exportRows(event, registrations)
    }, null, 2), 'application/json;charset=utf-8');
}

function printSelectedReport(event, registrations, columns) {
    const rows = reportRows(event, registrations);
    const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);
    const eventDate = event.event_date ? new Date(event.event_date).toLocaleDateString(undefined, { weekday:'long', year:'numeric', month:'long', day:'numeric', timeZone:'UTC' }) : '';
    const cards = rows.length ? rows.map((row, index) => `<section class="person"><header><span>${escape(row.person_type || 'Attendee')}</span><h2>${escape(row.person_name || `Attendee ${index + 1}`)}</h2></header><div class="fields">${columns.map(key => `<div><b>${escape(reportFieldLabel(key))}</b><p>${escape(displayValue(row[key]))}</p></div>`).join('')}</div></section>`).join('') : '<p class="empty">No paid attendees are currently registered for this event.</p>';
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escape(event.name)} guest report</title><style>
      @page{size:A4 portrait;margin:13mm}*{box-sizing:border-box}body{margin:0;color:#18231f;font:10px/1.42 Arial,sans-serif}body>header{padding-bottom:12px;margin-bottom:14px;border-bottom:3px solid #e7644a}h1{margin:0 0 5px;font-size:24px}header p{margin:2px 0;color:#59665f}.meta{display:flex;gap:18px;margin-top:7px}.meta b{color:#18231f}.person{margin:0 0 14px;border:1px solid #ccd5d1;break-inside:avoid;page-break-inside:avoid}.person>header{padding:9px 11px;color:#fff;background:#0b241b}.person>header span{font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:#e9a18f}.person h2{margin:2px 0 0;font-size:15px}.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.fields>div{min-width:0;padding:8px 10px;border-right:1px solid #e1e6e3;border-bottom:1px solid #e1e6e3}.fields b{display:block;color:#6b7771;font-size:7px;letter-spacing:.06em;text-transform:uppercase}.fields p{margin:3px 0 0;overflow-wrap:anywhere;white-space:pre-wrap}.empty{padding:30px;text-align:center;border:1px solid #ccd5d1}footer{margin-top:14px;color:#73807a;font-size:8px;display:flex;justify-content:space-between}
    </style></head><body><header><h1>${escape(event.name || 'Event')} - Guest report</h1><p>${escape(eventDate)} at ${escape(String(event.event_time || '').slice(0,5))}</p><p>${escape(event.venue_name || event.location || '')}${event.venue_address ? ` - ${escape(event.venue_address)}` : ''}</p><div class="meta"><span><b>${rows.length}</b> attendee record${rows.length === 1 ? '' : 's'}</span><span><b>${columns.length}</b> selected field${columns.length === 1 ? '' : 's'}</span></div></header>${cards}<footer><span>FoundersVN event operations</span><span>Generated ${escape(new Date().toLocaleString())}</span></footer></body></html>`;
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    Object.assign(frame.style, { position:'fixed', width:'1px', height:'1px', right:'0', bottom:'0', border:'0', opacity:'0' });
    document.body.appendChild(frame);
    const printDocument = frame.contentWindow.document;
    printDocument.open(); printDocument.write(html); printDocument.close();
    window.setTimeout(() => {
        frame.contentWindow.focus(); frame.contentWindow.print();
        window.setTimeout(() => frame.remove(), 1000);
    }, 250);
}

function Field({ label, value }) {
    return <div><span>{label}</span><strong>{displayValue(value)}</strong></div>;
}

function ReportBuilder({ event, registrations, onClose }) {
    const columns = useMemo(() => reportColumns(event, registrations), [event, registrations]);
    const recommended = useMemo(() => RECOMMENDED_REPORT_FIELDS.filter(key => columns.includes(key)), [columns]);
    const [selected, setSelected] = useState(() => recommended);
    const groups = useMemo(() => columns.reduce((result, key) => {
        const group = reportFieldGroup(key);
        if (!result[group]) result[group] = [];
        result[group].push(key);
        return result;
    }, {}), [columns]);
    const toggle = key => setSelected(current => current.includes(key) ? current.filter(item => item !== key) : [...current, key]);
    const orderedSelection = columns.filter(key => selected.includes(key));
    return <div className="modal-backdrop admin-report-backdrop" role="presentation" onMouseDown={eventObject=>{if(eventObject.target===eventObject.currentTarget)onClose();}}><section className="admin-report-modal" role="dialog" aria-modal="true" aria-labelledby="admin-report-title">
        <header className="admin-report-header"><div><span className="eyebrow">Custom export</span><h2 id="admin-report-title">Choose report fields</h2><p>Select exactly what should appear in the CSV or PDF report.</p></div><button type="button" className="admin-icon-button" aria-label="Close report options" onClick={onClose}><X size={18}/></button></header>
        <div className="admin-report-toolbar"><span><b>{selected.length}</b> of {columns.length} fields selected</span><div><button type="button" onClick={()=>setSelected(recommended)}>Recommended</button><button type="button" onClick={()=>setSelected([...columns])}>Select all</button><button type="button" onClick={()=>setSelected([])}>Clear</button></div></div>
        <div className="admin-report-groups">{Object.entries(groups).map(([group, fields]) => <fieldset key={group}><legend>{group}</legend><div>{fields.map(key => <label key={key} className={selected.includes(key) ? 'selected' : ''}><input type="checkbox" checked={selected.includes(key)} onChange={()=>toggle(key)}/><span>{reportFieldLabel(key)}</span></label>)}</div></fieldset>)}</div>
        <footer className="admin-report-actions"><button type="button" className="button ghost" onClick={onClose}>Cancel</button><button type="button" className="button ghost" disabled={!orderedSelection.length} onClick={()=>downloadSelectedCsv(event, registrations, orderedSelection)}><Download size={16}/> Export selected CSV</button><button type="button" className="button primary" disabled={!orderedSelection.length} onClick={()=>printSelectedReport(event, registrations, orderedSelection)}><FileText size={16}/> Export PDF / Print</button></footer>
    </section></div>;
}

function AttendeeDetails({ row }) {
    const meal = parsedMeal(row);
    const sections = [
        ['Member and contact', [
            ['Member ID', row.member_id], ['Email', row.email], ['Age', row.age], ['Company', row.company], ['Role', row.role],
            ['Industry', row.industry], ['Member type', row.member_type], ['Account status', row.account_status], ['Bio', row.bio],
            ['Website', row.website], ['Other websites', row.websites], ['Company link', row.company_link], ['Profile photo', row.profile_photo],
            ['Social profile', row.social_link], ['LinkedIn', row.linkedin], ['Twitter', row.twitter], ['Facebook', row.facebook],
            ['Instagram', row.instagram], ['WhatsApp', row.whatsapp], ['Zalo', row.zalo], ['Telegram', row.telegram], ['WeChat', row.wechat]
        ]],
        ['Application and founder profile', [
            ['Application ID', row.application_id], ['Application status', row.application_status], ['Application payment status', row.application_payment_status],
            ['Applied', row.applied_at && new Date(row.applied_at).toLocaleString()], ['Reviewed', row.reviewed_at && new Date(row.reviewed_at).toLocaleString()],
            ['Accepted', row.accepted_at && new Date(row.accepted_at).toLocaleString()], ['Revenue', row.revenue], ['Team size', row.team_size],
            ['What they do', row.what_you_do], ['Looking for', row.looking_for], ['Can offer', row.can_offer],
            ['Biggest challenge', row.biggest_challenge], ['Unique value', row.unique_value], ['12-month goals', row.goals_12_month],
            ['Why join', row.why_join], ['Referral', row.referral], ['Referred by', row.referrer_name],
            ['Membership request', row.membership_type], ['Form language', row.page_language]
        ]],
        ['Ticket, payment, and attendance', [
            ['Registration ID', row.attendance_id], ['Ticket type', row.ticket_type], ['Requested tickets', row.requested_ticket_count],
            ['Seats', row.seat_count], ['Guest name', row.guest_name], ['Registration status', row.payment_status],
            ['Approved', row.approved_at && new Date(row.approved_at).toLocaleString()], ['Paid', row.paid_at && new Date(row.paid_at).toLocaleString()],
            ['Checked in', row.checked_in], ['Checked in at', row.checked_in_at && new Date(row.checked_in_at).toLocaleString()],
            ['Payment order', row.payment_order_id], ['Payment order status', row.payment_order_status], ['Paid via', row.paid_provider],
            ['Paid amount', row.paid_amount != null ? `${Number(row.paid_amount).toLocaleString()} ${row.paid_currency || ''}` : null],
            ['Transaction ID', row.provider_transaction_id], ['Ticket base USD', row.base_amount_usd], ['Airwallex fee USD', row.airwallex_fee_usd],
            ['Airwallex total USD', row.airwallex_total_usd], ['SePay amount VND', row.sepay_amount_vnd], ['SePay reference', row.sepay_code],
            ['Payment created', row.order_created_at && new Date(row.order_created_at).toLocaleString()],
            ['Payment expiry', row.payment_expires_at && new Date(row.payment_expires_at).toLocaleString()],
            ['Latest email type', row.email_type?.replaceAll('_', ' ')], ['Email status', row.email_status],
            ['Email sent', row.email_sent_at && new Date(row.email_sent_at).toLocaleString()],
            ['Email status updated', row.email_status_at && new Date(row.email_status_at).toLocaleString()], ['Email error', row.email_error]
        ]],
        ['Meal order', [
            ['Menu status', mealSummary(row)], ['Selections', meal?.items?.map(item => `${item.quantity}× ${item.name}${item.detail ? ` (${item.detail})` : ''}`).join('; ')],
            ['Special requests', meal?.notes], ['Subtotal', row.meal_submitted_at ? formatVnd(row.meal_subtotal_vnd) : null],
            ['VAT', row.meal_submitted_at ? formatVnd(row.meal_vat_vnd) : null], ['Service charge', row.meal_submitted_at ? formatVnd(row.meal_service_vnd) : null],
            ['Restaurant total', row.meal_submitted_at ? formatVnd(row.meal_total_vnd) : null], ['Food credit', row.meal_submitted_at ? formatVnd(row.meal_credit_vnd) : null],
            ['Due at restaurant', row.meal_submitted_at ? formatVnd(row.meal_amount_due_vnd) : null],
            ['Submitted', row.meal_submitted_at && new Date(row.meal_submitted_at).toLocaleString()],
            ['Last updated', row.meal_updated_at && new Date(row.meal_updated_at).toLocaleString()], ['Complete meal JSON', meal]
        ]]
    ];
    return <div className="admin-event-attendee-details">{sections.map(([title, fields]) => <section key={title}><h3>{title}</h3><div className="checkin-detail-grid">{fields.map(([label, value]) => <Field key={label} label={label} value={value}/>)}</div></section>)}</div>;
}

function EventDetailContent() {
    const { user, ready } = useAuth();
    const params = useParams();
    const eventId = String(params?.id || '');
    const [event, setEvent] = useState(null);
    const [registrations, setRegistrations] = useState(null);
    const [expanded, setExpanded] = useState('');
    const [reportOpen, setReportOpen] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!user?.is_admin || !eventId) return;
        let active = true;
        Promise.all([db('events.list'), db('attendance.adminCheckinList', { eventId })])
            .then(([events, rows]) => {
                if (!active) return;
                const selected = (events || []).find(item => String(item.id) === eventId);
                if (!selected) throw new Error('Event not found');
                setEvent(selected); setRegistrations(rows || []);
            }).catch(loadError => { if (active) setError(loadError.message); });
        return () => { active = false; };
    }, [user, eventId]);

    const attendeeCount = useMemo(() => (registrations || []).reduce((sum, row) => sum + Number(row.seat_count || 1), 0), [registrations]);
    const checkedInCount = useMemo(() => (registrations || []).filter(row => row.checked_in).reduce((sum, row) => sum + Number(row.seat_count || 1), 0), [registrations]);
    const menuCount = useMemo(() => (registrations || []).filter(row => row.meal_submitted_at || parsedMeal(row)).length, [registrations]);
    const dueTotal = useMemo(() => (registrations || []).reduce((sum, row) => sum + Number(row.meal_amount_due_vnd || 0), 0), [registrations]);

    if (!ready) return <div className="loading">Checking admin access…</div>;
    if (!user?.is_admin) return <section className="auth-page"><div className="auth-card center"><ShieldCheck style={{color:'var(--orange)'}} size={40}/><h1>Admin access required.</h1><Link className="button primary" href={`/login?next=${encodeURIComponent(`/admin/events/${eventId}`)}`}>Admin sign in</Link></div></section>;
    if (error) return <section className="auth-page"><div className="auth-card center"><h1>Event unavailable.</h1><p className="muted">{error}</p><Link className="button primary" href="/admin">Back to admin</Link></div></section>;
    if (!event || registrations === null) return <div className="loading">Loading event and attendees…</div>;

    return <div className="admin-event-page"><section className="admin-event-hero"><div className="container">
        <Link className="admin-event-back" href="/admin?tab=events"><ArrowLeft size={16}/> Admin events</Link>
        <div className="admin-event-hero-row"><div><div className="application-status-line"><span className={`status ${event.status}`}>{event.status}</span><span className="eyebrow">Event record</span></div><h1>{event.name}</h1><p>{formatDate(event.event_date, { weekday:'long' })} at {String(event.event_time || '18:00').slice(0,5)} - {event.venue_name || event.location || 'Venue not set'}</p></div><div className="admin-event-export-actions"><button className="button ghost" onClick={()=>downloadCompleteJson(event, registrations)}><Download size={16}/> Export full JSON</button><button className="button primary" onClick={()=>setReportOpen(true)}><Settings2 size={16}/> Build report</button></div></div>
    </div></section><section className="section compact"><div className="container admin-event-detail-layout">
        <div className="admin-event-stats"><article className="panel"><UsersRound size={19}/><span>Paid registrations</span><strong>{registrations.length}</strong></article><article className="panel"><Ticket size={19}/><span>Confirmed attendees</span><strong>{attendeeCount}</strong></article><article className="panel"><UserCheck size={19}/><span>Checked in</span><strong>{checkedInCount}</strong></article><article className="panel"><UtensilsCrossed size={19}/><span>Menus saved</span><strong>{menuCount}</strong></article><article className={`panel ${dueTotal > 0 ? 'due' : ''}`}><CheckCircle2 size={19}/><span>Restaurant balance</span><strong>{formatVnd(dueTotal)}</strong></article></div>
        <section className="panel admin-event-information"><div className="admin-event-section-heading"><div><span className="eyebrow">Event information</span><h2>Event details</h2></div><Link className="button ghost small" href="/admin?tab=events">Return to event manager</Link></div><div className="admin-event-info-grid"><Field label="Event ID" value={event.id}/><Field label="URL slug" value={`/${event.slug}`}/><Field label="Date" value={formatDate(event.event_date, { weekday:'long' })}/><Field label="Time" value={String(event.event_time || '').slice(0,5)}/><Field label="City / location" value={event.location}/><Field label="Venue" value={event.venue_name}/><Field label="Venue address" value={event.venue_address}/><Field label="Dinner price" value={`$${Number(event.dinner_price || 0).toFixed(2)} USD`}/><Field label="Cruise price" value={event.cruise_price != null ? `$${Number(event.cruise_price).toFixed(2)} USD` : null}/><Field label="Capacity" value={`${event.reserved_seats || 0} reserved / ${event.max_attendees || 0} total`}/><Field label="Cruise capacity" value={event.max_cruise_spots}/><Field label="Paid seats" value={event.paid_seats || 0}/><Field label="Status" value={event.status}/><Field label="Created" value={event.created_at ? new Date(event.created_at).toLocaleString() : null}/><Field label="Description" value={event.description}/></div></section>
        <section className="admin-event-attendees"><div className="admin-event-section-heading"><div><span className="eyebrow">Guest information</span><h2>Members attending</h2><p>{attendeeCount} confirmed attendee{attendeeCount === 1 ? '' : 's'} across {registrations.length} paid registration{registrations.length === 1 ? '' : 's'}.</p></div></div>
            <div className="admin-event-attendee-list">{registrations.map(row => { const open = expanded === row.attendance_id; return <article className={`panel admin-event-attendee ${open ? 'open' : ''}`} key={row.attendance_id}><button className="admin-event-attendee-summary" type="button" aria-expanded={open} onClick={()=>setExpanded(open ? '' : row.attendance_id)}><span className="admin-event-avatar">{(row.first_name?.[0] || '')}{(row.last_name?.[0] || '')}</span><span><strong>{fullName(row)}</strong><small>{row.role || 'Founder'}{row.company ? ` at ${row.company}` : ''}</small><small>{row.email}</small></span><span className="admin-event-attendee-meta"><b>{row.seat_count || 1} seat{Number(row.seat_count || 1) === 1 ? '' : 's'}</b>{row.guest_name && <small>Guest: {row.guest_name}</small>}<small>{mealSummary(row)}</small></span><span className={`status ${row.checked_in ? 'approved' : 'pending'}`}>{row.checked_in ? 'checked in' : 'not checked in'}</span>{open ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</button>{open && <AttendeeDetails row={row}/>}</article>; })}{!registrations.length && <div className="empty">No paid attendees for this event yet.</div>}</div>
        </section>
    </div></section>{reportOpen && <ReportBuilder event={event} registrations={registrations} onClose={()=>setReportOpen(false)}/>}</div>;
}

export default function AdminEventDetailPage() {
    return <EventDetailContent/>;
}
