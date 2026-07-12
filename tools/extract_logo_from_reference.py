from __future__ import annotations

import base64
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter


SOURCE = Path("/Users/maddy/.codex/generated_images/019f4bf5-e97f-7ef2-aa30-1525fd9d63ad/exec-514cfe01-ffc9-4185-a508-304d76b50065.png")
OUTPUT = Path("assets/brand")


def extract(crop_box: tuple[int, int, int, int], stem: str) -> None:
    source = Image.open(SOURCE).convert("RGB").crop(crop_box)
    gray = source.convert("L")

    # The reference has a warm, textured paper background. This luminance matte
    # keeps the original dark-green artwork and softly preserves antialiased edges.
    alpha = gray.point(lambda value: max(0, min(255, round((214 - value) * 255 / 112))))
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.35))

    visible = alpha.point(lambda value: 255 if value > 10 else 0)
    bbox = visible.getbbox()
    if bbox is None:
        raise RuntimeError(f"No artwork found for {stem}")

    padding = 8
    bbox = (
        max(0, bbox[0] - padding),
        max(0, bbox[1] - padding),
        min(source.width, bbox[2] + padding),
        min(source.height, bbox[3] + padding),
    )

    source = source.crop(bbox)
    alpha = alpha.crop(bbox)
    transparent = Image.new("RGBA", source.size)
    transparent.paste(source, mask=alpha)

    png_path = OUTPUT / f"{stem}.png"
    transparent.save(png_path, optimize=True)

    buffer = BytesIO()
    transparent.save(buffer, format="PNG", optimize=True)
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    width, height = transparent.size
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {width} {height}" width="{width}" height="{height}" role="img">
  <title>{stem.replace('-', ' ').title()}</title>
  <image width="{width}" height="{height}" href="data:image/png;base64,{encoded}" xlink:href="data:image/png;base64,{encoded}"/>
</svg>
'''
    (OUTPUT / f"{stem}.svg").write_text(svg, encoding="ascii")


OUTPUT.mkdir(parents=True, exist_ok=True)
extract((145, 88, 1535, 298), "founders-vn-logo-cropped")
extract((1200, 88, 1525, 298), "founders-vn-wavy-cropped")
