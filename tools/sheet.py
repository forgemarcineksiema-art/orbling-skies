# Dev: contact sheet of frames recorded by tools/rec.js, picked evenly in time (needs Pillow).
# Usage: python tools/sheet.py <dir> <out.png> [from_ms] [to_ms] [cols=5] [n=20] [w=384]
import sys, os, glob
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]
a = int(sys.argv[3]) if len(sys.argv) > 3 else 0
b = int(sys.argv[4]) if len(sys.argv) > 4 else 10**9
cols = int(sys.argv[5]) if len(sys.argv) > 5 else 5
n = int(sys.argv[6]) if len(sys.argv) > 6 else 20
W = int(sys.argv[7]) if len(sys.argv) > 7 else 384
fs = sorted(glob.glob(os.path.join(d, 'f*.jpg')))
fs = [(int(os.path.basename(f).split('_')[1].split('.')[0]), f) for f in fs]
fs = [x for x in fs if a <= x[0] <= b]
if not fs: print('no frames'); sys.exit()
# pick n frames evenly in time
t0, t1 = fs[0][0], fs[-1][0]
pick = []
for i in range(n):
    t = t0 + (t1 - t0) * i / max(1, n - 1)
    best = min(fs, key=lambda x: abs(x[0] - t))
    if best not in pick: pick.append(best)
im0 = Image.open(pick[0][1]); H = int(im0.height * W / im0.width)
rows = (len(pick) + cols - 1) // cols
sheet = Image.new('RGB', (cols * W, rows * H), 'black')
for i, (ms, f) in enumerate(pick):
    im = Image.open(f).convert('RGB').resize((W, H))
    dr = ImageDraw.Draw(im); dr.rectangle([0, 0, 70, 18], fill='black'); dr.text((4, 3), f'{ms} ms', fill='yellow')
    sheet.paste(im, ((i % cols) * W, (i // cols) * H))
sheet.save(out); print('sheet', out, len(pick), 'frames')
