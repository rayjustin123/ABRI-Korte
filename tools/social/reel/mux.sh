#!/bin/bash
# Put the rendered text frames over the base edit, add a silent stereo track (so a trending sound can be added
# in the Facebook or Instagram app), and write the final Reel: H.264 1080x1920 30 fps.
#
#   tools/social/reel/mux.sh [out.mp4] [seconds]        defaults: work/reel.mp4, 12.5
set -e
R=$(cd "$(dirname "$0")" && pwd)
OUT=${1:-$R/work/reel.mp4}
T=${2:-12.5}
ffmpeg -hide_banner -loglevel error -y -i "$R/work/base.mp4" -framerate 30 -i "$R/work/frames/ov_%04d.png" \
  -f lavfi -i anullsrc=r=48000:cl=stereo \
  -filter_complex "[0:v][1:v]overlay=0:0:format=auto:eof_action=repeat,format=yuv420p[v]" \
  -map "[v]" -map 2:a -t "$T" -r 30 \
  -c:v libx264 -preset veryfast -crf 17 -profile:v high -level 4.2 -pix_fmt yuv420p \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -c:a aac -b:a 128k -movflags +faststart "$OUT"
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames:format=duration,size -of compact "$OUT"
