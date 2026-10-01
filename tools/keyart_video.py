# Dev: frames from tools/keyart_shots.js → a muted H.264 MP4 (Poki's animated thumbnail: 1:1, >= 50 fps, 4–6 s).
# Usage: python tools/keyart_video.py <framesDir> <out.mp4> [fps=60]   (needs opencv-python)
import sys, glob, os
import cv2

src, out = sys.argv[1], sys.argv[2]
fps = float(sys.argv[3]) if len(sys.argv) > 3 else 60.0
frames = sorted(glob.glob(os.path.join(src, 'f*.png')))
if not frames:
    sys.exit('no frames in ' + src)
h, w = cv2.imread(frames[0]).shape[:2]
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
vw = cv2.VideoWriter(out, cv2.VideoWriter_fourcc(*'avc1'), fps, (w, h))
if not vw.isOpened():
    sys.exit('H.264 writer not available')
for f in frames:
    vw.write(cv2.imread(f))
vw.release()
data = open(out, 'rb').read()
codec = data[data.find(b'stsd') + 16:data.find(b'stsd') + 20] if b'stsd' in data else b'?'
print(f'{out}: {len(frames)} frames, {w}x{h}, {fps:g} fps, {len(frames) / fps:.2f} s, codec {codec.decode(errors="replace")}, {len(data) / 1e6:.2f} MB')
