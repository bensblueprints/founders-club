'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, CheckCircle2, X } from 'lucide-react';
import { callFunction } from '@/lib/api';
import { useLanguage } from './LanguageProvider';
import revenueModel from '@/lib/application-revenue.cjs';

const { REVENUE_OPTIONS } = revenueModel;

const WHY_JOIN_OPTIONS = [
    ['network', 'Grow my network', 'Mở rộng mạng lưới'],
    ['peers', 'Meet founders and operators at my level', 'Gặp các founder và operator cùng cấp độ'],
    ['partners', 'Find partners and new opportunities', 'Tìm đối tác và cơ hội mới'],
    ['learn', 'Learn from other people building companies', 'Học hỏi từ những người đang xây dựng doanh nghiệp'],
    ['other', 'Other', 'Lý do khác']
];

const FORM_COPY = {
    en: {
        name: 'Full name',
        email: 'Work email',
        companyProfile: 'Company or LinkedIn',
        companyPlaceholder: 'Company name or linkedin.com/in/…',
        role: 'Your role',
        rolePlaceholder: 'Founder, CEO, Co-founder',
        what: 'What are you building?',
        whatPlaceholder: 'One sentence is enough',
        revenue: 'Annual company revenue',
        revenueHint: 'choose one range',
        feeQuestion: 'This event has an entrance fee. If approved, are you willing to pay it?',
        feeKicker: 'One last confirmation',
        feeBody: 'The fee amount will only be disclosed in your approval email.',
        feeCancel: 'Back to application',
        feeYes: 'Yes, I am willing to pay',
        feeNo: 'No, not at this time',
        why: 'Why would you like to join?',
        whyHint: 'choose the closest fit',
        whyOther: 'Tell us briefly',
        whyOtherPlaceholder: 'What would make this dinner valuable for you?',
        whatsapp: 'WhatsApp number',
        whatsappHint: 'Include your country code',
        submit: 'Apply for invitation',
        sending: 'Sending application…',
        noPayment: 'No payment required to apply.',
        privacy: 'Your information is only used to review your application and contact you about FoundersVN.',
        approved: 'You’re approved. Check your email to sign in and complete payment within 48 hours.',
        declined: 'Thank you for your interest. Because you selected that you are not willing to pay the event entrance fee, this application will not proceed.',
        pending: 'Application received. We’ll review it and email you with the next step.',
        exitKicker: 'Quick feedback',
        exitTitle: 'Before you go',
        exitBody: "You haven’t finished your application. What stopped you?",
        exitContinue: 'Continue application',
        exitThanks: 'Thank you. This helps us improve the experience.',
        exitReasons: [
            ['timing', 'Timing'],
            ['price', 'Price'],
            ['fit', 'Event fit'],
            ['application', 'The application'],
            ['browsing', 'Just browsing']
        ]
    },
    vi: {
        name: 'Họ và tên',
        email: 'Email công việc',
        companyProfile: 'Công ty hoặc LinkedIn',
        companyPlaceholder: 'Tên công ty hoặc linkedin.com/in/…',
        role: 'Vai trò của bạn',
        rolePlaceholder: 'Founder, CEO, Co-founder',
        what: 'Bạn đang xây dựng điều gì?',
        whatPlaceholder: 'Chỉ cần chia sẻ trong một câu',
        revenue: 'Doanh thu công ty hằng năm',
        revenueHint: 'chọn một khoảng',
        feeQuestion: 'Sự kiện này có phí tham dự. Nếu được duyệt, bạn có sẵn sàng thanh toán không?',
        feeKicker: 'Xác nhận cuối cùng',
        feeBody: 'Mức phí chỉ được thông báo trong email phê duyệt.',
        feeCancel: 'Quay lại hồ sơ',
        feeYes: 'Có, tôi sẵn sàng thanh toán',
        feeNo: 'Không, chưa phải lúc này',
        why: 'Vì sao bạn muốn tham gia?',
        whyHint: 'chọn lý do phù hợp nhất',
        whyOther: 'Chia sẻ ngắn với chúng tôi',
        whyOtherPlaceholder: 'Điều gì sẽ khiến buổi tiệc này có giá trị với bạn?',
        whatsapp: 'Số WhatsApp',
        whatsappHint: 'Bao gồm mã quốc gia',
        submit: 'Đăng ký nhận thư mời',
        sending: 'Đang gửi đăng ký…',
        noPayment: 'Không cần thanh toán khi đăng ký.',
        privacy: 'Thông tin chỉ được dùng để xét duyệt hồ sơ và liên hệ với bạn về FoundersVN.',
        approved: 'Bạn đã được duyệt. Vui lòng kiểm tra email để đăng nhập và hoàn tất thanh toán trong 48 giờ.',
        declined: 'Cảm ơn bạn đã quan tâm. Vì bạn chọn chưa sẵn sàng thanh toán phí tham dự, hồ sơ này sẽ không được tiếp tục xét duyệt.',
        pending: 'Đã nhận đăng ký. Đội ngũ FoundersVN sẽ xem xét và email bước tiếp theo cho bạn.',
        exitKicker: 'Phản hồi nhanh',
        exitTitle: 'Trước khi bạn rời đi',
        exitBody: 'Bạn chưa hoàn tất đăng ký. Điều gì khiến bạn dừng lại?',
        exitContinue: 'Tiếp tục đăng ký',
        exitThanks: 'Cảm ơn bạn. Phản hồi này giúp FoundersVN cải thiện trải nghiệm.',
        exitReasons: [
            ['timing', 'Thời gian'],
            ['price', 'Chi phí'],
            ['fit', 'Mức độ phù hợp'],
            ['application', 'Form đăng ký'],
            ['browsing', 'Chỉ đang tìm hiểu']
        ]
    }
};

export default function ApplicationForm({ initialEvent = 'danang-jul-2026' }) {
    const { language } = useLanguage();
    const copy = FORM_COPY[language] || FORM_COPY.en;
    const [status, setStatus] = useState(null);
    const [busy, setBusy] = useState(false);
    const [joinReason, setJoinReason] = useState('');
    const [revenue, setRevenue] = useState('');
    const [showFeeConfirmation, setShowFeeConfirmation] = useState(false);
    const [formStarted, setFormStarted] = useState(false);
    const [formCompleted, setFormCompleted] = useState(false);
    const [showExitSurvey, setShowExitSurvey] = useState(false);
    const [surveyAnswered, setSurveyAnswered] = useState(false);
    const formRef = useRef(null);
    const feeDecisionRef = useRef('');

    useEffect(() => {
        if (!formStarted || formCompleted || surveyAnswered) return undefined;

        const showSurvey = () => setShowExitSurvey(true);
        const handleMouseOut = event => {
            if (!event.relatedTarget && event.clientY <= 0) showSurvey();
        };
        const handleVisibility = () => {
            if (document.visibilityState === 'hidden') {
                window.sessionStorage.setItem('fvn-application-left', 'true');
            } else if (window.sessionStorage.getItem('fvn-application-left') === 'true') {
                window.sessionStorage.removeItem('fvn-application-left');
                showSurvey();
            }
        };

        document.addEventListener('mouseout', handleMouseOut);
        document.addEventListener('visibilitychange', handleVisibility);
        return () => {
            document.removeEventListener('mouseout', handleMouseOut);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [formStarted, formCompleted, surveyAnswered]);

    useEffect(() => {
        if (!showExitSurvey) return undefined;
        const handleKeyDown = event => {
            if (event.key === 'Escape') setShowExitSurvey(false);
        };
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [showExitSurvey]);

    useEffect(() => {
        if (!showFeeConfirmation) return undefined;
        const handleKeyDown = event => {
            if (event.key === 'Escape') setShowFeeConfirmation(false);
        };
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [showFeeConfirmation]);

    function recordExitReason(reason) {
        const detail = { reason, language, event: initialEvent };
        window.dataLayer?.push({ event: 'application_abandonment_reason', ...detail });
        window.dispatchEvent(new CustomEvent('foundersvn:application-abandonment', { detail }));
        window.sessionStorage.setItem('fvn-application-feedback', reason);
        setSurveyAnswered(true);
    }

    async function submit(event) {
        event.preventDefault();
        const formElement = event.currentTarget;
        setStatus(null);
        if (!formElement.reportValidity()) return;
        if (revenue === 'under-100k' && !feeDecisionRef.current) {
            setShowFeeConfirmation(true);
            return;
        }

        setBusy(true);
        try {
            const payload = Object.fromEntries(new FormData(formElement).entries());
            if (revenue === 'under-100k') payload.fee_willingness = feeDecisionRef.current;
            const selectedReason = WHY_JOIN_OPTIONS.find(option => option[0] === payload.why_join);
            payload.why_join = payload.why_join === 'other'
                ? `Other: ${payload.why_join_other}`
                : selectedReason?.[1] || payload.why_join;
            delete payload.why_join_other;
            payload.page_language = language;
            const result = await callFunction('submit-application', payload, { token: null });
            formElement.reset();
            setJoinReason('');
            setRevenue('');
            feeDecisionRef.current = '';
            setFormCompleted(true);
            setStatus({ type: 'success', message: copy[result.decision] || copy.pending });
        } catch (error) {
            setStatus({ type: 'error', message: error.message });
        } finally {
            setBusy(false);
        }
    }

    function confirmFeeWillingness(value) {
        feeDecisionRef.current = value;
        setShowFeeConfirmation(false);
        formRef.current?.requestSubmit();
    }

    return <>
        <form ref={formRef} className="panel form-grid application-short-form" onSubmit={submit} onChange={() => setFormStarted(true)}>
            <input type="hidden" name="event_slug" value={initialEvent} />
            <div className="field"><label htmlFor="name">{copy.name}</label><input id="name" name="name" autoComplete="name" required /></div>
            <div className="field"><label htmlFor="email">{copy.email}</label><input id="email" name="email" type="email" autoComplete="email" required /></div>
            <div className="field full"><label htmlFor="company_profile">{copy.companyProfile}</label><input id="company_profile" name="company_profile" placeholder={copy.companyPlaceholder} required /></div>
            <div className="field full"><label htmlFor="role">{copy.role}</label><input id="role" name="role" placeholder={copy.rolePlaceholder} autoComplete="organization-title" required /></div>
            <div className="field full"><label htmlFor="what_you_do">{copy.what}</label><textarea id="what_you_do" name="what_you_do" placeholder={copy.whatPlaceholder} rows="3" required /></div>
            <fieldset className="field full quick-choice-field revenue-choice-field">
                <legend>{copy.revenue} <span>{copy.revenueHint}</span></legend>
                <div className="quick-choice-options revenue-choice-options">
                    {REVENUE_OPTIONS.map(option => <label className={revenue === option.value ? 'selected' : ''} key={option.value}>
                        <input type="radio" name="revenue" value={option.value} checked={revenue === option.value} onChange={() => { setRevenue(option.value); feeDecisionRef.current = ''; setShowFeeConfirmation(false); }} required />
                        <span>{language === 'vi' ? option.labelVi : option.label}</span>
                    </label>)}
                </div>
            </fieldset>
            <fieldset className="field full quick-choice-field">
                <legend>{copy.why} <span>{copy.whyHint}</span></legend>
                <div className="quick-choice-options">
                    {WHY_JOIN_OPTIONS.map(([value, en, vi]) => <label className={joinReason === value ? 'selected' : ''} key={value}>
                        <input type="radio" name="why_join" value={value} checked={joinReason === value} onChange={() => setJoinReason(value)} required />
                        <span>{language === 'vi' ? vi : en}</span>
                    </label>)}
                </div>
                {joinReason === 'other' && <div className="field quick-choice-other">
                    <label htmlFor="why_join_other">{copy.whyOther}</label>
                    <input id="why_join_other" name="why_join_other" placeholder={copy.whyOtherPlaceholder} required />
                </div>}
            </fieldset>
            <div className="field full"><label htmlFor="whatsapp">{copy.whatsapp} <span className="field-hint">{copy.whatsappHint}</span></label><input id="whatsapp" name="whatsapp" type="tel" autoComplete="tel" inputMode="tel" placeholder="+84 912 345 678" pattern="[+0-9() .-]{7,24}" required /></div>
            {status && <div className={`form-status ${status.type} field full`}>{status.type === 'success' && <CheckCircle2 size={17} />} {status.message}</div>}
            <div className="field full form-submit-group">
                <button className="button primary submit-application" disabled={busy}>{busy ? copy.sending : <>{copy.submit} <ArrowRight size={18} /></>}</button>
                <p className="form-payment-note">{copy.noPayment}</p>
            </div>
            <p className="legacy-form-privacy field full">{copy.privacy}</p>
        </form>

        {showFeeConfirmation && createPortal(<div className="application-exit-backdrop landing-original" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowFeeConfirmation(false); }}>
            <section className="application-exit-modal fee-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="fee-confirm-title" aria-describedby="fee-confirm-body">
                <button className="application-exit-close" type="button" onClick={() => setShowFeeConfirmation(false)} aria-label={copy.feeCancel}><X size={18} /></button>
                <p className="application-exit-kicker">{copy.feeKicker}</p>
                <h2 id="fee-confirm-title">{copy.feeQuestion}</h2>
                <p id="fee-confirm-body">{copy.feeBody}</p>
                <div className="fee-confirm-actions">
                    <button className="button ghost" type="button" onClick={() => confirmFeeWillingness('no')}>{copy.feeNo}</button>
                    <button className="button primary" type="button" onClick={() => confirmFeeWillingness('yes')}>{copy.feeYes}</button>
                </div>
                <button className="application-exit-continue" type="button" onClick={() => setShowFeeConfirmation(false)}>{copy.feeCancel}</button>
            </section>
        </div>, document.body)}

        {showExitSurvey && createPortal(<div className="application-exit-backdrop landing-original" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowExitSurvey(false); }}>
            <section className={`application-exit-modal${surveyAnswered ? ' is-complete' : ''}`} role="dialog" aria-modal="true" aria-labelledby="exit-survey-title">
                <button className="application-exit-close" type="button" onClick={() => setShowExitSurvey(false)} aria-label={copy.exitContinue}><X size={18} /></button>
                {!surveyAnswered ? <>
                    <p className="application-exit-kicker">{copy.exitKicker}</p>
                    <h2 id="exit-survey-title">{copy.exitTitle}</h2>
                    <p>{copy.exitBody}</p>
                    <div className="application-exit-options">
                        {copy.exitReasons.map(([value, label]) => <button type="button" key={value} onClick={() => recordExitReason(value)}>{label}</button>)}
                    </div>
                    <button className="application-exit-continue" type="button" onClick={() => setShowExitSurvey(false)}>{copy.exitContinue}</button>
                </> : <>
                    <CheckCircle2 className="application-exit-success" size={34} />
                    <h2 id="exit-survey-title">{copy.exitThanks}</h2>
                    <button className="button primary" type="button" onClick={() => setShowExitSurvey(false)}>{copy.exitContinue}</button>
                </>}
            </section>
        </div>, document.body)}
    </>;
}
