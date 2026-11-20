#!/bin/bash
cd "$(dirname "$0")/.."
source .venv/Scripts/activate
export PYTHONIOENCODING=utf8
M="python -m reelstudio.production"

for n in 14 15 16 17 18 19 20; do
  e=$(printf "%03d" $n); P=productions/terahvi/ep-$e
  echo "== terahvi ep-$e"
  $M import-episode productions/_import_terahvi $n --out $P --polls polls/terahvi.json --friendly 2>&1 | tail -1
  $M voice $P --provider gemini --voice-name Kore 2>&1 | tail -2
  $M render $P 2>&1 | tail -1
  $M review $P --video 2>&1 | grep -v Proof | tail -6
done
echo ALL DONE
