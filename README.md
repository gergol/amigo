# amigo

Spanisch lernen (A1/A2) für Deutschsprachige — im Terminal.

Drei Trainer auf einer gemeinsamen Inhaltsbasis (siehe `Plan/`):

1. **Vokabeln** — klassisches Spaced Repetition (DE→ES, Artikel Pflicht, Genus-Drill)
2. **Verbformen** — alle A1/A2-Zeiten, gewichtet nach Schwächen
3. **Sätze** — aus Templates *generierte* Satzpaare: deutscher Prompt → spanische Lösung.
   Templates wachsen mit: sobald z. B. das Indefinido freigeschaltet ist, fragen
   bestehende Satzmuster auch die Vergangenheit ab.

Der Kern-Trick: Templates referenzieren *Bedeutungen*, nicht Wörter. *aburrido* hat
zwei Senses (ser → „langweilig", estar → „gelangweilt") — der deutsche Prompt macht
die Unterscheidung automatisch eindeutig.

## Benutzung

```
npm install
npm start
```

Menü: `4` schaltet das nächste Modul frei (M01–M20), `1/2/3` startet eine Übung,
`5` setzt einen Fokus (z. B. nur reflexive Verben), `6` öffnet die Einstellungen
(Bekanntes an-/abhaken — Voraussetzungen werden automatisch mitgezogen).

Antworten werden **ohne Akzente** geprüft (`esta` = `está`, `n` = `ñ`); die Anzeige
zeigt immer die korrekte Schreibung. Bei mehrwortigen Antworten wird auch eine
**andere Wortstellung** akzeptiert, solange es dieselben Wörter sind (spanische
Satzstellung ist oft frei, der Generator kennt aber nur eine Reihenfolge). In der Web-App können Antworten auch
**gesprochen** werden (Mikrofon-Button neben dem Eingabefeld; Browser-Spracherkennung,
braucht HTTPS oder localhost — die erkannte Antwort wird direkt geprüft). Der
Mikrofon-Modus bleibt über alle Fragen aktiv, bis er wieder ausgeschaltet wird;
solange er an ist, öffnet sich die Tastatur nur nach Tipp aufs Eingabefeld.

## App (Web / PWA fürs Handy)

**Live: <https://gergol.github.io/amigo/>** — wird bei jedem Push auf `main`
automatisch deployt (der Build-Commit steht unten in den Einstellungen).

Dieselbe Engine als installierbare Progressive Web App (mobil-first, offline,
hell/dunkel). Design & Plan: `Plan/web/`. Schriftgröße (Standard 120 %) und
Auto-Weiter (richtig 1 s / falsch 3 s, Tipp auf den Bildschirm stoppt den Timer,
0 = aus) sind in den Einstellungen konfigurierbar.

Beim Üben bindet sich der Bildschirm an die **sichtbare Höhe** (`visualViewport`):
öffnet sich am Handy die Tastatur, bleiben Frage *und* Eingabefeld sichtbar,
statt dass die Frage nach oben weggeschoben wird. Ist der Platz knapp, wird die
Frage automatisch kleiner skaliert, damit sie immer ganz zu sehen ist.

```
npm run dev        # Vite-Dev-Server (--host: vom Handy im WLAN erreichbar)
npm run build      # statisches Bundle nach dist/
npm run preview    # dist/ lokal ausliefern
```

Beide Frontends (Terminal + Web) teilen sich `src/engine/*`. Der Web-Teil liegt in
`src/web/` (Preact); `content/*.yaml` wird von `scripts/build-content.ts` einmalig zu
`src/web/content.generated.json` gebündelt (läuft automatisch vor `dev`/`build`).

**Aufs Handy bringen:** Service Worker (Installation/Offline) brauchen HTTPS. Fürs
schnelle Ausprobieren reicht `npm run dev` + LAN-IP im Handy-Browser (ohne Install).
Für echte Installation das `dist/` über HTTPS ausliefern (z. B. GitHub Pages) und im
Browser „Zum Startbildschirm hinzufügen". Der Lernstand wird als `user.yaml`-Text im
`localStorage` gehalten und kann unter *Einstellungen → Lernstand* exportiert/importiert
werden — deckungsgleich mit der `user.yaml` der Terminal-Version.

## Lernstand: user.yaml

Der gesamte Lernstand liegt in einer `user.yaml` im Arbeitsverzeichnis — bewusst
menschenlesbar: Grammatik-Known-Set, SRS-Zustand pro Vokabel (`due`, `interval`,
`ease`, `errors`) und pro Verbform-Zelle, gespeicherte Fokus-Presets. Direkt
editierbar: `interval` kürzen/`due` zurückdatieren → Wort kommt öfter. In der App
geht das über den **Score** (0–100) im Wortschatz-Editor: eine log-skalierte Sicht
auf `interval` — niedrig = kommt oft dran. Fehler zählen mit (`errors`): fällige
Wörter mit vielen Fehlern werden bei der Kartenwahl stark bevorzugt. Die Auswahl
ist dabei immer eine Wahrscheinlichkeit, kein Filter: das Fälligkeitsdatum formt
eine stetige Bereitschaftskurve (frisch geübt 0,2 → fällig 5, dann Überfälligkeits-
und Fehler-Bonus) — „keine Wörter mehr für heute" gibt es nicht, an intensiven Tagen
kommen einfach die am ehesten vergessenen Wörter dran. Dieselbe Karte kommt nie
zweimal direkt hintereinander.

**Wortschatz statt Sperrliste:** Ein Häkchen im Wortschatz-Editor bedeutet „dieses
Wort bin ich auf meinem Weg schon begegnet — wiederhole es". Es kommt sofort in die
Wiederholung (nicht 90 Tage Pause wie früher). Zusätzlich führt jede Session bis zu
3 ganz neue Wörter aus freigeschalteten Modulen ein (als „Neues Wort" markiert).
Verbformen-Drills und Satz-Füller halten sich ebenfalls an den Wortschatz.

**Grammatik-Konstellationen:** Jeder Grammatikpunkt hat einen eigenen SRS-Zustand
(`grammar.srs` in der `user.yaml`), der bei jeder Übung mitbewertet wird — Fehler in
z. B. Indefinido-Sätzen lassen Indefinido-Zellen und -Templates öfter drankommen.
Im Modul-Detail (Einstellungen → Modul) zeigt jeder geübte Punkt seinen Score
(0–100, antippen zum Anpassen), analog zum Wortschatz.

## Inhalte & Entwicklung

- `content/grammar.yaml` — Grammatikpunkt-Graph (20 Module, Voraussetzungen)
- `content/verbs.yaml` — Verben mit Konjugationsmustern und deutschen Formen
- `content/lexicon/m01–m20.yaml` — Nomen/Adjektive/Chunks pro Modul
- `content/templates/` — Satz-Templates mit typisierten Slots
- `content/misc.yaml` — Namen, Zeitausdrücke (deutsche Zeitangabe steuert die Zeitform!)

```
npm test                     # Engine-Tests (Konjugation, Morphologie, SRS, Generierung)
npm run validate             # Inhalte prüfen + jedes Template probegenerieren
npm run validate -- --samples  # … mit Beispielsätzen
npm run typecheck
```

Architektur (siehe `Plan/06-Tech.md`): `src/engine/` ist eine reine Bibliothek ohne
I/O — `src/cli/` lädt YAML, führt die Engine aus, schreibt `user.yaml`. Web/PWA
später: Engine unverändert importieren.
