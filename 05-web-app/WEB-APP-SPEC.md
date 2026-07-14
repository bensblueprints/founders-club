# Web App & Landing Page Spec

## Ownership (locked 14/7)
- **Front-end / UI / landing page = Maddy** — the visual build, landing, brand look, copy layout. See the front-end section below.
- **Logic, app, backend, payments, data, emails, admin = An** — everything in "App logic spec" below. Benji supports payment infra (Airwallex) + email domain.
- **Base:** built on Ben's *Founders Vietnam* platform (Supabase + Netlify functions + Airwallex), trimmed to the pilot. Full operational flow in [Operations](../12-operations/OPERATIONS-AND-FLOW.md).

---

# App logic spec (An) — locked 14/7
Everything the app must do, from the 14/7 discussion. This is the source of truth for the logic.

## 1. Lifecycle (state machine)
```
applied ─▶ (rejected ✗)
        └▶ approved ─▶ account_created ─▶ email#1 "accepted" (+pay link)
             │
             ├─ reminders while seat held 48h: at 24h / 6h / 1h left
             │       └─ not paid → EXPIRED → seat released
             └─ paid ─▶ email#2 onboarding ─▶ active (on directory)
                        ─▶ attended (checked-in) ─▶ post-event (directory stays open)
```

## 2. Application
- Public apply form → `applications` table. Fields: name, email, company, role, **what I do / looking for / can offer**, links/socials, **language = English | Vietnamese | Bilingual** (drives translation + MC).
- On submit: **thank-you page** ("check spam, mark as not-spam; you'll be notified when approved"); fire **Discord notification** to the team (webhook).

## 3. Review → account creation
- Admin: **approve / reject / disqualify**.
- On **approve → the app creates the member account** (email + generated password) and **admits the profile** onto the directory. Guest never self-creates — they only **log in and edit**.

## 4. Emails (Resend API — automated, no manual send)
- **Email #1 — "You're accepted"** + unique pay link.
- **Reminder sequence** while the seat is held **48h**: nudges at **24h / 6h / 1h left**, then **expire + release seat**.
- **Email #2 — onboarding** (on `paid`): WhatsApp group link/QR + **app login (email + password)** + short how-to.
- Sent from **foundersvn domain** (Ben buys inboxes + warms domain; set SPF/DKIM/DMARC). All transactional via Resend.

## 5. Checkout & payments
- Only **approved** accounts can pay (unique link).
- **1–2 tickets** per checkout (plus-one). **Max 2 per company/application.** Same price ($150). Plus-one = **name + menu choice only** (no application, no profile, no app login).
- **Menu choice per ticket** (steak / chicken / vegetarian) → stored → drives **name-card color dot** (red / yellow / green).
- **Two methods:** (a) **Airwallex card — +5% surcharge paid by the customer**; (b) **VNPay / VietQR — no fee**.
- **Server-side price validation** (never trust the client). On success (webhook/return): mark attendance `paid`, confirm the seat, fire email#2, reveal the attendee on the directory.
- Money → **Ben's Airwallex** → tracked sub-accounts → instant VN bank transfer. (Split accounting handled downstream — 4-way.)
- **1-cent test product** to run end-to-end purchase + email tests before launch.

## 6. Seat inventory & directory
- **Cap 25** (config). Public seat display: **sold = named attendee card**; **unsold = "?" placeholder (no name)** → scarcity + social proof.
- **Directory access:** paid attendees log in and see the **full directory + contacts (digital cards) immediately on entry** — NOT gated to post-event.
- Card fields: photo, name, company, role, what-I-do, looking-for / can-offer, links, **contacts (WhatsApp / Zalo / Telegram / LinkedIn)**.
- **Filter by intent / role / language** — not by industry (positioning is cross-industry by level).
- **Cross-event:** "also going to Saigon" flag per profile (re-book hook).

## 7. Access / auth
- Login = **email + password** (created at admit); consider magic link. Gate app + directory behind auth **and** paid status.

## 8. Admin
- Review applications (approve/reject); see payment status; **check-in** on event day (`checked_in`).

## 9. Notifications
- **Discord**: new application (and optionally new payment). Route support-email replies to **Slack/Discord** so the team sees them.

## 10. Security (fix BEFORE real traffic)
- Fix the **members RLS**: do not expose `members` rows (esp. `email` / `password_hash`) to anon/public via the client key; restrict to authenticated, never return `password_hash` to the client. Consider migrating to **Supabase Auth**. See [audit](../11-web-audit/FEEDBACK.md).
- Keep all secrets in Netlify env (not committed).

## 11. Out of scope for the pilot
In-app chat/messaging (use WhatsApp), membership/cruise/upsell tiers, native app, complex matchmaking. Keep it a fast, reliable directory.

## 12. Data model (extend Ben's schema)
- `applications`: + `language`.
- `members` (account): existing + `languages`, `going_to_saigon` (bool).
- `event_attendance`: `ticket_type`, `plus_one_name`, `menu_choice`, `payment_status`, `surcharge_applied`, `checked_in`.

---

# Front-end / landing (Maddy)
_Design, UI, and landing build are Maddy's. Reference/brand direction below._

## Two things to build

### A) Event landing / sales page (Phase 1 — needed first)
The page ads point to. Must:
- [ ] Explain the event, value, date, venue, price ($150)
- [ ] Show trust (faces, venue, guarantee, seats-left counter)
- [ ] Take payment and cap sales at 25
- [ ] Capture buyer info needed for the app profile (name, company, what you do, what you're looking for, photo, links, business card)
- [ ] Send confirmation + onboarding into the app

**Brand / design constraints:**
- Use the agreed FoundersVN wordmark and VN/wavy mark only. Do not invent new marks, icons, triangles, trees, mountains, arrows, or abstract symbols.
- Embed the actual SVG logo assets directly, not typed text pretending to be a logo:
  - `assets/brand/founders-vn-logo.svg`
  - `assets/brand/founders-vn-wavy.svg`
- Keep the landing page English-first for the first design pass; Vietnamese localization comes after the visual direction is stable.
- Keep the page cinematic and more dynamic than the first minimal pass: use the hero video, deep overlays, controlled gradients, light motion, and pine-to-coral / pine-to-moss transitions. Do not make it flat or pale.
- Use `tools/hero-video/out/hero.webm` and `tools/hero-video/out/hero.mp4` as the first hero background, with `tools/hero-video/out/poster.jpg` as poster/fallback.
- Do not embed brand-system boards or website mockup screenshots inside the live landing page.
- Do not frame the dinner as one table. The format is one curated room across multiple hosted tables.

**Hero video implementation note:**
```html
<video autoplay muted loop playsinline poster="tools/hero-video/out/poster.jpg">
  <source src="tools/hero-video/out/hero.webm" type="video/webm">
  <source src="tools/hero-video/out/hero.mp4" type="video/mp4">
</video>
```

Add a dark pine overlay plus a subtle coral/moss gradient wash so text stays readable while the page still feels alive. Do not use gold as a brand color.

**Short hero copy direction:**
- H1: `Phone-Free Networking for Founders`
- Subhead: `An intimate founder dinner in Da Nang, designed for deeper conversations and quietly supported by technology so every introduction feels natural.`
- CTA: `Apply for a seat`
- Secondary: `How it works`
- Meta: `Da Nang · Friday, July 31 · 4U Lounge`
- Ticket: `$150`

Do not lead with `digital-first` or product/app language in the hero. The first impression should feel human: close, intimate, curated, present. Technology is the seamless support layer, not the emotional headline.

**Navigation direction:**
- `How it works`
- `About` dropdown
  - `FoundersVN events`
  - `The team behind`
- `FAQ`
- `Apply`

Remove `Event` and `Who's coming / People` as top-level nav items for now. They make the navbar feel crowded and the current people/testimonial imagery is not strong enough to carry top-level navigation.

`About` should support a small subpage/dropdown structure:
- `FoundersVN events` — explains the event model, timeline, how the event chain works, vision, and future event recap area.
- `The team behind` — introduces the people creating the event, their LinkedIn/social links, short bios, collaborators/partners, and contact.

**Claude implementation handoff:**
- Build the landing page based closely on this reference mockup: `assets/brand/foundersvn-web-mockup-hero-body-reference-2026-07-31.png`.
- Match the overall structure, spacing, mood, gradients, and section order from the reference. Do not reinterpret it into a SaaS page or a busy card-heavy page.
- Use the real SVG logo in the nav: `assets/brand/founders-vn-logo.svg`.
- Use the hero video as the actual hero background:
  - `tools/hero-video/out/hero.webm`
  - `tools/hero-video/out/hero.mp4`
  - `tools/hero-video/out/poster.jpg`
- Add a testimonial section after `Your seat includes` and before the final CTA band.
- For temporary testimonial avatars, crop faces from existing local images:
  - `images/gallery/all people img.png`
  - `images/gallery/group-photo.jpg`
  - `images/gallery/networking-1.jpg`
  - `images/gallery/networking-2.jpg`
- Use these as placeholder testimonials only. Make the crops feel natural and premium: circular or softly rounded square headshots, no awkward distortion.
- Use made-up names/titles for now; replace with real testimonials after Event #1.
- Keep testimonials concise: one sentence each, not long paragraphs.
- Keep the section visually calm: 2-3 testimonial cards max.
- Redesign the current testimonial cards. The current version feels visually weak and too generic.
- Avoid repeating the same gallery/event images across too many sections. Images should be distributed intentionally: hero video, one venue/dinner proof area, one meal/value area, and optional testimonial avatars only.
- If images start to feel repetitive, prefer fewer images with stronger cropping rather than filling every section with another photo.

**About subpages / dropdown targets:**
- `foundersvn-events.html` — placeholder page created. Expand it into the `FoundersVN events` subpage.
- `team-behind.html` — placeholder page created. Expand it into the `The team behind` subpage.
- Use [ABOUT-SUBPAGES-BRIEF.md](ABOUT-SUBPAGES-BRIEF.md) as the content structure.

**Dedicated app section:**
- Add a section titled: `The Digital Layer Behind Every Conversation`.
- Place it after `How it works` and before `Your seat includes`.
- Build the app visual as layered elements, not as one flat UI-board image.
- Use the real SVG logo as its own HTML/CSS layer:
  - `assets/brand/founders-vn-logo.svg`
- Do **not** let generated mockup images render or imitate the FoundersVN / Founders Vietnam logo. If a phone mockup needs brand presence, overlay the real SVG separately.
- Use these transparent PNG assets as composited web layers:
  - `assets/brand/app-layer-elements/phone-directory-transparent.png`
  - `assets/brand/app-layer-elements/phone-tonight-transparent.png`
  - `assets/brand/app-layer-elements/floating-ui-elements-transparent.png`
- Explain the app as a quiet logistics layer, not as a social feed or complex product demo.
- Keep the visual modern, clean, and UI-system-led. Do not use forest/tree/leaf/nature elements in this app section.
- Show clear product components: attendee cards, chips, status pills, table assignment card, CTA, line icons, and screen hierarchy.
- The point is to show that the app supports the physical networking experience before, during, and after the event:
  - Before: attendee profiles / directory
  - During: table flow, host prompts, phone-free reminder
  - After: saved contacts and follow-up context
- Keep copy short. Do not list every feature.

Suggested copy:
- Body: `Before dinner, the app helps you see who is coming. During the event, it handles table flow and prompts. Afterward, it keeps the right contacts and context in one place.`
- Bullets: `Profiles before you arrive` · `Table flow during the dinner` · `Follow-ups after the room closes`

**Ticket value / meal section:**
- The ticket price is `$150`.
- The ticket includes a curated meal, not just networking access.
- The pricing/value section must visually show the dining experience with either:
  - an elegant menu presentation, or
  - high-quality food / dinner imagery from the venue or gallery.
- The meal should feel premium and thoughtfully prepared, not like generic event snacks.
- The section should make it clear the ticket covers both:
  1. a curated networking experience
  2. a quality dining experience
- Suggested offer line: `$150 includes both the curated networking experience and a thoughtfully prepared meal — not just a seat in the room.`

**Payment — DECIDED (14/7):** Airwallex card (+5% to customer) + VNPay QR (free), automated. Money → Ben's Airwallex. Full logic in §5 above. Open: treasurer + payout cadence for the 4-way split.

**Build-vs-buy — DECIDED:** build on Ben's existing Founders Vietnam platform (not no-code, not from scratch) — trim to pilot.

### B) Attendee networking app (the differentiator)
A web app (mobile-friendly, no install ideally) that on event day lets attendees browse who's in the room.

**MVP features (must-have for Event #1):**
- [ ] Attendee directory: photo, name, company, one-line "what I do", "what I'm looking for", "what I can offer"
- [ ] Search / filter by intent, role, language comfort, or what someone is looking for/offering. Avoid over-indexing on industry for the pilot; the positioning is cross-industry by level.
- [ ] Access control — only paid attendees can view (magic link / code)
- [ ] Digital business card / contact exchange (save a person, get their links)

**Cross-event visibility (priority — core to the recurring model):**
- [ ] Show who's attending the *next* events too — e.g. "5 people from your Da Nang dinner are also going to Saigon."
- [ ] A simple "I'm going to Saigon" flag on a profile → drives re-booking and makes one ticket feel like a membership.

**Nice-to-have (v2 / if time):**
- [ ] Suggested matches ("you should meet ___ because ___")
- [ ] In-app note/bookmark on people
- [ ] Post-event: keep directory accessible for follow-ups
- [ ] Bilingual (VI/EN) UI toggle

**Explicitly out of scope for the pilot** (avoid scope creep): messaging/chat, real-time features, native apps, complex matchmaking algorithms. Keep it a fast, reliable directory first.

## Data model (rough)
```
Attendee
  id, name, email, photo_url
  company, role
  what_i_do (short)
  looking_for
  can_offer
  links (website, linkedin, x, etc.)
  business_card_url (optional upload)
  ticket_status (paid / seeded / cancelled)
```
The landing-page intake form should collect exactly these fields so the app is populated automatically.

## Tech notes
- Reliable venue **wifi** is a hard dependency — confirm with venue.
- Keep it mobile-web (QR → link) so nobody installs anything.
- Access via unique magic link per attendee tied to their paid ticket.

## Timeline
| Item | Owner | Target |
|---|---|---|
| Web + applications working + core app | **An** | **14 Jul (today)** |
| ALL app features (payments, emails, plus-one, menu, seat-blocking, directory, RLS) | **An** | **15 Jul** |
| Landing page (front-end/UI) | **Maddy** | **15 Jul** |
| Airwallex API + foundersvn inboxes + warm-up | Benji | 14–15 Jul |
| 1-cent test → full end-to-end test | An + team | **15 Jul** |
| **Ads live (EN + VI)** | Benji | **16 Jul (latest)** |
| Full run-through with test data | An + team | T-2 days (29 Jul) |
