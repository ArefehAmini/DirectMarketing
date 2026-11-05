"""Generate RasaWeb Agent extension icons — teal rounded square with RW."""
from PIL import Image, ImageDraw, ImageFont

def make_icon(size: int, path: str):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # rounded rectangle background — teal gradient approximation
    radius = int(size * 0.22)
    top_color = (20, 184, 166)    # teal-500
    bottom_color = (15, 118, 110) # teal-700

    for y in range(size):
        t = y / max(1, size - 1)
        r = int(top_color[0] + (bottom_color[0] - top_color[0]) * t)
        g = int(top_color[1] + (bottom_color[1] - top_color[1]) * t)
        b = int(top_color[2] + (bottom_color[2] - top_color[2]) * t)
        d.line([(0, y), (size, y)], fill=(r, g, b, 255))

    # apply rounded corners mask
    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    img.putalpha(mask)
    d = ImageDraw.Draw(img)

    # "RW" text
    font = None
    for fp in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]:
        try:
            font = ImageFont.truetype(fp, int(size * 0.42))
            break
        except Exception:
            continue
    if font is None:
        font = ImageFont.load_default()

    text = "RW"
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - tw) / 2 - bbox[0]
    y = (size - th) / 2 - bbox[1]
    d.text((x, y), text, fill=(255, 255, 255, 255), font=font)

    img.save(path, "PNG")
    print(f"OK {path}")

base = "/home/z/my-project/public/extension/icons/"
make_icon(16, base + "icon16.png")
make_icon(48, base + "icon48.png")
make_icon(128, base + "icon128.png")
