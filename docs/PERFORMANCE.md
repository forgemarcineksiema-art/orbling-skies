# Wydajność 3.4.4

Zmiany dotyczą renderowania i cyklu życia zasobów. Zapis oraz zasady walki pozostają zgodne z 3.4.3.

## Co zmieniono

- Duże wzorcowe tła: LRU do 3 obrazów i 24 MiB surowych pikseli. Limit nie obejmuje całej pamięci gry ani pamięci GPU przeglądarki. Sceny otrzymują osobne kopie, więc usunięcie wzorca nie psuje wyświetlanego tła.
- Rozmyte wypełnienie pionowego ekranu: płótno 640×360 zamiast pełnego rozmiaru. Główna scena zachowuje rozdzielczość.
- Panorama mapy: zachowywany jest tylko ostatni stan odblokowania. Płótna opuszczanych scen zwalniają swoje bufory nawet wtedy, gdy obiekt sceny nadal przechowuje węzeł DOM.
- Gotowe i oczekujące obrazy współdzielą wynik bez ponownego generowania SVG. Zakończone zadania wypadają z tabeli obietnic. Po zmianie sceny nierozpoczęte zadania dostają wektorowy wynik zastępczy i są anulowane; ponowne wejście może przygotować je ponownie.
- Brak automatycznego przygotowywania całego bestiariusza i cykli wszystkich gatunków wyspy. Przygotowywane są potrzebne postacie; pozostają wszystkie klatki normalnego trybu jakości.
- Maksymalnie dwa zadania malowania równocześnie, jedno na urządzeniach zgłaszających do 4 GB pamięci. Zadania czekają, gdy karta jest ukryta. Obrazy tymczasowe i adres skryptu pracownika są zwalniane.
- Postacie poza kadrem nadal uczestniczą w symulacji, ale nie zmieniają niewidocznych klatek i transformacji. Niezmienione pozycje, kolejność głębi i kamera nie powodują powtarzanych zapisów stylów.
- Efekty: do 1200 cząsteczek (450 w lekkim trybie) i 160 obiektów. Standardowe efekty mieszczą się w tych budżetach. Lekki tryb ogranicza również rozdzielczość płótna efektów. Zmiana sceny sprząta pętlę rysowania oraz zaplanowane emisje, zachowując rozwiązywanie obietnic czasu rozgrywki.
- Ukryta karta wstrzymuje animacje CSS, eksplorację i zamianę klatek wojowników. Zakończone węzły WebAudio są rozłączane; wyłączona muzyka nie tworzy niesłyszalnych instrumentów.

## Pomiary

Chromium headless, programowe renderowanie (`--disable-gpu`), widok 390×844 CSS px, DPR 2. Czysty profil, pełna jakość. Trasa: clover → shore → ashen → drift → plains → grove → clover. Po trasie pomiar i wymuszone sprzątanie przez CDP. Gry nie testowano na fizycznym telefonie użytkownika.

Pierwsze porównanie 3.4.3 z wersją po głównych optymalizacjach:

| Pomiar | Przed | Po |
| --- | ---: | ---: |
| Żywe wzorcowe tła sześciu lokacji po GC | 6 | 3 |
| Ich surowe bufory pikseli | 47,46 MiB | 23,73 MiB |
| 100 żądań gotowego obrazu Sunkit | 57,6 ms | 0,8 ms |
| Pamięć sterty JS po GC | 10,56 MiB | 5,91 MiB |
| Zadania głównego wątku powyżej 50 ms na trasie | 24 | 11 |

Po dodaniu anulowania kolejek końcowy przebieg miał 177 gotowych obrazów, 0 zadań oczekujących i pracujących, 3 wzorcowe tła (23,73 MiB) oraz 5,02 MiB sterty JS po opróżnieniu kolejki i GC.

Są to pojedyncze pomiary diagnostyczne. Skład dzikich stworzeń jest losowy, a obciążenie środowiska współdzielone; sterta JS i czasy nie są gwarancją na każdym urządzeniu. Kolejny pomiar podczas równoległego testu efektów miał gorsze czasy klatek i nadal spełniał limit teł. Nie wyciągamy z tego zapewnienia o stałych 60 FPS. Sterta JS nie obejmuje wszystkich obrazów, procesów pracowników, WebAudio ani GPU. Cache obrazów postaci i SVG nadal zachowuje potrzebne wcześniej zasoby; nie jest to globalny limit RAM gry.

## Weryfikacja

`node tools/perfcheck.js` sprawdza rzeczywiste moduły z adapterami płótna i zegara: współdzielenie pracy, brak regenerowania gotowej grafiki, zwalnianie obietnic, zatrzymanie i wznowienie pracy w tle, anulowanie kolejki i ponowne przygotowanie, limit teł, bezpieczeństwo usunięcia wzorca, limity efektów, sprzątanie opóźnionych emisji oraz restart efektów. Test jest częścią GitHub Actions.

Kontrole w prawdziwej przeglądarce objęły animacje 67 ruchów (ataki z trafieniami oraz właściwe wywołania wzmocnień i leczenia), pierwszą walkę i łapanie stworka, powrót do eksploracji, wielokrotne przejścia przez mapę, zmianę orientacji i ustawienia. Po zakończeniu serii efektów: 0 cząsteczek, 0 obiektów, 0 zaplanowanych emisji, 0 elementów `.fxp`; bez ostrzeżeń efektów. Osobno sprawdzane są zdarzenia ukrycia i wznowienia karty przez kontrolowaną właściwość `document.hidden` — nie jest to test blokady systemowej Androida/iOS.

Do diagnostyki w konsoli: `Painter.stats()`, `WArt.stats()`, `VFX.stats()`. Warto ponowić profilowanie na docelowym telefonie po dłuższej sesji; nie obiecujemy identycznej płynności na każdym sprzęcie.
