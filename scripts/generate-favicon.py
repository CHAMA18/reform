#!/usr/bin/env python3
"""
Generate Reform favicon files (favicon.ico + icon-192.png + icon-512.png)
from the brand design: amber gradient rounded rect with white "R" monogram.

Outputs:
  public/favicon.ico      — multi-resolution ICO (16, 32, 48 px)
  public/icon-192.png     — 192x192 PNG (Android/PWA)
  public/icon-512.png     — 512x512 PNG (PWA)
"""
from PIL import Image, ImageDraw, ImageFont
import os

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public')

# Brand colors (match public/logo.svg and the app-shell brand mark)
AMBER_LIGHT = (245, 158, 11)   # #f59e0b
AMBER_DARK  = (217, 119, 6)    # #d97706
WHITE       = (255, 255, 255)


def make_gradient(size, corner_radius):
    """Create a diagonal amber gradient with rounded corners."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    for y in range(size):
        for x in range(size):
            # Diagonal interpolation: 0 at top-left, 1 at bottom-right
            t = (x + y) / (2 * size) if size > 0 else 0
            r = int(AMBER_LIGHT[0] + (AMBER_DARK[0] - AMBER_LIGHT[0]) * t)
            g = int(AMBER_LIGHT[1] + (AMBER_DARK[1] - AMBER_LIGHT[1]) * t)
            b = int(AMBER_LIGHT[2] + (AMBER_DARK[2] - AMBER_LIGHT[2]) * t)
            img.putpixel((x, y), (r, g, b, 255))

    # Round the corners using a mask
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=corner_radius, fill=255)
    result = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    result.paste(img, (0, 0), mask)
    return result


def find_font(size):
    """Find a usable bold sans-serif font for the R monogram."""
    font_paths = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
        '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf',
    ]
    for p in font_paths:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def draw_monogram(img, size):
    """Draw the white 'R' monogram centered on the image."""
    draw = ImageDraw.Draw(img)
    # Font size ~62% of the icon size — a single-letter monogram looks
    # better slightly larger than the two-letter original.
    font_size = int(size * 0.62)
    font = find_font(font_size)
    text = 'R'
    # Measure text for centering
    try:
        bbox = draw.textbbox((0, 0), text, font=font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]
        # textbbox returns (left, top, right, bottom); adjust for the
        # fact that top is the ascender, not the visual top.
        x = (size - text_w) / 2 - bbox[0]
        y = (size - text_h) / 2 - bbox[1] - int(size * 0.04)
    except AttributeError:
        # Older PIL fallback
        text_w, text_h = draw.textsize(text, font=font)
        x = (size - text_w) / 2
        y = (size - text_h) / 2 - int(size * 0.04)
    draw.text((x, y), text, fill=WHITE, font=font)
    return img


def generate():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Generate the base 512x512 image (used to derive all smaller sizes)
    base = make_gradient(512, corner_radius=96)
    base = draw_monogram(base, 512)

    # Save 512x512 PNG (PWA icon)
    icon_512_path = os.path.join(OUTPUT_DIR, 'icon-512.png')
    base.save(icon_512_path, 'PNG')
    print(f'Wrote {icon_512_path} ({os.path.getsize(icon_512_path)} bytes)')

    # Save 192x192 PNG (Android / PWA)
    icon_192 = base.resize((192, 192), Image.LANCZOS)
    icon_192_path = os.path.join(OUTPUT_DIR, 'icon-192.png')
    icon_192.save(icon_192_path, 'PNG')
    print(f'Wrote {icon_192_path} ({os.path.getsize(icon_192_path)} bytes)')

    # Generate multi-resolution ICO (16, 32, 48)
    # PIL's ICO writer picks sizes from the `sizes` parameter and resizes
    # the base image automatically. We pass the largest (48x48) as the
    # main image and let PIL downscale for 16 and 32.
    sizes = [(16, 16), (32, 32), (48, 48)]
    ico_base = make_gradient(48, corner_radius=8)
    ico_base = draw_monogram(ico_base, 48)
    ico_path = os.path.join(OUTPUT_DIR, 'favicon.ico')
    ico_base.save(
        ico_path,
        format='ICO',
        sizes=sizes,
    )
    print(f'Wrote {ico_path} ({os.path.getsize(ico_path)} bytes)')

    # Verify all sizes are embedded
    from PIL import Image as PILImage
    with PILImage.open(ico_path) as check:
        print(f'  ICO contains sizes: {check.info.get("sizes", "unknown")}')

    print('\nDone. Favicon files generated in', OUTPUT_DIR)


if __name__ == '__main__':
    generate()
