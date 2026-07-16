// Shared Resend email helper + branded templates.
// Mirrors the Resend send pattern in send-welcome-email.js (FROM_EMAIL + RESEND_API_KEY env).

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Founders Vietnam <support@foundersvn.com>';
const { sql, isConfigured } = require('./neon');

const EVENT_DETAILS = {
    price: '$150 USD',
    location: 'Da Nang, Vietnam',
    date: 'Friday, July 31, 2026',
};

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
    const location = String(event.location || '').toLowerCase();
    if (location.includes('da nang') || location.includes('đà nẵng')) {
        return { name: 'FOR YOU SteakHouse', address: 'Da Nang, Vietnam' };
    }
    if (location.includes('ho chi minh') || location.includes('hcmc')) {
        return { name: 'Ho Chi Minh City', address: 'Ho Chi Minh City, Vietnam' };
    }
    return { name: event.location || EVENT_DETAILS.location, address: event.location || EVENT_DETAILS.location };
}

function publicBaseUrl() {
    return String(process.env.URL || 'https://foundersvn.com').replace(/\/+$/, '');
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
             email_type, status, error, metadata)
          VALUES (${providerEmailId}, ${tracking.memberId || null}, ${tracking.applicationId || null},
            ${tracking.eventId || null}, ${recipient}, ${subject}, ${tracking.type || 'transactional'},
            ${status}, ${error}, ${JSON.stringify({ mock, ...(tracking.metadata || {}) })}::jsonb)
          ON CONFLICT (provider_email_id) DO UPDATE SET
            status = EXCLUDED.status, error = EXCLUDED.error, updated_at = NOW()`;
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
            body: JSON.stringify({ from: FROM_EMAIL, to, subject, html })
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
    const logoUrl = `${publicBaseUrl()}/assets/brand/founders-vn-logo.svg`;
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#071a14;font-family:Inter,'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#071a14;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#0b2018;border:1px solid rgba(169,187,182,0.16);border-radius:18px;overflow:hidden;">
        <tr><td style="padding:34px 40px 22px;text-align:left;border-bottom:1px solid rgba(169,187,182,0.16);background:linear-gradient(135deg,#071a14 0%,#0e2a20 58%,rgba(255,117,73,0.18) 100%);">
          <img src="${logoUrl}" width="220" alt="Founders Vietnam" style="display:block;width:220px;max-width:78%;height:auto;margin:0 0 14px;filter:brightness(0) invert(1);">
          <p style="margin:0;color:#a9bbb6;font-size:13px;letter-spacing:0.08em;">Phone-free networking for founders</p>
        </td></tr>
        <tr><td style="padding:40px;">${innerHtml}</td></tr>
        <tr><td style="padding:30px 40px;background-color:rgba(0,0,0,0.22);text-align:center;">
          <p style="color:rgba(242,240,232,0.58);font-size:13px;margin:0;">Founders Vietnam — curated dinners for operators and founders</p>
          ${footerNote ? `<p style="color:rgba(255,255,255,0.3);font-size:12px;margin:10px 0 0;">${footerNote}</p>` : ''}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function btn(href, label) {
    return `<a href="${escapeHtml(href)}" style="display:inline-block;background:#ff7549;color:#ffffff;text-decoration:none;padding:14px 30px;border-radius:12px;font-weight:700;font-size:16px;">${label}</a>`;
}

function textBlock(value) {
    return `<p style="color:#ffffff;font-size:16px;line-height:1.65;margin:0 0 16px;">${value}</p>`;
}

function eventBox(details = EVENT_DETAILS) {
    return `<div style="background-color:rgba(217,255,99,0.08);border:1px solid rgba(217,255,99,0.22);border-radius:12px;padding:20px;margin:24px 0;">
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
      <h2 style="color:#c9a227;font-size:24px;margin:0 0 20px;font-weight:500;">You're in${firstName ? ', ' + firstName : ''}!</h2>
      <p style="color:#ffffff;font-size:16px;line-height:1.6;margin:0 0 8px;">Great news — your application to FoundersVN has been accepted. To confirm your seat, please complete your ${EVENT_DETAILS.price} payment below.</p>
      ${eventBox()}
      <p style="color:rgba(255,255,255,0.75);font-size:14px;line-height:1.6;margin:0 0 24px;">Your seat is held for <strong style="color:#fff;">48 hours</strong>. After that it is released automatically.</p>
      ${btn(payLink, 'Pay to confirm your seat →')}
      <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:24px 0 0;word-break:break-all;">Or paste this link into your browser:<br>${payLink}</p>`;
    return { subject: "You're in — confirm your FoundersVN seat (Da Nang, Jul 31)", html: shell(inner) };
}

// Sent to the applicant when approved: contains their LOGIN credentials
// (email + temporary password + login URL) AND the $150 seat payment link.
// Combines "you're approved — here's how to log in" with "pay for the dinner".
function approvedWithLoginEmail({ firstName, email, tempPassword, loginUrl, paymentUrl, airwallexUrl, sepay, expiresAt, ticketCount = 1, existingAccount = false, event = EVENT_DETAILS }) {
    const safeFirstName = escapeHtml(firstName || 'there');
    const safeEmail = escapeHtml(email);
    const safePassword = escapeHtml(tempPassword);
    const paymentAccessUrl = loginWithNextUrl(loginUrl, paymentUrl);
    const safePaymentUrl = escapeHtml(paymentAccessUrl);
    const safeDirectPaymentUrl = escapeHtml(paymentUrl);
    const safeLoginUrl = escapeHtml(loginUrl);
    const venue = venueFor(event);
    const deadline = formatHoldDeadline(expiresAt);
    const ticketPrice = event.price || EVENT_DETAILS.price;
    const eventDate = event.date || EVENT_DETAILS.date;
    const eventTime = displayEventTime(event.time);
    const seatText = ticketCount === 2 ? 'two seats' : 'a seat';
    const accountCopy = existingAccount
        ? `Your existing member account has access to this reservation. Sign in with ${safeEmail} to view payment status and your ticket.`
        : `We also created your member account so you can view your payment status, ticket, and event access.`;
    const credBox = `
      <div style="background-color:rgba(255,255,255,0.06);border:1px solid rgba(217,255,99,0.22);border-radius:12px;padding:20px;margin:24px 0;">
        <p style="color:#d9ff63;font-size:14px;margin:0 0 12px;font-weight:700;letter-spacing:1px;">YOUR MEMBER LOGIN</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Email:</strong> ${safeEmail}</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Temporary password:</strong> <code style="color:#e5c464;font-size:15px;">${safePassword}</code></p>
        <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:12px 0 0;">Use this temporary password to sign in. Keep it private and change it after login.</p>
      </div>`;
    const paymentOptions = `
      ${airwallexUrl ? `<p style="color:rgba(255,255,255,.72);font-size:14px;line-height:1.6;margin:0 0 10px;">International card payment is available through Airwallex. A 5% transaction fee is added and paid by the cardholder.</p>` : ''}
      ${sepay ? `<p style="color:rgba(255,255,255,.72);font-size:14px;line-height:1.6;margin:0 0 18px;">You can also pay by SePay/VietQR with no fee.<br>Bank: ${escapeHtml(sepay.bank)}<br>Account: ${escapeHtml(sepay.account)} ${sepay.accountName ? `· ${escapeHtml(sepay.accountName)}` : ''}<br>Amount: ${formatVnd(sepay.amountVnd)}<br>Transfer content: <strong style="color:#e5c464;">${escapeHtml(sepay.code)}</strong></p>` : ''}`;
    const inner = `
      <p style="color:#c9a227;font-size:13px;letter-spacing:1.2px;text-transform:uppercase;margin:0 0 18px;">(Tiếng Việt bên dưới)</p>
      <h2 style="color:#d9ff63;font-size:24px;margin:0 0 20px;font-weight:700;">You have a seat at FoundersVN, ${safeFirstName}</h2>
      ${textBlock(`Hi ${safeFirstName},`)}
      ${textBlock(`Thank you for applying to FoundersVN. We reviewed your application and would be honored to welcome you to our first dinner in Da Nang.`)}
      ${textBlock(`We have reserved ${seatText} for you for the next 48 hours.`)}
      <div style="background-color:rgba(217,255,99,0.08);border:1px solid rgba(217,255,99,0.22);border-radius:12px;padding:20px;margin:24px 0;">
        <p style="color:#d9ff63;font-size:14px;margin:0 0 12px;font-weight:700;letter-spacing:1px;">DETAILS</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Date:</strong> ${escapeHtml(eventDate)}</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Time:</strong> ${escapeHtml(eventTime)}</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Place:</strong> ${escapeHtml(venue.name)}</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Address:</strong> ${escapeHtml(venue.address)}</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Dress code:</strong> suit and tie</p>
        <p style="color:#ffffff;font-size:15px;margin:0;"><strong>Ticket:</strong> ${escapeHtml(ticketPrice)}</p>
      </div>
      ${textBlock(`To confirm your seat, sign in and complete payment here:`)}
      <div style="margin:0 0 20px;">${btn(paymentAccessUrl, 'Sign in and confirm your seat')}</div>
      <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0 0 20px;word-break:break-all;">${safePaymentUrl}</p>
      <p style="color:rgba(255,255,255,0.42);font-size:12px;margin:0 0 20px;word-break:break-all;">Direct payment page after login:<br>${safeDirectPaymentUrl}</p>
      ${paymentOptions}
      ${textBlock(ticketCount === 2 ? 'Your reservation includes two tickets. Maximum two tickets per company.' : 'If you would like to bring a co-founder, partner, or spouse, you can request one extra ticket from the payment page or reply to this email. Maximum two tickets per company.')}
      ${textBlock(`Your seat is held until ${escapeHtml(deadline)}. After that, it may open to the next guest in line.`)}
      ${textBlock(accountCopy)}
      ${existingAccount ? '' : credBox}
      <div style="margin:0 0 30px;">${btn(loginUrl, 'Log in to your account')}</div>
      ${textBlock('For any questions or assistance, please reply to this email or contact +49 1575 4444113 so FoundersVN can support you promptly.')}
      ${textBlock('We look forward to welcoming you at the table,')}
      <p style="color:#ffffff;font-size:16px;line-height:1.65;margin:0 0 28px;">FoundersVN</p>
      <hr style="border:none;border-top:1px solid rgba(217,255,99,0.18);margin:28px 0;">
      <h2 style="color:#d9ff63;font-size:22px;margin:0 0 20px;font-weight:700;">Bạn đã có một chỗ tại FoundersVN, ${safeFirstName}</h2>
      ${textBlock(`Chào ${safeFirstName},`)}
      ${textBlock('Cảm ơn bạn đã đăng ký FoundersVN. Hồ sơ của bạn đã được duyệt, và FoundersVN rất hân hạnh gửi đến bạn lời mời tham gia bữa tối đầu tiên tại Đà Nẵng.')}
      ${textBlock(`FoundersVN đã giữ riêng ${ticketCount === 2 ? 'hai chỗ' : 'một chỗ'} cho bạn trong 48 giờ.`)}
      <div style="background-color:rgba(217,255,99,0.08);border:1px solid rgba(217,255,99,0.22);border-radius:12px;padding:20px;margin:24px 0;">
        <p style="color:#d9ff63;font-size:14px;margin:0 0 12px;font-weight:700;letter-spacing:1px;">THÔNG TIN BUỔI TỐI</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Ngày:</strong> ${escapeHtml(eventDate)}</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Giờ:</strong> ${escapeHtml(eventTime)}</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Địa điểm:</strong> ${escapeHtml(venue.name)}</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Địa chỉ:</strong> ${escapeHtml(venue.address)}</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Trang phục:</strong> suit and tie</p>
        <p style="color:#ffffff;font-size:15px;margin:0;"><strong>Vé:</strong> ${escapeHtml(ticketPrice)}</p>
      </div>
      ${textBlock('Để xác nhận chỗ, vui lòng đăng nhập và hoàn tất thanh toán tại đây:')}
      <div style="margin:0 0 20px;">${btn(paymentAccessUrl, 'Đăng nhập và xác nhận chỗ')}</div>
      <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0 0 20px;word-break:break-all;">${safePaymentUrl}</p>
      ${textBlock('Đối với hình thức thanh toán quốc tế qua Airwallex, FoundersVN sẽ có phụ thu 5% phí giao dịch. Bạn cũng có thể thanh toán bằng SePay/VietQR không mất phí.')}
      ${textBlock(ticketCount === 2 ? 'Đơn đăng ký của bạn hiện bao gồm hai vé. Tối đa hai vé cho một công ty.' : 'Trong trường hợp bạn muốn đi cùng co-founder, partner, hoặc vợ/chồng, bạn có thể yêu cầu thêm một vé tại trang thanh toán hoặc phản hồi email này. Tối đa hai vé cho một công ty.')}
      ${textBlock(`Chỗ của bạn được giữ đến ${escapeHtml(deadline)}. Sau thời gian này, chỗ có thể được nhường cho vị khách kế tiếp trong danh sách.`)}
      ${textBlock('Mọi câu hỏi hoặc cần hỗ trợ thêm, vui lòng phản hồi email này hoặc liên hệ +49 1575 4444113 để FoundersVN có thể hỗ trợ bạn kịp thời.')}
      <p style="color:#ffffff;font-size:16px;line-height:1.65;margin:0;">FoundersVN rất mong được đón bạn tại bàn tiệc,<br>FoundersVN</p>
      <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:24px 0 0;word-break:break-all;">Login: ${safeLoginUrl}<br>Payment: ${safePaymentUrl}</p>`;
    return {
        subject: `You have a seat at FoundersVN, ${firstName || ''} | Bạn đã có một chỗ tại FoundersVN, ${firstName || ''}`.trim(),
        html: shell(inner)
    };
}

// One reminder, 24 hours into the 48-hour hold.
function reminderEmail({ firstName, paymentUrl, hoursLeft = 24, event = EVENT_DETAILS }) {
    const inner = `
      <h2 style="color:#c9a227;font-size:24px;margin:0 0 20px;font-weight:500;">Your seat is still waiting${firstName ? ', ' + firstName : ''}</h2>
      <p style="color:#ffffff;font-size:16px;line-height:1.6;margin:0 0 8px;">Your FoundersVN reservation has about <strong style="color:#c9a227;">${hoursLeft} hours</strong> remaining. Complete payment before the 48-hour deadline to keep your seat.</p>
      ${eventBox(event)}
      ${btn(paymentUrl, 'Confirm my seat now →')}
      <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:24px 0 0;word-break:break-all;">Payment page:<br>${escapeHtml(paymentUrl)}</p>`;
    return { subject: '24 hours left to confirm your FoundersVN seat', html: shell(inner) };
}

// Final "seat released" email at expiry (day 7).
function expiredEmail({ firstName, existingAccount = false, event = EVENT_DETAILS }) {
    const inner = `
      <h2 style="color:#c9a227;font-size:24px;margin:0 0 20px;font-weight:500;">Your seat has been released</h2>
      <p style="color:#ffffff;font-size:16px;line-height:1.6;margin:0 0 20px;">Hi${firstName ? ' ' + escapeHtml(firstName) : ''}, we didn't receive payment within the 48-hour window, so your FoundersVN seat for ${escapeHtml(event.date)} in ${escapeHtml(event.location)} has been released${existingAccount ? '. Your existing member account is unchanged.' : ' and the temporary account has been locked.'}</p>
      <p style="color:rgba(255,255,255,0.75);font-size:15px;line-height:1.6;margin:0 0 24px;">No hard feelings — if you'd still like to join, just reply to this email or re-apply and we'll do our best to find you a spot at an upcoming gathering.</p>
      ${btn('https://foundersvn.com/#apply', 'Re-apply for a seat →')}`;
    return { subject: 'Your FoundersVN seat has been released', html: shell(inner) };
}

function paymentConfirmedEmail({
    firstName,
    email,
    mealUrl,
    appUrl,
    profileUrl,
    receiptUrl,
    paymentMethod,
    communityUrl,
    ticketCount = 1,
    event = EVENT_DETAILS
}) {
    const safeFirstName = escapeHtml(firstName || 'there');
    const eventName = event.name || 'FoundersVN';
    const eventDate = event.date || EVENT_DETAILS.date;
    const eventTime = displayEventTime(event.time);
    const venue = venueFor(event);
    const safeMealUrl = escapeHtml(mealUrl);
    const safeAppUrl = escapeHtml(appUrl || `${process.env.URL || 'https://foundersvn.com'}/login`);
    const safeProfileUrl = escapeHtml(profileUrl || `${process.env.URL || 'https://foundersvn.com'}/profile`);
    const safeReceiptUrl = escapeHtml(receiptUrl || '');
    const safeCommunityUrl = escapeHtml(communityUrl || 'Community group link will be shared before the dinner.');
    const safeEmail = escapeHtml(email || '');
    const method = paymentMethod || 'Confirmed payment';
    const inner = `
      <p style="color:#c9a227;font-size:13px;letter-spacing:1.2px;text-transform:uppercase;margin:0 0 18px;">(Tiếng Việt bên dưới)</p>
      <h2 style="color:#c9a227;font-size:24px;margin:0 0 20px;font-weight:500;">You are confirmed, ${safeFirstName}. Welcome to FoundersVN</h2>
      ${textBlock(`Hi ${safeFirstName},`)}
      ${textBlock('Your payment has been received and your seat is confirmed. We look forward to welcoming you at FoundersVN.')}
      <div style="background-color:rgba(201,162,39,0.1);border:1px solid rgba(201,162,39,0.3);border-radius:8px;padding:20px;margin:24px 0;">
        <p style="color:#c9a227;font-size:14px;margin:0 0 12px;font-weight:500;letter-spacing:1px;">YOUR TICKET</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Event:</strong> ${escapeHtml(eventName)}</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Date:</strong> ${escapeHtml(eventDate)}</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Time:</strong> ${escapeHtml(eventTime)}</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Place:</strong> ${escapeHtml(venue.name)}</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Payment method:</strong> ${escapeHtml(method)}</p>
        <p style="color:#ffffff;font-size:15px;margin:0;"><strong>Receipt:</strong> ${safeReceiptUrl || 'Available in your account'}</p>
      </div>
      ${textBlock('To help us prepare a thoughtful experience for you, please complete the setup steps below before the dinner.')}
      <div style="margin:0 0 26px;">${btn(mealUrl, ticketCount === 2 ? 'Choose meal options' : 'Choose meal option')}</div>
      <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0 0 24px;word-break:break-all;">Meal selection: ${safeMealUrl}</p>
      ${textBlock('1. Join the community group')}
      <p style="color:rgba(255,255,255,0.76);font-size:15px;line-height:1.6;margin:0 0 20px;">This is where we will share event updates, guest care notes, and key information before the dinner.<br>${safeCommunityUrl}</p>
      ${textBlock('2. Set up your profile in the app')}
      <p style="color:rgba(255,255,255,0.76);font-size:15px;line-height:1.6;margin:0 0 20px;">The attendee directory helps guests understand who they will meet before arrival, so please take a few minutes to complete your profile.<br>Log in here: ${safeAppUrl}${safeEmail ? `<br>Email: ${safeEmail}` : ''}<br>Profile link: ${safeProfileUrl}</p>
      ${textBlock('For any questions or assistance, please reply to this email or contact +49 1575 4444113 so FoundersVN can support you promptly.')}
      <p style="color:#ffffff;font-size:16px;line-height:1.65;margin:0 0 28px;">See you soon,<br>FoundersVN</p>
      <hr style="border:none;border-top:1px solid rgba(201,162,39,0.24);margin:28px 0;">
      <h2 style="color:#c9a227;font-size:22px;margin:0 0 20px;font-weight:500;">Đã xác nhận, ${safeFirstName}. Chào mừng bạn đến FoundersVN</h2>
      ${textBlock(`Chào ${safeFirstName},`)}
      ${textBlock('FoundersVN đã nhận được thanh toán và chỗ của bạn đã được xác nhận. Rất hân hạnh được đón bạn tại bàn tiệc.')}
      <div style="background-color:rgba(201,162,39,0.1);border:1px solid rgba(201,162,39,0.3);border-radius:8px;padding:20px;margin:24px 0;">
        <p style="color:#c9a227;font-size:14px;margin:0 0 12px;font-weight:500;letter-spacing:1px;">THÔNG TIN VÉ CỦA BẠN</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Sự kiện:</strong> ${escapeHtml(eventName)}</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Ngày:</strong> ${escapeHtml(eventDate)}</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Giờ:</strong> ${escapeHtml(eventTime)}</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Địa điểm:</strong> ${escapeHtml(venue.name)}</p>
        <p style="color:#ffffff;font-size:15px;margin:0 0 6px;"><strong>Phương thức thanh toán:</strong> ${escapeHtml(method)}</p>
        <p style="color:#ffffff;font-size:15px;margin:0;"><strong>Biên nhận:</strong> ${safeReceiptUrl || 'Có trong tài khoản của bạn'}</p>
      </div>
      ${textBlock('Để FoundersVN chuẩn bị chu đáo nhất cho buổi tối, bạn vui lòng hoàn tất các bước dưới đây:')}
      <div style="margin:0 0 26px;">${btn(mealUrl, ticketCount === 2 ? 'Chọn món ăn' : 'Chọn món ăn')}</div>
      <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0 0 24px;word-break:break-all;">Link chọn món: ${safeMealUrl}</p>
      ${textBlock('1. Vào nhóm cộng đồng')}
      <p style="color:rgba(255,255,255,0.76);font-size:15px;line-height:1.6;margin:0 0 20px;">Đây là nơi FoundersVN cập nhật thông tin sự kiện, các lưu ý quan trọng, và giúp khách mời bắt đầu kết nối trước bữa tối.<br>${safeCommunityUrl}</p>
      ${textBlock('2. Thiết lập hồ sơ trên app')}
      <p style="color:rgba(255,255,255,0.76);font-size:15px;line-height:1.6;margin:0 0 20px;">Trong app, bạn sẽ thấy mục danh sách khách mời. Đây là nơi mọi người có thể xem ai sẽ tham dự, biết bạn là ai, và bắt đầu cuộc trò chuyện tự nhiên hơn trước khi gặp trực tiếp.<br>Đăng nhập ở đây: ${safeAppUrl}${safeEmail ? `<br>Email: ${safeEmail}` : ''}<br>Link hồ sơ: ${safeProfileUrl}</p>
      ${textBlock('Mọi câu hỏi hoặc cần hỗ trợ thêm, vui lòng phản hồi email này hoặc liên hệ +49 1575 4444113 để FoundersVN có thể hỗ trợ bạn kịp thời.')}
      <p style="color:#ffffff;font-size:16px;line-height:1.65;margin:0;">Hẹn gặp bạn,<br>FoundersVN</p>`;
    return {
        subject: `You are confirmed, ${firstName || ''}. Welcome to FoundersVN | Đã xác nhận, ${firstName || ''}. Chào mừng bạn đến FoundersVN`.trim(),
        html: shell(inner)
    };
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
    paymentConfirmedEmail,
    notificationEmail
};
