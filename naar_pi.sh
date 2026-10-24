#!/usr/bin/env bash
# Zet de versie van deze map op de Pi en start het spel daar opnieuw.
# De bron is altijd deze map: pas niets met de hand aan op de Pi.
# - de bestanden uit maak_zip.sh gaan naar ~/pesten op de Pi
# - .env.pi wordt daar de .env (SPEL_ADRES, TOEGESTANE_EMAILS)
# - de database en het certificaat (Docker-volumes) blijven bewaard
# Gebruik:  ./naar_pi.sh            (lopende spellen zijn daarna weg)
set -euo pipefail
cd "$(dirname "$0")"

PI=${PI:-diederick@192.168.178.200}
MAP=pesten

./maak_zip.sh
echo "Naar $PI:~/$MAP ..."
ssh "$PI" "mkdir -p ~/$MAP"
scp -q pesten-spel-rpi.zip "$PI:~/$MAP/"
ssh "$PI" "cd ~/$MAP && unzip -q -o pesten-spel-rpi.zip && rm pesten-spel-rpi.zip && docker compose up -d --build && docker ps --format '{{.Names}}\t{{.Status}}' | grep pesten"
