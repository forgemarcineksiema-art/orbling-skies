# Narzędzia deweloperskie

```bash
node tools/check.js
```

Weryfikuje wszystkie klucze tłumaczeń (EN/PL oraz znaczniki `{…}` w pozostałych językach; `STRICT=1` wymaga kompletu) i spójność danych
(w tym Bazy: warsztaty, dekoracje, historie), renderuje każdy gatunek.

```bash
node tools/i18n.js todo
```

Języki poza EN/PL żyją w `src/core/lang/<kod>.js` (DE, ES, FR, IT, PT-BR). `todo` zapisuje brakujące teksty do
`i18n_todo.json` (z angielskim i polskim oryginałem), a `node tools/i18n.js merge <kod> plik.json` wstawia gotowe tłumaczenie.

```bash
node tools/artcheck.js
```

Renderuje całą grafikę (tła, rekwizyty, wyspy, postacie, 96 wariantów Orblingów), wyłapuje NaN/undefined w SVG i podaje rozmiary.

```bash
node tools/shot.js out/
```

Zrzuty ekranu z prawdziwej gry przez Chrome headless (wymaga serwera na porcie 8792): każda strefa, walka, mapa, tytuł.
Własny scenariusz: `node tools/shot.js out/ kroki.json` (kroki `{eval, wait, shot, print}`), inna strona: zmienna `URL` (np. zbudowane `dist/web`).
`node tools/film.js out/ kroki.json 40` — nagrywa serię prawdziwych klatek (screencast), żeby ocenić ruch.
`tools/paint_test.html` — porównanie grafiki wektorowej z malowaną (`?m=sunkit,clawby&p=me,g_fern`), cykle chodu postaci (`?walk&p=me`) i klatki Orblingów — pętla i ruch (`?mwalk&m=budlet,finnip`), `&paint` dla wersji malowanej.
`python tools/fonts.py` — przebudowuje `fonts.css` (osadzone fonty OFL z `assets/fonts`, licencje obok): Rubik 700/900/900i
wycinany ze zmiennego pliku, Pangolin i Lilita One, podzbiór: łacina 1, łacina rozszerzona A (polski, turecki) i cyrylica.

```bash
node tools/smoke.js
```

Test logiki bez przeglądarki: cały łańcuch zadań, migracje zapisu (v1 → v5), zapis/odczyt, zadania dzienne, jaja i Dojo,
medale, kalendarz logowania, odblokowanie lig Areny, ewolucje, zasady drużyny, szanse łapania, a z 3.0: warsztaty
(limit 10 h, zbiór, pracownik w drużynie), przyjaźń (limity), dekoracje, gość, pierwsze złapanie, prezent powitalny i historie, a z 3.5: pogoda
(prognoza, mnożnik obrażeń), Gwiezdne Orblingi i odstępy między spadającymi gwiazdami.

```bash
node tools/sim.js
```

Symulacje pojedynków AI vs AI (balans, liczba tur); `node tools/sim_teams.js` — walki 3v3 ze Strażnikami każdej wyspy.

- `tools/gallery.html` — galeria wszystkich 48 Orblingów (`?shiny`, `?s=300`, `?only=sunkit,finnip`)
- `tools/world.html` — tła biomów (`?m=bg`, pojedyncze w pełnym rozmiarze: `?m=one&b=forest`), rekwizyty (`?m=props`), postacie/przedmioty/wyspy (`?m=people`), wszyscy trenerzy (`?m=tamers`)
- `tools/keyart.html` — grafika kluczowa z grafiki gry, jako funkcja czasu (`?w=1080&h=1080` miniatura Poki bez tekstu,
  `&logo=1` okładki CrazyGames z tytułem, `?mode=sheet` arkusz póz). Pliki w `promo/` (serwer na porcie 8794):
  `node tools/keyart_shots.js still promo/poki-thumbnail-1080.png 1080 1080`, okładka: `… still promo/cover-1920x1080.png 1920 1080 1`,
  animowana miniatura: `node tools/keyart_shots.js frames out/ 1080 1080 5 60` + `python tools/keyart_video.py out/ promo/poki-animated-1080.mp4 60`.
- `tools/audit.js` — audyt układu w działającej grze: `eval(await (await fetch('/tools/audit.js')).text()); await Audit.setup(); await Audit.tour()`
  (drugą trasę rzadszych ekranów daje `Audit.tour2()`); `?pill=1` pokazuje strefę przycisku Poki.


Pogoda i spadające gwiazdy w działającej grze: `?wx=rain` (`storm`, `heat`, `fog`, `clear`) wymusza pogodę na każdej wyspie,
`?star=1` zrzuca gwiazdę kilka sekund po wejściu do strefy (np. `http://localhost:8080/?wx=storm&star=1`).

## Zmiana nazwy gry

Tytuł występuje w `index.html` (`<title>`, ekran ładowania), `src/scenes/title.js` (logo SVG),
`src/main.js` (klucze zapisu) i `tools/build.js` (nazwy zipów).
