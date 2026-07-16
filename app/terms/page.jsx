'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';

const COPY = {
    en: {
        eyebrow: 'Before you purchase',
        title: 'Terms & Refund Policy',
        intro: 'FoundersVN is a small, carefully prepared dinner for decision-makers. Each confirmed seat shapes the guest list, table plan, introductions, venue arrangements, and dining experience. These terms help us prepare with certainty and protect the quality of the room for everyone attending.',
        summaryTitle: 'The short version',
        summary: 'Tickets are final and non-refundable if you change your plans or do not attend. You may request to transfer your seat to another person, subject to FoundersVN approval. A refund is provided if FoundersVN cancels the event and does not offer a suitable replacement date.',
        sections: [
            ['Your ticket and confirmed seat', [
                'A ticket confirms one approved place at the specified FoundersVN event. It includes the curated networking programme, bilingual hosting, access to attendee information through the FoundersVN app, and the dinner described on the event page.',
                'Your payment allows us to commit to the venue, food, staffing, table arrangements, introductions, and other preparations in advance. For this reason, all ticket purchases are final once payment is completed.'
            ]],
            ['No refunds for non-attendance', [
                'We do not provide refunds if you cannot attend, arrive late, leave early, change your plans, experience a travel disruption, or do not attend for any other personal or business reason.',
                'This applies even when you notify us in advance, because your confirmed seat has already informed the guest selection and event preparation.'
            ]],
            ['Transferring your ticket', [
                'If you cannot attend, you may nominate another founder, business owner, or decision-maker to take your place. A transfer is valid only after FoundersVN reviews and approves the proposed attendee.',
                'Send the proposed attendee’s full name, role, company, email, and profile link to the FoundersVN team as early as possible. The replacement must meet the event criteria and provide any requested information.',
                'Tickets may not be publicly resold, auctioned, or transferred without written approval. If the replacement is not approved or no replacement is found, the ticket remains non-refundable.'
            ]],
            ['If FoundersVN cancels the event', [
                'If FoundersVN cancels because of unexpected circumstances, safety concerns, venue unavailability, government restrictions, severe weather, or another situation that makes the event unsafe or not reasonably possible to run, we will notify ticket holders as soon as reasonably possible.',
                'We may first offer a suitable rescheduled date or credit for a future FoundersVN event. If the event is cancelled and no suitable replacement is offered, the amount paid to FoundersVN will be refunded to the original payment method where possible.',
                'FoundersVN is not responsible for travel, accommodation, visa, transport, loss of income, or other costs incurred in connection with attending.'
            ]],
            ['Postponements and material changes', [
                'We may make reasonable changes to the schedule, hosts, menu, speakers, activities, or venue while preserving the main advertised experience. These changes do not normally create a right to a refund.',
                'If the event is postponed or materially changed, we will communicate the available options. Any rights that cannot lawfully be excluded under applicable consumer law remain unaffected.'
            ]],
            ['Admission and conduct', [
                'FoundersVN may refuse admission or ask an attendee to leave for unsafe, unlawful, disruptive, discriminatory, or seriously inappropriate conduct. No refund is provided in these circumstances.',
                'Attendees must provide accurate application information and respect the privacy and professional boundaries of others.'
            ]],
            ['Requests and response time', [
                'Transfer or refund questions should be sent to support@foundersvn.com with the purchaser’s name, event, and payment details. We aim to provide an initial response within five business days.',
                'By purchasing a ticket, you confirm that you have reviewed and accepted this policy.'
            ]]
        ],
        back: 'Back to event'
    },
    vi: {
        eyebrow: 'Thông tin trước khi mua vé',
        title: 'Điều khoản & Chính sách hoàn tiền',
        intro: 'FoundersVN là một bữa tối quy mô nhỏ được chuẩn bị kỹ lưỡng dành cho những người ra quyết định trong doanh nghiệp. Mỗi chỗ ngồi được xác nhận đều ảnh hưởng đến danh sách khách mời, cách xếp bàn, phần giới thiệu, địa điểm và trải nghiệm ẩm thực. Những điều khoản này giúp chúng tôi chuẩn bị chắc chắn hơn và bảo đảm chất lượng chung cho tất cả người tham dự.',
        summaryTitle: 'Tóm tắt chính sách',
        summary: 'Vé đã mua không được hoàn tiền nếu bạn thay đổi kế hoạch hoặc không tham dự. Bạn có thể đề nghị chuyển vé cho người khác nếu được FoundersVN chấp thuận. FoundersVN sẽ hoàn tiền nếu chúng tôi hủy sự kiện và không cung cấp một lịch tổ chức thay thế phù hợp.',
        sections: [
            ['Vé và chỗ ngồi đã xác nhận', [
                'Mỗi vé xác nhận một chỗ đã được duyệt tại sự kiện FoundersVN cụ thể. Vé bao gồm chương trình kết nối chọn lọc, điều phối song ngữ, quyền xem thông tin người tham dự qua ứng dụng FoundersVN và bữa tối được mô tả trên trang sự kiện.',
                'Khoản thanh toán giúp chúng tôi cam kết trước với địa điểm, bữa ăn, nhân sự, cách xếp bàn, phần giới thiệu và các công tác tổ chức khác. Vì vậy, giao dịch mua vé được xem là quyết định cuối cùng sau khi thanh toán hoàn tất.'
            ]],
            ['Không hoàn tiền khi khách không tham dự', [
                'Chúng tôi không hoàn tiền nếu bạn không thể tham dự, đến muộn, về sớm, thay đổi kế hoạch, gặp gián đoạn trong việc di chuyển hoặc vắng mặt vì bất kỳ lý do cá nhân hay công việc nào khác.',
                'Chính sách này vẫn áp dụng khi bạn thông báo trước, vì chỗ ngồi đã xác nhận của bạn đã được tính vào quá trình chọn khách và chuẩn bị sự kiện.'
            ]],
            ['Chuyển vé cho người khác', [
                'Nếu không thể tham dự, bạn có thể đề cử một nhà sáng lập, chủ doanh nghiệp hoặc người ra quyết định khác thay thế. Việc chuyển vé chỉ có hiệu lực sau khi FoundersVN xem xét và chấp thuận người được đề cử.',
                'Hãy gửi họ tên, vai trò, công ty, email và đường dẫn hồ sơ của người thay thế cho đội ngũ FoundersVN sớm nhất có thể. Người thay thế cần đáp ứng tiêu chí tham dự và cung cấp các thông tin được yêu cầu.',
                'Không được rao bán công khai, đấu giá hoặc tự ý chuyển vé khi chưa có chấp thuận bằng văn bản. Nếu người thay thế không được duyệt hoặc bạn không tìm được người thay thế, vé vẫn không được hoàn tiền.'
            ]],
            ['Khi FoundersVN hủy sự kiện', [
                'Nếu FoundersVN phải hủy do tình huống bất ngờ, vấn đề an toàn, địa điểm không thể phục vụ, quy định của cơ quan chức năng, thời tiết khắc nghiệt hoặc một hoàn cảnh khác khiến việc tổ chức không còn an toàn hay khả thi, chúng tôi sẽ thông báo trong thời gian sớm nhất có thể.',
                'Chúng tôi có thể đề xuất một lịch tổ chức mới phù hợp hoặc quyền tham dự sự kiện FoundersVN khác. Nếu sự kiện bị hủy và không có phương án thay thế phù hợp, khoản đã thanh toán cho FoundersVN sẽ được hoàn qua phương thức thanh toán ban đầu khi có thể.',
                'FoundersVN không chịu trách nhiệm đối với chi phí đi lại, lưu trú, visa, vận chuyển, thu nhập bị mất hoặc các chi phí khác liên quan đến việc tham dự.'
            ]],
            ['Hoãn hoặc thay đổi chương trình', [
                'Chúng tôi có thể điều chỉnh hợp lý về lịch trình, host, thực đơn, khách mời, hoạt động hoặc địa điểm nhưng vẫn duy trì trải nghiệm chính đã công bố. Những điều chỉnh này thông thường không làm phát sinh quyền hoàn tiền.',
                'Nếu sự kiện bị hoãn hoặc thay đổi đáng kể, chúng tôi sẽ thông báo các phương án dành cho người mua vé. Mọi quyền lợi không thể bị loại trừ theo pháp luật bảo vệ người tiêu dùng hiện hành vẫn được bảo đảm.'
            ]],
            ['Quyền tham dự và ứng xử', [
                'FoundersVN có thể từ chối cho vào hoặc yêu cầu một khách rời sự kiện nếu có hành vi thiếu an toàn, trái pháp luật, gây gián đoạn, phân biệt đối xử hoặc không phù hợp nghiêm trọng. Vé không được hoàn trong các trường hợp này.',
                'Người tham dự cần cung cấp thông tin đăng ký chính xác, đồng thời tôn trọng quyền riêng tư và ranh giới nghề nghiệp của những người khác.'
            ]],
            ['Yêu cầu và thời gian phản hồi', [
                'Các câu hỏi về chuyển vé hoặc hoàn tiền cần được gửi đến support@foundersvn.com, kèm tên người mua, sự kiện và thông tin thanh toán. Chúng tôi dự kiến phản hồi ban đầu trong vòng năm ngày làm việc.',
                'Khi mua vé, bạn xác nhận đã đọc và đồng ý với chính sách này.'
            ]]
        ],
        back: 'Quay lại sự kiện'
    }
};

export default function TermsPage() {
    const { language } = useLanguage();
    const copy = COPY[language] || COPY.en;
    return <article className="narrow legal policy-page">
        <span className="eyebrow">{copy.eyebrow}</span>
        <h1>{copy.title}</h1>
        <p className="policy-intro">{copy.intro}</p>
        <div className="policy-summary"><strong>{copy.summaryTitle}</strong><p>{copy.summary}</p></div>
        {copy.sections.map(([title, paragraphs], index) => <section className="policy-section" id={index === 1 ? 'refunds' : undefined} key={title}>
            <h2>{index + 1}. {title}</h2>
            {paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        </section>)}
        <Link className="button secondary policy-back" href="/">{copy.back}</Link>
    </article>;
}
