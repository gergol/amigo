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
