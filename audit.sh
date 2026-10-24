#!/usr/bin/env bash
# Toont het auditlog van het spel op de Pi: mislukte en geweigerde aanmeldingen.
# Gebruik:  ./audit.sh            mislukte pogingen van de laatste 7 dagen
#           ./audit.sh 30         ... van de laatste 30 dagen
#           ./audit.sh 7 alles    ook de geslaagde aanmeldingen en afmeldingen
set -euo pipefail
PI=${PI:-diederick@192.168.178.200}
DAGEN=${1:-7}
ALLES=${2:-}
[[ "$DAGEN" =~ ^[0-9]+$ ]] || { echo "Aantal dagen moet een getal zijn." >&2; exit 1; }

ssh "$PI" "docker exec -i -e DAGEN=$DAGEN -e ALLES=$ALLES pesten-spel python -" <<'PYTHON'
import os, sqlite3, time
from collections import Counter
from datetime import datetime

dagen = int(os.environ["DAGEN"])
alles = os.environ.get("ALLES") == "alles"
fouten = ("geweigerd", "opzoeken_geweigerd", "ongeldig_adres", "onbekende_code", "toegang_ingetrokken")
grens = datetime.fromtimestamp(time.time() - dagen * 86400).isoformat(sep=" ", timespec="seconds")
db = sqlite3.connect(os.environ.get("SPEL_DB", "/app/database/pesten.db"))
try:
    rijen = db.execute("SELECT tijd, soort, email, ip, details, browser FROM audit "
                       "WHERE tijd >= ? ORDER BY id DESC", (grens,)).fetchall()
except sqlite3.OperationalError:
    rijen = []
if not alles:
    rijen = [r for r in rijen if r[1] in fouten]

soort = "alle regels" if alles else "mislukte pogingen"
print(f"Auditlog, laatste {dagen} dagen, {soort}: {len(rijen)}\n")
if rijen:
    print(f"{'Tijd':<20} {'Soort':<20} {'E-mailadres':<32} {'IP-adres':<16} Details")
    for tijd, s, email, ip, details, browser in rijen:
        print(f"{tijd:<20} {s:<20} {email[:32] or '-':<32} {ip or '-':<16} {details}")
    mislukt = [r for r in rijen if r[1] in fouten]
    if mislukt:
        print("\nMislukte pogingen per IP-adres:")
        for ip, n in Counter(r[3] for r in mislukt).most_common(10):
            print(f"  {n:>4} x  {ip or '-'}")
PYTHON
