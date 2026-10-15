# Przegląd architektury i odporności — 3.5.0

Przegląd z 14 października 2026, względem 3.4.4 (`a7956af`). Obejmuje ręczną analizę zarządzania grafiką, cyklu życia ekranów, animacji, efektów, dźwięku, zapisu, adaptera platform oraz logiki gry; automatyczne kontrole danych i tłumaczeń; testy w Chromium. Nie jest dowodem poprawności każdej ścieżki wielogodzinnej kampanii ani certyfikacją wszystkich telefonów.

## Naprawione problemy

| Problem i skutek | Zmiana | Weryfikacja |
| --- | --- | --- |
| Cache obrazów postaci i SVG rósł przez całą sesję. | Usuwanie najdawniej używanych obrazów, budżet 48 MiB szacowanych pikseli i blobów / 160 obrazów; SVG do 8 MiB / 256 wpisów. Aktualnie używane zasoby są chronione. | Powtarzane przejścia przez sześć lokacji, zmiany wyglądu, test usuwania i ponownego wczytywania. |
| Niewidoczni mieszkańcy od razu zamawiali pełne cykle animacji. | Poza kadrem przygotowywana jest pozycja spoczynkowa; pozostałe klatki powstają po pojawieniu się postaci w kadrze. | Przebieg przez lokacje i samouczek w przeglądarce. |
| Brak pracownika graficznego uruchamiał kosztowny algorytm pociągnięć pędzla w wątku interfejsu. | Awaryjnie używany jest raster cieniowanej grafiki wektorowej. Ma mniej detali malarskich i nie trafia do trwałego cache jako pełny obraz. | Przeglądarka bez Worker; pracownik, który nigdy nie odpowiada; CPU spowolniony czterokrotnie. |
| Zawieszone zadanie graficzne lub odczyt IndexedDB mogły zajmować kolejkę bez końca. | Limity czasu: 8 s na pracownika / ładowanie obrazu, 1,2 s na otwarcie i odczyt cache, 2 s na eksport awaryjnego rastra. Niesprawny pracownik jest kończony; zadanie zwraca grafikę zastępczą. | Wymuszone zawieszenie Worker i otwierania IndexedDB; test zegara ładowania obrazu. |
| Tymczasowe płótna malowania czekały na sprzątanie przez przeglądarkę. | Jawne zwalnianie ich buforów po każdym zadaniu; wspólna tekstura pozostaje. | Przegląd kodu i testy zasobów. |
| Świat nadal pracował pod pełnoekranowymi menu. | Pauza symulacji eksploracji i animacji CSS, wznowienie po zamknięciu menu. | Kontrola czasu symulacji przed, podczas i po otwarciu menu. |
| Wyjście ze wstępu usuwało timery bez zakończenia oczekujących obietnic. | Oczekiwania kończą się wynikiem anulowania; stara sekwencja nie uruchamia następnej animacji. Opóźnione wejścia eksploracji i walki są sprzątane. | Regresja opuszczenia i ponownego wejścia do singletonu; pełny samouczek. |
| Późne wyniki malowania walki mogły aktualizować odłączone elementy. | Wyjście unieważnia tokeny odbiorców i zwalnia zestawy klatek. | Przegląd ścieżek asynchronicznych oraz przejścia między ekranami. |
| Wyjątek podczas otwierania ekranu pozostawiał niedziałający widok. | Sprzątanie częściowego ekranu, odblokowanie przejścia w `finally` i przycisk powrotu do gry bez przeładowania zapisu. Komunikat w dziewięciu językach. | Celowo rzucony wyjątek, kliknięcie kontynuacji i kontrola zachowania tego samego obiektu stanu. |
| Nieaktualne potwierdzenie wypuszczenia Orblinga zwracało sukces drugi raz. | Operacja sprawdza, czy Orbling jeszcze istnieje, zanim pozwoli na nagrodę. | Regresja podwójnego wypuszczenia i ochrony ostatniego członka drużyny. |
| Inicjalizacja SDK portalu mogła blokować start bez końca. | Po 6 s gra przechodzi do trybu bez reklam, bez symulowanych nagród portalu. | Testy nigdy nierozwiązanych inicjalizacji Poki i CrazyGames. |

## Pamięć: co mierzymy

Budżety cache nie są limitem całego RAM gry. Licznik sprite'ów szacuje `szerokość × wysokość × 4 + rozmiar bloba`; sterta JS, kopie dekodera, płótna sceny, procesy Worker, audio i GPU są oddzielne. Zasoby aktualnej sceny i obrazy widoczne w DOM mają pierwszeństwo przed budżetem — usunięcie ich URL powodowałoby migotanie lub znikanie klatek. Ochrona sceny kończy się przy zmianie ekranu.

Pamięć dyskowa IndexedDB jest oddzielnym cache i nadal nie ma własnej polityki limitowania wielkości. Przekroczenie kwoty nie blokuje gry, ale budżetu RAM nie należy przedstawiać jako ograniczenia zajętego miejsca na dysku. Docelowy pomiar całkowitej pamięci wymaga profilowania przeglądarki na telefonie.

Pomiary i porównanie: [PERFORMANCE.md](PERFORMANCE.md).

## Zakres kontroli pozostałych elementów

Kontrole obejmują 48 gatunków, 67 ruchów i komplet 984 tekstów w każdym z dziewięciu języków, generowanie grafiki, migracje zapisu, testy odmowy zapisu / wadliwego odczytu oraz rzeczywiste tury walki. Naprawy zapisu i zasad walki z 3.4.2 oraz limitów efektów, teł i audio z 3.4.4 pozostają sprawdzane. Projekt nie wymaga zależności produkcyjnych JavaScript.

Nie ma podstaw do przepisywania całej gry na inny silnik. Potwierdzone koszty wynikały przede wszystkim z zarządzania zasobami i przygotowywania grafiki. Przebudowane zostały te mechanizmy. Klatki rysunkowej animacji postaci mają celowo niższy rytm niż odświeżanie ruchu obiektów — sama liczba rysunków nie dowodzi zacinania renderera.

Do dalszej weryfikacji na sprzęcie: Safari/iOS, Android WebView aplikacji ChatGPT, przywrócenie karty po jej usunięciu z pamięci przez system, wysoka temperatura / oszczędzanie energii i wielogodzinna kampania. Rzeczywistych reklam i chmurowego zapisu portali nie sprawdzono na ich serwerach. Spowolnienie CPU w Chromium nie symuluje wszystkich tych warunków. Schemat walidacji zapisu chroni główne struktury, lecz nie jest jeszcze pełnym walidatorem każdego opcjonalnego pola. Brak własnego limitu dyskowego cache to osobne zadanie od stabilizacji RAM.

## Odtwarzanie testów

Uruchom `python tools/devserver.py 8792`, a następnie w drugim terminalu:

```bash
STRICT=1 node tools/check.js
node tools/artcheck.js
node tools/smoke.js
node tools/regression.js
node tools/perfcheck.js
node tools/build.js
node --check dist/web/game.js

CHROME=/usr/bin/chromium INIT=tools/runtime/init.js VW=390 VH=844 DPR=2 MOBILE=1 node tools/shot.js /tmp/orbling-soak tools/runtime/soak.json
CHROME=/usr/bin/chromium INIT=tools/runtime/init.js CPU=4 VW=390 VH=844 DPR=2 MOBILE=1 node tools/shot.js /tmp/orbling-cpu tools/runtime/failures.json
CHROME=/usr/bin/chromium INIT=tools/runtime/no-worker.js VW=390 VH=844 DPR=2 MOBILE=1 node tools/shot.js /tmp/orbling-no-worker tools/runtime/failures.json
CHROME=/usr/bin/chromium INIT=tools/runtime/hung-worker.js VW=390 VH=844 DPR=2 MOBILE=1 node tools/shot.js /tmp/orbling-hung-worker tools/runtime/failures.json
```

W izolowanym kontenerze uruchamianym jako root użyto dodatkowo `CHROME_FLAGS=--no-sandbox`. Testy zakładają świeży profil przeglądarki i tworzą własny stan gry. Nie wykonuj `Audit.setup()` w profilu z właściwym postępem. Log `Injected scene failure` jest oczekiwany w teście odzyskiwania; dalszy wynik musi zawierać `recovery: true`, `statePreserved: true` i pustą listę nieobsłużonych błędów. Skrypt zwraca niezerowy kod przy błędzie wykonywanej asercji.
