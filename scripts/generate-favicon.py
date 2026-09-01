#!/usr/bin/env python3
"""
Generate Reform favicon files (favicon.ico + icon-192.png + icon-512.png)
from the brand design: amber gradient stacked layers with white "Flow" mark.

The "Flow" mark (logo iteration 1) consists of:
  1. Three stacked rounded rectangles with amber gradients (back at 45%
     opacity, middle at 75%, front at 100% — each offset 2px right)
  2. A white flow symbol — three horizontal lines merging into a single arrow
     (symbolising many form submissions unified into one output)

Outputs:
  public/favicon.ico      — multi-resolution ICO (16, 32, 48 px)
  public/icon-192.png     — 192x192 PNG (Android/PWA)
  public/icon-512.png     — 512x512 PNG (PWA)
"""
from PIL import Image, ImageDraw
import os

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public')

# Brand colors
AMBER_LIGHT  = (245, 158, 11)    # #f59e0b
AMBER_DARK   = (217, 119, 6)     # #d97706
AMBER_LIGHT2 = (251, 191, 36)    # #fbbf24
WHITE        = (255, 255, 255)


def make_gradient(size, c1, c2, corner_radius):
    """Create a diagonal gradient with rounded corners."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size) if size > 0 else 0
            r = int(c1[0] + (c2[0] - c1[0]) * t)
            g = int(c1[1] + (c2[1] - c1[1]) * t)
            b = int(c1[2] + (c2[2] - c1[2]) * t)
            img.putpixel((x, y), (r, g, b, 255))

    # Round the corners using a mask
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=corner_radius, fill=255)
    result = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    result.paste(img, (0, 0), mask)
    return result


def draw_flow_symbol(img, size):
    """Draw the white 'flow' symbol — three lines merging into an arrow.

    The symbol is centered on the image. It consists of:
      - Three horizontal lines on the left (inputs)
      - A single horizontal line on the right (output)
      - An arrowhead at the right end
    """
    draw = ImageDraw.Draw(img)

    # Scale factor: the SVG uses a 64x64 coordinate system.
    # We scale everything proportionally to the actual icon size.
    s = size / 64.0

    # Line width — matches the SVG's stroke-width=3.5
    lw = max(1, int(3.5 * s))

    # The flow symbol is centered at (32, 32) in the 64x64 SVG.
    # We translate to the icon's center.
    cx = size / 2
    cy = size / 2

    # Three input lines on the left (y = -10, 0, +10 relative to center)
    for dy in [-10, 0, 10]:
        y = int(cy + dy * s)
        x1 = int(cx - 22 * s)
        x2 = int(cx - 6 * s)
        draw.line([(x1, y), (x2, y)], fill=WHITE, width=lw)

    # Single output line (from the merge point to the arrow base)
    y_out = int(cy)
    x_merge = int(cx - 6 * s)
    x_arrow_base = int(cx + 14 * s)
    draw.line([(x_merge, y_out), (x_arrow_base, y_out)], fill=WHITE, width=lw)

    # Arrowhead — two lines forming a > shape
    arrow_size = int(8 * s)
    x_tip = int(cx + 22 * s)
    # Top diagonal
    draw.line([(x_arrow_base, int(cy - arrow_size * 0.75)),
              (x_tip, y_out)], fill=WHITE, width=lw)
    # Bottom diagonal
    draw.line([(x_arrow_base, int(cy + arrow_size * 0.75)),
              (x_tip, y_out)], fill=WHITE, width=lw)


def draw_flow_mark(img, size):
    """Draw the complete 'Flow' mark on the image: three stacked layers + flow symbol.

    The layers are drawn with increasing opacity and a small horizontal offset,
    creating a depth effect. The flow symbol is drawn on top in white.
    """
    # Scale the corner radius + offset based on icon size
    corner_radius = max(2, int(size * 0.1875))  # 12/64 = 0.1875
    layer_offset = max(1, int(size * 0.03125))  # 2/64 = 0.03125

    # Layer 1: back (lightest gradient, 45% opacity)
    grad_back = make_gradient(size, AMBER_LIGHT2, AMBER_LIGHT, corner_radius)
    img.paste(grad_back, (0, 0), grad_back)

    # Layer 2: middle (same gradient, 75% opacity, offset right)
    grad_mid = make_gradient(size, AMBER_LIGHT2, AMBER_LIGHT, corner_radius)
    # Create a semi-transparent version
    grad_mid.putalpha(int(255 * 0.75))
    img.paste(grad_mid, (layer_offset, 0), grad_mid)

    # Layer 3: front (darker gradient, 100% opacity, further offset right)
    grad_front = make_gradient(size, AMBER_LIGHT, AMBER_DARK, corner_radius)
    img.paste(grad_front, (layer_offset * 2, 0), grad_front)

    # Draw the flow symbol on top
    draw_flow_symbol(img, size)

    return img


def generate():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Generate the base 512x512 image
    base = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
    base = draw_flow_mark(base, 512)

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
    sizes = [(16, 16), (32, 32), (48, 48)]
    ico_base = Image.new('RGBA', (48, 48), (0, 0, 0, 0))
    ico_base = draw_flow_mark(ico_base, 48)
    ico_path = os.path.join(OUTPUT_DIR, 'favicon.ico')
    ico_base.save(ico_path, format='ICO', sizes=sizes)
    print(f'Wrote {ico_path} ({os.path.getsize(ico_path)} bytes)')

    # Verify all sizes are embedded
    from PIL import Image as PILImage
    with PILImage.open(ico_path) as check:
        print(f'  ICO contains sizes: {check.info.get("sizes", "unknown")}')

    print('\nDone. Favicon files generated in', OUTPUT_DIR)


if __name__ == '__main__':
    generate()
