# `public/routes/` — Emulator Known-Route Static Assets

**Dev-facing reference — not Product Canon. WIP / Issue #87 (Stage 2 route file intake).**

This directory contains owner-provided GeoJSON route files bundled as Vite
static assets. Files here are served at `./routes/<filename>` at runtime and
are included in the production build.

---

## Accepted input format

The emulator accepts three GeoJSON shapes:

| Shape | Notes |
|---|---|
| `LineString` geometry | `{ "type": "LineString", "coordinates": [...] }` |
| `Feature` with LineString | Feature wrapping a LineString geometry |
| `FeatureCollection` | First `LineString` Feature is used |

**Coordinate order: `[longitude, latitude]` — longitude-first, WGS84.**

Minimum 2 coordinate pairs. Feature `properties` may be empty `{}` — they are
not interpreted as event data, speed limits, or any RoadAhead product truth.

---

## Files

### `Rostov1.geojson`

**Owner-approved committed Stage 2 known-route evaluation fixture.**
Added in Issue #87. This is the first committed known-route fixture — it is
not a permanent one-route model. Additional routes are expected as Stage 2
evaluation progresses.

- Shape: `FeatureCollection` → 1 Feature → `LineString`
- Waypoints: 52
- Coordinates: `[longitude, latitude]`, WGS84 longitude-first
- Lon range: ~38.58° – 39.40° E
- Lat range: ~56.56° – 57.18° N
- Properties: `{}` (empty — not interpreted)

Raw source (gitignored, not committed): `data/raw/routes/Rostov1.geojson`  
Committed copy (this directory): `web/roadahead-emulator/public/routes/Rostov1.geojson`

Load via the **"Load Rostov1 route"** button in the emulator's Route Geometry
Import section. Parsed and normalized by `parseUserGeoJsonRoute()` in
`src/main.ts`. No event data is imported; synthetic events remain active.

---

## Adding new routes

This directory is expected to grow as evaluation progresses. The current
one-button-per-route approach in `src/main.ts` is a minimal starting point
for the first fixture. **As the number of routes grows, the intake flow
should move toward a route registry / selector** (a structured list of known
routes presented as a dropdown or picker), rather than adding one hardcoded
button per route file.

Steps to add a route now:

1. Place the GeoJSON file in this directory.
2. Add a load button or registry entry in `src/main.ts` (or migrate to a
   route registry / selector if more than 2–3 routes are present).
3. Update this README with the file's metadata.
4. Files added here are tracked in git and bundled with the app.
5. Gitignored raw source files belong in `data/raw/routes/` (not here).

---

## Commit policy for route and event data

| Data type | Policy |
|---|---|
| Route geometry files (GeoJSON, owner-approved) | **May be committed** to this directory when owner-approved. |
| Raw Datakam source files | **Must not be committed.** Stays in `data/raw/` (gitignored). |
| Prepared / processed, bounded, emulator-ready Datakam-derived datasets | **May be committed later when explicitly approved** by the owner for a specific slice. |

---

## Boundaries

Route geometry only — no event import, no speed limits, no provider data.
Not navigation. Not routing. Not Product Canon. Not driver-facing UI.
