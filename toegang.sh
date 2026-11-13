#!/usr/bin/env bash
# Toegang tot het spel beheren (na een e-mail "Registreren").
# De goedgekeurde adressen staan in database/toegestane_emails.txt in het spel op de Pi.
# Het spel leest dat bestand zelf opnieuw: niets opnieuw starten, lopende spellen blijven.
#
# Gebruik:
#   ./toegang.sh lijst                      wie er toegang heeft
#   ./toegang.sh toevoegen anna@gmail.com   goedkeuren (ook een heel domein: @familie.nl)
#   ./toegang.sh verwijderen anna@gmail.com toegang intrekken (wordt bij de volgende klik afgemeld)
#
# Adressen in TOEGESTANE_EMAILS (.env.pi) hebben ook toegang; die pas je daar aan.
set -euo pipefail

PI=${PI:-diederick@192.168.178.200}
CONTAINER=pesten-spel
BESTAND=/app/database/toegestane_emails.txt

actie=${1:-}
adres=$(printf '%s' "${2:-}" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')

controleer_adres() {
  # Alleen een gewoon e-mailadres of @domein, zodat er niets vreemds in het bestand of de opdracht komt.
  if ! [[ $adres =~ ^([a-z0-9._%+-]+)?@[a-z0-9.-]+\.[a-z]{2,}$ ]]; then
    echo "Geen geldig e-mailadres of @domein: '${2:-}'" >&2
    exit 1
  fi
}

in_spel() { ssh "$PI" "docker exec -i $CONTAINER sh -c '$1'"; }

case $actie in
  lijst)
    echo "Uit .env (TOEGESTANE_EMAILS):"
    ssh "$PI" "grep '^TOEGESTANE_EMAILS=' ~/pesten/.env | cut -d= -f2- | tr ',' '\n' | sed 's/^ *//; /^$/d; s/^/  /'"
    echo "Goedgekeurd ($BESTAND):"
    in_spel "cat $BESTAND 2>/dev/null || true" | sed '/^$/d; s/^/  /'
    ;;
  toevoegen)
    controleer_adres "$@"
    if in_spel "grep -qxF '$adres' $BESTAND 2>/dev/null"; then
      echo "$adres had al toegang."
    else
      in_spel "echo '$adres' >> $BESTAND"
      echo "$adres heeft nu toegang. Laat het de speler weten: www.diedericknab.nl"
    fi
    ;;
  verwijderen)
    controleer_adres "$@"
    in_spel "grep -vxF '$adres' $BESTAND > /tmp/toegang.nieuw 2>/dev/null; cat /tmp/toegang.nieuw > $BESTAND; rm -f /tmp/toegang.nieuw"
    echo "$adres verwijderd uit de goedgekeurde adressen."
    ;;
  *)
    sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
