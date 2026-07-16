'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { callFunction, db, formatDate } from '@/lib/api';
import { useLanguage } from './LanguageProvider';

const CHIP_GROUPS = {
    industry: [['tech', 'Tech / SaaS', 'Công nghệ / SaaS'], ['ecom', 'E-commerce', 'Thương mại điện tử'], ['agency', 'Agency / Services', 'Agency / Dịch vụ'], ['fnb', 'F&B / Hospitality', 'F&B / Nhà hàng'], ['retail', 'Retail / Consumer', 'Bán lẻ / Tiêu dùng'], ['mfg', 'Manufacturing', 'Sản xuất'], ['finance', 'Finance', 'Tài chính'], ['media', 'Media / Creative', 'Truyền thông / Sáng tạo'], ['other', 'Other', 'Khác']],
    looking: [['invest', 'Investment', 'Gọi vốn / Đầu tư'], ['customers', 'Customers / Clients', 'Khách hàng'], ['talent', 'Talent / Hiring', 'Tuyển người'], ['partners', 'Partnerships', 'Đối tác'], ['suppliers', 'Suppliers', 'Nhà cung cấp'], ['mentor', 'Mentorship / Advice', 'Cố vấn / Lời khuyên'], ['other', 'Other', 'Khác']],
    offer: [['expertise', 'Expertise / Advice', 'Chuyên môn / Tư vấn'], ['intros', 'Introductions', 'Kết nối / Giới thiệu'], ['capital', 'Investment', 'Đầu tư'], ['hiring', 'Hiring / Jobs', 'Tuyển dụng / Việc làm'], ['partnership', 'Partnership', 'Hợp tác'], ['feedback', 'Product feedback', 'Góp ý sản phẩm'], ['other', 'Other', 'Khác']]
};

const FORM_COPY = {
    en: {
        name: 'Full name',
        email: 'Work email',
        company: 'Company / project',
        role: 'Your role',
        rolePlaceholder: 'Founder, CEO, Co-founder',
        chooseEvent: 'Choose an event',
        companyLink: 'Company website or LinkedIn',
        tickets: 'How many tickets?',
        ticketOne: '1 ticket',
        ticketOneHint: 'For me',
        ticketTwo: '2 tickets',
        ticketTwoHint: 'Me + partner / co-founder · same price per ticket',
        guestName: 'Partner / co-founder full name',
        groups: { industry: 'Your industry', looking: 'What are you looking for?', offer: 'What can you offer?' },
        hint: 'tap all that apply',
        otherIndustry: 'Which industry?',
        other: 'Tell us more',
        what: 'In one line, what are you building?',
        links: 'Your WhatsApp / Zalo number',
        linksPlaceholder: '+84 901 234 567',
        language: 'Which language are you most comfortable using at the event?',
        vi: 'Vietnamese',
        en: 'English',
        both: 'Both are fine',
        submit: 'Submit',
        sending: 'Sending application…',
        privacy: 'Your answers are only used to curate the room and are never shared publicly without your consent.',
        chooseEventError: 'Please choose an event.',
        chipError: group => `Please select at least one option for ${group}.`,
        chipLabels: { industry: 'your industry', looking: 'what you are looking for', offer: 'what you can offer' },
        success: 'Application received. We’ll review it and email you with the next step.'
    },
    vi: {
        name: 'Họ và tên',
        email: 'Email công việc',
        company: 'Công ty / dự án',
        role: 'Vai trò của bạn',
        rolePlaceholder: 'Founder, CEO, Co-founder',
        chooseEvent: 'Chọn sự kiện',
        companyLink: 'Website công ty hoặc LinkedIn',
        tickets: 'Số lượng vé?',
        ticketOne: '1 vé',
        ticketOneHint: 'Cho tôi',
        ticketTwo: '2 vé',
        ticketTwoHint: 'Tôi + partner / co-founder · cùng giá mỗi vé',
        guestName: 'Họ tên partner / co-founder',
        groups: { industry: 'Ngành của bạn', looking: 'Bạn đang tìm gì?', offer: 'Bạn có thể đóng góp gì?' },
        hint: 'chạm vào các mục phù hợp',
        otherIndustry: 'Ngành nào?',
        other: 'Cho chúng tôi biết thêm',
        what: 'Một câu: bạn đang xây gì?',
        links: 'Số WhatsApp / Zalo của bạn',
        linksPlaceholder: '+84 901 234 567',
        language: 'Bạn muốn dùng ngôn ngữ nào trong sự kiện?',
        vi: 'Tiếng Việt',
        en: 'Tiếng Anh',
        both: 'Cả hai đều ổn',
        submit: 'Gửi đăng ký',
        sending: 'Đang gửi đăng ký…',
        privacy: 'Thông tin của bạn chỉ được dùng để lựa chọn và kết nối người tham dự, không chia sẻ công khai khi chưa có sự đồng ý.',
        chooseEventError: 'Vui lòng chọn sự kiện.',
        chipError: group => `Vui lòng chọn ít nhất một mục cho ${group}.`,
        chipLabels: { industry: 'ngành của bạn', looking: 'nhu cầu kết nối của bạn', offer: 'giá trị bạn có thể đóng góp' },
        success: 'Đã nhận đăng ký. Đội ngũ FoundersVN sẽ xem xét và email bước tiếp theo cho bạn.'
    }
};

export default function ApplicationForm({ initialEvent, legacy = false, hideEventPicker = false }) {
    const { language } = useLanguage();
    const copy = FORM_COPY[language] || FORM_COPY.en;
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
            setStatus({ type: 'error', message: copy.chooseEventError });
            return;
        }
        const missingChipGroup = Object.keys(CHIP_GROUPS).find(group => chips[group].length === 0);
        if (missingChipGroup) {
            setStatus({ type: 'error', message: copy.chipError(copy.chipLabels[missingChipGroup]) });
            return;
        }
        setBusy(true);
        try {
            const payload = Object.fromEntries(form.entries());
            const withOther = (group, otherName) => [
                ...chips[group]
                    .filter(value => value !== 'other')
                    .map(value => CHIP_GROUPS[group].find(item => item[0] === value)?.[1] || value),
                ...(chips[group].includes('other') && payload[otherName] ? [payload[otherName]] : [])
            ].join(', ');
            payload.industry = withOther('industry', 'industry_other');
            payload.looking_for = withOther('looking', 'looking_other');
            payload.can_offer = withOther('offer', 'offer_other');
            payload.page_language = language;
            await callFunction('submit-application', payload, { token: null });
            formElement.reset();
            setChips({ industry: [], looking: [], offer: [] });
            setTicketCount('1');
            setStatus({ type: 'success', message: copy.success });
        } catch (error) {
            setStatus({ type: 'error', message: error.message });
        } finally {
            setBusy(false);
        }
    }

    return (
        <form className="panel form-grid" onSubmit={submit}>
            <div className="field"><label htmlFor="name">{copy.name}</label><input id="name" name="name" autoComplete="name" required /></div>
            <div className="field"><label htmlFor="email">{copy.email}</label><input id="email" name="email" type="email" autoComplete="email" required /></div>
            <div className="field"><label htmlFor="company">{copy.company}</label><input id="company" name="company" autoComplete="organization" required /></div>
            <div className="field"><label htmlFor="role">{copy.role}</label><input id="role" name="role" placeholder={copy.rolePlaceholder} required /></div>
            <div className="field full">
                {hideEventPicker ? <input type="hidden" id="event_slug" name="event_slug" value={selectedEvent} /> : <>
                    <label htmlFor="event_slug">{copy.chooseEvent}</label>
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
            <div className="field full"><label htmlFor="company_link">{copy.companyLink}</label><input id="company_link" name="company_link" type="url" inputMode="url" placeholder="https://…" pattern="https?://.+" title="Please enter a valid link starting with http:// or https://" required /></div>
            <div className="field full ticket-count-field">
                <label>{copy.tickets}</label>
                <div className="ticket-count-options" role="radiogroup" aria-label="Ticket quantity">
                    <label className={ticketCount === '1' ? 'selected' : ''}><input type="radio" name="ticket_count" value="1" checked={ticketCount === '1'} onChange={event => setTicketCount(event.target.value)} required />{copy.ticketOne} <span>{copy.ticketOneHint}</span></label>
                    <label className={ticketCount === '2' ? 'selected' : ''}><input type="radio" name="ticket_count" value="2" checked={ticketCount === '2'} onChange={event => setTicketCount(event.target.value)} required />{copy.ticketTwo} <span>{copy.ticketTwoHint}</span></label>
                </div>
                {ticketCount === '2' && <input name="guest_name" placeholder={copy.guestName} required />}
            </div>
            {Object.entries(CHIP_GROUPS).map(([group, values]) => <div className="field full chip-field" key={group}>
                <label>{copy.groups[group]} <span className="chip-hint">{copy.hint}</span></label>
                <div className="legacy-answer-chips" role="group" aria-required="true">{values.map(([value, en, vi]) => <button type="button" key={value} aria-pressed={chips[group].includes(value)} onClick={() => toggleChip(group, value)}>{language === 'vi' ? vi : en}</button>)}</div>
                {chips[group].includes('other') && <input name={`${group === 'offer' ? 'offer' : group}_other`} placeholder={group === 'industry' ? copy.otherIndustry : copy.other} required />}
            </div>)}
            <div className="field full"><label htmlFor="what_you_do">{copy.what}</label><input id="what_you_do" name="what_you_do" required /></div>
            <div className="field"><label htmlFor="links">{copy.links}</label><input id="links" name="links" type="tel" inputMode="tel" autoComplete="tel" placeholder={copy.linksPlaceholder} pattern="\\+?[0-9][0-9\\s().-]{7,18}" title="Please enter a valid phone number for WhatsApp or Zalo." required /></div>
            <div className="field"><label htmlFor="language">{copy.language}</label><select id="language" name="language" defaultValue="vi" required><option value="vi">{copy.vi}</option><option value="en">{copy.en}</option><option value="both">{copy.both}</option></select></div>
            {status && <div className={`form-status ${status.type} field full`}>{status.type === 'success' && <CheckCircle2 size={17} />} {status.message}</div>}
            <div className="field full"><button className="button primary submit-application" disabled={busy}>{busy ? copy.sending : <>{copy.submit} <ArrowRight size={18} /></>}</button></div>
            <p className="legacy-form-privacy field full">{copy.privacy}</p>
        </form>
    );
}
