# TETRIS Minimalist Singleplayer

Minimalistisches Singleplayer-Tetris in React & TypeScript (schwarzer Hintergrund, ruhige Typografie, wahlweise dezente Farbakzente oder reines Monochrom).

## Features
- **7-Bag Randomizer & offizielles SRS (Super Rotation System)** mit Wall-Kicks für alle 7 Tetrominoes (`I, O, T, S, Z, J, L`)
- **Hold-Slot (`C` / `Shift`)** & **3er Next-Vorschau**
- **Ghost-Piece-Vorschau** (an-/ausschaltbar)
- **T-Spin, Back-to-Back & Combo-Scoring** sowie progressives Level-System
- **Flüssige Steuerung**: `DAS/ARR`-Tastaturhandling, Lock-Delay (inkl. Touch-Steuerung für Mobilgeräte)
- **Lokaler Bestwert** & konfigurierbares Start-Level (`1–10`)

## GitHub Pages Deployment (`.github/workflows/deploy.yml`)

1. Repo auf GitHub pushen (`main` oder `master`).
2. In GitHub unter **Settings → Pages** als *Source* **GitHub Actions** wählen.
3. `.github/workflows/deploy.yml` führt Typecheck & Tests aus und deployt den statischen Vite-Build automatisch auf GitHub Pages.

## Lokal starten

```bash
npm install
npm run dev
```

Öffne `http://localhost:5174`.

## Tests & Typecheck

```bash
npm test
npm run typecheck
npm run build
```
