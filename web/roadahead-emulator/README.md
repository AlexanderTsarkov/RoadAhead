# RoadAhead Phase 0 — Web Route Emulator

## Purpose

This app is the **Phase 0 interactive web route emulator** for the RoadAhead
project. It is a **research and validation tool only** — not the final
delivery surface, not a production app, and not a driver-facing product.

Its purpose is to let the team exercise and validate RoadAhead's route-known
event-applicability and advisory-feedback logic against synthetic fixtures,
before any production delivery surface is built.

Slice 3 / Issue #46 adds the **first minimal end-to-end behavior slice**:
manual route-progress simulation, minimal event selection on the synthetic
fixtures, advisory speed-reference state (`unknown` / `approach_target`), a
minimal three-circle display, and a debug panel.

See [§ Slice 3 — first minimal vertical slice](#slice-3--first-minimal-vertical-slice-issue-46)
below for what is implemented and what is explicitly not.

The app baseline (Slice 1 / Issue #41) and synthetic fixture contracts
(Slice 2 / Issue #44) are prerequisites. Full event applicability logic,
direction compatibility, branch/ramp handling, scenario sweeps, and provider
integration are deferred to subsequent slices under
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

# Scenario sweep — run synthetic scenarios against emulator domain logic
npm run scenario:sweep
```

No backend, database, or environment variables are required. The app is a
static SPA.

### Scenario sweep

`npm run scenario:sweep` compiles the scenario runner using
`tsconfig.scripts.json` (a Node.js-only TypeScript config that excludes
browser entry code) into an untracked `dist-scripts/` directory, then runs
8 synthetic scenarios against existing emulator domain logic
(`computeSimulationState`). It prints expected-vs-actual pass/fail for each
check and exits non-zero if any scenario fails.

The sweep does **not** use a browser, Playwright, Cypress, or any browser
automation. It does not require Yandex API, any provider, network, or user
account. It uses synthetic fixtures only.

**Scenario results are WIP validation evidence — NOT Product Canon.**
They are not legal, safety, or human-factors validation. Passing scenarios
only means the current WIP emulator behavior matches the current WIP
expected outcomes for synthetic fixtures. No numeric tuning value is
promoted to Canon by the scenario results.
See `docs/product/areas/tuning-and-validation/tuning-and-validation.md`
(truths 1, 2, 9).

Scenario source files:

| File | Description |
|---|---|
| `src/emulator/scenarios/scenarioTypes.ts` | TypeScript type model for scenarios, checks, and results. |
| `src/emulator/scenarios/syntheticScenarios.ts` | Initial scenario set (8 scenarios, WIP). |
| `src/emulator/scenarios/runScenarioSweep.ts` | Runner: calls `computeSimulationState`, evaluates checks, prints output. |
| `tsconfig.scripts.json` | Separate TypeScript config for Node.js compilation of the runner. |

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
| `src/fixtures/preparedEvents.synthetic.ts` | Six synthetic candidate events: three original `speed_limit` events (Slices 2 / 4.2) plus three Slice 4.5 additions — `direction_unsupported` fixture, `static_camera` out-of-scope fixture, and off-route cross-track debug fixture. Source: `synthetic_fixture`. No Datakam / OpenSpeedcam rows. No route-specific derived fields. |
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

> **Warning:** These values must not be copied into product behavior,
> UI labels, or debug strings as validated, legal, or safety-authoritative
> truth. They are starting points for emulator exploration only.

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

## Slice 3 — first minimal vertical slice (Issue #46)

### What is implemented

- **Simulation controls** — route-progress slider (0–100 %) and current-speed
  controls (number input + ±1 / ±10 buttons). No real GPS. No provider speed.
  (validation-emulator Canon truth 6)

- **Minimal route-known event selection** (`src/emulator/minimalEventSelection.ts`):
  - Identifies speed_limit events ahead of the vehicle using longitude ordering
    (straight east-bound route only — SIMPLIFIED SYNTHETIC-ROUTE LOGIC).
  - Suppresses events behind the vehicle.
  - Applies lookahead guardrails from the WIP tuning config:
    - `min_display_distance_m: 175 m` — events closer than this are `too_close`.
    - `max_lookahead_m: 900 m` — events farther than this are `too_far`.
    (WIP defaults — not Canon.)
  - Selects the nearest qualifying event as primary; the next as secondary.

- **Minimal speed-reference state** (`src/emulator/speedReference.ts`):
  - `unknown` when no applicable event is selected.
  - `approach_target` when the selected event provides `target_speed_kmh`.
  - (speed-reference Canon truths 3, 4, 5)

- **Route progress utilities** (`src/emulator/routeProgress.ts`):
  - Longitude interpolation for the straight synthetic fixture.
  - `progressToLon`, `lonToProgress`, `signedDistanceAlongRouteM`.
  - SIMPLIFIED SYNTHETIC-ROUTE LOGIC — not for real curved routes.

- **Simulation state** (`src/emulator/simulationState.ts`):
  - `computeSimulationState()` ties route progress → event selection →
    speed reference into one immutable snapshot per tick.
  - No derived fields written back to fixture files.
    (event-data Canon truth 11; event-applicability Canon truth 13)

- **Minimal three-circle display** — current speed / primary event / secondary
  context. WIP visual styling — not the final design.
  (ui-model Canon truths 3, 4, 5, 15)

- **Debug explanation panel**:
  - Active route ID / provider.
  - Event count / vehicle longitude / current speed.
  - Speed-reference state and reason.
  - Per-event status table: ahead / behind / too_far / too_close / selected /
    candidate. Each row shows distance and reason.
    (event-applicability Canon truth 12; validation-emulator Canon truth 7)
  - Active tuning config subset (WIP defaults labeled NOT Canon).

### Slice 3 limitations and simplification notes

- **`too_close` and `too_far` are simplified Slice 3 debug statuses**, not final
  driver-facing event-applicability semantics. They reflect whether an event
  falls inside the WIP min/max lookahead window from `EmulatorTuningConfig`.
  They are **not** a general product rule that events at those distances are
  always hidden or always irrelevant. Future urgency, hysteresis, and
  applicability behavior (Slice 4+) may revise how events in those zones
  are treated. (tuning-and-validation Canon truths 1, 2)

- **`secondary` is the next event inside the same simplified candidate window**,
  not the global next event on the route. Events outside the window (too_far,
  too_close, behind) are excluded from secondary. Full secondary-context
  semantics are WIP and will be defined in later slices.

- **Lookahead logic is simplified for the straight synthetic fixture only.**
  Ahead/behind uses longitude ordering. No full geospatial projection. No
  direction compatibility. No branch/ramp handling.

### Slice 3 non-goals

The following are explicitly **not implemented** in Slice 3:

- No full geospatial route projection (cross-track distance, segment index).
- No direction-compatibility matrix.
- No branch / ramp / parallel carriageway ambiguity handling.
- No map rendering (no Leaflet or equivalent).
- No provider integration (no Yandex API, no OSRM, no GPX/KML import).
- No Datakam / OpenSpeedcam import.
- No pass-feedback hold, camera-risk feedback, or `unsafe_likely`.
- No enforcement-severity tiers or enforcement-threshold display.
- No scenario sweep harness.
- No `static_camera` or `road_bump` event processing.
- No numeric Canon promotion.

These are deferred to Slice 4 (event applicability foundation), Slice 5
(scenario sweeps), and subsequent slices under Issue #17.

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
- Slice 5: [#59 — Scenario sweep harness and validation evidence recording](https://github.com/AlexanderTsarkov/RoadAhead/issues/59)
- Slice 4: [#48 — Event applicability foundation](https://github.com/AlexanderTsarkov/RoadAhead/issues/48)
- Slice 3: [#46 — Phase 0 emulator first minimal vertical slice](https://github.com/AlexanderTsarkov/RoadAhead/issues/46)
- Slice 2: [#44 — Synthetic fixture contracts](https://github.com/AlexanderTsarkov/RoadAhead/issues/44)
- Slice 1: [#41 — App baseline / emulator path decision](https://github.com/AlexanderTsarkov/RoadAhead/issues/41)
- Planning doc: `docs/product/wip/roadahead-poc-v1-web-emulator-implementation-plan.md`
- Product Canon: `docs/product/areas/`
- Active sprint: `_working/ITERATION.md` (RA-0008)
- AI / Cursor rules: `CLAUDE.md`
- Dev environment: `AGENTS.md`
