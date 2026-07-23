# GPT Image Handoff — cách gen bundle ảnh

_Mục đích: brief để đưa cho image-gen (ChatGPT / Codex có image gen 2.2 / gpt-image)._

## ⚠️ QUAN TRỌNG — đọc trước

- **Phải dùng MODEL TẠO ẢNH, KHÔNG render bằng code/SVG/HTML.** Card vẽ bằng code ra phẳng, tĩnh, nhìn như placeholder — không dùng được cho ads.
- **Mọi creative đều DYNAMIC + BLEND ẢNH THẬT làm mặc định.** Không còn kiểu typography nền phẳng. Base luôn là một ảnh thật hoà vào lớp wash Deep Pine, có chiều sâu điện ảnh, đường cong coral chuyển động, vignette — cảm giác ánh sáng đang di chuyển trong phòng.
- **Nếu công cụ đọc được path** (Codex): trỏ thẳng vào `images/gallery/`. **Nếu không** (ChatGPT thường): **upload ảnh gốc** kèm mỗi prompt.
- Headline có thể để model đặt lên ảnh, NHƯNG model hay sai chính tả → kiểm tra kỹ, hoặc gen nền dynamic rồi tự chèn chữ bằng Canva/Figma cho nét.

## Quy trình 3 bước

1. **Dán khối "MASTER BRIEF" bên dưới** vào ChatGPT trước tiên (1 lần đầu session). Đây là bộ nhớ brand để GPT giữ xuyên suốt.
2. **Chạy từng bundle.** Với mỗi ảnh, copy prompt tương ứng. Ảnh nào ghi `[UPLOAD: file]` thì kéo file đó từ máy vào ChatGPT cùng lúc.
3. **Lưu ảnh ra** đúng tên gợi ý, bỏ vào `assets/social/generated/social-plan-jul2026/` (social) hoặc `ads-plan/` (ads).

> ChatGPT gen 1 ảnh/lượt. Bundle 1 (typography) không cần upload → chạy liên tục nhanh nhất, làm trước. Bundle 2 (ảnh thật) phải upload từng file.

---

## MASTER BRIEF (dán đầu tiên)

```
You are my brand designer for "FoundersVN" — a curated, phone-free
networking DINNER for founders & business owners. First edition:
Da Nang, Vietnam, Friday July 31, 2026. 25 seats. Premium hospitality
feel, editorial, calm — NOT SaaS/corporate, NOT luxury/gold.

Hold these constants for every image I ask for:

COLORS
- Deep Pine #071A14  (main background)
- Warm Bone #F2F0E8  (text on dark)
- Ember Coral #E7644A (the ONLY accent — CTA, one wavy line, small dot)
- Moss #8A9A5B, Mineral Mist #A9BBB6 (quiet secondary only)

TYPE
- Aeonik-style geometric sans-serif, matching the brand board:
  rounded, modern, spacious, calm, premium.
- Use Semibold/Bold weight, NOT ultra-condensed poster type.
- No serif. No negative letter-spacing. No tall condensed grotesque.
- Large, airy headlines with the same feeling as the Aeonik sample in
  `08-brand/FOUNDERSVN-BRAND-SYSTEM.md`.

HARD RULES (do not break)
- No purple-blue tech gradients, no glossy 3D blobs.
- No gold, no luxury/old-money cues.
- Never invent people's faces or fake founders. If a scene needs
  humans, I will UPLOAD a real photo — you only color-grade it.
- Generated scenes must have NO clear human faces (backs turned /
  soft focus / empty rooms only).
- LOGO LOCKUP: use the full FoundersVN wordmark as visual reference
  (`assets/brand/founders-vn-logo.svg` / `assets/founders-vn-logo-kit/founders-vn-logo.png`),
  and set the tagline "Phone-Free Networking for Founders" small directly
  BENEATH the wordmark — the wordmark + tagline together as one lockup, so
  it reads as an event/firm brand, not a stray logo. Place it small and
  clean near the top-left. Do NOT use a square app-icon logo. Do NOT draw
  an empty square, frame, box, or placeholder outline anywhere.
- FONT: Aeonik-style geometric sans, matching the brand board:
  rounded terminals, clean circular geometry, spacious, modern,
  premium-hospitality. Use Semibold/Bold. Do NOT use tall condensed
  poster fonts, Impact-like fonts, Bebas/Anton-style fonts, narrow
  grotesques, or aggressive campaign typography.
- CTA: rounded Ember Coral pill, "Apply for a seat", bone text with a
  small arrow. Place it in the visual eye-area near the headline, around
  the middle/center zone of the image — not stuck at the bottom/footer.
  It should feel connected to the message, not detached.
- SUPPORTING LINE (ads MUST show this): a small, smooth, natural sentence
  near the CTA that adds context about what the evening is — a warm,
  complete sentence, NOT choppy fragments, and not over-terse. In Warm
  Bone / Mineral Mist, about half the caption size, quieter than the
  headline. Example tone:
  "Join a group of 25 entrepreneurs for one intimate evening in Da Nang."
  (Pick one from the SUPPORTING-LINE BANK I give per creative.)
- EVENT CAPTION: always write the full event info, never just "July 31".
  Use: "Friday, July 31 · Da Nang · FOR YOU SteakHouse". Small, in Ember Coral.
- LAYOUT — key info stays grouped in one central content block: logo
  lockup, headline, supporting line, CTA, AND the event caption all sit
  together in the upper-to-middle content stack. Do NOT pin the date/
  caption to the very bottom edge or the margins. Important info is never
  thrown to the footer or corners — keep it in the eye-area with the rest.
- Spell any on-image text EXACTLY as given. Double-check spelling.

STYLE (default for every creative)
- DYNAMIC, cinematic, blended with a REAL photo I provide. Not flat.
- Deep depth: pine wash, warm amber light, a flowing coral accent line,
  vignette — like light moving through a room.
- NEVER render as code / SVG / HTML. Always use the image gen model.

OUTPUT (ratio is strict — do not guess)
- DEFAULT: Instagram portrait 4:5, exactly 1080 x 1350 px. This is the
  default for every feed creative.
- Story/Reels only when I say so: 9:16, 1080 x 1920 px.
- NEVER output 1:1 square and NEVER output a tall 9:16 by accident for a
  feed post. If unsure, use 4:5 1080x1350.

Reply "ready" and wait for my first prompt.
```

---

## ★ PRIORITY 0 — PIVOT (làm ngay, duyệt xong mới nhân rộng)

Hai creative chủ lực. Mọi thứ khác nhân từ 2 cái này ra. Dán MASTER BRIEF trước, rồi bắn 2 prompt dưới.

### PIVOT AD — Angle 1 (cold ad chủ lực)

- **Base:** `images/gallery/networking-2.jpg` (mingling thật, đa quốc tịch, năng lượng)
- **Headline (chốt):** `In Da Nang for a biz trip? Don't just work. Connect.`
- **Primary text (Meta ad body):** "One night in Da Nang with 25 founders and operators, Vietnamese and international. A phone-free dinner, hosted introductions, real conversations. Skip the small talk and meet the people who move your next deal. Friday, July 31 · FOR YOU SteakHouse · 25 seats."
- **CTA:** Apply for a seat
- **Save as:** `assets/social/generated/ads-plan/PIVOT-ad-angle1-biztrip.png`

```
Use the image generation model (image gen 2.2 / gpt-image). Do NOT
render as code/SVG.

Base image: images/gallery/networking-2.jpg

Turn it into a cinematic FoundersVN ad, portrait 4:5, exactly 1080 x 1350 px
(NOT square, NOT 9:16 tall):
- Blend the photo into a deep pine (#071A14) wash: pine shadows, warm
  amber highlights, natural skin tones, real cinematic depth. Keep the
  real people exactly as they are — do NOT invent or alter faces.
- Darken the left side into near-solid pine so a headline reads over it;
  keep the mingling crowd visible and glowing on the right.
- Add dynamic light: a thin flowing Ember Coral (#E7644A) curved line
  sweeping across with one small solid coral dot; soft vignette; a gentle
  directional glow like light moving through the room.
- Headline, large Aeonik-style geometric sans in Warm Bone (#F2F0E8),
  Semibold/Bold, rounded, spacious, brand-board feeling, NOT condensed,
  upper-left, spelled EXACTLY: "In Da Nang for a biz trip? Don't just work. Connect."
- Small full FoundersVN wordmark top-left, following the supplied
  `assets/brand/founders-vn-logo.svg` / `assets/founders-vn-logo-kit/founders-vn-logo.png`
  reference. Do NOT use a square logo. Do NOT draw any empty square,
  frame, or placeholder box.
- In the center/eye-area under the headline: one small, smooth supporting
  sentence in Warm Bone (see bank below) — this MUST be visible — and
  directly under it a rounded Ember Coral CTA pill "Apply for a seat"
  (bone text, small arrow). Keep CTA + supporting line together in the
  middle zone, NOT the footer.
- Small coral caption directly under the CTA, inside the same central
  content block (NOT the bottom edge): "Friday, July 31 · Da Nang · FOR YOU SteakHouse".
- Logo lockup (wordmark + "Phone-Free Networking for Founders" tagline
  beneath it) small, top-left.
- Premium, editorial, dynamic. Not flat, not SaaS, no gold.
```

**SUPPORTING-LINE BANK cho ad này** (chọn 1 — câu mượt, có thông tin):
- Join a group of 25 entrepreneurs for one intimate evening in Da Nang.
- Spend an evening with 25 founders and business owners over a curated dinner.
- An intimate dinner where 25 founders actually get to know each other.
- Meet 25 founders and operators over dinner, without the noise of a big mixer.
- One curated evening with 25 entrepreneurs who came to connect, not to pitch.

### PIVOT POST — Launch / announcement (post chủ lực, Jul 12)

- **Base:** `images/gallery/dinner-1.jpg` (bàn tiệc phone-free đúng chất event)
- **Headline (chốt):** `FoundersVN is coming to Da Nang.`
- **Caption đăng bài:** "FoundersVN is coming to Da Nang. A phone-free dinner for 25 founders and operators who want deeper conversations, not louder networking. Friday, July 31 · FOR YOU SteakHouse. Applications open now."
- **Save as:** `assets/social/generated/social-plan-jul2026/PIVOT-post-jul12-launch.png`

```
Use the image generation model (image gen 2.2 / gpt-image). Do NOT
render as code/SVG.

Base image: images/gallery/dinner-1.jpg

Turn it into a cinematic FoundersVN launch graphic, portrait 4:5, exactly
1080 x 1350 px (NOT square, NOT 9:16 tall — this is a feed post):
- Blend the dinner scene into a deep pine (#071A14) wash: pine shadows,
  warm amber candle-light highlights, natural skin tones, real depth.
  Keep the room and people exactly as they are — do NOT alter faces.
- Add a soft dark gradient across the lower third so a headline reads
  clearly; keep the warm dinner tables glowing above.
- Add a thin flowing Ember Coral (#E7644A) curved line with one small
  coral dot; subtle vignette; dynamic, like light in the room.
- Headline, large Aeonik-style geometric sans in Warm Bone,
  Semibold/Bold, rounded, spacious, brand-board feeling, NOT condensed,
  lower area, spelled EXACTLY: "FoundersVN is coming to Da Nang."
- Small full FoundersVN wordmark top-left, following the supplied
  `assets/brand/founders-vn-logo.svg` / `assets/founders-vn-logo-kit/founders-vn-logo.png`
  reference. Do NOT use a square logo. Do NOT draw any empty square,
  frame, or placeholder box.
- Small coral caption grouped WITH the headline (just above or below it,
  in the central content block — NOT the bottom edge):
  "Friday, July 31 · Da Nang · FOR YOU SteakHouse". No CTA button on this one.
- Logo lockup (wordmark + "Phone-Free Networking for Founders" tagline
  beneath it) small, top-left.
- Premium, editorial, cinematic, warm. Not flat, no gold.
```

> Nếu model đặt chữ bị sai/lệch: gen phần **nền dynamic (bỏ dòng headline/caption/CTA)** rồi tự chèn text bằng Canva/Figma cho nét.

---

## ★ ADS BATCH — pivot + 2 (làm trước, CHỈ ads)

3 ad để chạy test đầu tiên. Cover 2 hướng: **Angle 1 audience-centric** (2 ad) vs **Angle 3 pain-point** (1 ad). Tất cả theo MASTER BRIEF: 4:5 1080×1350, logo lockup có tagline, sub-copy mượt bắt buộc hiện, CTA giữa, caption "Friday, July 31 · Da Nang · FOR YOU SteakHouse".

### Ad 1 = PIVOT (đã có ở PRIORITY 0)
- Base `networking-2.jpg` · Headline "In Da Nang for a biz trip? Don't just work. Connect."
- Sub-copy: "Join a group of 25 entrepreneurs for one intimate evening in Da Nang."
- Save as `assets/social/generated/ads-plan/PIVOT-ad-angle1-biztrip.png`

### Ad 2 — Angle 1C (explore VN market)
- **Base:** `images/gallery/networking-1.jpg`
- **Headline:** `Exploring the Vietnam market? Meet the founders already in it.`
- **Sub-copy:** `Spend an evening with 25 founders and operators already building in Vietnam.`
- **Save as:** `assets/social/generated/ads-plan/ad-angle1C-explore-market.png`

```
Use the image generation model (image gen 2.2 / gpt-image). Do NOT render
as code/SVG. Base image: images/gallery/networking-1.jpg

Portrait 4:5, exactly 1080 x 1350 px (NOT square, NOT 9:16). Blend the
photo into a deep pine (#071A14) cinematic wash: pine shadows, warm amber
highlights, natural skin tones, real depth. Keep the real people exactly
as they are — do NOT invent or alter faces. Darken one side so text reads.
Add a thin flowing Ember Coral (#E7644A) curved line with one small coral
dot, soft vignette, gentle directional glow.

- Logo lockup top-left: FoundersVN wordmark with "Phone-Free Networking
  for Founders" small beneath it. No square logo, no empty box.
- Headline, Aeonik-style geometric sans, Warm Bone, Semibold/Bold, rounded,
  spacious, NOT condensed, upper area, spelled EXACTLY:
  "Exploring the Vietnam market? Meet the founders already in it."
- Center/eye-area: smooth supporting line in Warm Bone (MUST be visible):
  "Spend an evening with 25 founders and operators already building in Vietnam."
  and directly under it a rounded coral CTA pill "Apply for a seat"
  (bone text, small arrow) — kept together in the middle, NOT the footer.
- Small coral caption directly under the CTA, inside the same central
  content block (NOT the bottom edge): "Friday, July 31 · Da Nang · FOR YOU SteakHouse".
- Premium, editorial, dynamic. Not flat, no gold.
```

### Ad 3 — Angle 3 (pain-point, test đối trọng)
- **Base:** `images/gallery/dinner-1.jpg`
- **Headline:** `Most networking is noise. This is 25 people worth meeting.`
- **Sub-copy:** `An intimate dinner where 25 founders actually get to know each other.`
- **Save as:** `assets/social/generated/ads-plan/ad-angle3-noise.png`

```
Use the image generation model (image gen 2.2 / gpt-image). Do NOT render
as code/SVG. Base image: images/gallery/dinner-1.jpg

Portrait 4:5, exactly 1080 x 1350 px (NOT square, NOT 9:16). Blend the
dinner scene into a deep pine (#071A14) cinematic wash: pine shadows, warm
amber candle-light highlights, natural skin tones, real depth. Keep the
room and people exactly as they are — do NOT alter faces. Darken one area
so text reads. Add a thin flowing Ember Coral (#E7644A) curved line with
one small coral dot, soft vignette.

- Logo lockup top-left: FoundersVN wordmark with "Phone-Free Networking
  for Founders" small beneath it. No square logo, no empty box.
- Headline, Aeonik-style geometric sans, Warm Bone, Semibold/Bold, rounded,
  spacious, NOT condensed, upper area, spelled EXACTLY:
  "Most networking is noise. This is 25 people worth meeting."
- Center/eye-area: smooth supporting line in Warm Bone (MUST be visible):
  "An intimate dinner where 25 founders actually get to know each other."
  and directly under it a rounded coral CTA pill "Apply for a seat"
  (bone text, small arrow) — kept together in the middle, NOT the footer.
- Small coral caption directly under the CTA, inside the same central
  content block (NOT the bottom edge): "Friday, July 31 · Da Nang · FOR YOU SteakHouse".
- Premium, editorial, dynamic. Not flat, no gold.
```

---

## PROMPT CHUẨN — Dynamic photo-blend (dùng cho MỌI creative)

Đây là công thức chung. Base là ảnh thật + wash pine cinematic + coral chuyển động + headline. Với Codex đọc path thì ghi thẳng path; với ChatGPT thì upload ảnh.

```
Use the image generation model (image gen 2.2 / gpt-image) — do NOT
render this as code/SVG.

Base image: <PATH hoặc UPLOAD: images/gallery/xxx.jpg>

Transform it into a cinematic FoundersVN ad:
- Blend the photo into a deep pine (#071A14) wash: pine shadows, warm
  amber highlights, natural skin tones, real depth — not flat.
- Keep the real people/scene as-is; do NOT invent or alter faces.
- Add dynamic light: a soft directional glow, a thin flowing Ember
  Coral (#E7644A) curved line sweeping across with one small coral
  dot, gentle vignette — like light moving through the room.
- Darken one side so the headline reads clearly over it.
- Large Aeonik-style geometric sans headline in Warm Bone, Semibold/Bold,
  rounded, spacious, modern, premium, NOT condensed, spelled EXACTLY:
  "<HEADLINE>"
- Small full FoundersVN wordmark top-left, following the supplied
  `assets/brand/founders-vn-logo.svg` / `assets/founders-vn-logo-kit/founders-vn-logo.png`
  reference. Do NOT use a square logo. Do NOT draw any empty square,
  frame, or placeholder box.
- In the center/eye-area under the headline: one small, smooth supporting
  sentence in Warm Bone that adds context (MUST be visible; e.g. "Join a
  group of 25 entrepreneurs for one intimate evening in Da Nang."), with a
  rounded coral CTA pill "Apply for a seat" directly under it — kept
  together in the middle zone, NOT the footer.
- Small coral caption directly under the CTA, in the same central content
  block (NOT the bottom edge): "Friday, July 31 · Da Nang · FOR YOU SteakHouse".
- Logo lockup (wordmark + "Phone-Free Networking for Founders" tagline
  beneath it) small, top-left.
- Portrait 4:5, exactly 1080 x 1350 px by default (NOT square, NOT 9:16).
  Use 9:16 1080x1920 only when I ask for story/reels. Premium, dynamic.
```

> **Fully image-gen (đã chốt):** model làm hết trong 1 ảnh. Font chỉ gần giống brand font (Aeonik-style) và logo/wordmark là model vẽ bám theo file gốc, không phải file SVG thật. Nếu model đặt chữ **sai chính tả** hoặc ra **sai ratio (9:16 / vuông)** thì gen lại, đừng dùng bản sai.

---

## BUNDLE 1 — Ads (ưu tiên, làm trước)

| Save as | Base image (`images/gallery/`) | HEADLINE |
|---|---|---|
| `ad-angle1A-biztrip.png` | `networking-2.jpg` | In Da Nang for a biz trip? Don't just work. Connect. |
| `ad-angle1B-like-you.png` | `group-photo.jpg` | Connect with founders, owners & entrepreneurs like you. |
| `ad-angle1C-explore-market.png` | `networking-1.jpg` | Exploring the Vietnam market? Meet the founders already in it. |
| `ad-angle1D-expand-vn.png` | `dinner-2.jpg` | Expanding your value chain into Vietnam? |
| `ad-angle2A-phone-free.png` | `dinner-1.jpg` | Phone-free networking event for founders. |
| `ad-angle2B-no-biz-card.png` | `networking-1.jpg` | The no-business-card networking dinner for entrepreneurs. |
| `ad-angle3B-right-people.png` | `dinner-1.jpg` | Find the right people, not a room full of business cards. |
| `ad-angle3C-noise.png` | `group-photo.jpg` | Most networking is noise. This is 25 people worth meeting. |

**Angle 3A (khiêu khích, coral-heavy):** dùng ảnh `venue-detail.jpg`, thêm vào prompt: `push the Ember Coral much stronger — coral should dominate the wash, pine only in shadows.` → HEADLINE `Tired of loud, pointless networking events?` → `ad-angle3A-tired.png`

---

## BUNDLE 2 — Social (làm sau khi duyệt bundle 1)

> **Social thừa hưởng TOÀN BỘ rule của ads** — dùng chung MASTER BRIEF trong
> `04-marketing/ADS-BANNER-HANDOFF.md` (logo lockup + tagline; logo canh CÙNG
> trục lề với headline; 5 component ở vùng trung tâm; ngày đầy đủ "Friday,
> July 31 · Da Nang · FOR YOU SteakHouse" không để dưới đáy; font Aeonik rounded;
> **KHÔNG dùng group-photo.jpg**; tránh 2 ông Ấn áo be/áo nâu — crop bỏ/để
> shadow). Chỉ khác: social có thể bỏ CTA pill (post không cần "Apply").
> **Ratio social:** 4:5 feed (1080×1350) + 9:16 story (1080×1920). Khi extend
> 9:16, thêm nền pine/bokeh venue — **KHÔNG đẻ thêm người/mặt mới**.

| Save as | Base image (`images/gallery/`) | HEADLINE / caption |
|---|---|---|
| `social-jul12-launch.png` | `dinner-1.jpg` (= PIVOT post, đã có) | FoundersVN is coming to Da Nang. |
| `social-jul15-dinner.png` | `dinner-1.jpg` | Dinner sets the rhythm. |
| `social-jul16-biztrip.png` | `networking-2.jpg` | In Da Nang for a biz trip? Don't just work. Connect. |
| `social-jul19-venue.png` | `venue-wide.jpg` | FOR YOU SteakHouse. Da Nang. |
| `social-jul20-25-seats.png` | `dinner-2.jpg` ⚠crop-left | 25 seats only. |
| `social-jul22-tables.png` | `networking-1.jpg` ⚠crop | Hosted tables, not one long table. |
| `social-jul23-like-you.png` | `dinner-1.jpg` | Founders, owners & entrepreneurs like you. |
| `social-jul26-apply.png` | `venue-wide.jpg` | Applications are open. |
| `social-jul28-expand-vn.png` | `venue-detail.jpg` | Expanding into Vietnam? Start with the room. |

### APP POST (Jul 17) — style D, image-gen vẽ luôn mockup (đảm bảo nhất quán UI)

Bài về app/tech layer. Để image-gen **tự render mockup phone + màn hình app** (đừng ghép cứng PNG). Reference chỉ để giữ **cùng gu**, **KHÔNG cần giống 100%** — model được tự biến tấu layout/nội dung UI.

- **UI reference (tham khảo gu, không copy cứng):** `assets/brand/app-layer-elements/phone-directory-transparent.png`
- **Giữ nhất quán gu app:** nền app Deep Pine, card khách Warm Bone bo góc, accent Ember Coral, đúng loại màn (directory "Who's coming" / "Tonight"), card có tên + role + tag ngành, nav dưới kiểu Ask / Offer / Connect / Saved. Chi tiết cụ thể có thể khác reference.
- **Scene:** phone dựng nghiêng nhẹ trên nền Deep Pine wash (có thể `venue-wide.jpg` blur tint pine phía sau), 1 đường coral mảnh + vignette, glow ấm.
- **Headline:** `Know the room before you arrive.`
- **Sub-copy:** `Before dinner, see who's coming — what they do and what they're looking for. During dinner, phones away.`
- **CTA (bài này CÓ CTA — mục tiêu awareness + kéo action về app):** pill Ember Coral, chọn 1:
  - `See who's coming →` (app-flavored, khớp màn "Who's coming" — ưu tiên)
  - `Apply to see the room →`
  - `Apply for a seat →` (đồng bộ campaign)
  > Lưu ý funnel: quyền vào app có SAU khi apply/được duyệt → CTA dẫn về landing/apply, không hứa "dùng ngay" nếu chưa có bản public preview.
- **Logo lockup** top-left.
- Ratio 4:5 (1080×1350) + 9:16 story nếu cần.
- **Save as:** `social-jul17-app.png` (thêm biến thể: `-v2`, `-v3`…)
- ⚠ Chữ trong UI ngắn gọn, dễ đọc — image-gen hay sai chính tả trong màn app, review kỹ, sai thì gen lại.

**APP PROMO COPY BANK** (mỗi bộ = 1 góc khác → làm nhiều biến thể app promo):

**A. PRE-EVENT (dùng cho Jul 17, giai đoạn bán vé):**

Mỗi bộ gắn với 1 màn app cụ thể (cột "Màn app") — đó là lý do chúng "có nghĩa": chạm được vào 1 feature thật, không phải slogan trừu tượng. Cột **Timeline** = ngày dự kiến đăng.

**✅ CHẠY ĐƯỢC (màn đã có trong app):**

| # | Góc | Headline | Sub-copy | CTA | Màn app | Timeline |
|---|---|---|---|---|---|---|
| 1 | Chuẩn bị trước | Know the room before you arrive. | See who's coming — what they do, what they're looking for — before dinner even starts. | See who's coming → | "Who's coming" directory | **Jul 17 — feed 4:5** (app reveal chính) |
| 2 | Convo trước, card sau | Stay in the conversation. The card can wait. | No fumbling for business cards mid-sentence. The app saves every contact, so you stay present now and swap details later. | See how it works → | "Tonight" (phone-free + Get contact) | **Jul 24 — story 9:16** (ngày feed = "vé gồm gì") |
| 4 | Chỗ ngồi đã sắp | Your table's already picked. Just show up. | Curated seating places you with people worth meeting — no standing around wondering where to sit. | See how it works → | "Tonight" (Table assignment) | **Jul 22 — story 9:16** (ngày feed = "hosted tables") |

**⏸ PENDING (màn/feature CHƯA có — đừng gen, chờ app build):**

| # | Góc | Headline | Màn cần | Timeline |
|---|---|---|---|---|
| 3 | Ask / Offer | See what they're looking for, before you sit down. | Profile chi tiết (Looking for / Offers) — **chưa có** | khi app có màn profile |
| 5 | Gợi ý người nên gặp | The app tells you who to meet — and why. | Suggested intros / who-to-meet — **chưa có** | khi app có feature này |

**B. POST-EVENT SERIES (chuỗi bài SAU 31/7 — tease event kế):**

Feature "next event" đã có. Showcase dùng **mockup** (chưa phải data thật), làm sau sự kiện để kéo người sang event #2.

| # | Góc | Headline | Sub-copy | CTA | Timeline |
|---|---|---|---|---|---|
| B1 | Bắt ở event sau | The room doesn't end at one dinner. | See who's joining the next event, so a connection you didn't finish tonight can continue at the next one. | See who's coming next → | **sau Jul 31** (post-event) |
| B2 | Nối tiếp qua các kỳ | Miss someone tonight? Catch them next time. | The app shows who's coming to upcoming FoundersVN events — the network keeps going long after the plates are cleared. | See who's next → | **sau Jul 31** (post-event) |

> ⚠ Nhóm B: showcase = mockup, KHÔNG dùng data/mặt khách thật. Chạy sau sự kiện, không trộn vào lịch pre-event.

**Màn app gợi ý cho từng angle (để mockup khớp thông điệp):**

| Angle | Màn app nên show | Nhấn vào chi tiết nào | Asset |
|---|---|---|---|
| 1 — Know the room | Màn **"Who's coming"** (directory khách) | Danh sách khách + tag ngành → cảm giác "thấy cả phòng trước khi đến" | `phone-directory-transparent.png` (có sẵn) |
| 2 — Card can wait | Màn **"Tonight"** | Toggle **"Phone-free" ON** + nút **"Get contact" / "Connect"** → contact vào app, khỏi loay hoay card, cứ trò chuyện | `phone-tonight-transparent.png` (có sẵn) |
| 3 — Room doesn't end | **Mockup MỚI:** màn "Upcoming / Next event" | Card event kế + preview "who's coming" | chưa có → dựng mockup |
| 4 — Catch next time | **Mockup MỚI:** profile khách có badge "Also at the next event" | 1 profile + tag "joining the next event" | chưa có → dựng mockup |

> Reference chỉ để giữ **nhất quán gu app** (nền pine, card bone, accent coral, đúng loại màn) — **KHÔNG cần copy 100%**. Image-gen được tự biến tấu layout/nội dung UI miễn nhìn ra cùng một app. Nhóm B dựng thêm màn mockup ở giai đoạn post-event.

---

## FOOD SERIES — steak & lobster (2 bài/tuần, feed + story)

Pillar "it's a dinner first". Hero dish = **steak & lobster**. Chi tiết bài trong `SOCIAL-CONTENT-CALENDAR.xlsx` sheet "Food Series".

**⚠ Luật ảnh đồ ăn (quan trọng):**
- **PHẦN ĂN THỰC TẾ như nhà hàng — KHÔNG phóng đại, KHÔNG oversized.** Không steak/lobster khổng lồ, không tháp đồ ăn, không AI-surreal.
- Photoreal, plating gọn gàng, ánh sáng ấm (amber), đặt trên bàn linen của FOR YOU SteakHouse, tông pine/amber cinematic.
- Nếu có **ảnh món thật** → ưu tiên dùng, chỉ color-grade. Chưa có thì generate theo luật trên.
- Text/headline + logo lockup như các post khác. Feed 4:5, story 9:16.

```
Prompt mẫu (food): Photoreal food shot, portrait 4:5 (hoặc 9:16 story).
A single well-plated [steak | lobster | steak & lobster] on a dark
restaurant plate, REALISTIC restaurant portion — not oversized, not
exaggerated. Warm amber light, linen table at FOR YOU SteakHouse, deep pine
cinematic tone, shallow depth of field. No AI-surreal shapes, no giant
portions, no text baked into the food. Then overlay headline in Warm
Bone (Aeonik-style), logo lockup top-left, coral accent line.
Headline: "<từ Food Series sheet>"
```

---

## BUNDLE 3 — Atmosphere generated (style C) · KHÔNG upload, KHÔNG mặt người

```
Photoreal, portrait 4:5 (1080x1350). Wide shot of an intimate dinner
room with multiple small hosted tables, warm ambient light, guests in
soft focus with backs turned — NO clear faces. Documentary style. Deep
pine shadows + warm amber highlights. No purple-blue, no surreal AI
props, no text.
```
→ lưu `social-jul21-cross-industry.png`

```
Photoreal, 4:5. Empty-but-set intimate dining room at dusk: linen,
candles, warm string lighting, anticipation mood. NO people, no text.
Deep pine + warm amber tones, cinematic.
```
→ lưu `social-jul30-tomorrow.png`

---

## Lưu ý cuối

- **Style D (app mockup, Jul 17):** không gen mới — crop từ `foundersvn-app-layer-mockup-reference-2026-07-31.png` có sẵn.
- Ảnh gốc để upload nằm ở: `images/gallery/` (dinner-1, dinner-2, group-photo, networking-1, networking-2, venue-wide, venue-detail).
- Sau khi gen xong bundle 1+3, gộp lại review 1 lượt xem có ảnh nào GPT viết sai chữ không rồi mới đưa lên.
