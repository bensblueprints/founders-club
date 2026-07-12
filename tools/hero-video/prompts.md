# Hero video — kế hoạch scene & prompt (image-to-video, Veo 3.1)

Mục tiêu: hero video ~15 giây cho webpage, ghép từ 4 clip AI (mỗi clip 4s),
mỗi clip tạo từ 1 ảnh thật trong `images/gallery/` làm reference (image-to-video).

## Bộ ảnh đã chốt (bản "cận cảnh hơn")
| Scene | Ảnh gốc | Vai trò |
|---|---|---|
| 1 | `venue-wide.jpg` | Mở màn — không gian quán (establishing shot) |
| 2 | `networking-2.jpg` | Cận cảnh networking — người cầm bia, trò chuyện |
| 3 | `dinner-2.jpg` | Bữa tối — bàn dài nhìn gần, nâng ly |
| 4 | `group-photo.jpg` | Ảnh nhóm — kết màn "community" |

Ảnh dự phòng: `networking-1.jpg`, `dinner-1.jpg` (góc rộng hơn), `venue-detail.jpg` (kệ bia).

## Cài đặt chung khi generate
- Chế độ: **Image-to-video**, ảnh gốc = first frame (script tự crop 16:9 → 1920×1080)
- Thời lượng: **4 giây/clip**, 16:9, 1080p
- Chuyển động **NHẸ** — ảnh có mặt người thật, chuyển động mạnh dễ méo mặt
- Negative prompt:
  `morphing faces, distorted faces, warped hands, extra limbs, text, captions, watermark, logo, glitch, flicker`

## Scene 1 — venue-wide.jpg (4s)
> Slow cinematic dolly push-in through a warm upscale wooden lounge and dining
> room at night. Chandelier light glows softly, ceiling fans rotate slowly,
> sheer curtains sway gently. The camera glides forward past the leather
> Chesterfield sofas toward the dining tables. Warm amber tones, premium cozy
> atmosphere, photorealistic, subtle film grain. Keep the interior exactly as
> in the reference image. No text.

## Scene 2 — networking-2.jpg (4s)
> Close documentary-style shot at a warm evening founders meetup. People stand
> close together mingling with drinks; a man in a polo shirt holding a beer
> bottle listens and nods, a woman in a white floral dress chats warmly,
> friends around them gesture naturally and laugh. Slow subtle push-in with a
> slight handheld drift, shallow depth of field, warm shelf lighting in the
> background. Subtle natural movement only — faces stay consistent with the
> reference image, no morphing. No text.

## Scene 3 — dinner-2.jpg (4s)
> Slow push-in along a long white-tablecloth dinner table in a warm wooden
> restaurant at night. Founders lean into conversation across the table,
> gesture mid-story, laugh and sip drinks, beer bottles and glasses on the
> table. Warm chandelier light, cinematic shallow depth of field, convivial
> intimate energy. People and room stay consistent with the reference image,
> movements subtle and natural. No text.

## Scene 4 — group-photo.jpg (4s)
> Slow dolly pull-back from a group of five friends posing in front of a warm
> wooden wall of illuminated bottle shelves. They relax out of the pose, smile
> and laugh together with subtle natural movement. Warm golden light,
> celebratory closing-shot mood, photorealistic. Faces stay consistent with
> the reference image, no morphing. No text.

## Quy trình chạy
1. Tạo API key (tài khoản trả phí): https://aistudio.google.com/apikey
2. Tự tạo file `tools/hero-video/.env` với nội dung `GEMINI_API_KEY=<key>`
3. `python3 tools/hero-video/generate_veo.py` (thêm `--fast` để rẻ hơn ~2.5×)
4. `tools/hero-video/stitch.sh` → ra `out/hero.mp4`, `out/hero.webm`, `out/poster.jpg`

Chi phí tham khảo (Gemini API): Veo 3.1 ~$0.40/giây video → 4 clip × 4s ≈ **$6.4**;
bản Fast ~$0.15/giây ≈ **$2.4**. Tạo lại 1 scene: `--only <số scene>`.
