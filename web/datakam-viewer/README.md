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
- Source direction arrows:
  - `DIRTYPE=1` draws one `DIRECTION` arrow;
  - `DIRTYPE=2` draws two opposite arrows;
  - the sidebar toggle can show or hide arrows.
- Popup controls for manual visual QA status and direction-semantics interpretation status.
- Manual QA records are saved in browser `localStorage` under key `roadahead.datakamViewer.manualQa.v1` and can be exported as JSON.
  - Records persist across page reloads; reopening the same marker shows previously saved selections.
  - Use **Export QA JSON** to keep or share a copy outside the browser.
- Moscow-Yaroslavl ellipse filter (default params: centerLon 38.75, centerLat 56.70, major 300 km, minor 80 km, bearing 35°).
- **Default view is ellipse-filtered** — only points inside the Moscow-Yaroslavl ellipse are shown on load.
- Toggle between "show all" and "show only points inside ellipse".

## Manual QA semantics

Manual QA statuses in this viewer apply to Datakam/OpenSpeedcam rows as `ExternalObservation` candidates only.

They do **not** promote a point to `VerifiedRoadEvent`, and they must not be treated as product-ready warning data.

Visual QA status values:

- `unknown` — no judgement recorded.
- `looks_correct` — the object appears plausible in visual inspection.
- `wrong` — the object appears wrong in visual inspection.
- `needs_drive` — visual inspection is insufficient; field verification is needed.
- `missing_here` — a manually noticed missing object near this area; this is reserved for a later manual marker workflow.

Direction-semantics status values:

- `unknown` — no interpretation recorded.
- `likely_vehicle_travel_direction` — `DIRECTION` appears to represent vehicle travel direction.
- `likely_camera_or_sign_facing_direction` — `DIRECTION` appears to represent the direction the camera/sign faces.
- `opposite_of_vehicle_direction` — `DIRECTION` appears opposite to vehicle travel direction.
- `unclear_or_wrong` — source direction is unclear or appears wrong.

Direction-semantics hint shown in each popup: inspected examples suggest `DIRECTION` may be sign/camera facing direction, often opposite vehicle travel. This is a per-point interpretation only — record it per point and do not treat it as global truth.

These statuses are local QA notes. Exported JSON is evidence for future review, not Canon.

## Data policy

Raw `speedcam.txt` and any other raw data files are git-ignored and must remain local.
See `docs/research/datakam-speedcam-format-and-route-qa.md` for format notes.
See `docs/research/datakam-manual-qa-status-semantics.md` for manual QA status semantics.
