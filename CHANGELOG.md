# Historia zmian

**Wersja 3.5 — „Niebo nad wyspami”: pogoda i spadające gwiazdy.** Orblingi rodzą się ze spadających gwiazd, a teraz
widać to w samym świecie. Co kilka minut chodzenia po strefach przez niebo przelatuje gwiazda i spada gdzieś w strefie:
huk, wstrząs, w kraterze siedzi **Gwiezdny Orbling** — gatunek tej strefy o etap dalej niż zwykle (zawsze rzadszy), poziom
strefy + 1, świetny potencjał i ×1,5 do łapania (1/12 lśniący). Krater stygnie 60 s — pierścień na ziemi się skraca, pod
Orblingiem odlicza licznik, a w pionie na krawędzi ekranu pokazuje się strzałka do krateru (stuknięcie = biegnij). Gdy
ostygnie, Orbling wraca na niebo jako światło. Walka z innym Orblingiem wstrzymuje stygnięcie. Grafika spadającej gwiazdy
i krateru jak na Gwiezdnym Ołtarzu, żadnego nowego ekranu.
- **Pogoda na wyspach** (`src/game/weather.js`, `weather.css`): deszcz (ataki Wody +25%, wodne Orblingi ×3), burza (Powietrze;
  błyski i grzmoty, piorun czasem zostawia gwiezdny okruch; na Mroźnej Wyspie śnieżyca), upał (Ogień; nigdy nocą), mgła
  (rzadsze gatunki ×3, lśniące ×2). Zmienia się co 6 minut, w tej samej chwili jest taka sama u wszystkich, każda wyspa
  ma własne prawdopodobieństwa. Chmury przyciemniają tylko niebo — postacie i Orblingi zostają czytelne. Gdy pogoda zmienia
  się w trakcie, Pip mówi jedno zdanie w dymku.
- **Pogoda w walce**: walka w strefie ma ten sam deszcz/śnieg/mgłę, wzmocnione ataki mają ikonkę pogody, a pierwsza walka w
  danej pogodzie mówi w jednym zdaniu, co robi. Arena, legendy i Ołtarz bez pogody.
- **Stacja pogody Jetta naprawdę prognozuje**: ekranik pokazuje pogodę na wyspie, z której przyszedłeś, dymek „teraz › potem”,
  a kliknięcie otwiera kartę z prognozą dla wszystkich otwartych wysp na trzy okna (i przycisk zmiany dekoracji).
- Pogoda na banerze strefy i ikona nad wyspą na Mapie Gwiazd. Słoneczna Wyspa ma czyste niebo do pierwszego złapania.
- Testy: `?wx=rain|storm|heat|fog|clear` wymusza pogodę, `?star=1` zrzuca gwiazdę po kilku sekundach; `tools/smoke.js` sprawdza
  prognozę, mnożnik obrażeń, Gwiezdne Orblingi i odstępy między gwiazdami. Zapis bez zmian (nowy licznik `stats.starborn`).

**Wersja 3.4.1 — pora dnia bez „przyciemnionego ekranu”.** Świt (5–8), zmierzch (18–21) i noc (21–5) były
półprzezroczystą płachtą na całej scenie: postacie, Orblingi i drzewa szarzały, a HUD zostawał jasny — wyglądało to jak
błąd. Teraz tło strefy jest malowane na daną porę raz, przy wypalaniu (`Scenery` → TIME OF DAY): niebo dostaje własne
kolory (nocą księżyc w miejscu słońca i gwiazdy, wieczorem zachód, rano różowy świt z mgłą), ląd przechodzi przez
gradację kolorów w filtrze SVG (cienie w granat/fiolet, światła zostają jasne), a okna, latarenki i lawa świecą na
wierzchu. Postacie i Orblingi dostają tylko lekki filtr CSS (`--tod-f`), więc są czytelne; nocą płatki zamieniają się w
świetliki, a nad otwartym niebem co jakiś czas przelatuje spadająca gwiazda. Walki w strefie mają tło o tej samej porze.
Wyspa Zaćmienia, Arena i Ołtarz bez zmian. Podgląd wszystkich teł: `tools/world.html?m=bg&t=night` (`dawn`, `dusk`).

**Wersja 3.4 — „Gotowa na Poki”** — wszystko, co ocena pod kątem Poki wskazała jako ryzyko, poprawione.
- **Nowa nazwa: Orbling Skies.** Nowe logo (bez naklejki „Gwiezdne Wyspy”), ekran ładowania, tytuł strony, okładki i pliki zip. Zmienione też
  niektóre nazwy: budowniczy **Bruno → Rudi**, **Kula Nova → Kula Meteoru**, **Cytadela
  Zaćmienia → Twierdza Zaćmienia**, a przycisk mapy w HUD nazywa się jak sama mapa: **Mapa Gwiazd** — we wszystkich
  9 językach. Zapis graczy się nie zmienia (te same klucze).
- **Przycisk Poki na telefonie.** Poki kładzie na grze w lewym górnym rogu swój przycisk powrotu (62×46 px, 24 px od
  góry; 92×64 na ekranach ≥1211 px). Gra rezerwuje ten róg na Poki na telefonach i tabletach (`UI.pillZone`, klasa
  `#game.pk-pill`, zmienne `--pl`/`--pb`): kafelki HUD, monety, przycisk „wstecz” stron menu, tabliczka dzikiego Orblinga w
  walce i okienka odsuwają się spod niego. Test na dowolnym buildzie: `?pill=1`.
- **Szybsze wejście.** Prolog trwa ~6,5 s zamiast ~11 s (te same ujęcia w szybszym montażu, muzyka 140 bpm, bez napisów
  poza ostatnim), a na Gwiezdnym Ołtarzu nie ma już dialogu do przeklikania: Pip mówi jedno zdanie w dymku, kule gwiazd
  otwierają się od razu. Wybór partnera jest dostępny ok. **10 s** od otwarcia strony (wcześniej ~23 s). Powracający
  gracz trafia **od razu do świata** — bez ekranu tytułowego (nowa gra: Ustawienia → Resetuj postęp); jego strefa,
  wygląd, drużyna i dzikie Orblingi malują się pod paskiem ładowania, więc po nim nie ma czarnego ekranu.
- **Mniej okienek.** Nowy komponent „wiwat” (`UI.cheer`): karta z kolorową tabliczką i nagrodami jako plakietkami, która
  sama przychodzi i znika (monety lecą do licznika). Zadania wykonane, awans rangi, wygrana z dzikim Orblingiem, prezent
  powitalny i nagroda dzienna już nie zatrzymują gry okienkiem z OK. Złapany Orbling pokazuje łup walki na swojej
  odsłonie (jedno OK zamiast trzech). Nagroda dzienna dla powracającego to jedno małe okienko (Odbierz / 🎬 ×2), nie cała
  strona „Dziś”. Po pierwszym złapaniu Pip mówi jedno zdanie w dymku zamiast dwuczęściowego dialogu. Wiwaty czekają, aż
  zamknie się okno, skończy dialog albo zniknie nazwa strefy — nic nie ląduje na niczym.
- **Czytelność.** Najmniejszy tekst w całej grze to 17 px sceny (wcześniej 11–15): ~11 px na ekranie w typowej ramce Poki
  na laptopie (836×470) i na telefonie 360 px. Panel walki w poziomie jest wyższy (przyciski ataków 48 px, większe nazwy,
  podpisy „Przedmioty/Uciekaj” już się nie nakładają), długie nazwy ataków, przedmiotów i medali łamią się na dwie linie
  zamiast się ucinać, okno ustawień i edytor wyglądu mieszczą się na telefonie (przycisk „Zapisz” zawsze widoczny).
- **Materiały dla portali** (`promo/`): miniatura Poki bez tekstu (`poki-thumbnail-1080.png`, `-628.png`), animowana
  miniatura Poki (`poki-animated-1080.mp4`: 1080×1080, 60 kl./s, 5 s, H.264, bez dźwięku — Sunkit na latającej wysepce,
  Gwiezdna Kula łapie dzikiego Zapsy'ego) oraz okładki CrazyGames z nowym logo (1920×1080, 800×1200, 800×800, 1280×720,
  512×512). Wszystko z grafiki gry: `tools/keyart.html` + `tools/keyart_shots.js` + `tools/keyart_video.py`.
- **Zgłoszenie do Poki:** `docs/poki_zgloszenie.md` — gotowe teksty (EN), sterowanie, lista wymagań z dowodami, plan
  playtestów i wskaźniki do obserwowania, oświadczenie o AI, mapa rozwoju i uwaga o wyłączności.
- Narzędzia: `tools/audit.js` (audyt układu w przeglądarce: tekst poniżej progu, ucięte napisy, tekst na tekście, UI pod
  przyciskiem Poki, UI poza sceną — dwie trasy po wszystkich ekranach), `tools/typescale.js` (próg wielkości tekstu).

**Wersja 3.3 — „Obłok”** — menu zaprojektowane od nowa jako całość, nie tylko nowa skórka. Duże menu to teraz
pełnoekranowe strony (`UI.sheet`, `screens.css`) na jasnym niebie: pasek z przyciskiem „wstecz” i tytułem, jeden
główny punkt na stronę (zwykle sam Orbling, duży) i treść rozłożona tak, by nic nie leżało na niczym.
- **Drużyna.** Scena zamiast kafelków: lider pośrodku, dwóch pozostałych po bokach, każdy stoi na własnej latającej
  wysepce w kolorze żywiołu (murawa i skalny spód, wysepka lekko się unosi). Ewolucje są wyższe, ale każda mieści się
  w kadrze. Pod sceną Przechowalnia: nazwa i sortowanie (poziom / najnowsze / znak) siedzą na jej krawędzi.
- **Karta Orblinga.** Po lewej Orbling na wysepce z poświatą żywiołu (stuknięcie: podskok i okrzyk), imię, znak,
  żywioł, rzadkość, serduszka i gwiazdka ulubieńca. Po prawej karta z poziomem, XP i HP zawsze na wierzchu i trzema
  zakładkami: **Statystyki** (gwiazda pięciu statystyk: kształt to budowa gatunku z potencjałem, liczby to wartości
  teraz; cecha znaku, potencjał z gwiezdnym pyłem, przyjaźń), **Ataki** (duże karty ruchów z kosztem, mocą i efektem,
  zaznaczone te do walki, nauczyciel ruchów) i **Ewolucja** (cała linia, poziom następnej ewolucji z paskiem,
  cukierek). Pod kartą tylko akcje, które mają teraz sens; „Uwolnij” stoi osobno po lewej. Strzałki w pasku (i
  klawisze ← →) przełączają Orblingi w kolejności strony, z której przyszliśmy.
- **Wielkie chwile.** Złapanie, wyklucie i ewolucja to jedna pełnoekranowa scena w kolorze żywiołu: promienie, baner
  („Złapany!”, „Wykluwanie!”, „Ewolucja!”), naklejka NOWY!, Orbling wyskakuje na wysepkę, potem imię, znak, żywioł,
  rzadkość, potencjał i poziom, a na końcu przycisk. Jajo chwieje się i pęka na wysepce (tło przybiera kolor Orblinga
  dopiero, gdy wyjdzie), a ewolucja miga białą sylwetką starej i nowej formy coraz szybciej.
- **Karta Trenera** — trener na wysepce, ranga z paskiem XP, Medale i zmiana wyglądu; obok licencja: sześć dużych
  liczb z ikonami, Gwiezdne Pieczęcie, puchary Areny i Ascendent miesiąca.
- **Kodeks** — koło zodiaku: dwanaście znaków wokół licznika złapanych (każdy znak z kropkami postępu swojej linii),
  obok linia wybranego znaku (cztery duże karty i wpis wybranego Orblinga), a nagrody kolekcji jako tor z węzłami.
- **Zadania** — Pip mówi zadanie główne w dużym dymku (postęp, gdzie iść, nagroda); obok prośby Pipa, prośby postaci
  i zadania dzienne jako czytelne karty.
- **Sklep** — kategorie (Kule, Leczenie, Jajka, Smakołyki) i darmowy cukierek po lewej, duże karty towarów po prawej,
  sakiewka w pasku. **Plecak** — przedmioty jako duże kafle, obok wybrany: opis i od razu Orblingi, na których można
  go użyć. **Medale** — ściana odznak i wybrany medal z trzema progami. **Znaki i żywioły** — koło żywiołów ze
  strzałkami ×1,5 i trzy zasady obok, w drugiej zakładce dwanaście cech znaków. **Obserwatorium**, **Wylęgarnia
  i Dojo** (trenujący Orbling stoi na wysepce), **Dziś** i **Budowniczy Bruno** też są stronami.
- **Nic na niczym.** Przy otwartym oknie toasty idą do środka paska strony (w pionie na dolną krawędź), a te sprzed
  otwarcia gasną; dymek kafelka w HUD chowa cel Pipa pod sobą. W pionie zakładki z paska schodzą do drugiego rzędu,
  więc tytuł nigdy nie jest ucięty.
- **Pasek drużyny w HUD** — zamiast ikon w ramkach stoją same Orblingi na krążkach w kolorze żywiołu, z poziomem
  i paskiem HP.
- Małe okienka (potwierdzenia, nagrody, ustawienia, nauczyciel ruchów, wybór Orblinga) mają jasny materiał z obrysem
  tuszem i kolorową tabliczką tytułu (`panels.css`), bez ciemnego granatu i neonowych ramek.

**Wersja 3.2 — „Gwiezdne łapanie”** — łapanie Orblinga zaprojektowane od nowa jako krótka scena w pięciu taktach
(`src/scenes/capture.js`, `capture.css`), z własnymi efektami i dźwiękami, bez nowych tekstów do tłumaczenia.
- **Celowanie.** Na dzikiego Orblinga pada snop światła (reszta areny ciemnieje, panel nie). Wokół niego obraca się
  złota tarcza zodiaku z czterema gwiazdkami, a świetlny krąg z biegnącym błyskiem zaciska się na niej i zmienia kolor:
  biały → błękitny (Świetnie) → złoty (Doskonale). Tykanie wznosi się, gdy krąg się zaciska, a wejście w strefę daje
  dzwonek — w rytm można trafić też na ucho. Szansa na żywo („Szansa: 64% +35%”) i podpowiedź stoją nad celownikiem
  (albo pod nim), nigdy na dzienniku walki; podpowiedź widać tylko przy pierwszych łapaniach. Tabliczka dzikiego
  Orblinga odsuwa się na ten czas. Kto nie kliknie, rzuca sam po 4,5 s, ale bez premii (wcześniej ten rzut trafiał
  zawsze w „Doskonale”).
- **Rzut.** Kliknięcie rozbija krąg w iskry i wystrzeliwuje ocenę (Nieźle / Świetnie / Doskonale, każda z własnym
  dźwiękiem; Doskonale ze złotym błyskiem i chwilą zatrzymania). Kula wylatuje z samego przycisku ŁAP (znika z niego),
  leci łukiem z obrotem i smugą w kolorze oceny, a przy trafieniu jest stop-klatka, błysk i Orbling się wzdryga.
- **Pochwycenie.** Kula odbija się i zawisa nad głową Orblinga, a jej pierścień odrywa się jako świetlna obręcz: opada
  do stóp, wspina się po Orblingu, który zmienia się w światło, i zaciska z powrotem w kuli — pierścień wskakuje na
  miejsce z „klak”. Kula spada pod prawdziwą grawitacją z dwoma odbiciami (spłaszczenie, pył, cień na ziemi).
- **Napięcie.** Muzyka cichnie i się przytłumia (filtr), snop światła zwęża się na kulę, kamera powoli się przybliża.
  Nad kulą trzy gwiazdki: każde przetrwane chwianie (kołysanie na podstawie z przeciwwychyleniem i grzechotem) zapala
  jedną z coraz wyższym dźwiękiem; przed trzecim chwianiem słychać bicie serca.
- **Finał.** Złapany: klik zamka, rozbłysk z promieniami i falą po ziemi, kamera „uderza”, pieczęć **ZŁAPANO!**, nad kulą
  rysuje się gwiazdozbiór znaku Orblinga (12 uproszczonych prawdziwych konstelacji, gwiazda po gwieździe, z dzwonkami),
  konfetti i krótka fanfara (gra też przy wyłączonej muzyce, jak dżingiel wygranej). Na koniec gwiazdy spływają do kuli;
  dotknięcie po pieczęci pomija resztę pokazu. Ucieczka: kula trzęsie się coraz mocniej, pęka światłem, wybucha (połówki
  i pierścień rozlatują się), Orbling wyskakuje z podskokiem, a szansa na przycisku ŁAP pulsuje na zielono, bo następna
  kula trzyma lepiej.

Całość trwa ok. 6–7 s od kliknięcia do pieczęci (w trybie ×2 ok. 4 s), działa w poziomie i w pionie, w trybie lekkim
(bez poświat na ruchomych obrazkach, połowa cząsteczek), a ustawienie „wstrząsy ekranu” wyłącza też ruch kamery.

**Wersja 3.1 — „Gwiezdny początek”** — epickie otwarcie, zrobione pod Poki i CrazyGames.

**Prolog (nowy gracz, ~11 s).** Film na silniku gry, zgrany z własnym utworem muzycznym (4 takty, bez zapętlenia):
- dwanaście znaków zodiaku zapala się po kolei wokół gwiazdy (każdy z własnym dzwonkiem);
- na gwiazdę nasuwa się Zaćmienie, otwiera czerwone oczy i rozpada się w dym, z którego wyłania się cienisty wąż;
- odpowiada mu słoneczny lew: najpierw obie sylwetki z obwódką światła, piorun, dwa błyskawiczne zbliżenia na tle
  płonącego podświetlenia (twarz lwa przecięta ostrzem światła, płonące oko węża), szarża i zderzenie w białym błysku;
- Gwiezdna Kula wlatuje łukiem, cień bieleje i zapada się w kulę, kula chwieje się trzy razy i… złapany;
- logo ląduje z orbitą, a pod nim staje szereg Orblingów; podpis „Gwiazdy wzywają nowego trenera”.

Zasady portali: nic nie trzeba klikać (prolog sam przechodzi dalej), **Pomiń** widać od pierwszej sekundy (także Esc /
Enter / spacja), dotknięcie ekranu tylko włącza dźwięk (muzyka dołącza w miejscu, w którym jest film), prolog nigdy nie
liczy się jako rozgrywka (`gameplayStop`), a lejek analityki ma kroki prolog: start / pominięty / koniec. Po obejrzeniu
(albo pominięciu) prolog nie wraca przy odświeżeniu strony — wraca tylko przy „Nowej grze”.

**Gwiezdny Ołtarz (wybór startera).** Zamiast dziennej łąki: nocna Słoneczna Wyspa z pasem galaktyki, dalekimi
latającymi wyspami, świetlikami i sigilem zodiaku na ziemi. Kamera zjeżdża z gwiazd, profesor Vega i Pip mówią po jednym
zdaniu (komiksowy dialog z dużymi portretami; przewija się sam, dotknięcie przyspiesza, jest „Pomiń”),
potem cztery spadłe gwiazdy-kule otwierają się po kolei na kamiennych piedestałach. Wybrany starter staje w snopie
światła, a karta pokazuje żywioł, znak, opis i gwiazdki statystyk (atak, moc gwiazd, obrona, szybkość). Po wyborze
partner przeskakuje do trenera („Sunkit dołącza do drużyny!”), a reszta odlatuje z powrotem do gwiazd.

**Od razu pierwsza walka.** Pip woła „Uwaga — spada kolejna gwiazda!”, meteor uderza w środek ołtarza, z krateru
wyskakuje dziki Orbling i zaczyna się walka samouczkowa (łapanie jest pewne) na tym samym nocnym tle. Po złapaniu gracz
trafia na łąkę. Kto odświeży stronę w trakcie tej walki, dostaje stary samouczek na łące (strzałka nad dzikim Orblingiem).

**Ekran tytułowy.** Dla powracających: key art — słoneczny lew i burzowy wąż naprzeciw siebie za logo z orbitą,
szereg Orblingów na świecącym horyzoncie, spadające gwiazdy (także w pionie).

Wszystko działa w poziomie i w pionie (także na niskich telefonach), w trybie lekkim i w 9 językach. Serwer
deweloperski (`tools/devserver.py`) ma większą kolejkę połączeń, bo przy wielu plikach naraz losowy skrypt potrafił się
nie wczytać.

**Wersja 3.0 — „Baza i świat”** (czwarty etap planu z audytu).

**Baza, która daje.** Baza ma dwa obszary: polanę i nowe **Pracownie** (sad za płotem). Orblingi z przechowalni pracują
w czterech warsztatach:
- **Ogród** — jagody (leczą 30% w walce), czasem cukierek;
- **Piec** — Gwiezdne Kule, czasem Kula Nova;
- **Studnia** — mikstury, czasem herbatka;
- **Wiatrak** — monety i gwiezdny pył znaku pracownika.

Plony zbierają się przez **10 godzin**, także gdy gracza nie ma, i odbiera się je jednym kliknięciem (albo „Zbierz
wszystko” w panelu Dziś). Pracownik swojego żywiołu pracuje najszybciej, a poziom, przyjaźń i dekoracje go przyspieszają.
Warsztaty buduje za monety budowniczy **Bruno** (Ogród od razu, Piec 1500, Studnia 3000, Wiatrak 5000).

**Żywa Wylęgarnia i Dojo.** Prawdziwe jaja leżą w gnieździe, a gotowe się kiwają — jedno kliknięcie je wykluwa. Uczniowie
sparingują na macie, nad Dojo wisi dymek z XP i kliknięcie odbiera trening.

**Dekoracje.** 16 dekoracji u Bruna (500–8000 monet) i 5 unikatów z historii postaci. Stawia się je na 10 miejscach ✚
(polana i Pracownie). Ich urok przyspiesza warsztaty (do +30%) i zwabia **gości** — raz na 8 godzin do Pracowni może
zajrzeć Orbling w żywiole Twoich dekoracji, którego da się złapać.

**Przyjaźń.** Każdy Orbling ma 0–5 serc. Rosną z głaskania (raz dziennie, do tego 10% poziomu XP), wygranych walk i pracy
(limit dzienny). Premie: ♥1 +5% XP, ♥2 szansa na strząśnięcie złego stanu, ♥3 +5% krytyków, ♥4/♥5 szansa na przetrwanie
ciosu z 1 HP (raz na walkę). Ulubieńcy (★) zawsze są na polanie.

**Panel „Dziś”** zamiast osobnych okienek: nagroda dnia (cykl 7 dni, bez kar), prezent na powitanie po 3+ dniach
nieobecności, premia za pierwsze złapanie dnia, zadania dzienne (nowe: głaskanie i plony), darmowy obrót Kołem (z widocznymi
szansami) i stan Bazy.

**Postacie z historiami.** Tim, Rex, Jax (który odchodzi z Zespołu Zaćmienia), Ivan i Jett po pokonaniu mają prośbę —
nagrodą jest unikatowa dekoracja. Prośby widać w zadaniach i na lewym pasku HUD.

**Języki.** Oprócz angielskiego i polskiego: niemiecki, hiszpański, francuski, włoski, portugalski (Brazylia), a od 3.0.1
także turecki i rosyjski. Język wybiera się sam (przeglądarka albo SDK CrazyGames), a w ustawieniach jest lista.

**3.0.1.** Pełne czcionki z Google Fonts (Rubik ze zmiennego pliku, Pangolin) z łaciną rozszerzoną i cyrylicą — stąd turecki
i rosyjski, a francuski dostał prawdziwe „œ”. Napis pod logo w tych językach przechodzi na Rubik (Lilita One ma tylko
łacinę). Poprawione kadry sześciu starszych Orblingów (stopy przy skoku, dolna pętla węży) — żaden Orbling nie wychodzi
już poza obrazek w żadnej klatce.

**3.0.2 — jeden cel na start.** Do pierwszego złapania na łące liczy się tylko pierwszy dziki Orbling: wisi nad nim
duża żółta strzałka, a pod nim pulsuje krąg. Pomarańczowe strzałki wyjść, „!” i „?” nad postaciami oraz błysk skrzyni
pojawiają się dopiero po złapaniu. Inne dzikie Orblingi trzymają się z daleka i nie są tego samego gatunku. Kliknięcie
innego Orblinga albo trenera kończy się krótką podpowiedzią „najpierw ten pod strzałką”. Kto stoi bez ruchu, dostaje
przypomnienie od Pipa. Strzałka wraca też po wczytaniu gry i po powrocie na łąkę.

**Własny wygląd Bazy.** Płot z wielkich pni zastąpił kwitnący żywopłot z gwiezdnymi
latarenkami; profesor nazywa się teraz Vega.

**Wersja 2.9 — „Kolekcja i walka”** (trzeci etap planu z audytu).

**Nowe sylwetki.** 12 form końcowych i 12 legend dostało własne plany ciała zamiast przebarwionych młodszych form:
- **stojące na dwóch nogach**: ognisty baran-wojownik Ignaram, minotaur Terrataur, burzowy chochlik Geminova, driada
  w sukience z płatków Floravelle, unosząca się bogini żniw Spicaria, skorpioni rycerz Abyssting;
- **Wodnik i Ryby**: dżin z dzbanem na kłębie chmury Sadalmir, para koi w kręgu Alreshia;
- **Strzelec i Bliźnięta**: centaur-łucznik Sagittaris, bliźniacze gwiazdki trzymające się za ręce Castorlux;
- **Koziorożec i Skorpion**: morski koziorożec Aegoros, latający skorpion na smoczych skrzydłach Antarex;
- **Waga**: ptak niosący złotą wagę Libratross, ptak na tle tarczy dnia i nocy Equinyx;
- **Rak**: krab z muszlą-sierpem Moontide, księżycowy krab przed pełnią Lunacrest;
- **czworonogi w nowych pozach**: byk-tytan z górą na grzbiecie Gaiaurus, stający dęba jeleń Meteorhorn, kozioł
  na własnej latającej wysepce Peakhorn, lew-słońce Solmane, skrzydlaty Regulion, latający złoty baran Chrysaries.

Każdy ma pętlę spoczynkową i cykl ruchu, a latające unoszą się w świecie i w walce.

**Kolekcja.** Rzadkość (pospolity / rzadki / epicki / legendarny) widać:
- na tabliczce w walce,
- na kuli ŁAP,
- w Kodeksie,
- na kartach Orblingów.

Każda strefa ma „rzadki cel”, pokazany na mapie i na banerze strefy. Gdy się pojawi, dostajesz powiadomienie. Mini-gra łapania
pokazuje na żywo, ile daje trafienie w krąg („Szansa: 46% +70%”). Każda nieudana kula ułatwia następny rzut (+15%).
Duplikaty i wypuszczone Orblingi dają **gwiezdny pył** swojego znaku, który podnosi potencjał (★). Gwiazdki są
wreszcie opisane. **Nauczyciel ruchów** uczy za monety ataków innych żywiołów i ruchów wsparcia.

**Walka.**
- Etykieta „Super!/Słabo” liczy żywioł i cechy znaku przeciwnika.
- Pierwsze ataki gwiezdne są mocniejsze. Trafienie gwiezdnym atakiem w słabość zwraca 1 energii.
- Darmowe ataki fizyczne z późnej gry osłabione (np. Body Slam 85→65).
- Na poz. 7 zamiast Warknięcia/Groźnego Spojrzenia przychodzi atak innego żywiołu.
- Bliźnięta, Waga i Wodnik dostały na poz. 20 atak znaku zamiast Doładowania.
- Wzmocnione słabe linie (Skorpion, Waga, Bliźnięta, Lew z nowym Drapieżnym Susem) i ich cechy.
- Strażnicy, mistrzowie i legendy zapowiadają swój najmocniejszy atak turę wcześniej (+30%).

Rozrzut wygranych w turnieju gatunków spadł z 30–70% do 35–64%.

**Progresja.**
- Legendy są na poz. 45 i wymagają Orblinga znaku wyewoluowanego przez gracza.
- Orion w pierwszym pojedynku nie wystawia legendy (Regulion dopiero w rewanżu). Umbra jest o 2 poziomy łagodniejsza.
- Dzikie Orblingi mają etap zgodny z poziomem.
- Dojo działa 2× szybciej, a ławka dostaje 75% XP.

**Wersja 2.8 — „Telefon i własna twarz”** (drugi etap planu z audytu). Gra działa **w pionie na telefonie**: to ten
sam świat, tylko ułożony pod kciuk. Scena ma 540 px szerokości, a wysokość dopasowuje się do ekranu, więc teksty
i przyciski są duże. Świat i arena walki mieszczą się w „oknie” z kamerą, która idzie za graczem, a na początku pokazuje
też pierwszego dzikiego Orblinga. Brzegi okna wtapiają się w rozmyte tło. W walce u góry jest arena: przeciwnik stoi
dalej po prawej, Twój Orbling bliżej po lewej, a podpisy są w rogach. Na dole jest panel: dziennik, cztery duże karty
ataków, rząd „plecak – kula ŁAP – ucieczka” i drużyna. Menu mają jedną kolumnę i większe litery. Kodeks jest obrócony
(wiersz = znak). Są też pionowe wersje ekranu tytułowego, łąki ze starterami (siatka 2×2), Mapy Gwiazd (powiększona
panorama) i Areny. Obrót telefonu przestawia bieżący ekran bez utraty stanu. Plansza „obróć urządzenie” zniknęła.
**Własna tożsamość UI**:
- Nowy panel walki: gwiezdny pokład, a nad nim kula ŁAP z pierścieniem szansy i krążącą gwiazdką zamiast tarczy
  „TWOJA TURA”. Ataki to zaokrąglone karty w kolorze żywiołu z napisem „Super!”/„Słabo”. Pusty slot mówi, na którym
  poziomie przyjdzie nowy atak. Paski HP są zaokrąglone, a energia to kropki.
- Kafelki HUD to małe planety (orbita zapala się po najechaniu).
- Sklep Kramik to kramik z pasiastą markizą na chmurce zamiast skrzydlatej maskotki.

**Tryb lekki** dla słabszych urządzeń włącza się sam (mało rdzeni lub pamięci, albo przycięcia w pierwszych
sekundach) albo w ustawieniach. Daje co drugą klatkę animacji, o połowę mniej cząsteczek, brak rozmyć i cieni na
animowanych obrazkach. Malowanie w tle czeka na koniec walki i reklamy.

**Wersja 2.7 — „Pierwsze 3 minuty”** (pierwszy etap planu z audytu). Nowy gracz ląduje od razu
na łące: profesor Nova mówi jedno zdanie w dymku, a cztery startery stoją w trawie — klikasz, wybierasz i zaraz łapiesz
pierwszego dzikiego Orblinga (samouczek bez okien do przeklikania; dziki z samouczka nie da się znokautować). Wygląd
i imię są losowe, zmienia się je w Karcie Trenera. HUD odsłania się z postępem (na start tylko cel przy Pipie, pasek
drużyny i ustawienia), a obok Pipa zawsze widać następny cel z ułamkiem. **Jedna waluta** — klejnoty zamienione na
monety (stare zapisy: 1 klejnot = 100 monet), jaja, cukierki i Kula Galaktyki kupuje się za monety, bez przycisku
„DODAJ”. Reklamy zgodne z regułami Poki i CrazyGames: bez ofert na ekranie walki, ożywienie za reklamę raz na sesję,
przerywniki tylko przy dużych przejściach i nie w pierwszych minutach, przyciski 🎬 nigdy zielone i nie większe od
zwykłych, „×2 XP drużyny” tylko po trenerach. Zadania nie blokują fabuły (pominięte prośby Pipa czekają na osobnej
liście), liczą to, co już zrobiono, i podpowiadają, na której wyspie szukać żywiołu; ligi Areny przypięte do wysp.
Po wygranej drużyna odzyskuje 20% HP. Pod spodem: prefiks `poki_ignore` dla pamięci podręcznej obrazków (zapis
w chmurze Poki), poprawka samoczynnego przewijania widoku, lejek analityki (Poki `measure`, postęp CrazyGames),
`gameplayStart` dopiero po pierwszym dotknięciu.

**Wersja 2.6** — **Baza**, czyli Twoja polana w głębi lasu. Stoi na niej domek na drzewie
(drużyna), a dookoła płot z wielkich pni ze słojami, staw z kamieniami i liliami, krzak jagód, Wylęgarnia i Dojo.
Chodzą po niej wszystkie Twoje Orblingi (drużyna i przechowalnia, do 16). Odwiedzają się nawzajem i witają serduszkami.
Ryby pływają w stawie, a linia wody przecina im ciało. Na powierzchni rozchodzą się kręgi, a ryby wyskakują z pluskiem.
Kliknięty Orbling podbiega. Raz dziennie pogłaskanie daje mu XP, a z jego karty przeniesiesz go do drużyny albo do
przechowalni. Omdlałe śpią, dopóki nie uleczy ich źródełko. Krzak co 4 h daje miksturę i monety. Do Bazy prowadzi kafelek
z domkiem w HUD i przycisk na Mapie Gwiazd. Rakieta zabiera do gwiazd, a drogowskaz wraca do ostatniej strefy.
Poprawki: dymki i etykiety wiszą tuż nad głową stworka (jej wysokość mierzona jest z obrazka), pilne malowanie wyprzedza
kolejkę tła (koniec z „bladymi” stworkami), a kurz spod butów pojawia się we właściwym miejscu.

**Wersja 2.5** — każdy Orbling jest animowany klatkami malowanymi pędzlem: 6-klatkowa pętla spoczynkowa (płomienie
migoczą, ogony się kołyszą, skrzydła trzepoczą, czułki, pióropusze i płetwy bujają się z opóźnieniem, kłęby chmurek
oddychają, wąż faluje) i 6-klatkowy cykl ruchu zależny od budowy: skok (przysiad, wybicie z nogami w dół, lot z
podkurczonymi nogami, opadanie, lądowanie), ptaki rozkładają skrzydła i chowają nogi, ryby płyną ogonem i płetwami,
chmurki dryfują, węże pełzną falą przez całe ciało, czworonogi kłusują, kraby i skorpiony przebierają nogami.
Mruganie to prawdziwe zamknięte powieki. W walce te same pętle w dużym rozmiarze. Malują 3 wątki robocze, a Orblingi
całej wyspy są malowane w tle.

**Wersja 2.4** — malowana grafika postaci: każdy Orbling, trener, przedmiot i ikona HUD jest „przemalowywany” pędzlem
(renderowanie pociągnięciami: kolory biorą się z rysunku, pociągnięcia idą wzdłuż formy, cieplejsze w światłach i
chłodniejsze w cieniach, faktura płótna, miękkie światło i tusz wokół sylwetki). Malowanie działa w Web Workerze, a gotowe
obrazy są zapisywane w IndexedDB. Postacie mają nowy szkielet (biodro–kolano–kostka, bark–łokieć–dłoń) i 8-klatkowy cykl
chodu (kontakt, przysiad, przejście, wybicie) sterowany przebytą drogą — stopy nie ślizgają się po ziemi. Czworonogi
kłusują parami nóg, kraby i skorpiony przebierają nogami, wszyscy mrugają. Znaczki żywiołów i znaków są szklistymi plakietkami.

**Wersja 2.3** — nowy interfejs:
ciemne, stalowe kafelki HUD z malowanymi ikonami (globus, karty, plecak, zwój, domek = Baza), pasek zasobów z zielonym
„DODAJ” (usunięty w 2.7), maskotka sklepu Kramik, kolumna portretów „kto czegoś chce” zamiast etykiet nad głowami, komiksowe dymki
z wielkim portretem i ręcznym pismem, nowy układ walki (obie strony na jednej linii, podpisy z ukośnym
paskiem HP, ośmiokątny portret, pasek drużyny, cztery ukośne ataki wokół tarczy „TWOJA TURA” z przyciskiem ŁAP),
nowa Mapa Gwiazd (szeroka malowana panorama do przeciągania, pierścienie lokacji, pinezka z twarzą gracza, czarna
karta miejsca z trudnością i „Leć!”, zwój z nazwą wyspy), ruch postaci z przyspieszaniem, hamowaniem i obrotem
„papierowej wycinanki” oraz chody Orblingów zależne od budowy ciała (kłus, skoki, drobienie, pełzanie, szybowanie).
Fonty OFL (Rubik, Pangolin, Lilita One) są osadzone w grze — żadnych zewnętrznych pobrań.

**Wersja 2.2** — nowy klimat: granatowo-złote UI z gwiezdnym tłem, nowy silnik efektów (canvas: poświaty,
iskry, dym, pociski ze smugą, fale, błyskawice, koło zodiaku przy trafieniu „super”), epickie wejścia Orblingów
(„Naprzód, X!”, wir dzikich, lądowanie z pyłem), łapanie z widoczną szansą % i mini-grą przy rzucie („ZŁAPANO!”),
mroczny Kodeks z sylwetkami, różnorodne postacie (5 sylwetek, koty i roboty, stroje, rekwizyty w dłoniach, twarze)
oraz malowane mapy wysp z lokacjami, ścieżkami i kartą miejsca.

**Wersja 2.0**: efekty dla każdego ataku, AUTO i ×2 w walce, Gwiezdna Arena (5 lig z mistrzami), Obóz (wylęgarnia jaj
i Dojo z treningiem offline), 63 medale, 7-dniowy kalendarz nagród, rzadkie Alfy, gwiezdne okruchy, pora dnia
(nocą lśniące ×2), plansza VS, panel awansu, nowe zadania i muzyka Areny. Zapisy z wersji 1.0 są migrowane automatycznie.

Pełny projekt gry: [docs/GDD.md](docs/GDD.md).

