#!/bin/bash
# Turn vertical iPhone clips (HEVC 10-bit, HLG / Dolby Vision HDR, 4K 60 fps) into SDR working copies for a Reel.
#
#   tools/social/reel/prep_clips.sh /path/IMG_1552.MOV /path/IMG_1553.MOV ...
#   ZOOM=1 tools/social/reel/prep_clips.sh ...      also make 1296x2304 copies, for shots that crop in (see cfg.json)
#
# Writes work/sdr/1552.mp4 (and 1552z.mp4) next to this script. Without the tone mapping, iPhone HDR footage looks
# washed out once posted. Each 4K clip takes about a minute.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$HERE/work/sdr"
TM="zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p"
for f in "$@"; do
  n=$(basename "$f"); n=${n%.*}; n=${n#IMG_}
  sizes="1080x1920:"
  [ -n "$ZOOM" ] && sizes="$sizes 1296x2304:z"
  for s in $sizes; do
    wh=${s%%:*}; suf=${s#*:}; w=${wh%x*}; h=${wh#*x}
    ffmpeg -hide_banner -loglevel error -y -i "$f" -map 0:v:0 -an \
      -vf "scale=$w:$h:flags=lanczos,$TM,setsar=1" -r 60 -c:v libx264 -preset veryfast -crf 10 -pix_fmt yuv420p \
      -color_primaries bt709 -color_trc bt709 -colorspace bt709 "$HERE/work/sdr/$n$suf.mp4"
    echo "$HERE/work/sdr/$n$suf.mp4"
  done
done
