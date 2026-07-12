from __future__ import annotations

import base64
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageFilter


SOURCE = Path("/var/folders/y7/xspwnft5319dmyx_9gh20pcc0000gn/T/codex-clipboard-5a45bc1e-dbe3-4d32-b419-89c52f24d4b5.png")
OUTPUT = Path("assets/brand")
DARK = "#00251f"
WHITE = "#f7f6ef"
MARK_CROP = (30, 55, 188, 166)


def luminance_mask(image: Image.Image) -> Image.Image:
    gray = image.convert("L")
    alpha = gray.point(lambda value: max(0, min(255, round((value - 72) * 255 / 142))))
    return alpha.filter(ImageFilter.GaussianBlur(0.35))


def rdp(points: list[tuple[float, float]], epsilon: float) -> list[tuple[float, float]]:
    if len(points) < 3:
        return points

    start = points[0]
    end = points[-1]
    sx, sy = start
    ex, ey = end
    dx = ex - sx
    dy = ey - sy
    denom = (dx * dx + dy * dy) ** 0.5

    max_distance = 0.0
    index = 0
    for i, (px, py) in enumerate(points[1:-1], 1):
        if denom == 0:
            distance = ((px - sx) ** 2 + (py - sy) ** 2) ** 0.5
        else:
            distance = abs(dy * px - dx * py + ex * sy - ey * sx) / denom
        if distance > max_distance:
            max_distance = distance
            index = i

    if max_distance > epsilon:
        left = rdp(points[: index + 1], epsilon)
        right = rdp(points[index:], epsilon)
        return left[:-1] + right
    return [start, end]


def trace_paths(mask: Image.Image, threshold: int = 112, simplify: float = 0.22) -> str:
    binary = mask.point(lambda value: 255 if value >= threshold else 0)
    width, height = binary.size
    pixels = binary.load()
    edges: dict[tuple[int, int], list[tuple[int, int]]] = {}

    def add_edge(start: tuple[int, int], end: tuple[int, int]) -> None:
        edges.setdefault(start, []).append(end)

    def is_on(x: int, y: int) -> bool:
        return 0 <= x < width and 0 <= y < height and pixels[x, y] > 0

    for y in range(height):
        for x in range(width):
            if not is_on(x, y):
                continue
            if not is_on(x, y - 1):
                add_edge((x, y), (x + 1, y))
            if not is_on(x + 1, y):
                add_edge((x + 1, y), (x + 1, y + 1))
            if not is_on(x, y + 1):
                add_edge((x + 1, y + 1), (x, y + 1))
            if not is_on(x - 1, y):
                add_edge((x, y + 1), (x, y))

    contours: list[list[tuple[int, int]]] = []
    while edges:
        start = next(iter(edges))
        current = start
        contour = [current]
        while True:
            next_points = edges.get(current)
            if not next_points:
                break
            nxt = next_points.pop()
            if not next_points:
                del edges[current]
            contour.append(nxt)
            current = nxt
            if current == start:
                break
        if len(contour) > 4:
            contours.append(contour)

    path_parts: list[str] = []
    for contour in contours:
        points = [(x / 4, y / 4) for x, y in contour]
        if points[0] == points[-1]:
            points = points[:-1]
        points = rdp(points + [points[0]], simplify)[:-1]
        if len(points) < 3:
            continue
        commands = [f"M {points[0][0]:.2f} {points[0][1]:.2f}"]
        commands.extend(f"L {x:.2f} {y:.2f}" for x, y in points[1:])
        commands.append("Z")
        path_parts.append(" ".join(commands))
    return " ".join(path_parts)


def crop_to_art(mask: Image.Image, padding: int = 5) -> tuple[Image.Image, tuple[int, int, int, int]]:
    visible = mask.point(lambda value: 255 if value > 8 else 0)
    bbox = visible.getbbox()
    if bbox is None:
        raise RuntimeError("No wavy artwork found")
    bbox = (
        max(0, bbox[0] - padding),
        max(0, bbox[1] - padding),
        min(mask.width, bbox[2] + padding),
        min(mask.height, bbox[3] + padding),
    )
    return mask.crop(bbox), bbox


def write_svg(path: Path, width: float, height: float, body: str, title: str) -> None:
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.2f} {height:.2f}" width="{width:.0f}" height="{height:.0f}" role="img">
  <title>{title}</title>
  {body}
</svg>
'''
    path.write_text(svg, encoding="ascii")


def save_png_from_mask(mask: Image.Image, path: Path, color: tuple[int, int, int], size: int) -> None:
    scale = size / max(mask.size)
    resized = mask.resize((round(mask.width * scale), round(mask.height * scale)), Image.Resampling.LANCZOS)
    image = Image.new("RGBA", resized.size, (*color, 0))
    image.putalpha(resized)
    image.save(path, optimize=True)


def save_embedded_svg(image: Image.Image, path: Path, title: str) -> None:
    buffer = BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    width, height = image.size
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" role="img">
  <title>{title}</title>
  <image width="{width}" height="{height}" href="data:image/png;base64,{encoded}"/>
</svg>
'''
    path.write_text(svg, encoding="ascii")


OUTPUT.mkdir(parents=True, exist_ok=True)
source = Image.open(SOURCE).convert("RGB")
mark_source = source.crop(MARK_CROP)
mask = luminance_mask(mark_source)

art_mask, bbox = crop_to_art(mask)
high_art = art_mask.resize((art_mask.width * 4, art_mask.height * 4), Image.Resampling.LANCZOS)
art_path = trace_paths(high_art)
write_svg(
    OUTPUT / "founders-vn-wavy-icon-vector-white.svg",
    art_mask.width,
    art_mask.height,
    f'<path fill="{WHITE}" fill-rule="evenodd" d="{art_path}"/>',
    "Founders VN wavy mark - vector traced white",
)
write_svg(
    OUTPUT / "founders-vn-wavy-icon-vector-dark.svg",
    art_mask.width,
    art_mask.height,
    f'<path fill="{DARK}" fill-rule="evenodd" d="{art_path}"/>',
    "Founders VN wavy mark - vector traced dark",
)

save_png_from_mask(art_mask, OUTPUT / "founders-vn-wavy-icon-white-2048.png", (247, 246, 239), 2048)
save_png_from_mask(art_mask, OUTPUT / "founders-vn-wavy-icon-dark-2048.png", (0, 37, 31), 2048)
save_embedded_svg(
    Image.open(OUTPUT / "founders-vn-wavy-icon-white-2048.png"),
    OUTPUT / "founders-vn-wavy-icon-white-2048.svg",
    "Founders VN wavy mark - high resolution white",
)
save_embedded_svg(
    Image.open(OUTPUT / "founders-vn-wavy-icon-dark-2048.png"),
    OUTPUT / "founders-vn-wavy-icon-dark-2048.svg",
    "Founders VN wavy mark - high resolution dark",
)

full_high = mask.resize((mask.width * 4, mask.height * 4), Image.Resampling.LANCZOS)
full_path = trace_paths(full_high)
write_svg(
    OUTPUT / "founders-vn-wavy-icon-rounded-square.svg",
    source.width,
    source.height,
    f'<rect x="15" y="14" width="194" height="195" rx="40" fill="{DARK}"/>\n  <path transform="translate({MARK_CROP[0]} {MARK_CROP[1]})" fill="{WHITE}" fill-rule="evenodd" d="{full_path}"/>',
    "Founders VN wavy mark on rounded square",
)

from PIL import ImageDraw

icon_size = 2048
scale = icon_size / 216
icon = Image.new("RGBA", (icon_size, icon_size), (0, 0, 0, 0))
draw = ImageDraw.Draw(icon)
draw.rounded_rectangle(
    tuple(round(value * scale) for value in (15, 14, 209, 209)),
    radius=round(40 * scale),
    fill=(0, 37, 31, 255),
)
mark_alpha = mask.resize(
    (round(mask.width * scale), round(mask.height * scale)),
    Image.Resampling.LANCZOS,
)
mark = Image.new("RGBA", mark_alpha.size, (247, 246, 239, 0))
mark.putalpha(mark_alpha)
icon.alpha_composite(mark, (round(MARK_CROP[0] * scale), round(MARK_CROP[1] * scale)))
icon.save(OUTPUT / "founders-vn-wavy-icon-rounded-square-2048.png", optimize=True)
save_embedded_svg(
    icon,
    OUTPUT / "founders-vn-wavy-icon-rounded-square-2048.svg",
    "Founders VN wavy mark on rounded square - high resolution",
)
