# Datakam QA Viewer

Local Vite + TypeScript + Leaflet web viewer for visual QA of Datakam / OpenSpeedcam road-event data.

This is a local-only QA tool. It does **not** commit or bundle any raw data files.

## Usage

```bash
npm install
npm run dev
```

Open the browser URL shown by Vite, then use the file picker to load a local `speedcam.txt` file (e.g. `data/raw/datakam/speedcam.txt` from the repo root).

## Build

```bash
npm run build
```

Output goes to `dist/`. Do not deploy this viewer; it is a local QA tool only.

## Features

- Leaflet map with OSM tile background.
- Browser file picker — no data is uploaded anywhere.
- Parses `IDX,X,Y,TYPE,SPEED,DIRTYPE,DIRECTION` format; inline `//` comments ignored.
- `X` = longitude, `Y` = latitude (Datakam convention).
- Type normalization using the known 12-code mapping.
- Parse stats panel: total lines, valid rows, skipped rows, distinct types, unknown types.
- Per-type color-coded circle markers.
- Per-type checkboxes to toggle visibility.
- Popup with all raw + normalized fields for each point.
- Moscow-Yaroslavl ellipse filter (default params: centerLon 38.75, centerLat 56.70, major 300 km, minor 80 km, bearing 35°).
- Toggle between "show all" and "show only points inside ellipse".

## Data policy

Raw `speedcam.txt` and any other raw data files are git-ignored and must remain local.
See `docs/research/datakam-speedcam-format-and-route-qa.md` for format notes.
