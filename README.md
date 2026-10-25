# Pesten — kaartspel

Webversie van het Nederlandse kaartspel **Pesten** (Python + Flask). Alle code en uitleg
staan in `pesten_spel.ipynb`.

Eerst meld je je aan met je e-mailadres, naam en avatar (man of vrouw), en kies je de spelvorm, het aantal
computerspelers en het niveau (makkelijk, normaal, moeilijk). Achter het tandwiel (⚙)
staan het aantal startkaarten, de spelregels (welke pestkaarten meedoen) en de
**assistent**: tips tijdens het spel, in elk spel en op elk niveau. Alles wordt bij je
e-mailadres bewaard in een SQLite-database, samen met je gespeelde en gewonnen rondes.

Spelvormen: **alleen tegen de computer**, of **online**: iedereen op een eigen telefoon,
tablet of computer, met een spelcode en een wachtkamer (maximaal 6 spelers, computers
meegeteld). Online kan iedere speler de assistent voor zichzelf aanzetten, en met
**beeld en geluid** (WebRTC, alleen via https) zien en horen de spelers elkaar.

## Starten in Jupyter
Open `pesten_spel.ipynb` en voer de cellen van boven naar beneden uit. De testcellen
spelen honderden spellen met alleen computers en laten zien wat de assistent aanraadt.
De laatste cel start de server: http://127.0.0.1:5000 (de database komt in `database/pesten.db`).

## Starten met Docker (https via Caddy)
    echo "SPEL_ADRES=192.168.1.50" > .env     # of een domeinnaam
    echo "TOEGESTANE_EMAILS=anna@gmail.com, @familie.nl" >> .env   # wie mag spelen; leeg = iedereen
    docker compose up -d --build
Daarna: https://<SPEL_ADRES>. Caddy regelt de certificaten (Let's Encrypt bij een domeinnaam,
een eigen certificaat bij een IP-adres). Zie `instruction.md`, hoofdstuk 6.

`start_pesten.py` voert in de container de codecellen van het notebook uit.
Na een wijziging in het notebook, de templates of de CSS: opnieuw `docker compose up -d --build`.

## Aanpassen
- Spelregels, aantal strafkaarten, computerspelers, niveaus: sectie 2 van het notebook.
- Kleuren: `static/kleuren.css` (groen vilt en goud, het ontwerp van versie 2); `static/spel.css` bevat alleen de opmaak.
- Kaarten en avatars: `static/kaarten/`, `static/avatars/`; herkomst en licenties in `static/BRONNEN.md`.
- Beeld en geluid: `static/beeld.js`.

## Naar de Raspberry Pi
Deze map is de bron; pas op de Pi niets met de hand aan.
- `.env.pi` bevat de instellingen van de Pi: `SPEL_ADRES` en `TOEGESTANE_EMAILS` (wie mag spelen).
  Staat niet in git (e-mailadressen).
- `./maak_zip.sh` maakt `pesten-spel-rpi.zip` met `.env.pi` als `.env`.
- `./audit.sh` toont het auditlog van de Pi: mislukte en geweigerde aanmeldingen (`./audit.sh 30 alles`: alles van 30 dagen).
- `./naar_pi.sh` zet deze versie op de Pi (`~/pesten`) en start het spel opnieuw. De database en
  het certificaat blijven bewaard; lopende spellen zijn daarna weg.
