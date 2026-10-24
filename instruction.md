# Instructie — Pesten (kaartspel)

Deze instructie beschrijft hoe je het spel installeert op een Raspberry Pi (of een
andere Linux-computer) met Docker, hoe je het speelt en hoe je het aanpast.

Het spel bestaat uit twee containers:

| Container       | Wat hij doet |
| --------------- | ------------ |
| `pesten-spel`   | Het spel zelf (Python + Flask) met de database (SQLite) |
| `pesten-caddy`  | [Caddy](https://caddyserver.com): zet https voor het spel en regelt de certificaten |

Alle verkeer loopt versleuteld (https) via Caddy. Het spel zelf is van buitenaf niet
rechtstreeks bereikbaar.

---

## 1. Wat heb je nodig

- Een Raspberry Pi met een 64-bit OS (Raspberry Pi OS 64-bit) of 32-bit OS.
- Docker met `docker compose` op de Pi.
- De map van het spel (bijvoorbeeld als zip: `pesten-spel.zip`).
- Poort 80 en 443 vrij op de Pi (er mag geen andere webserver op draaien).
- Een adres voor het spel: een domeinnaam (bijvoorbeeld `spel.jouwdomein.nl`) of het
  IP-adres van de Pi. Zie hoofdstuk 6 voor het verschil.

Controleer op de Pi welke architectuur hij heeft:

```
uname -m
```

| Uitkomst  | Betekenis     |
| --------- | ------------- |
| `aarch64` | 64-bit (arm64) |
| `armv7l`  | 32-bit (arm/v7) |

Beide werken. De image wordt op de Pi zelf gebouwd en krijgt automatisch de juiste architectuur.

### Docker installeren (als dat nog niet is gebeurd)

```
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

Log daarna uit en weer in, zodat je `docker` zonder `sudo` kunt gebruiken. Controleer met:

```
docker version
docker compose version
```

Geeft `docker compose version` een fout, installeer dan de compose-plugin:
`sudo apt install docker-compose-plugin`.

---

## 2. Installeren en starten

1. Kopieer de map van het spel naar de Pi (bijvoorbeeld als zip met een USB-stick of `scp`)
   en ga naar de map:

   ```
   unzip pesten-spel.zip -d pesten
   cd pesten
   ```

2. Maak het bestand `.env` in deze map (met `nano .env`):

   ```
   SPEL_ADRES=192.168.178.200
   ```

   `SPEL_ADRES` is het IP-adres van deze machine (dat vind je met `hostname -I`) of een
   domeinnaam. Opslaan in nano: Ctrl+O, Enter, Ctrl+X.

3. Bouw en start alles (de eerste keer duurt dit een paar minuten):

   ```
   docker compose up -d --build
   ```

4. Open in een browser: `https://<SPEL_ADRES>`, bijvoorbeeld `https://192.168.1.50`.
   Typ je `http://`, dan stuurt Caddy je vanzelf door naar `https://`.

   Gebruik je een IP-adres, dan meldt de browser de eerste keer dat het certificaat niet
   vertrouwd is. Installeer dan het hoofdcertificaat van Caddy (hoofdstuk 6).

De containers starten na een herstart van de Pi vanzelf weer op.

### Bijwerken naar een nieuwe versie

Pak de nieuwe versie uit over de bestaande map (je `.env` blijft staan) en bouw opnieuw.
De database (een Docker-volume) blijft bewaard:

```
unzip -o pesten-spel.zip -d pesten -x .env
cd pesten
docker compose up -d --build
```

Lopende spellen zijn daarna weg; de database blijft.

---

## 3. Het spel spelen

### Scherm 1: aanmelden en instellingen
1. Vul je **e-mailadres** en je **naam** in (die zien de andere spelers). Ben je al eerder
   aangemeld, dan komen je naam en instellingen vanzelf terug zodra je je e-mailadres hebt
   ingevuld, met hoeveel rondes je hebt gespeeld en gewonnen.
2. Kies de **spelvorm**. Nu kan alleen **Alleen tegen de computer**; doorgeven op één
   apparaat en online spelen komen later.
3. Kies het aantal **computerspelers** (1 tot 5) en het **niveau**:

   | Niveau | Hoe de computers spelen |
   | ------ | ----------------------- |
   | Makkelijk | Leggen zomaar een kaart die past en vergeten vaak "Laatste kaart!" |
   | Normaal | Bewaren jokers en boeren, leggen een 7 alleen als er een vervolg is |
   | Moeilijk | Pesten gericht met 2, 8 en joker als de volgende speler bijna uit is |

4. Klik op het **tandwiel (⚙)** voor de rest: het aantal kaarten bij de start (5 tot 10), de
   **assistent** en de **spelregels**. Onder het tandwiel zie je in één regel wat er
   ingesteld is.
5. Klik op **Start spel**. Alles wordt bij je e-mailadres bewaard.

### Scherm 2: het spel
- Bovenaan zitten de computerspelers (met hun aantal kaarten), in het midden de
  **trekstapel** en de **open stapel**, onderaan jouw hand.
- Ben je aan de beurt, dan lichten de kaarten op die je mag leggen. Klik op een kaart om hem
  te leggen. Bij een **boer** kies je daarna een kleur.
- Kun of wil je niets leggen, klik dan op de trekstapel (**Pak**). Past de gepakte kaart,
  dan mag je hem leggen of op **Pas** klikken. Past hij niet, dan ben je klaar.
- Moet je kaarten pakken door een 2 of joker, dan staat er **+2** (of meer) op tafel en op
  de trekstapel **Pak 2**. Met de regel *stapelen* mag je er ook een 2 of joker op leggen.
- Hou je na je zet nog één kaart over, vink dan eerst **Laatste kaart!** aan en leg daarna
  je kaart. Vergeet je dat, dan pak je 2 strafkaarten.
- De computers doen hun zet met een korte pauze, zodat je ziet wat er gebeurt. Onderaan
  staat het logboek met de laatste zetten.
- Wie het eerst al zijn kaarten kwijt is, wint de ronde. Je ziet dan de stand en kunt de
  kaarten van de anderen bekijken. **Volgende ronde** deelt opnieuw; elke ronde begint de
  volgende speler.

Rechtsboven staat het **tandwiel (⚙)**: assistent aan/uit (alleen op makkelijk),
**Nieuw spel / instellingen** en **Afmelden**.

### De spelregels

| Kaart | Wat gebeurt er |
| ----- | -------------- |
| Gewone kaart | Leg dezelfde kleur (♥ ♦ ♣ ♠) of dezelfde waarde |
| 2 | De volgende speler pakt 2 kaarten |
| Joker | De volgende speler pakt 5 kaarten. Een joker mag op alles, en op een joker mag alles |
| 7 | Je bent nog een keer aan de beurt |
| 8 | De volgende speler slaat een beurt over |
| Aas | De speelrichting draait om (met twee spelers ben je nog een keer aan de beurt) |
| Boer | Je kiest de kleur waarmee verder wordt gespeeld; de boer mag op elke kaart |

Daarnaast: **stapelen** (een 2 of joker op een 2 of joker; de volgende pakt alles bij elkaar),
**niet uitgaan op een pestkaart** (je laatste kaart moet een gewone kaart zijn) en
**Laatste kaart!** melden. Elke regel zet je aan of uit achter het tandwiel. Staat een
regel uit, dan is die kaart een gewone kaart; zonder de jokerregel zitten er geen jokers in het spel.

De eerste open kaart is altijd een gewone kaart. Is de trekstapel op, dan worden de open
kaarten (behalve de bovenste) geschud en de nieuwe trekstapel.

### De assistent
Speel je op niveau **makkelijk** en staat de assistent aan, dan staat er tijdens je beurt een
tip boven je hand: welke kaart je het best kunt leggen en waarom. Die kaart licht groen op.
Bij een boer licht ook de aangeraden kleur op, en met nog twee kaarten herinnert de
assistent je aan **Laatste kaart!**. De assistent denkt zoals de computer op niveau moeilijk.

Op normaal en moeilijk is er geen assistent. Je keuze blijft wel bewaard: kies je later weer
makkelijk, dan staat hij weer zoals je hem had.

Let op: er is geen wachtwoord. Wie een e-mailadres invult, ziet de naam, instellingen en
scores die daarbij in de database staan.

---

## 4. Testen in Jupyter

Open `pesten_spel.ipynb` en voer de cellen van boven naar beneden uit (of *Run All*, maar
de laatste cel start de server en blijft lopen). De testcellen:

| Cel | Wat hij laat zien |
| --- | ----------------- |
| Testcel kaarten | Een pak van 54 kaarten, gesorteerd, en welke kaarten pestkaarten zijn |
| Testcel spel | Een heel spel met alleen computers (het logboek), daarna 300 spellen met willekeurige instellingen: elk spel stopt en er raken geen kaarten zoek. En hoe vaak moeilijk wint van makkelijk |
| Testcel assistent | Een hand met de tip van de assistent, en hoe vaak je wint als je altijd de tip volgt |

De laatste cel start de server: open http://127.0.0.1:5000. Onderbreek de cel (■) om te stoppen.
In Jupyter komt de database in `database/pesten.db` naast het notebook.

---

## 5. Aanpassen

| Wat                                | Waar                                                |
| ---------------------------------- | --------------------------------------------------- |
| Kleuren                            | `static/kleuren.css`                                |
| Opmaak (indeling, groottes van de kaarten) | `static/spel.css` (`--kaart-b` is de breedte van een kaart) |
| Animaties (kaart neerleggen, pakken) | `static/spel.css` (zoek op `@keyframes`)          |
| Lettertype (Lilita One)            | `templates/basis.html` (Google Fonts) en `static/spel.css` |
| Teksten en indeling van de pagina  | `templates/aanmelden.html`, `templates/spel.html`, `templates/basis.html` |
| Spelregels en hun teksten          | Sectie 2 van het notebook (`REGELS`)                |
| Aantal kaarten bij 2, joker en vergeten "Laatste kaart!" | Sectie 2 (`TWEE_PAKKEN`, `JOKER_PAKKEN`, `STRAF_LAATSTE_KAART`) |
| Namen en niveaus van de computers  | Sectie 2 (`COMPUTER_NAMEN`, `NIVEAUS`, `VERGEET_KANS`) |
| Op welke niveaus de assistent er is | Sectie 2 (`ASSISTENT_NIVEAUS`)                     |
| Pauze tussen de zetten van de computers | Sectie 2 (`COMPUTER_PAUZE_MS`)                 |
| Wat een nieuwe speler standaard ziet | Sectie 2 (`STANDAARD_INSTELLINGEN`)               |
| Hoe slim de computers en de assistent kiezen | Sectie 6 (`waardeer`, `advies`)           |

Wie op de telefoon of computer "minder beweging" heeft ingesteld, krijgt geen animaties.

Na een wijziging in deze bestanden moet de image opnieuw gebouwd worden:

```
docker compose up -d --build
```

### Beheer

| Wat                   | Opdracht                                     |
| --------------------- | -------------------------------------------- |
| Status bekijken       | `docker compose ps`                          |
| Logboek van het spel  | `docker logs pesten-spel`                    |
| Logboek van Caddy     | `docker logs pesten-caddy`                   |
| Stoppen               | `docker compose stop`                        |
| Weer starten          | `docker compose start`                       |
| Verwijderen (database blijft) | `docker compose down`                |
| Verwijderen inclusief database en certificaten | `docker compose down -v` |

Lopende spellen staan in het geheugen van de container. Na een herstart zijn ze weg;
spelers beginnen dan opnieuw. De database en de certificaten staan in Docker-volumes en
blijven bewaard.

### De database
De database is één SQLite-bestand: `/app/database/pesten.db` in de container. De tabel
`spelers` heeft per e-mailadres:

| Kolom | Inhoud |
| ----- | ------ |
| `email` | Het e-mailadres (kleine letters), uniek |
| `naam` | De naam die de andere spelers zien (maximaal 20 tekens) |
| `instellingen` | De instellingen van het eerste scherm, als JSON |
| `gespeeld`, `gewonnen` | Aantal gespeelde en gewonnen rondes |
| `aangemaakt`, `bijgewerkt` | Datum en tijd |

| Wat | Opdracht |
| --- | -------- |
| Reservekopie maken | `docker cp pesten-spel:/app/database/pesten.db ./pesten-backup.db` |
| Scores bekijken | `docker exec pesten-spel python -c "import sqlite3; [print(*r) for r in sqlite3.connect('/app/database/pesten.db').execute('SELECT naam, gespeeld, gewonnen FROM spelers')]"` |

Een kopie kun je openen met bijvoorbeeld [DB Browser for SQLite](https://sqlitebrowser.org).

---

## 6. Beveiliging en https

### Hoe het werkt
Caddy staat voor het spel en is het enige dat van buitenaf bereikbaar is (poort 80 en 443).
Caddy versleutelt alles met https en stuurt http door naar https. Het sessie-cookie wordt
alleen over https verstuurd. Welk certificaat Caddy gebruikt, hangt af van `SPEL_ADRES` in `.env`:

| `SPEL_ADRES` | Certificaat | Browser |
| ------------ | ----------- | ------- |
| Domeinnaam (`spel.jouwdomein.nl`) | Gratis van Let's Encrypt, wordt automatisch vernieuwd | Vertrouwt het meteen |
| IP-adres (`192.168.1.50`) | Eigen certificaat van Caddy | Vertrouwt het pas na het installeren van het hoofdcertificaat |

Wijzig je `SPEL_ADRES`, start Caddy dan opnieuw: `docker compose up -d`.

### Met een domeinnaam (aanbevolen, ook bereikbaar via internet)
1. Laat het (sub)domein, bijvoorbeeld `spel.jouwdomein.nl`, met een A-record naar het
   publieke IP-adres van je router wijzen.
2. Stuur in de router poort 80 en 443 door naar de Pi. Caddy heeft poort 80 nodig om het
   certificaat bij Let's Encrypt aan te vragen.
3. Zet `SPEL_ADRES=spel.jouwdomein.nl` in `.env` en start: `docker compose up -d`.
4. Open `https://spel.jouwdomein.nl`. De eerste keer kan het aanvragen van het certificaat
   een minuut duren; `docker logs pesten-caddy` laat zien wat er gebeurt.

### Alleen op het eigen netwerk, met een IP-adres
Caddy maakt een eigen certificaat. Het verkeer is dan wel versleuteld, maar de browser kent
de uitgever niet en geeft een waarschuwing. Die verdwijnt als je het hoofdcertificaat van
Caddy op elk apparaat installeert (één keer; het is 10 jaar geldig).

1. Haal het hoofdcertificaat op:

   ```
   docker exec pesten-caddy cat /data/caddy/pki/authorities/local/root.crt > caddy-root.crt
   ```

2. Zet `caddy-root.crt` op de telefoon (bijvoorbeeld via e-mail of een USB-kabel) en installeer het:
   - **Android**: Instellingen → Beveiliging (en privacy) → Meer beveiligingsinstellingen →
     Versleuteling en inloggegevens → Certificaat installeren → **CA-certificaat**.
     De menunamen verschillen per merk; zoek in Instellingen op "certificaat".
   - **iPhone/iPad**: open het bestand, ga naar Instellingen → **Profiel gedownload** →
     Installeer. Zet daarna aan: Instellingen → Algemeen → Info → **Certificaatvertrouwen**.
   - **Windows**: dubbelklik → Certificaat installeren → Lokale computer →
     Plaats in: **Vertrouwde basiscertificeringsinstanties**.

Wil je geen certificaat installeren en geen poorten openzetten, dan kan een dienst als
Tailscale of Cloudflare Tunnel een adres met een geldig certificaat geven.

### Het script in basis.html
Onderaan `templates/basis.html` staat een klein script dat de knoppen op de achtergrond
verstuurt (met `fetch`) en de pagina die terugkomt in beeld zet. Dat was nodig toen het spel
ooit over http draaide: mobiele browsers gaven dan bij elk formulier de melding "niet beveiligd".
Het zorgt er nu ook voor dat de tafel niet knippert bij elke zet: alleen de inhoud van de
pagina wordt vervangen. Is er een computer aan de beurt, dan vraagt hetzelfde script na een
korte pauze om zijn zet (`COMPUTER_PAUZE_MS`); staat er een venster open (⚙), dan wacht het.

### Wat nog niet beveiligd is
Er is geen wachtwoord: het e-mailadres wordt niet gecontroleerd. Iedereen die het spel kan
openen en een e-mailadres kent, ziet de naam, instellingen en scores die daarbij horen.

---

## 7. Problemen oplossen

| Probleem | Oplossing |
| -------- | --------- |
| Pagina niet bereikbaar vanaf een ander apparaat | Controleer de firewall op de Pi: `sudo ufw allow 80/tcp` en `sudo ufw allow 443/tcp` (alleen als `ufw` aan staat). Controleer of de containers draaien met `docker compose ps`. |
| `port is already allocated` bij starten | Poort 80 of 443 is al in gebruik, bijvoorbeeld door een andere webserver of de containers van een ander spel. Bekijk met `docker ps` en `sudo ss -ltnp` wat er op draait. |
| Browser meldt "certificaat niet vertrouwd" / "verbinding is niet privé" | Je gebruikt een IP-adres: installeer het hoofdcertificaat van Caddy (hoofdstuk 6). Met een domeinnaam: kijk in `docker logs pesten-caddy` of het certificaat is aangevraagd (poort 80 en 443 moeten van buiten bereikbaar zijn). |
| Geen verbinding via `https://<ip>` | Controleer of `SPEL_ADRES` in `.env` precies het adres is dat je in de browser typt. Na een wijziging: `docker compose up -d`. |
| Na **Start spel** steeds terug op het eerste scherm | Je opent het spel via `http://` zonder Caddy (het cookie werkt alleen over https). Gebruik `https://<SPEL_ADRES>`. |
| Melding "Te veel kaarten" | Met veel tegenstanders en veel startkaarten past het niet in één pak. Kies minder tegenstanders of minder startkaarten (achter het tandwiel). |
| Melding "is geen geldig e-mailadres" | Controleer het e-mailadres (bijvoorbeeld een spatie of een ontbrekende `@`). |
| Een kaart licht niet op | Die kaart past niet. Klik je er toch op (zonder JavaScript), dan zegt de melding waarom. |
| De computers doen niets | JavaScript staat uit of de verbinding is weg; ververs de pagina. Staat er een venster open (⚙ of kleur kiezen), dan wachten de computers tot je het sluit. |
| Geen assistent te zien | De assistent is er alleen op niveau makkelijk en alleen als je aan de beurt bent. Zet hem aan achter het tandwiel. |
| `exec format error` in het logboek | De image is op een andere computer gebouwd. Bouw hem op de Pi zelf (hoofdstuk 2). |
| Wijziging in kleuren of notebook niet zichtbaar | Bouw de image opnieuw (hoofdstuk 5) en ververs de pagina met Ctrl+F5. |
