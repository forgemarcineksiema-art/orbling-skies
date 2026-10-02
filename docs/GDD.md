# Orbling Skies — dokument projektowy gry (GDD)

> Wersja 3.0 · wrzesień 2026 · gra HTML5 na portale **Poki** i **CrazyGames**
> Nazwa robocza — do łatwej zmiany (`index.html`, `src/scenes/title.js`, `src/core/i18n.js`).

---

## 1. Koncepcja w jednym akapicie

**Orbling Skies** (do wersji 3.3 *Orbling Galaxy*) to kolekcjonerskie RPG z potworami. Gracz jest Trenerem, który statkiem kosmicznym podróżuje między sześcioma latającymi **Gwiezdnymi Wyspami**, łapie **Orblingi** — urocze stworki zrodzone ze spadających gwiazd — trenuje je w turowych walkach, rozwija (ewolucje), pokonuje trenerów i **Strażników wysp**, a na końcu zdobywa 12 legendarnych **Zodiakalnych Orblingów**. Sesje trwają 5–15 minut, gra działa w przeglądarce na komputerze i telefonie (poziomo), bez pobierania czegokolwiek.

| | |
|---|---|
| Gatunek | monster-tamer RPG, turowe walki 1v1, eksploracja |
| Grupa docelowa | 8–16 lat oraz nostalgiczni gracze gier z Facebooka (25–35 lat) |
| Platformy | Poki, CrazyGames (desktop, telefon w pionie i w poziomie), dowolny hosting HTML5 |
| Monetyzacja | reklamy portalowe: przerywniki (midgame) + reklamy nagradzane (rewarded) |
| Język | angielski (domyślny), polski (auto-wykrywanie + przełącznik) |
| Rozmiar | **~180 KB** (zip) — cała grafika i dźwięk są generowane kodem |

---

## 2. Filary gry

Mechaniki kolekcjonerskiego RPG z potworami w oryginalnym wydaniu — **wszystkie nazwy, postacie i grafika są własne**.

- Orblingi zrodzone ze spadających gwiazd
- 12 znaków zodiaku; skuteczność liczona po **żywiole znaku** (czytelne dla dzieci) + każdy znak daje **cechę pasywną**
- 4 ataki: **fizyczne** (darmowe, neutralne) i **gwiezdne** (kosztują energię, mają żywioł)
- Łapanie **Gwiezdnymi Kulami** + mini-gra z kurczącym się pierścieniem
- Drużyna 3 + nielimitowana **Przechowalnia**
- **6 wysp × 2 strefy**, odblokowanie Pieczęcią Strażnika
- **Pip** — robot-towarzysz lecący za graczem, tracker zadań
- **12 Zodiakalnych Legend** w Obserwatorium + **Ascendent miesiąca** (bonusy dla znaku z kalendarza)
- 24 trenerów + 6 Strażników + rewanże
- Kreator trenera (skóra, fryzura, kolory, dodatki)
- Koło Gwiazd, kalendarz logowania (7 dni), zadania dzienne, skrzynie co 4 h
- **Gwiezdna Arena**: 5 lig × (4 rywali + mistrz), puchary
- **63 medale** (21 kategorii × brąz/srebro/złoto) z nagrodami
- **Obóz**: Wylęgarnia jaj + Dojo (trening offline), **Alfy**, gwiezdne okruchy, pora dnia

---

## 3. Pętle rozgrywki

**Pętla minutowa (core loop)**
```
Eksploruj strefę → kliknij dzikiego Orblinga → walka turowa
   → osłab → rzuć kulę (mini-gra) → złapany / XP + monety
   → awans poziomu → nowe ataki → ewolucja → silniejsza drużyna
```

**Pętla sesji (10–15 min)** — zadanie główne od Pipa → pokonaj trenerów wyspy → Strażnik → Pieczęć → lot na nową wyspę.

**Pętla dzienna** — kalendarz logowania (7 nagród, bez resetu za opuszczony dzień), Koło Gwiazd (1 darmowy obrót + 2 za reklamę), 3 zadania dzienne, skrzynia w każdej strefie co 4 h, odbiór treningu z Dojo, Ascendent miesiąca.

**Pętla powrotu (v2)** — Dojo trenuje Orblingi z przechowalni do 8 h pod nieobecność gracza; jaja w Wylęgarni czekają na kolejne wygrane walki; nocą (21–5) lśniące Orblingi pojawiają się 2× częściej.

**Meta** — Kodeks 48 gatunków z nagrodami za progi, lśniące warianty (1/150), 3-gwiazdkowy potencjał, 12 legend, 63 medale, 5 pucharów Areny.

---

## 4. Systemy gry

### 4.1 Żywioły i znaki

Cykl żywiołów (atak gwiezdny ×1,5, odwrotnie ×0,67):

```
Ogień ──► Ziemia ──► Powietrze ──► Woda ──► Ogień
(pali lasy) (uziemia burze) (burza razi wodę) (woda gasi ogień)
```

| Znak | Żywioł | Cecha znaku |
|---|---|---|
| Baran | Ogień | **Zapalczywość** — pierwszy atak w walce +30% |
| Byk | Ziemia | **Krzepkość** — −20% obrażeń fizycznych |
| Bliźnięta | Powietrze | **Bliźniacza Dusza** — 25% na podwójny atak fizyczny |
| Rak | Woda | **Księżycowa Skorupa** — Obrona +40% poniżej ½ HP |
| Lew | Ogień | **Duma** — +12% szansy na krytyk |
| Panna | Ziemia | **Rozkwit** — +5% HP co turę |
| Waga | Powietrze | **Równowaga** — ataki gwiezdne tańsze o 1 energię |
| Skorpion | Woda | **Jad** — 25% na zatrucie atakiem fizycznym |
| Strzelec | Ogień | **Strzelec wyborowy** — ataki nigdy nie chybiają |
| Koziorożec | Ziemia | **Determinacja** — +30% obrażeń poniżej ⅓ HP |
| Wodnik | Powietrze | **Przepływ** — +1 energii co turę |
| Ryby | Woda | **Nieuchwytność** — 12% uniku |

Odporności na statusy: Ogień — oparzenie, Woda — zamrożenie, Powietrze — porażenie, Ziemia — trucizna.

### 4.2 Statystyki Orblinga
HP, Atak (fizyczny), Moc gwiazd (gwiezdny), Obrona, Szybkość. Wartości z sumy bazowej etapu (270 / 360 / 450, legendy 520) × wagi linii (np. Byk = tank, Strzelec = szybki mag). Każdy osobnik ma losowy **potencjał** ±10% na statystykę (1–3 ★). Maks. poziom 50.

### 4.3 Walka
- 1v1, drużyna do 3, zmiana Orblinga zajmuje turę; kolejność: priorytet ataku → Szybkość.
- **Energia**: 10 pkt, +1 co turę (Wodnik +2), pełna po walce. Ataki fizyczne darmowe, gwiezdne 2–7.
- Obrażenia (uproszczony wzór klasyczny):
  `((2·Poz/5+2) · Moc · A/O) / 50 + 2` × typ × STAB 1,2 × krytyk 1,5 × losowość 0,86–1 × cechy.
- Statusy: Oparzenie (−1/12 HP, 3 tury, −20% ataku fiz.), Trucizna (−1/10 HP, 4 tury), Porażenie (25% utraty tury), Sen (2–3 tury), Lód (1 tura).
- Modyfikatory statystyk −3…+3.
- AI: szacuje obrażenia jako % pozostałego HP celu; trenerzy wybierają najlepszy ruch, dzikie Orblingi częściej improwizują.
- Przyciski ataków pokazują koszt, moc i znacznik **„Mocny!/Słaby”** wobec przeciwnika .
- **Efekty (v2)**: każda rodzina ataków ma własną animację — kule ognia ze smugą, fala, bąbelki, odłamki lodu, zamieć, lawina kamieni, trzęsienie ziemi z pęknięciami, pnącze, burza liści, podmuchy, błyskawice z nieba, promień, meteory, szczęki, pazury… Trafienie: błysk, odrzut, drżenie ekranu (wyłączalne), etykiety **KRYTYCZNE! / SUPER!**. Statusy są widoczne na stworku (płomyki, bąbelki trucizny, Zzz, iskry, lód).
- **AUTO** (walka automatyczna tym samym AI co trenerzy) i **×2** (szybkie animacje) — przełączniki w rogu ekranu walki. AUTO sam się wstrzymuje przy dzikim Orblingu wartym złapania (nowy gatunek, lśniący, Alfa).
- Walki z trenerami otwiera plansza **VS**; po awansie pokazuje się panel przyrostu statystyk.
- **Efekty 2.2 (silnik `vfx.js`)**: jedna warstwa canvas nad sceną, cząsteczki z addytywną poświatą (blask, dym, iskry, gwiazdki, odłamki, liście, bąbelki, krople, płomienie), pociski po łuku ze smugą, fale, promienie, pioruny z nieba, deszcz meteorów. 38 rodzin ataków i 13 rodzajów trafień (ogień, woda, lód, skała, błoto, liść, wiatr, prąd, trucizna, sen, gwiazda, pazur, cios). Trafienie „super” pokazuje **koło zodiaku**. Czas liczony zegarem, więc efekty nie „zawieszają” walki w tle karty.
- **Wejścia**: własny Orbling wylatuje z kuli (łuk ze smugą gwiazd, ładowanie, pasek „Naprzód, X!”, rozbłysk, sprężyste lądowanie); dziki pojawia się z wiru, Alfa/legenda — z ciemnieniem ekranu, aurą i wstrząsem. Omdlenie = rozpad na iskry, zwycięstwo = konfetti.

### 4.4 Łapanie
`szansa = bazowa_etapu × (1 − 0,66·HP%) × mnożnik_kuli × bonus_mini-gry × status`
- Bazowa: etap 1 = 55%, etap 2 = 32%, etap 3 = 16%. Status snu/lodu ×1,8, inne ×1,35.
- Kule: **Gwiezdna** ×1 (30 monet), **Nova** ×1,8 (120 monet), **Galaktyki** 100% (1500 monet). Brak kul w walce: zakup 5 Gwiezdnych Kul za monety (bez reklamy na ekranie walki).
- Mini-gra: kurczący się pierścień — Doskonale ×1,7 / Świetnie ×1,35 / Nieźle ×1.
- Kula chwieje się 0–3 razy (każde zachwianie z prawdopodobieństwem ∛szansy).
- Pierwsze złapanie w samouczku jest gwarantowane i dobiera gatunek kontrujący słabość startera.
- **UX 2.2**: na przycisku **Łap** widać aktualną szansę (najlepsza posiadana kula) w kolorze czerwony/żółty/zielony; od 45% przycisk pulsuje, a przez pierwsze 5 złapań pojawia się podpowiedź „Osłabiony — teraz go złap!”. W mini-grze obracający się złoty krąg docelowy i strefy Doskonale/Świetnie/Nieźle z procentem; kula leci łukiem, wsysa Orblinga, chwieje się, a sukces kończy nakładka **ZŁAPANO!** na znaku zodiaku.

### 4.5 Rozwój
- XP do następnego poziomu: `10 + 6·Poz^1,75`; XP z walki: `baza_etapu · Poz_wroga / 5` (×1,5 trenerzy); pozostali członkowie drużyny dostają 50%.
- Ewolucje na poz. 13–15 oraz 29–31 (sekwencja z błyskami).
- Ataki uczone według zestawów żywiołu i znaku; automatyczne wyposażanie (zawsze zostaje darmowy atak), ręczna zmiana w karcie Orblinga (maks. 4).
- **Ranga Trenera**: XP za walki, łapanie i zadania; co awans nagroda (co 5 rang cukierek i 2 kule Nova).

### 4.5a Obóz Gwiezdny (v2)
- **Wylęgarnia**: 1–3 inkubatory (ranga 1 / 6 / 12). Jajo wykluwa się po **5 wygranych walkach** (jaja żywiołów) lub **8** (Gwiezdne Jajo); reklama „Ogrzej” daje +2 postępu raz na jajo. Z jaja wychodzi Orbling 1. etapu na poziomie ≈ drużyny − 5 (min. 5), z wysokim potencjałem (2–3 ★) i większą szansą na lśniącego (×2, Gwiezdne ×5). Jeśli poziom na to pozwala, od razu ewoluuje.
- **Dojo**: 2–3 maty (3. od rangi 10) dla Orblingów z **przechowalni**. XP rośnie w czasie rzeczywistym: ⅓ poziomu na godzinę (+2% za rangę), limit **8 h**; odbiór w dowolnej chwili, z reklamą ×2.
- Źródła jaj: zadania główne, mistrzowie Areny, złote medale, 6. dzień kalendarza, Koło Gwiazd, sklep (2000 / 6000 monet).

### 4.5b Gwiezdna Arena (v2)
- Pływająca arena w środku mapy galaktyki. **5 lig**: Brązowa (1 pieczęć), Srebrna (2), Złota (3), Platynowa (4), Kosmiczna (6). W każdej 4 rywali i **mistrz** — pokonuje się ich po kolei.
- Pierwsza wygrana: pełna nagroda; rewanż: 30% monet i przeciwnicy +1…+4 poz. Mistrz daje puchar, cukierki i Gwiezdne Jajo. Medyk areny leczy za darmo.
- Balans (symulacje 3v3 AI kontra AI): rywale wygrywani w ~70–100% przy poziomie gracza, dla którego liga się otwiera; mistrzowie wymagają ewolucji drużyny (np. mistrz Brązu ok. poz. 15–16, Wielki Mistrz z legendą to gra końcowa — ~66% na poz. 50).

### 4.5c Medale i kalendarz (v2)
- **21 kategorii × 3 progi** (brąz/srebro/złoto): łapanie, Kodeks, lśniące, dzikie walki, trenerzy, ewolucje, poziom, pieczęcie, legendy, Arena, puchary, wylęgarnia, Dojo, okruchy, Alfy, krytyki, super ciosy, doskonałe rzuty, ranga, zadania dzienne, zarobione monety. Nagrody: 2 kl. + 150 mon. / 4 kl. + 400 mon. / 8 kl. + Gwiezdne Jajo. Odbiór w Karcie Trenera (czerwona kropka na odznace).
- **Kalendarz logowania**: 150 monet → 5 kul → mikstury + herbatka → cukierek → 3 kule Nova → Gwiezdne Jajo → 2 cukierki + 300 monkierek; cykl 7 dni, opuszczony dzień nie zeruje postępu; odbiór ×2 za reklamę.

### 4.5d Baza (2.6, przebudowa w 3.0)
- **Polana w głębi lasu**. Z tyłu ściana drzew, a przed nią kwitnący żywopłot z gwiezdnymi latarenkami (3.0; wcześniej płot z wielkich pni). Na środku nasłoneczniona polana z wydeptaną ścieżką. Stoją na niej domek na drzewie, Wylęgarnia (gniazdo pod szklanym kloszem — leżą w nim prawdziwe jaja z inkubatorów), Dojo (mata, słupek, worek — sparingują na niej uczniowie), 4 miejsca na dekoracje i rakieta. Drogowskaz po prawej prowadzi do Pracowni (4.y). W prawym dolnym rogu staw z kamieniami i liliami, przy nim źródełko. Własna, spokojna melodia (F-dur, 92 BPM) i świetliki.
- **Twoje Orblingi na polanie**: drużyna, ulubieńcy, potem najsilniejsze z przechowalni, do 16 (pracownicy są w Pracowniach, uczniowie na macie Dojo). Wędrują, odwiedzają się (35% spacerów to wizyta u kolegi, powitanie ♥/♪), siadają, drzemią. Ryby (do 4) mieszkają w stawie. Pływają spokojnym chodem, linię wody tworzy nieruchome okno przycinające, na wodzie rozchodzą się kręgi, a skok to wyskok z pluskiem i obrotem. Gracz nie wejdzie do stawu, a lądowe Orblingi go obchodzą.
- **Głaskanie**: klik w Orblinga, podejście, podskok, ♥ i gwiazdki. Raz dziennie dostaje wtedy przyjaźń (+8, serca ♥) i 10% poziomu XP (3.0). Karta pokazuje nazwę, poziom, HP, serca, ulubieńca (★) i miejsce (drużyna/przechowalnia) oraz przyciski „Szczegóły” i „Do drużyny”/„Do przechowalni”. Po rybę gracz podchodzi na brzeg po swojej stronie stawu, a ryba podpływa.
- **Omdlałe** Orblingi śpią (zamknięte oczy, „z”), dopóki gracz nie użyje źródełka, które leczy całą drużynę i budzi śpiochów.
- **Wejście**: kafelek z domkiem w HUD (w Bazie otwiera Obóz), zielony przycisk „Baza” na Mapie Gwiazd. Wyjście: rakieta (Mapa Gwiazd bieżącej wyspy) albo drogowskaz „Wróć: <strefa>”. Pierwsza wizyta: trzy dymki Pipa z wyjaśnieniem.

### 4.6 Świat

| Wyspa | Biom | Poziomy | Strefy | Strażnik |
|---|---|---|---|---|
| Słoneczna Wyspa | łąka / las | 2–9 | Koniczynowa Łąka, Szepczący Las | Fern (Ziemia) |
| Koralowa Wyspa | plaża / zatoka | 8–15 | Muszelkowy Brzeg, Koralowa Zatoka | kapitan Marina (Woda) |
| Wyspa Żaru | wulkan | 14–21 | Popielny Szlak, Magmowa Kaldera | Blaze (Ogień) |
| Mroźna Wyspa | śnieg / lodowiec | 20–27 | Dolina Zasp, Lodowcowy Szczyt | Yuki |
| Burzowa Wyspa | burzowe równiny | 26–33 | Gromowe Równiny, Niebiańska Iglica | Volt (Powietrze) |
| Wyspa Zaćmienia | zmierzch / kosmos | 32–42 | Gaj Zmierzchu, Cytadela Zaćmienia | Umbra (finał) |

**Mapa Gwiazd (2.3)** — jedna szeroka (3200 px), malowana panorama przeciągana palcem/myszą (z bezwładnością, kółkiem, strzałkami): sześć wysp z ich szlakami, połączonych gwiezdnymi mostami z lewitujących kamieni; zapieczętowane wyspy we fioletowej mgle. Pierścienie lokacji: białe/zielone (odwiedzone), żółte pulsujące (nowe), z kłódką (zamknięte), Strażnik jako portret w pinezce; pinezka z twarzą gracza przechodzi szlakiem do celu. Czarna karta miejsca: miniatura, nazwa, trudność (ŁATWE/ŚREDNIE/TRUDNE wg poziomu drużyny, BOSS, ARENA), Orblingi strefy, „Leć!”. Zwój na dole podaje nazwę wyspy w widoku i postęp. Arena wisi przy Koralowej Wyspie.

**Mapa (2.2, zastąpiona)** — dwa poziomy: *Mapa Gwiazd* (wyspy połączone świecącą, płynącą ścieżką, na etykiecie postęp łapania) i **malowana mapa wyspy** z lokacjami: pierścienie stref i Strażnika połączone kropkowaną ścieżką, znacznik „tu jesteś” z Orblingiem prowadzącym, pulsowanie nieodwiedzonych miejsc, „!” przy celach zadania, kłódka Strażnika do czasu pokonania trenerów. Karta lokacji: miniatura tła, poziomy, Orblingi strefy (złapane / widziane / nieznane), trenerzy z odhaczeniem i przycisk **Leć!**. Każda wyspa ma swój punkt orientacyjny (chatka, latarnia, wulkan z lawą, igloo i szczyt, burzowa iglica, cytadela). Przycisk Galaktyka otwiera od razu mapę bieżącej wyspy.

Każda strefa: 4–5 wędrujących dzikich Orblingów (odradzają się), 2 trenerów, Kapsuła leczenia, skrzynia, znak przejścia; strefy startowe mają statek (mapa galaktyki). Strażnik walczy dopiero po pokonaniu wszystkich trenerów wyspy. Fabuła: Zespół Zaćmienia wysysa moc gwiazd; po pokonaniu Umbry otwiera się **Obserwatorium Zodiaku**.

**Życie świata (v2)**: dzikie Orblingi reagują na zbliżającego się gracza („!”), nucą i machają (♪ ♥); 4% szans na **Alfę** — większą, złotą, o 2 poz. silniejszą (×1,3 HP, sprytne AI, ×2 monety, ×1,5 XP, trudniejsza do złapania, lepszy potencjał); po strefie pojawiają się **gwiezdne okruchy** (monety, czasem kula); pora dnia wg zegara gracza (świt / dzień / zmierzch / noc; od 3.4.1 tło jest malowane na daną porę — księżyc i gwiazdy, zachód słońca, poranna mgła, światła w oknach — a postacie zostają czytelne; nocą świetliki, spadające gwiazdy i lśniące ×2).

**Niebo nad wyspami (3.5, `src/game/weather.js`)**: każda wyspa ma pogodę, która zmienia się co 6 minut i jest taka sama dla wszystkich graczy w tej samej chwili (los z hasza wyspy i 6-minutowego okna zegara), więc da się ją przewidzieć. **Deszcz** wzmacnia ataki Wody o 25% i wywabia wodne Orblingi (×3), **burza** to samo dla Powietrza (a piorun czasem zostawia gwiezdny okruch; na Mroźnej Wyspie to śnieżyca), **upał** dla Ognia (nigdy nocą), **mgła** wywabia rzadsze gatunki i podwaja szansę na lśniące. Częstość zależy od wyspy (Wyspa Burz: burze, Wyspa Żaru: upał i popiół, Mroźna: mgła i śnieżyce, Zaćmienia: mgła). Chmury przyciemniają tylko niebo, postacie zostają czytelne. Pogoda wchodzi do walki w strefie (ikona na wzmocnionych atakach, jedno zdanie na start), widać ją na banerze strefy, na Mapie Gwiazd i na **Stacji pogody Jetta** w Bazie (ekranik, dymek „teraz › potem”, po kliknięciu prognoza dla wszystkich otwartych wysp na 3 okna). Słoneczna Wyspa ma czyste niebo do pierwszego złapania. **Spadająca gwiazda**: pierwsza po ~70–110 s chodzenia po strefach, potem co ~2,5–4 min (czas leci tylko w strefie, bez okien); spada gdzieś w strefie w krótkim biegu od gracza, w kraterze siedzi **Gwiezdny Orbling** — gatunek ze strefy o etap dalej niż zwykle (więc zawsze rzadszy), poz. strefy + 1, świetny potencjał, ×1,5 do łapania, 1/12 lśniący. Krater stygnie **60 s** (pierścień na ziemi i licznik; w pionie strzałka na krawędzi ekranu prowadzi do krateru); potem Orbling wraca na niebo. Walka z kimś innym wstrzymuje stygnięcie (krater czeka po powrocie). Testy: `?wx=rain|storm|heat|fog|clear`, `?star=1`.

### 4.6a Balans (zmierzony symulacjami)
- `node tools/sim.js` — pojedynki 1v1, `node tools/sim_teams.js` — walki 3v3 ze Strażnikami (AI kontra AI, bez przedmiotów i zmian).
- Walki trwają zwykle **2–4 tury**; różnica 2 poziomów zmienia wynik z ~50% na ~90%.
- Trenerzy mają poziom ≈ strefy − 1, **Strażnicy ≈ maks. poziom wyspy − 2**. Przy drużynie na maks. poziomie wyspy wygrywa się 70–100% walk ze Strażnikami; Mroźna Wyspa i Umbra (30–80%) wymagają kontr żywiołowych i mikstur — to celowe „ściany” uczące systemu typów.
- Pierwsze złapanie w samouczku kontruje słabość startera (np. Breezle/Powietrze → Fluffire/Ogień przeciw ziemnym Orblingom).
- Legendy: poz. 40, ×1,5 HP — wyzwanie dla drużyny z 3. etapami.

### 4.7 Zadania
- **39 zadań głównych** prowadzonych przez Pipa (złap, pokonaj, drużyna 3, trenerzy wyspy, Strażnik, poleć na wyspę, ewoluuj, kodeks, poziom, legendy, a w v2 także: wykluj jajo, wygraj na Arenie, odbierz trening w Dojo, puchary lig, medale). Stare zapisy (v1) są migrowane — indeks zadania przepinany po identyfikatorze.
- **3 zadania dzienne** losowane z puli (np. złap 3, wygraj 4 walki, zakręć kołem, zbierz 5 okruchów, 2 wygrane na Arenie — ta tylko po odblokowaniu Areny).

### 4.8 Ekonomia (2.7: jedna waluta)
| Waluta | Źródła | Wydatki |
|---|---|---|
| Monety | walki, trenerzy (×0,6 od 2.7; pierwsza wygrana pełna, rewanż 30%), Arena, okruchy, skrzynie, zadania, medale, kalendarz, koło, uwalnianie Orblingów | kule (30 / 120 / 1500), mikstury, herbatka, ożywienia, Gwiezdny cukierek (800), jaja żywiołów (2000), Gwiezdne Jajo (6000) |

Poki zaleca jedną zrozumiałą walutę i zakazuje interfejsu zakupów, więc klejnoty zniknęły w 2.7 (stare zapisy: 1 klejnot = 100 monet); nagrody, które były w klejnotach, to teraz cukierki, jaja i kule. Start: 250 monet, 5 kul, 3 mikstury. Leczenie w Kapsułach jest darmowe, a po każdej wygranej żywa drużyna odzyskuje 20% HP (mniej spacerów do Kapsuły).

### 4.9 Retencja
Kalendarz logowania, Koło Gwiazd (codziennie), zadania dzienne, skrzynie co 4 h, Dojo (trening offline do 8 h), jaja, nagrody Kodeksu (5/10/20/30/40/48 gatunków), 63 medale, 5 lig Areny, lśniące warianty (nocą ×2), Alfy, gwiazdki potencjału, **Ascendent miesiąca** (+50% XP i częstsze pojawianie się znaku zgodnego z kalendarzem — nawiązanie do comiesięcznych Mog z MG), 12 legend po zakończeniu fabuły, rewanże z trenerami.

---

## 5. Zawartość — 48 gatunków

12 linii ewolucyjnych (po jednej na znak, 3 etapy) + 12 legend:

| Znak | Etap 1 → 2 → 3 | Legenda |
|---|---|---|
| Baran | Fluffire → Blazeram → Ignaram | Chrysaries |
| Byk | Mossmoo → Bouldox → Gaiaurus | Terrataur |
| Bliźnięta | Zapsy → Twinbolt → Geminova | Castorlux |
| Rak | Clawby → Shellsnap → Moontide | Lunacrest |
| Lew | **Sunkit** → Pridefang → Solmane | Regulion |
| Panna | Budlet → Petalina → Floravelle | Spicaria |
| Waga | **Breezle** → Gustwing → Libratross | Equinyx |
| Skorpion | Stingle → Venomire → Abyssting | Antarex |
| Strzelec | Cinderfawn → Emberstag → Meteorhorn | Sagittaris |
| Koziorożec | Goatlet → Cragoat → Peakhorn | Aegoros |
| Wodnik | Nimbub → Nimbolt → Tempestar | Sadalmir |
| Ryby | **Finnip** → Koiwhirl → Pisceidon | Alreshia |

Startery (pogrubione + **Mossmoo**): jeden na żywioł. 63 ataki, w tym 12 sygnaturowych dla legend.

---

### 4.x Kolekcja i walka (2.9)
- **Rzadkość** wynika z etapu: pospolity (1. etap), rzadki (2.), epicki (3.), legendarny (legendy). Pokazywana na tabliczce przeciwnika, kolorem pierścienia kuli ŁAP, ramką w Kodeksie (z legendą kolorów) i na kartach. Szansę złapania obniża już `STAGE_RATE`.
- **Rzadki cel strefy** (`zoneRare`): spawn najwyższego etapu, a spośród nich najrzadszy. Widać go na karcie miejsca na mapie i na banerze wejścia. Gdy się pojawi, dostaje poświatę, a jeśli jeszcze nie jest złapany, pojawia się też toast.
- **Łapanie**: krąg pokazuje na żywo szansę rzutu w danej chwili (×1 / ×1,35 / ×1,7). Każda kula, z której Orbling się wyrwał, daje +15% (`e.pity`).
- **Gwiezdny pył** (osobno dla każdego znaku): duplikat daje 3 / 5 / 8 (etap 1 / 2 / 3), a uwolnienie 2 / 4 / 7. 10 pyłu podnosi każdy potencjał o 0,02 (maks. 1,12), co przekłada się na ★.
- **Nauczyciel ruchów**:
  - pierwszy atak gwiezdny każdego innego żywiołu — 1000 monet;
  - drugi atak gwiezdny każdego innego żywiołu (od poz. 17) — 3000 monet;
  - Garda, Skupienie, Kołysanka, Gwiezdne Leczenie (od poz. 10) — po 1500 monet.
- **Walka**:
  - etykieta „Super!” pojawia się przy mnożniku ≥ 1,25, a „Słabo” przy ≤ 0,8 (`BL.effMult`: żywioł, Krzepkość, Skorupa, Nieuchwytność, oparzenie);
  - gwiezdny atak trafiający w słabość zwraca 1 energii;
  - bossowie (Strażnicy, mistrzowie Areny, legendy) z szansą 30% zapowiadają turę wcześniej najmocniejszy atak ≥ 80 mocy, który trafia z +30%.
- **Cechy znaków 2.9**:
  - Duma: krytyk +20% i ×1,75;
  - Jad: 35%;
  - Bliźniacza Dusza: +1 trafienie;
  - Równowaga: −1 energii i +15% obrażeń gwiezdnych przy HP ≥ ½;
  - Przepływ: 13 energii i +1 na turę.
- **Legendy**: poziom 45, ×1,5 HP. Wymóg: Orbling znaku wyewoluowany przez gracza do 3. etapu (dla Ascendenta do 2.) albo poz. 45 (dla Ascendenta 35).
- **Sylwetki (2.9)**: plany ciała `biped` (wojownicy, chochlik, driady, rycerz), `centaur`, `twin`, `twinfish`, `genie` i `seagoat`, a do tego pozy czworonogów (`proud`, `rear`, `fly`, `titan`), `islet` (latająca wysepka), muszla-sierp, pełnia, tarcza równonocy i złota waga. Latające formy mają chód `float`.

### 4.y Baza i świat (3.0)
- **Pracownie** (`YARD`, `src/data/base.js`): druga polana Bazy — sad za płotem, 4 warsztaty, stragan Bruna, 6 miejsc na dekoracje, gość. Wejście drogowskazem z polany, powrót drogowskazem po lewej.
- **Warsztaty** (`WORKSHOPS`): pracuje jeden Orbling z przechowalni (nie w Dojo). Jednostka co `per` godzin × prędkość; prędkość = (żywioł warsztatu ? 1 : 0,6) × (1 + poz/50) × (1 + 0,06·serca) × (1 + urok). Limit 10 h, nadwyżka przepada, rozpoczęta jednostka zostaje. Ogród: jagoda / 2 h (5% cukierek); Piec: kula / 1,5 h (12% Nova); Studnia: mikstura / 2,5 h (25% herbatka); Wiatrak: 50 monet / 1 h + 1 pył znaku na 3 jednostki. Budowa: 0 / 1500 / 3000 / 5000 monet. Pracownik, który przechodzi do drużyny, najpierw oddaje plony.
- **Dekoracje** (`DECOR`): 16 za 500–8000 monet (ujście waluty z audytu) + 5 unikatów z historii. Urok = cena/100 (unikat 40); premia do warsztatów = min(30%, urok × 0,06%). Gość: w każdym 8-godzinnym oknie szansa min(75%, 25% + urok/400); gatunek z widzianych 1.–2. etapów, żywioł ważony dekoracjami (żywioł +2, uniwersalne +0,5), niezłapane ×2, poziom drużyny −1…4 (forma wg poziomu), lśniący ×2.
- **Przyjaźń**: punkty `m.fr`, serca przy 10 / 30 / 60 / 100 / 150. Głaskanie raz dziennie +8 (i 10% poziomu XP), wygrana walka +1 dla stojących, praca +1 za 3 h — te dwa razem maks. 10 dziennie. Premie: ♥1 +5% XP, ♥2 12% na koniec tury na zdjęcie złego stanu, ♥3 +5% krytyków, ♥4 12% / ♥5 20% szans na przetrwanie ciosu z 1 HP raz na walkę (♥5 też +10% XP).
- **Panel „Dziś”** (`Menus.today`): nagroda dnia, prezent powitalny (≥3 dni przerwy: 200 monet i 3 kule za dzień, od 5 dni cukierek, od 7 Gwiezdne Jajo), pierwsze złapanie dnia (+3 kule, +100 monet), zadania dzienne, Koło (szanse na ekranie Koła), stan Bazy z „Zbierz wszystko”. Otwiera się sam raz dziennie u powracającego gracza, gdy czeka nagroda.
- **Mini-historie** (`STORIES`): po pokonaniu postać ma prośbę („?” nad nią i na lewym pasku HUD): Tim — Sunkit, Rex — Koiwhirl, Jax — Orbling z ♥♥, Ivan — wyklucie jaja, Jett — 10 okruchów. Nagroda: unikatowa dekoracja + monety/jajo.
- **Nowe medale**: Prawdziwi przyjaciele (Orblingi z ♥♥♥: 1/5/15), Dekorator (dekoracje: 1/6/16). **Nowe zadania dzienne**: pogłaszcz 3 Orblingi, zbierz 4 plony (tylko gdy ktoś pracuje).
- **Języki**: `src/core/lang/*.js` (DE, ES, FR, IT, PT-BR, a od 3.0.1 TR i RU) — źródło prawdy, uzupełniane przez `tools/i18n.js`; wybór automatyczny (`pickLang`: SDK CrazyGames lub przeglądarka), lista w ustawieniach; liczba mnoga przez `Intl.PluralRules` (PL i RU mają 3 formy), separatory tysięcy wg języka. Czcionki (pełne pliki z Google Fonts) obejmują łacinę rozszerzoną i cyrylicę; logo (Lilita One) tylko łacinę 1 — napis pod logo przechodzi wtedy na Rubik.

## 6. UX i sterowanie
**Interfejs 2.3**:
- *HUD* (wygląd do 2.7; od 2.8 zob. „Własna tożsamość”): u góry po lewej rząd ciemnych, stalowych kafelków z fazą i malowanymi ikonami (twarz gracza z rangą, globus = mapa, Orbling = drużyna, wachlarz kart = Kodeks, plecak, zwój = zadania, domek = Baza); pośrodku pasek zasobów (od 2.7: monety i kule, bez „DODAJ”); po prawej zębatka ustawień, **maskotka sklepu Kramik** (złota, skrzydlata, z plakietką „SKLEP”) i Koło nagród; czerwone liczniki na kafelkach. Po lewej kolumna okrągłych portretów „kto czegoś od ciebie chce” (Pip z pierścieniem postępu zadania głównego, zwój zadań dziennych, trenerzy strefy z żółtym „!” — kliknięcie prowadzi do nich). Na dole pasek drużyny (kwadraty w kolorze żywiołu z paskiem HP).
- *Świat bez etykiet*: nazwy pojawiają się dopiero po najechaniu; nad NPC wiszą komiksowe żółte „!” (chce walczyć), niebieskie „?” (rada) i niebieska kłódka (zapieczętowany Strażnik); wyjścia mają pomarańczową, pulsującą strzałkę. Wejście do strefy — wjeżdżający pas z nazwą.
- *Ruch*: gracz przyspiesza i hamuje (sterowanie „arrive”), obraca się jak papierowa wycinanka, kołysze w rytm kroków i wzbija kurz; Pip przechyla się w locie. Orblingi mają **chody zależne od budowy** (czworonogi kłusują, jajowate i ptaki skaczą z przysiadem przy lądowaniu, kraby drobią bokiem, skorpiony biegają, węże pełzają falą, ryby i chmurki szybują) oraz małe czynności między spacerami: rozglądanie się, podskok, siadanie, węszenie, wiercenie, drzemka („z”), zaciekawione podchodzenie albo płochliwe odchodzenie od gracza.
- *Dialogi*: kinowe pasy, wielki portret mówiącego (cienkie kontury), biały komiksowy dymek z ogonkiem, odręczne pismo, zielona strzałka „dalej” i przycisk „Pomiń”; HUD chowa się na czas rozmowy.
- **Własna tożsamość (2.8)** — własne sygnatury interfejsu: kafelki HUD to okrągłe „planety” z orbitą przy najechaniu, pasek zasobów to pigułka, sloty drużyny zaokrąglone; sklep Kramik to pływający kramik z pasiastą markizą na chmurce (podpis „SKLEP” pod spodem); panel walki opisany niżej.
- *Walka (2.8)*: gwiezdny pokład z kulą **ŁAP** przebijającą górną krawędź (pierścień szansy czerwony/żółty/zielony, krążąca gwiazdka; w walkach z trenerami gwiazda i „Twój ruch”), ataki jako zaokrąglone karty w kolorze żywiołu („Super!”/„Słabo” zamiast strzałek, pusty slot: „Nowy atak na poz. X”), okrągłe przyciski Przedmioty/Ucieczka, okrągły portret w złotym pierścieniu, zaokrąglone paski HP, energia jako kropki. W pionie: arena u góry (przeciwnik dalej po prawej, Twój bliżej po lewej, podpisy w rogach, tło powiększone ku górze), pod kciukiem siatka: dziennik, 4 duże karty, „plecak – ŁAP – ucieczka”, drużyna; plansza VS dzieli ekran w poziomie.
- *Walka (2.3–2.7)*: obie strony na jednej linii ziemi (bez podestów), nad nimi same podpisy: glif znaku, nazwa pogrubioną kursywą, ukośny limonkowy pasek HP z liczbami, poziom, żywioł, energia jako romby; na dole ośmiokątny portret aktywnego Orblinga na tle w kolorze żywiołu z promieniami, pasek drużyny (klik = zmiana), dziennik walki, **cztery ukośne paski ataków** wokół tarczy „TWOJA TURA” — w dzikich walkach środek tarczy to przycisk **ŁAP** z bieżącą szansą (czerwony/żółty/zielony, pulsuje od 45%), obok turkusowe „PRZEDMIOTY” i szare „UCIEKAJ”.
- *Menu*: granatowe panele z gwiazdami i słabym kołem zodiaku, cienka neonowa rama (kolor wg kontekstu), kursywne białe tytuły, białe okrągłe „X”; karty Orblingów w nasyconych kolorach żywiołów z malowanym zawijasem; wszystkie listy i kafle ciemne.
- *Czcionki* (OFL, osadzone): Rubik (UI, pogrubiona kursywa z obrysem), Pangolin (dymki), Lilita One (logo).

- Rozdzielczość logiczna 1280×720 skalowana do okna (letterbox). **Od 2.8 w pionie** (ekran wyższy niż szerszy): scena 540 px szerokości, wysokość wg ekranu (880–1300), świat i arena w oknie „stage16” (1280×720 przesuwane transformacją, warstwa efektów podąża za nim), własne układy HUD, walki, menu, tytułu, łąki, mapy i Areny (CSS pod `#game.port`); obrót telefonu przestawia bieżącą scenę (`layout()`).
- **Mysz/dotyk**: klik w ziemię = chodzenie, klik w Orblinga/NPC/obiekt = podejście i akcja.
- **Klawiatura**: WASD/strzałki — ruch, Spacja/E/Enter — interakcja; w walce 1–4 ataki, C — łapanie.
- HUD w stylu gier z Facebooka: odznaka trenera + ranga (kropka = medale do odebrania), tracker zadania z Pipem, waluty z „+” do sklepu, podgląd drużyny, dok z 8 przyciskami (Drużyna, Kodeks, Plecak, Zadania, **Obóz**, Sklep, Koło, Galaktyka), znacznik nocy przy nazwie strefy.
- Otwarcie (3.1): prolog ~11 s (koło zodiaku → Zaćmienie → cienisty wąż kontra słoneczny lew → złapanie Gwiezdną Kulą → logo; bez kliknięć, „Pomiń” od 1. sekundy, nie jest rozgrywką dla SDK) → Gwiezdny Ołtarz nocą: dialog Vegi i Pipa (sam się przewija), cztery gwiazdy-kule otwierają się na piedestałach, wybór w snopie światła z kartą i gwiazdkami statystyk → spada kolejna gwiazda, z krateru wyskakuje pierwszy dziki Orbling (przeciwnik, na którego starter ma przewagę) → walka samouczkowa na nocnym tle (podpowiedzi, pewne złapanie) → łąka. Prolog tylko raz (ustawienie `seenIntro`) i przy „Nowej grze”.
- Samouczek awaryjny (odświeżenie strony w trakcie pierwszej walki): do pierwszego złapania łąka ma **jeden cel**: nad Orblingiem duża żółta strzałka, pod nim pulsujący krąg; bez strzałek wyjść, „!”/„?” nad postaciami i błysku skrzyni; inne dzikie Orblingi daleko i nigdy tego samego gatunku. Inny Orbling, trener czy profesor odsyłają do tego „pod strzałką”, a po 12 s bezczynności Pip przypomina (3.0.2).
- Ustawienia: muzyka, dźwięki, szybkie walki, drżenie ekranu, **lekka grafika** (2.8; domyślnie wykrywana), język, pomoc (tabela znaków), reset. W walce: AUTO i ×2.
- **Tryb lekki (2.8)**: 3 zamiast 6 klatek pętli i ruchu Orblingów oraz 4 zamiast 8 klatek chodu (podzbiór, więc pamięć podręczna obrazków pasuje), o połowę mniej cząsteczek, bez rozmytego tła i cieni na animowanych obrazkach; włącza się przy ≤2 rdzeniach / ≤2 GB pamięci albo gdy >40% ze 150 pierwszych klatek trwa ponad 45 ms. Malowanie tła wstrzymane w walce i podczas reklam (dla wszystkich).
- Przejście do walki: ukośne pasy (zamiast zwykłego wygaszenia).
- Etykiety dzikich (2.2): nazwa, poziom i znaczek **NOWY** dla niezłapanego gatunku (inaczej kropka), po najechaniu „Dziki · kliknij, by walczyć i złapać”; ten sam gatunek rzadziej pojawia się kilka razy naraz (waga ÷4 za każdą kopię na ekranie). Różne poziomy tego samego gatunku to losowanie z zakresu strefy.
- **Kodeks (2.2)**: czarny, „kosmiczny” ekran; wiersze wg znaków zodiaku z czerwonymi glifami, nieznane Orblingi jako duchy, widziane jako świecące sylwetki, członkowie drużyny w niebieskiej ramce; w szczegółach znak zodiaku jako znak wodny.

## 7. Grafika i dźwięk
- **Zero plików graficznych**: potwory, postacie, tła 12 biomów, rekwizyty, ikony i wyspy są generowane jako SVG z parametrów (typ ciała + uszy/rogi/grzebień/ogon/skrzydła/wzór/twarz).
- **Oprawa „malowana” (2.1)** :
  - *Tła* (`src/art/scenery.js`) malowane warstwami z perspektywą powietrzną: niebo z poświatą słońca/księżyca, kłębiaste chmury (cień u podstawy, oświetlone szczyty, miękkie krawędzie), łańcuchy gór ze ścianami w świetle i w cieniu, śniegiem i mgłą w dolinach, pagórki z gajami drzew, wiatrak i chatka, płaskowyże, klify z warstwami skał, latające wyspy z wodospadami, kryształy lodu, zorza, rzeki lawy; na ziemi plamy światła i cienia chmur, kępy kwiatów, wydeptana ścieżka, kamienie, kałuże pływowe; na końcu promienie światła, ciepło-zimna korekta barw, winieta i ziarno płótna. Każde tło jest raz na sesję „wypiekane” do bitmapy (`WArt.bake`) podczas zaciemnienia przejścia — gra nie traci płynności.
  - *Rekwizyty* (`src/art/props.js`) malowane bez linii i obwiedzione jednym kolorowym konturem (filtr dilate) — pasują do teł, a nadal czytelnie odróżniają się od nich.
  - *Orblingi*: matowe cieniowanie zamiast „gumowego” połysku — dwa półksiężyce cienia (miękki terminator), ciepłe światło odbite od ziemi, delikatny połysk, pociągnięcia futra, brzuszki z futrzaną krawędzią, kolorowe (nie czarne) kontury z pogrubieniem po stronie cienia, duże oczy z refleksami.
  - *Walka*: malowane owalne podesty pod walczącymi (trawa, piasek, śnieg, popiół z lawą, posadzka ruin, murawa Areny).
  - *Mapa galaktyki i ekran tytułowy*: mgławice, pas galaktyki, planety z pierścieniem; wyspy z erodowaną skałą, korzeniami, kryształami i dioramą biomu.
- **Malowana grafika (2.4)** — moduł `painter.js`: rysunek wektorowy jest rasteryzowany ×2 i przemalowywany pociągnięciami pędzla (kierunek wzdłuż formy wg gradientu jasności, kolor z rysunku przesunięty ku ciepłu w światłach i ku chłodnemu fioletowi w cieniach, trzy przejścia: szerokie → drobne), kontury i oczy wracają ostre, na wierzch faktura płótna, miękkie światło z lewej-góry, chłodny cień z prawej-dołu i ciemny barwny tusz wokół sylwetki (grubszy po stronie cienia). Losowość pociągnięć zależy od pozycji na płótnie, więc klatki animacji nie „gotują się”. Działa w Web Workerze (OffscreenCanvas), wyniki trafiają do pamięci i IndexedDB; do czasu namalowania widać wersję wektorową, a obrazki podmieniają się same. Malowane są: Orblingi (małe i duże do walki, klatki chodu, mrugnięcia), postacie (w świecie i duże portrety do dialogów), przedmioty, ikony HUD, maskotka sklepu, Pip.
- **Chód (2.4)** — postacie mają szkielet biodro→kolano→kostka i bark→łokieć→dłoń; 8 kluczowych klatek cyklu (kontakt, przysiad, przejście, wybicie) interpolowanych splajnem, nogi przesunięte o pół cyklu, ręce przeciwnie do nóg, stopa przetacza się z pięty na palce, miednica opada tam, gdzie stoi niższa stopa (naturalne kołysanie), płaszcze i sukienki falują, przedmioty jadą w dłoni. Cykl postępuje o przebytą drogę (a nie czas), więc stopy nie ślizgają się; kurz przy każdym kroku. Czworonogi kłusują parami po przekątnej (6 klatek), kraby i skorpiony przebierają nogami; wszyscy mrugają co kilka sekund, gracz w bezruchu oddycha.
- **Animacja Orblingów (2.5)** — generator rysuje pozy z dwóch faz: *spoczynkowej* (ruch drugiego planu: migotanie płomieni, kołysanie ogonów, trzepot skrzydeł — wróżek szybszy, bujanie czułek, skrzeli, pióropuszy i pąków z opóźnieniem, wiosłowanie płetw, „oddychające” kłęby chmurek z falą biegnącą dookoła, falowanie węża, obrót gwiazdek aury, pulsowanie iskier lśniących) i *ruchu* zależnej od budowy (czworonogi: kłus parami po przekątnej; kraby i skorpiony: naprzemienne odnóża, kołysanie ogona i szczypiec; jajowate i okrągłe: skok w 6 klatkach — przysiad, wybicie z nogami w dół i rękami w górę, wznoszenie, szczyt z podkurczonymi nogami, opadanie, lądowanie z szeroko rozstawionymi stopami; pąki i czułki podążają z opóźnieniem, płatki spódniczek rozchylają się w locie; ptaki: skrzydło rozkładane w locie, nogi chowane; ryby: ogon i płetwy; chmurki: dryf; węże: fala przez całe ciało). Każdy Orbling ma 6 klatek pętli, 6 klatek ruchu i mrugnięcie (zamknięte powieki; groźne oczy zamykają się prostą, ukośną kreską). W świecie pętla gra ~5 kl./s z mrugnięciem przy przejściu przez klatkę 0; skoki wybierają klatkę wg fazy skoku (także przy spłoszonym podskoku); śpiące mają zamknięte oczy. W walce duże (600 px) pętle i mrugnięcia. Malowanie: pula do 3 workerów, kolejność ważności (poza spoczynkowa → ruch → pętla → mrugnięcie), cała wyspa malowana w tle.
- **Klimat (2.2)**: granatowe panele z gwiezdnym tłem i złotą, podwójną ramką, narożniki ✦, kursywne wstęgi tytułów, pomarańczowe okrągłe „X”, szklane przyciski-pigułki, karty walki z pochylonymi paskami HP, ciemny panel walki z gwiazdami.
- **Postacie (2.2)**: 5 sylwetek (dziecko, zwykła, wysoka, krępa, starsza), gatunki: człowiek, kot (uszy, pyszczek, wąsy, ogon), robot (wizjer, antena); 12 strojów (sukienka, szata, płaszcz, fartuch, zbroja, ogrodniczki, garnitur, marynarski, kurtka, kamizelka, pianka…), plecak, 10 przedmiotów w dłoni (laska, wędka, siatka, księga, latarnia, miecz, pochodnia, klucz, kostur, kolba), twarze (5 typów oczu, brwi, usta, wąsy, broda), 14 nakryć głowy (fez, kapitańska, tiara, hełm rycerski…). Każda klasa trenera ma własny wygląd, a osobnicy różnią się sylwetką, karnacją i detalami.
- Animacje: mruganie, migotanie płomieni, falowanie ogonów, oddech, efekty ataków (moduł `fx.js`: ok. 40 rodzin animacji z cząsteczek DOM + WAAPI), cząsteczki biomów (płatki, śnieg, żar, świetliki…), nakładki statusów, poświata Alf, noc z gwiazdami.
- Nowe grafiki v2: stadion Areny, wyspa-arena na mapie, 5 jaj, okruch, puchary lig, medale, 17 nowych ikon.
- **Dźwięk**: syntezowane efekty WebAudio (w v2 m.in. grzmot, lód, trzęsienie, VS, medal, wykluwanie, okruch) + 8 zapętlonych chiptune'ów (tytuł, eksploracja, walka, boss, galaktyka, noc, arena, **Ołtarz**) i jednorazowy utwór prologu zgrany z filmem (3.1: dołącza we właściwym takcie, gdy dźwięk włączy się dopiero po dotknięciu).

## 8. Integracja z portalami i monetyzacja

| Zdarzenie | Poki SDK v2 | CrazyGames SDK v3 |
|---|---|---|
| Koniec ładowania | `gameLoadingFinished()` | `game.loadingStop()` |
| Gra aktywna / pauza | `gameplayStart/Stop()` | `game.gameplayStart/Stop()` |
| Przerwa naturalna | `commercialBreak()` | `ad.requestAd('midgame')` |
| Reklama nagradzana | `rewardedBreak()` | `ad.requestAd('rewarded')` |
| Zapis | localStorage | **Data module** (chmura dla zalogowanych) |
| Wielki moment | — | `game.happytime()` (Strażnik, legenda) |

**Przerywniki** (`Platform.naturalBreak`): nigdy w pierwszych 4 minutach ani przed końcem samouczka; na Poki po każdej wygranej walce i locie między wyspami (portal sam decyduje), na CrazyGames tylko przy dużych przejściach (trenerzy, Strażnicy, Arena, lot na inną wyspę); nigdy po porażce.
**Reklamy nagradzane** (zawsze opcjonalne; przycisk z 🎬, nigdy zielony, obok zwykłej opcji co najmniej tej samej wielkości): „×2 XP drużyny” po trenerach, Strażnikach, Arenie i legendach; ożywienie drużyny po porażce (raz na sesję); dodatkowe obroty koła (2/dzień); darmowy cukierek w sklepie (3/dzień); ×2 nagroda z kalendarza; ×2 XP z Dojo; „Ogrzej” jajo (+2 postępu). Żadnej oferty reklamy na ekranie walki.
Podczas reklamy dźwięk jest wyciszany, a rozgrywka wstrzymana. Brak linków zewnętrznych, brak własnych reklam, brak zewnętrznych zasobów (poza skryptem SDK). CrazyGames: respektowane `settings.muteAudio`.

## 9. Architektura
Czysty JavaScript (bez frameworka), klasyczne skrypty współdzielące globalne moduły; build łączy je w jeden plik.

```
src/core   util, i18n (EN/PL), platform (SDK), audio (WebAudio)
src/data   elements (znaki/żywioły), moves, species, items, world (wyspy, trenerzy, zadania), arena (ligi)
src/art    paint (paleta i cieniowanie), scenery (malowane tła + podesty walki), props (rekwizyty), monster_art (proceduralne potwory), world_art (wypiekanie teł, postacie, wyspy, mapy wysp, ikony), fx (API efektów walki), vfx (silnik cząsteczek canvas)
src/game   state (zapis v2 + migracja), quests, camp (jaja, Dojo), meta (medale, kalendarz), weather (pogoda i spadające gwiazdy), battle_logic
src/ui     ui (skalowanie, modale, dialogi, HUD, przejścia), menus, menus_meta (Obóz, medale, kalendarz, puchary)
src/scenes title, prologue, intro (Gwiezdny Ołtarz), explore, battle, galaxy, arena
tools      build.js, check.js (i18n+dane), smoke.js (testy logiki), artcheck.js (render całej grafiki), shot.js (zrzuty scen w Chrome headless), sim.js / sim_teams.js (balans), gallery.html, world.html
```

## 10. Checklista przed wysyłką na portal
- [ ] `node tools/check.js` i `node tools/build.js` bez błędów
- [ ] Test w **Poki Inspector** (developers.poki.com) — zdarzenia SDK, reklamy, wyciszanie
- [ ] Test w **CrazyGames QA tool** — SDK v3, zapis Data module, basic → full launch
- [ ] Mobile: Chrome Android + Safari iOS w poziomie, dotyk, dźwięk po przerwaniu
- [ ] Brak błędów w konsoli, gra działa z adblockiem (reklamy zwracają błąd → gra toczy się dalej)
- [ ] Miniatury/okładki: 512×512, 1280×720, GIF/wideo z rozgrywki (portale tego wymagają)
- [ ] Sprawdzenie znaku towarowego nazwy przed premierą

## 11. Roadmapa
- ✅ **3.5** (zrobione) — „Niebo nad wyspami”: pogoda na wyspach (deszcz, burza, upał, mgła) z wpływem na walkę i spawny, prognoza na Stacji pogody Jetta i Mapie Gwiazd, spadające gwiazdy z rzadkim Orblingiem w stygnącym kraterze.
- ✅ **2.0** (zrobione) — efekty walki, AUTO/×2, Arena (5 lig), Obóz (jaja + Dojo), 63 medale, kalendarz logowania, Alfy, okruchy, pora dnia, VS, panel awansu, nowe zadania, muzyka Areny.
- ✅ **2.1** (zrobione) — malowana oprawa: nowe tła 12 biomów i stadionu, rekwizyty, cieniowanie Orblingów, podesty walki, mapa galaktyki, postacie.
- ✅ **3.1** (zrobione) — „Gwiezdny początek”: epickie otwarcie — prolog-film, Gwiezdny Ołtarz z dialogiem i wyborem startera w snopie światła, od razu pierwsza walka na nocnym tle, nowy ekran tytułowy (key art z legendami), zgodnie z zasadami Poki i CrazyGames (bez kliknięć przed grą, pomijalne, `gameplayStart` dopiero przy interakcji, lejek analityki).
- ✅ **3.0** (zrobione) — „Baza i świat”: Pracownie (4 warsztaty z pracownikami z przechowalni, plony do 10 h, zbiór jednym kliknięciem), żywa Wylęgarnia i Dojo, dekoracje (16 w sklepie Bruna + 5 unikatów) z urokiem i gośćmi, przyjaźń (0–5 serc, premie w walce), panel „Dziś” (nagroda dnia, prezent po nieobecności, pierwsze złapanie, zadania, Koło z szansami, stan Bazy), mini-historie 5 postaci, budowniczy Bruno, 5 nowych języków, żywopłot zamiast płotu z pni, profesor Vega.
- ✅ **2.9** (zrobione) — „Kolekcja i walka”: nowe sylwetki 12 form końcowych i 12 legend (dwunożne, centaur, bliźnięta, koi, dżin, morski koziorożec, latające, pozy czworonogów), rzadkość (tabliczka, kula ŁAP, Kodeks, karty) i rzadki cel strefy, bonus mini-gry na żywo i łagodzenie pecha, gwiezdny pył z duplikatów (potencjał ★), nauczyciel ruchów (ujście monet), etykieta skuteczności z cechami, mocniejsze pierwsze ataki gwiezdne i zwrot energii za słabość, osłabione darmowe ataki późnej gry, atak pokrycia na poz. 7, ataki znaku zamiast Doładowania, wzmocnione słabe linie, zapowiedzi bossów, legendy poz. 45 z wymogiem własnej ewolucji, łagodniejszy Orion i Umbra, poziomy dzikich zgodne z etapem, Dojo ×2, ławka 75% XP.
- ✅ **2.8** (zrobione) — „Telefon i własna twarz”: pełny tryb pionowy (scena 540×wysokość ekranu, okno świata/areny z kamerą, pionowe układy walki, menu, tytułu, łąki, mapy i Areny, obrót bez utraty stanu), własna tożsamość UI (panel walki z kulą ŁAP i pierścieniem szansy, kafelki-planety, kramik na chmurce, zaokrąglone paski), tryb lekki dla słabszych urządzeń, wstrzymanie malowania tła w walce i reklamach.
- ✅ **2.7** (zrobione) — „Pierwsze 3 minuty”: start od razu na łące ze starterami w trawie, samouczek bez okien, stopniowy HUD i przypięty cel, jedna waluta, reklamy zgodne z regułami portali, zadania bez blokad (prośby Pipa), ligi Areny przy wyspach, +20% HP po wygranej, `poki_ignore`, analityka, poprawka przewijania. Dalej: 2.8 telefon i własna tożsamość UI, 2.9 kolekcja i walka, 3.0 Baza i świat.
- ✅ **2.6** (zrobione) — Baza: polana z domkiem na drzewie, płotem z pni i stawem, po której chodzą wszystkie Orblingi gracza (wizyty, głaskanie za XP, karta z przenoszeniem, ryby w stawie, śpiące omdlałe, źródełko, krzak jagód); dymki nad głową mierzone z obrazka, priorytety malowania.
- ✅ **2.5** (zrobione) — pełna animacja klatkowa Orblingów: pętle spoczynkowe z ruchem drugiego planu i cykle ruchu dla każdego typu ciała (skok, lot, pływanie, dryf, pełzanie, kłus, przebieranie nóg), mruganie powiekami, duże pętle w walce, pula workerów.
- ✅ **2.4** (zrobione) — malowana grafika postaci, Orblingów, przedmiotów i ikon (Painter w workerze + cache), nowy szkielet i cykl chodu postaci, cykle nóg Orblingów, mruganie, szkliste znaczki żywiołów i znaków.
- ✅ **2.3** (zrobione) — nowy interfejs: HUD z kafelkami i maskotką sklepu, portrety zadań, świat bez etykiet, komiksowe dialogi, nowy układ walki, nowa Mapa Gwiazd (panorama), fizyczny ruch i chody Orblingów, osadzone fonty.
- ✅ **2.2** (zrobione) — nowy klimat: UI granat+złoto, silnik efektów canvas, epickie wejścia, czytelne łapanie (szansa %, mini-gra, ZŁAPANO!), mroczny Kodeks, różnorodne postacie, mapy wysp z lokacjami.
- **2.3** — czytelniejszy Obóz (cele i podpowiedzi), więcej stref na wyspę, wydarzenia sezonowe (np. Halloween — upiorne warianty), sklep kosmetyczny dla awatara (stroje za medale).
- **2.4** — asynchroniczne PvP (drużyny innych graczy jako boty na Arenie), tabela wyników (CrazyGames user module), zaproszenia znajomych.
- **2.5** — drugi żywioł (hybrydy), dodatkowe linie ewolucyjne, ekspedycje offline (Orblingi zbierają monety pod nieobecność gracza).
- Opcjonalnie IAP na CrazyGames (Xsolla) — tylko kosmetyka/wygoda, bez pay-to-win.
