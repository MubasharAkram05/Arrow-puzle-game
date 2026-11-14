"""
Regenerate every app icon, splash screen and web icon from the source art in brand-images/ (npm run assets).

Sources (made with an image AI, processed here, never redrawn):
  icon-full.png        full square icon          -> Play Store icon, web icons, favicon, apple-touch-icon
  icon-foreground.png  logo on transparent       -> adaptive icon foreground, splash icon, maskable icon
  icon-background.png  blue gradient             -> adaptive icon background, maskable background
  icon-mono.png        black logo on transparent -> adaptive monochrome (themed) icon
  splash-light.png     light-mode splash         -> splash screens; the dark one is made from it here
  feature-graphic-source.png  1536 x 1024 art   -> Play Store feature graphic 1024 x 500 (crop + resize only)

Outputs: store-assets/ (Play Store files, Android res/ to copy into android/app/src/main/res) and public/
(web icons, served by Vite). When an android/ project exists, the res/ files are copied into it too.
Needs Python 3 with Pillow and numpy (pip install pillow numpy).
"""
import os
import shutil
import sys

try:
    import numpy as np
    from PIL import Image, ImageDraw, ImageFilter
except ImportError:
    sys.exit('npm run assets needs Python 3 with Pillow and numpy: pip install pillow numpy')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'brand-images')
STORE = os.path.join(ROOT, 'store-assets')
RES = os.path.join(STORE, 'android', 'res')
PUBLIC = os.path.join(ROOT, 'public')
ICONS = os.path.join(PUBLIC, 'icons')

DENSITIES = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
# brand colours (sampled from icon-background / splash-light, and the dark splash)
BRAND_LIGHT = '#0250F7'  # royal blue, Android 12+ splash background in light mode
BRAND_DARK = '#0B1020'  # deep navy, dark mode
DARK_BOTTOM = (0x14, 0x2A, 0x7A)  # dark royal blue at the bottom of the dark splash
# legacy splash sizes (portrait; landscape swaps them), the usual Android splash density sizes
PORT_SPLASH = {'mdpi': (320, 480), 'hdpi': (480, 800), 'xhdpi': (720, 1280), 'xxhdpi': (960, 1600), 'xxxhdpi': (1280, 1920)}

written = []


def out(path, im, **kw):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, optimize=True, **kw)
    written.append(path)


def load(name):
    return Image.open(os.path.join(SRC, name))


def resize(im, size):
    """High quality resize; RGBA is resized premultiplied so transparent edges get no dark fringe."""
    if im.mode == 'RGBA':
        return im.convert('RGBa').resize(size, Image.LANCZOS).convert('RGBA')
    return im.resize(size, Image.LANCZOS)


# ---------- clean-up of the AI art ----------


def clean_alpha(im, far=60, floor=4):
    """Drop alpha noise: values under `floor`, and faint pixels more than `far` px from any solid art
    (stray specks). Glows next to the art stay. Fully transparent pixels get a neutral colour."""
    im = im.convert('RGBA')
    a = im.getchannel('A')
    solid = a.point(lambda v: 255 if v > 128 else 0)
    near = solid.filter(ImageFilter.MaxFilter(2 * (far // 2) + 1))
    A = np.asarray(a).copy()
    A[A < floor] = 0
    A[np.asarray(near) == 0] = 0
    px = np.asarray(im).copy()
    px[..., 3] = A
    px[A == 0, :3] = 0
    return Image.fromarray(px, 'RGBA')


def art_center_radius(im, thresh=128):
    """Centre of the solid art's bounding box and the farthest solid pixel from it (px)."""
    A = np.asarray(im.getchannel('A'))
    ys, xs = np.nonzero(A > thresh)
    cx = (xs.min() + xs.max()) / 2
    cy = (ys.min() + ys.max()) / 2
    return cx, cy, float(np.sqrt((xs - cx) ** 2 + (ys - cy) ** 2).max())


def place(art, canvas, radius, bg=None):
    """Art centred on a canvas x canvas square, scaled so every solid pixel lies within `radius` px of the
    centre (a circular safe zone: nothing is cut by round or squircle masks)."""
    cx, cy, r = art_center_radius(art)
    k = radius / r
    w, h = round(art.width * k), round(art.height * k)
    scaled = resize(art, (w, h))
    base = bg.copy().convert('RGBA') if bg is not None else Image.new('RGBA', (canvas, canvas), (0, 0, 0, 0))
    layer = Image.new('RGBA', (canvas, canvas), (0, 0, 0, 0))
    layer.paste(scaled, (round(canvas / 2 - cx * k), round(canvas / 2 - cy * k)), scaled)
    return Image.alpha_composite(base, layer)


def white(im):
    """Monochrome layer: white with the source's darkness as alpha (Android tints it)."""
    im = im.convert('RGBA')
    px = np.asarray(im).astype(np.float32)
    lum = px[..., :3].mean(axis=2)
    alpha = px[..., 3] * (1 - lum / 255)
    res = np.zeros_like(px)
    res[..., :3] = 255
    res[..., 3] = alpha
    return Image.fromarray(res.astype(np.uint8), 'RGBA')


def mask(im, shape):
    """Round (circle) or square (rounded corners, like pre-Oreo launcher icons) mask, 4x supersampled."""
    s = im.width
    big = Image.new('L', (s * 4, s * 4), 0)
    d = ImageDraw.Draw(big)
    if shape == 'round':
        d.ellipse((0, 0, s * 4 - 1, s * 4 - 1), fill=255)
    else:
        d.rounded_rectangle((0, 0, s * 4 - 1, s * 4 - 1), radius=s * 4 * 0.18, fill=255)
    m = big.resize((s, s), Image.LANCZOS)
    res = im.convert('RGBA')
    res.putalpha(Image.fromarray(np.minimum(np.asarray(res.getchannel('A')), np.asarray(m))))
    return res


# ---------- splash ----------


def estimate_bg(src):
    """The splash background without the logo and text: blue-ish pixels averaged on a coarse grid, holes
    under the logo filled from their neighbours, then smoothed. Same size as src, float RGB."""
    im = np.asarray(src.convert('RGB')).astype(np.float32)
    H, W, _ = im.shape
    r, b = im[..., 0], im[..., 2]
    bgmask = (b > r + 120) & (b > 150) & (r < 60)
    gs = 24
    ssum = np.zeros((H // gs + 1, W // gs + 1, 3))
    sn = np.zeros((H // gs + 1, W // gs + 1, 1))
    ys, xs = np.nonzero(bgmask)
    np.add.at(ssum, (ys // gs, xs // gs), im[ys, xs])
    np.add.at(sn, (ys // gs, xs // gs), 1)
    avg = ssum / np.maximum(sn, 1)
    known = sn[..., 0] > 20
    for _ in range(60):
        blur = np.asarray(Image.fromarray(np.uint8(np.clip(avg, 0, 255))).filter(ImageFilter.BoxBlur(1))).astype(
            np.float32
        )
        avg = np.where(known[..., None], avg, blur)
    small = Image.fromarray(np.uint8(np.clip(avg, 0, 255)))
    return np.asarray(small.resize((W, H), Image.BILINEAR).filter(ImageFilter.GaussianBlur(20))).astype(np.float32)


def rebase(im, bg, new_bg):
    """Move pixels from background `bg` to `new_bg`: background-like pixels keep their offset (the soft
    decorative arrows), pixels far from the background (logo, title, tagline) stay as they are."""
    dist = np.linalg.norm(im - bg, axis=2)
    w = np.clip(1 - (dist - 25) / 110, 0, 1)[..., None]
    return im * (1 - w) + (new_bg + (im - bg) * 0.6) * w


def dark_splash(light):
    """Dark-mode splash: same logo and text, background deep navy #0B1020 (top) to dark royal blue (bottom)."""
    im = np.asarray(light.convert('RGB')).astype(np.float32)
    H = im.shape[0]
    t = np.linspace(0, 1, H)[:, None, None]
    new_bg = np.array([0x0B, 0x10, 0x20], np.float32) * (1 - t) + np.array(DARK_BOTTOM, np.float32) * t
    return Image.fromarray(np.uint8(np.clip(rebase(im, estimate_bg(light), new_bg), 0, 255)))


def fit_splash(src, W, H):
    """Splash at any size: cover-crop when the shape is close to the source (portrait). Wider shapes
    (landscape) show the whole splash, centred, with its own edge colours carried out to both sides, so the
    logo is never cut and there is no seam."""
    sw, sh = src.size
    if (W / H) <= (sw / sh) * 1.25:
        k = max(W / sw, H / sh)
        im = resize(src, (round(sw * k), round(sh * k)))
        x, y = (im.width - W) // 2, (im.height - H) // 2
        return im.crop((x, y, x + W, y + H))
    k = H / sh
    w = round(sw * k)
    fg = np.asarray(resize(src.convert('RGB'), (w, H))).astype(np.float32)
    x0 = (W - w) // 2
    # each side is the splash's own outermost columns (softly blurred down the height) stretched outward,
    # so the colours meet exactly at the join
    left = np.asarray(Image.fromarray(np.uint8(fg[:, :12].mean(axis=1, keepdims=True).repeat(4, 1))).filter(
        ImageFilter.GaussianBlur(12))).astype(np.float32)[:, :1]
    right = np.asarray(Image.fromarray(np.uint8(fg[:, -12:].mean(axis=1, keepdims=True).repeat(4, 1))).filter(
        ImageFilter.GaussianBlur(12))).astype(np.float32)[:, :1]
    canvas = np.zeros((H, W, 3), np.float32)
    canvas[:, :x0] = left
    canvas[:, x0 + w :] = right
    # blend the outer 8% of the splash into those columns, so no edge line shows
    t = np.linspace(0, 1, w)
    edge = np.clip(np.minimum(t, 1 - t) / 0.08, 0, 1)[None, :, None]
    side = np.where(t[None, :, None] < 0.5, left[:, :, :], right[:, :, :])
    canvas[:, x0 : x0 + w] = fg * edge + side * (1 - edge)
    return Image.fromarray(np.uint8(np.clip(canvas, 0, 255)))


# ---------- Play Store feature graphic ----------

FEATURE = (1024, 500)
FEATURE_MARGIN = 0.08  # logo and text keep at least 8% of the width / height free on every side


def content_box(im, thresh=40, min_px=40):
    """Box (x0, y0, x1, y1) around the logo and text. The background is a cyan-to-blue gradient whose red
    channel stays near 0 (faint background arrows too), while the white logo, orange arrow, title and tagline
    (with their glow) are far redder, so the red channel finds them. Rows and columns with only a few such
    pixels (stray noise) are ignored."""
    red = np.asarray(im.convert('RGB'))[..., 0] > thresh
    cols = np.nonzero(red.sum(axis=0) >= min_px // 10)[0]
    rows = np.nonzero(red.sum(axis=1) >= min_px // 10)[0]
    if red.sum() < min_px or not len(cols) or not len(rows):
        sys.exit('feature graphic: no logo or text found in brand-images/feature-graphic-source.png')
    return int(cols[0]), int(rows[0]), int(cols[-1]) + 1, int(rows[-1]) + 1


def feature_crop(size, box, ratio=FEATURE[0] / FEATURE[1], margin=FEATURE_MARGIN):
    """Crop rectangle (may reach outside the picture) with the content box in its centre: as large as the
    picture allows (full width when the content is centred), never smaller than the content plus the margin.
    Parts outside the picture are filled by extending its edges (see extend)."""
    W, H = size
    x0, y0, x1, y1 = box
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    # smallest crop that keeps the margin on every side
    need_w = max((x1 - x0) / (1 - 2 * margin), (y1 - y0) / (1 - 2 * margin) * ratio)
    # largest crop centred on the content that stays inside the picture
    fit_w = min(2 * min(cx, W - cx), 2 * min(cy, H - cy) * ratio)
    w = max(need_w, fit_w)
    h = w / ratio
    return round(cx - w / 2), round(cy - h / 2), round(cx + w / 2), round(cy + h / 2)


def extend(im, rect):
    """Crop rect out of im; anything outside the picture repeats the nearest edge pixels (no redrawing)."""
    x0, y0, x1, y1 = rect
    a = np.asarray(im.convert('RGB'))
    H, W = a.shape[:2]
    pad = ((max(0, -y0), max(0, y1 - H)), (max(0, -x0), max(0, x1 - W)), (0, 0))
    a = np.pad(a, pad, mode='edge')
    ox, oy = pad[1][0], pad[0][0]
    return Image.fromarray(a[y0 + oy : y1 + oy, x0 + ox : x1 + ox])


def feature_graphic(src):
    box = content_box(src)
    rect = feature_crop(src.size, box)
    return extend(src, rect).resize(FEATURE, Image.LANCZOS), box, rect


def main():
    full = load('icon-full.png').convert('RGB')
    fg = clean_alpha(load('icon-foreground.png'))
    bgimg = load('icon-background.png').convert('RGB')
    mono = white(clean_alpha(load('icon-mono.png'), floor=8))
    light = load('splash-light.png').convert('RGB')
    dark = dark_splash(light)

    # Play Store icon: 512 x 512, full square, no transparency
    out(os.path.join(STORE, 'play', 'icon-512.png'), resize(full, (512, 512)))

    # Play Store feature graphic: 1024 x 500, no transparency, PNG and JPG
    fsrc = load('feature-graphic-source.png').convert('RGB')
    feat, box, rect = feature_graphic(fsrc)
    out(os.path.join(STORE, 'play', 'feature-graphic.png'), feat)
    out(os.path.join(STORE, 'play', 'feature-graphic.jpg'), feat, quality=92, subsampling=0)
    print(f'feature graphic: content {box}, crop {rect} of {fsrc.size}')

    # Android adaptive icon: 108dp layers, art inside the 66dp safe circle (radius 33dp)
    for d, k in DENSITIES.items():
        mm = os.path.join(RES, f'mipmap-{d}')
        c = round(108 * k)
        out(os.path.join(mm, 'ic_launcher_foreground.png'), place(fg, c, 33 * k))
        out(os.path.join(mm, 'ic_launcher_background.png'), resize(bgimg, (c, c)))
        out(os.path.join(mm, 'ic_launcher_monochrome.png'), place(mono, c, 33 * k))
        # legacy launcher icons (before Android 8): 48dp, the same art on the background, square and round
        s = round(48 * k)
        legacy = place(fg, round(48 * k), 48 * k * 33 / 72, bg=resize(bgimg, (s, s)))
        out(os.path.join(mm, 'ic_launcher.png'), mask(legacy, 'square'))
        out(os.path.join(mm, 'ic_launcher_round.png'), mask(legacy, 'round'))
        # Android 12+ splash icon: 288dp canvas, art inside the 192dp circle (no icon background)
        out(os.path.join(RES, f'drawable-{d}', 'splash_icon.png'), place(fg, round(288 * k), 92 * k))
    adaptive = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
        '    <background android:drawable="@mipmap/ic_launcher_background" />\n'
        '    <foreground android:drawable="@mipmap/ic_launcher_foreground" />\n'
        '    <monochrome android:drawable="@mipmap/ic_launcher_monochrome" />\n'
        '</adaptive-icon>\n'
    )
    for name in ('ic_launcher.xml', 'ic_launcher_round.xml'):
        write_text(os.path.join(RES, 'mipmap-anydpi-v26', name), adaptive)
    write_text(
        os.path.join(RES, 'values', 'splash_colors.xml'),
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
        f'    <color name="splash_background">{BRAND_LIGHT}</color>\n</resources>\n',
    )
    write_text(
        os.path.join(RES, 'values-night', 'splash_colors.xml'),
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
        f'    <color name="splash_background">{BRAND_DARK}</color>\n</resources>\n',
    )

    # @capacitor/splash-screen (Android 11 and older): drawable-(port|land)(-night)-<density>/splash.png
    # (Android wants the qualifiers in this order: orientation, then night mode, then density)
    for d, (w, h) in PORT_SPLASH.items():
        for night, src in (('', light), ('-night', dark)):
            out(os.path.join(RES, f'drawable-port{night}-{d}', 'splash.png'), fit_splash(src, w, h))
            out(os.path.join(RES, f'drawable-land{night}-{d}', 'splash.png'), fit_splash(src, h, w))
    out(os.path.join(RES, 'drawable', 'splash.png'), fit_splash(light, 480, 800))
    out(os.path.join(RES, 'drawable-night', 'splash.png'), fit_splash(dark, 480, 800))

    # full-size splash pictures for review
    out(os.path.join(STORE, 'splash', 'splash-light-1080x1920.png'), fit_splash(light, 1080, 1920))
    out(os.path.join(STORE, 'splash', 'splash-dark-1080x1920.png'), fit_splash(dark, 1080, 1920))

    # Web / PWA
    out(os.path.join(ICONS, 'icon-192.png'), resize(full, (192, 192)))
    out(os.path.join(ICONS, 'icon-512.png'), resize(full, (512, 512)))
    # maskable: full-bleed background, art inside the 80% safe circle (radius 40%)
    out(os.path.join(ICONS, 'maskable-512.png'), place(fg, 512, 512 * 0.38, bg=resize(bgimg, (512, 512))).convert('RGB'))
    out(os.path.join(ICONS, 'apple-touch-icon.png'), resize(full, (180, 180)))
    # loading screen and in-app logo: the logo alone (transparent)
    out(os.path.join(ICONS, 'logo-256.png'), place(fg, 256, 120))
    fav = resize(full, (256, 256))
    os.makedirs(PUBLIC, exist_ok=True)
    fav.save(os.path.join(PUBLIC, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])
    written.append(os.path.join(PUBLIC, 'favicon.ico'))

    # 48px readability check pictures (review only)
    out(os.path.join(STORE, 'checks', 'icon-48.png'), resize(full, (48, 48)))
    out(os.path.join(STORE, 'checks', 'adaptive-round-48.png'), Image.open(os.path.join(RES, 'mipmap-mdpi', 'ic_launcher_round.png')))

    # copy into a native project when there is one
    native = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')
    if os.path.isdir(native):
        shutil.copytree(RES, native, dirs_exist_ok=True)
        print('copied res/ into', os.path.relpath(native, ROOT))
    write_readme()
    print(f'wrote {len(written)} files')


def write_text(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    written.append(path)


# ---------- store-assets/README.md ----------

def slot_and_check(rel, im, size):
    """Which slot a file is for, and whether it meets the rules (Google Play's for store files)."""
    w, h = im.size
    opaque = im.mode in ('RGB', 'L', 'P')
    side_ok = 320 <= min(w, h) and max(w, h) <= 3840 and max(w, h) <= 2 * min(w, h)
    name = os.path.basename(rel)
    if rel.startswith('store-assets/play/feature-graphic.'):
        ok = (w, h) == FEATURE and im.mode == 'RGB' and size <= 1024 * 1024
        return 'Play Store: feature graphic (1024 x 500 PNG/JPEG, no alpha, up to 1 MB)', ok
    if rel == 'store-assets/play/icon-512.png':
        ok = (w, h) == (512, 512) and opaque and size <= 1024 * 1024
        return 'Play Store: app icon (512 x 512 PNG, up to 1 MB, full square)', ok
    if '/screenshots/phone/' in rel:
        return 'Play Store: phone screenshot (PNG/JPEG, no alpha, sides 320-3840 px, max 2:1)', opaque and side_ok
    if '/screenshots/tablet-7/' in rel:
        return 'Play Store: 7-inch tablet screenshot (no alpha, sides 1080-3840 px, max 2:1)', opaque and side_ok and min(w, h) >= 1080
    if '/screenshots/tablet-10/' in rel:
        return 'Play Store: 10-inch tablet screenshot (no alpha, sides 1080-3840 px, max 2:1)', opaque and side_ok and min(w, h) >= 1080
    if '/splash/' in rel:
        return 'Review copy of the splash screen (not uploaded)', (w, h) == (1080, 1920)
    if '/checks/' in rel:
        return 'Review only: the icon at 48 px', (w, h) == (48, 48)
    dens = next((d for d in DENSITIES if f'-{d}/' in rel or rel.endswith(f'-{d}')), None)
    k = DENSITIES.get(dens, 1)
    if name in ('ic_launcher_foreground.png', 'ic_launcher_background.png', 'ic_launcher_monochrome.png'):
        layer = name[len('ic_launcher_'):-4]
        return f'Android adaptive icon {layer} layer (108 dp, {dens})', (w, h) == (round(108 * k),) * 2
    if name in ('ic_launcher.png', 'ic_launcher_round.png'):
        kind = 'round' if 'round' in name else 'square'
        return f'Android launcher icon, {kind}, before Android 8 (48 dp, {dens})', (w, h) == (round(48 * k),) * 2
    if name == 'splash_icon.png':
        return f'Android 12+ splash icon (288 dp, art in the 192 dp circle, {dens})', (w, h) == (round(288 * k),) * 2
    if name == 'splash.png':
        night = 'dark' if '-night' in rel else 'light'
        pw, ph = PORT_SPLASH.get(dens, (480, 800))
        want = (ph, pw) if '-land-' in rel else (pw, ph)
        return f'@capacitor/splash-screen, Android 11 and older ({night})', (w, h) == want
    web = {
        'icon-192.png': ('Web app manifest icon (any)', (192, 192)),
        'icon-512.png': ('Web app manifest icon (any)', (512, 512)),
        'maskable-512.png': ('Web app manifest icon (maskable, art in the 80% safe circle)', (512, 512)),
        'apple-touch-icon.png': ('iOS home screen icon', (180, 180)),
        'logo-256.png': ('Loading screen, Home and Credits logo (transparent)', (256, 256)),
    }
    if name in web:
        return web[name][0], (w, h) == web[name][1]
    return '', True


def write_readme():
    lines = []
    files = sorted(
        os.path.relpath(os.path.join(d, f), ROOT).replace(os.sep, '/')
        for top in (STORE, ICONS)
        for d, _, fs in os.walk(top)
        for f in fs
        if f.endswith('.png') or f.startswith('feature-graphic.')
    )
    for rel in files:
        im = Image.open(os.path.join(ROOT, rel))
        size = os.path.getsize(os.path.join(ROOT, rel))
        slot, ok = slot_and_check(rel, im, size)
        lines.append(f'| `{rel}` | {im.width} x {im.height} | {size / 1024:.0f} KB | {slot} | {"✅" if ok else "❌"} |')
    fav = os.path.join(PUBLIC, 'favicon.ico')
    lines.append(f'| `public/favicon.ico` | 16, 32, 48 | {os.path.getsize(fav) / 1024:.0f} KB | Browser tab icon | ✅ |')
    text = HEADER + '\n'.join(lines) + '\n' + FOOTER
    with open(os.path.join(STORE, 'README.md'), 'w', encoding='utf-8') as f:
        f.write(text)
    written.append(os.path.join(STORE, 'README.md'))


HEADER = """# Store assets: Arrow Expert

Made from the source art in `brand-images/` by `npm run assets` (`scripts/assets.py`; needs Python 3 with
Pillow and numpy). The screenshots come from the real game with `npm run screenshots`
(`scripts/store-screenshots.cjs`, Playwright). This file is written by `npm run assets`: run it again after new
screenshots so the table is up to date.

- ✅ = meets the rule in the "Slot" column (Google Play's rules for store files, as of late 2026; check the
  Play Console when uploading).
- Feature graphic (1024 x 500): `play/feature-graphic.png` and `.jpg`, cropped and resized (never redrawn)
  from `brand-images/feature-graphic-source.png`, with the logo and text found automatically, centred, and at
  least 8% from every edge.
- `android/res/` goes into `android/app/src/main/res/` once the Android project exists (`npx cap add android`);
  `npm run assets` copies it there automatically when that folder exists. Merge `android/splash-theme.xml`
  into `values/styles.xml`.
- Package ID: `com.sussal.arrowexpert` (`capacitor.config.json`).

| File | Size (px) | File size | Slot | OK |
| --- | --- | --- | --- | --- |
"""

FOOTER = """
Other files: `android/res/mipmap-anydpi-v26/ic_launcher.xml` and `ic_launcher_round.xml` (adaptive icon with
background, foreground and monochrome layers), `android/res/values[-night]/splash_colors.xml` (splash background:
royal blue #0250F7 light, deep navy #0B1020 dark), `android/splash-theme.xml`, `listing.md` (store text).
"""


if __name__ == '__main__':
    main()
