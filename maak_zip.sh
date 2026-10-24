#!/usr/bin/env bash
# Maakt pesten-spel-rpi.zip: alles wat de Pi nodig heeft, met .env.pi als .env.
# Gebruik:  ./maak_zip.sh
set -euo pipefail
cd "$(dirname "$0")"

BESTANDEN=(Caddyfile Dockerfile .dockerignore docker-compose.yml requirements.txt
           start_pesten.py pesten_spel.ipynb README.md instruction.md static templates)

if [[ ! -f .env.pi ]]; then
  echo "Eerst .env.pi maken (SPEL_ADRES en TOEGESTANE_EMAILS van de Pi)." >&2
  exit 1
fi

tijdelijk=$(mktemp -d)
trap 'rm -rf "$tijdelijk"' EXIT
cp -r "${BESTANDEN[@]}" "$tijdelijk/"
cp .env.pi "$tijdelijk/.env"
find "$tijdelijk" -name __pycache__ -prune -exec rm -rf {} +

rm -f pesten-spel-rpi.zip
(cd "$tijdelijk" && zip -q -r -X "$OLDPWD/pesten-spel-rpi.zip" .)
echo "pesten-spel-rpi.zip gemaakt ($(unzip -l pesten-spel-rpi.zip | tail -1 | awk '{print $2}') bestanden)."
