#!/usr/bin/env python3
"""Tạo các clip Veo 3.1 (image-to-video) cho hero video — gọi thẳng REST Vertex AI.

Dùng REST `:predictLongRunning` (SDK google-genai 1.47 bị 404 với Veo preview).
Xác thực bằng ADC của gcloud (google.auth), không cần API key.
Clip đặt tên theo nội dung: clips/<name>.mp4. Thứ tự ghép nằm ở order.txt.

SETTING HARD-CODE: Veo 3.1 (veo-3.1-generate-001), 4s, 16:9, 720p,
generateAudio=false (không tiếng), personGeneration=allow_adult. us-central1.

Chạy:
  python3 generate_veo.py                      # tạo tất cả scene còn thiếu
  python3 generate_veo.py --only all-people    # tạo lại 1 (hoặc nhiều) scene
  python3 generate_veo.py --only networking-1 all-people
"""
import argparse
import base64
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
GALLERY = os.path.normpath(os.path.join(HERE, "..", "..", "images", "gallery"))
REFS = os.path.join(HERE, "refs")
CLIPS = os.path.join(HERE, "clips")
ENV_FILE = os.path.normpath(os.path.join(HERE, "..", "agent-platform", ".env"))

# ── SETTING HARD-CODE ─────────────────────────────────────────────
MODEL = "veo-3.1-generate-001"       # Veo 3.1 GA — tier cao nhất (không Fast/Lite)
DURATION = 4                          # giây/clip (stitch cắt còn 3s [1s→4s])
DURATION_OVERRIDE = {}                # không override — tất cả 4s
ASPECT = "16:9"
RESOLUTION = "1080p"                  # NATIVE 1080p
GENERATE_AUDIO = False                # KHÔNG âm thanh
PERSON = "allow_adult"
LOCATION = "us-central1"
# GIỮ NGẮN GỌN — prompt phức tạp làm Veo "overthink" → noise/méo mặt.
NEGATIVE = "text, watermark, subtitles, logo"
# ──────────────────────────────────────────────────────────────────

# name -> (ảnh gốc trong gallery, prompt). Thứ tự ghép ở order.txt, KHÔNG ở đây.
# PROMPT NGẮN GỌN — để Veo tự làm tự nhiên, đừng nhồi constraint (gây noise/méo).
SCENES = {
    "venue-wide": ("venue-wide.jpg",
        "Slow cinematic camera push-in through a warm cozy wooden lounge and "
        "dining room at night with glowing chandeliers."),
    "networking-2": ("networking-2.jpg",
        "Young founders chatting and mingling with drinks at a warm evening "
        "meetup, relaxed and natural, cinematic, shallow depth of field."),
    "dinner-2": ("dinner-2.jpg",
        "Young founders enjoying a lively dinner around a long table in a warm "
        "wooden restaurant, chatting and smiling, cinematic."),
    "networking-1": ("networking-1.jpg",
        "Young founders mingling and chatting in a warm wooden lounge with "
        "leather sofas, relaxed and natural, cinematic."),
    "venue-detail": ("venue-detail.jpg",
        "Slow cinematic camera push-in across warm wooden shelves filled with "
        "craft beer and wine bottles, softly lit."),
    "all-people": ("all people img.png",
        "A group of young founders posing together for a group photo in a warm "
        "cozy bar, smiling and relaxed, subtle natural movement, slow cinematic "
        "camera push-in."),
}


def load_project():
    if os.environ.get("GOOGLE_CLOUD_PROJECT"):
        return os.environ["GOOGLE_CLOUD_PROJECT"].strip()
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE) as f:
            for line in f:
                if line.strip().startswith("GOOGLE_CLOUD_PROJECT="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("❌ Không tìm thấy GOOGLE_CLOUD_PROJECT (đặt trong tools/agent-platform/.env).")


def get_token():
    try:
        import google.auth
        from google.auth.transport.requests import Request
    except ImportError:
        sys.exit("❌ Thiếu google-auth: python3 -m pip install google-auth")
    creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
    creds.refresh(Request())
    return creds.token


def prep_ref(image_name):
    """Crop 16:9 + đưa về 1920x1080 làm ảnh reference (khớp output 1080p); trả base64."""
    os.makedirs(REFS, exist_ok=True)
    src = os.path.join(GALLERY, image_name)
    dst = os.path.join(REFS, os.path.splitext(image_name)[0] + ".jpg")
    if not os.path.exists(dst):
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", src,
             "-vf", "scale=1920:-2,crop=1920:1080", "-q:v", "2", dst],
            check=True,
        )
    with open(dst, "rb") as f:
        return base64.b64encode(f.read()).decode()


def api(url, token, project, body):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST", headers={
        "Authorization": f"Bearer {token}",
        "x-goog-user-project": project,
        "Content-Type": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}: {e.read().decode()[:800]}") from e


def find_video(node):
    if isinstance(node, dict):
        if node.get("bytesBase64Encoded") and "video" in (node.get("mimeType") or "video"):
            return ("b64", node["bytesBase64Encoded"])
        for k in ("gcsUri", "uri"):
            if node.get(k):
                return ("uri", node[k])
        for v in node.values():
            got = find_video(v)
            if got:
                return got
    elif isinstance(node, list):
        for v in node:
            got = find_video(v)
            if got:
                return got
    return None


def generate(name, token, project):
    image_name, prompt = SCENES[name]
    dur = DURATION_OVERRIDE.get(name, DURATION)
    b64 = prep_ref(image_name)
    base = f"https://{LOCATION}-aiplatform.googleapis.com/v1beta1/projects/{project}/locations/{LOCATION}/publishers/google/models/{MODEL}"
    print(f"→ {name}: {image_name} → Veo 3.1, {dur}s, {RESOLUTION}, "
          f"audio={'on' if GENERATE_AUDIO else 'OFF'}")
    body = {
        "instances": [{
            "prompt": prompt,
            "image": {"bytesBase64Encoded": b64, "mimeType": "image/jpeg"},
        }],
        "parameters": {
            "sampleCount": 1,
            "durationSeconds": dur,
            "aspectRatio": ASPECT,
            "resolution": RESOLUTION,
            "generateAudio": GENERATE_AUDIO,
            "personGeneration": PERSON,
            "negativePrompt": NEGATIVE,
            "enhancePrompt": True,
        },
    }
    op = api(f"{base}:predictLongRunning", token, project, body)
    op_name = op["name"]
    t0 = time.time()
    while True:
        if time.time() - t0 > 900:
            raise RuntimeError(f"quá 15 phút chưa xong (op: {op_name})")
        time.sleep(12)
        st = api(f"{base}:fetchPredictOperation", token, project, {"operationName": op_name})
        if st.get("done"):
            if st.get("error"):
                raise RuntimeError(f"render lỗi: {json.dumps(st['error'])[:400]}")
            break
        print(f"   ... đang render ({int(time.time() - t0)}s)")
    got = find_video(st.get("response", {}))
    if not got:
        raise RuntimeError("không thấy video trong response (có thể bị lọc an toàn). "
                           + json.dumps(st.get('response', {}))[:400])
    os.makedirs(CLIPS, exist_ok=True)
    out = os.path.join(CLIPS, f"{name}.mp4")
    kind, val = got
    if kind == "b64":
        with open(out, "wb") as f:
            f.write(base64.b64decode(val))
    else:
        req = urllib.request.Request(val, headers={"Authorization": f"Bearer {token}"})
        with urllib.request.urlopen(req, timeout=600) as r, open(out, "wb") as f:
            f.write(r.read())
    print(f"   ✅ {out} ({os.path.getsize(out) / 1e6:.1f} MB, hết {time.time() - t0:.0f}s)")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--only", nargs="+", choices=list(SCENES),
                   help="chỉ tạo (các) scene này; mặc định tạo cái còn thiếu")
    args = p.parse_args()

    project = load_project()
    print(f"• Project : {project}\n• Location: {LOCATION}\n• Model   : {MODEL}\n")
    token = get_token()

    if args.only:
        todo = args.only
    else:  # mặc định: chỉ tạo scene chưa có clip
        todo = [n for n in SCENES if not os.path.exists(os.path.join(CLIPS, f"{n}.mp4"))]
        if not todo:
            print("Tất cả scene đã có clip. Dùng --only <name> để render lại.")
            return
    failed = []
    for n in todo:
        try:
            generate(n, token, project)
        except Exception as e:  # noqa: BLE001
            print(f"   ❌ {n} lỗi: {str(e)[:500]}", file=sys.stderr)
            failed.append(n)

    print()
    if failed:
        print(f"⚠️  Lỗi: {failed} — thử lại: python3 generate_veo.py --only {' '.join(failed)}")
        sys.exit(1)
    print("✅ Xong — ghép: ./stitch.sh")


if __name__ == "__main__":
    main()
