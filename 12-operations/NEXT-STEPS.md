# Next Steps — after the 14/7 call

_Target: Da Nang, Fri 31 July. Critical path: **web + applications working → payments/emails wired → ads live → sell 25.**_

## 🔥 Hard deadlines (sprint)
| Milestone | Owner | Due |
|---|---|---|
| **App working + core built** | An | **14 Jul (today)** |
| **ALL app features complete** | An | **15 Jul** |
| **Landing front-end done** | Maddy | **15 Jul** |
| **Venue + food/menu locked** + site check | Matthew | **15 Jul** |
| **Ads LIVE (EN + VI)** | Benji | **16 Jul (latest)** |

Nothing sells until app + landing + payment work and ads are live. Everything below hangs off these dates.

## Next steps — by owner

### An — logic, app, backend
- [ ] Web + applications working (blocker)
- [ ] Payments: **Airwallex card (+5% to customer)** + **VNPay QR (free)**, server-side price validation
- [ ] **Plus-one** checkout (1–2 tickets, max 2/company) + **menu choice** per ticket
- [ ] **Emails via Resend**: accepted → reminder sequence (48h hold: 24h/6h/1h → expire) → onboarding
- [ ] **Account created at admit** (email+password); guest logs in & edits only
- [ ] **Seat-blocking** ("?" for unsold) + directory shows **full contacts on entry**
- [ ] **Discord noti** on new application; route support emails to Slack/Discord
- [ ] **Cross-event** "going to Saigon" flag
- [ ] **1-cent test product** → end-to-end test
- [ ] **Fix members RLS** security before real traffic
- Full detail: [WEB-APP-SPEC §App logic](../05-web-app/WEB-APP-SPEC.md)

### Maddy — front-end, marketing, community
- [ ] **Front-end / UI / landing page** build
- [ ] Draft the **2 emails** (accepted + onboarding) **+ reminder sequence** copy
- [ ] **Vietnamese ADS copy** (not app) + **food images for the app**
- [ ] Post & nurture community **daily**
- [ ] Decide **seed / anchor guests** to feature

### Benji — ads + payment/email infra
- [ ] Give An the **Airwallex API** + add team
- [ ] Buy **foundersvn inboxes** + **warm up the domain** (deliverability)
- [ ] Prep **EN + VI ad variants** + a **food sizzle reel**
- [ ] Ads **live** once web+payment tested → track funnel daily

### Matthew — event & ops
- [ ] **Lock venue + site check this week** (projector/AV/wifi)
- [ ] Negotiate **price + menu** (steak/chicken/veg); confirm **food included in $150?**
- [ ] Draft **~3-hour agenda / run-of-show** (warm-up → talk/slide → dinner → networking)
- [ ] Plan **name cards** (name + color dot) + reception

## To be decided
- [ ] **Treasurer + payout cadence** for the 4-way split (money lands in Ben's Airwallex)
- [ ] **Food included in the $150?** (prior event billed it separately)
- [ ] **Brand name lock** (FoundersVN is the working direction)
- [ ] **Price test:** hold $150 vs test $250 (esp. Saigon/HCMC) based on ad results
- [ ] **MC final** (Maddy + Matthew) — confirm by audience demographics once sign-ups come in
- [ ] Alcohol included or cash bar?

## Who's in charge (quick reference)
| Area | Lead |
|---|---|
| Front-end / UI / landing | **Maddy** |
| App logic / backend / payments / emails / data | **An** |
| Airwallex + email domain + ads + concierge | **Benji** |
| Venue / food / agenda / on-the-night ops / MC | **Matthew** |
| Coordination / community / guest care | **Maddy** (+ Matthew) |
| Split | 4-way equal (25% each) |
