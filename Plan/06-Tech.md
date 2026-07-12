# 06 — Technology

Decision: **TypeScript** (strict mode), Node LTS. Chosen because the valuable part of the app — morphology rules, template expansion, answer checking, SRS — is a pure, deterministic engine with no performance needs, and TypeScript is the one mainstream language where all three targets (terminal now, browser and phone later) run the same code natively, with no WASM or FFI bindings step ever.

## Structure rule (the only architectural constraint)

- **Engine = pure library.** No Node APIs, no DOM, no filesystem, no timers. Input: content + learner state as plain objects (+ "now" passed in for SRS). Output: exercises, checked answers, updated state. This single rule is what keeps web/phone free later.
- **Adapters are thin.** The CLI adapter does: load YAML files → run engine → readline Q&A → write `user.yaml`. A future web adapter swaps file I/O for browser storage; nothing else changes.

No frameworks, no database, no server. The settings TUI is part of the CLI adapter.

## Data

- **Content** (authored, read-only at runtime): `content/*.yaml` — lexicon, verb database, grammar graph, modules, templates, chunks. Formats per 02/04/05.
- **Learner state:** `user.yaml` per 00. The engine never reads/writes files itself — adapters do.

## Dependencies (explicit, complete)

- Runtime: `yaml` (parser/serializer). Nothing else. The diff-friendly `user.yaml` requirement is met by emitting keys in sorted order ourselves — not a library feature we depend on.
- Dev: `typescript`, `tsx` (run TS directly). Tests with Node's built-in `node:test` — no test framework dependency.
- Explicitly *not* now: no TUI framework (readline suffices for typed Q&A; revisit only if the settings TUI outgrows it), no CLI-args library, no schema validator.

## Path to phone & browser (later, for orientation only)

Web: import the engine into a web app; content ships as static files; state in browser storage with `user.yaml` import/export. Phone: the web version as installable PWA (offline-capable); Capacitor wrap only if a store app is ever wanted. Nothing in the current plan needs to change for either.
