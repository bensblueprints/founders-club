# FoundersVN Creative Git Handoff

Use this repo for source prompts, copy locks, brand rules and reference assets. Keep final zips/workbook delivery packages in Drive or another file store, not Git.

## Source Of Truth

- `04-marketing/ADS-COPY-LOCK-0717.md` — locked VN/EN ad copy and messaging rules.
- `04-marketing/VIETNAMESE-COPY-PREFERENCES.md` — Vietnamese tone and prospect angle.
- `04-marketing/ADS-BANNER-HANDOFF.md` — full image-generation rules for ad banners.
- `04-marketing/GPT-IMAGE-HANDOFF.md` — broader image-gen handoff and master brief.
- `04-marketing/ADS-16x9-PRODUCTION-RULES.md` — landscape 16:9 layout rules.
- `04-marketing/whatsapp-group-banner-0718/WHATSAPP-GROUP-MESSAGE.md` — WhatsApp group poster/message copy.

## Reference Assets

- `images/gallery/` — real venue/networking/dinner references.
- `assets/founders-vn-logo-kit/` — logo references for image generation.
- `assets/brand/` — current brand system assets.

## Generated Creatives Worth Pulling

- `04-marketing/generated-ads-0717-bundle/` — approved 1:1, 4:5 and 9:16 ads.
- `04-marketing/generated-ads-0718-16x9/` — approved 16:9 ads.
- `04-marketing/whatsapp-group-banner-0718/` — WhatsApp group banners and copy.

## Do Not Commit

- `*.zip`
- `04-marketing/foundersvn-ads-final-*/`
- `04-marketing/[latest]foundersvn-ads-final-*/`
- duplicate delivery folders or embedded workbooks over 100MB

## Safe Stage Set

```bash
git add .gitignore
git add 04-marketing/CREATIVE-GIT-HANDOFF.md
git add 04-marketing/ADS-COPY-LOCK-0717.md 04-marketing/VIETNAMESE-COPY-PREFERENCES.md
git add 04-marketing/ADS-BANNER-HANDOFF.md 04-marketing/GPT-IMAGE-HANDOFF.md 04-marketing/ADS-16x9-PRODUCTION-RULES.md
git add 04-marketing/generated-ads-0717-bundle 04-marketing/generated-ads-0718-16x9
git add 04-marketing/whatsapp-group-banner-0718
git add images/gallery assets/founders-vn-logo-kit assets/brand
```

Before commit, run:

```bash
git status --short
find . -type f -size +100M -not -path './.git/*' -print
```
