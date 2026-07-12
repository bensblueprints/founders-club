# Web Structure — Ben's "Founders Vietnam" (existing build)

_Source: `github.com/bensblueprints/founders-club` · live domain referenced as **foundersvietnam.com** · audited 2026-07-11._

> **TL;DR:** This is **not** a landing page — it's a full, deployed **invitation-only members-club platform** with application vetting, member directory, event booking, live payments (Airwallex), messaging, and an admin panel. It's the more ambitious sibling of what we spec'd for the Da Nang pilot, and it already features **4U Lounge** photos + real past-dinner galleries.

## Tech stack
| Layer | Choice |
|---|---|
| Front end | Static **multi-page HTML + vanilla JS + CSS** (no framework). Dark/gold premium theme. |
| Backend / DB | **Supabase** (Postgres + Row-Level Security). Supabase JS loaded via CDN. |
| Auth | **Custom** — `members` table + `bcryptjs` + `sessions` table with tokens. (Not Supabase Auth.) |
| Payments | **Airwallex** via **Netlify serverless functions**. Falls back to a mock when keys aren't set. |
| Hosting | **Netlify** (`netlify.toml`, functions bundled with esbuild). |
| Email | `send-welcome-email` Netlify function. |

## Pages (front end)
| Page | Role |
|---|---|
| `index.html` | Landing. Hero "**Where Visionaries Converge**", "By invitation only", stats (100 member cap / 30 cruise / 10 spots), **The Experience** timeline, **Gatherings** event list, **Membership Tiers**, FAQ, and the **Apply for Membership** form (modal + `#apply`). |
| `events.html` (+`events-data.js`, `events.css`) | Event listing & booking; capacity / spots-remaining. |
| `ticket.html` (+`ticket.css`) | Checkout — builds `productIds`, supports upsells (plus-one, VIP). |
| `payment-success.html` | Post-payment confirmation (return URL from Airwallex). |
| `members.html` (+`members.js`, `members.css`) | **Member Directory = the "connection app."** Search + industry filter tags (SaaS / E-Commerce / Fintech / Agency / AI/ML), member cards with WhatsApp/Telegram/Zalo/LinkedIn, "View Full Profile", **lock state** for non-members. Tagline: _"Connect with fellow founders. No business cards needed."_ |
| `profile.html` | View / **edit your profile** (company, role, bio, socials). |
| `messages.html` | In-app member-to-member messaging. |
| `login.html` (+`auth.js`) | Login / session handling. |
| `admin.html` (+`admin.js`, `admin.css`) | Admin: review applications (approve/reject/disqualify), manage events, photos, members. |
| `speak.html` | Apply to speak. |
| `sponsor.html` | Sponsorship packages. |
| `past-events.html` (+`past-events.js`) | Past-event galleries (social proof). |
| `privacy.html`, `terms.html`, `refund.html` | Legal. |
| shared | `styles.css`, `script.js`, `database.js`, `products.js`, `supabase-config.js`, `favicon.svg` |

## Database (Supabase — `database-schema.sql`)
| Table | Purpose | Notable fields |
|---|---|---|
| `members` | User profiles + auth | email, **password_hash**, first/last name, company, role, industry, bio, website, **whatsapp/zalo/telegram/linkedin/twitter/wechat/facebook/instagram**, `is_approved`, `is_admin` |
| `applications` | Membership applications (vetting) | revenue, team_size, **biggest_challenge, unique_value, goals_12_month, why_join**, referral, membership_type, `status` (pending/approved/rejected/disqualified) |
| `events` | Events | slug, date, **dinner_price 150, cruise_price 297**, max_attendees **100**, max_cruise_spots 30, status, location default **Ho Chi Minh City** |
| `event_attendance` | Who's booked | ticket_type (dinner / full), payment_status, **checked_in** |
| `event_photos` | Gallery per event | photo_url, caption, order |
| `sessions` | Auth tokens | token, expires_at |

Seed data = **monthly "Gatherings"** Jan–Jul 2026 (Jan-2026 marked completed).

## Product catalog (server-validated in `create-payment.js`, USD)
| Product | Price | Type |
|---|---|---|
| Founders Dinner | **$150** | event ticket |
| Plus One – Dinner | $75 | upsell |
| VIP Table Upgrade | $100 | upsell |
| Founding Member | $250 | membership |
| Platinum Founding Member | $500 | membership |
| Annual Membership | $2,400 | upsell |
| (Poseidon Cruise + Dinner "Full Experience") | $297 / $447 | shown on site |

## What the model actually is (as built)
Invitation-only, **HCMC-based**, **monthly** founders club. Flow: **apply → admin vetting → approved member → book event → pay (Airwallex) → attend/check-in → connect via directory & messaging.** Revenue stacks memberships + dinners + cruise + upsells + sponsorship. Cap is **100/event**, not 25.

→ See [USER-FLOW.md](USER-FLOW.md) for the flows and [FEEDBACK.md](FEEDBACK.md) for how this maps to our Da Nang pilot.
