# 03 — Vocab Trainer

Classic, proven, no reinvention: thematic units + spaced repetition. The cleverness is in *what* a card contains (lexicon features) and how the trainer feeds the template engine.

## Units

One vocab unit per curriculum module (see 01), ~60–80 entries each for A1, ~120–140 for A2 modules; a unit may continue the previous module's theme (e.g. M13 extends M12's). Unit = the module's theme words + the function words/chunks its grammar needs (e.g. M02 ships the place prepositions). Entries carry their lexicon annotations, so a noun card *always* shows and requires the article (*el coche*, not *coche*), and the German side always shows German gender (*das Auto*).

## Card content

- **Front (DE→ES):** German gloss + disambiguators where needed — sense hints for shift-adjectives (*langweilig (Sache)* vs. *gelangweilt (Person)*), context word for homonym-ish glosses (*bestellen (im Restaurant)*).
- **Front (ES→DE):** Spanish lemma with article.
- **Back:** full answer + `notes_de` trap warnings + one generated example sentence **from the template engine, using only unlocked grammar** — so example sentences are always comprehensible and vary between reviews.
- Verbs link to their conjugation table (verb trainer); shift-adjectives are **two cards** (one per sense) that reference each other.

## Exercise types

All typed, terminal-friendly, accent-insensitive (see 00):

1. Production (DE→ES): type the Spanish word, article required for nouns (*el coche*).
2. Recognition (ES→DE): flashcard-style — reveal answer, self-grade (checking free-form German answers automatically isn't worth it).
3. Gender drill: type *el* or *la*, weighted toward `gender_trap` words.
4. Cloze-in-context: generated template sentence with the target word blanked, type the missing word.

## Spaced repetition

Standard SRS (FSRS or SM-2 — decide at implementation time; the scheduler must work with the few human-meaningful fields stored per entry in `user.yaml`: `due`, `interval`, `ease`). Words or whole units can be marked known in the knowledge settings (00) — that initializes their SRS state as mature rather than removing them, so they still resurface occasionally and are available as template fillers. Users can also tune individual words by editing their SRS fields (TUI or text editor): shorten `interval`/backdate `due` to see a word more, push it out to see it less. Shift-adjective senses are tracked as separate entries (`aburrido/ser`, `aburrido/estar`).

**Focused practice** (00) applies here as theme/tag filters: one theme (*comida*), a trap list (`gender_trap`, false friends), or a word class (all reflexive verbs). Per-entry knowledge state is **shared app-wide**: the template engine biases slot filling toward SRS-due words (a due word appearing inside a generated sentence counts as a partial review), and verb-trainer performance on a verb feeds back into its vocab card. This cross-feeding is what makes three trainers feel like one app.

## German-specific content

Curated closed lists, drilled with extra weight:

- **False friends DE↔ES:** *el vaso* (Glas, nicht Vase), *la carta* (Brief/Speisekarte, nicht Landkarte = *el mapa*), *el gimnasio* (Fitnessstudio, nicht Gymnasium = *el instituto*), *la firma* (Unterschrift, nicht Firma = *la empresa*), *el mantel* (Tischdecke, nicht Mantel = *el abrigo*), *rato/rata*, … (~25–30 items for A-levels)
- **Gender traps:** Spanish gender ≠ German intuition or ≠ ending rule: *el problema, el día, el mapa, la mano, la foto, la moto, la radio, el planeta, la flor, el sol/la luna* (≠ die Sonne/der Mond!)
- **"haben statt sein" idioms:** *tener hambre/sed/frío/calor/miedo/sueño/razón/X años* — taught as chunks.
- **Diverging plurals/countability** where German misleads (*la gente* + singular verb vs. *die Leute* + plural).
