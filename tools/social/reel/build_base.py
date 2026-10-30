"""Cut the SDR working copies into the 1080x1920 base edit, without text.

  python3 tools/social/reel/build_base.py tools/social/reel/cfg.json

cfg["shots"] is a list of [clip, in, out, speed] or [clip, in, out, speed, zoom, y_offset]:
clip is the name in work/sdr (1552 for IMG_1552.MOV), in and out are seconds in that clip, speed 0.6 plays at 60%.
A zoom of 1.2 crops into the 1296x2304 copy (make it with ZOOM=1 prep_clips.sh), y_offset picks the crop height.
The last shot sits under the end card and fades to a blur. Writes work/base.mp4 at 30 fps.
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, "work")


def main():
    cfg = json.load(open(sys.argv[1]))
    shots = cfg["shots"]
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"]
    for shot in shots:
        z = len(shot) > 4
        cmd += ["-i", os.path.join(WORK, "sdr", "%s%s.mp4" % (shot[0], "z" if z else ""))]
    parts, labels, total = [], [], 0.0
    for i, shot in enumerate(shots):
        clip, a, b, speed = shot[:4]
        last = i == len(shots) - 1
        f = "[%d:v]trim=start=%.3f:end=%.3f,setpts=(PTS-STARTPTS)/%.4f,fps=30" % (i, a, b, speed)
        if len(shot) > 4:
            zoom, offy = shot[4], shot[5]
            w, h = int(round(1080 * zoom / 2) * 2), int(round(1920 * zoom / 2) * 2)
            offy = max(0, min(offy, h - 1920))
            if (w, h) != (1296, 2304):
                f += ",scale=%d:%d:flags=lanczos" % (w, h)
            f += ",crop=1080:1920:%d:%d" % ((w - 1080) // 2, offy)
        if last:
            sigma = cfg.get("blur", 22)
            f += ",split[s%da][s%db];[s%db]gblur=sigma=%s[s%dc];[s%da][s%dc]xfade=transition=fade:duration=0.5:offset=0[v%d]" % (
                i, i, i, sigma, i, i, i, i)
        else:
            f += "[v%d]" % i
        parts.append(f)
        labels.append("[v%d]" % i)
        total += (b - a) / speed
    parts.append("".join(labels) + "concat=n=%d:v=1:a=0,format=yuv420p[out]" % len(shots))
    out = os.path.join(WORK, cfg.get("base", "base.mp4"))
    cmd += ["-filter_complex", ";".join(parts), "-map", "[out]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "14",
            "-r", "30", "-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", out]
    subprocess.run(cmd, check=True)
    print("expected %.3f s ->" % total, out)


if __name__ == "__main__":
    main()
