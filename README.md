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
zeigt immer die korrekte Schreibung.

## App (Web / PWA fürs Handy)

Dieselbe Engine als installierbare Progressive Web App (mobil-first, offline,
hell/dunkel). Design & Plan: `Plan/web/`.

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
`ease`) und pro Verbform-Zelle, gespeicherte Fokus-Presets. Direkt editierbar:
`interval` kürzen/`due` zurückdatieren → Wort kommt öfter.

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
