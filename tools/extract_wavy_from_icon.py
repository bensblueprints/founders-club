from __future__ import annotations

import base64
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageFilter


SOURCE = Path("/var/folders/y7/xspwnft5319dmyx_9gh20pcc0000gn/T/codex-clipboard-5a45bc1e-dbe3-4d32-b419-89c52f24d4b5.png")
OUTPUT = Path("assets/brand")


def save_svg(image: Image.Image, stem: str) -> None:
    png_path = OUTPUT / f"{stem}.png"
    image.save(png_path, optimize=True)

    buffer = BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    width, height = image.size
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {width} {height}" width="{width}" height="{height}" role="img">
  <title>Founders VN wavy mark - icon source</title>
  <image width="{width}" height="{height}" href="data:image/png;base64,{encoded}" xlink:href="data:image/png;base64,{encoded}"/>
</svg>
'''
    (OUTPUT / f"{stem}.svg").write_text(svg, encoding="ascii")


OUTPUT.mkdir(parents=True, exist_ok=True)
source = Image.open(SOURCE).convert("RGB").crop((30, 55, 188, 166))
gray = source.convert("L")

# The icon interior is near-black and the mark is warm white. A soft luminance
# matte cleanly removes the rounded-square background while retaining edge AA.
alpha = gray.point(lambda value: max(0, min(255, round((value - 72) * 255 / 142))))
alpha = alpha.filter(ImageFilter.GaussianBlur(0.25))
visible = alpha.point(lambda value: 255 if value > 8 else 0)
bbox = visible.getbbox()
if bbox is None:
    raise RuntimeError("No wavy artwork found")

padding = 5
bbox = (
    max(0, bbox[0] - padding),
    max(0, bbox[1] - padding),
    min(source.width, bbox[2] + padding),
    min(source.height, bbox[3] + padding),
)
alpha = alpha.crop(bbox)

# Upscaling does not invent detail; it keeps the embedded raster crisp in apps
# that display SVG images at larger default dimensions.
scale = 4
size = (alpha.width * scale, alpha.height * scale)
alpha = alpha.resize(size, Image.Resampling.LANCZOS)

white = Image.new("RGBA", size, (247, 246, 239, 0))
white.putalpha(alpha)
save_svg(white, "founders-vn-wavy-icon-white")

dark = Image.new("RGBA", size, (0, 37, 31, 0))
dark.putalpha(alpha)
save_svg(dark, "founders-vn-wavy-icon-dark")
