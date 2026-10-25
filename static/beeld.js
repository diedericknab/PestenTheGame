// Beeld en geluid tussen de spelers (alleen online).
//
// Het beeld en geluid gaan rechtstreeks van apparaat naar apparaat (WebRTC).
// De server brengt alleen de berichten over waarmee twee apparaten een
// verbinding afspreken (/beeld/...). Iedereen die het online spel open heeft, heeft
// een verbinding met iedereen: zo zie en hoor je wie er belt, ook als je zelf niet
// belt. Van elk tweetal maakt degene met de laagste id de verbinding; de ander
// neemt op. Zo doen ze het nooit tegelijk.
//
// Elke verbinding heeft een plek voor geluid en een voor beeld. Bellen zet je eigen
// camera en microfoon op die plekken (replaceTrack), Ophangen haalt ze er weer af.
// De verbindingen met de anderen blijven dus staan: na Ophangen zie en hoor je de
// anderen nog. Wie belt, weet de server ("belt"); alleen van hen staat het beeld in
// de cirkel, bij de anderen de avatar.
//
// Elk beeld komt in de spelerskaart van die speler (.speler-kaart met dezelfde data-id,
// zie tafelkaarten.html; je eigen kaart heeft data-id "ik"). Het blok #beeld met de
// knoppen blijft staan als de pagina ververst (zie toon() in basis.html); de video's
// wachten dan even in #beeld .voorraad en gaan daarna in de nieuwe kaarten.
(function () {
  // Een openbare STUN-server: daarmee vinden twee apparaten elkaars adres via
  // internet. Er gaat geen beeld of geluid langs.
  const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];
  const OPGEVEN_NA_MS = 20000;   // zo lang mag het verbinden duren, dan opnieuw

  const blok = document.getElementById("beeld");
  if (!blok || window.pestenBeeld) return;
  const voorraad = blok.querySelector(".voorraad");
  const venster = blok.querySelector("#bel-venster");
  const knoppen = {};
  for (const knop of blok.querySelectorAll("[data-beeld]")) knoppen[knop.dataset.beeld] = knop;

  let stroom = null;          // je eigen camera en microfoon (alleen als je belt)
  let ik = null;              // je id in het gesprek
  let timer = null;
  let ophalenBezig = false;
  const verbindingen = new Map();   // id -> { pc, sinds, binnen: MediaStream van de ander }
  const videos = new Map();         // id -> <video> ("ik" = je eigen beeld)
  let bellers = new Set();          // wie er (volgens de server) belt

  // Het venster bij Bellen: eerst de uitleg over de toestemming, bij een probleem wat er mis
  // is en wat je kunt doen. [titel, tekst, tekst op de knop (geen knop: alleen Sluiten)]
  const TEKSTEN = {
    vraag: ["Bellen", "Dit spel gaat nu je camera en microfoon gebruiken. Mocht dit niet werken, " +
      "dan zul je hiervoor toestemming moeten geven in de browser.", "Verder"],
    geblokkeerd: ["Camera en microfoon geblokkeerd", "Je browser blokkeert de camera en microfoon " +
      "voor dit spel, daarom komt er geen vraag om toestemming. Klik in de adresbalk op het slotje " +
      "(of het camera-icoon), zet Camera en Microfoon op Toestaan en ververs de pagina. Op een " +
      "iPhone: Instellingen → Safari → Camera en Microfoon."],
    geen: ["Geen camera of microfoon", "Er is op dit apparaat geen camera of microfoon gevonden. " +
      "Sluit er een aan of zet hem aan, en probeer het opnieuw.", "Opnieuw proberen"],
    bezet: ["Camera of microfoon in gebruik", "De camera of microfoon wordt al gebruikt door een " +
      "ander programma of een andere tab, bijvoorbeeld Teams of Zoom. Sluit dat en probeer het opnieuw.",
      "Opnieuw proberen"],
    https: ["Bellen lukt hier niet", "Beeld en geluid werken alleen via https, in een recente browser."],
    anders: ["Bellen lukt niet", "Er ging iets mis met de camera of microfoon. Probeer het opnieuw, " +
      "of gebruik een andere browser.", "Opnieuw proberen"],
  };
  function toonVenster(soort, extra) {
    const [titel, tekst, knop] = TEKSTEN[soort];
    venster.querySelector(".bel-titel").textContent = titel;
    venster.querySelector(".bel-tekst").textContent = tekst + (extra ? ` (${extra})` : "");
    const verder = venster.querySelector("[data-beeld=verder]");
    verder.hidden = !knop;
    verder.textContent = knop || "";
    venster.querySelector("[data-sluit]").textContent = knop ? "Annuleren" : "Sluiten";
    if (!venster.open) venster.showModal();
  }

  // Heeft de browser de camera of microfoon al geblokkeerd? (Niet elke browser kan dat zeggen.)
  async function geblokkeerd() {
    if (!navigator.permissions) return false;
    for (const naam of ["camera", "microphone"]) {
      try {
        if ((await navigator.permissions.query({ name: naam })).state === "denied") return true;
      } catch (fout) {
        // Deze browser kent deze vraag niet: dan merken we het bij getUserMedia.
      }
    }
    return false;
  }

  async function post(pad, gegevens) {
    const antwoord = await fetch("/beeld/" + pad, {
      method: "POST", credentials: "same-origin", body: new URLSearchParams(gegevens || {}),
    });
    return antwoord.json();
  }

  // Zet een video in de spelerskaart met deze id. Is er (nog) geen kaart, dan wacht hij
  // in de voorraad; het geluid speelt dan gewoon door.
  function plaats(id, video) {
    const kaart = document.querySelector(`.speler-kaart[data-id="${id}"] .kaart-beeld`);
    const plek = kaart || voorraad;
    if (video.parentNode !== plek) plek.append(video);
    video.play().catch(() => {});
  }

  function toon(id, bron, eigen) {
    let video = videos.get(id);
    if (!video) {
      video = document.createElement("video");
      video.autoplay = true;
      video.playsInline = true;            // iPhone: niet schermvullend
      video.setAttribute("playsinline", "");
      video.muted = eigen;                 // jezelf hoor je niet terug
      if (eigen) video.className = "eigen";
      videos.set(id, video);
    }
    if (video.srcObject !== bron) video.srcObject = bron;
    plaats(id, video);
  }

  function haalWeg(id) {
    const video = videos.get(id);
    if (video) { video.srcObject = null; video.remove(); videos.delete(id); }
  }

  // Wie belt, krijgt zijn beeld in de cirkel; wie niet belt, zijn avatar.
  function beeldenBijwerken() {
    for (const [id, v] of verbindingen) {
      if (bellers.has(id)) toon(id, v.binnen, false);
      else haalWeg(id);
    }
    if (stroom) toon("ik", stroom, true);
    else haalWeg("ik");
  }

  function weg(id) {
    const v = verbindingen.get(id);
    if (v) { v.pc.close(); verbindingen.delete(id); }
    haalWeg(id);
  }

  // Je eigen camera en microfoon op de plekken van een verbinding zetten (of eraf: null).
  function sporenZetten(pc) {
    for (const t of pc.getTransceivers()) {
      const soort = t.receiver.track.kind;
      const spoor = stroom ? (soort === "audio" ? stroom.getAudioTracks()[0] : stroom.getVideoTracks()[0]) : null;
      t.sender.replaceTrack(spoor || null).catch(() => {});
    }
  }

  // Wachten tot de browser al zijn adressen weet; dan gaat alles in één bericht.
  function adressenKlaar(pc) {
    return new Promise(function (klaar) {
      if (pc.iceGatheringState === "complete") return klaar();
      const t = setTimeout(klaar, 2500);
      pc.addEventListener("icegatheringstatechange", function () {
        if (pc.iceGatheringState === "complete") { clearTimeout(t); klaar(); }
      });
    });
  }

  function maakVerbinding(id) {
    weg(id);
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const binnen = new MediaStream();
    verbindingen.set(id, { pc: pc, sinds: Date.now(), binnen: binnen });
    pc.ontrack = function (e) { binnen.addTrack(e.track); beeldenBijwerken(); };
    pc.onconnectionstatechange = function () {
      if (pc.connectionState === "failed") weg(id);   // de volgende ronde opnieuw
    };
    return pc;
  }

  async function verbind(id) {
    const pc = maakVerbinding(id);
    pc.addTransceiver("audio", { direction: "sendrecv" });
    pc.addTransceiver("video", { direction: "sendrecv" });
    sporenZetten(pc);
    await pc.setLocalDescription(await pc.createOffer());
    await adressenKlaar(pc);
    if (verbindingen.get(id)?.pc !== pc) return;
    await post("stuur", { aan: id, bericht: JSON.stringify({ soort: "voorstel", sdp: pc.localDescription.sdp }) });
  }

  async function verwerk(bericht) {
    const id = bericht.van;
    if (bericht.soort === "voorstel") {
      const pc = maakVerbinding(id);
      await pc.setRemoteDescription({ type: "offer", sdp: bericht.sdp });
      // Ook zelf kunnen sturen, zodat Bellen later zonder nieuwe afspraak werkt.
      for (const t of pc.getTransceivers()) t.direction = "sendrecv";
      sporenZetten(pc);
      await pc.setLocalDescription(await pc.createAnswer());
      await adressenKlaar(pc);
      if (verbindingen.get(id)?.pc !== pc) return;
      await post("stuur", { aan: id, bericht: JSON.stringify({ soort: "antwoord", sdp: pc.localDescription.sdp }) });
    } else if (bericht.soort === "antwoord") {
      const v = verbindingen.get(id);
      if (v && v.pc.signalingState === "have-local-offer") {
        await v.pc.setRemoteDescription({ type: "answer", sdp: bericht.sdp });
      }
    }
  }

  // Elke seconde: berichten ophalen, nieuwe deelnemers verbinden, vertrokken deelnemers weghalen.
  async function ophalen() {
    if (ophalenBezig) return;
    ophalenBezig = true;
    try {
      const antwoord = await post("post");
      if (!antwoord.ik) {   // de server kent ons (nog) niet, bv. na een herstart: aanmelden
        await post("aan", { belt: stroom ? "1" : "0" });
        return;
      }
      ik = antwoord.ik;
      const ids = new Set(antwoord.deelnemers.map(d => d.id));
      bellers = new Set(antwoord.deelnemers.filter(d => d.belt).map(d => d.id));
      for (const bericht of antwoord.berichten) await verwerk(bericht);
      for (const id of ids) {
        if (id === ik) continue;
        const v = verbindingen.get(id);
        if (v && v.pc.connectionState !== "connected" && Date.now() - v.sinds > OPGEVEN_NA_MS) weg(id);
        if (!verbindingen.has(id) && ik < id) verbind(id);
      }
      for (const id of [...verbindingen.keys()]) if (!ids.has(id)) weg(id);
      beeldenBijwerken();
    } catch (fout) {
      // Even geen verbinding met de server: de volgende keer opnieuw.
    } finally {
      ophalenBezig = false;
    }
  }

  function knoppenBijwerken() {
    const aan = Boolean(stroom);
    knoppen.aan.hidden = aan;
    knoppen.microfoon.hidden = knoppen.camera.hidden = knoppen.uit.hidden = !aan;
    blok.classList.toggle("actief", aan);
    if (!aan) return;
    const geluid = stroom.getAudioTracks()[0], beeld = stroom.getVideoTracks()[0];
    // Staat de microfoon of camera even uit, dan krijgt de knop de klasse "uit" (doorgestreept icoon).
    knoppen.microfoon.classList.toggle("uit", !(geluid && geluid.enabled));
    knoppen.camera.classList.toggle("uit", !(beeld && beeld.enabled));
    knoppen.microfoon.setAttribute("aria-pressed", String(Boolean(geluid && geluid.enabled)));
    knoppen.camera.setAttribute("aria-pressed", String(Boolean(beeld && beeld.enabled)));
  }

  // De uitleg bij Bellen komt alleen de eerste keer in dit spel (onthouden per tabblad).
  const UITLEG_GEZIEN = "pesten-bel-uitleg-" + blok.dataset.spel;
  function uitlegGezien() {
    try { return sessionStorage.getItem(UITLEG_GEZIEN) === "1"; } catch (fout) { return false; }
  }

  // Bellen: de eerste keer in dit spel eerst het venster met uitleg (met Verder vraagt de
  // browser om toestemming); daarna meteen. Foutmeldingen komen altijd.
  async function bellen() {
    if (!navigator.mediaDevices || !window.RTCPeerConnection) toonVenster("https");
    else if (await geblokkeerd()) toonVenster("geblokkeerd");
    else if (!uitlegGezien()) toonVenster("vraag");
    else aan();
  }

  // Je eigen camera en microfoon aan, en op alle verbindingen zetten.
  async function aan() {
    venster.close();
    try { sessionStorage.setItem(UITLEG_GEZIEN, "1"); } catch (fout) { /* privévenster: dan elke keer */ }
    try {
      stroom = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15 } },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (fout) {
      const soort = { NotAllowedError: "geblokkeerd", SecurityError: "geblokkeerd", NotFoundError: "geen",
                      OverconstrainedError: "geen", NotReadableError: "bezet", AbortError: "bezet" }[fout.name];
      toonVenster(soort || "anders", soort ? "" : fout.name);
      return;
    }
    for (const v of verbindingen.values()) sporenZetten(v.pc);
    beeldenBijwerken();
    knoppenBijwerken();
    post("aan", { belt: "1" }).catch(() => {});
  }

  // Ophangen: alleen je eigen camera en microfoon uit. De verbindingen blijven staan,
  // dus je blijft de anderen zien en horen.
  function ophangen() {
    if (stroom) for (const spoor of stroom.getTracks()) spoor.stop();
    stroom = null;
    for (const v of verbindingen.values()) sporenZetten(v.pc);
    beeldenBijwerken();
    knoppenBijwerken();
    post("aan", { belt: "0" }).catch(() => {});
  }

  // Het spel verlaten (of de pagina dicht): alles stoppen en afmelden.
  function stoppen(stil) {
    clearInterval(timer);
    if (stroom) for (const spoor of stroom.getTracks()) spoor.stop();
    stroom = null;
    for (const id of [...verbindingen.keys()]) weg(id);
    haalWeg("ik");
    if (stil) navigator.sendBeacon("/beeld/uit");
    else post("uit").catch(() => {});
  }

  function wissel(soort) {
    const spoor = soort === "microfoon" ? stroom.getAudioTracks()[0] : stroom.getVideoTracks()[0];
    if (spoor) spoor.enabled = !spoor.enabled;
    knoppenBijwerken();
  }

  blok.addEventListener("click", function (e) {
    const knop = e.target.closest("[data-beeld]");
    if (!knop) return;
    if (knop.dataset.beeld === "aan") bellen();
    else if (knop.dataset.beeld === "verder") aan();
    else if (knop.dataset.beeld === "uit") ophangen();
    else wissel(knop.dataset.beeld);
  });

  // Verversen van de pagina: eerst alle video's in de voorraad (die blijft staan),
  // daarna in de nieuwe spelerskaarten. Beide gebeuren in dezelfde stap als het
  // vervangen van de pagina, zodat de video's niet stoppen.
  document.addEventListener("pesten:voor-verversen", function () {
    for (const video of videos.values()) voorraad.append(video);
  });
  document.addEventListener("pesten:ververst", function () {
    for (const [id, video] of videos) plaats(id, video);
  });
  // Browsers spelen geluid pas af als je iets op de pagina hebt aangeraakt (vooral
  // iPhone): bij elke aanraking de video's van de anderen opnieuw starten.
  for (const soort of ["pointerdown", "keydown"]) {
    document.addEventListener(soort, function () {
      for (const video of videos.values()) if (video.paused) video.play().catch(() => {});
    }, true);
  }
  window.addEventListener("pagehide", function () { stoppen(true); });

  // Meteen meedoen als kijker: zo zie en hoor je wie er belt.
  post("aan", { belt: "0" }).then(ophalen).catch(() => {});
  timer = setInterval(ophalen, Number(blok.dataset.ververs) || 1000);

  window.pestenBeeld = { uit: function () { stoppen(false); window.pestenBeeld = null; } };
})();
