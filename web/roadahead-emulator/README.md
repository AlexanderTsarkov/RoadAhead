# RoadAhead Phase 0 — Web Route Emulator

## Purpose

This app is the **Phase 0 interactive web route emulator** for the RoadAhead
project. It is a **research and validation tool only** — not the final
delivery surface, not a production app, and not a driver-facing product.

Its purpose is to let the team exercise and validate RoadAhead's route-known
event-applicability and advisory-feedback logic against synthetic fixtures,
before any production delivery surface is built.

This baseline (Slice 1 / Issue #41) contains only the app scaffold and a
placeholder page. Emulator behavior — route geometry, event fixtures,
applicability logic, speed-reference, three-circle UI model — will be added
in subsequent implementation slices under
[Issue #17](https://github.com/AlexanderTsarkov/RoadAhead/issues/17).

---

## Commands

Run these from the `web/roadahead-emulator/` directory.

```bash
# Install dependencies
npm install

# Start development server (http://localhost:5173/)
npm run dev

# Type-check (no emit)
npx tsc --noEmit

# Production build (output: dist/)
npm run build
```

No backend, database, or environment variables are required. The app is a
static SPA.

---

## Relationship to `web/datakam-viewer`

`web/datakam-viewer` is a separate, standalone QA tool for manually
inspecting raw Datakam / OpenSpeedcam `speedcam.txt` files via the browser
file picker. It is a raw-data inspection tool and is **not** the Phase 0
emulator.

This app (`web/roadahead-emulator`) and `web/datakam-viewer` are kept
separate because they serve distinct purposes:

- `web/datakam-viewer` — raw `speedcam.txt` visual QA; direct file picker
  import; no route simulation.
- `web/roadahead-emulator` — Phase 0 validation emulator; consumes prepared
  normalized candidate events (not raw rows); simulates route-known vehicle
  progress; drives applicability and advisory logic.

Keeping these surfaces separate preserves the raw-source vs.
prepared-runtime boundary defined in Product Canon.

Neither app affects the other. Do not modify `web/datakam-viewer` from this
app's directory or PRs.

---

## Product Canon guardrails

Every implementation slice in this app is subject to the Canon truths in
`docs/product/areas/`. The short list below is a working summary.

**Product Canon (`docs/product/areas/`) is the primary authority.**
WIP notes, research recommendations, and emulator defaults are secondary
inputs. If Canon and any secondary source disagree, Canon wins.

### What RoadAhead is not

- **Not a navigator.** RoadAhead does not provide turn-by-turn navigation,
  routing, or ETA.
- **Not an anti-radar.** RoadAhead is not an enforcement-camera detector.
- **Not a legal speed-limit authority.** Speed references are advisory
  guidance context only, not legal or regulatory truth.
- **Not safety-certified.** RoadAhead has not undergone any safety
  certification process. Do not use it as a safety system.

### Data authority

- **External road-event data is candidate input only.** Datakam /
  OpenSpeedcam data is not verified RoadAhead truth. Candidate events must
  pass applicability checks before any driver-facing use.
- **Raw Datakam / OpenSpeedcam data is import / source material only.**
  The emulator will consume prepared, normalized candidate events — not raw
  `speedcam.txt` rows at runtime.
- **Provider non-geometry signals are not RoadAhead truth.** Route providers
  (Yandex, OSRM, GraphHopper, GPX, KML, GeoJSON) may supply geometry only.
  Provider speed limits, ETA, traffic, and segment-speed data are excluded
  from RoadAhead truth.

### Numeric values

- **No numeric tuning value is Product Canon** at this stage.
  All numeric defaults used by the emulator in later slices are WIP emulator
  defaults only. They require recorded validation evidence and an explicit
  Canon / ADR PR before any promotion to Canon.
  See `docs/product/areas/tuning-and-validation/tuning-and-validation.md`.

---

## Baseline non-goals (Slice 1 / Issue #41)

This baseline slice intentionally excludes everything except the app
scaffold. The following are **not present** and will be added in later
slices:

- No route geometry or route rendering
- No prepared event fixtures
- No Datakam import logic
- No event applicability logic
- No speed-reference logic
- No feedback / enforcement logic
- No three-circle UI behavior
- No numeric tuning values or tuning config

---

## Stack

- [Vite 5](https://vitejs.dev/) — build tool and dev server
- TypeScript — type checking (`npx tsc --noEmit`)
- No map library (Leaflet or similar will be added only when route
  rendering is introduced in a later slice)
- No backend, no database, no accounts, no telemetry

Consistent with the existing web stack in `web/datakam-viewer`.

---

## References

- Umbrella issue: [#17 — Phase 0 web emulator implementation](https://github.com/AlexanderTsarkov/RoadAhead/issues/17)
- This slice: [#41 — App baseline / emulator path decision](https://github.com/AlexanderTsarkov/RoadAhead/issues/41)
- Planning doc: `docs/product/wip/roadahead-poc-v1-web-emulator-implementation-plan.md`
- Product Canon: `docs/product/areas/`
- Active sprint: `_working/ITERATION.md` (RA-0008)
- AI / Cursor rules: `CLAUDE.md`
- Dev environment: `AGENTS.md`
