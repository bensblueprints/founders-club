# FoundersVN — Ads Content Plan & Social Image Plan

_Ghi chú: file này gộp kế hoạch ads (paid) + kế hoạch social (organic), có sẵn brief/prompt để đưa thẳng cho GPT/image-gen. Copy quảng cáo giữ nguyên tiếng Anh (theo brand system "English-first"), phần hướng dẫn/brief thì viết tiếng Việt cho team dễ dùng._

**Tham chiếu:** [MARKETING-PLAN.md](MARKETING-PLAN.md) · [SOCIAL-CAMPAIGN-COPY-AND-MATERIALS-V2.md](SOCIAL-CAMPAIGN-COPY-AND-MATERIALS-V2.md) · [FOUNDERSVN-BRAND-SYSTEM.md](../08-brand/FOUNDERSVN-BRAND-SYSTEM.md)

## 0. Bối cảnh nhanh

| | |
|---|---|
| Event | FoundersVN — Phone-Free Networking for Founders |
| Ngày | Thứ Sáu, 31/07/2026 |
| Venue | 4U Lounge, Đà Nẵng |
| Số chỗ | 25 |
| Giá vé | $150 (không lead bằng giá ở giai đoạn awareness) |
| Ngân sách ads | $20–30 tổng (pilot) → không đủ để test 5 concept song song, phải chọn lọc |
| Màu brand | Deep Pine `#071A14` (nền chính) · Warm Bone `#F2F0E8` (chữ trên nền tối) · Ember Coral `#E7644A` (CTA/accent duy nhất) · Moss `#8A9A5B` · Mineral Mist `#A9BBB6` |
| Font | Geometric sans (Satoshi/General Sans/Inter) — không serif, không letter-spacing âm |
| Cấm kỵ | gradient tím-xanh, 3D blob bóng, ảnh bắt tay stock, gold/luxury cues, "one long table" framing, mặt người AI giả trông lạ |

## 1. Nguyên tắc phân bổ style hình ảnh (áp dụng cho cả ads + social)

Có 4 kiểu hình, cố tình luân phiên để feed không đơn điệu và để né rủi ro "AI slop mặt người":

| Style | Khi dùng | Nguồn ảnh |
|---|---|---|
| **A — Typography-only** | Câu tuyên ngôn ngắn, số liệu, scarcity, CTA punchy | Không cần ảnh, chỉ nền Deep Pine + type + wavy line accent |
| **B — Photo-blend (ảnh thật)** | Cần "chứng thực" — quán đã có sự kiện thật, có người thật | Ảnh thật trong `images/gallery/` (dinner-1.jpg, dinner-2.jpg, networking-1.jpg, networking-2.jpg, venue-wide.jpg, venue-detail.jpg, group-photo.jpg), qua GPT chỉ để **tinh chỉnh màu/tối ưu**, không tạo mặt người mới |
| **C — Atmosphere generated** | Cần cảnh minh hoạ (không khí, ánh sáng, chi tiết bàn tiệc) nhưng không có ảnh thật phù hợp với chủ đề đó | GPT generate — **không có mặt người rõ nét/cận cảnh**, tránh trông giả |
| **D — Product/mockup** | Nói về app/tech layer | Dùng ảnh mockup có sẵn ở `assets/brand/app-layer-elements/` và `foundersvn-app-layer-mockup-reference-2026-07-31.png` |

**Quy tắc cứng:** GPT không được dùng để vẽ founder/khách mời giả (mặt bịa, dáng bắt tay dàn dựng) — brand guide đã note rõ đây là điều phải tránh vì trông fake ngay. Ảnh có người = luôn lấy từ ảnh thật đã chụp, chỉ tinh chỉnh màu/tông. GPT chỉ generate cảnh **không có người nổi bật/cận mặt** (style C) hoặc xử lý ảnh thật (style B).

Tỉ lệ đề xuất cho cả kỳ (20 ngày social + creative ads): **~45% B (ảnh thật) / ~40% A (typography) / ~10% C (atmosphere) / ~5% D (product)** — nghiêng về ảnh thật vì đây là yếu tố "trust builder" quan trọng nhất theo Marketing Plan (brand chưa có track record, giá $150 cần bằng chứng thật).

---

## 2. ADS CONTENT PLAN (paid — Meta/FB, ngân sách $20–30)

### Chiến lược test (vì ngân sách quá nhỏ)

Đừng test cả 5 concept cùng lúc — chia nhỏ $20–30 ra 5 sẽ không đủ data để kết luận gì. Đề xuất:

1. **Vòng 1 ($15–18):** chạy song song 2 concept đối lập nhau về style — Ad 1 (typography) vs Ad 2 (photo-blend) — để biết ngay style nào giữ CTR tốt hơn cho đối tượng Đà Nẵng.
2. **Vòng 2 (phần còn lại):** đổ hết ngân sách còn lại vào concept thắng, dùng thêm 1 bản retarget (Ad 5) cho người đã click landing page nhưng chưa mua.
3. Ad 3 (scarcity 25 seats) và Ad 4 (giá/giá trị vé) giữ lại làm **organic post** thay vì trả tiền — dùng khi gần hết hạn hoặc cho warm audience.

### Format cần deliver cho mỗi concept

- **4:5 (1080×1350)** — placement chính Feed/Reels hiện tại của Meta, ưu tiên làm trước
- **1:1 (1080×1080)** — dùng lại cho organic post
- **9:16 (1080×1920)** — Stories/Reels

### Bảng concept

| # | Concept | Style ảnh | Headline (EN) | Thông tin showcase | CTA |
|---|---|---|---|---|---|
| 1 | Closer room | **A** — typography, nền Deep Pine, wavy coral line | "A closer room for better conversations." | Da Nang · July 31 (không giá, không số ghế — giai đoạn awareness) | Apply for a seat |
| 2 | Phone-free presence | **B** — ảnh thật `dinner-1.jpg` hoặc `dinner-2.jpg`, tint pine overlay | "No phones. More presence." | Không khí thật của bàn tiệc, Da Nang · July 31 | Apply for a seat |
| 3 | 25 seats only | **A** — typography, số "25" lớn, coral dot accent | "25 seats only." | Số ghế còn lại (scarcity), dùng giữa/cuối campaign khi ghế thật sự đang giảm | Apply for a seat |
| 4 | Curated dinner value | **A** — typography info-panel (ngày/venue/giá/số ghế trong khung nhỏ góc dưới) | "A curated meal. A curated room." | $150 + những gì vé bao gồm — chỉ dùng ở giai đoạn warm/retarget, không phải cold ad đầu tiên | Apply for a seat |
| 5 | After dinner follow-up | **B** — ảnh thật `networking-1.jpg` hoặc `networking-2.jpg` | "The best conversations continue after dinner." | Giá trị theo dõi sau sự kiện — dùng để retarget người đã xem landing page | Apply for a seat |

### Primary text (giữ nguyên từ bản đã lock — không đổi vì đã match brand voice)

Dùng nguyên văn primary text trong [SOCIAL-CAMPAIGN-COPY-AND-MATERIALS-V2.md](SOCIAL-CAMPAIGN-COPY-AND-MATERIALS-V2.md) — không cần viết lại, chỉ gắn đúng style ảnh ở trên cho từng concept.

### GPT image prompt cho Ad 2 & Ad 5 (style B — xử lý ảnh thật)

```
Upload: images/gallery/dinner-1.jpg (hoặc networking-1.jpg cho Ad 5)

Prompt: "Apply a cinematic color grade to this photo — deep pine green
shadows (#071A14), warm amber highlights, natural skin tones, gentle
contrast. Add a soft dark gradient vignette from the bottom third
upward so text can sit legibly over it. Do not add, remove, or alter
any people, objects, or details in the scene — color/light treatment
only. No HDR harshness, no oversaturation."
```

Sau khi có ảnh đã xử lý, chèn headline + logo wavy icon + CTA button (coral fill, bone text) bằng công cụ design (Figma/Canva), theo đúng layout đã có ở `assets/social/generated/imagegen-final/foundersvn-facebook-cover-imagegen-v2-coral-no-price.png` làm mẫu.

### GPT image prompt cho Ad 1, 3, 4 (style A — typography thuần)

```
"Square/vertical social ad graphic ([1080x1350 / 1080x1080]). Solid
deep pine green background (#071A14), no gradient, no texture.
Large bold geometric sans-serif headline in warm bone (#F2F0E8),
left-aligned, generous margin, taking up ~60-70% of canvas width.
One thin ember coral (#E7644A) wavy line accent crossing the lower
third, with a single small solid coral dot at one curve point. Small
minimal wavy 'W' icon mark top-left in coral. Small caption bottom-
left in coral: '[Da Nang · July 31]'. Rounded coral CTA pill button
bottom area: '[Apply for a seat]' in bone text with small arrow.
No photos, no illustration, no serif font, no gold. Clean, editorial,
premium-hospitality feel, not SaaS/corporate.

Headline text: '[HEADLINE FROM TABLE ABOVE]'"
```

---

## 3. SOCIAL CONTENT PLAN — lịch đăng 12–31/07/2026

Giữ nguyên chủ đề ngày theo [SOCIAL-CONTENT-PLAN-JULY-2026.md](SOCIAL-CONTENT-PLAN-JULY-2026.md), bổ sung style ảnh + brief ảnh cụ thể cho từng ngày (đây là phần đang thiếu để đưa cho GPT).

| Ngày | Chủ đề | Style | Nguồn ảnh / Brief cho GPT |
|---|---|---|---|
| Jul 12 | Launch/announcement | **B** | `group-photo.jpg` — tint pine, đây là ảnh "ra mắt", cần cảm giác thật & đông vui |
| Jul 13 | Vì sao phone-free | **A** | Typography — câu quote, không ảnh |
| Jul 14 | Curated room | **A** | Typography — nhấn "curated", có thể thêm graphic line motif thay vì text thuần |
| Jul 15 | Dinner value | **B** | `dinner-1.jpg` hoặc `dinner-2.jpg` — cận cảnh bàn ăn, ánh nến |
| Jul 16 | Ai nên apply | **A** | Typography — câu hỏi tu từ, coral accent |
| Jul 17 | App hỗ trợ (tech layer) | **D** | Dùng `assets/brand/app-layer-elements/` hoặc `foundersvn-app-layer-mockup-reference-2026-07-31.png` — crop 1 màn hình profile, không show toàn bộ UI |
| Jul 18 | Anti-business-card | **A** | Typography — statement ngắn, punchy |
| Jul 19 | Venue/mood | **B** | `venue-wide.jpg` hoặc `venue-detail.jpg` — không khí không gian, không cần người |
| Jul 20 | Scarcity 25 seats | **A** | Typography — số "25" cực lớn làm hero visual |
| Jul 21 | Cross-industry mix | **C** | Không có ảnh thật nào thể hiện "đa ngành" → generate: *"Photoreal, wide shot of an intimate dinner room, multiple small hosted tables, warm ambient light, guests in soft focus/backs turned (no clear faces), documentary style, deep pine shadows + warm amber highlights, no purple-blue tones, no surreal AI props, 1:1 crop"* |
| Jul 22 | Hosted tables | **B** | `networking-1.jpg` hoặc `networking-2.jpg` — nhiều bàn trong khung hình |
| Jul 23 | Dinner + presence | **A** | Typography — 3 dòng ngắn (dinner / phone-free / curation) |
| Jul 24 | Vé bao gồm gì | **A** | Typography info-panel — liệt kê 4 dòng: dinner, hosted intro, directory, follow-up |
| Jul 25 | Anti-networking | **A** | Typography — quote đối lập ("no badge-scanning...") |
| Jul 26 | Mở đơn apply | **B** | `group-photo.jpg` (crop khác Jul 12 để tránh lặp) — năng lượng, kêu gọi hành động |
| Jul 27 | Tuần cuối | **A** | Typography — đếm ngược, coral heavy |
| Jul 28 | Social proof placeholder | **B** | `dinner-2.jpg` hoặc `networking-1.jpg` — chưa có testimonial thật nên dùng ảnh thật thay social proof |
| Jul 29 | Last call | **A** | Typography — urgency, coral chiếm phần lớn nền thay vì pine |
| Jul 30 | Ngày mai | **C** | Không có ảnh "trước giờ khách đến" thật → generate: *"Photoreal shot of an empty-but-set intimate dining room at dusk, tables set with linen and candles not yet lit fully, warm string lighting, anticipation mood, no people, deep pine + warm amber tones, cinematic, 4:5 crop"* |
| Jul 31 | Event day | **B** | `venue-wide.jpg` hoặc best group shot — hero ảnh thật cho ngày diễn ra |

**Phân bổ cuối:** 9 ngày Typography (A) · 7 ngày Photo-blend thật (B) · 2 ngày Atmosphere generated (C) · 1 ngày Product mockup (D) — không có ngày nào dùng ảnh người do AI tạo ra.

---

## 4. Checklist deliverable

- [ ] Export mỗi post ở 3 kích cỡ: 1:1 (feed), 4:5 (feed ưu tiên hiện tại), 9:16 (story)
- [ ] Đặt tên file theo format đã dùng: `foundersvn-social-[ngày]-[theme-slug]-[style].png`, lưu vào `assets/social/generated/social-plan-jul2026/`
- [ ] Ad creative lưu riêng vào `assets/social/generated/ads-plan/`
- [ ] Trước khi xuất bản paid: kiểm tra lại text trên ảnh generate bằng tay (GPT hay viết sai chính tả trong ảnh) — đã note sẵn trong V2 doc
- [ ] Check lại logo dùng đúng file SVG có sẵn (`assets/brand/founders-vn-wavy-icon-*`), không để GPT tự vẽ logo mới
