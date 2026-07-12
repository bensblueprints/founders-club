#!/usr/bin/env python3
"""Nâng nét ảnh bằng Nano Banana Pro (gemini-3-pro-image) trên Vertex AI.

Model image-gen của Google chỉ phục vụ ở LOCATION="global" (không phải us-central1).
Giữ nguyên danh tính/khuôn mặt/bố cục, chỉ tăng độ nét + độ phân giải.

Usage:
  python3 enhance_image.py <input> <output> ["prompt tuỳ chọn"]
"""
import os
import sys
import warnings

warnings.filterwarnings("ignore")

MODEL = "gemini-3-pro-image"    # Nano Banana Pro
LOCATION = "global"             # image-gen model phục vụ ở global
ENV_FILE = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                         "..", "agent-platform", ".env"))

DEFAULT_PROMPT = (
    "Enhance and upscale this real group photo to crisp high resolution and "
    "professional full-frame camera quality: sharp focus, fine natural detail, "
    "clean warm lighting, realistic skin texture, no blur. Keep EVERY person's "
    "face, identity, expression, pose, hairstyle and clothing exactly the same; "
    "keep the exact same people, the same count, the same positions, and the whole "
    "background and framing unchanged. Do not stylize, do not beautify faces, do "
    "not add or remove anyone, do not change the composition. Only increase "
    "sharpness, clarity, fine detail and resolution. Photorealistic result.")


def load_project():
    if os.environ.get("GOOGLE_CLOUD_PROJECT"):
        return os.environ["GOOGLE_CLOUD_PROJECT"].strip()
    with open(ENV_FILE) as f:
        for line in f:
            if line.strip().startswith("GOOGLE_CLOUD_PROJECT="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("❌ Không thấy GOOGLE_CLOUD_PROJECT")


def main():
    if len(sys.argv) < 3:
        sys.exit("Usage: enhance_image.py <input> <output> [prompt]")
    inp, outp = sys.argv[1], sys.argv[2]
    prompt = sys.argv[3] if len(sys.argv) > 3 else DEFAULT_PROMPT

    from google import genai
    from google.genai import types

    proj = load_project()
    data = open(inp, "rb").read()
    mime = "image/png" if inp.lower().endswith(".png") else "image/jpeg"
    client = genai.Client(vertexai=True, project=proj, location=LOCATION)
    contents = [prompt, types.Part.from_bytes(data=data, mime_type=mime)]

    # thử cấu hình ảnh nét cao 2K/4K; nếu SDK/model không nhận thì fallback config thường
    configs = []
    for size in ("4K", "2K"):
        try:
            configs.append(types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"],
                image_config=types.ImageConfig(image_size=size)))
        except Exception:
            pass
    configs.append(types.GenerateContentConfig(response_modalities=["TEXT", "IMAGE"]))

    last = "unknown"
    for cfg in configs:
        try:
            r = client.models.generate_content(model=MODEL, contents=contents, config=cfg)
        except Exception as e:  # noqa: BLE001
            last = str(e)[:200]
            continue
        for c in (r.candidates or []):
            for p in (c.content.parts or []):
                blob = getattr(p, "inline_data", None)
                if blob and blob.data:
                    raw = blob.data
                    if isinstance(raw, str):
                        import base64
                        raw = base64.b64decode(raw)
                    with open(outp, "wb") as f:
                        f.write(raw)
                    print(f"✅ saved {outp} ({len(raw)/1e6:.1f} MB)")
                    return
        last = "no image in response"
    sys.exit(f"❌ thất bại: {last}")


if __name__ == "__main__":
    main()
