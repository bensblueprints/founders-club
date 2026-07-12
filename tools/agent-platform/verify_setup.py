#!/usr/bin/env python3
"""Kiểm thử setup Gemini Enterprise Agent Platform (chạy trên nền Vertex AI).

Xác nhận: env đúng → ADC hợp lệ → gọi được model và nhận phản hồi.
Không cần API key; dùng Application Default Credentials từ gcloud.

Chạy:
  python3 verify_setup.py                 # đọc .env cạnh file này (hoặc biến môi trường)
  python3 verify_setup.py --model gemini-2.5-pro
"""
import argparse
import os
import sys
import warnings

warnings.filterwarnings("ignore")  # ẩn cảnh báo EOL của Python 3.9

HERE = os.path.dirname(os.path.abspath(__file__))


def load_env():
    """Nạp biến từ .env cạnh script (nếu có) mà không cần thư viện ngoài."""
    path = os.path.join(HERE, ".env")
    if os.path.exists(path):
        with open(path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    # Mặc định hợp lý nếu chưa set
    os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "true")
    os.environ.setdefault("GOOGLE_CLOUD_LOCATION", "global")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--model", default="gemini-2.5-flash")
    p.add_argument("--location", help="ghi đè GOOGLE_CLOUD_LOCATION (vd us-central1)")
    args = p.parse_args()

    load_env()
    if args.location:
        os.environ["GOOGLE_CLOUD_LOCATION"] = args.location

    project = os.environ.get("GOOGLE_CLOUD_PROJECT")
    location = os.environ.get("GOOGLE_CLOUD_LOCATION")
    if not project:
        sys.exit("❌ Thiếu GOOGLE_CLOUD_PROJECT. Copy .env.example → .env rồi điền project id.")

    print(f"• Project : {project}")
    print(f"• Location: {location}")
    print(f"• Model   : {args.model}")
    print(f"• Vertex  : {os.environ.get('GOOGLE_GENAI_USE_VERTEXAI')}")

    try:
        from google import genai
    except ImportError:
        sys.exit("❌ Chưa có google-genai. Cài: python3 -m pip install --upgrade google-genai")

    try:
        client = genai.Client(vertexai=True, project=project, location=location)
        resp = client.models.generate_content(
            model=args.model,
            contents="Trả lời đúng một câu ngắn: xác nhận Agent Platform đang hoạt động.",
        )
        print("\n✅ THÀNH CÔNG — model trả lời:")
        print("  ", (resp.text or "(rỗng)").strip())
    except Exception as e:  # noqa: BLE001 — verify script cần bắt mọi lỗi để báo rõ
        msg = str(e)
        print("\n❌ GỌI API THẤT BẠI:", msg[:500], file=sys.stderr)
        hint = ""
        if "PERMISSION_DENIED" in msg or "403" in msg:
            hint = ("Kiểm tra: (1) billing đã bật cho project chưa, "
                    "(2) API aiplatform.googleapis.com đã enable chưa.")
        elif "was not found" in msg or "NOT_FOUND" in msg or "404" in msg:
            hint = f"Model '{args.model}' có thể không có ở location '{location}'. Thử: --location us-central1"
        elif "default credentials" in msg.lower() or "reauth" in msg.lower():
            hint = "Chạy lại: gcloud auth application-default login"
        if hint:
            print("👉", hint, file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
