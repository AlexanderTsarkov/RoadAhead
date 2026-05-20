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

## Fixture and config contracts (Slice 2 / Issue #44)

This section documents the synthetic fixture and configuration contracts
added in Slice 2. These artifacts define the data shapes consumed by later
emulator slices. They do **not** implement route rendering, vehicle
simulation, event applicability, speed-reference, feedback/enforcement, or
three-circle behavior.

### Fixtures

**All fixtures are synthetic.** No raw Datakam or OpenSpeedcam data is
committed. No provider-derived geometry is committed.

| File | Description |
|---|---|
| `src/fixtures/preparedEvents.synthetic.ts` | Two synthetic `speed_limit` candidate events placed on the synthetic route. Source: `synthetic_fixture`. No Datakam / OpenSpeedcam rows. No route-specific derived fields. |
| `src/fixtures/routeGeometry.synthetic.ts` | Synthetic straight east-bound GeoJSON `LineString` test segment (6 waypoints). Provider: `synthetic_fixture`. Longitude-first `[lon, lat]` coordinates. Not provider-derived. |

Both fixture files are exported as typed TypeScript modules. The route
geometry fixture is also exported as a normalized `RouteGeometry` object
(via `normalizeGeoJsonRoute`) so later slices consume the internal contract
rather than the GeoJSON wrapper directly.

### Contract types

| File | Description |
|---|---|
| `src/contracts/preparedEvent.ts` | `PreparedEvent` interface and `NormalizedEventType` type. Encodes Canon constraints: candidate-only semantics, no route-specific derived fields, provenance required. |
| `src/contracts/routeGeometry.ts` | `RouteGeometry`, `GeoJsonLineStringFeature`, and `normalizeGeoJsonRoute()`. Encodes Canon constraints: geometry-only (no provider speed/ETA/traffic), longitude-first coordinates. |
| `src/contracts/tuningConfig.ts` | `EmulatorTuningConfig` and all sub-types (`DecelerationProfile`, `LookaheadGuardrails`, `DirectionApplicabilityConfig`, `EnforcementToleranceProfile`). |

### Tuning config

| File | Description |
|---|---|
| `src/config/emulatorTuningDefaults.ts` | `EMULATOR_TUNING_DEFAULTS` — the default `EmulatorTuningConfig` for Phase 0. |

**WIP emulator defaults — not Product Canon.**

Every numeric value in `src/config/emulatorTuningDefaults.ts` is a WIP
emulator tuning starting default. No value is Product Canon. No value is
safety-certified. No value makes a legal claim. All values must be
validated through scenario sweeps before any promotion to Canon.
See `docs/product/areas/tuning-and-validation/tuning-and-validation.md`
(truths 1, 2, 3, 6, 7, 8).

Numeric value sources (all WIP research, not Canon):

- Timing / hysteresis:
  `docs/research/roadahead-threshold-tuning-recommendation.md §4.1`
- Reaction time:
  `docs/research/roadahead-threshold-tuning-recommendation.md §4.2`
- Deceleration profile:
  `docs/research/roadahead-threshold-tuning-recommendation.md §4.3`
- Lookahead guardrails:
  `docs/research/roadahead-threshold-tuning-recommendation.md §4.4`
- Direction applicability thresholds:
  `docs/research/roadahead-direction-applicability-recommendation.md §4`
- Enforcement profile (Russia POC default, +20 km/h):
  `docs/research/roadahead-enforcement-profile-recommendation.md §4–§5`

The Russia enforcement profile (`russia_default_plus_20_kmh`) is a
configurable emulator profile only. It does not claim legal correctness or
represent regulatory advice. `legal_claim` is always `false`.

---

## Slice 2 non-goals (Issue #44)

The following are explicitly **not implemented** in Slice 2 and will be
added in later slices:

- No route rendering
- No map library
- No vehicle simulation
- No event applicability logic
- No direction compatibility logic
- No route projection logic
- No speed-reference logic
- No feedback / enforcement logic
- No three-circle UI behavior
- No scenario sweep harness
- No provider integration
- No Datakam import

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
