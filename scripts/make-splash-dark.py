"""Make splash-dark from splash-light: swap the blue background for a deep navy gradient, keep logo and text."""
import sys
import numpy as np
from PIL import Image, ImageFilter

src, out = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
H, W, _ = im.shape
r, g, b = im[..., 0], im[..., 1], im[..., 2]
# background-like pixels: strongly blue, not white/orange (logo) and not the light tagline
bgmask = (b > r + 120) & (b > 150) & (r < 60)
# smooth estimate of the original background: masked average on a coarse grid, then upscaled
gs = 24
small_sum = np.zeros((H // gs + 1, W // gs + 1, 3)); small_n = np.zeros((H // gs + 1, W // gs + 1, 1))
ys, xs = np.nonzero(bgmask)
np.add.at(small_sum, (ys // gs, xs // gs), im[ys, xs])
np.add.at(small_n, (ys // gs, xs // gs), 1)
avg = small_sum / np.maximum(small_n, 1)
# fill empty cells (under the logo) from neighbours by repeated blurring
known = small_n[..., 0] > 20
for _ in range(60):
    blur = np.asarray(Image.fromarray(np.uint8(np.clip(avg, 0, 255))).filter(ImageFilter.BoxBlur(1))).astype(np.float32)
    avg = np.where(known[..., None], avg, blur)
bg = np.asarray(Image.fromarray(np.uint8(np.clip(avg, 0, 255))).resize((W, H), Image.BILINEAR).filter(ImageFilter.GaussianBlur(20))).astype(np.float32)
# new background: deep navy #0B1020 at the top to dark royal blue #142A7A at the bottom
t = np.linspace(0, 1, H)[:, None, None]
top = np.array([0x0B, 0x10, 0x20], np.float32); bot = np.array([0x14, 0x2A, 0x7A], np.float32)
new_bg = top * (1 - t) + bot * t
# how background-like each pixel is: 1 near the old background, 0 for the logo and text
dist = np.linalg.norm(im - bg, axis=2)
w = np.clip(1 - (dist - 25) / 110, 0, 1)[..., None]
# keep each pixel's offset from the old background (faint decorative arrows stay as soft overlays)
offset = (im - bg) * 0.6
res = im * (1 - w) + (new_bg + offset) * w
Image.fromarray(np.uint8(np.clip(res, 0, 255))).save(out, optimize=True)
print('saved', out, W, H)
