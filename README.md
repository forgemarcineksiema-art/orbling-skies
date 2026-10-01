# Orbling Skies

![Orbling Skies](promo/cover-1280x720.png)

Kolekcjonerskie RPG z potworami do grania w przeglądarce. Lecisz statkiem między sześcioma latającymi Gwiezdnymi
Wyspami, łapiesz Orblingi — stworki zrodzone ze spadających gwiazd — trenujesz je w turowych walkach, rozwijasz,
pokonujesz trenerów i Strażników wysp, a na końcu zdobywasz 12 legendarnych Zodiakalnych Orblingów.

- **48 Orblingów**: 12 trzystopniowych linii ewolucji i 12 legend, 4 żywioły i 12 znaków zodiaku z cechami pasywnymi
- **Łapanie** jako krótka scena z mini-grą (kurczący się pierścień)
- **6 wysp × 2 strefy**, trenerzy, Strażnicy, Gwiezdna Arena (5 lig), pora dnia
- **Baza** z warsztatami, które pracują, gdy Cię nie ma; jaja, Dojo, medale, zadania dzienne
- **9 języków**, sterowanie myszą, dotykiem i klawiaturą; telefon w pionie i w poziomie

**Bez zależności i bez plików graficznych czy dźwiękowych** — cała grafika (proceduralne SVG malowane pędzlem na
canvasie) i dźwięk (WebAudio) są generowane kodem. Gra w zipie waży ok. **620 KB**, z osadzonymi fontami.

## Uruchomienie

```bash
python -m http.server 8080
```

i otwórz `http://localhost:8080/`. Bez SDK portalu reklamy są symulowane, a zapis trafia do `localStorage`.

## Sterowanie

- Mysz / dotyk: klik w ziemię — chodzenie; klik w Orblinga, trenera lub obiekt — akcja.
- Klawiatura: WASD / strzałki — ruch, Spacja / E — interakcja, Spacja / Enter — dalej w dialogach; w walce 1–4 — ataki, C — łapanie.
- W walce przyciski w prawym górnym rogu: **AUTO** (walka automatyczna) i **×2** (szybsze animacje).


## Build

```bash
node tools/build.js
```

Tworzy trzy warianty (każdy: `index.html` + `game.js` + `game.css`) i gotowe paczki zip:

| Katalog | Zip | SDK |
|---|---|---|
| `dist/poki/` | `dist/orbling-skies-poki.zip` | Poki SDK v2 |
| `dist/crazygames/` | `dist/orbling-skies-crazygames.zip` | CrazyGames SDK v3 |
| `dist/web/` | `dist/orbling-skies-web.zip` | brak (itch.io, własny hosting) |

Gra sama wykrywa, które SDK jest załadowane (`src/core/platform.js`). Jeśli w wersji portalowej SDK się nie wczyta
(np. adblock), gra działa dalej bez reklam, a przyciski „obejrzyj reklamę” niczego nie przyznają — symulowana reklama
jest tylko w wariancie `web`. Menu (modale) wysyłają `gameplayStop`, a ich zamknięcie `gameplayStart`.

**Poki** — konto na developers.poki.com, wgraj zip i przetestuj w **Poki Inspector** (zdarzenia `gameLoadingFinished`,
`gameplayStart/Stop`, `commercialBreak`, `rewardedBreak`). Poki jest kuratorowane — gra przechodzi ich ocenę.
**CrazyGames** — developer.crazygames.com → *Submit game* → wgraj zip, zaznacz *Progress Save* (zapis w Data module),
zacznij od *Basic launch*, potem *Full launch*.

## Testy

```bash
STRICT=1 node tools/check.js
```

```bash
node tools/smoke.js
```

`check.js` sprawdza tłumaczenia i spójność danych, `smoke.js` logikę gry bez przeglądarki. Pozostałe narzędzia
(zrzuty, galerie grafiki, symulacje walk, grafika promocyjna): [docs/narzedzia.md](docs/narzedzia.md).

## Struktura

```
index.html, fonts.css (osadzone fonty), styles.css, scenes.css, fx.css (efekty walki i systemy v2), skin.css (skórka gry — ładowana na końcu)
src/core    util · i18n (EN/PL) · platform (Poki/CrazyGames/local) · audio (synteza WebAudio)
src/data    elements (znaki zodiaku i żywioły) · moves · species · items · world (wyspy, strefy, trenerzy, zadania) · arena (ligi)
src/art     paint (paleta, cieniowanie) · painter (malowanie pędzlem, worker, cache IndexedDB) · scenery (malowane tła, podesty walki) · props (rekwizyty) · monster_art (potwory SVG) · world_art (wypiekanie teł, postacie, wyspy, mapy wysp, ikony) · hud_art (malowane ikony HUD, maskotka, strzałki) · map_art (panorama Mapy Gwiazd) · fx · vfx (silnik cząsteczek na canvasie)
src/game    state (zapis v2, migracja, XP, ewolucje) · quests · camp (jaja, Dojo) · meta (medale, kalendarz) · battle_logic
src/ui      ui (skalowanie, modale, dialogi, HUD, przejścia) · menus · menus_meta (Obóz, medale, kalendarz, puchary)
src/scenes  title · intro · explore · battle · galaxy · arena
src/main.js start, ustawienia, cykl życia
tools/      build.js · check.js · smoke.js · artcheck.js · shot.js · rec.js · film.js · audit.js · typescale.js · fonts.py · sim.js · sim_teams.js · gallery.html · world.html · keyart.html · keyart_shots.js · keyart_video.py
```


## Dokumentacja

- [CHANGELOG.md](CHANGELOG.md) — historia wersji
- [docs/GDD.md](docs/GDD.md) — dokument projektowy gry
- [docs/poki_zgloszenie.md](docs/poki_zgloszenie.md) — materiały do zgłoszenia na Poki

## Licencja

Kod i grafika: © Marcin Płaza, wszelkie prawa zastrzeżone. Fonty (Rubik, Pangolin, Lilita One) na licencji SIL OFL —
teksty licencji w `assets/fonts/`.
