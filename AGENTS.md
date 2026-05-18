# AGENTS.md

## Cursor Cloud specific instructions

### Repository overview

This repo contains two runnable components:

| Component | Path | Stack |
|---|---|---|
| Datakam QA Viewer (web) | `web/datakam-viewer/` | Vite 5 + TypeScript + Leaflet (no backend) |
| Datakam Inspector (CLI) | `tools/datakam/inspect_speedcam.py` | Python 3 stdlib only (no pip deps) |

### Running the web viewer

```bash
cd web/datakam-viewer
npm run dev          # starts Vite on http://localhost:5173/
```

The viewer is a static SPA — no backend, database, or environment variables are required. Map tiles load from OSM CDN (internet needed for map rendering). Data is loaded via the browser file picker from a local `speedcam.txt` file (format: `IDX,X,Y,TYPE,SPEED,DIRTYPE,DIRECTION`).

### Running the Python CLI tool

```bash
python3 tools/datakam/inspect_speedcam.py [path/to/speedcam.txt]
# Default input: data/raw/datakam/speedcam.txt (git-ignored)
```

No pip dependencies. Python 3.9+ required (3.12 tested).

### Lint / type check

```bash
cd web/datakam-viewer && npx tsc --noEmit
```

No ESLint or Prettier is configured in this repo. TypeScript compiler is the only static analysis tool.

### Build

```bash
cd web/datakam-viewer && npm run build
```

### Test data

Raw `speedcam.txt` files are git-ignored. For local testing, create a sample file with format:
```
IDX,X,Y,TYPE,SPEED,DIRTYPE,DIRECTION
```
where X=longitude, Y=latitude. Lines starting with `//` are treated as comments.

### Notable caveats

- No automated test suite exists (no unit tests, no integration tests).
- The Vite CJS deprecation warning is cosmetic and does not affect functionality.
- The default ellipse filter (Moscow-Yaroslavl corridor) means points outside ~38.75°E, 56.70°N ± 300×80 km won't appear unless "show all" is toggled.
