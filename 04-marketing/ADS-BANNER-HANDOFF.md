# FoundersVN — Ads Banner Handoff (FULL) for image-gen

_Bản handoff hoàn chỉnh để GPT/Codex gen **một loạt ad banner**. Chỉ tập trung ADS. Fully image-gen (image gen 2.2 / gpt-image), KHÔNG render code/SVG._

## Cách dùng

1. Dán **MASTER BRIEF** (mục 1) vào image-gen 1 lần đầu.
2. Chọn layout (mục 3) + CTA (mục 4) + sub-copy (mục 5) cho mỗi banner, hoặc chạy thẳng **AD MATRIX** (mục 7) đã gán sẵn.
3. Gen mỗi banner ở **3 ratio** (4:5 / 9:16 / 16:9), lưu vào 3 folder con tương ứng trong `assets/social/generated/ads-plan/` (xem mục 7).
4. Gen xong crop/export lại đúng số px của từng ratio cho chắc.

---

## 1. MASTER BRIEF (dán đầu tiên)

```
You are my brand designer for "FoundersVN" — a curated, phone-free
networking DINNER for founders & business owners. First edition:
Da Nang, Vietnam, Friday July 31, 2026. 25 seats. Premium hospitality,
editorial, calm. NOT SaaS/corporate, NOT luxury/gold.

I will ask you to generate a SERIES of ad banners. For every one, hold
these constants:

COLORS
- Deep Pine #071A14  (main background / wash)
- Warm Bone #F2F0E8  (headline + text on dark)
- Ember Coral #E7644A (the ONLY accent: CTA, one flowing line, small dot)
- Moss #8A9A5B, Mineral Mist #A9BBB6 (quiet secondary only)
- Do NOT use Moss/Mineral Mist for headline words. Headline must stay
  Warm Bone, with optional Ember Coral emphasis on ONE short word only.

FONT (strict)
- Aeonik-style geometric sans: rounded terminals, clean circular geometry,
  spacious, modern, premium. Semibold/Bold for headlines.
- NO condensed/poster fonts, NO Impact/Bebas/Anton, NO narrow grotesque,
  NO serif, NO negative letter-spacing.

LOGO LOCKUP (strict)
- Full "FoundersVN" wordmark with tagline "Phone-Free Networking for
  Founders" small directly beneath it, as ONE lockup. Reference:
  assets/brand/founders-vn-logo.svg / assets/founders-vn-logo-kit/founders-vn-logo.png
- NO square app-icon logo. NO empty square/frame/box/placeholder anywhere.

ALIGNMENT (strict — this is a common mistake)
- The logo lockup MUST share the SAME edge/axis as the headline. If the
  headline is left-aligned at margin X, the logo lockup sits at the exact
  same left margin X. If the layout is centered, both are centered on the
  same axis. Never give the logo a different indent from the headline.
- All text elements line up on ONE consistent grid — no random indents.

COMPONENT PLACEMENT (strict)
- The key components — logo lockup, headline, supporting line, CTA, event
  caption — all live TOGETHER in the central eye-area (upper-to-middle).
- NEVER pin the date/caption or any key info to the bottom edge, corners,
  or margins. Important info is always in the visible center, grouped.

PHOTO
- Blend the real photo I give into a Deep Pine cinematic wash: pine
  shadows, warm amber highlights, natural skin tones, real depth (not
  flat). Keep real people exactly as-is — never invent or alter faces.
- Keep the scene feeling like networking: groups, tables, overlapping
  conversations, multiple people in context. Do NOT isolate one person as
  a portrait subject. No single-person hero cutout, no fake individual
  portrait lighting, no separated person pasted onto a background.
- Add dynamic light: one thin flowing Ember Coral curved line + a single
  small coral dot, soft vignette, gentle directional glow.
- PEOPLE TO AVOID: do NOT feature two specific South-Asian men — one in a
  beige/cream polo and one in a brown shirt. Compose/crop each banner so
  they are OUT of frame, or fully in deep shadow in the background. Never
  make them the subject or a clearly-lit face. Never use group-photo.jpg.

TEXT
- Spell all on-image text EXACTLY as given. Re-check spelling.
- Headline is the hero. Supporting line is quieter (about half size).
  Caption is smallest, in coral.
- Headline color rule: Warm Bone for all headline text, except one optional
  Ember Coral emphasis word. Never use moss/green headline text because it
  sinks into the pine background.

OUTPUT — I need EACH banner in THREE ratios (say which one per request):
- FEED 4:5 → exactly 1080 x 1350 px
- STORY/REEL 9:16 → exactly 1080 x 1920 px (phone vertical)
- LANDSCAPE 16:9 → exactly 1920 x 1080 px
When I change ratio, do NOT stretch or distort the photo or the people.
EXTEND the canvas: add more Deep Pine breathing room (and continue the
photo/wash naturally) in the direction the frame grows — extend vertically
for 9:16, extend horizontally for 16:9 — then re-flow the content block to
stay in the visible center. For 9:16 keep all key content within the middle
~80% (safe zone) so Story UI at the very top/bottom does not cover it.

Reply "ready" and wait for the first banner spec.
```

---

## 2. Cấu trúc nội dung mỗi banner (thứ tự đọc mắt)

1. **Logo lockup** (wordmark + tagline) — canh cùng trục với headline
2. **Headline** — hook, chữ lớn Aeonik bone
3. **Supporting line** — câu mượt, thông tin, quiet (mục 5)
4. **CTA pill** — coral (mục 4)
5. **Event caption** — "Friday, July 31 · Da Nang · FOR YOU SteakHouse", coral nhỏ

→ Tất cả 5 phần nằm trong khối trung tâm, canh lề đồng nhất.

---

## 3. LAYOUT VARIATIONS (chọn để loạt banner đa dạng)

Mọi layout đều giữ 5 components ở vùng mắt nhìn, canh lề đồng nhất, không đẩy ra rìa.

- **L1 — Left column:** nửa trái phủ pine gần đặc, cả stack text canh trái ở đó (logo trên → headline giữa → sub+CTA+caption ngay dưới, cụm giữa-trái). Ảnh sáng lên bên phải. _(kiểu pivot biz-trip)_
- **L2 — Top stack:** text ở nửa trên trên vùng tối, ảnh chiếm nửa dưới. Cụm info nằm ở eye-line trên-giữa, không rơi đáy. _(kiểu ad "noise")_
- **L3 — Centered axis:** mọi thứ canh giữa theo một trục dọc, ảnh wash phía sau, cụm text ở chính giữa khung.
- **L4 — Split panel:** panel pine đặc bên trái (~45% khung) chứa toàn bộ text canh trái; ảnh fill bên phải. Ranh giới mềm, coral line vắt ngang.
- **L5 — Center band:** ảnh ở trên và dưới, một dải pine trong suốt vắt qua vùng giữa chứa toàn bộ text (dải nằm ở trung tâm, KHÔNG phải mép đáy).

> Khi chạy matrix, mỗi banner đã gán 1 layout để loạt ad không trùng bố cục.

---

## 4. CTA VARIATIONS (bank — đổi luân phiên)

Nút pill coral, chữ bone, mũi tên nhỏ. Đổi copy để test:

1. Apply for a seat
2. Request an invite
3. Claim your seat
4. Save your seat
5. Apply to join
6. Reserve your spot

> Note: đây là event có duyệt đơn (25 chỗ) → "Apply / Request an invite" hợp tông "curated" hơn "Buy ticket". Ưu tiên 1–2, còn lại để A/B.

---

## 5. SUPPORTING-LINE BANK (câu mượt, có thông tin — chọn 1/banner)

1. Join a group of 25 entrepreneurs for one intimate evening in Da Nang.
2. Spend an evening with 25 founders and business owners over a curated dinner.
3. An intimate dinner where 25 founders actually get to know each other.
4. Meet 25 founders and operators over dinner, without the noise of a big mixer.
5. One curated evening with 25 entrepreneurs who came to connect, not to pitch.
6. Spend an evening with 25 founders and operators already building in Vietnam.

---

## 6. EVENT CAPTION (bắt buộc, đủ thông tin)

Luôn ghi đầy đủ, không cụt "July 31":

> **Friday, July 31 · Da Nang · FOR YOU SteakHouse**

Coral nhỏ, đặt trong khối trung tâm ngay dưới CTA (không dưới mép đáy).

---

## 7. AD MATRIX — loạt banner để gen

9 banner, cover 3 angle, mỗi banner đã gán layout + CTA + sub-copy khác nhau cho đa dạng. Tất cả 4:5 1080×1350.

| # | Angle | Base (`images/gallery/`) | Headline | Layout | CTA | Sub-copy | Save as |
|---|---|---|---|---|---|---|---|
| 1 | 1A audience | `networking-2.jpg` | In Da Nang for a biz trip? Don't just work. Connect. | L1 | Apply for a seat | #1 | `ad-1A-biztrip.png` |
| 2 | 1B audience | `dinner-2.jpg` ⚠crop-left | Connect with founders, owners & entrepreneurs like you. | L4 | Request an invite | #2 | `ad-1B-like-you.png` |
| 3 | 1C audience | `networking-1.jpg` ⚠crop | Exploring the Vietnam market? Meet the founders already in it. | L2 | Apply to join | #6 | `ad-1C-explore-market.png` |
| 4 | 1D audience | `dinner-2.jpg` | Expanding your value chain into Vietnam? | L3 | Request an invite | #6 | `ad-1D-expand-vn.png` |
| 5 | 2A pitch | `dinner-1.jpg` | Phone-free networking event for founders. | L2 | Apply for a seat | #3 | `ad-2A-phone-free.png` |
| 6 | 2B pitch | `networking-1.jpg` | The no-business-card networking dinner for entrepreneurs. | L1 | Claim your seat | #4 | `ad-2B-no-biz-card.png` |
| 7 | 3A pain | `venue-detail.jpg` | Tired of loud, pointless networking events? | L3 | Save your seat | #4 | `ad-3A-tired.png` |
| 8 | 3B pain | `dinner-1.jpg` | Find the right people, not a room full of business cards. | L5 | Apply for a seat | #5 | `ad-3B-right-people.png` |
| 9 | 3C pain | `dinner-1.jpg` | Most networking is noise. This is 25 people worth meeting. | L2 | Apply for a seat | #3 | `ad-3C-noise.png` |

> **Ad 3A (coral-heavy):** thêm vào prompt `push Ember Coral much stronger — coral dominates the wash, pine only in shadows` để câu khiêu khích này nổi giữa feed.
>
> **⚠crop notes (tránh 2 ông Ấn áo be/áo nâu):**
> - `dinner-2.jpg` → crop nghiêng TRÁI (host áo kem đầu bàn + anh tóc vàng + anh châu Á đeo kính), để nhóm Nam Á ngồi bên phải RA KHỎI khung hoặc chìm shadow.
> - `networking-1.jpg` → crop lấy cụm giữa (mấy anh áo đen/kem đứng nói chuyện), để ông áo be góc trái RA KHỎI khung.
> - `networking-2.jpg` (pivot) → giữ foreground anh châu Á; ông áo be hậu cảnh để chìm trong shadow.
> - **Không dùng `group-photo.jpg`.**

### Xuất mỗi banner ra 3 ratio → 3 folder

Mỗi banner ở matrix gen/xuất thành 3 phiên bản, lưu vào 3 folder con trong `assets/social/generated/ads-plan/`:

- `feed-4x5/` — 1080×1350 (feed chính)
- `story-9x16/` — 1080×1920 (Story/Reels, size điện thoại)
- `landscape-16x9/` — 1920×1080 (landscape/desktop)

Tên file giữ nguyên save-as, chỉ khác folder. Khi đổi ratio: **extend canvas + thêm pine**, không kéo giãn ảnh/người (xem OUTPUT trong MASTER BRIEF).

---

## 8. PROMPT TEMPLATE (điền theo mỗi dòng matrix)

```
Use the image generation model (image gen 2.2 / gpt-image). Do NOT render
as code/SVG. Base image: images/gallery/<BASE>   Ratio: <RATIO>
(4:5 1080x1350 | 9:16 1080x1920 | 16:9 1920x1080)

Blend the photo into a deep pine (#071A14) cinematic wash: pine shadows,
warm amber highlights, natural skin tones, real depth. Keep real people
exactly as-is — do NOT invent or alter faces, do NOT stretch/distort. If
the ratio is taller/wider than the photo, EXTEND the canvas with more pine
wash (never stretch). Add a thin flowing Ember Coral (#E7644A) curved line
with one small coral dot, soft vignette, gentle directional glow.
The photo must still read as a networking scene: show group/table/context
and overlapping conversations. Do NOT make a single isolated person the
hero; no solo portrait composition, no separated cutout person.
AVOID featuring the beige-polo / brown-shirt South-Asian men — crop them
out or keep them in deep shadow (see crop notes).

Use LAYOUT <L#> (see brief). Keep ALL key components grouped in the
central eye-area; the logo lockup shares the SAME alignment axis as the
headline; nothing important at the bottom edge or margins.

- Logo lockup: FoundersVN wordmark + "Phone-Free Networking for Founders"
  tagline beneath it. No square logo, no empty box.
- Headline, Aeonik-style geometric sans, Warm Bone, Semibold/Bold, rounded,
  spacious, NOT condensed, spelled EXACTLY: "<HEADLINE>". Use Warm Bone
  for headline text; optional Ember Coral emphasis on ONE short word only.
  Never use moss/green for headline words.
- Supporting line (MUST be visible), Warm Bone, quieter: "<SUB-COPY>"
- CTA pill, Ember Coral, bone text + small arrow: "<CTA>"
- Event caption, small coral, in the central block under the CTA:
  "Friday, July 31 · Da Nang · FOR YOU SteakHouse"

Premium, editorial, dynamic. Not flat, not SaaS, no gold.
```

---

## 9. Fire cho Codex

```
Đọc 04-marketing/ADS-BANNER-HANDOFF.md. Dán MASTER BRIEF (mục 1) vào
image-gen, rồi gen 9 banner trong AD MATRIX (mục 7) theo PROMPT TEMPLATE
(mục 8), điền base/headline/layout/CTA/sub-copy từng dòng.

Mỗi banner xuất 3 ratio, lưu vào 3 folder:
- assets/social/generated/ads-plan/feed-4x5/     (1080x1350)
- assets/social/generated/ads-plan/story-9x16/   (1080x1920)
- assets/social/generated/ads-plan/landscape-16x9/ (1920x1080)
Đổi ratio bằng cách EXTEND canvas + thêm pine, KHÔNG kéo giãn ảnh/người.

Luật: fully image-gen (không code/SVG); logo lockup canh cùng trục lề với
headline; 5 component ở vùng trung tâm, ngày không để dưới mép đáy; font
Aeonik rounded; KHÔNG dùng group-photo.jpg và tránh 2 ông Ấn áo be/áo nâu
(crop bỏ hoặc để shadow — xem crop notes mục 7). Chính tả khớp tuyệt đối.

Gen 3 banner đầu (đủ 3 ratio) rồi dừng cho tôi review trước khi làm tiếp.
```

## 10. Lưu ý

- Image-gen ra kích thước gần đúng → crop lại đúng px từng ratio trước khi chạy ads.
- Đổi ratio = extend canvas + thêm pine, KHÔNG kéo giãn ảnh/người. 9:16 giữ content trong middle ~80% (safe zone Story).
- Font chỉ *gần* Aeonik (không đúng file licensed) và logo do model vẽ bám theo file gốc — chấp nhận theo hướng fully-image-gen đã chốt.
- Review mỗi batch: chính tả, canh lề logo↔headline, ngày nằm trung tâm, ratio đúng px, và KHÔNG lộ mặt 2 ông Ấn áo be/áo nâu.
