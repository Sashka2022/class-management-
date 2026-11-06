#!/bin/bash
# usage: sheet.sh meta.json key out.png [fps]
f=$(python3 -c "import json,sys;print(json.load(open('$1'))['files']['$2'])")
ffmpeg -v error -y -i "$f" -vf "fps=${4:-0.5},scale=640:-1,tile=4x3" -frames:v 1 "$3"
