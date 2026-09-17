#!/usr/bin/env bash
# Turns the raw scene recordings into the clips the hero composition renders.
#
#   clips/<scene>/*.webm   (written by scenes.mjs, 2880x1800 @ 25fps)
#     -> mp4/<scene>.mp4   (h264, 30fps, whole scene)
#     -> cut/<name>.mp4    (the ranges listed in cuts.txt)
#     -> ../public/capture  (what HeroVideo.tsx reads through staticFile)
#
# Run from this directory, after `node scenes.mjs all`.
set -euo pipefail
cd "$(dirname "$0")"

mkdir -p mp4 cut ../public/capture

for dir in clips/*/; do
  scene="$(basename "$dir")"
  webm="$(ls "$dir"*.webm | head -1)"
  echo "==> $scene"
  ffmpeg -nostdin -y -v error -i "$webm" \
    -vf fps=30 -c:v libx264 -crf 21 -preset medium -pix_fmt yuv420p \
    -an -movflags +faststart "mp4/$scene.mp4"
done

# cuts.txt: <clip-name> <scene> <start-seconds> <duration-seconds>
while read -r name scene start dur; do
  [ -z "${name:-}" ] && continue
  case "$name" in \#*) continue ;; esac
  ffmpeg -nostdin -y -v error -ss "$start" -t "$dur" -i "mp4/$scene.mp4" \
    -vf fps=30 -c:v libx264 -crf 20 -preset medium -pix_fmt yuv420p \
    -an -movflags +faststart "cut/$name.mp4"
  echo "cut $name <- $scene @${start}s +${dur}s"
done < cuts.txt

cp cut/*.mp4 ../public/capture/
echo "==> public/capture updated; now: npx remotion render NoteBeatHero"
