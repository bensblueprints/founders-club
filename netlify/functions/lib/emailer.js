// Shared Resend email helper + branded templates.
// Mirrors the Resend send pattern in send-welcome-email.js (FROM_EMAIL + RESEND_API_KEY env).

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Founders Vietnam <noreply@foundersvn.com>';

const EVENT_DETAILS = {
    price: '$150 USD',
    location: 'Da Nang, Vietnam',
    date: 'Friday, July 31, 2026',
};

// Low-level send. Returns { success, mock?, id?, error? }. Never throws.
async function sendEmail({ to, subject, html }) {
    if (!RESEND_API_KEY) {
        console.log('[emailer] RESEND_API_KEY not set — logging instead of sending.');
        console.log('[emailer] to:', to, 'subject:', subject);
        return { success: true, mock: true };
    }
    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ from: FROM_EMAIL, to, subject, html })
        });
        if (!res.ok) {
            const details = await res.text();
            console.error('[emailer] Resend error:', details);
            return { success: false, error: details };
        }
        const data = await res.json();
        return { success: true, id: data.id };
    } catch (err) {
        console.error('[emailer] send failed:', err);
        return { success: false, error: err.message };
    }
}

// Shared branded shell (matches send-welcome-email.js styling).
function shell(innerHtml, footerNote = '') {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:40px 40px 20px;text-align:center;border-bottom:1px solid rgba(201,162,39,0.2);">
          <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:300;letter-spacing:4px;">FOUNDERS</h1>
          <p style="margin:5px 0 0;color:#c9a227;font-size:14px;letter-spacing:2px;">VIETNAM</p>
        </td></tr>
        <tr><td style="padding:40px;">${innerHtml}</td></tr>
        <tr><td style="padding:30px 40px;background-color:rgba(0,0,0,0.3);text-align:center;">
          <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0;">Founders Vietnam — Phone-free networking for founders</p>
          ${footerNote ? `<p style="color:rgba(255,255,255,0.3);font-size:12px;margin:10px 0 0;">${footerNote}</p>` : ''}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function btn(href, label) {
    return `<a href="${href}" style="display:inline-block;background:linear-gradient(135deg,#c9a227,#e5c464);color:#1a1a1a;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:500;font-size:16px;">${label}</a>`;
}

function eventBox() {
    return `<div style="background-color:rgba(201,162,39,0.1);border:1px solid rgba(201,162,39,0.3);border-radius:8px;padding:20px;margin:24px 0;">
      <p style="color:#c9a227;font-size:14px;margin:0 0 12px;font-weight:500;letter-spacing:1px;">EVENT DETAILS</p>
      <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>When:</strong> ${EVENT_DETAILS.date}</p>
      <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Where:</strong> ${EVENT_DETAILS.location}</p>
      <p style="color:#ffffff;font-size:15px;margin:0;"><strong>Seat:</strong> ${EVENT_DETAILS.price}</p>
    </div>`;
}

// --- Templates ---------------------------------------------------------------

// Sent to the applicant when accepted, containing the payment link.
function acceptedEmail({ firstName, payLink }) {
    const inner = `
      <h2 style="color:#c9a227;font-size:24px;margin:0 0 20px;font-weight:500;">You're in${firstName ? ', ' + firstName : ''}!</h2>
      <p style="color:#ffffff;font-size:16px;line-height:1.6;margin:0 0 8px;">Great news — your application to FoundersVN has been accepted. To confirm your seat, please complete your ${EVENT_DETAILS.price} payment below.</p>
      ${eventBox()}
      <p style="color:rgba(255,255,255,0.75);font-size:14px;line-height:1.6;margin:0 0 24px;">Your seat is held for <strong style="color:#fff;">7 days</strong>. After that it may be released to the waitlist.</p>
      ${btn(payLink, 'Pay to confirm your seat →')}
      <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:24px 0 0;word-break:break-all;">Or paste this link into your browser:<br>${payLink}</p>`;
    return { subject: "You're in — confirm your FoundersVN seat (Da Nang, Jul 31)", html: shell(inner) };
}

// Sent to the applicant when approved: contains their LOGIN credentials
// (email + temporary password + login URL) AND the $150 seat payment link.
// Combines "you're approved — here's how to log in" with "pay for the dinner".
function approvedWithLoginEmail({ firstName, email, tempPassword, loginUrl, payLink }) {
    const credBox = `
      <div style="background-color:rgba(255,255,255,0.06);border:1px solid rgba(201,162,39,0.3);border-radius:8px;padding:20px;margin:24px 0;">
        <p style="color:#c9a227;font-size:14px;margin:0 0 12px;font-weight:500;letter-spacing:1px;">YOUR LOGIN</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Email:</strong> ${email}</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Temporary password:</strong> <code style="color:#e5c464;font-size:15px;">${tempPassword}</code></p>
        <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:12px 0 0;">You'll be asked to set a new password the first time you log in.</p>
      </div>`;
    const inner = `
      <h2 style="color:#c9a227;font-size:24px;margin:0 0 20px;font-weight:500;">You're in${firstName ? ', ' + firstName : ''}!</h2>
      <p style="color:#ffffff;font-size:16px;line-height:1.6;margin:0 0 8px;">Your application to FoundersVN has been approved and your member account is ready. Use the credentials below to sign in.</p>
      ${credBox}
      <div style="margin:0 0 28px;">${btn(loginUrl, 'Log in to your account →')}</div>
      <p style="color:#ffffff;font-size:16px;line-height:1.6;margin:0 0 8px;">To confirm your seat at the dinner, please complete your ${EVENT_DETAILS.price} payment below.</p>
      ${eventBox()}
      <p style="color:rgba(255,255,255,0.75);font-size:14px;line-height:1.6;margin:0 0 24px;">Your seat is held for <strong style="color:#fff;">7 days</strong>. After that it may be released to the waitlist.</p>
      ${btn(payLink, 'Pay to confirm your seat →')}
      <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:24px 0 0;word-break:break-all;">Login: ${loginUrl}<br>Payment: ${payLink}</p>`;
    return { subject: "You're approved — your FoundersVN login + seat (Da Nang, Jul 31)", html: shell(inner) };
}

// Reminder emails (day 2 and day 5).
function reminderEmail({ firstName, payLink, dayNumber, daysLeft }) {
    const inner = `
      <h2 style="color:#c9a227;font-size:24px;margin:0 0 20px;font-weight:500;">Your seat is still waiting${firstName ? ', ' + firstName : ''}</h2>
      <p style="color:#ffffff;font-size:16px;line-height:1.6;margin:0 0 8px;">Just a friendly reminder that your FoundersVN seat isn't confirmed yet. You have <strong style="color:#c9a227;">${daysLeft} day${daysLeft === 1 ? '' : 's'}</strong> left to complete your ${EVENT_DETAILS.price} payment before the seat is released.</p>
      ${eventBox()}
      ${btn(payLink, 'Confirm my seat now →')}
      <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:24px 0 0;word-break:break-all;">Payment link:<br>${payLink}</p>`;
    return { subject: `Reminder: confirm your FoundersVN seat (${daysLeft} day${daysLeft === 1 ? '' : 's'} left)`, html: shell(inner) };
}

// Final "seat released" email at expiry (day 7).
function expiredEmail({ firstName }) {
    const inner = `
      <h2 style="color:#c9a227;font-size:24px;margin:0 0 20px;font-weight:500;">Your seat has been released</h2>
      <p style="color:#ffffff;font-size:16px;line-height:1.6;margin:0 0 20px;">Hi${firstName ? ' ' + firstName : ''}, we didn't receive payment within the 7-day window, so your FoundersVN seat for ${EVENT_DETAILS.date} in ${EVENT_DETAILS.location} has been released.</p>
      <p style="color:rgba(255,255,255,0.75);font-size:15px;line-height:1.6;margin:0 0 24px;">No hard feelings — if you'd still like to join, just reply to this email or re-apply and we'll do our best to find you a spot at an upcoming gathering.</p>
      ${btn('https://foundersvn.com/#apply', 'Re-apply for a seat →')}`;
    return { subject: 'Your FoundersVN seat has been released', html: shell(inner) };
}

// Sent to organisers when a new application arrives.
function notificationEmail({ app, adminUrl }) {
    const row = (label, val) => `<tr><td style="padding:6px 12px;color:#c9a227;font-size:13px;white-space:nowrap;vertical-align:top;">${label}</td><td style="padding:6px 12px;color:#fff;font-size:14px;">${val || '—'}</td></tr>`;
    const inner = `
      <h2 style="color:#c9a227;font-size:22px;margin:0 0 16px;font-weight:500;">New application — ${app.first_name || ''} ${app.last_name || ''}</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        ${row('Name', `${app.first_name || ''} ${app.last_name || ''}`)}
        ${row('Email', app.email)}
        ${row('Company', app.company)}
        ${row('Role', app.role)}
        ${row('Company link', app.company_link)}
        ${row('Industry', app.industry)}
        ${row('Looking for', app.looking_for)}
        ${row('Can offer', app.can_offer)}
        ${row('Building', app.what_you_do)}
        ${row('Links', app.social_link)}
        ${row('Event', app.event)}
        ${row('Page lang', app.page_language)}
      </table>
      <div style="margin-top:28px;">${btn(adminUrl, 'Open admin panel →')}</div>`;
    return { subject: `New FoundersVN application: ${app.first_name || ''} ${app.last_name || ''}`.trim(), html: shell(inner) };
}

module.exports = {
    EVENT_DETAILS,
    sendEmail,
    acceptedEmail,
    approvedWithLoginEmail,
    reminderEmail,
    expiredEmail,
    notificationEmail
};
