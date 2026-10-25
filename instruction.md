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
- Het bestand `pesten-spel-rpi.zip`.
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

1. Kopieer `pesten-spel-rpi.zip` naar de Pi (bijvoorbeeld met een USB-stick of `scp`),
   pak hem uit en ga naar de map:

   ```
   unzip pesten-spel-rpi.zip -d pesten
   cd pesten
   ```

2. Controleer het bestand `.env` in deze map (het staat in de zip; met `ls -a` zie je het),
   met `nano .env`:

   ```
   SPEL_ADRES=192.168.178.200
   TOEGESTANE_EMAILS=anna@gmail.com, bas@hotmail.com, @familie.nl
   ```

   `SPEL_ADRES` is het IP-adres van deze machine (dat vind je met `hostname -I`) of een
   domeinnaam. `TOEGESTANE_EMAILS` zijn de e-mailadressen die mogen spelen, gescheiden door
   komma's; met `@familie.nl` mag iedereen met een adres op dat domein. Laat je het leeg,
   dan mag iedereen spelen. Opslaan in nano: Ctrl+O, Enter, Ctrl+X.

   Draait het kofferspel (of een ander spel met Caddy) al op deze Pi, dan zijn poort 80 en
   443 bezet. Stop dat spel eerst in zijn eigen map met `docker compose down`, of zet de
   spellen op verschillende machines.

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
unzip -o pesten-spel-rpi.zip -d pesten -x .env
cd pesten
docker compose up -d --build
```

Lopende spellen zijn daarna weg; de database blijft.

Vanaf de computer met de bronmap gaat dit in één keer met `./naar_pi.sh` (via ssh). De
instellingen van de Pi staan dan in `.env.pi` in de bronmap; wijzig ze daar, niet op de Pi.

---

## 3. Het spel spelen

### Scherm 1: aanmelden en instellingen
1. Vul je **e-mailadres** en je **naam** in (die zien de andere spelers) en kies je
   **avatar**: **man** of **vrouw**. Die keuze is verplicht; de avatar komt in je cirkel aan
   tafel. Ben je al eerder aangemeld, dan komen je naam, avatar en instellingen vanzelf terug
   zodra je je e-mailadres hebt ingevuld, met hoeveel rondes je hebt gespeeld en gewonnen.
   Speelde je al vóór versie 2, dan kies je de eerste keer nog je avatar.
2. Kies de **spelvorm**:
   - **Alleen tegen de computer**.
   - **Online**: iedereen speelt op een eigen telefoon, tablet of computer (zie *Online spelen*
     hieronder). Laat de **spelcode** leeg om zelf een spel te maken, of vul de code van een
     ander in om mee te doen.

   Doorgeven op één apparaat zit er bewust niet in: dan zie je elkaars kaarten.
3. Kies het aantal **computerspelers** (tegen de computer 1 tot 5, online 0 tot 5) en het **niveau**:

   | Niveau | Hoe de computers spelen |
   | ------ | ----------------------- |
   | Makkelijk | Leggen zomaar een kaart die past en vergeten vaak "Laatste kaart!" |
   | Normaal | Bewaren jokers en boeren, leggen een 7 alleen als er een vervolg is |
   | Moeilijk | Pesten gericht met 2, 8 en joker als de volgende speler bijna uit is |

4. Klik op het **tandwiel (⚙)** voor de rest: het aantal kaarten bij de start (5 tot 10), de
   **assistent** en de **spelregels**. Onder het tandwiel zie je in één regel wat er
   ingesteld is.
5. Klik op **Start spel** (online: **Maak het spel** of **Doe mee**). Je naam en alle
   instellingen worden bij je e-mailadres in de database bewaard. Elk apparaat onthoudt
   bovendien het laatste e-mailadres, zodat je de volgende keer meteen klaarstaat.

### Online spelen
1. Eén speler kiest **Online**, laat de spelcode leeg en klikt **Maak het spel**. Die komt in
   de **wachtkamer** met een spelcode van 5 tekens (bijvoorbeeld `K7QMX`) en de knop
   **Link delen** (op een iPhone opent dan het deelmenu, bijvoorbeeld voor WhatsApp).
2. De anderen openen de link, of kiezen zelf **Online** en vullen de code in, en klikken
   **Doe mee**. In de wachtkamer zie je wie er al aan tafel zit.
3. Wie het spel maakte, kiest hoeveel **computers** er meespelen en klikt **Kaarten delen**.
   Er kunnen maximaal **6 spelers** aan tafel, mensen en computers samen. Met veel spelers
   krijgt iedereen zo nodig wat minder startkaarten, zodat het in één pak past.
4. Iedereen ziet alleen zijn eigen kaarten. De pagina ververst vanzelf als een ander een
   zet doet. Elke speler kan de **assistent** voor zichzelf aanzetten (achter **Settings**),
   handig voor beginners; de tips ziet alleen die speler.
5. Ga je weg (**Stop** rechtsboven), dan speelt een computer verder met je
   kaarten. Meedoen kan alleen zolang het spel in de wachtkamer staat; ben je per ongeluk
   weg, doe dan met hetzelfde e-mailadres opnieuw mee en je krijgt je plaats terug.

### Beeld en geluid
In een online spel zie en hoor je iedereen die belt, ook als je zelf niet belt: zijn
camerabeeld staat in zijn **cirkel**, in plaats van de avatar. Rechtsboven op je eigen vak (bij
je kaarten) staat de ronde knop **Bellen**: daarmee zet je je eigen camera en microfoon aan, zodat
de anderen jou ook zien en horen. Tijdens het bellen staan er drie knoppen: **Microfoon** en
**Camera** (even uit en weer aan; uit is doorgestreept) en **Ophangen**. Ophangen zet alleen je
eigen camera en microfoon uit; je blijft de anderen zien en horen. De eerste keer dat je in een spel op
**Bellen** drukt, verschijnt een venster: "Dit spel gaat nu je camera en microfoon gebruiken."
Kies **Verder**; vraagt de browser om toestemming, kies dan **Toestaan**. Daarna belt Bellen meteen.
Lukt het niet, dan zegt hetzelfde venster wat er mis is (geblokkeerd, geen camera, of de camera
is in gebruik door een ander programma) en wat je kunt doen.

- Hoor je de anderen niet? Tik één keer op de pagina: browsers (vooral op de iPhone) spelen
  geluid pas af als je de pagina hebt aangeraakt.
- Het beeld en geluid gaan rechtstreeks tussen de apparaten (WebRTC), niet via de Pi. Om
  elkaar via internet te vinden, gebruiken de browsers een openbare STUN-server van Google;
  daar gaat alleen het adres langs, geen beeld of geluid.
- Het werkt alleen via **https met een vertrouwd certificaat** (hoofdstuk 6). Met een
  IP-adres moet op elke iPhone het hoofdcertificaat van Caddy geïnstalleerd zijn.
- Zit je in dezelfde kamer, gebruik dan oortjes of zet de microfoon uit: anders hoor je een
  echo of piept het.
- Elke speler heeft een verbinding met elke andere speler. Met 6 mensen is dat best veel
  voor een oudere telefoon; het beeld is daarom klein (320×240).
- In sommige netwerken (strenge firewalls, sommige mobiele netwerken) lukt een rechtstreekse
  verbinding niet. Daarvoor is een TURN-server nodig; die zit er (nog) niet in.

### Scherm 2: het spel
- Bovenaan staan de **andere spelers**, in de volgorde waarin gespeeld wordt: een cirkel met
  hun avatar (of hun camerabeeld) en daaronder een naambord met het aantal kaarten (rood: nog
  één kaart). Wie aan de beurt is, krijgt een gele **zandloper**. Alle spelers staan in één rij,
  ook met 6 spelers op een telefoon. De computers Anna en Dewi hebben de vrouw-avatar, Bram, Cor
  en Emre de man-avatar.
- In het midden staat de ovale **tafel** met de **trekstapel** en de **open stapel**. Onderaan
  staat jouw avatar met je hand. De kaarten liggen half over elkaar (de hoek met de waarde
  blijft te zien); met veel kaarten schuiven ze verder over elkaar. Op een iPhone past zo
  alles in één scherm.
- Ben je aan de beurt, dan komen de kaarten die je mag leggen omhoog, met een gele rand. Klik op een kaart om hem
  te leggen. Bij een **boer** kies je daarna een kleur.
- Kun of wil je niets leggen, klik dan op de trekstapel (**Pak**). Past de gepakte kaart,
  dan mag je hem leggen of op **Pas** klikken. Past hij niet, dan ben je klaar.
- Moet je kaarten pakken door een 2 of joker, dan staat er **+2** (of meer) op tafel en op
  de trekstapel **Pak 2**. Met de regel *stapelen* mag je er ook een 2 of joker op leggen.
- Hou je na je zet nog één kaart over, vink dan eerst **Laatste kaart** aan (rechtsonder je hand) en leg daarna
  je kaart. Vergeet je dat, dan pak je 2 strafkaarten.
- De computers doen hun zet met een korte pauze, zodat je ziet wat er gebeurt. Onderaan
  staat het logboek met de laatste zetten.
- Wie het eerst al zijn kaarten kwijt is, wint de ronde. Je ziet dan de stand en kunt de
  kaarten van de anderen bekijken. **Volgende ronde** deelt opnieuw; elke ronde begint de
  volgende speler.

Rechtsboven staan twee ronde knoppen: **Settings** (assistent aan/uit, de spelcode en
**Afmelden**) en **Stop**: tegen de computer terug naar de instellingen, online het spel verlaten.

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
Staat de assistent aan (in elk spel en op elk niveau), dan staat er tijdens je beurt een tip boven je hand: welke kaart je het best kunt leggen
en waarom. Die kaart krijgt een lichtblauwe rand met "tip".
Bij een boer licht ook de aangeraden kleur op, en met nog twee kaarten herinnert de
assistent je aan **Laatste kaart!**. De assistent denkt zoals de computer op niveau moeilijk.

De assistent is gewoon rekenwerk in het notebook (geen AI-dienst, geen internet nodig).
Je keuze wordt bij je e-mailadres bewaard. Online ziet alleen jij je tips.

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
| Kleuren (groen vilt, goud)         | `static/kleuren.css`                                |
| Opmaak (indeling, groottes van de kaarten) | `static/spel.css` (`--kaart-b` is de breedte van een kaart) |
| Animaties (kaart neerleggen, zandloper) | `static/spel.css` (zoek op `@keyframes`)       |
| Lettertypen (Roboto Slab, Bree Serif, Atkinson Hyperlegible) | `templates/basis.html` (Google Fonts) en `static/spel.css` |
| Teksten en indeling van de pagina  | `templates/aanmelden.html`, `wachtkamer.html`, `spel.html`, `basis.html` |
| Spelerskaarten (avatar, naambord)  | `templates/tafelkaarten.html`                       |
| Iconen (Settings, Stop, Bellen)    | `templates/iconen.html`                             |
| Afbeeldingen van de kaarten        | `static/kaarten/` (herkomst en licenties: `static/BRONNEN.md`) |
| Avatars (man, vrouw)               | `static/avatars/` en `COMPUTER_AVATARS` in sectie 2 |
| Spelregels en hun teksten          | Sectie 2 van het notebook (`REGELS`)                |
| Aantal kaarten bij 2, joker en vergeten "Laatste kaart!" | Sectie 2 (`TWEE_PAKKEN`, `JOKER_PAKKEN`, `STRAF_LAATSTE_KAART`) |
| Namen en niveaus van de computers  | Sectie 2 (`COMPUTER_NAMEN`, `NIVEAUS`, `VERGEET_KANS`) |
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
| `instellingen` | De instellingen van het eerste scherm, als JSON (ook `geslacht`: de avatar) |
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
Online vraagt het script bovendien elke anderhalve seconde (`VERVERS_MS`) of er iets
veranderd is, en het blok met beeld en geluid blijft staan als de pagina ververst.

### Wie mag spelen
Met `TOEGESTANE_EMAILS` in `.env` bepaal je wie mag spelen (zie hoofdstuk 2). Andere adressen
krijgen de melding dat ze geen toegang hebben, en zien ook geen namen of scores. Iemand
toevoegen of weghalen:

```
nano .env                 # pas TOEGESTANE_EMAILS aan
docker compose up -d      # de spelcontainer start opnieuw met de nieuwe lijst
```

Lopende spellen zijn daarna weg. Wie van de lijst is gehaald, wordt bij de volgende klik afgemeld.

### Auditlog: wie probeerde er binnen te komen?
Elke aanmelding en elke mislukte poging staat in het auditlog (in de database, 90 dagen
bewaard): tijd, e-mailadres, IP-adres en browser. Bekijken vanaf de computer met de bronmap:

```
./audit.sh            # mislukte pogingen van de laatste 7 dagen
./audit.sh 30         # van de laatste 30 dagen
./audit.sh 7 alles    # ook alle geslaagde aanmeldingen
```

Onderaan staat per IP-adres hoe vaak het mislukte. Op de Pi zelf zie je de regels ook met
`docker logs pesten-spel | grep Audit`.

| Soort | Betekenis |
| ----- | --------- |
| `geweigerd` | Aanmelden met een adres dat niet in `TOEGESTANE_EMAILS` staat |
| `opzoeken_geweigerd` | Zo'n adres is ingevuld, maar nog niet op Start geklikt |
| `ongeldig_adres` | Iets ingevuld wat geen e-mailadres is |
| `onbekende_code` | Meedoen met een spelcode die niet bestaat (veel hiervan: iemand raadt codes) |
| `toegang_ingetrokken` | Iemand die van de lijst is gehaald, is afgemeld |
| `aangemeld`, `afgemeld` | Gewone aanmeldingen (alleen met `alles`) |

### Wat nog niet beveiligd is
Er is geen wachtwoord: het spel controleert niet of een e-mailadres echt van jou is. Wie een
toegestaan adres kent, kan daarmee spelen en ziet de naam, instellingen en scores die daarbij horen.

---

## 7. Problemen oplossen

| Probleem | Oplossing |
| -------- | --------- |
| Pagina niet bereikbaar vanaf een ander apparaat | Controleer de firewall op de Pi: `sudo ufw allow 80/tcp` en `sudo ufw allow 443/tcp` (alleen als `ufw` aan staat). Controleer of de containers draaien met `docker compose ps`. |
| `port is already allocated` bij starten | Poort 80 of 443 is al in gebruik, bijvoorbeeld door een andere webserver of de containers van een ander spel. Bekijk met `docker ps` en `sudo ss -ltnp` wat er op draait. |
| Browser meldt "certificaat niet vertrouwd" / "verbinding is niet privé" | Je gebruikt een IP-adres: installeer het hoofdcertificaat van Caddy (hoofdstuk 6). Met een domeinnaam: kijk in `docker logs pesten-caddy` of het certificaat is aangevraagd (poort 80 en 443 moeten van buiten bereikbaar zijn). |
| Geen verbinding via `https://<ip>` | Controleer of `SPEL_ADRES` in `.env` precies het adres is dat je in de browser typt. Na een wijziging: `docker compose up -d`. |
| Na **Start spel** steeds terug op het eerste scherm | Je opent het spel via `http://` zonder Caddy (het cookie werkt alleen over https). Gebruik `https://<SPEL_ADRES>`. |
| Melding "Te veel kaarten" | Met veel tegenstanders en veel startkaarten past het niet in één pak. Kies minder tegenstanders of minder startkaarten (achter het tandwiel op het eerste scherm). |
| Melding "heeft geen toegang tot dit spel" | Het adres staat niet in `TOEGESTANE_EMAILS` in `.env`. Voeg het toe en start opnieuw met `docker compose up -d` (hoofdstuk 6). |
| Melding "is geen geldig e-mailadres" | Controleer het e-mailadres (bijvoorbeeld een spatie of een ontbrekende `@`). |
| Een kaart licht niet op | Die kaart past niet. Klik je er toch op (zonder JavaScript), dan zegt de melding waarom. |
| De computers doen niets | JavaScript staat uit of de verbinding is weg; ververs de pagina. Staat er een venster open (⚙ of kleur kiezen), dan wachten de computers tot je het sluit. |
| Geen assistent te zien | Je ziet hem alleen als je aan de beurt bent. Zet hem aan achter **Settings**. |
| Melding "Kies je avatar: man of vrouw" | Kies op het eerste scherm onder **Avatar** man of vrouw. Dat moet één keer, ook als je al eerder speelde. |
| "Er is geen spel met de code ..." | Controleer de code. Na een herstart van de server zijn alle lopende spellen weg: maak een nieuw spel. |
| "Dit spel is al begonnen" | Meedoen kan alleen in de wachtkamer. Wie al meedeed, komt met hetzelfde e-mailadres wel terug op zijn plaats. |
| Camera: "Bellen lukt hier niet" (alleen via https) | Open het spel via `https://` met een vertrouwd certificaat (hoofdstuk 6). Op een iPhone met een IP-adres: installeer het hoofdcertificaat van Caddy. |
| Camera: "Camera en microfoon geblokkeerd" (de browser vraagt niets) | Computer: klik in de adresbalk op het slotje of het camera-icoon, zet Camera en Microfoon op Toestaan en ververs de pagina. iPhone: Instellingen → Safari → Camera en Microfoon → Vraag of Sta toe. |
| Camera: "Camera of microfoon in gebruik" | Een ander programma (Teams, Zoom) of een andere tab gebruikt de camera. Sluit dat en kies **Opnieuw proberen**. |
| Camera: "Geen camera of microfoon" | Op deze computer is geen camera of microfoon gevonden. Sluit er een aan en kies **Opnieuw proberen**. |
| Je ziet jezelf wel, de ander niet | Wacht een paar seconden. Lukt het niet: het netwerk laat geen rechtstreekse verbinding toe (zie *Beeld en geluid*); probeer wifi in plaats van mobiel internet. |
| `exec format error` in het logboek | De image is op een andere computer gebouwd. Bouw hem op de Pi zelf (hoofdstuk 2). |
| Wijziging in kleuren of notebook niet zichtbaar | Bouw de image opnieuw (hoofdstuk 5) en ververs de pagina met Ctrl+F5. |
