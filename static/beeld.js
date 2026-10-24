// Beeld en geluid tussen de spelers (alleen online).
//
// Het beeld en geluid gaan rechtstreeks van apparaat naar apparaat (WebRTC).
// De server brengt alleen de berichten over waarmee twee apparaten een
// verbinding afspreken (/beeld/...). Iedereen met de camera aan heeft een
// verbinding met iedereen die ook de camera aan heeft. Van elk tweetal belt
// degene met de laagste id; de ander neemt op. Zo bellen ze elkaar nooit
// tegelijk.
//
// Het blok #beeld blijft staan als de pagina ververst (zie toon() in basis.html).
(function () {
  // Een openbare STUN-server: daarmee vinden twee apparaten elkaars adres via
  // internet. Er gaat geen beeld of geluid langs.
  const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];
  const OPGEVEN_NA_MS = 20000;   // zo lang mag het verbinden duren, dan opnieuw

  const blok = document.getElementById("beeld");
  if (!blok || window.pestenBeeld) return;
  const tegels = blok.querySelector(".tegels");
  const melding = blok.querySelector(".beeld-melding");
  const knoppen = {};
  for (const knop of blok.querySelectorAll("[data-beeld]")) knoppen[knop.dataset.beeld] = knop;

  let stroom = null;          // je eigen camera en microfoon
  let ik = null;              // je id in het gesprek
  let timer = null;
  let ophalenBezig = false;
  const verbindingen = new Map();   // id -> { pc, sinds }

  function zeg(tekst) { melding.textContent = tekst || ""; }

  async function post(pad, gegevens) {
    const antwoord = await fetch("/beeld/" + pad, {
      method: "POST", credentials: "same-origin", body: new URLSearchParams(gegevens || {}),
    });
    return antwoord.json();
  }

  function tegel(id, naam, bron, eigen) {
    let figuur = tegels.querySelector(`[data-id="${id}"]`);
    if (!figuur) {
      figuur = document.createElement("figure");
      figuur.className = "tegel" + (eigen ? " eigen" : "");
      figuur.dataset.id = id;
      const video = document.createElement("video");
      video.autoplay = true;
      video.playsInline = true;            // iPhone: niet schermvullend
      video.setAttribute("playsinline", "");
      video.muted = eigen;                 // jezelf hoor je niet terug
      const onderschrift = document.createElement("figcaption");
      figuur.append(video, onderschrift);
      if (eigen) tegels.prepend(figuur); else tegels.append(figuur);
    }
    figuur.querySelector("figcaption").textContent = naam;
    const video = figuur.querySelector("video");
    if (video.srcObject !== bron) video.srcObject = bron;
    video.play().catch(() => {});
  }

  function weg(id) {
    const v = verbindingen.get(id);
    if (v) { v.pc.close(); verbindingen.delete(id); }
    const figuur = tegels.querySelector(`[data-id="${id}"]`);
    if (figuur) figuur.remove();
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

  function maakVerbinding(id, naam) {
    weg(id);
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    verbindingen.set(id, { pc: pc, sinds: Date.now() });
    for (const spoor of stroom.getTracks()) pc.addTrack(spoor, stroom);
    pc.ontrack = function (e) { tegel(id, naam, e.streams[0], false); };
    pc.onconnectionstatechange = function () {
      if (pc.connectionState === "failed") weg(id);   // de volgende ronde opnieuw
    };
    return pc;
  }

  async function bel(id, naam) {
    const pc = maakVerbinding(id, naam);
    await pc.setLocalDescription(await pc.createOffer());
    await adressenKlaar(pc);
    if (verbindingen.get(id)?.pc !== pc) return;
    await post("stuur", { aan: id, bericht: JSON.stringify({ soort: "voorstel", sdp: pc.localDescription.sdp }) });
  }

  async function verwerk(bericht, namen) {
    const id = bericht.van;
    if (bericht.soort === "voorstel") {
      const pc = maakVerbinding(id, namen.get(id) || "");
      await pc.setRemoteDescription({ type: "offer", sdp: bericht.sdp });
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

  // Elke seconde: berichten ophalen, nieuwe deelnemers bellen, vertrokken deelnemers weghalen.
  async function ophalen() {
    if (ophalenBezig || !stroom) return;
    ophalenBezig = true;
    try {
      const antwoord = await post("post");
      if (!antwoord.ik) {   // de server kent ons niet meer (bv. na een herstart): opnieuw aanmelden
        await post("aan");
        return;
      }
      ik = antwoord.ik;
      const namen = new Map(antwoord.deelnemers.map(d => [d.id, d.naam]));
      for (const bericht of antwoord.berichten) await verwerk(bericht, namen);
      for (const [id, naam] of namen) {
        if (id === ik) continue;
        const v = verbindingen.get(id);
        if (v && v.pc.connectionState !== "connected" && Date.now() - v.sinds > OPGEVEN_NA_MS) weg(id);
        if (!verbindingen.has(id) && ik < id) bel(id, naam);
        const figuur = tegels.querySelector(`[data-id="${id}"] figcaption`);
        if (figuur) figuur.textContent = naam;
      }
      for (const id of [...verbindingen.keys()]) if (!namen.has(id)) weg(id);
      const anderen = namen.size - 1;
      zeg(anderen ? "" : "Nog niemand anders heeft de camera aan.");
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
    if (!aan) return;
    const geluid = stroom.getAudioTracks()[0], beeld = stroom.getVideoTracks()[0];
    knoppen.microfoon.textContent = geluid && geluid.enabled ? "Microfoon uit" : "Microfoon aan";
    knoppen.camera.textContent = beeld && beeld.enabled ? "Camera uit" : "Camera aan";
    blok.classList.toggle("actief", aan);
  }

  async function aan() {
    if (!navigator.mediaDevices || !window.RTCPeerConnection) {
      zeg("Beeld en geluid werken alleen via https, in een recente browser.");
      return;
    }
    zeg("Even toestemming geven voor camera en microfoon…");
    try {
      stroom = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15 } },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (fout) {
      zeg("Geen toegang tot camera of microfoon. Sta het toe in de instellingen van je browser.");
      return;
    }
    tegel("ik", "Jij", stroom, true);
    knoppenBijwerken();
    await post("aan");
    zeg("Verbinden…");
    ophalen();
    timer = setInterval(ophalen, Number(blok.dataset.ververs) || 1000);
  }

  function uit(stil) {
    clearInterval(timer);
    for (const id of [...verbindingen.keys()]) weg(id);
    if (stroom) {
      for (const spoor of stroom.getTracks()) spoor.stop();
      if (!stil) post("uit").catch(() => {});
      else navigator.sendBeacon("/beeld/uit");
    }
    stroom = null;
    const eigen = tegels.querySelector('[data-id="ik"]');
    if (eigen) eigen.remove();
    blok.classList.remove("actief");
    knoppenBijwerken();
    zeg("");
  }

  function wissel(soort) {
    const spoor = soort === "microfoon" ? stroom.getAudioTracks()[0] : stroom.getVideoTracks()[0];
    if (spoor) spoor.enabled = !spoor.enabled;
    knoppenBijwerken();
  }

  blok.addEventListener("click", function (e) {
    const knop = e.target.closest("[data-beeld]");
    if (!knop) return;
    if (knop.dataset.beeld === "aan") aan();
    else if (knop.dataset.beeld === "uit") uit();
    else wissel(knop.dataset.beeld);
  });

  // Na het verversen van de pagina staat dit blok er weer; de video's even opnieuw starten.
  document.addEventListener("pesten:ververst", function () {
    for (const video of tegels.querySelectorAll("video")) video.play().catch(() => {});
  });
  window.addEventListener("pagehide", function () { if (stroom) uit(true); });

  window.pestenBeeld = { uit: function () { uit(false); window.pestenBeeld = null; } };
})();
