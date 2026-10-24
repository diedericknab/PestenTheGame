# Pesten — kaartspel

Webversie van het Nederlandse kaartspel **Pesten** (Python + Flask). Alle code en uitleg
staan in `pesten_spel.ipynb`.

Eerst meld je je aan met je e-mailadres en naam, en kies je de spelvorm, het aantal
computerspelers en het niveau (makkelijk, normaal, moeilijk). Achter het tandwiel (⚙)
staan het aantal startkaarten, de spelregels (welke pestkaarten meedoen) en de
**assistent**: tips tijdens het spel, alleen op niveau makkelijk. Alles wordt bij je
e-mailadres bewaard in een SQLite-database, samen met je gespeelde en gewonnen rondes.

Spelvormen: nu **alleen tegen de computer**. **Doorgeven** (pass and play) en **online**
(meerdere apparaten) komen later.

## Starten in Jupyter
Open `pesten_spel.ipynb` en voer de cellen van boven naar beneden uit. De testcellen
spelen honderden spellen met alleen computers en laten zien wat de assistent aanraadt.
De laatste cel start de server: http://127.0.0.1:5000 (de database komt in `database/pesten.db`).

## Starten met Docker (https via Caddy)
    echo "SPEL_ADRES=192.168.1.50" > .env     # of een domeinnaam
    docker compose up -d --build
Daarna: https://<SPEL_ADRES>. Caddy regelt de certificaten (Let's Encrypt bij een domeinnaam,
een eigen certificaat bij een IP-adres). Zie `instruction.md`, hoofdstuk 6.

`start_pesten.py` voert in de container de codecellen van het notebook uit.
Na een wijziging in het notebook, de templates of de CSS: opnieuw `docker compose up -d --build`.

## Aanpassen
- Spelregels, aantal strafkaarten, computerspelers, niveaus: sectie 2 van het notebook.
- Kleuren: `static/kleuren.css`; `static/spel.css` bevat alleen de opmaak.
