#!/usr/bin/env bash
# Ghép các clip (đặt tên theo nội dung) thành hero video theo thứ tự trong order.txt.
# Mỗi clip Veo 4s nhưng CHỈ LẤY 3s (đoạn [1s→4s], bỏ ~1s đầu tĩnh) rồi crossfade.
# Đổi thứ tự / thêm / bớt scene ⇒ chỉ sửa order.txt, KHÔNG cần render lại.
#   ./stitch.sh
#   TRIM_START=1 CLIP_LEN=3 FADE=0.5 ./stitch.sh
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
DIR="$HERE/clips"
OUT="$HERE/out"
ORDER="$HERE/order.txt"
TRIM_START="${TRIM_START:-1}"
CLIP_LEN="${CLIP_LEN:-3}"
LAST_LEN="${LAST_LEN:-3}"       # tất cả clip 3s (kể cả clip cuối)
FADE="${FADE:-0.5}"
LAST_HOLD="${LAST_HOLD:-0}"     # freeze khung cuối (0 = không, vì cảnh cuối đã có cử động thật)
FPS=30; W=1920; H=1080
mkdir -p "$OUT"

[ -f "$ORDER" ] || { echo "❌ Thiếu order.txt ($ORDER)" >&2; exit 1; }

# Đọc thứ tự từ order.txt (bỏ dòng trống / comment)
names=(); clips=()
while IFS= read -r line || [ -n "$line" ]; do
  name="$(echo "$line" | xargs)"
  [ -z "$name" ] && continue
  case "$name" in \#*) continue;; esac
  found=""
  for ext in mp4 mov m4v webm; do [ -f "$DIR/$name.$ext" ] && { found="$DIR/$name.$ext"; break; }; done
  [ -z "$found" ] && { echo "❌ Thiếu clip cho '$name' ($DIR/$name.mp4). Chạy: python3 generate_veo.py --only $name" >&2; exit 1; }
  names+=("$name"); clips+=("$found")
done < "$ORDER"

N=${#clips[@]}
[ "$N" -lt 1 ] && { echo "❌ order.txt rỗng" >&2; exit 1; }
echo "Thứ tự ($N scene, mỗi clip ${CLIP_LEN}s từ ${TRIM_START}s, crossfade ${FADE}s):"
for i in $(seq 0 $((N-1))); do echo "  $((i+1)). ${names[$i]}"; done

inputs=(); FILTER=""
for idx in $(seq 0 $((N-1))); do
  inputs+=(-i "${clips[$idx]}")
  want="$CLIP_LEN"; hold=""
  if [ "$idx" -eq $((N-1)) ]; then          # clip cuối: có thể dài hơn + tuỳ chọn freeze
    want="$LAST_LEN"
    awk "BEGIN{exit !($LAST_HOLD>0)}" && hold="tpad=stop_mode=clone:stop_duration=${LAST_HOLD},"
  fi
  # clip đủ dài → cắt [TRIM_START, +want]; clip ngắn (đã edit sẵn) → dùng full từ 0
  dur=$(ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 "${clips[$idx]}")
  if awk "BEGIN{exit !($dur >= $TRIM_START + $want)}"; then
    st="$TRIM_START"; ln="$want"
  else
    st=0; ln=$(awk "BEGIN{m=($want<$dur)?$want:$dur; printf \"%.3f\", m}")
  fi
  FILTER+="[$idx:v]trim=start=${st}:duration=${ln},setpts=PTS-STARTPTS,"
  FILTER+="scale=$W:$H:force_original_aspect_ratio=increase,crop=$W:$H,fps=$FPS,setsar=1,${hold}format=yuv420p[v$idx];"
done

if [ "$N" -eq 1 ]; then
  FILTER="${FILTER%;}"; MAP="[v0]"
else
  prev="[v0]"
  for k in $(seq 1 $((N-1))); do
    off=$(awk "BEGIN{printf \"%.3f\", $k*($CLIP_LEN-$FADE)}")
    if [ "$k" -eq $((N-1)) ]; then lbl="[vout]"; else lbl="[x$k]"; fi
    FILTER+="${prev}[v$k]xfade=transition=fade:duration=${FADE}:offset=${off}${lbl};"
    prev="[x$k]"
  done
  FILTER="${FILTER%;}"; MAP="[vout]"
fi

echo "→ Encode hero.mp4 (H.264)..."
ffmpeg -hide_banner -loglevel warning -y "${inputs[@]}" \
  -filter_complex "$FILTER" -map "$MAP" -an \
  -c:v libx264 -preset slow -crf 19 -movflags +faststart "$OUT/hero.mp4"

echo "→ Encode hero.webm (VP9, nhanh)..."
ffmpeg -hide_banner -loglevel warning -y -i "$OUT/hero.mp4" -an \
  -c:v libvpx-vp9 -b:v 0 -crf 36 -deadline good -cpu-used 5 -row-mt 1 "$OUT/hero.webm"

echo "→ Poster frame..."
ffmpeg -hide_banner -loglevel warning -y -i "$OUT/hero.mp4" -frames:v 1 -update 1 -q:v 3 "$OUT/poster.jpg"

echo
DUR=$(awk "BEGIN{printf \"%.1f\", ($N-1)*$CLIP_LEN+$LAST_LEN-($N-1)*$FADE+$LAST_HOLD}")
echo "✅ Xong (${N} scene, ~${DUR}s) — file trong $OUT:"
ls -lh "$OUT" | awk 'NR>1{print "   " $9 " — " $5}'
