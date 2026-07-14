# Vận hành & User Flow — Pilot Đà Nẵng

_Log lại thống nhất từ nhóm chat 13/07/2026 (Maddy · Matthew/Thiệu). Đây là cách vận hành pilot, ưu tiên lean + manual vì chỉ ~25 người._

## Trạng thái hiện tại (13/07)
- **Web mới sẽ live hôm nay** (An) — đảm bảo **web chạy + phần applications chạy**.
- **Nay mai bắt đầu chạy ads.**
- Họp team: **20h30** (đã xác nhận).

## User flow (bản chốt — họp 14/7, AUTOMATED)

```
Landing  →  Apply (form hỏi cả ngôn ngữ)  →  [Discord noti cho team]  →  Team review
   │
   ├─ Không duyệt → dừng
   └─ Duyệt  →  ACCOUNT ĐƯỢC TẠO (team tạo/admit hồ sơ trên app — khách không tự tạo)
        → Email #1 (Resend, auto): "Yay, you're accepted" + link thanh toán
        → Chuỗi reminder tới khi trả (giữ ghế 48h: nhắc 24h / 6h / 1h → hết hạn huỷ)
        → Khách PAY: (a) thẻ qua Airwallex +5%  hoặc  (b) QR VNPay (free) — TỰ ĐỘNG
          · checkout cho mua 1–2 vé (plus-one: tên + món, tối đa 2/công ty)
        → Email #2 (auto): payment confirmed + onboarding
          (link/QR vào WhatsApp group · access app login=email+pass · hướng dẫn)
        → Khách LOGIN & hoàn thiện hồ sơ (chỉ sửa, không tạo)
        → Explore participants: thấy NGAY full directory + contact (digital card)
          (ghế chưa bán = icon "?", bán rồi hiện tên) — contact hiện từ lúc có access
        → Đến ngày → tham dự (31/7): warm-up → talk/slide → ăn tối → networking
        → SAU EVENT: directory vẫn mở để follow-up + hook Saigon (contact đã có sẵn)
```

**Ghi chú:**
- **Account tạo ngay khi admit** (khách chỉ login & sửa hồ sơ, không tạo).
- **Email tự động qua Resend** (không gửi tay) — Maddy soạn template + chuỗi reminder; gửi từ domain **foundersvn** (mua inbox + warm-up chống spam). Thank-you page nhắc check spam.
- **Thanh toán tự động**: Airwallex (thẻ, +5% khách chịu) + QR VNPay (free). Bỏ bước confirm thủ công.
- **Discord noti** cho team khi có đơn/câu hỏi mới (An dựng).

## Phân công theo giai đoạn

### Pre-event (nặng hơn cả — cần Maddy + Matthew cùng làm)
- **Take care / quản lý khách**, đảm bảo khách đi đúng flow ở trên (Maddy + Matthew).
- **Tiếp nhận inquiry**: khách nhắn hỏi → **ping vào WhatsApp** để cả team ai rảnh thì trả lời & support; Maddy là đầu mối coordinate.
- **Duyệt & thanh toán**: khách apply → bàn nội bộ có duyệt không → duyệt thì chủ động liên hệ + yêu cầu thanh toán → khách trả + chụp màn hình → confirm → cho vào group.
- **Printing materials**: Maddy gửi file → in (chi phí rất rẻ, ~$10 max, có thể bỏ).
- **Venue**: check venue + deal giá nhà hàng (Matthew).

### In-event (Matthew chủ trì phần sân khấu/điều phối)
- **MC / host** — **Maddy & Matthew** (song ngữ VI/EN). Chào hỏi/đón khách: ai cũng được; Benji nếu muốn MC thì welcome.
- **Cấu trúc hoạt động** bonding + giới thiệu, luồng thông tin, chuẩn bị **đạo cụ** hoạt động.
- **Agenda + kịch bản coordination**, kiểm soát timeline, ứng biến tại chỗ.
- **Tổng duyệt + setup** trước sát giờ.
- **Materials/resources**: photo, nhạc (nhẹ), venue.

> **Lean nhưng có AV cơ bản:** KHÔNG làm màn hình LED lớn / ban nhạc. NHƯNG **có**: 2× loa JBL + 2 mic (cho talk + dịch song song) và **máy chiếu + slides** (giới thiệu FoundersVN + demo app). Matthew check venue có sẵn máy chiếu/AV không.

## Thanh toán — CHỐT (họp 14/7): AUTOMATED, 2 phương thức
> _Đảo lại quyết định "manual" trước đó._ Dùng cổng, tự động qua API.
1. **Thẻ quốc tế qua Airwallex** (Ben đã có, API mở; Ben add team + tạo sub-account/thẻ ảo có hạn mức, tracking; chuyển về bank VN tức thì). → **phụ thu +5%** cho khách chịu (phí xử lý).
2. **QR nội địa (VNPay/VietQR)** → **miễn phí** (0 fee).
- Tiền vào **Airwallex của Ben**; tạo sub-account theo dõi cho từng người.
- Bỏ bước "chụp màn hình + confirm thủ công" — thanh toán tự động.
- **Test:** làm **sản phẩm test 1 xu** để chạy thử mua + kiểm tra email trước khi launch.

## Email — CHỐT: AUTOMATED qua Resend (không gửi tay)
- Dùng **Resend** (API transactional email), wire qua API (An/Codex, ~15 phút). Ben mua **inbox domain foundersvn** (support@ / payments@ / concierge@… ~$1/inbox/tháng) + **warm-up domain** để không vào spam.
- **Chuỗi email:** (1) "Yay, you're accepted" → (2) thanh toán + onboarding, kèm **reminder tới khi trả**: giữ ghế **48h**, nhắc ở mốc còn 24h / 6h / 1h → hết hạn thì huỷ đơn.
- Onboarding email chứa: **link/QR vào WhatsApp group**, access app (login = email + pass), hướng dẫn dùng.
- **Thank-you page sau khi apply:** "đơn đang chờ duyệt — kiểm tra hộp spam, mark 'not spam'".
- **Maddy soạn toàn bộ template + chuỗi email** → team wire vào Resend.

## Plus-one (vé kèm)
- Sau khi được duyệt, ở checkout cho mua **1 hoặc 2 vé** (rủ co-founder/vợ/chồng/partner). **Tối đa 2/công ty.** Cùng giá, **không giảm**.
- Plus-one **không cần apply/hồ sơ riêng** — chỉ nhập **tên + chọn món ăn**. One-click upsell.

## Đồ ăn / menu / chỗ ngồi
- **Venue = 4U Lounge**, dùng đồ ăn của họ → **không tốn phí thuê không gian**. Đồ ăn ngon.
- Khách **chọn món trước** khi đăng ký (steak / gà / chay).
- **Name card** (giấy cứng gấp) in **tên + chấm màu** (đỏ=steak, vàng=gà, xanh=chay) → phục vụ nhanh, gọn. Phát ở cửa; **tự chọn bàn** (không xếp chỗ trước).
- **Đồ ăn là điểm bán #1** → làm **sizzle reel món ăn** cho ad. (Event trước: vé $100, đồ ăn KHÔNG bao gồm; lần này dùng đồ ăn venue — chốt có include vào vé không.)

## Speaker / talk
- Có 1 **talk/speaker**. Event #1: **Ben nói** (founder stories — "how did you start"). Có **trang apply speaker** trên foundersvn.com; outreach CEO lớn. Có host giới thiệu speaker lên.

## Dress code & giá
- **Suit & tie** (bắt buộc) → định vị premium, đỡ cho việc nâng giá.
- Giá pilot **$150**; **test nâng giá** — nếu ads cho thấy khách mua ở **$250** (nhất là HCMC/Saigon) thì giữ $250.

## Communication / inquiry protocol
- Khách nhắn inquiry → **WhatsApp group**; support email route về **Slack/Discord** để team thấy.
- Front-line guest support: **Matthew + team**. **Ben tự nhận KHÔNG hợp customer service** → Ben làm **concierge** cho câu hỏi giá trị cao (gợi ý ăn/chơi, chuyên môn) + dựng FAQ; cả team giữ community sôi nổi.
- Giữ giọng nhất quán (song ngữ), phản hồi nhanh — điểm chạm tạo uy tín trước khi khách trả tiền.

## Ngôn ngữ / dịch
- **Form apply hỏi ngôn ngữ** (English / Vietnamese / bilingual) → dùng để quyết mức độ dịch + chọn MC.
- MC song ngữ **Maddy + Matthew**; chốt theo demographics sau khi có sign-up. Nếu có vài khách VN-only (có thể là "cá lớn") → gom bàn / dịch song song ~10–20 phút (mic 2). Beta #1 linh hoạt, "wing it".
- Chạy **cả ad tiếng Việt** (dễ). Nhiều chủ DN lớn vốn bilingual, nhưng vẫn giữ dịch như điểm chạm cao cấp.

## App / danh sách khách
- **Seat-blocking:** ghế chưa bán hiện **icon "?" (không tên)**; duyệt + trả tiền xong mới hiện tên trên danh sách → tạo khan hiếm + social proof.
- App = hồ sơ kiểu LinkedIn (link + contact); sau event chat trong app. Nhắc tại event (máy chiếu/slide) + **video ghim trong WhatsApp**.
- App còn thiếu: **ảnh món ăn**, **bản copy tiếng Việt** (làm ngày mai).

## Việc cần chốt (tổng hợp)
- [x] MC → **Maddy & Matthew** (chốt theo demographics; Benji welcome)
- [x] Thanh toán → **Airwallex (thẻ, +5%) + QR VNPay (free)** — tự động
- [x] Email → **Resend tự động** + chuỗi reminder (giữ ghế 48h)
- [x] Plus-one → tối đa 2/công ty, cùng giá, chỉ cần tên + món
- [ ] **Chốt venue ASAP** + **site check trong tuần này** (Matthew) + check máy chiếu/AV
- [ ] **Chốt menu / món** + đồ ăn có include vào vé $150 không
- [ ] Agenda/kịch bản ~3h (Matthew nháp → team duyệt) + đưa lên web
- [ ] Ben: mua inbox domain foundersvn + warm-up; An: wire Resend + Airwallex + QR + seat-blocking + plus-one
- [ ] Maddy: soạn chuỗi email; làm ảnh món ăn + copy VN cho app
- [ ] Làm **sản phẩm test 1 xu** để test mua + email
- [ ] In name card (tên + chấm màu món)
- [x] Chia doanh thu → **4 người đều nhau, 25% mỗi người** (Maddy/An/Benji/Matthew) ✅

> ✅ **Chia doanh thu — CHỐT: 4-way đều (25% mỗi người).** Tiền vào Airwallex của Ben → còn chốt ai giữ quỹ + nhịp chi trả. Xem [Team Agreement](../10-team-agreement/TEAM-AGREEMENT.md).
