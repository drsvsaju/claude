#!/bin/sh
# After render.mjs: the versions with sound design, poster frames, the loop, the contact sheets. Run from promo/.
set -e
cd "$(dirname "$0")"
node sound.mjs out/sfx.wav
for f in 16x9 9x16; do
  ffmpeg -y -loglevel error -i out/promo-$f-silent.mp4 -i out/sfx.wav -c:v copy -c:a aac -b:a 160k -shortest out/promo-$f-sound.mp4
  # poster frame: the end card (29.6 s) and a second one from the garden moment (10.6 s)
  ffmpeg -y -loglevel error -ss 29.6 -i out/promo-$f-silent.mp4 -frames:v 1 out/poster-$f.png
  ffmpeg -y -loglevel error -ss 10.6 -i out/promo-$f-silent.mp4 -frames:v 1 out/poster-$f-garden.png
  # the loop: the garden growing → harvest → sparkle (7.4–13.0 s = 5.6 s), MP4 and a 720p GIF (15 fps, palette)
  ffmpeg -y -loglevel error -ss 7.4 -t 5.6 -i out/promo-$f-silent.mp4 -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart out/loop-$f.mp4
  if [ "$f" = "16x9" ]; then SC="scale=720:-2"; else SC="scale=-2:720"; fi
  ffmpeg -y -loglevel error -ss 7.4 -t 5.6 -i out/promo-$f-silent.mp4 -vf "fps=15,$SC,split[a][b];[a]palettegen=max_colors=192[p];[b][p]paletteuse=dither=sierra2_4a" -loop 0 out/loop-$f.gif
  # contact sheet: one frame every second (30 frames)
  if [ "$f" = "16x9" ]; then TILE="6x5"; W=480; else TILE="10x3"; W=216; fi
  ffmpeg -y -loglevel error -i out/promo-$f-silent.mp4 -vf "select='not(mod(n\,60))',scale=$W:-2,tile=${TILE}:margin=6:padding=6:color=0x202020" -frames:v 1 out/contact-$f.png
done
ls -la out/*.mp4 out/*.png out/*.gif | awk '{print $5, $9}'
