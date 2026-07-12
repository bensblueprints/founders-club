# Feedback — re-auditing Ben's build against our Da Nang pilot

_Judged against everything we've brainstormed: 25-cap Da Nang pilot → Saigon; $150; business owners (by level, not industry); bilingual; seed-driven credibility; lean $20–30 ads; cross-event nurturing; 3-way split; "whose account collects money."_

## 0. The big decision this forces: **adopt vs. rebuild**
Ben already has a **live, paid, deployed platform** that does ~90% of our web-app spec (directory, profiles, digital cards, application vetting, Airwallex payments, admin, galleries) — and it already features **4U Lounge** and past-dinner photos. This changes our plan:

- **Recommendation: adopt & slim it down, don't rebuild.** An's time is better spent *configuring and trimming* this than building from zero in 2 weeks. We'd inherit payments, auth, directory, and social proof immediately.
- **But first, three things must be true:** (1) we actually have access/ownership of the repo + Supabase + Airwallex + domain; (2) we're comfortable building the "series" brand on top of *Founders Vietnam* (the very name our brand guide flagged as taken — this is that asset); (3) Ben's bigger vision (monthly club, memberships, cruise) doesn't quietly drag the pilot back to 50+ scope. **Confirm ownership on the call before committing.**

## 1. Reuse as-is (strong, saves us weeks)
- **Member Directory = our connection app, already built.** "No business cards needed," search, filters, avatar cards, and **WhatsApp/Zalo/Telegram/LinkedIn** contact links — exactly our digital layer. Zalo support matters for VN.
- **Application → admin approval flow** is *perfect for our seeding/credibility strategy.* Vetting is how a no-name event feels curated and worth $150. This directly answers the "is this legit / who's in the room" risk.
- **Airwallex payments** already integrated with server-side price validation — solid, supports international cards for nomad attendees.
- **Social proof:** real 4U Lounge galleries + past-events page. We were missing exactly this; now we have it.
- **Premium dark/gold aesthetic** reads "worth $150" and isn't generic-AI. Keep the direction.

## 2. Change / trim for the pilot
- **Scope + cap:** events default **100** attendees, HCMC, monthly. Set Da Nang event to **cap 25**, date **Friday, 31 July 2026**, single dinner. Hide the monthly-calendar feel for now.
- **Kill the pricing sprawl for the pilot.** Landing shows $250/$500 memberships, **$2,400 annual**, **$297 cruise / $447 full**. For a first Da Nang dinner this is confusing and raises "expensive/complex" objections. **Show one thing: the $150 dinner.** Park memberships/cruise/upsells until post-pilot.
- **Positioning conflict — resolve the copy.** Site says "**Visionaries**" and filters the directory by **industry** (SaaS/Fintech/AI/ML). We decided **business owners, by level, cross-industry**. Reframe hero copy to owners, and change directory filters from industry to something level/intent-based (or drop filters for 25 people).
- **Whose account / gateway.** Airwallex settles into **an Airwallex account tied to an entity** — that IS the "whose account collects payments" decision we flagged. Confirm whose Airwallex/entity this is, how it maps to the **3-way split**, and whether we still want a VietQR/local option for near-zero fees. (Airwallex fees ≠ zero.)

## 3. Missing vs. what we brainstormed (build/add)
- **Bilingual (VI + EN) — absent everywhere.** Our audience is ~50% VN, many not fluent. This is the biggest gap. At minimum: bilingual landing + application + directory labels. Bonus: the app is the ideal place to *solve* the language barrier (show each person's languages; pre-event intro prep).
- **Cross-event visibility** ("5 from Da Nang are also going to Saigon") — not present, but `events` + `event_attendance` make it easy to add. This is our re-booking/nurturing hook.
- **Seed/"anchor attendee" surfacing** — a way to feature confirmed high-quality guests pre-event ("joining us: ___") to drive cold conversions on a lean ad budget.
- **Min-headcount / go-no-go logic** — nothing enforces our "min 12–15 to run." Could be manual for the pilot.
- **In-app messaging (`messages.html`)** — we decided *not* to build chat for the pilot (use Zalo/WhatsApp group). Consider hiding it for now; the directory's direct-contact links already cover "exchange cards."

## 4. Risks / things to verify
- **⚠️ Possible data exposure (verify first).** The members RLS policy is `FOR SELECT USING (is_approved = true)` with no authenticated-role check, while the **anon key is shipped client-side**. As written, that can let *anyone* read approved members' rows — and `members` includes **email and `password_hash`**. If that's really the deployed policy, it's a serious leak. **An should confirm and, if so, restrict the policy to authenticated users and never expose `password_hash` to client reads.** (I'm inferring from the schema — verify against the live project.)
- **Custom auth + bcrypt in a public table** is riskier than Supabase Auth. For a paid site handling PII, worth hardening (or migrating to Supabase Auth) before scale.
- **Committed Supabase URL/anon key** in the repo — anon keys are meant to be publishable, so this is only safe *if* RLS is correct (see above). Airwallex keys are correctly kept in Netlify env, not committed. Good.
- **Brand/name lock-in:** building on *Founders Vietnam* effectively decides the naming question by default. If we still want a fresh series brand, decide before we invest in this codebase.

## 5. Net recommendation
1. **Confirm we own/control** the repo, Supabase, Airwallex, and domain. (Blocker.)
2. If yes → **fork it, strip to the $150 Da Nang dinner (cap 25), add bilingual, fix the RLS exposure, adjust positioning copy.** That's a far faster path to "live this week" than building fresh.
3. Keep the directory, application-vetting, payments, and galleries **as-is** — they're our biggest accelerators and they de-risk the credibility problem.
4. Revisit memberships / cruise / cross-event / messaging **after** the pilot validates.

> Bottom line: Ben's platform is a big head start and solves our two hardest problems (credibility via vetting + a ready-made connection app). The work isn't building — it's **trimming it to pilot scope, translating it, and hardening security.**
