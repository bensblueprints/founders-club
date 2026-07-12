# Landing Page — Cấu trúc & Tối ưu (bản nháp để polish)

_Mục đích: log lại phân tích tối ưu landing cho **pilot Đà Nẵng**, để đưa GPT (hoặc team) polish thành nội dung/copy hoàn chỉnh._

> ✅ **Đã dựng xong:** [`landing.html`](../landing.html) — song ngữ VI/EN, theo [FOUNDERSVN-BRAND-SYSTEM](../08-brand/FOUNDERSVN-BRAND-SYSTEM.md), dùng ảnh thật trong `images/landing/`. Cấu hình ở khối `CONFIG` cuối file: `seatsLeft` (đếm ghế), `FORM_ENDPOINT` (dán Formspree/Apps Script khi có — đang trống thì form fallback mở email soạn sẵn về `FALLBACK_EMAIL`).
_Nền tảng: dựa trên bản có sẵn của Ben (Founders Vietnam) — xem [11-web-audit](../11-web-audit/WEB-STRUCTURE.md). Bản gốc thiết kế cho club membership hàng tháng ở Sài Gòn; ở đây trim lại cho 1 bữa dinner pilot._

---

## Context đã chốt (để polish bám đúng)
- **Sự kiện:** Đà Nẵng, **Thứ Sáu 31/7/2026**, **4U Lounge**, cap **25 người**, vé **150 đô**.
- **Đối tượng:** **chủ doanh nghiệp** mọi ngành — nhắm theo **level/vị thế, KHÔNG theo ngành**. Phòng đa dạng ngành để bật cơ hội chéo.
- **Song ngữ:** ~50% người Việt (nhiều người không rành English) + ~50% quốc tế → **cần VI/EN**.
- **Rủi ro #1 = uy tín:** chưa có brand, chưa ai biết → phải mượn uy tín qua **seed guests + ảnh thật + venue thật + cam kết hoàn tiền**.
- **Ngân sách ads $20–30 (cap cứng):** landing phải convert mạnh; việc chính là **lấp đủ 25 ghế**, không phải quản chi phí.
- **Format đêm sự kiện:** (1) mở app xem hồ sơ mọi người → (2) hoạt động phá băng + giới thiệu → (3) free time ăn tối.
- **Cross-event:** sau Đà Nẵng là **Sài Gòn tháng 8** → hook re-book.

---

## 3 vấn đề lớn nhất (ưu tiên xử)
1. **Toàn tiếng Anh** → thiếu song ngữ VI/EN. Lỗ hổng số 1.
2. **Social proof đặt quá thấp / thiếu** — mà uy tín là rủi ro lớn nhất. Đang có sẵn ảnh thật 4U + past dinner → kéo lên trên; thêm "Ai đang tham gia" (seed guests).
3. **Cả trang bán "membership/monthly"** → lệch. Pilot chỉ bán **1 vé dinner 150 đô**. Bỏ membership tiers, cruise, upsell, lịch hàng tháng.

---

## Soi từng section (giữ / sửa / bỏ / thêm)

| Section | Vấn đề theo context | Nên làm |
|---|---|---|
| **Nav** | "Members" trỏ tới directory rỗng (chưa có ai) → phản tác dụng. 3 CTA khác nhau (Apply/Request/Book) gây rối. | Ẩn "Members" đến khi có người. **1 CTA duy nhất**: "Đăng ký 1 trong 25 ghế". Thêm **toggle VI/EN**. |
| **Hero** | "Where Visionaries Converge" + "By invitation only" — mơ hồ, tiếng Anh, và "invite-only" mâu thuẫn với chạy ads cho người lạ. | Dùng headline rõ: *"Phone-Free Networking for Founders."* Subheadline phải nói về một bữa tối kết nối thân mật/close networking, công nghệ chỉ hỗ trợ nhẹ phía sau. Không mở đầu bằng digital-first/product language. |
| **Stats [100/30/10]** | Số của model cũ (100 cap, cruise). | Đổi sang urgency + cụ thể: `25 ghế` · `Thứ Sáu 31/7` · `còn X chỗ` (đếm ngược). Bỏ cruise. |
| **The Experience** | OK nhưng chưa khớp format. | Viết lại đúng **3 bước** (app → phá băng/giới thiệu → free time ăn tối). Là điểm khác biệt → đẩy **lên cao**. |
| **Gatherings (list tháng)** | Danh sách Feb–Jul giả/rỗng với pilot → nhìn như template, mất uy tín. | Thay bằng **1 card sự kiện mạnh**: Đà Nẵng, Thứ Sáu 31/7, 4U Lounge, 25 ghế, 150 đô, còn X chỗ, [Đăng ký]. Tease "Sài Gòn tháng 8". |
| **Membership Tiers** | Sai model — bán vé, không bán membership. | Đổi thành **"Vé 150 đô gồm gì"**: bữa ăn curated + quyền vào app (hồ sơ + liên hệ mọi người) + intro có sắp xếp. 1 offer rõ ràng, bỏ cruise/upsell. |
| **Apply form (dài)** | Form vetting dài (revenue, team size, goals…) trước khi trả tiền → trên ads lạnh + ngân sách nhỏ sẽ giết conversion. Hỏi "doanh thu" nhạy cảm. | Rút gọn ~4–5 câu (tên, công ty, vai trò, "muốn kết nối gì"). Giữ vetting nhẹ (= uy tín), song ngữ. → cần chốt apply-rồi-trả vs trả-thẳng. |
| **FAQ** | Chưa xử lý lo lắng đặc thù VN. | Thêm: **ngôn ngữ** (song ngữ/hỗ trợ), **thanh toán & hoàn tiền**, **ai sẽ tham gia**, **có đáng $150 không**. |
| **Thiếu hẳn** | — | **Gallery ảnh thật 4U/past dinner**; **"Ai đang tham gia" (seed guests)**; **cam kết hoàn tiền nếu hủy**; **mặt thật tổ chức (Maddy/An/Benji)**. |

---

## Thứ tự landing tối ưu cho pilot (đề xuất)

```
┌─────────────────────────────────────────────┐
│ nav: LOGO   [VI/EN]           [Đăng ký ghế]   │  ← 1 CTA, song ngữ
├─────────────────────────────────────────────┤
│ HERO (kèm 1 ảnh thật 4U):                     │
│  "Bữa tối kết nối · 25 chủ DN · Đà Nẵng"      │  ← ai / đâu / khi nào
│  Thứ Sáu 31/7 · 4U Lounge · còn X/25 ghế      │  ← trust + urgency
│  [Đăng ký 1 ghế]                              │
├─────────────────────────────────────────────┤
│ GALLERY ảnh thật (4U + dinner trước)          │  ← social proof sớm
├─────────────────────────────────────────────┤
│ CÁCH VẬN HÀNH (3 bước: app → phá băng → ăn tối)│  ← điểm khác biệt
├─────────────────────────────────────────────┤
│ AI ĐANG THAM GIA (seed guests: "Có mặt: ___") │  ← chốt đơn trên ads rẻ
├─────────────────────────────────────────────┤
│ VÉ 150 đô GỒM GÌ + cam kết hoàn tiền     │  ← 1 offer
├─────────────────────────────────────────────┤
│ ĐĂNG KÝ (form ngắn, song ngữ)                 │
├─────────────────────────────────────────────┤
│ FAQ (ngôn ngữ, thanh toán, ai tham gia) + FOOTER│
└─────────────────────────────────────────────┘
```

---

## 2 quyết định cần chốt với team
1. **Apply-rồi-trả** (lọc kỹ, uy tín cao, conversion thấp) **vs. trả-thẳng** (nhiều đơn, ít lọc). Đề xuất **hybrid**: form ngắn → duyệt nhanh → trả tiền.
2. **Có hiện "Members/directory" khi chưa có ai không** → đề xuất **ẩn** đến khi seed đủ vài người.

---

## Landing copy — shorter, natural, ready for webpage

> Direction: Keep the copy short, specific, and warm. Vietnamese should feel natural and mindful — not like a literal translation from English. Premium, but never stiff.

### Nav
| VI | EN |
|---|---|
| FoundersVN | FoundersVN |
| Cách vận hành | How it works |
| Về FoundersVN | About |
| — FoundersVN events | — FoundersVN events |
| — The team behind | — The team behind |
| FAQ | FAQ |
| **Apply** | **Apply** |

**About nav behavior:** `Về FoundersVN / About` should be a dropdown with:
- `FoundersVN events`
- `The team behind`

Remove `Event` and `People / Who's coming` from the top-level nav for now.

See [ABOUT-SUBPAGES-BRIEF.md](../05-web-app/ABOUT-SUBPAGES-BRIEF.md) for the subpage structure.

### Hero
| Element | VI | EN |
|---|---|---|
| Eyebrow | Đà Nẵng · Thứ Sáu 31/7 · 4U Lounge | Da Nang · Friday, July 31 · 4U Lounge |
| H1 | Phone-Free Networking for Founders | Phone-Free Networking for Founders |
| Subhead | Một bữa tối kết nối thân mật cho founder tại Đà Nẵng, được thiết kế để cuộc trò chuyện đi sâu hơn và được công nghệ hỗ trợ nhẹ nhàng phía sau. | An intimate founder dinner in Da Nang, designed for deeper conversations and quietly supported by technology so every introduction feels natural. |
| Primary CTA | Đăng ký tham dự | Apply for a seat |
| Secondary CTA | Xem cách hoạt động | How it works |
| Trust line | Vé 150 đô · Có directory trước sự kiện · Hoàn tiền nếu chương trình bị hủy | $150 · Directory opens before the event · Refund if we cancel |
| Seats counter | Còn X/25 ghế | X/25 seats left |

### Short positioning block
| VI | EN |
|---|---|
| Không phải một buổi networking đông người rồi ai cũng tự xoay sở. FoundersVN là bữa tối nhỏ cho những người đang trực tiếp xây, vận hành, hoặc mở rộng doanh nghiệp. | Not another crowded meetup. FoundersVN is a small, curated dinner for people actively building or running a business. |
| Chúng tôi không xếp phòng theo ngành. Điều quan trọng hơn là vai trò, mức độ nghiêm túc, và lý do để mọi người thật sự nên gặp nhau. | Not curated by industry. Curated by quality, role, and the ability to create value for each other. |

### Proof / gallery intro
| VI | EN |
|---|---|
| Một không gian thật, với người thật, và đủ khoảng lặng để cuộc trò chuyện đi xa hơn phần giới thiệu ban đầu. | A real venue. Real people. A night designed for conversations worth continuing. |
| Sử dụng ảnh 4U Lounge + ảnh dinner/networking thật ở phần này. | Use real 4U Lounge and past dinner/networking photos here. |

### How it works
| Step | VI | EN |
|---|---|---|
| 1 | **Biết trước căn phòng.** Trước sự kiện, bạn xem được profile ngắn của những người sẽ tham dự: họ làm gì, đang tìm gì, và có thể chia sẻ gì. | **Know the room.** See attendee profiles before the event. |
| 2 | **Có host mở nhịp.** Host song ngữ giúp mọi người bắt đầu tự nhiên hơn, không phải bước vào rồi tự tìm cách bắt chuyện. | **Guided start.** A host makes the first conversations easier. |
| 3 | **Ăn tối theo nhiều bàn nhỏ.** Không phải một bàn dài cố định. Bạn sẽ có cơ hội gặp nhiều người hơn trong một cấu trúc được dẫn dắt nhẹ nhàng. | **Dine and rotate.** Multiple hosted tables, better conversations. |
| 4 | **Tiếp tục sau bữa tối.** Directory vẫn mở sau sự kiện để bạn follow up đúng người, đúng câu chuyện. | **Follow up after.** The directory stays open after dinner. |

### App section
| Element | VI | EN |
|---|---|---|
| Section title | The Digital Layer Behind Every Conversation | The Digital Layer Behind Every Conversation |
| Body | Trước bữa tối, app giúp bạn biết ai sẽ có mặt. Trong sự kiện, app hỗ trợ flow bàn và gợi ý trò chuyện. Sau đó, những liên hệ quan trọng vẫn ở lại cùng ngữ cảnh. | Before dinner, the app helps you see who is coming. During the event, it handles table flow and prompts. Afterward, it keeps the right contacts and context in one place. |
| Point 1 | Xem profile trước khi đến | Profiles before you arrive |
| Point 2 | Hỗ trợ flow bàn trong bữa tối | Table flow during the dinner |
| Point 3 | Follow up sau khi sự kiện kết thúc | Follow-ups after the room closes |

**Visual direction:** build the app visual as layered web elements, not one flat UI-board image. The goal is to show that the app quietly manages logistics before, during, and after the event — not to explain every feature.

Keep this section modern, clean, and UI-system-led. Do **not** use forest/tree/leaf/nature elements. The app visual should clarify components, screen hierarchy, chips, cards, status pills, and CTAs.

Use the real logo as an HTML/CSS layer:
- `assets/brand/founders-vn-logo.svg`

Do **not** render or imitate the FoundersVN / Founders Vietnam logo inside generated mockup images.

Use these transparent PNG layers:
- `assets/brand/app-layer-elements/phone-directory-transparent.png`
- `assets/brand/app-layer-elements/phone-tonight-transparent.png`
- `assets/brand/app-layer-elements/floating-ui-elements-transparent.png`

### The offer
| VI | EN |
|---|---|
| **Vé 150 đô bao gồm** | **Your $150 ticket includes** |
| Bữa ăn được curate tại 4U Lounge, Đà Nẵng | Curated meal at 4U Lounge, Da Nang |
| Directory người tham dự, mở trước và sau sự kiện | Attendee directory before and after |
| Profile ngắn: công ty, vai trò, điều đang tìm, điều có thể chia sẻ | Profiles: company, role, asks, offers |
| Host song ngữ Việt/Anh để dẫn nhịp buổi tối | Vietnamese/English host |
| Không gian phone-free trong phần chính của chương trình | Phone-free setting |
| Hoàn tiền nếu chương trình bị hủy | Refund if the event is cancelled |

**Ticket value note:** Make the dining component visible, not buried in bullets. Use an elegant menu card or high-quality food/dinner imagery so visitors immediately understand the ticket covers both:
- a curated networking experience
- a quality dining experience

The meal should feel premium and thoughtfully prepared, not like generic event snacks.

### Testimonials (temporary placeholders)
> Use after the offer section. Crop faces from existing gallery images for temporary avatars. Replace with real quotes after Event #1.

| Name | Title | Testimonial |
|---|---|---|
| Minh Le | Founder, Studio Operator | “I met two people I would never have found at a normal networking event.” |
| Sarah Nguyen | Growth Lead | “Small room, strong people, and the conversations actually continued after dinner.” |
| David Tran | Founder, AI Tools | “The directory made it easy to know who to speak to before I arrived.” |

### Who should apply
| VI | EN |
|---|---|
| Bạn đang trực tiếp xây, vận hành, hoặc tăng trưởng một doanh nghiệp/dự án nghiêm túc. | You are building, running, or growing a business. |
| Bạn muốn gặp những người có cùng mức trách nhiệm, không chỉ những người cùng ngành. | You want to meet people with similar responsibility, not just the same industry. |
| Bạn đến với một câu hỏi rõ ràng — và cũng có trải nghiệm, góc nhìn, hoặc kết nối để chia sẻ lại. | You have something to ask for and something to offer. |
| Bạn thích một căn phòng nhỏ nhưng đúng người hơn là một sự kiện đông, ồn, và khó follow up. | You prefer a small, strong room over a large, thin event. |

### CTA band
| VI | EN |
|---|---|
| Đà Nẵng chỉ có 25 ghế. Mỗi đăng ký được xem kỹ để giữ căn phòng đúng người, đúng nhịp, đúng chất lượng. | 25 seats for Da Nang. Each application is reviewed to keep the room strong. |
| **Đăng ký tham dự** | **Apply for a seat** |

### Application form copy
| Field | VI | EN |
|---|---|---|
| Intro | Mất khoảng 2 phút. Chúng tôi chỉ hỏi những thông tin cần thiết để hiểu bạn đang xây gì, đang tìm ai, và có thể kết nối bạn với ai trong phòng. | Takes around 2 minutes. We only ask what helps us curate the room. |
| Name | Họ và tên | Full name |
| Email | Email | Email |
| Company | Công ty / dự án | Company / project |
| Role | Vai trò của bạn | Your role |
| What you do | Bạn đang xây/vận hành điều gì? 1-2 câu là đủ. | What do you do? 1-2 sentences. |
| Looking for | Hiện tại bạn muốn gặp kiểu người nào, hoặc đang cần góc nhìn gì? | Who would be useful for you to meet? |
| Can offer | Bạn có kinh nghiệm, góc nhìn, hoặc kết nối gì có thể chia sẻ với người khác? | What can you offer others? |
| Links | Website / LinkedIn / Facebook / Zalo / portfolio | Website / LinkedIn / Facebook / Zalo / portfolio |
| Language | Bạn muốn dùng ngôn ngữ nào trong sự kiện? | Which language are you most comfortable using at the event? |
| Submit | Gửi đăng ký | Submit |
| After submit | Cảm ơn bạn. Team sẽ xem đăng ký và phản hồi sớm nếu edition Đà Nẵng là một sự phù hợp tốt cho bạn. | Thank you. We'll reply soon if it's a fit. |

### FAQ
| Question VI | Answer VI | Question EN | Answer EN |
|---|---|---|---|
| Sự kiện này dành cho ai? | Founder, chủ doanh nghiệp, operator, và những người đang trực tiếp chịu trách nhiệm xây hoặc tăng trưởng một công ty/dự án nghiêm túc. | Who is this for? | Founders, business owners, operators, and people directly building or growing a company. |
| Vì sao phải đăng ký trước? | Vì chỉ có 25 ghế. Chúng tôi muốn biết mỗi người đang tìm gì và có thể đóng góp gì, để căn phòng có lý do thật sự để kết nối. | Why apply first? | Because there are only 25 seats. We want everyone in the room to have a reason to meet. |
| Có cần nói tiếng Anh giỏi không? | Không. Sự kiện có host song ngữ Việt/Anh, và phần giới thiệu sẽ được dẫn để cả khách Việt Nam lẫn quốc tế đều dễ tham gia. | Do I need strong English? | No. The event has Vietnamese/English hosting. |
| Phone-free nghĩa là gì? | Trong phần chính của chương trình, mọi người cất điện thoại để hiện diện hơn với người đối diện. Bạn vẫn có thể dùng điện thoại khi cần thiết ở những khoảng phù hợp. | What does phone-free mean? | During the main parts, phones stay away so people can focus on the conversation. |
| Vé 150 đô gồm gì? | Bữa ăn được curate tại 4U Lounge, host song ngữ, directory người tham dự trước/sau sự kiện, và trải nghiệm được curate cho 25 người. | What does $150 include? | A curated meal, hosting, the attendee directory, and a curated room. |
| Nếu sự kiện bị hủy thì sao? | Bạn sẽ được hoàn tiền. Nếu bạn đã thanh toán nhưng edition này chưa phải là sự phù hợp tốt nhất, team sẽ trao đổi rõ ràng về hoàn tiền hoặc một lịch phù hợp hơn. | What if the event is cancelled? | You get a refund. If you've paid and the final fit does not work, the team will handle refund or rescheduling clearly. |
| Sau Đà Nẵng có sự kiện khác không? | Có. Sau edition Đà Nẵng, FoundersVN dự kiến mở edition tiếp theo tại Sài Gòn trong tháng 8, dựa trên những gì học được từ buổi đầu tiên. | Will there be another event after Da Nang? | Yes. FoundersVN plans to run the next edition in Saigon in August, shaped by what we learn from the Da Nang pilot. |

### Social/ad copy options
| Angle | VI | EN |
|---|---|---|
| Direct | Phone-Free Networking for Founders | Phone-Free Networking for Founders |
| Anti-awkward | Biết trước ai sẽ có mặt, để bạn bước vào phòng với nhiều điểm bắt chuyện hơn. | Know who's in the room before you walk in. |
| Value | Gặp đúng người. Nói chuyện có chiều sâu. Follow up sau bữa tối. | Meet the right people. Have real conversations. Follow up after dinner. |
| Quality | Ít người hơn, nhưng đúng người hơn. | Fewer people. Better fit. |
| Local | Đà Nẵng, Thứ Sáu 31/7: 25 ghế cho founder, chủ doanh nghiệp và operator. | Da Nang, Friday July 31: 25 seats for founders and business owners. |

---

_Xem thêm: [MARKETING-PLAN.md](MARKETING-PLAN.md) · [WEB-APP-SPEC](../05-web-app/WEB-APP-SPEC.md) · [FEEDBACK bản web](../11-web-audit/FEEDBACK.md)_
