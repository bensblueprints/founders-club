// Shared Resend email helper + branded templates.
// Mirrors the Resend send pattern in send-welcome-email.js (FROM_EMAIL + RESEND_API_KEY env).

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ENGAGEMENT_TRACKING_ENABLED = process.env.RESEND_CLICK_TRACKING_ENABLED === 'true';
const FROM_EMAIL = process.env.FROM_EMAIL || 'FoundersVN <support@foundersvn.com>';
const { sql, isConfigured } = require('./neon');
const { FOUNDERSVN_LOGO_BASE64 } = require('./email-assets');
const {
    FACEBOOK_ICON_BASE64,
    INSTAGRAM_ICON_BASE64,
    WHATSAPP_ICON_BASE64
} = require('./email-social-assets');
const { publicBaseUrl: configuredPublicBaseUrl } = require('./site-url');

const EVENT_DETAILS = {
    price: '$150 USD',
    location: 'Da Nang',
    venueName: 'FoundersVN venue',
    venueAddress: 'Venue address to be announced',
    date: 'Friday, July 31, 2026',
};

const CONTACT_PHONE = '+49 1575 4444113';
const WHATSAPP_COMMUNITY_URL = 'https://chat.whatsapp.com/Cj66s2X6JhOGdz4BqCK3BQ?mode=gi_t';
const FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=61592081271397';
const INSTAGRAM_URL = 'https://www.instagram.com/foundersvn/';

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[ch]);
}

function formatVnd(value) {
    return `${new Intl.NumberFormat('vi-VN').format(Number(value || 0))} VND`;
}

function formatHoldDeadline(value) {
    if (!value) return '';
    return new Date(value).toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh',
        timeZoneName: 'short'
    });
}

function displayEventTime(value) {
    const raw = String(value || '18:00').slice(0, 5);
    const [hour, minute] = raw.split(':').map(Number);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return raw;
    return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC'
    }).format(new Date(Date.UTC(2026, 0, 1, hour, minute)));
}

function venueFor(event = {}) {
    const venueName = event.venueName || event.venue_name || event.place || event.venue || event.location || EVENT_DETAILS.venueName;
    const venueAddress = event.venueAddress || event.venue_address || event.address || '';
    return { name: venueName, address: venueAddress };
}

function publicBaseUrl() {
    return configuredPublicBaseUrl();
}

function absoluteUrl(path) {
    if (/^https?:\/\//i.test(String(path || ''))) return String(path);
    return `${publicBaseUrl()}${String(path || '').startsWith('/') ? '' : '/'}${path || ''}`;
}

function sameSitePath(value, fallback = '/') {
    try {
        const url = new URL(value, publicBaseUrl());
        return `${url.pathname}${url.search}${url.hash}`;
    } catch (_) {
        return fallback;
    }
}

function loginWithNextUrl(loginUrl, nextUrl) {
    const login = new URL(loginUrl || `${publicBaseUrl()}/login`, publicBaseUrl());
    login.searchParams.set('next', sameSitePath(nextUrl, '/payment'));
    return login.toString();
}

// Low-level send. Returns { success, mock?, id?, error? }. Never throws.
async function recordDelivery({ providerEmailId = null, to, subject, tracking = {}, status, error = null, mock = false }) {
    if (!isConfigured()) return;
    const recipient = Array.isArray(to) ? to.join(', ') : String(to);
    try {
        await sql`INSERT INTO email_deliveries
            (provider_email_id, member_id, application_id, event_id, recipient, subject,
             email_type, status, error, metadata, engagement_tracking_enabled)
          VALUES (${providerEmailId}, ${tracking.memberId || null}, ${tracking.applicationId || null},
            ${tracking.eventId || null}, ${recipient}, ${subject}, ${tracking.type || 'transactional'},
            ${status}, ${error}, ${JSON.stringify({ mock, ...(tracking.metadata || {}) })}::jsonb,
            ${ENGAGEMENT_TRACKING_ENABLED})
          ON CONFLICT (provider_email_id) DO UPDATE SET
            member_id = COALESCE(email_deliveries.member_id, EXCLUDED.member_id),
            application_id = COALESCE(email_deliveries.application_id, EXCLUDED.application_id),
            event_id = COALESCE(email_deliveries.event_id, EXCLUDED.event_id),
            recipient = EXCLUDED.recipient,
            subject = EXCLUDED.subject,
            email_type = EXCLUDED.email_type,
            status = CASE
                WHEN EXCLUDED.status IN ('queued', 'sent')
                  AND email_deliveries.status NOT IN ('queued', 'sent')
                THEN email_deliveries.status
                ELSE EXCLUDED.status
            END,
            error = CASE
                WHEN EXCLUDED.status IN ('queued', 'sent')
                  AND email_deliveries.status NOT IN ('queued', 'sent')
                THEN email_deliveries.error
                ELSE EXCLUDED.error
            END,
            metadata = email_deliveries.metadata || EXCLUDED.metadata,
            engagement_tracking_enabled = email_deliveries.engagement_tracking_enabled
                OR EXCLUDED.engagement_tracking_enabled,
            updated_at = NOW()`;
    } catch (recordError) {
        console.error('[emailer] could not record delivery:', recordError.message);
    }
}

async function sendEmail({ to, subject, html, tracking = {} }) {
    if (!RESEND_API_KEY) {
        console.log('[emailer] RESEND_API_KEY not set — logging instead of sending.');
        console.log('[emailer] to:', to, 'subject:', subject);
        await recordDelivery({ to, subject, tracking, status: 'mock', mock: true });
        return { success: true, mock: true };
    }
    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to,
                subject,
                html,
                attachments: [
                    {
                        filename: 'foundersvn-logo.png',
                        content: FOUNDERSVN_LOGO_BASE64,
                        content_type: 'image/png',
                        content_id: 'foundersvn-logo'
                    },
                    {
                        filename: 'facebook.png',
                        content: FACEBOOK_ICON_BASE64,
                        content_type: 'image/png',
                        content_id: 'foundersvn-facebook'
                    },
                    {
                        filename: 'instagram.png',
                        content: INSTAGRAM_ICON_BASE64,
                        content_type: 'image/png',
                        content_id: 'foundersvn-instagram'
                    },
                    {
                        filename: 'whatsapp.png',
                        content: WHATSAPP_ICON_BASE64,
                        content_type: 'image/png',
                        content_id: 'foundersvn-whatsapp'
                    }
                ]
            })
        });
        if (!res.ok) {
            const details = await res.text();
            console.error('[emailer] Resend error:', details);
            await recordDelivery({ to, subject, tracking, status: 'failed', error: details });
            return { success: false, error: details };
        }
        const data = await res.json();
        await recordDelivery({ providerEmailId: data.id, to, subject, tracking, status: 'queued' });
        return { success: true, id: data.id };
    } catch (err) {
        console.error('[emailer] send failed:', err);
        await recordDelivery({ to, subject, tracking, status: 'failed', error: err.message });
        return { success: false, error: err.message };
    }
}

// Shared branded shell matching the public landing page brand.
function shell(innerHtml, footerNote = '') {
    const logoUrl = process.env.EMAIL_PREVIEW_INLINE_ASSETS === 'true'
        ? `data:image/png;base64,${FOUNDERSVN_LOGO_BASE64}`
        : 'cid:foundersvn-logo';
    const socialAssets = {
        facebook: FACEBOOK_ICON_BASE64,
        instagram: INSTAGRAM_ICON_BASE64,
        whatsapp: WHATSAPP_ICON_BASE64
    };
    const socialIcon = (href, icon, label) => {
        const src = process.env.EMAIL_PREVIEW_INLINE_ASSETS === 'true'
            ? `data:image/png;base64,${socialAssets[icon]}`
            : `cid:foundersvn-${icon}`;
        return `<a href="${href}" aria-label="${label}" style="display:inline-block;margin:0 5px;text-decoration:none;"><img src="${src}" width="36" height="36" alt="${label}" style="display:block;width:36px;height:36px;border:0;border-radius:50%;"></a>`;
    };
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap');
    body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
    table { border-collapse:collapse!important; }
    img { -ms-interpolation-mode:bicubic; }
    h1, h2, h3 { font-family:'Plus Jakarta Sans',Inter,Arial,sans-serif!important; }
    @media only screen and (max-width:620px) {
      .email-outer { padding:16px 8px!important; }
      .email-card { width:100%!important; max-width:100%!important; border-radius:10px!important; }
      .email-header { padding:24px 20px 18px!important; }
      .email-content { padding:26px 20px!important; }
      .email-footer { padding:24px 20px!important; }
      .email-logo { width:190px!important; max-width:76%!important; }
      .email-footer-logo { width:145px!important; max-width:58%!important; }
      .email-content h2 { font-size:22px!important; line-height:1.25!important; }
      .email-copy { font-size:15px!important; line-height:1.6!important; }
      .email-button { display:block!important; width:100%!important; box-sizing:border-box!important; padding:14px 12px!important; text-align:center!important; }
      .email-detail-box, .email-account-box { padding:16px!important; margin:20px 0!important; }
      .email-detail-box p, .email-account-box p, .email-footer p { overflow-wrap:anywhere!important; word-break:normal!important; }
      .admin-table, .admin-table tbody, .admin-table tr, .admin-table td { display:block!important; width:100%!important; box-sizing:border-box!important; }
      .admin-table td { padding:4px 0!important; white-space:normal!important; overflow-wrap:anywhere!important; }
      .admin-table tr { padding:8px 0!important; border-bottom:1px solid rgba(217,255,99,0.12)!important; }
    }
    @media only screen and (max-width:380px) {
      .email-outer { padding:8px 4px!important; }
      .email-header { padding:22px 16px 17px!important; }
      .email-content { padding:24px 16px!important; }
      .email-footer { padding:22px 16px!important; }
      .email-logo { width:170px!important; }
      .email-content h2 { font-size:20px!important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#071a14;font-family:Inter,Arial,'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table class="email-outer" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background-color:#071a14;padding:40px 20px;">
    <tr><td align="center">
      <table class="email-card" role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;margin:0 auto;background-color:#0b2018;border:1px solid rgba(169,187,182,0.16);border-radius:18px;overflow:hidden;">
        <tr><td class="email-header" style="padding:34px 40px 22px;text-align:left;border-bottom:1px solid rgba(169,187,182,0.16);background:linear-gradient(135deg,#071a14 0%,#0e2a20 58%,rgba(255,117,73,0.18) 100%);">
          <img class="email-logo" src="${logoUrl}" width="220" alt="FoundersVN" style="display:block;width:220px;max-width:78%;height:auto;margin:0 0 14px;border:0;">
          <p style="margin:0;color:#a9bbb6;font-size:13px;letter-spacing:0.08em;">Phone-free networking for founders</p>
        </td></tr>
        <tr><td class="email-content" style="padding:40px;">${innerHtml}</td></tr>
        <tr><td class="email-footer" style="padding:30px 40px;background-color:rgba(0,0,0,0.22);text-align:center;">
          <img class="email-footer-logo" src="${logoUrl}" width="160" alt="FoundersVN" style="display:block;width:160px;max-width:62%;height:auto;margin:0 auto 14px;border:0;">
          <p style="color:rgba(242,240,232,0.66);font-size:13px;margin:0 0 10px;">Curated dinners for operators and founders</p>
          <p style="color:rgba(242,240,232,0.66);font-size:13px;margin:0 0 16px;">Contact: Matthew, event operator · ${CONTACT_PHONE}</p>
          <p style="margin:0 0 14px;">
            ${socialIcon(FACEBOOK_URL, 'facebook', 'Facebook')}
            ${socialIcon(INSTAGRAM_URL, 'instagram', 'Instagram')}
            ${socialIcon(WHATSAPP_COMMUNITY_URL, 'whatsapp', 'Join the FoundersVN WhatsApp community')}
          </p>
          <p style="color:rgba(242,240,232,0.66);font-size:13px;line-height:1.6;margin:0;">
            <a href="https://foundersvn.com" style="color:#a9bbb6;text-decoration:none;">foundersvn.com</a>
            <span aria-hidden="true"> · </span>
            <a href="mailto:support@foundersvn.com" style="color:#a9bbb6;text-decoration:none;">support@foundersvn.com</a>
          </p>
          ${footerNote ? `<p style="color:rgba(255,255,255,0.3);font-size:12px;margin:10px 0 0;">${footerNote}</p>` : ''}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function btn(href, label) {
    return `<a class="email-button" href="${escapeHtml(href)}" style="display:inline-block;background:#ff7549;color:#ffffff;text-decoration:none;padding:14px 30px;border-radius:8px;font-family:'Plus Jakarta Sans',Inter,Arial,sans-serif;font-weight:700;font-size:16px;line-height:1.35;">${label}</a>`;
}

function textBlock(value) {
    return `<p class="email-copy" style="color:#ffffff;font-size:16px;line-height:1.65;margin:0 0 16px;">${value}</p>`;
}

function textLink(href, label) {
    return `<a href="${escapeHtml(href)}" style="color:#a9bbb6;text-decoration:none;font-weight:600;">${label}</a>`;
}

function contactLineEnglish() {
    return `For any questions or assistance, please reply to this email or reach out to our event operator, Matthew (${CONTACT_PHONE}).`;
}

function contactLineVietnamese() {
    return `Mọi câu hỏi hoặc cần hỗ trợ thêm, vui lòng phản hồi email này hoặc liên hệ Matthew, event operator của FoundersVN (${CONTACT_PHONE}).`;
}

function eventBox(details = EVENT_DETAILS) {
    return `<div class="email-detail-box" style="background-color:rgba(217,255,99,0.08);border:1px solid rgba(217,255,99,0.22);border-radius:12px;padding:20px;margin:24px 0;">
      <p style="color:#d9ff63;font-size:14px;margin:0 0 12px;font-weight:700;letter-spacing:1px;">EVENT DETAILS</p>
      ${details.name ? `<p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Event:</strong> ${details.name}</p>` : ''}
      <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>When:</strong> ${details.date}</p>
      <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Where:</strong> ${details.location}</p>
      <p style="color:#ffffff;font-size:15px;margin:0;"><strong>Seat:</strong> ${details.price}</p>
    </div>`;
}

// --- Templates ---------------------------------------------------------------

// Sent to the applicant when accepted, containing the payment link.
function acceptedEmail({ firstName, payLink }) {
    const inner = `
      <h2 style="color:#d9ff63;font-size:24px;margin:0 0 20px;font-weight:700;">Your FoundersVN seat is reserved${firstName ? ', ' + firstName : ''}</h2>
      <p style="color:#ffffff;font-size:16px;line-height:1.6;margin:0 0 8px;">Great news, your application to FoundersVN has been approved. To confirm your seat, please complete your ${EVENT_DETAILS.price} payment below.</p>
      ${eventBox()}
      <p style="color:rgba(255,255,255,0.75);font-size:14px;line-height:1.6;margin:0 0 24px;">Your seat is held for <strong style="color:#fff;">48 hours</strong>. After that it is released automatically.</p>
      ${btn(payLink, 'Pay to confirm your seat →')}`;
    return { subject: "Your FoundersVN seat is reserved — confirm within 48 hours", html: shell(inner) };
}

// Sent to the applicant when approved: contains their LOGIN credentials
// (email + temporary password + login URL) AND the $150 seat payment link.
// Combines "you're approved — here's how to log in" with "pay for the dinner".
function approvedWithLoginEmail({ firstName, email, tempPassword, loginUrl, paymentUrl, airwallexUrl, sepay, expiresAt, ticketCount = 1, existingAccount = false, event = EVENT_DETAILS }) {
    const safeFirstName = escapeHtml(firstName || 'there');
    const safeEmail = escapeHtml(email);
    const safePassword = escapeHtml(tempPassword);
    const paymentAccessUrl = loginWithNextUrl(loginUrl, paymentUrl);
    const venue = venueFor(event);
    const deadline = formatHoldDeadline(expiresAt);
    const ticketPrice = event.price || EVENT_DETAILS.price;
    const eventDate = event.date || EVENT_DETAILS.date;
    const eventTime = displayEventTime(event.time);
    const seatText = ticketCount === 2 ? 'two seats' : 'a seat';
    const accountCopy = existingAccount
        ? `Your existing member account has access to this reservation. Sign in with ${safeEmail} to view payment status and your ticket.`
        : `We also created your member account so you can view your payment status, ticket, and event access.`;
    const accountCopyVietnamese = existingAccount
        ? `Tài khoản thành viên hiện tại của bạn đã được liên kết với chỗ này. Đăng nhập bằng ${safeEmail} để xem trạng thái thanh toán và vé.`
        : `FoundersVN cũng đã tạo tài khoản thành viên để bạn xem trạng thái thanh toán, vé và thông tin tham dự.`;
    const credBox = `
      <div class="email-account-box" style="background-color:rgba(255,255,255,0.06);border:1px solid rgba(217,255,99,0.22);border-radius:12px;padding:20px;margin:24px 0;">
        <p style="color:#d9ff63;font-size:14px;margin:0 0 12px;font-weight:700;letter-spacing:1px;">YOUR MEMBER LOGIN</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Email:</strong> ${safeEmail}</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Temporary password:</strong> <code style="color:#e5c464;font-size:15px;">${safePassword}</code></p>
        <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:12px 0 0;">Use this temporary password to sign in. Keep it private and change it after login.</p>
      </div>`;
    const credBoxVietnamese = `
      <div class="email-account-box" style="background-color:rgba(255,255,255,0.06);border:1px solid rgba(217,255,99,0.22);border-radius:12px;padding:20px;margin:24px 0;">
        <p style="color:#d9ff63;font-size:14px;margin:0 0 12px;font-weight:700;letter-spacing:1px;">THÔNG TIN TÀI KHOẢN THÀNH VIÊN</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Email:</strong> ${safeEmail}</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Mật khẩu tạm thời:</strong> <code style="color:#e5c464;font-size:15px;">${safePassword}</code></p>
        <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:12px 0 0;">Dùng mật khẩu tạm thời này để đăng nhập. Vui lòng giữ riêng tư và đổi mật khẩu sau khi đăng nhập.</p>
      </div>`;
    const paymentOptions = `<p style="color:rgba(255,255,255,.72);font-size:14px;line-height:1.6;margin:0 0 18px;">You can pay by international card through Airwallex with a 5% card fee, or by e-wallet / VietQR / SePay with no fee. The payment page will show the correct option for you.</p>`;
    const inner = `
      <p style="color:#d9ff63;font-size:13px;letter-spacing:1.2px;text-transform:uppercase;margin:0 0 18px;">(Tiếng Việt bên dưới)</p>
      <h2 style="color:#d9ff63;font-size:24px;margin:0 0 20px;font-weight:700;">You're approved - please complete payment, ${safeFirstName}</h2>
      ${textBlock(`Hi ${safeFirstName},`)}
      ${textBlock(`Thank you for applying to FoundersVN. You're approved. Please complete payment within 48 hours to confirm your place at our first dinner in Da Nang.`)}
      ${textBlock(`We have reserved ${seatText} for you for the next 48 hours.`)}
      <div class="email-detail-box" style="background-color:rgba(217,255,99,0.08);border:1px solid rgba(217,255,99,0.22);border-radius:12px;padding:20px;margin:24px 0;">
        <p style="color:#d9ff63;font-size:14px;margin:0 0 12px;font-weight:700;letter-spacing:1px;">FOUNDERSVN MEETUP DETAILS</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Date:</strong> ${escapeHtml(eventDate)}</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Time:</strong> ${escapeHtml(eventTime)}</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Place:</strong> ${escapeHtml(venue.name)}</p>
        ${venue.address ? `<p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Address:</strong> ${escapeHtml(venue.address)}</p>` : ''}
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Dress code:</strong> suit and tie</p>
        <p style="color:#ffffff;font-size:15px;margin:0;"><strong>Ticket:</strong> ${escapeHtml(ticketPrice)}</p>
      </div>
      ${textBlock(accountCopy)}
      ${existingAccount ? '' : credBox}
      ${textBlock(`To confirm your seat, sign in and complete payment here:`)}
      <div style="margin:0 0 20px;">${btn(paymentAccessUrl, 'Sign in and finish payment to confirm your seat')}</div>
      ${paymentOptions}
      ${textBlock(ticketCount === 2 ? 'Your reservation includes two tickets. Maximum two tickets per company.' : 'If you would like to <strong style="color:#d9ff63;">bring a co-founder, partner, or spouse</strong>, you can request one extra ticket from the payment page or reply to this email. Maximum two tickets per company.')}
      ${textBlock(`Your seat is held until ${escapeHtml(deadline)}. After that, it may open to the next guest in line.`)}
      ${textBlock(contactLineEnglish())}
      ${textBlock('We look forward to welcoming you at the table,')}
      <p style="color:#ffffff;font-size:16px;line-height:1.65;margin:0 0 28px;">FoundersVN</p>
      <hr style="border:none;border-top:1px solid rgba(217,255,99,0.18);margin:28px 0;">
      <h2 style="color:#d9ff63;font-size:22px;margin:0 0 20px;font-weight:700;">Bạn đã được duyệt - vui lòng thanh toán, ${safeFirstName}</h2>
      ${textBlock(`Chào ${safeFirstName},`)}
      ${textBlock('Cảm ơn bạn đã đăng ký FoundersVN. Hồ sơ của bạn đã được duyệt, và FoundersVN rất hân hạnh xác nhận chỗ của bạn cho buổi gặp mặt đầu tiên tại Đà Nẵng.')}
      ${textBlock(`FoundersVN đã giữ riêng ${ticketCount === 2 ? 'hai chỗ' : 'một chỗ'} cho bạn trong 48 giờ.`)}
      <div class="email-detail-box" style="background-color:rgba(217,255,99,0.08);border:1px solid rgba(217,255,99,0.22);border-radius:12px;padding:20px;margin:24px 0;">
        <p style="color:#d9ff63;font-size:14px;margin:0 0 12px;font-weight:700;letter-spacing:1px;">THÔNG TIN BUỔI GẶP MẶT FOUNDERSVN</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Ngày:</strong> ${escapeHtml(eventDate)}</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Giờ:</strong> ${escapeHtml(eventTime)}</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Địa điểm:</strong> ${escapeHtml(venue.name)}</p>
        ${venue.address ? `<p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Địa chỉ:</strong> ${escapeHtml(venue.address)}</p>` : ''}
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Trang phục:</strong> suit and tie</p>
        <p style="color:#ffffff;font-size:15px;margin:0;"><strong>Vé:</strong> ${escapeHtml(ticketPrice)}</p>
      </div>
      ${textBlock(accountCopyVietnamese)}
      ${existingAccount ? '' : credBoxVietnamese}
      ${textBlock('Để xác nhận chỗ, vui lòng đăng nhập và hoàn tất thanh toán tại đây:')}
      <div style="margin:0 0 20px;">${btn(paymentAccessUrl, 'Đăng nhập và hoàn tất thanh toán để xác nhận chỗ')}</div>
      ${textBlock('Bạn có thể thanh toán bằng thẻ quốc tế qua Airwallex với 5% phí thẻ, hoặc bằng ví điện tử / VietQR / SePay không mất phí. Trang thanh toán sẽ hiển thị lựa chọn phù hợp cho bạn.')}
      ${textBlock(ticketCount === 2 ? 'Đơn đăng ký của bạn hiện bao gồm hai vé. Tối đa hai vé cho một công ty.' : 'Trong trường hợp bạn muốn <strong style="color:#d9ff63;">đi cùng co-founder, partner, hoặc vợ/chồng</strong>, bạn có thể yêu cầu thêm một vé tại trang thanh toán hoặc phản hồi email này. Tối đa hai vé cho một công ty.')}
      ${textBlock(`Chỗ của bạn được giữ đến ${escapeHtml(deadline)}. Sau thời gian này, chỗ có thể được nhường cho vị khách kế tiếp trong danh sách.`)}
      ${textBlock(contactLineVietnamese())}
      <p style="color:#ffffff;font-size:16px;line-height:1.65;margin:0;">FoundersVN rất mong được đón bạn tại buổi gặp mặt,<br>FoundersVN</p>
      `;
    return {
        subject: `You're approved for FoundersVN - please pay within 48 hours, ${firstName || ''} | Bạn đã được duyệt - vui lòng thanh toán trong 48 giờ, ${firstName || ''}`.trim(),
        html: shell(inner)
    };
}

function declinedApplicationEmail({ firstName }) {
    const safeFirstName = escapeHtml(firstName || 'there');
    const inner = `
      <p style="color:#d9ff63;font-size:13px;letter-spacing:1.2px;text-transform:uppercase;margin:0 0 18px;">(Tiếng Việt bên dưới)</p>
      <h2 style="color:#d9ff63;font-size:24px;margin:0 0 20px;font-weight:700;">Thank you for applying, ${safeFirstName}</h2>
      ${textBlock(`Hi ${safeFirstName},`)}
      ${textBlock('Thank you for your interest in FoundersVN. You selected that you are not willing to pay the event entrance fee if approved, so this application will not proceed.')}
      ${textBlock('We appreciate the time you took to apply and wish you continued success as you grow your company.')}
      <hr style="border:none;border-top:1px solid rgba(217,255,99,0.18);margin:28px 0;">
      <h2 style="color:#d9ff63;font-size:22px;margin:0 0 20px;font-weight:700;">Cảm ơn bạn đã đăng ký, ${safeFirstName}</h2>
      ${textBlock(`Chào ${safeFirstName},`)}
      ${textBlock('Cảm ơn bạn đã quan tâm đến FoundersVN. Bạn đã chọn chưa sẵn sàng thanh toán phí tham dự nếu được duyệt, vì vậy hồ sơ này sẽ không được tiếp tục xét duyệt.')}
      ${textBlock('Cảm ơn bạn đã dành thời gian đăng ký. Chúc bạn tiếp tục gặt hái nhiều thành công trong quá trình phát triển công ty.')}`;
    return {
        subject: 'Your FoundersVN application | Kết quả đăng ký FoundersVN',
        html: shell(inner)
    };
}

function applicationReceivedEmail({ firstName }) {
    const safeFirstName = escapeHtml(firstName || 'there');
    const inner = `
      <p style="color:#d9ff63;font-size:13px;letter-spacing:1.2px;text-transform:uppercase;margin:0 0 18px;">(Tiếng Việt bên dưới)</p>
      <h2 style="color:#d9ff63;font-size:24px;margin:0 0 20px;font-weight:700;">We received your application, ${safeFirstName}</h2>
      ${textBlock(`Hi ${safeFirstName},`)}
      ${textBlock('Thank you for applying to FoundersVN and confirming that you are willing to pay the event entrance fee if approved.')}
      ${textBlock('Your application is now with our team for review. We will email you with the result and disclose the entrance fee if your application is approved.')}
      <hr style="border:none;border-top:1px solid rgba(217,255,99,0.18);margin:28px 0;">
      <h2 style="color:#d9ff63;font-size:22px;margin:0 0 20px;font-weight:700;">Chúng tôi đã nhận hồ sơ của bạn, ${safeFirstName}</h2>
      ${textBlock(`Chào ${safeFirstName},`)}
      ${textBlock('Cảm ơn bạn đã đăng ký FoundersVN và xác nhận sẵn sàng thanh toán phí tham dự nếu được duyệt.')}
      ${textBlock('Đội ngũ FoundersVN sẽ xem xét hồ sơ và gửi kết quả qua email. Phí tham dự sẽ được thông báo nếu hồ sơ của bạn được duyệt.')}`;
    return {
        subject: 'We received your FoundersVN application | Đã nhận hồ sơ FoundersVN',
        html: shell(inner)
    };
}

// Payment reminders: first at ~24h remaining, final at ~6h remaining.
function reminderEmail({ firstName, paymentUrl, hoursLeft = 24, reminderKind = 'initial', event = EVENT_DETAILS }) {
    const safeFirstName = escapeHtml(firstName || '');
    const paymentAccessUrl = loginWithNextUrl(`${publicBaseUrl()}/login`, paymentUrl);
    const eventDate = event.date || EVENT_DETAILS.date;
    const eventTime = displayEventTime(event.time);
    const venue = venueFor(event);
    const ticketPrice = event.price || EVENT_DETAILS.price;
    const numericHoursLeft = Math.max(1, Math.ceil(Number(hoursLeft || 24)));
    const isFinal = reminderKind === 'final' || numericHoursLeft <= 6;
    const englishTitle = isFinal
        ? `${numericHoursLeft} hours left to complete your FoundersVN reservation`
        : 'One day left to complete your FoundersVN reservation';
    const vietnameseTitle = isFinal
        ? `Chỉ còn ${numericHoursLeft} giờ để hoàn tất việc đặt chỗ`
        : 'Chỉ còn 1 ngày để hoàn tất việc đặt chỗ';
    const englishIntro = isFinal
        ? `Your FoundersVN seat hold expires in about ${numericHoursLeft} hours. Please sign in and complete payment now to keep your seat.`
        : 'We will hold your FoundersVN seat for one more day. Please sign in and complete payment before the reservation window closes.';
    const vietnameseIntro = isFinal
        ? `Chỗ của bạn tại FoundersVN sẽ hết hạn trong khoảng ${numericHoursLeft} giờ nữa. Vui lòng đăng nhập và hoàn tất thanh toán ngay để giữ chỗ.`
        : 'FoundersVN sẽ giữ chỗ cho bạn thêm 1 ngày. Vui lòng đăng nhập và hoàn tất thanh toán trước khi thời hạn đặt chỗ kết thúc.';
    const subject = isFinal
        ? `${numericHoursLeft} hours left to complete your FoundersVN reservation | Chỉ còn ${numericHoursLeft} giờ để hoàn tất việc đặt chỗ tại FoundersVN`
        : 'One day left to complete your FoundersVN reservation | Chỉ còn 1 ngày để hoàn tất việc đặt chỗ tại FoundersVN';
    const inner = `
      <p style="color:#d9ff63;font-size:13px;letter-spacing:1.2px;text-transform:uppercase;margin:0 0 18px;">(Tiếng Việt bên dưới)</p>
      <h2 style="color:#d9ff63;font-size:24px;margin:0 0 20px;font-weight:700;">${escapeHtml(englishTitle)}${safeFirstName ? `, ${safeFirstName}` : ''}</h2>
      ${textBlock(`Hi${safeFirstName ? ` ${safeFirstName}` : ''},`)}
      ${textBlock(escapeHtml(englishIntro))}
      <div class="email-detail-box" style="background-color:rgba(217,255,99,0.08);border:1px solid rgba(217,255,99,0.22);border-radius:12px;padding:20px;margin:24px 0;">
        <p style="color:#d9ff63;font-size:14px;margin:0 0 12px;font-weight:700;letter-spacing:1px;">FOUNDERSVN MEETUP DETAILS</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Date:</strong> ${escapeHtml(eventDate)}</p>
        ${eventTime ? `<p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Time:</strong> ${escapeHtml(eventTime)}</p>` : ''}
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Place:</strong> ${escapeHtml(venue.name)}</p>
        ${venue.address ? `<p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Address:</strong> ${escapeHtml(venue.address)}</p>` : ''}
        <p style="color:#ffffff;font-size:15px;margin:0;"><strong>Ticket:</strong> ${escapeHtml(ticketPrice)}</p>
      </div>
      <div style="margin:0 0 24px;">${btn(paymentAccessUrl, 'Sign in and finish payment to confirm your seat')}</div>
      ${textBlock(contactLineEnglish())}
      <hr style="border:none;border-top:1px solid rgba(217,255,99,0.18);margin:28px 0;">
      <h2 style="color:#d9ff63;font-size:22px;margin:0 0 20px;font-weight:700;">${escapeHtml(vietnameseTitle)}${safeFirstName ? `, ${safeFirstName}` : ''}</h2>
      ${textBlock(`Chào${safeFirstName ? ` ${safeFirstName}` : ''},`)}
      ${textBlock(escapeHtml(vietnameseIntro))}
      <div class="email-detail-box" style="background-color:rgba(217,255,99,0.08);border:1px solid rgba(217,255,99,0.22);border-radius:12px;padding:20px;margin:24px 0;">
        <p style="color:#d9ff63;font-size:14px;margin:0 0 12px;font-weight:700;letter-spacing:1px;">THÔNG TIN BUỔI GẶP MẶT FOUNDERSVN</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Ngày:</strong> ${escapeHtml(eventDate)}</p>
        ${eventTime ? `<p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Giờ:</strong> ${escapeHtml(eventTime)}</p>` : ''}
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Địa điểm:</strong> ${escapeHtml(venue.name)}</p>
        ${venue.address ? `<p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Địa chỉ:</strong> ${escapeHtml(venue.address)}</p>` : ''}
        <p style="color:#ffffff;font-size:15px;margin:0;"><strong>Vé:</strong> ${escapeHtml(ticketPrice)}</p>
      </div>
      <div style="margin:0 0 24px;">${btn(paymentAccessUrl, 'Đăng nhập và hoàn tất thanh toán để xác nhận chỗ')}</div>
      ${textBlock(contactLineVietnamese())}`;
    return {
        subject,
        html: shell(inner)
    };
}

// Final "seat released" email at expiry (day 7).
function expiredEmail({ firstName, existingAccount = false, event = EVENT_DETAILS }) {
    const safeFirstName = escapeHtml(firstName || '');
    const accountStatusEnglish = existingAccount
        ? 'Your existing member account is unchanged.'
        : 'The temporary account created for this reservation has been locked.';
    const accountStatusVietnamese = existingAccount
        ? 'Tài khoản thành viên hiện tại của bạn không bị thay đổi.'
        : 'Tài khoản tạm thời được tạo cho chỗ này đã được khóa.';
    const inner = `
      <p style="color:#d9ff63;font-size:13px;letter-spacing:1.2px;text-transform:uppercase;margin:0 0 18px;">(Tiếng Việt bên dưới)</p>
      <h2 style="color:#d9ff63;font-size:24px;margin:0 0 20px;font-weight:700;">Your FoundersVN seat has been released</h2>
      ${textBlock(`Hi${safeFirstName ? ` ${safeFirstName}` : ''},`)}
      ${textBlock(`We did not receive payment within the 48-hour window, so your FoundersVN seat for ${escapeHtml(event.date)} in ${escapeHtml(event.location)} has been released. ${accountStatusEnglish}`)}
      ${textBlock('If you would still like to join, please reply to this email or re-apply and we will check whether a seat is still available.')}
      ${textBlock(contactLineEnglish())}
      <hr style="border:none;border-top:1px solid rgba(217,255,99,0.18);margin:28px 0;">
      <h2 style="color:#d9ff63;font-size:22px;margin:0 0 20px;font-weight:700;">Chỗ của bạn tại FoundersVN đã được nhường cho khách khác</h2>
      ${textBlock(`Chào${safeFirstName ? ` ${safeFirstName}` : ''},`)}
      ${textBlock(`FoundersVN chưa nhận được thanh toán trong thời hạn 48 giờ, vì vậy chỗ của bạn cho buổi gặp mặt ngày ${escapeHtml(event.date)} tại ${escapeHtml(event.location)} đã được mở lại cho khách tiếp theo. ${accountStatusVietnamese}`)}
      ${textBlock('Nếu bạn vẫn muốn tham dự, vui lòng phản hồi email này hoặc đăng ký lại. FoundersVN sẽ kiểm tra xem còn chỗ phù hợp hay không.')}
      ${textBlock(contactLineVietnamese())}
      <div style="margin-top:26px;">${btn('https://foundersvn.com/#apply', 'Re-apply for a seat / Đăng ký lại')}</div>`;
    return {
        subject: 'Your FoundersVN seat has been released | Chỗ của bạn tại FoundersVN đã được nhường cho khách khác',
        html: shell(inner)
    };
}

function passwordResetEmail({ firstName, resetUrl, expiresMinutes = 60 }) {
    const safeFirstName = escapeHtml(firstName || 'there');
    const safeMinutes = Number(expiresMinutes || 60);
    const inner = `
      <p style="color:#d9ff63;font-size:13px;letter-spacing:1.2px;text-transform:uppercase;margin:0 0 18px;">(Tiếng Việt bên dưới)</p>
      <h2 style="color:#d9ff63;font-size:24px;margin:0 0 20px;font-weight:700;">Reset your FoundersVN password</h2>
      ${textBlock(`Hi ${safeFirstName},`)}
      ${textBlock(`We received a request to reset the password for your FoundersVN account. This link expires in ${safeMinutes} minutes.`)}
      <div style="margin:0 0 24px;">${btn(resetUrl, 'Reset password')}</div>
      <p style="color:rgba(255,255,255,0.7);font-size:14px;line-height:1.6;margin:0 0 18px;overflow-wrap:anywhere;">If the button does not work, copy and paste this link into your browser:<br><a href="${escapeHtml(resetUrl)}" style="color:#a9bbb6;text-decoration:none;">${escapeHtml(resetUrl)}</a></p>
      ${textBlock('If you did not request this, you can ignore this email. Your password will stay unchanged.')}
      <hr style="border:none;border-top:1px solid rgba(217,255,99,0.18);margin:28px 0;">
      <h2 style="color:#d9ff63;font-size:22px;margin:0 0 20px;font-weight:700;">Đặt lại mật khẩu FoundersVN</h2>
      ${textBlock(`Chào ${safeFirstName},`)}
      ${textBlock(`FoundersVN nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Đường dẫn này sẽ hết hạn sau ${safeMinutes} phút.`)}
      <div style="margin:0 0 24px;">${btn(resetUrl, 'Đặt lại mật khẩu')}</div>
      ${textBlock('Nếu bạn không yêu cầu đặt lại mật khẩu, bạn có thể bỏ qua email này. Mật khẩu hiện tại sẽ không thay đổi.')}`;
    return {
        subject: 'Reset your FoundersVN password | Đặt lại mật khẩu FoundersVN',
        html: shell(inner)
    };
}

function paymentConfirmedEmail({
    firstName,
    email,
    mealUrl,
    appUrl,
    profileUrl,
    receiptUrl,
    paymentMethod,
    ticketCount = 1,
    event = EVENT_DETAILS
}) {
    const safeFirstName = escapeHtml(firstName || 'there');
    const eventName = event.name || 'FoundersVN';
    const eventDate = event.date || EVENT_DETAILS.date;
    const eventTime = displayEventTime(event.time);
    const venue = venueFor(event);
    const accountUrl = appUrl || `${process.env.URL || 'https://foundersvn.com'}/login`;
    const memberProfileUrl = profileUrl || `${process.env.URL || 'https://foundersvn.com'}/profile`;
    const safeEmail = escapeHtml(email || '');
    const method = paymentMethod || 'Confirmed payment';
    const inner = `
      <p style="color:#d9ff63;font-size:13px;letter-spacing:1.2px;text-transform:uppercase;margin:0 0 18px;">(Tiếng Việt bên dưới)</p>
      <h2 style="color:#d9ff63;font-size:24px;margin:0 0 20px;font-weight:700;">You are confirmed, ${safeFirstName}. Welcome to FoundersVN</h2>
      ${textBlock(`Hi ${safeFirstName},`)}
      ${textBlock('Your payment has been received and your seat is confirmed. We look forward to welcoming you at FoundersVN.')}
      <div class="email-detail-box" style="background-color:rgba(217,255,99,0.08);border:1px solid rgba(217,255,99,0.22);border-radius:12px;padding:20px;margin:24px 0;">
        <p style="color:#d9ff63;font-size:14px;margin:0 0 12px;font-weight:700;letter-spacing:1px;">FOUNDERSVN MEETUP DETAILS</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Event:</strong> ${escapeHtml(eventName)}</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Date:</strong> ${escapeHtml(eventDate)}</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Time:</strong> ${escapeHtml(eventTime)}</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Place:</strong> ${escapeHtml(venue.name)}</p>
        ${venue.address ? `<p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Address:</strong> ${escapeHtml(venue.address)}</p>` : ''}
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Payment method:</strong> ${escapeHtml(method)}</p>
        <p style="color:#ffffff;font-size:15px;margin:0;"><strong>Receipt:</strong> ${receiptUrl ? textLink(receiptUrl, 'View receipt') : 'Available in your account'}</p>
      </div>
      ${textBlock('To help us prepare a thoughtful experience for you, please complete the setup steps below before the FoundersVN meetup.')}
      <div style="background-color:rgba(242,201,76,0.1);border:1px solid rgba(242,201,76,0.35);border-radius:12px;padding:18px 20px;margin:0 0 20px;">
        <p style="color:#f2c94c;font-size:13px;margin:0 0 7px;font-weight:700;letter-spacing:1px;">750,000 VND FOOD CREDIT</p>
        <p style="color:#ffffff;font-size:15px;line-height:1.6;margin:0;">Choose anything you like from the restaurant menu with your included credit (about $30). If you spend more, the remaining balance is due at the restaurant by cash or Vietnamese QR code.</p>
      </div>
      <div style="margin:0 0 26px;">${btn(mealUrl, ticketCount === 2 ? 'Choose meal options' : 'Choose meal option')}</div>
      ${textBlock('1. Set up your profile in the app')}
      <p style="color:rgba(255,255,255,0.76);font-size:15px;line-height:1.6;margin:0 0 20px;">The attendee directory helps guests understand who they will meet before arrival, so please take a few minutes to complete your profile.<br>${textLink(accountUrl, 'Sign in to your FoundersVN account')}${safeEmail ? `<br>Email: ${safeEmail}` : ''}<br>${textLink(memberProfileUrl, 'Complete your member profile')}</p>
      ${textBlock(contactLineEnglish())}
      <p style="color:#ffffff;font-size:16px;line-height:1.65;margin:0 0 28px;">See you soon,<br>FoundersVN</p>
      <hr style="border:none;border-top:1px solid rgba(217,255,99,0.18);margin:28px 0;">
      <h2 style="color:#d9ff63;font-size:22px;margin:0 0 20px;font-weight:700;">Đã xác nhận, ${safeFirstName}. Chào mừng bạn đến FoundersVN</h2>
      ${textBlock(`Chào ${safeFirstName},`)}
      ${textBlock('FoundersVN đã nhận được thanh toán và chỗ của bạn đã được xác nhận. Rất hân hạnh được đón bạn tại bàn tiệc.')}
      <div class="email-detail-box" style="background-color:rgba(217,255,99,0.08);border:1px solid rgba(217,255,99,0.22);border-radius:12px;padding:20px;margin:24px 0;">
        <p style="color:#d9ff63;font-size:14px;margin:0 0 12px;font-weight:700;letter-spacing:1px;">THÔNG TIN BUỔI GẶP MẶT FOUNDERSVN</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Sự kiện:</strong> ${escapeHtml(eventName)}</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Ngày:</strong> ${escapeHtml(eventDate)}</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Giờ:</strong> ${escapeHtml(eventTime)}</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Địa điểm:</strong> ${escapeHtml(venue.name)}</p>
        ${venue.address ? `<p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Địa chỉ:</strong> ${escapeHtml(venue.address)}</p>` : ''}
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Phương thức thanh toán:</strong> ${escapeHtml(method)}</p>
        <p style="color:#ffffff;font-size:15px;margin:0;"><strong>Biên nhận:</strong> ${receiptUrl ? textLink(receiptUrl, 'Xem biên nhận') : 'Có trong tài khoản của bạn'}</p>
      </div>
      ${textBlock('Để FoundersVN chuẩn bị chu đáo nhất cho buổi gặp mặt, bạn vui lòng hoàn tất các bước dưới đây:')}
      <div style="background-color:rgba(242,201,76,0.1);border:1px solid rgba(242,201,76,0.35);border-radius:12px;padding:18px 20px;margin:0 0 20px;">
        <p style="color:#f2c94c;font-size:13px;margin:0 0 7px;font-weight:700;letter-spacing:1px;">750.000 VND TÍN DỤNG ĐỒ ĂN</p>
        <p style="color:#ffffff;font-size:15px;line-height:1.6;margin:0;">Bạn có thể chọn bất kỳ món nào trong thực đơn. Nếu tổng đơn vượt quá phần tín dụng đã bao gồm, số dư còn lại sẽ được thanh toán tại nhà hàng bằng tiền mặt hoặc mã QR Việt Nam.</p>
      </div>
      <div style="margin:0 0 26px;">${btn(mealUrl, ticketCount === 2 ? 'Chọn món ăn' : 'Chọn món ăn')}</div>
      ${textBlock('1. Thiết lập hồ sơ trên app')}
      <p style="color:rgba(255,255,255,0.76);font-size:15px;line-height:1.6;margin:0 0 20px;">Trong app, bạn sẽ thấy mục danh sách khách mời. Đây là nơi mọi người có thể xem ai sẽ tham dự, biết bạn là ai, và bắt đầu cuộc trò chuyện tự nhiên hơn trước khi gặp trực tiếp.<br>${textLink(accountUrl, 'Đăng nhập tài khoản FoundersVN')}${safeEmail ? `<br>Email: ${safeEmail}` : ''}<br>${textLink(memberProfileUrl, 'Hoàn tất hồ sơ thành viên')}</p>
      ${textBlock(contactLineVietnamese())}
      <p style="color:#ffffff;font-size:16px;line-height:1.65;margin:0;">Hẹn gặp bạn,<br>FoundersVN</p>`;
    return {
        subject: `You are confirmed, ${firstName || ''}. Welcome to FoundersVN | Đã xác nhận, ${firstName || ''}. Chào mừng bạn đến FoundersVN`.trim(),
        html: shell(inner)
    };
}

// Sent to organisers when a new application arrives.
function notificationEmail({ app, adminUrl }) {
    const row = (label, val) => `<tr><td style="padding:6px 12px;color:#d9ff63;font-size:13px;white-space:nowrap;vertical-align:top;">${label}</td><td style="padding:6px 12px;color:#fff;font-size:14px;">${val || '—'}</td></tr>`;
    const inner = `
      <h2 style="color:#d9ff63;font-size:22px;margin:0 0 16px;font-weight:700;">New application — ${app.first_name || ''} ${app.last_name || ''}</h2>
      <table class="admin-table" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
        ${row('Name', `${app.first_name || ''} ${app.last_name || ''}`)}
        ${row('Email', app.email)}
        ${row('Company', app.company)}
        ${row('Role', app.role)}
        ${row('Company link', app.company_link)}
        ${row('Industry', app.industry)}
        ${row('Looking for', app.looking_for)}
        ${row('Can offer', app.can_offer)}
        ${row('Building', app.what_you_do)}
        ${row('Annual revenue', app.revenue)}
        ${row('Willing to pay event fee', app.fee_willingness == null ? null : app.fee_willingness ? 'Yes - manual review' : 'No')}
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
    declinedApplicationEmail,
    applicationReceivedEmail,
    reminderEmail,
    expiredEmail,
    passwordResetEmail,
    paymentConfirmedEmail,
    notificationEmail
};
