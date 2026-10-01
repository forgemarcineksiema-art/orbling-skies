# Orbling Skies — zgłoszenie do Poki (wersja 3.4)

Wszystko, czego potrzeba do wysłania gry do Poki, w jednym miejscu. Teksty do formularzy są po angielsku (gotowe do
wklejenia), komentarze po polsku. Wymagania i liczby pochodzą z dokumentacji dla deweloperów Poki i CrazyGames (stan na
27.09.2026).

## 1. Co wysłać

| Co | Plik |
|---|---|
| Build z Poki SDK v2 | `dist/orbling-skies-poki.zip` (`node tools/build.js`; ok. 620 KB) |
| Miniatura (kwadrat, bez tekstu) | `promo/poki-thumbnail-1080.png` (jest też `promo/poki-thumbnail-628.png`) |
| Animowana miniatura (dopiero w soft release) | `promo/poki-animated-1080.mp4` — 1080×1080, 60 kl./s, 5 s, H.264, bez dźwięku |

Przed wgraniem: przejść build w **Poki Inspector** (inspector.poki.dev) — log zdarzeń, rozmiar, skalowanie, tryb mobilny
z kodem QR na prawdziwy telefon.

## 2. Teksty do formularza (EN)

**Title:** Orbling Skies

**Short description:**
> Catch, befriend and train star-born creatures on floating isles in the sky!

**Description:**
> Four stars fell on Sunny Isle tonight — and each one brought an Orbling. Pick your partner and set off across the
> Star Isles: explore bright floating islands, battle wild Orblings in quick turn-based fights, and time your throw to
> catch them in a Star Orb. Build a team from 48 Orblings of four elements and twelve star signs, evolve them, teach
> them new moves, beat each isle's tamers and its Guardian, climb the Star Arena, and grow your own Base with workshops
> that keep working while you're away.

**Controls:**
> Mouse / touch: tap the ground to walk, tap an Orbling, a person or an object to interact. In battle, tap a move or
> the CATCH dial. Keyboard: WASD / arrows to move, Space / E to interact, Space / Enter to continue; in battle 1–4 for
> moves and C to catch. Esc closes menus.

**Kategoria (propozycja):** Adventure / RPG (tagi: monster, collecting, turn-based, cute).
**Orientacja na telefonach:** obie (pion jest głównym układem, poziom też ma pełny układ).
**Języki:** English, Polski, Deutsch, Español, Français, Italiano, Português (BR), Türkçe, Русский — wybierane z języka
przeglądarki.

## 3. Wymagania Poki i jak gra je spełnia

| Wymaganie | Stan w 3.4 | Jak sprawdzone |
|---|---|---|
| `gameLoadingFinished` po wczytaniu, `gameplayStart` dopiero na pierwsze wejście gracza, `gameplayStop` przy każdym menu i przerywniku, bez podwójnych start/start | tak | log Poki SDK (debug) w buildzie `dist/poki` |
| `commercialBreak` tylko w naturalnych przerwach (po walce, przelot między wyspami), nie w pierwszych 4 min i nie w samouczku | tak | `Platform.naturalBreak` |
| Reklamy z nagrodą: zawsze obok darmowej opcji tej samej wielkości, nigdy zielone, z 🎬, nagroda tylko po udanej reklamie, jedna reklama = jedna nagroda | tak | przyciski `.btn.ad` (fiolet) |
| Wyciszenie i pauza podczas reklamy, klawiatura zablokowana | tak | `Platform.onAd` → `Snd.pauseAll`, `Painter.hold` |
| Działa z adblockiem (bez komunikatów, bez nagród) | tak | `Platform.kind = 'none'` |
| Brak zewnętrznych zapytań (fonty, grafika, dźwięk w buildzie) | tak | jedyny zewnętrzny plik to skrypt Poki SDK |
| Rozmiar i czas ładowania | ok. 620 KB zip, ekran ładowania ~1,5 s | Poki tracker `transferSize`, pomiar w Chrome |
| Zapis w localStorage z try/catch; chmura Poki ≤1 MB | zapis ~kilka KB; cache grafiki w IndexedDB z prefiksem `poki_ignore` | `Platform.storeGet/Set` |
| Pion i poziom na telefonie, testy 640×360 / 836×470 / 1031×580 | tak; tekst min. ~11 px przy 836×470 i na telefonie 360 px | `tools/audit.js` (dwie trasy, oba układy) |
| Przycisk Poki (pill) na telefonie niczego nie zasłania | tak | `?pill=1` + audyt: zero elementów pod nim |
| Przerywniki do pominięcia | prolog ~6,5 s z „Pomiń” od 1. sekundy i Esc/Enter/Spacja | — |
| Zabawa w ciągu ~10 s, brak menu przed grą | wybór partnera ok. 10 s od otwarcia; powracający gracz od razu w świecie | pomiar w Chrome headless |
| Samouczek wizualny, nie tekstowy | jeden cel ze strzałką i kręgiem na ziemi, krótkie dymki Pipa | — |
| Strona nie przewija się (strzałki, spacja, kółko) | tak | `preventDefault` w `main.js` |
| Jedna waluta, brak IAP | tak (monety) | — |
| Treści: bez przemocy graficznej, hazardu, treści dla dorosłych | tak (koło nagród za darmo raz dziennie, szanse widoczne) | — |

## 4. Plan: playtesty → player-fit → web-fit

1. **Playtesty** (10 nagrań prawdziwych graczy Poki): patrzeć przede wszystkim na pierwsze 30 s — czy gracze czekają na
   koniec prologu, czy pomijają, czy od razu stukają w partnera, czy rozumieją pierwszą walkę i łapanie.
2. **Player-fit test** (500 graczy): próg to średnio >3 min i ≥25% gier dłuższych niż 3 min.
3. **Web-fit test** (~10 tys. graczy): CTR (miniatura), czas na stronie i C2P — każdy oceniany względem średniej kategorii.
   Cel: C2P ≥65%, średni czas ≥5 min.

Zdarzenia analityki (`PokiSDK.measure`), które gra już wysyła — lejek pierwszej sesji:
`tutorial/prologue start → skip | complete`, `tutorial/starter start → show → complete`, `tutorial/battle start`,
`first/catch complete`, `tutorial/catch complete`, potem `isle/<wyspa> start|complete`, `quest/<id> start`,
`first/tamer complete`, `base/…`, `story/<id> complete`. Jeśli wielu graczy odpada między `prologue start` a
`starter show`, skracamy dalej (prolog można wtedy pokazywać dopiero po pierwszym złapaniu).

## 5. Oryginalność (EN — do pola „notes” albo rozmowy z Poki)

> Orbling Skies is a creature-collecting RPG in the tradition of the genre (explore, battle, catch, evolve). Its world,
> creatures, names, characters, story, UI and audio are our own: 48 Orblings designed for the game and painted by the
> game's own code, four elements and twelve star-sign traits, floating isles in the sky, a staged "star lock" catch
> with a timing ring, a Base with workshops that produce while you are away, friendship hearts, a Star Arena with
> leagues, and a nine-language localisation. No names, art, icons, layouts or music are taken from any other game.

Zmiany w 3.4 pod tym kątem: nowy tytuł i kilka nowych, własnych nazw (Rudi, Kula Meteoru, Twierdza Zaćmienia).

## 6. Użycie AI (EN — Poki może o to zapytać)

> The game was developed with an AI coding assistant (Anthropic's Claude) working under the developer's direction: game
> code, the procedural vector art (all characters, backgrounds and icons are drawn by code, no generative image
> models), procedural music and sound (WebAudio synthesis), and translations. Every text in the game was reviewed by the
> developer. There are no AI watermarks or prompt texts anywhere in the game, and the development history (design
> documents, research notes, version notes) is available on request.

## 7. Plan rozwoju (EN — Poki docenia „room to grow”)

> After release: a content update every 4–6 weeks — a new isle with its own Orblings, tamers and Guardian; monthly
> "Ascendant" sign events with bonus spawns; seasonal Base decorations and visitors; new Arena leagues; and, once
> available to us, Poki's leaderboards (AUDS) for Arena trophies and Codex completion.

## 8. Wyłączność — decyzja przed jakąkolwiek publikacją

Domyślna umowa Poki jest **wyłączna na cały web** (5 lat, 50/50 z ruchu od Poki, 100% z ruchu własnego). Gra, która już
jest na innym portalu, dostaje od Poki tylko jednorazową licencję. Dlatego: **nie publikować gry nigdzie (CrazyGames,
itch.io, własna strona) przed decyzją Poki.** Build CrazyGames (`dist/orbling-skies-crazygames.zip`) i okładki
CrazyGames (`promo/cover-*.png`) są gotowe na wypadek, gdyby Poki odmówiło.

## 9. Czego kod nie załatwi

Uczciwie: kod i materiały są przygotowane pod każde wymaganie Poki, które da się sprawdzić, ale ostatnie słowo mają
ludzie i liczby. Final review Poki jest subiektywny (jakość, oryginalność, czy kategoria nie jest już pokryta), a
wyniki testów zależą od prawdziwych graczy. Na to działa tylko to, co wyżej: playtesty, obserwacja lejka i szybkie
poprawki między testami.
