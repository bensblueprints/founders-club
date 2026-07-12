#!/usr/bin/env python3
"""Image-to-video bằng Gemini Omni Flash (gemini-omni-flash-preview) trên Vertex AI.

Khác Veo: gọi qua SDK `generate_content` ở LOCATION="global",
config response_modalities=["TEXT","VIDEO"] (BẮT BUỘC cả 2). Xác thực ADC.
Omni trả video ~10s/720p inline → stitch.sh cắt còn 3s. Tái dùng SCENES/prompt
của generate_veo.py (prompt ngắn gọn).

Usage:
  python3 generate_omni.py --only networking-2 networking-1
"""
import argparse
import base64
import os
import subprocess
import sys
import warnings

warnings.filterwarnings("ignore")

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from generate_veo import SCENES, GALLERY, CLIPS, load_project  # noqa: E402

MODEL = "gemini-omni-flash-preview"
LOCATION = "global"
REFS = os.path.join(HERE, "refs")


def prep(image_name):
    """Crop 16:9 → 1920x1080 làm ảnh đầu vào; trả bytes."""
    os.makedirs(REFS, exist_ok=True)
    src = os.path.join(GALLERY, image_name)
    dst = os.path.join(REFS, os.path.splitext(image_name)[0] + ".jpg")
    if not os.path.exists(dst):
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src,
                        "-vf", "scale=1920:-2,crop=1920:1080", "-q:v", "2", dst], check=True)
    with open(dst, "rb") as f:
        return f.read()


def generate(name, client, types):
    image_name, prompt = SCENES[name]
    data = prep(image_name)
    print(f"→ {name}: {image_name} → Omni Flash (10s → stitch cắt 3s)")
    r = client.models.generate_content(
        model=MODEL,
        contents=[types.Part.from_bytes(data=data, mime_type="image/jpeg"), prompt],
        config=types.GenerateContentConfig(response_modalities=["TEXT", "VIDEO"]),
    )
    for cand in (r.candidates or []):
        for p in (cand.content.parts or []):
            blob = getattr(p, "inline_data", None)
            if blob and blob.data and "video" in (blob.mime_type or ""):
                raw = blob.data if isinstance(blob.data, bytes) else base64.b64decode(blob.data)
                os.makedirs(CLIPS, exist_ok=True)
                out = os.path.join(CLIPS, f"{name}.mp4")
                with open(out, "wb") as f:
                    f.write(raw)
                print(f"   ✅ {out} ({len(raw) / 1e6:.1f} MB)")
                return
    raise RuntimeError("không có video trong response (Omni có thể bị lọc/nội dung).")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--only", nargs="+", choices=list(SCENES), required=True)
    args = p.parse_args()

    proj = load_project()
    print(f"• Project : {proj}\n• Location: {LOCATION}\n• Model   : {MODEL}\n")
    from google import genai
    from google.genai import types
    client = genai.Client(vertexai=True, project=proj, location=LOCATION)

    failed = []
    for n in args.only:
        try:
            generate(n, client, types)
        except Exception as e:  # noqa: BLE001
            print(f"   ❌ {n}: {str(e)[:300]}", file=sys.stderr)
            failed.append(n)
    print()
    if failed:
        print(f"⚠️  Lỗi: {failed}")
        sys.exit(1)
    print("✅ Xong — ghép: ./stitch.sh")


if __name__ == "__main__":
    main()
