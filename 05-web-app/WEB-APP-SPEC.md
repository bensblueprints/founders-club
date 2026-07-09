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

**Payment decision needed:** Stripe (easiest, USD, cards) vs PayPal vs local VN gateway. Consider that buyers may be international nomads → Stripe/USD likely simplest. _Decide on the call._

**Build-vs-buy shortcut:** For the pilot, a no-code stack (e.g. a simple site + Stripe Payment Link / Lemon Squeezy + a typeform-style intake) could get us live in days and let An focus energy on the app. Worth weighing against a custom build. _Decide on the call._

### B) Attendee networking app (the differentiator)
A web app (mobile-friendly, no install ideally) that on event day lets attendees browse who's in the room.

**MVP features (must-have for Event #1):**
- [ ] Attendee directory: photo, name, company, one-line "what I do", "what I'm looking for", "what I can offer"
- [ ] Search / filter by industry or intent
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
