# Web App & Landing Page Spec

_Owner: An (lead) — Benji supporting. This is the digital layer that makes the event different._

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

**Payment decision needed (two linked questions):**
1. **Which account/entity collects the money?** → a legal-entity company account is recommended (trust + clean split). This choice constrains the gateway. See [Team Agreement §2](../10-team-agreement/TEAM-AGREEMENT.md).
2. **Which gateway?** Stripe (USD cards, easiest for international nomads, but limited VN support) vs PayPal vs a **local VN rail / VietQR bank transfer** (~fee-free, points at one VN account). _Decide both on the call._

**Build-vs-buy shortcut:** For the pilot, a no-code stack (e.g. a simple site + Stripe Payment Link / Lemon Squeezy + a typeform-style intake) could get us live in days and let An focus energy on the app. Worth weighing against a custom build. _Decide on the call._

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
| Landing + payment live | An | ~Jul 12 |
| Intake form feeding profiles | An | ~Jul 12 |
| App MVP (directory) | An | before event |
| Access control tested | An | before event |
| Full run-through with test data | An + team | T-2 days |
