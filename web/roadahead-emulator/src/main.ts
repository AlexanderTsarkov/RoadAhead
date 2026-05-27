/**
 * RoadAhead Phase 0 — Web Route Emulator
 * Slice 4.1 / Issue #49: route projection baseline
 * Slice 4.2 / Issue #51: direction compatibility baseline
 * Slice 4.3 / Issue #53: applicability suppression reason model
 * Slice 4.4 / Issue #55: debug accepted / suppressed view
 * Slice 4.5 / Issue #57: synthetic applicability fixture cases
 * Slice 4.6 / Issue #63: sticky operator simulation header
 * Slice 4.7 / Issue #72: copyable manual evidence snapshot
 * Slice 4.8 / Issue #77: route playback mode (Play / Pause)
 * Slice 4.9 / Issue #78: upcoming events strip
 *
 * Wires together synthetic fixtures, emulator logic, and a minimal UI.
 *
 * EMULATOR DEBUG / QA UI — NOT THE DRIVER-FACING UI.
 * Not the final delivery surface. Not a navigator. Not an anti-radar.
 * Not a legal speed-limit authority. Not safety-certified.
 * All numeric values shown are WIP emulator defaults — not Product Canon.
 * Reason / status names used in the debug panel are WIP / not Product Canon.
 *
 * No provider API, no network calls, no user account required.
 * Uses synthetic fixtures only (Slice 2 / Issue #44).
 *
 * Canon authority: docs/product/areas/
 */

import "./style.css";
import type { RouteGeometry, LonLatCoord } from "./contracts/routeGeometry.js";
import { SYNTHETIC_ROUTE } from "./fixtures/routeGeometry.synthetic.js";
import { SYNTHETIC_PREPARED_EVENTS } from "./fixtures/preparedEvents.synthetic.js";
import { EMULATOR_TUNING_DEFAULTS } from "./config/emulatorTuningDefaults.js";
import {
  computeSimulationState,
  type SimulationState,
} from "./emulator/simulationState.js";
import { getRouteLonSpan } from "./emulator/routeProgress.js";
import type { EventSelectionRecord } from "./emulator/minimalEventSelection.js";
import { SYNTHETIC_SCENARIOS } from "./emulator/scenarios/syntheticScenarios.js";
import type { EmulatorScenario } from "./emulator/scenarios/scenarioTypes.js";
import {
  initMap,
  setMapRoute,
  updateVehicleMarker,
  setEventMarkers,
  clearEventMarkers,
  updateEventMarkersVisibility,
  updateEventMarkerEvaluationStates,
  type MarkerEvalState,
} from "./mapView.js";
import { adaptRouteEventsToPreparedEvents } from "./emulator/routeEventAdapter.js";
import type { PreparedEvent } from "./contracts/preparedEvent.js";
import {
  parseRouteRegistry,
  type RouteRegistry,
  type RouteRegistryEntry,
} from "./contracts/routeRegistry.js";
import {
  parseRouteEventDataset,
  validateRouteEventDatasetRouteId,
  type RouteEventDataset,
} from "./contracts/routeEventDataset.js";

// ---------------------------------------------------------------------------
// Mutable simulation inputs (user-controlled)
// ---------------------------------------------------------------------------

/** Route progress percentage: 0–100. Converted to [0,1] for logic. */
let routeProgressPct = 0;

/**
 * Current simulated speed in km/h.
 * No provider speed is used.
 * (validation-emulator Canon truth 6)
 */
let currentSpeedKmh = 60;

// ---------------------------------------------------------------------------
// Playback state (Issue #77 / Slice 4.8)
//
// Minimal Play / Pause control over existing routeProgressPct state.
// Playback advances routeProgressPct using requestAnimationFrame and the
// existing render() path — no separate simulation loop is introduced.
//
// All playback constants are WIP emulator values — NOT Product Canon.
// Not a navigator, not routing, not ETA, not traffic.
// ---------------------------------------------------------------------------

/** Whether playback is currently running. */
let isPlaying = false;

/** requestAnimationFrame handle — 0 when no frame is scheduled. */
let playbackAnimFrameId = 0;

/** DOMHighResTimeStamp of the last animation tick — used to compute delta. */
let playbackLastTimestamp = 0;

// ---------------------------------------------------------------------------
// Playback multiplier and route-length-based progression (Issue #91 fixes)
//
// Playback now advances route progress using the simulated vehicle speed and
// an owner-controlled multiplier rather than a fixed % / second constant:
//
//   progress_delta_fraction =
//     (currentSpeedKmh × playbackMultiplier × deltaSeconds / 3600) / activeRouteLengthKm
//
// activeRouteLengthKm is computed from active route coordinates via haversine
// and cached. It is recomputed whenever the active route changes.
//
// This is WIP emulator simulation only — NOT navigation, NOT ETA, NOT routing,
// NOT provider speed, NOT traffic. NOT Product Canon.
// ---------------------------------------------------------------------------

/**
 * WIP playback speed multiplier.
 * Scales simulated vehicle speed to accelerate route traversal.
 * Presets in UI: 25x, 50x, 100x (default), 150x.
 * WIP emulator control — NOT Product Canon.
 */
let playbackMultiplier = 100;

/**
 * Cached arc-length of the currently active route in kilometres.
 * Computed via haversine from activeRoute.coordinates.
 * Updated by updateActiveRouteLength() on route changes and on buildApp().
 * WIP emulator value — NOT Product Canon.
 */
let activeRouteLengthKm = 0;

// ---------------------------------------------------------------------------
// Debug filter state
//
// Controls which event groups are visible in the debug table.
// This filter affects debug table visibility only — it does NOT change event
// selection behavior. Accepted/suppressed grouping is based on
// applicabilityReason.kind and applicabilityReason.is_driver_facing_eligible.
//
// "all"             — show all events regardless of kind
// "accepted"        — show only applicabilityReason.kind === "accepted"
// "suppressed"      — show only applicabilityReason.kind === "suppressed"
// "not_driver_facing" — show all where is_driver_facing_eligible === false
//                       (covers suppressed + not_processed)
//
// WIP — NOT Product Canon. Filter state is local to this emulator session.
// ---------------------------------------------------------------------------

type DebugFilterMode = "all" | "accepted" | "suppressed" | "not_driver_facing";
let debugFilter: DebugFilterMode = "all";

// ---------------------------------------------------------------------------
// Lifecycle/Order Diagnostics state (Issue #102 / Stage 2)
//
// Tracks the previous primary and secondary event IDs across render ticks
// so we can detect when an event leaves primary/next and show the current
// reason code that caused the departure.
//
// diagLastPrimaryDeparture / diagLastNextDeparture record the most recent
// departure event (event_id, last-known distance, reason code/kind). They
// are updated in render() before diagPrevPrimaryId / diagPrevNextId are
// refreshed.
//
// WIP diagnostics state — per session only — NOT Product Canon.
// ---------------------------------------------------------------------------

/** Event ID of the primary event from the previous render tick. */
let diagPrevPrimaryId: string | null = null;

/** Event ID of the next/secondary event from the previous render tick. */
let diagPrevNextId: string | null = null;

/** Record of the most recent departure from primary slot. */
interface DiagDeparture {
  event_id: string;
  distance_m: number;
  reason_code: string;
  reason_kind: string;
  status: string;
}

let diagLastPrimaryDeparture: DiagDeparture | null = null;
let diagLastNextDeparture: DiagDeparture | null = null;

// ---------------------------------------------------------------------------
// Scenario selector state (Issue #70)
//
// Tracks the currently selected synthetic scenario for browser QA inspection.
// null = manual control (no scenario selected).
// Setting a scenario applies routeProgressFraction and speedKmh from the
// scenario definition; manual slider/speed changes clear the selection.
//
// WIP — NOT Product Canon. Selector is a QA / debug aid only.
// ---------------------------------------------------------------------------

/** Currently selected scenario ID for browser QA inspection, or null (manual). */
let selectedScenarioId: string | null = null;

// ---------------------------------------------------------------------------
// Active route state (Issue #79 / Slice 4.10)
//
// Tracks the currently active route geometry.
// Default is SYNTHETIC_ROUTE; can be replaced by a user-loaded GeoJSON file.
//
// Route geometry is candidate route context for the emulator only.
// Not Product Canon. Not navigation. Not routing. Not map matching.
// No speed / ETA / traffic / posted-limit truth from route files.
// Synthetic scenarios are tied to SYNTHETIC_ROUTE; selecting a scenario resets
// the active route back to synthetic.
//
// WIP — NOT Product Canon. Not driver-facing.
// ---------------------------------------------------------------------------

/** The currently active route geometry. Defaults to the synthetic fixture. */
let activeRoute: RouteGeometry = SYNTHETIC_ROUTE;

/** Describes where the active route came from. */
type ActiveRouteSource =
  | { kind: "synthetic" }
  | { kind: "geojson"; filename: string };

/** Tracks source of the active route for UI display. */
let activeRouteSource: ActiveRouteSource = { kind: "synthetic" };

/** Parse error message from the last GeoJSON import attempt, or null. */
let routeImportError: string | null = null;

// ---------------------------------------------------------------------------
// Route registry state (Issue #93 / Stage 2)
//
// The registry is loaded once from public/routes/route-registry.json and
// used to populate the Route/Data panel selector. Selecting a route from
// the registry is the primary load action for both geometry and prepared events.
//
// Route is the load unit:
//   - route geometry is loaded from route_geometry_url;
//   - prepared event dataset is loaded from prepared_events_url if configured;
//   - both load together as a single atomic action — the user does not load
//     route and data separately.
//
// WIP — NOT Product Canon. Stage 2 / Issue #93.
// ---------------------------------------------------------------------------

/** Parsed route registry, or null before it is loaded. */
let routeRegistry: RouteRegistry | null = null;

/** Error message from the registry load attempt, or null. */
let routeRegistryLoadError: string | null = null;

/** The registry route id that is currently loaded/active, or null. */
let activeRegistryRouteId: string | null = null;

// ---------------------------------------------------------------------------
// Prepared route events state (Issue #93 / Stage 2)
//
// Tracks the load state of the prepared route-scoped event dataset for the
// currently selected registry route.
//
// Not loaded on startup — loaded when a registry route is selected.
// Route loads successfully even when the dataset is missing or invalid.
// WIP — NOT Product Canon.
// ---------------------------------------------------------------------------

/** Discriminated union for prepared event dataset load state. */
type RouteEventsLoadState =
  | { kind: "not_loaded" }
  | { kind: "loading" }
  | { kind: "not_prepared" }
  | { kind: "loaded"; dataset: RouteEventDataset }
  | { kind: "error"; message: string };

/** Current prepared event dataset load state. */
let routeEventsState: RouteEventsLoadState = { kind: "not_loaded" };

// ---------------------------------------------------------------------------
// Route load sequence guard (Issue #93 / Codex review)
//
// Registry route loading is async. Back-to-back loads must not let a slower,
// older fetch overwrite activeRoute, map state, activeRegistryRouteId, or
// routeEventsState after a newer route was selected.
//
// Monotonic token incremented at the start of every registry load and
// synthetic reset; async handlers check isRouteLoadCurrent(token) before
// mutating state.
//
// WIP — NOT Product Canon.
// ---------------------------------------------------------------------------

/** Monotonic route load sequence — incremented to invalidate in-flight loads. */
let routeLoadSeq = 0;

/** Start a new route load; invalidates any in-flight registry/prepared fetches. */
function beginRouteLoad(): number {
  routeLoadSeq += 1;
  return routeLoadSeq;
}

/** True when `token` is still the active route load (not superseded). */
function isRouteLoadCurrent(token: number): boolean {
  return token === routeLoadSeq;
}

// ---------------------------------------------------------------------------
// Active event source selection (Issue #99 / Stage 2)
//
// Determines which event set drives the applicability/evaluation pipeline.
//
// Event source modes:
//   "synthetic"      — SYNTHETIC_PREPARED_EVENTS (default; synthetic/GeoJSON route)
//   "prepared_route" — adapted RouteEvent[] from a loaded RouteEventDataset
//   "no_prepared"    — registry route loaded but no prepared dataset available
//
// Selection rules:
//   1. Registry route + routeEventsState.kind === "loaded" → "prepared_route"
//   2. Registry route + routeEventsState.kind !== "loaded" → "no_prepared"
//   3. Synthetic or GeoJSON route (no registry route active)  → "synthetic"
//
// "no_prepared" uses an empty event array so stale synthetic events are not
// shown as if they were route-scoped prepared data. No silent fallback to
// synthetic events for a registry route with missing/invalid dataset.
//
// Synthetic scenario mode uses SYNTHETIC_PREPARED_EVENTS regardless.
// Selecting a scenario resets activeRegistryRouteId to null.
//
// WIP — NOT Product Canon. Stage 2 / Issue #99.
// ---------------------------------------------------------------------------

/**
 * Discriminated union for the active event source mode.
 *
 * WIP — NOT Product Canon. Stage 2 / Issue #99.
 *
 *   "synthetic"      — Using SYNTHETIC_PREPARED_EVENTS (default).
 *   "prepared_route" — Using adapted RouteEvent[] from a RouteEventDataset.
 *   "no_prepared"    — Registry route active; no prepared dataset available.
 */
type EventSourceMode =
  | { kind: "synthetic" }
  | { kind: "prepared_route"; count: number }
  | { kind: "no_prepared" };

/**
 * Derive the current event source mode from application state.
 *
 * Called by getActiveEventsForSim() and display code.
 * WIP — NOT Product Canon. Stage 2 / Issue #99.
 */
function deriveEventSourceMode(): EventSourceMode {
  if (
    activeRegistryRouteId !== null &&
    routeEventsState.kind === "loaded"
  ) {
    return { kind: "prepared_route", count: routeEventsState.dataset.events.length };
  }
  if (activeRegistryRouteId !== null) {
    return { kind: "no_prepared" };
  }
  return { kind: "synthetic" };
}

/**
 * Return a human-readable event source label for debug/status display.
 *
 * WIP — NOT Product Canon. Stage 2 / Issue #99.
 */
function eventSourceLabel(mode: EventSourceMode): string {
  switch (mode.kind) {
    case "synthetic":
      return "synthetic fixture";
    case "prepared_route":
      return `prepared route events (${mode.count})`;
    case "no_prepared":
      return "no prepared events";
  }
}

/**
 * Return the active PreparedEvent array for the applicability/evaluation pipeline.
 *
 * Selection:
 *   - Registry route + loaded prepared dataset → adapted RouteEvent[].
 *   - Registry route + missing/invalid dataset → [] (empty; no stale synthetic fallback).
 *   - Synthetic/GeoJSON route → SYNTHETIC_PREPARED_EVENTS.
 *
 * Cached adapted events are not stored at module level to keep state simple;
 * the adaptation is O(n) per render tick but the dataset is bounded (~hundreds).
 *
 * WIP — NOT Product Canon. Stage 2 / Issue #99.
 */
function getActiveEventsForSim(): PreparedEvent[] {
  const mode = deriveEventSourceMode();
  switch (mode.kind) {
    case "prepared_route":
      // Registry route with loaded prepared events → adapt RouteEvent[] to PreparedEvent[].
      // This is the core bridge of Issue #99.
      if (routeEventsState.kind === "loaded") {
        return adaptRouteEventsToPreparedEvents(routeEventsState.dataset.events);
      }
      return [];
    case "no_prepared":
      // Registry route but no prepared dataset — return empty so stale synthetic events
      // are NOT silently substituted as route-scoped data.
      return [];
    case "synthetic":
    default:
      return SYNTHETIC_PREPARED_EVENTS;
  }
}

/**
 * Build a map from event_id → MarkerEvalState for the prepared event markers.
 *
 * Derives the visual evaluation state for each event from EventSelectionResult:
 *   EventStatus "selected"   → "primary"
 *   secondary event id       → "next"
 *   EventStatus "candidate"  → "eligible"
 *   Suppressed statuses      → "suppressed"
 *   Behind/too_far/too_close → "inactive"
 *   out_of_scope             → "out_of_scope"
 *
 * WIP debug overlay — NOT Product Canon. Stage 2 / Issue #99.
 *
 * @param state - Current SimulationState from computeSimulationState().
 * @returns Map from event_id → MarkerEvalState for updateEventMarkerEvaluationStates().
 */
function buildMarkerEvalStateMap(
  state: SimulationState
): Map<string, MarkerEvalState> {
  const result = new Map<string, MarkerEvalState>();
  const secondaryId = state.eventSelection.secondary?.event_id ?? null;

  for (const record of state.eventSelection.records) {
    let evalState: MarkerEvalState;

    switch (record.status) {
      case "selected":
        evalState = "primary";
        break;
      case "candidate":
        // Distinguish next (secondary) from other eligible candidates.
        evalState = record.event_id === secondaryId ? "next" : "eligible";
        break;
      case "behind":
      case "too_far":
      case "too_close":
        evalState = "inactive";
        break;
      case "off_route_cross_track":
      case "direction_conflict":
      case "direction_unknown":
      case "direction_unsupported":
      case "projection_missing":
        evalState = "suppressed";
        break;
      case "out_of_scope":
        evalState = "out_of_scope";
        break;
      default:
        evalState = "default";
    }

    result.set(record.event_id, evalState);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Prepared event marker filter state (Issue #97 / Stage 2)
//
// Tracks which source_type_label values are currently visible on the map.
// All labels are visible by default; unchecking a label hides its markers
// without reloading the dataset.
//
// Reset to "all visible" whenever the prepared event dataset changes
// (route change, reset to synthetic, new dataset loaded).
//
// Filter affects map marker visibility only — it does NOT change event
// selection, applicability logic, or scenario sweep behavior.
//
// WIP — NOT Product Canon. Not driver-facing.
// ---------------------------------------------------------------------------

/**
 * Set of source_type_label values that are currently visible on the map.
 * Populated from the loaded dataset; empty set = all hidden (no markers).
 * When null, the panel should not show filter controls.
 *
 * All labels are visible by default when a dataset is loaded.
 * WIP — NOT Product Canon. Issue #97 / Stage 2.
 */
let preparedEventVisibleLabels: Set<string> = new Set();

/**
 * Extract all distinct source_type_label values from the loaded dataset,
 * returning them in insertion order (as they appear across the events array).
 *
 * Returns an empty array if no dataset is loaded.
 * WIP — NOT Product Canon. Issue #97 / Stage 2.
 */
function getLoadedEventSourceLabels(): string[] {
  if (routeEventsState.kind !== "loaded") return [];
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const ev of routeEventsState.dataset.events) {
    if (!seen.has(ev.source_type_label)) {
      seen.add(ev.source_type_label);
      labels.push(ev.source_type_label);
    }
  }
  return labels;
}

/**
 * Reset the prepared event filter to show all source labels in the current dataset.
 * Called when a new dataset is loaded or when the route / dataset is cleared.
 * WIP — NOT Product Canon. Issue #97 / Stage 2.
 */
function resetPreparedEventFilter(): void {
  preparedEventVisibleLabels = new Set(getLoadedEventSourceLabels());
}

// ---------------------------------------------------------------------------
// GeoJSON route import helpers (Issue #79 / Slice 4.10)
//
// parseUserGeoJsonRoute: accepts raw parsed JSON from a user-loaded local file.
// Supports:
//   - LineString geometry: { "type": "LineString", "coordinates": [...] }
//   - Feature with LineString: { "type": "Feature", "geometry": {...}, ... }
//   - FeatureCollection: uses the first LineString feature found
//
// Does NOT support MultiLineString, GPX, or KML.
// Does NOT read GeoJSON properties as event data, speed limits, or route truth.
// Route geometry is candidate context for the emulator only — not Canon.
//
// Throws a descriptive Error on any validation failure.
// WIP — NOT Product Canon. No provider/API/network. No event import.
// ---------------------------------------------------------------------------

/**
 * Validate and extract [lon, lat] coordinate pairs from a raw coordinates
 * array. Enforces: array of at least 2 elements, each element is a [number,
 * number] pair with lon ∈ [-180, 180] and lat ∈ [-90, 90].
 *
 * Returns a typed LonLatCoord[] or throws a descriptive Error.
 */
function extractAndValidateLineStringCoords(
  raw: unknown,
  path: string
): LonLatCoord[] {
  if (!Array.isArray(raw)) {
    throw new Error(`Invalid GeoJSON: ${path} must be an array`);
  }
  if (raw.length < 2) {
    throw new Error(
      `Invalid GeoJSON: ${path} must have at least 2 coordinates, got ${raw.length}`
    );
  }
  return raw.map((coord, i): LonLatCoord => {
    if (!Array.isArray(coord) || coord.length < 2) {
      throw new Error(
        `Invalid GeoJSON: ${path}[${i}] must be a [lon, lat] array`
      );
    }
    const lon = coord[0] as unknown;
    const lat = coord[1] as unknown;
    if (typeof lon !== "number" || !isFinite(lon)) {
      throw new Error(
        `Invalid GeoJSON: ${path}[${i}][0] (lon) must be a finite number, got ${String(lon)}`
      );
    }
    if (typeof lat !== "number" || !isFinite(lat)) {
      throw new Error(
        `Invalid GeoJSON: ${path}[${i}][1] (lat) must be a finite number, got ${String(lat)}`
      );
    }
    if (lon < -180 || lon > 180) {
      throw new Error(
        `Invalid GeoJSON: ${path}[${i}][0] (lon) out of range [-180, 180]: ${lon}`
      );
    }
    if (lat < -90 || lat > 90) {
      throw new Error(
        `Invalid GeoJSON: ${path}[${i}][1] (lat) out of range [-90, 90]: ${lat}`
      );
    }
    return [lon, lat];
  });
}

/**
 * Parse a user-loaded local GeoJSON file into a RouteGeometry.
 *
 * Accepts: LineString geometry, Feature with LineString geometry,
 * or FeatureCollection (first LineString feature is used).
 *
 * Does NOT interpret GeoJSON properties as event data, speed limits,
 * or any RoadAhead product truth. Geometry only.
 *
 * Throws a descriptive Error on parse or validation failure.
 * Caller should catch and display the error without modifying active route.
 *
 * Route geometry import — Issue #79 / Slice 4.10.
 * NOT navigation. NOT routing. NOT provider data. NOT Product Canon.
 */
function parseUserGeoJsonRoute(
  json: unknown,
  filename: string
): RouteGeometry {
  if (typeof json !== "object" || json === null) {
    throw new Error("Invalid GeoJSON: expected a JSON object");
  }
  const obj = json as Record<string, unknown>;
  let coordinates: LonLatCoord[];

  if (obj["type"] === "LineString") {
    coordinates = extractAndValidateLineStringCoords(
      obj["coordinates"],
      "coordinates"
    );
  } else if (obj["type"] === "Feature") {
    const geom = obj["geometry"];
    if (typeof geom !== "object" || geom === null) {
      throw new Error("Invalid GeoJSON Feature: missing or null geometry");
    }
    const geomObj = geom as Record<string, unknown>;
    if (geomObj["type"] !== "LineString") {
      throw new Error(
        `Invalid GeoJSON Feature: expected LineString geometry, got "${String(geomObj["type"])}"`
      );
    }
    coordinates = extractAndValidateLineStringCoords(
      geomObj["coordinates"],
      "geometry.coordinates"
    );
  } else if (obj["type"] === "FeatureCollection") {
    const features = obj["features"];
    if (!Array.isArray(features)) {
      throw new Error(
        "Invalid GeoJSON FeatureCollection: missing or non-array features"
      );
    }
    let found = false;
    coordinates = [];
    for (const feat of features) {
      if (typeof feat !== "object" || feat === null) continue;
      const f = feat as Record<string, unknown>;
      const geom = f["geometry"];
      if (typeof geom !== "object" || geom === null) continue;
      const geomObj = geom as Record<string, unknown>;
      if (geomObj["type"] === "LineString") {
        coordinates = extractAndValidateLineStringCoords(
          geomObj["coordinates"],
          "FeatureCollection[0].geometry.coordinates"
        );
        found = true;
        break;
      }
    }
    if (!found) {
      throw new Error(
        "FeatureCollection contains no LineString feature"
      );
    }
  } else {
    throw new Error(
      `Unsupported GeoJSON type: "${String(obj["type"])}". ` +
        `Supported: LineString, Feature (with LineString), FeatureCollection.`
    );
  }

  return {
    coordinates,
    provenance: {
      provider: "geojson_import",
      generated_at: new Date().toISOString(),
      notes: `Imported from local file: ${filename}. Route geometry only — not provider data, not routing, not navigation.`,
    },
  };
}

/**
 * Reset the active route to the synthetic fixture.
 *
 * Used when:
 *   - the user clicks "Reset to synthetic route";
 *   - the user selects a scenario (scenarios are tied to synthetic route).
 */
function resetToSyntheticRoute(): void {
  beginRouteLoad();
  activeRoute = SYNTHETIC_ROUTE;
  activeRouteSource = { kind: "synthetic" };
  routeImportError = null;
  activeRegistryRouteId = null;
  routeEventsState = { kind: "not_loaded" };
  // Clear prepared event markers and reset filter (Issue #97 / Stage 2).
  preparedEventVisibleLabels = new Set();
  clearEventMarkers();
}

// ---------------------------------------------------------------------------
// Route registry loader (Issue #93 / Stage 2)
//
// Loads public/routes/route-registry.json once on startup. On success the
// Route/Data panel in the right-side panel is populated with selectable routes.
// On failure the panel shows an error — the emulator still functions with the
// synthetic route and manual file import.
//
// WIP — NOT Product Canon. Not navigation. Not routing.
// ---------------------------------------------------------------------------

/** Path to the route registry asset, relative to Vite public root. */
const ROUTE_REGISTRY_PATH = "./routes/route-registry.json";

/**
 * Load the route registry from the bundled static asset.
 *
 * Fetches ROUTE_REGISTRY_PATH, parses with parseRouteRegistry(), stores in
 * routeRegistry, and triggers a render so the Route/Data panel is populated.
 * On failure: sets routeRegistryLoadError; emulator continues functioning.
 *
 * WIP — NOT Product Canon. Stage 2 / Issue #93.
 */
function loadRouteRegistry(): void {
  fetch(ROUTE_REGISTRY_PATH)
    .then((resp) => {
      if (!resp.ok) {
        throw new Error(
          `Failed to fetch route registry: HTTP ${resp.status}`
        );
      }
      return resp.json() as Promise<unknown>;
    })
    .then((parsed) => {
      routeRegistry = parseRouteRegistry(parsed);
      routeRegistryLoadError = null;
      render();
    })
    .catch((e: unknown) => {
      routeRegistryLoadError =
        e instanceof Error ? e.message : String(e);
      routeRegistry = null;
      render();
    });
}

// ---------------------------------------------------------------------------
// Registry-based route loader (Issue #93 / Stage 2 — route is the load unit)
//
// loadRouteFromRegistry() is the primary route selection action.
// It loads route geometry AND attempts to load the prepared event dataset
// together as a single atomic action — the user does not load them separately.
//
// On geometry success:
//   - activeRoute is updated
//   - routeProgressPct is reset to 0
//   - playback is paused
//   - activeRegistryRouteId is set
//   - default_playback_multiplier is applied if configured
//   - prepared events load is attempted immediately (if configured)
//   - map is synced
//   - render() is called
//
// On geometry failure:
//   - active route is not changed
//   - error is shown in Route/Data panel via routeImportError
//
// Prepared events load is attempted regardless of geometry success, but
// geometry must succeed before activeRoute changes.
//
// WIP — NOT Product Canon. Not navigation. Not routing. Not driver-facing.
// ---------------------------------------------------------------------------

/**
 * Load a route from the registry (geometry + prepared events).
 *
 * Route is the load unit: selecting a route loads geometry and prepared events
 * as a single atomic action. The user does not perform these separately.
 *
 * WIP — NOT Product Canon. Stage 2 / Issue #93.
 */
function loadRouteFromRegistry(entry: RouteRegistryEntry): void {
  const loadToken = beginRouteLoad();
  routeImportError = null;
  // Do NOT clear event markers here — if the geometry fetch fails, the previous
  // route's markers and filter state must remain visible (Issue #97 Codex fix).
  // Markers/filter are cleared only after the new geometry is accepted below.
  render();

  fetch(entry.route_geometry_url)
    .then((resp) => {
      if (!isRouteLoadCurrent(loadToken)) return null;
      if (!resp.ok) {
        throw new Error(
          `Failed to fetch route geometry: HTTP ${resp.status} (${entry.route_geometry_url})`
        );
      }
      return resp.json() as Promise<unknown>;
    })
    .then((parsed) => {
      if (!isRouteLoadCurrent(loadToken) || parsed === null) return;
      const imported = parseUserGeoJsonRoute(parsed, entry.name);

      // Geometry accepted — now safe to clear previous event markers and filter.
      // Previous markers must remain visible until the new geometry is confirmed.
      // (Issue #97 Codex fix: clear only on geometry acceptance, not at load start.)
      preparedEventVisibleLabels = new Set();
      clearEventMarkers();

      activeRoute = imported;
      activeRouteSource = { kind: "geojson", filename: entry.name };
      routeImportError = null;
      activeRegistryRouteId = entry.id;

      // Apply default playback multiplier if configured.
      if (
        entry.default_playback_multiplier != null &&
        entry.default_playback_multiplier > 0
      ) {
        playbackMultiplier = entry.default_playback_multiplier;
        const sel = document.getElementById(
          "playback-multiplier-select"
        ) as HTMLSelectElement | null;
        if (sel) sel.value = String(playbackMultiplier);
      }

      // Reset simulation state.
      pausePlayback();
      clearSelectedScenario();
      routeProgressPct = 0;
      const slider = document.getElementById(
        "progress-slider"
      ) as HTMLInputElement | null;
      if (slider) slider.value = "0";

      syncMapRoute();

      // Attempt to load prepared event dataset.
      if (entry.prepared_events_url) {
        routeEventsState = { kind: "loading" };
        render();
        loadPreparedEventsForRoute(
          entry.id,
          entry.prepared_events_url,
          loadToken
        );
      } else {
        routeEventsState = { kind: "not_prepared" };
        render();
      }
    })
    .catch((e: unknown) => {
      if (!isRouteLoadCurrent(loadToken)) return;
      routeImportError = e instanceof Error ? e.message : String(e);
      render();
    });
}

/**
 * True when an OK (2xx) prepared-events response body looks like a missing
 * file rather than a real dataset. Covers the Vite dev-server SPA HTML
 * fallback (200 + index.html) and empty responses.
 *
 * Only called after confirming resp.ok — non-OK responses are classified
 * before this check so a 500/403 HTML error page is never marked "not prepared".
 *
 * WIP — NOT Product Canon. Stage 2 / Issue #93.
 */
function isPreparedEventsOkBodyMissing(
  resp: Response,
  bodyText: string
): boolean {
  const trimmed = bodyText.trim();
  if (trimmed.length === 0) return true;
  const contentType = (resp.headers.get("content-type") ?? "").toLowerCase();
  if (contentType.includes("text/html")) return true;
  const head = trimmed.slice(0, 32).toLowerCase();
  if (head.startsWith("<!doctype") || head.startsWith("<html")) return true;
  return false;
}

/**
 * Mark prepared events as not prepared (missing file — normal Stage 2 state).
 */
function setPreparedEventsNotPrepared(
  reason: string,
  eventsUrl: string,
  loadToken: number
): void {
  if (!isRouteLoadCurrent(loadToken)) return;
  console.debug(
    `[Route/Data] Prepared events not available (${reason}): ${eventsUrl}`
  );
  routeEventsState = { kind: "not_prepared" };
  render();
}

/**
 * Load the prepared route-scoped event dataset for a registry route.
 *
 * Called by loadRouteFromRegistry() after geometry loads successfully.
 * Route still functions if the dataset is missing or fails to validate.
 *
 * HTTP status classification (evaluated in order):
 *   1. 404              → not_prepared  (file not deployed yet — normal Stage 2)
 *   2. non-OK (non-404) → dataset error (server error, auth failure, etc.)
 *   3. OK + empty/HTML  → not_prepared  (Vite SPA fallback for missing asset)
 *   4. OK + non-JSON    → dataset error
 *   5. OK + bad schema  → dataset error
 *   6. OK + valid       → loaded
 *
 * Route geometry remains loaded in all cases.
 *
 * WIP — NOT Product Canon. Stage 2 / Issue #93.
 */
function loadPreparedEventsForRoute(
  routeId: string,
  eventsUrl: string,
  loadToken: number
): void {
  fetch(eventsUrl)
    .then(async (resp) => {
      if (!isRouteLoadCurrent(loadToken)) return null;

      // Step 1: 404 → not prepared (before reading body).
      if (resp.status === 404) {
        setPreparedEventsNotPrepared("HTTP 404", eventsUrl, loadToken);
        return null;
      }

      // Step 2: non-OK (and not 404) → dataset error.
      if (!resp.ok) {
        throw new Error(
          `Prepared events fetch failed: HTTP ${resp.status} (${eventsUrl})`
        );
      }

      // Step 3+: read body for OK responses.
      const bodyText = await resp.text();
      if (!isRouteLoadCurrent(loadToken)) return null;

      // Step 3: OK but SPA fallback / empty → not prepared.
      if (isPreparedEventsOkBodyMissing(resp, bodyText)) {
        setPreparedEventsNotPrepared(
          "file not found (SPA/empty response)",
          eventsUrl,
          loadToken
        );
        return null;
      }

      // Step 4: parse JSON.
      let parsed: unknown;
      try {
        parsed = JSON.parse(bodyText) as unknown;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(
          `[Route/Data] Prepared events dataset is not valid JSON (${eventsUrl}):`,
          msg
        );
        throw new Error(`Prepared events dataset is not valid JSON: ${msg}`);
      }

      return parsed;
    })
    .then((parsed) => {
      if (!isRouteLoadCurrent(loadToken) || parsed === null) return;
      if (activeRegistryRouteId !== routeId) return;
      // Step 5: schema + route_id validation.
      try {
        const dataset = parseRouteEventDataset(parsed);
        validateRouteEventDatasetRouteId(dataset, routeId);
        if (!isRouteLoadCurrent(loadToken) || activeRegistryRouteId !== routeId) {
          return;
        }
        // Step 6: success — update state, reset filter, render markers.
        routeEventsState = { kind: "loaded", dataset };
        // Reset filter to show all source labels for the new dataset (Issue #97).
        resetPreparedEventFilter();
        // Render prepared event markers on the map (Issue #97 / Stage 2).
        // Markers are candidate source observations — not applicability decisions,
        // not driver-facing eligibility, not three-circle control.
        setEventMarkers(dataset.events, preparedEventVisibleLabels);
        render();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(
          `[Route/Data] Prepared events dataset validation failed (${eventsUrl}):`,
          msg
        );
        throw new Error(`Prepared events dataset validation failed: ${msg}`);
      }
    })
    .catch((e: unknown) => {
      if (!isRouteLoadCurrent(loadToken) || activeRegistryRouteId !== routeId) {
        return;
      }
      const message = e instanceof Error ? e.message : String(e);
      routeEventsState = { kind: "error", message };
      render();
    });
}

// ---------------------------------------------------------------------------
// Rostov1 known-route loader (Issue #87 / Stage 2 route file intake)
//
// Loads the owner-provided Rostov1.geojson static asset bundled at
// public/routes/Rostov1.geojson (served as /routes/Rostov1.geojson).
//
// The file is a GeoJSON FeatureCollection containing one Feature with
// LineString geometry. Coordinates are [longitude, latitude] (WGS84,
// longitude-first). Parsed and normalized via parseUserGeoJsonRoute(),
// which handles FeatureCollection → first LineString feature extraction.
//
// Source file path (gitignored raw input):
//   data/raw/routes/Rostov1.geojson
// Bundled static asset path (tracked, served by Vite):
//   web/roadahead-emulator/public/routes/Rostov1.geojson
//
// Route geometry only — no event import, no speed limits, no provider data.
// NOT navigation. NOT routing. NOT Product Canon. NOT driver-facing UI.
// WIP — NOT Product Canon. (Issue #87 / Stage 2 known-route emulator)
// ---------------------------------------------------------------------------

/** Name used to identify the Rostov1 asset in provenance and UI. */
const ROSTOV1_ASSET_NAME = "Rostov1.geojson";

/** Path to the Rostov1 static asset, relative to the Vite public root. */
const ROSTOV1_ASSET_PATH = "./routes/Rostov1.geojson";

/**
 * Load the Rostov1 owner-provided route from the bundled static asset.
 *
 * Fetches /routes/Rostov1.geojson, parses as GeoJSON, and normalizes it
 * via parseUserGeoJsonRoute(). On success: sets activeRoute, clears error,
 * resets progress, clears scenario selection, pauses playback, and renders.
 * On any failure: sets routeImportError without modifying the active route.
 *
 * Route geometry only — not event data, not speed limits, not provider data.
 * NOT navigation. NOT routing. NOT Product Canon. NOT driver-facing UI.
 * WIP — NOT Product Canon. (Issue #87 / Stage 2 known-route emulator)
 */
function loadRostov1Route(): void {
  const loadToken = beginRouteLoad();
  fetch(ROSTOV1_ASSET_PATH)
    .then((resp) => {
      if (!isRouteLoadCurrent(loadToken)) return null;
      if (!resp.ok) {
        throw new Error(
          `Failed to fetch ${ROSTOV1_ASSET_NAME}: HTTP ${resp.status}`
        );
      }
      return resp.json() as Promise<unknown>;
    })
    .then((parsed) => {
      if (!isRouteLoadCurrent(loadToken) || parsed === null) return;
      const imported = parseUserGeoJsonRoute(parsed, ROSTOV1_ASSET_NAME);
      activeRoute = imported;
      activeRouteSource = { kind: "geojson", filename: ROSTOV1_ASSET_NAME };
      routeImportError = null;
      activeRegistryRouteId = null;
      routeEventsState = { kind: "not_loaded" };
      // Clear stale event markers on route change (Issue #97 / Stage 2).
      preparedEventVisibleLabels = new Set();
      clearEventMarkers();
      pausePlayback();
      clearSelectedScenario();
      routeProgressPct = 0;
      const slider = document.getElementById(
        "progress-slider"
      ) as HTMLInputElement | null;
      if (slider) slider.value = "0";
      syncMapRoute();
      render();
    })
    .catch((e: unknown) => {
      if (!isRouteLoadCurrent(loadToken)) return;
      routeImportError = e instanceof Error ? e.message : String(e);
      render();
    });
}

// ---------------------------------------------------------------------------
// Scenario selector helpers (Issue #70)
// ---------------------------------------------------------------------------

/** Look up a scenario by ID from SYNTHETIC_SCENARIOS. Returns null if not found. */
function findScenario(id: string): EmulatorScenario | null {
  return SYNTHETIC_SCENARIOS.find((s) => s.id === id) ?? null;
}

/**
 * Clear the selected scenario — revert to manual control.
 * Called when the user manually moves the progress slider or changes speed
 * after a scenario was applied, so the selector does not misleadingly claim
 * exact scenario state.
 */
function clearSelectedScenario(): void {
  selectedScenarioId = null;
  const sel = document.getElementById("scenario-select") as HTMLSelectElement | null;
  if (sel) sel.value = "";
}

// ---------------------------------------------------------------------------
// State computation
// ---------------------------------------------------------------------------

/**
 * Compute the current simulation state.
 *
 * Uses getActiveEventsForSim() to select the appropriate event source:
 *   - Synthetic/GeoJSON route → SYNTHETIC_PREPARED_EVENTS (unchanged).
 *   - Registry route + loaded prepared dataset → adapted RouteEvent[].
 *   - Registry route + missing/invalid dataset → [] (no events).
 *
 * This is the integration point for Issue #99: prepared route events now
 * drive the applicability/evaluation pipeline when a registry route with a
 * loaded prepared dataset is active.
 *
 * Synthetic scenario behavior is preserved — scenarios reset activeRegistryRouteId
 * to null, routing back to SYNTHETIC_PREPARED_EVENTS.
 *
 * WIP — NOT Product Canon. Stage 2 / Issue #99.
 */
function getState(): SimulationState {
  return computeSimulationState(
    routeProgressPct / 100,
    currentSpeedKmh,
    activeRoute,
    getActiveEventsForSim(),
    EMULATOR_TUNING_DEFAULTS
  );
}

// ---------------------------------------------------------------------------
// DOM construction
// ---------------------------------------------------------------------------

/**
 * Build the map-first Stage 2 simulator layout.
 *
 * Layout structure (Issue #91):
 *   - Compact top control bar: route status + quick Load Rostov1, progress
 *     slider, Play/Pause, speed controls, scenario selector.
 *   - Main simulator area: large real map (flex:1) + compact side panel with
 *     three-circle display, operator summary, and upcoming events strip.
 *   - Debug/verbose sections: pushed below the first viewport into collapsible
 *     <details> elements accessible by scrolling.
 *
 * All DOM IDs consumed by render functions and attachControls() are preserved:
 *   progress-slider, speed-input, speed-down-*, speed-up-*, playback-btn,
 *   playback-status, progress-display, scenario-select, op-route-info,
 *   three-circles, speed-ref-state-row, op-summary, upcoming-events-strip,
 *   route-import-section, scenario-inspector, evidence-snapshot, debug-section,
 *   emulator-map.
 *
 * EMULATOR OPERATOR / QA UI ONLY — NOT THE DRIVER-FACING UI.
 * Not final UX design. All values are WIP emulator defaults — not Canon.
 * Issue #91 / Stage 2 — map-first simulator layout baseline.
 */
function buildApp(): void {
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) throw new Error("Root #app element not found");

  const scenarioOptions = SYNTHETIC_SCENARIOS.map(
    (s) =>
      `<option value="${escapeHtml(s.id)}">${escapeHtml(s.id)} — ${escapeHtml(s.title)}</option>`
  ).join("\n");

  app.innerHTML = `
    <!-- ── Compact simulator top control bar ────────────────────────────── -->
    <!--
      Issue #93 / Stage 2: Top bar is reserved for movement/playback/speed controls only.
      Route selection lives in the right-side Route/Data panel.
      Scenario selector moved to the debug Scenario Inspector collapsible section.
    -->
    <div id="sim-topbar" class="sim-topbar" aria-label="Simulator control bar — emulator debug / QA only">

      <!-- Row 1: identity + WIP badge only -->
      <div class="sim-topbar-row sim-topbar-title-row">
        <span class="sim-topbar-title">RoadAhead P0 · Emulator</span>
        <span class="sim-topbar-wip-badge">debug / QA only — not driver-facing UI</span>
      </div>

      <!-- Row 2: progress, playback, speed controls ONLY -->
      <div class="sim-topbar-row sim-topbar-controls-row">
        <div class="sim-topbar-group sim-topbar-progress-group">
          <label for="progress-slider" class="sim-label">Progress</label>
          <input type="range" id="progress-slider" min="0" max="100" value="0" step="1" class="sim-slider">
          <span id="progress-display" class="sim-progress-val">0%</span>
        </div>
        <div class="sim-topbar-group sim-topbar-playback-group">
          <button id="playback-btn" type="button" class="sim-btn sim-btn-play">&#9654; Play</button>
          <span id="playback-status" class="sim-playback-status">paused</span>
          <select id="playback-multiplier-select" class="sim-multiplier-select"
            title="Playback speed multiplier — scales simulated vehicle speed for faster route traversal. WIP emulator only, not navigation, not ETA.">
            <option value="10">10&#215;</option>
            <option value="25">25&#215;</option>
            <option value="50">50&#215;</option>
            <option value="100" selected>100&#215;</option>
            <option value="150">150&#215;</option>
          </select>
          <span class="sim-label" title="Simulation speed multiplier">sim</span>
        </div>
        <div class="sim-topbar-sep" aria-hidden="true"></div>
        <div class="sim-topbar-group">
          <span class="sim-label">Speed</span>
          <div class="sim-speed-group">
            <button id="speed-down-10" type="button" class="sim-btn sim-btn-sm">&#8722;10</button>
            <button id="speed-down-1" type="button" class="sim-btn sim-btn-sm">&#8722;1</button>
            <input type="number" id="speed-input" value="60" min="0" max="250" step="1" class="sim-speed-input">
            <button id="speed-up-1" type="button" class="sim-btn sim-btn-sm">+1</button>
            <button id="speed-up-10" type="button" class="sim-btn sim-btn-sm">+10</button>
            <span class="sim-unit">km/h</span>
          </div>
        </div>
      </div>

    </div>

    <!-- ── Main simulator viewport: map (primary) + compact side panel ─── -->
    <div id="sim-main" class="sim-main">

      <!-- Real map — primary working surface (Issue #88 / Stage 2) -->
      <!-- Map data © OpenStreetMap contributors (ODbL). Attribution kept visible. -->
      <div id="emulator-map" class="emulator-map" aria-label="Route map — emulator spatial evaluation, debug only"></div>

      <!-- Compact side panel: Route/Data + three circles + op summary + upcoming events -->
      <div id="sim-panel" class="sim-panel">

        <!-- Route/Data panel — primary route selection (Issue #93 / Stage 2) -->
        <!-- Route is the load unit: selecting a route loads geometry + prepared events. -->
        <div id="route-data-panel" class="sim-panel-section sim-panel-route-data-wrap"></div>

        <div class="sim-panel-section sim-panel-circles-wrap">
          <div class="three-circles" id="three-circles"></div>
          <p class="speed-ref-state-row" id="speed-ref-state-row"></p>
        </div>

        <div class="sim-panel-section sim-panel-summary-wrap">
          <div class="op-summary" id="op-summary"></div>
        </div>

        <div class="sim-panel-section sim-panel-upcoming-wrap" id="upcoming-events-strip"></div>

        <div class="sim-panel-map-credit">
          Map: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OSM contributors</a>
          (ODbL) · spatial eval only · not navigation
        </div>

      </div>
    </div>

    <!-- ── Verbose / debug sections — below main viewport, collapsible ── -->
    <div class="sim-debug-area">

      <details class="sim-details">
        <summary class="sim-details-summary">Route Import / File Controls
          <span class="sim-details-badge">geometry only · not navigation · not Canon</span>
        </summary>
        <div id="route-import-section" class="route-import-section"></div>
      </details>

      <!-- Scenario Inspector: includes scenario selector (moved from top bar, Issue #93) -->
      <details class="sim-details">
        <summary class="sim-details-summary">Scenario Inspector
          <span class="sim-details-badge">debug / QA only · synthetic scenarios · selector moved here</span>
        </summary>
        <div class="sim-details-scenario-selector-row">
          <label for="scenario-select" class="sim-label">Scenario:</label>
          <select id="scenario-select" class="sim-scenario-select">
            <option value="">&#8211;&#8211; none / manual &#8211;&#8211;</option>
            ${scenarioOptions}
          </select>
          <span class="sim-details-badge">WIP · QA only · not Canon</span>
        </div>
        <div id="scenario-inspector" class="scenario-inspector-section"></div>
      </details>

      <details class="sim-details">
        <summary class="sim-details-summary">Evidence Snapshot
          <span class="sim-details-badge">manual QA · not Canon</span>
        </summary>
        <div id="evidence-snapshot" class="evidence-snapshot-section"></div>
      </details>

      <details class="sim-details" id="diag-details">
        <summary class="sim-details-summary">Lifecycle / Order Diagnostics
          <span class="sim-details-badge">Issue #102 · diagnostics only · no behavior changes · WIP</span>
        </summary>
        <div id="diag-section" class="diag-section"></div>
      </details>

      <details class="sim-details">
        <summary class="sim-details-summary">Debug Panel &#8212; Event Selection
          <span class="sim-details-badge">not driver-facing · WIP</span>
        </summary>
        <div id="debug-section" class="debug-section"></div>
      </details>

      <details class="sim-details">
        <summary class="sim-details-summary">Product Canon Guardrails</summary>
        <div class="canon-guardrails sim-details-content">
          <ul>
            <li>RoadAhead is <strong>not</strong> a navigator.</li>
            <li>RoadAhead is <strong>not</strong> an anti-radar.</li>
            <li>RoadAhead is <strong>not</strong> a legal speed-limit authority.</li>
            <li>RoadAhead is <strong>not</strong> safety-certified.</li>
            <li>External road-event data is <strong>candidate input only</strong>, not verified RoadAhead truth.</li>
            <li>Raw Datakam / OpenSpeedcam data is <strong>import / source material only</strong>.</li>
            <li>Route providers may supply <strong>geometry only</strong>; provider non-geometry signals are not RoadAhead truth.</li>
            <li><strong>No numeric tuning value is Product Canon</strong> at this stage.</li>
            <li>Projection values and direction compatibility values shown in the debug panel are <strong>per-session derived data only</strong> — not persisted to base fixture files.</li>
            <li>Direction compatibility shown is a <strong>WIP baseline (Slice 4.2)</strong> — candidate semantics only. Branch/ramp/parallel-carriageway ambiguity handling is deferred to later child issues.</li>
            <li>Applicability reason codes (Slice 4.3) are <strong>per-session derived WIP debug data, not Product Canon</strong>. Full reason taxonomy is deferred to later child issues under Issue #48.</li>
            <li>The debug accepted/suppressed grouping (Slice 4.4) reflects the simplified Slices 4.1–4.3 baseline only — <strong>debug visibility does not imply driver-facing eligibility</strong>.</li>
            <li>Source direction fields (<code>source_direction_deg</code>, <code>source_dirtype</code>) are <strong>candidate metadata only</strong> — not verified truth. (event-applicability Canon truth 8)</li>
          </ul>
          <p class="authority-note">
            <strong>Product Canon is the primary authority.</strong>
            See <code>docs/product/areas/</code> in the repository.
            This emulator is a WIP validation / QA tool.
          </p>
        </div>
      </details>

      <section class="wip-notice sim-debug-wip-notice">
        <strong>Emulator debug / QA tool only &#8212; NOT the driver-facing UI.</strong>
        Not a navigator. Not an anti-radar. Not a legal speed-limit authority.
        Not safety-certified. All numeric values are WIP emulator defaults, not Product Canon.
        Uses <strong>synthetic fixtures only</strong> &#8212; no provider, no network, no account required.
      </section>

    </div>
  `;

  // Cache the initial route length for route-length-based playback (Issue #91 fixes).
  updateActiveRouteLength();

  attachControls();
  render();

  // Initialize the Leaflet map after the DOM is built and initial render is done.
  // initMap() is a no-op if called again (guard on map instance).
  // Issue #88 / Stage 2 — map is spatial evaluation surface, not navigation.
  initMap("emulator-map", activeRoute);

  // Load the route registry after the app is built and initial render is complete.
  // Registry populates the Route/Data panel selector. Emulator works without it.
  // Issue #93 / Stage 2 — registry-based route selection.
  loadRouteRegistry();
}

// ---------------------------------------------------------------------------
// Playback helpers (Issue #77 / Slice 4.8)
//
// startPlayback / pausePlayback / tickPlayback advance routeProgressPct
// through the existing render() path. No new simulation state is created.
//
// EMULATOR OPERATOR / QA UI ONLY — NOT THE DRIVER-FACING UI.
// WIP / not Product Canon. Not a navigator. Not ETA. Not routing.
// ---------------------------------------------------------------------------

/**
 * Advance route progress on each animation frame while playing.
 *
 * Uses route-length-based progression (Issue #91 fixes):
 *   progress_delta_pct =
 *     (currentSpeedKmh × playbackMultiplier × deltaSeconds / 3600) / routeLengthKm × 100
 *
 * Falls back to a minimal 0.1% / s advance if activeRouteLengthKm is zero
 * (degenerate route) to prevent a divide-by-zero stuck state.
 *
 * Delta time keeps advancement physically consistent regardless of frame rate.
 *
 * WIP emulator only — NOT navigation, NOT ETA, NOT routing, NOT Product Canon.
 */
function tickPlayback(timestamp: DOMHighResTimeStamp): void {
  if (!isPlaying) return;

  if (playbackLastTimestamp !== 0) {
    const deltaSeconds = (timestamp - playbackLastTimestamp) / 1000;

    // Route-length-based progression: physical speed × multiplier → % advance.
    const routeLengthKm = activeRouteLengthKm > 0 ? activeRouteLengthKm : 1;
    const progressDeltaPct =
      (currentSpeedKmh * playbackMultiplier * deltaSeconds) / 3600 / routeLengthKm * 100;

    routeProgressPct = Math.min(100, routeProgressPct + progressDeltaPct);

    // Sync the progress slider DOM value (integer snap for slider thumb).
    const slider = document.getElementById(
      "progress-slider"
    ) as HTMLInputElement | null;
    if (slider) slider.value = String(Math.round(routeProgressPct));

    render();

    if (routeProgressPct >= 100) {
      pausePlayback();
      return;
    }
  }

  playbackLastTimestamp = timestamp;
  playbackAnimFrameId = requestAnimationFrame(tickPlayback);
}

/** Start playback from the current routeProgressPct. */
function startPlayback(): void {
  if (isPlaying) return;
  if (routeProgressPct >= 100) {
    // Already at end — reset to 0 so Play is useful.
    routeProgressPct = 0;
    const slider = document.getElementById(
      "progress-slider"
    ) as HTMLInputElement | null;
    if (slider) slider.value = "0";
  }
  isPlaying = true;
  playbackLastTimestamp = 0;
  playbackAnimFrameId = requestAnimationFrame(tickPlayback);
  renderPlaybackStatus();
}

/** Pause playback and cancel any pending animation frame. */
function pausePlayback(): void {
  if (!isPlaying && playbackAnimFrameId === 0) return;
  isPlaying = false;
  if (playbackAnimFrameId !== 0) {
    cancelAnimationFrame(playbackAnimFrameId);
    playbackAnimFrameId = 0;
  }
  playbackLastTimestamp = 0;
  renderPlaybackStatus();
}

/** Toggle between play and pause. */
function togglePlayback(): void {
  if (isPlaying) {
    pausePlayback();
  } else {
    startPlayback();
  }
}

/**
 * Update the Play/Pause button label and status text to reflect isPlaying.
 * Uses textContent — does NOT recreate DOM nodes, so focus is preserved.
 */
function renderPlaybackStatus(): void {
  const btn = document.getElementById(
    "playback-btn"
  ) as HTMLButtonElement | null;
  const statusEl = document.getElementById("playback-status");
  if (btn) btn.textContent = isPlaying ? "⏸ Pause" : "▶ Play";
  if (statusEl)
    statusEl.textContent = isPlaying ? "running" : "paused";
}

// ---------------------------------------------------------------------------
// Control wiring
// ---------------------------------------------------------------------------

function attachControls(): void {
  const progressSlider = document.getElementById(
    "progress-slider"
  ) as HTMLInputElement | null;
  const speedInputEl = document.getElementById(
    "speed-input"
  ) as HTMLInputElement | null;

  progressSlider?.addEventListener("input", () => {
    pausePlayback();
    clearSelectedScenario();
    routeProgressPct = parseInt(progressSlider.value, 10);
    render();
  });

  speedInputEl?.addEventListener("change", () => {
    const val = parseInt(speedInputEl.value, 10);
    if (!isNaN(val)) {
      // Fix 3 (Issue #91): do NOT pause playback on speed change.
      // Playback continues with the updated currentSpeedKmh.
      clearSelectedScenario();
      currentSpeedKmh = clampSpeed(val);
      speedInputEl.value = String(currentSpeedKmh);
      render();
    }
  });

  document
    .getElementById("speed-down-10")
    ?.addEventListener("click", () => adjustSpeed(-10));
  document
    .getElementById("speed-down-1")
    ?.addEventListener("click", () => adjustSpeed(-1));
  document
    .getElementById("speed-up-1")
    ?.addEventListener("click", () => adjustSpeed(1));
  document
    .getElementById("speed-up-10")
    ?.addEventListener("click", () => adjustSpeed(10));

  // ── Playback button (Issue #77 / Slice 4.8) ─────────────────────────────
  document
    .getElementById("playback-btn")
    ?.addEventListener("click", togglePlayback);

  // ── Playback multiplier selector (Issue #91 fixes) ────────────────────────
  // Updates playbackMultiplier immediately; running playback picks up the new
  // value on the next tickPlayback() call without restart.
  // WIP emulator control — NOT navigation, NOT ETA, NOT Product Canon.
  const multiplierSelectEl = document.getElementById(
    "playback-multiplier-select"
  ) as HTMLSelectElement | null;
  multiplierSelectEl?.addEventListener("change", () => {
    const val = parseInt(multiplierSelectEl.value, 10);
    if (!isNaN(val) && val > 0) {
      playbackMultiplier = val;
    }
  });

  // ── Scenario selector (Issue #70) ──────────────────────────────────────
  // Selecting a scenario applies routeProgressFraction and speedKmh from
  // the scenario definition, then triggers a full render.
  // Choosing "–– none / manual ––" reverts to manual control.
  // Selecting a scenario pauses playback so the fixed position is stable.
  // Selecting a scenario resets active route to synthetic route, because
  // scenario expectations are tied to the synthetic fixture (Issue #79).
  // WIP — NOT Product Canon.
  const scenarioSelectEl = document.getElementById(
    "scenario-select"
  ) as HTMLSelectElement | null;
  scenarioSelectEl?.addEventListener("change", () => {
    pausePlayback();
    const id = scenarioSelectEl.value;
    if (!id) {
      selectedScenarioId = null;
      render();
      return;
    }
    const scenario = findScenario(id);
    if (!scenario) return;
    // Reset to synthetic route: scenario expectations are tied to synthetic fixture.
    resetToSyntheticRoute();
    syncMapRoute();
    selectedScenarioId = id;
    routeProgressPct = Math.round(scenario.routeProgressFraction * 100);
    currentSpeedKmh = scenario.speedKmh;
    const slider = document.getElementById(
      "progress-slider"
    ) as HTMLInputElement | null;
    if (slider) slider.value = String(routeProgressPct);
    const speedEl = document.getElementById(
      "speed-input"
    ) as HTMLInputElement | null;
    if (speedEl) speedEl.value = String(currentSpeedKmh);
    render();
  });

}

// ---------------------------------------------------------------------------
// Route import listener helpers (Issue #79 / Slice 4.10 — listener fix)
//
// Route import controls are recreated on every render() call because
// renderRouteImportSection() sets section.innerHTML. Attaching listeners
// once in attachControls() would wire stale nodes that are discarded on the
// first render(). Instead, these named handler functions are wired to fresh
// nodes after each innerHTML update via attachRouteImportListeners().
//
// Route geometry only — no event import, no speed limits, no provider data.
// NOT navigation. NOT routing. NOT provider data. NOT Product Canon.
// ---------------------------------------------------------------------------

/**
 * Handle a change event on the GeoJSON file input.
 *
 * Reads the selected file, parses it as GeoJSON, and either:
 *   - success: sets activeRoute, resets progress, clears scenario, pauses, renders;
 *   - error: sets routeImportError (parse/validation), preserves current route, renders.
 *
 * Route geometry import — Issue #79 / Slice 4.10.
 */
function handleGeoJsonFileInputChange(input: HTMLInputElement): void {
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    const text = evt.target?.result;
    if (typeof text !== "string") {
      routeImportError = "Failed to read file contents.";
      render();
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      routeImportError = `JSON parse error: ${e instanceof Error ? e.message : String(e)}`;
      render();
      return;
    }
    try {
      const imported = parseUserGeoJsonRoute(parsed, file.name);
      // Success: set active route, reset progress, clear scenario, pause.
      beginRouteLoad();
      activeRoute = imported;
      activeRouteSource = { kind: "geojson", filename: file.name };
      routeImportError = null;
      activeRegistryRouteId = null;
      routeEventsState = { kind: "not_loaded" };
      // Clear stale event markers on route change (Issue #97 / Stage 2).
      preparedEventVisibleLabels = new Set();
      clearEventMarkers();
      pausePlayback();
      clearSelectedScenario();
      routeProgressPct = 0;
      const slider = document.getElementById(
        "progress-slider"
      ) as HTMLInputElement | null;
      if (slider) slider.value = "0";
      syncMapRoute();
      render();
    } catch (e) {
      routeImportError = e instanceof Error ? e.message : String(e);
      render();
    }
    // Reset file input so the same file can be re-loaded if needed.
    input.value = "";
  };
  reader.readAsText(file);
}

/**
 * Handle a click on the "Reset to synthetic route" button.
 *
 * Resets activeRoute to SYNTHETIC_ROUTE, clears import error,
 * pauses playback, clears selected scenario, and resets progress to 0.
 *
 * Route geometry reset — Issue #79 / Slice 4.10.
 */
function handleResetToSyntheticRouteClick(): void {
  resetToSyntheticRoute();
  pausePlayback();
  clearSelectedScenario();
  routeProgressPct = 0;
  const slider = document.getElementById(
    "progress-slider"
  ) as HTMLInputElement | null;
  if (slider) slider.value = "0";
  syncMapRoute();
  render();
}

/**
 * Attach route import listeners to freshly rendered controls inside `section`.
 *
 * Must be called after section.innerHTML is set (nodes are freshly created).
 * Queries controls from the section element to avoid stale document lookups.
 *
 * Called at the end of renderRouteImportSection() on every render cycle,
 * because innerHTML replacement discards all previously attached listeners.
 * This is the same pattern used by attachDebugFilterListeners().
 *
 * Route geometry import — Issue #79 / Slice 4.10.
 */
function attachRouteImportListeners(section: HTMLElement): void {
  const fileInput = section.querySelector<HTMLInputElement>(
    "#geojson-file-input"
  );
  fileInput?.addEventListener("change", () => {
    handleGeoJsonFileInputChange(fileInput);
  });

  const resetBtn = section.querySelector<HTMLButtonElement>(
    "#reset-to-synthetic-btn"
  );
  resetBtn?.addEventListener("click", handleResetToSyntheticRouteClick);

  // Rostov1 known-route loader button (Issue #87 / Stage 2 route file intake).
  const rostov1Btn = section.querySelector<HTMLButtonElement>(
    "#load-rostov1-btn"
  );
  rostov1Btn?.addEventListener("click", loadRostov1Route);
}

function clampSpeed(v: number): number {
  return Math.max(0, Math.min(250, v));
}

function adjustSpeed(delta: number): void {
  // Fix 3 (Issue #91): do NOT pause playback on speed change.
  // Playback continues at the new speed immediately (route-length-based delta
  // uses currentSpeedKmh on every tick, so the change takes effect instantly).
  clearSelectedScenario();
  currentSpeedKmh = clampSpeed(currentSpeedKmh + delta);
  const el = document.getElementById("speed-input") as HTMLInputElement | null;
  if (el) el.value = String(currentSpeedKmh);
  render();
}

// ---------------------------------------------------------------------------
// Render cycle
//
// NOTE: renderThreeCircles and renderDebugPanel are kept as flat functions in
// this file for simplicity. If the UI grows significantly in later slices,
// consider extracting them to dedicated rendering modules under src/ui/.
// Do not refactor now.
// ---------------------------------------------------------------------------

function render(): void {
  const state = getState();
  updateProgressDisplay();
  renderPlaybackStatus();
  renderRouteDataPanel();
  renderThreeCircles(state);
  renderOperatorHeader(state);
  renderUpcomingEventsStrip(state);
  renderRouteImportSection();
  renderScenarioInspector();
  renderEvidenceSnapshot(state);
  // Update lifecycle/order departure tracking before rendering diagnostics
  // (Issue #102 / Stage 2 — diagnostics only, no selection behavior change).
  updateDiagDepartures(state);
  renderDiagnosticsPanel(state);
  renderDebugPanel(state);
  // Refresh previous primary/next IDs for next render tick departure detection.
  diagPrevPrimaryId = state.eventSelection.primary?.event_id ?? null;
  diagPrevNextId = state.eventSelection.secondary?.event_id ?? null;

  // Update the map vehicle marker on every render cycle.
  // Position is projection-derived per-session — not GPS, not provider data.
  // Issue #88 / Stage 2 — spatial evaluation surface only, not navigation.
  updateVehicleMarker(
    state.vehicleRoutePosition.projected_lat,
    state.vehicleRoutePosition.projected_lon
  );

  // Update prepared event marker evaluation state overlay (Issue #99 / Stage 2).
  // Only when prepared route events are the active source — synthetic mode
  // does not push eval states to map markers (no prepared markers exist).
  //
  // WIP debug overlay — NOT Product Canon. NOT driver-facing. NOT safety signal.
  if (deriveEventSourceMode().kind === "prepared_route") {
    const evalStateMap = buildMarkerEvalStateMap(state);
    updateEventMarkerEvaluationStates(evalStateMap);
  }
}

// ---------------------------------------------------------------------------
// Route length computation (Issue #91 fixes — route-length-based playback)
//
// Haversine arc-length is used to convert physical speed + multiplier into
// a route-progress delta. This is a WIP emulator approximation — it does not
// account for road curvature beyond the route waypoints, elevation, or any
// real-world navigation semantics. NOT Product Canon.
// ---------------------------------------------------------------------------

/**
 * Haversine distance in kilometres between two WGS84 coordinate pairs.
 * WIP emulator utility. NOT navigation. NOT routing. NOT Product Canon.
 */
function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Compute the total arc-length of a RouteGeometry in kilometres.
 *
 * Sums haversine segment distances across all consecutive waypoint pairs.
 * Returns 0 for routes with fewer than 2 waypoints.
 *
 * WIP emulator utility — NOT navigation, NOT routing, NOT Product Canon.
 */
function computeRouteLengthKm(route: typeof activeRoute): number {
  const coords = route.coordinates;
  if (coords.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const [lon1, lat1] = coords[i - 1];
    const [lon2, lat2] = coords[i];
    total += haversineKm(lat1, lon1, lat2, lon2);
  }
  return total;
}

/**
 * Cache the arc-length of the current activeRoute in activeRouteLengthKm.
 * Called after activeRoute is updated and in buildApp() on first load.
 * WIP emulator — NOT Product Canon.
 */
function updateActiveRouteLength(): void {
  activeRouteLengthKm = computeRouteLengthKm(activeRoute);
}

/**
 * Update the map route polyline and reset the vehicle marker when the active
 * route changes (GeoJSON import, Rostov1 load, or synthetic reset).
 *
 * Called after activeRoute is updated, before render().
 * Also refreshes the cached activeRouteLengthKm for playback progression.
 *
 * Issue #88 / Stage 2 — geometry display only, not provider truth.
 * Issue #91 fixes — route length cache update.
 * NOT Product Canon.
 */
function syncMapRoute(): void {
  setMapRoute(activeRoute);
  updateActiveRouteLength();
}

function updateProgressDisplay(): void {
  const el = document.getElementById("progress-display");
  if (el) el.textContent = `${routeProgressPct.toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// Event-type-aware display semantics (Issue #76)
//
// UI-only helper — does NOT influence event selection, eligibility, projection,
// direction compatibility, or scenario sweep logic.
//
// Maps normalized_type to concise advisory display labels for:
//   renderThreeCircles(), renderOperatorHeader(), buildEvidenceSnapshotMarkdown()
//
// WIP / emulator QA display only — NOT Product Canon.
// Not legal guidance, not safety-certified.
// ---------------------------------------------------------------------------

type EventDisplaySemantics = {
  /** Short advisory label shown in the primary circle and operator header */
  primaryAdvisoryLabel: string;
  /** Whether this event type carries a meaningful numeric target speed */
  hasTargetSpeed: boolean;
  /** Text shown in the target-speed slot when hasTargetSpeed is false */
  noSpeedLabel: string;
  /** Tooltip for the primary event circle */
  circleTitle: string;
  /**
   * Prefix for the speed-reference / event-context state row below the circles.
   * "Speed reference state" for speed_limit; "Event context state" for others.
   */
  refStatePrefix: string;
};

/**
 * Return display-only semantics for a given normalized event type.
 *
 * Handles: speed_limit, static_camera, road_bump.
 * Falls back gracefully for unknown types — no crash, no fake speed shown.
 *
 * UI-only helper. Zero domain logic. Issue #76.
 */
function getEventDisplaySemantics(
  normalizedType: string | null | undefined
): EventDisplaySemantics {
  switch (normalizedType) {
    case "speed_limit":
      return {
        primaryAdvisoryLabel: "Speed limit advisory",
        hasTargetSpeed: true,
        noSpeedLabel: "no target speed",
        circleTitle: "Primary applicable event — speed limit advisory",
        refStatePrefix: "Speed reference state",
      };
    case "static_camera":
      return {
        primaryAdvisoryLabel: "Camera advisory",
        hasTargetSpeed: false,
        noSpeedLabel: "no target speed",
        circleTitle:
          "Primary applicable event — camera advisory (no target speed)",
        refStatePrefix: "Event context state",
      };
    case "road_bump":
      return {
        primaryAdvisoryLabel: "Road hazard advisory",
        hasTargetSpeed: false,
        noSpeedLabel: "no target speed",
        circleTitle:
          "Primary applicable event — road bump / hazard advisory (no target speed)",
        refStatePrefix: "Event context state",
      };
    default:
      return {
        primaryAdvisoryLabel: "Event advisory",
        hasTargetSpeed: false,
        noSpeedLabel: "no target speed",
        circleTitle: "Primary applicable event — advisory context",
        refStatePrefix: "Event context state",
      };
  }
}

// ---------------------------------------------------------------------------
// Three-circle display
// ---------------------------------------------------------------------------

function renderThreeCircles(state: SimulationState): void {
  const container = document.getElementById("three-circles");
  if (!container) return;

  const { primary, secondary } = state.eventSelection;
  const refState = state.speedReference.state;

  const primarySemantics = getEventDisplaySemantics(primary?.normalized_type);
  const secondarySemantics = getEventDisplaySemantics(secondary?.normalized_type);

  // Speed value: only show numeric target speed for speed_limit events that
  // carry one. All other event types display "–" — no fake speed is shown.
  const primaryValueText =
    primary == null
      ? "–"
      : primarySemantics.hasTargetSpeed && primary.target_speed_kmh != null
        ? String(primary.target_speed_kmh)
        : "–";

  // Circle bottom label: type-aware advisory label + event id sublabel.
  const primaryBottomLabel =
    primary != null
      ? `${escapeHtml(primarySemantics.primaryAdvisoryLabel)}<br><span class="circle-sublabel">${escapeHtml(primary.event_id)}</span>`
      : `no applicable event`;

  const secondaryValueText =
    secondary == null
      ? "–"
      : secondarySemantics.hasTargetSpeed && secondary.target_speed_kmh != null
        ? String(secondary.target_speed_kmh)
        : "–";

  const secondaryBottomLabel =
    secondary != null
      ? `${escapeHtml(secondarySemantics.primaryAdvisoryLabel)}<br><span class="circle-sublabel">next: ${escapeHtml(secondary.event_id)}</span>`
      : "–";

  const primaryActiveClass =
    refState === "approach_target" ? "circle-state-active" : "circle-state-inactive";

  container.innerHTML = `
    <div class="circle circle-current" title="Simulated current speed (manual control)">
      <div class="circle-value">${state.speedKmh}</div>
      <div class="circle-label">current speed<br><span class="circle-unit">km/h</span></div>
    </div>

    <div class="circle circle-primary ${primaryActiveClass}" title="${escapeHtml(primarySemantics.circleTitle)}">
      <div class="circle-value">${primaryValueText}</div>
      <div class="circle-label">${primaryBottomLabel}</div>
    </div>

    <div class="circle circle-secondary" title="Secondary context — next event inside simplified candidate window (not global next event; full secondary semantics are WIP)">
      <div class="circle-value">${secondaryValueText}</div>
      <div class="circle-label">${secondaryBottomLabel}</div>
    </div>
  `;

  const stateRow = document.getElementById("speed-ref-state-row");
  if (stateRow) {
    const stateClass =
      refState === "approach_target" ? "state-approach-target" : "state-unknown";
    stateRow.innerHTML =
      `${escapeHtml(primarySemantics.refStatePrefix)}: ` +
      `<strong class="${stateClass}">${escapeHtml(refState)}</strong> — ` +
      `<span class="state-reason">${escapeHtml(state.speedReference.reason)}</span>`;
  }
}

// ---------------------------------------------------------------------------
// Operator header — sticky summary (Slice 4.6 / Issue #63)
//
// EMULATOR OPERATOR / QA UI ONLY — NOT THE DRIVER-FACING UI.
// The sticky header summarises the live simulation state so the operator can
// monitor primary event, speed reference state, target speed, and event
// selection counts while scrolling the debug table below.
//
// All values are derived from SimulationState and are WIP emulator defaults —
// not Product Canon. No domain logic is duplicated here.
// ---------------------------------------------------------------------------

/**
 * Derive accepted / suppressed / not_processed counts from simulation state.
 *
 * Uses applicabilityReason.kind from each EventSelectionRecord.
 * Counts match the debug table grouping exactly.
 *
 * EMULATOR DEBUG / QA ONLY — not driver-facing.
 */
function getEventSelectionSummary(state: SimulationState): {
  acceptedCount: number;
  suppressedCount: number;
  notProcessedCount: number;
} {
  const records = state.eventSelection.records;
  return {
    acceptedCount: records.filter((r) => r.applicabilityReason.kind === "accepted").length,
    suppressedCount: records.filter((r) => r.applicabilityReason.kind === "suppressed").length,
    notProcessedCount: records.filter((r) => r.applicabilityReason.kind === "not_processed").length,
  };
}

/**
 * Render the live summary strip inside the sticky operator header.
 *
 * Updates #op-summary with:
 *   - primary event id (or "none")
 *   - speed reference state
 *   - target speed if any
 *   - accepted / suppressed / not_processed counts
 *   - current primary reason code if available
 *
 * All values are derived from SimulationState. No domain logic is duplicated.
 *
 * EMULATOR OPERATOR / QA UI ONLY — NOT THE DRIVER-FACING UI.
 * Not final UX design. All values are WIP emulator defaults — not Canon.
 */
function renderOperatorHeader(state: SimulationState): void {
  const summaryEl = document.getElementById("op-summary");
  if (!summaryEl) return;

  const { primary, secondary } = state.eventSelection;
  const refState = state.speedReference.state;
  const targetSpeed = state.speedReference.target_speed_kmh;
  const { acceptedCount, suppressedCount, notProcessedCount } =
    getEventSelectionSummary(state);

  // Find the selected primary record to extract reason code and distance.
  const primaryRecord = primary
    ? state.eventSelection.records.find((r) => r.event_id === primary.event_id)
    : null;
  const reasonCode = primaryRecord?.applicabilityReason.code ?? null;
  const primaryDistM = primaryRecord?.distance_m ?? null;

  // Find the secondary record to extract distance.
  const secondaryRecord = secondary
    ? state.eventSelection.records.find((r) => r.event_id === secondary.event_id)
    : null;
  const secondaryDistM = secondaryRecord?.distance_m ?? null;

  // Type-aware display semantics — UI only, no domain logic.
  const primarySemantics = getEventDisplaySemantics(primary?.normalized_type);

  // Event source mode — shown in summary for traceability (Issue #99 / Stage 2).
  const evSourceMode = deriveEventSourceMode();
  const evSourceModeClass =
    evSourceMode.kind === "prepared_route"
      ? "op-source-prepared"
      : evSourceMode.kind === "no_prepared"
        ? "op-source-no-prepared"
        : "op-source-synthetic";
  const evSourceHtml = `
    <div class="op-summary-item op-summary-item-source">
      <span class="op-summary-label">Event source</span>
      <span class="op-summary-value ${evSourceModeClass}">${escapeHtml(eventSourceLabel(evSourceMode))}</span>
    </div>`;

  const primaryIdHtml = primary
    ? `<code class="op-summary-event-id">${escapeHtml(primary.event_id)}</code>`
    : `<em class="op-summary-none">none</em>`;

  // Primary distance
  const primaryDistHtml =
    primaryDistM != null
      ? `<span class="op-summary-dist">&nbsp;· ${primaryDistM.toFixed(0)} m ahead</span>`
      : "";

  // Source label for primary event — show source_type_label (primary) and raw_type
  // per #95 display contract when the event was adapted from a prepared RouteEvent.
  const primarySourceLabelHtml = primary?.route_source_type_label
    ? `<div class="op-summary-item">
        <span class="op-summary-label">Source label</span>
        <span class="op-summary-value op-summary-source-label">${escapeHtml(primary.route_source_type_label)}</span>
        <span class="op-summary-source-raw">&nbsp;(raw: ${escapeHtml(primary.raw_type ?? "—")})</span>
      </div>`
    : "";

  // Normalized type context.
  const normTypeHtml = primary
    ? `<div class="op-summary-item">
        <span class="op-summary-label">Norm. type</span>
        <span class="op-summary-value op-summary-context-type">${escapeHtml(primary.normalized_type)}</span>
      </div>`
    : "";

  // Target speed: show numeric value for speed_limit; "no target speed" for others.
  const targetHtml =
    primarySemantics.hasTargetSpeed && targetSpeed != null
      ? `<span class="op-summary-target-speed">${targetSpeed} km/h</span>`
      : primarySemantics.hasTargetSpeed
        ? `<em class="op-summary-none">–</em>`
        : `<em class="op-summary-no-speed">${escapeHtml(primarySemantics.noSpeedLabel)}</em>`;

  const stateClass = refState === "approach_target"
    ? "op-state-approach-target"
    : "op-state-unknown";

  const reasonHtml = reasonCode
    ? `<div class="op-summary-item">
        <span class="op-summary-label">Reason code</span>
        <code class="op-summary-value op-reason-code">${escapeHtml(reasonCode)}</code>
      </div>`
    : "";

  // Next event summary (secondary candidate) — Issue #99 / Stage 2.
  let nextHtml = "";
  if (secondary) {
    const nextIdHtml = `<code class="op-summary-event-id">${escapeHtml(secondary.event_id)}</code>`;
    const nextSourceLabel = secondary.route_source_type_label
      ? `<span class="op-summary-source-label">${escapeHtml(secondary.route_source_type_label)}</span>`
      : `<span class="op-summary-context-type">${escapeHtml(secondary.normalized_type)}</span>`;
    const nextDistHtml =
      secondaryDistM != null
        ? `&nbsp;· ${secondaryDistM.toFixed(0)} m ahead`
        : "";
    nextHtml = `<div class="op-summary-item">
      <span class="op-summary-label">Next event</span>
      <span class="op-summary-value">${nextIdHtml} ${nextSourceLabel}${nextDistHtml}</span>
    </div>`;
  }

  summaryEl.innerHTML = `
    <div class="op-summary-grid">
      ${evSourceHtml}
      <div class="op-summary-item">
        <span class="op-summary-label">Primary event</span>
        <span class="op-summary-value">${primaryIdHtml}${primaryDistHtml}</span>
      </div>
      ${primarySourceLabelHtml}
      ${normTypeHtml}
      <div class="op-summary-item">
        <span class="op-summary-label">Ref state</span>
        <span class="op-summary-value ${stateClass}">${escapeHtml(refState)}</span>
      </div>
      <div class="op-summary-item">
        <span class="op-summary-label">Target speed</span>
        <span class="op-summary-value">${targetHtml}</span>
      </div>
      ${nextHtml}
      <div class="op-summary-item">
        <span class="op-summary-label">Accepted</span>
        <span class="op-summary-value op-count-accepted">${acceptedCount}</span>
      </div>
      <div class="op-summary-item">
        <span class="op-summary-label">Suppressed</span>
        <span class="op-summary-value op-count-suppressed">${suppressedCount}</span>
      </div>
      <div class="op-summary-item">
        <span class="op-summary-label">Not processed</span>
        <span class="op-summary-value op-count-not-processed">${notProcessedCount}</span>
      </div>
      ${reasonHtml}
    </div>
  `;
}


// EMULATOR DEBUG / QA UI — NOT THE DRIVER-FACING UI.
// buildEventRow and buildGroupRows are used only by renderDebugPanel.
// The grouping and filtering logic (accepted / suppressed / not_driver_facing)
// reflects the simplified Slices 4.1–4.3 baseline only.
// Debug visibility does NOT imply driver-facing eligibility.
// Reason / status / kind names are WIP / not Product Canon.
// ---------------------------------------------------------------------------

/**
 * Build a single <tr> for the debug event table.
 *
 * Uses inline fields from EventSelectionRecord (projection_along_route_m,
 * projection_cross_track_m, directionCompatibility) rather than separate
 * lookup maps. Values are identical to the state lookup maps — derived from
 * the same projection pass.
 *
 * When `activeEvents` is provided (prepared route events mode), the row also
 * shows source_type_label and raw_type from the adapted PreparedEvent for
 * traceability per the #95 display contract. (Issue #99 / Stage 2 / WIP)
 *
 * EMULATOR DEBUG / QA ONLY — not driver-facing output.
 * Per-session derived data — not persisted to base fixture files.
 * (event-applicability Canon truth 13; event-data Canon truth 11)
 *
 * @param r - The EventSelectionRecord for this row.
 * @param activeEvents - Optional map from event_id → PreparedEvent for
 *   source provenance display. Only set in prepared route mode (Issue #99).
 */
function buildEventRow(
  r: EventSelectionRecord,
  activeEvents?: Map<string, PreparedEvent>
): string {
  const distStr =
    r.distance_m >= 0
      ? `+${r.distance_m.toFixed(0)} m`
      : `${r.distance_m.toFixed(0)} m`;

  const alongStr = `${r.projection_along_route_m.toFixed(0)} m`;
  const crossStr = `${r.projection_cross_track_m.toFixed(1)} m`;

  const dc = r.directionCompatibility;
  const tangentStr =
    dc?.route_tangent_deg != null
      ? `${dc.route_tangent_deg.toFixed(1)}°`
      : "–";
  const srcDirStr =
    dc?.source_direction_deg != null
      ? `${dc.source_direction_deg}°`
      : "–";
  const srcDirtypeStr =
    dc?.source_dirtype != null ? String(dc.source_dirtype) : "–";
  const deltaStr =
    dc?.direction_delta_deg != null
      ? `${dc.direction_delta_deg.toFixed(1)}°`
      : "–";
  const dcStatus = dc?.status ?? "–";
  const dcStatusClass =
    dc != null ? `dir-compat-${dc.status}` : "dir-compat-unknown";

  const ar = r.applicabilityReason;
  const arKindClass = `ar-kind-${ar.kind}`;
  const arEligibleClass = ar.is_driver_facing_eligible
    ? "ar-eligible-yes"
    : "ar-eligible-no";
  // "⚠ debug only" makes non-driver-facing status explicit at a glance.
  const arEligibleText = ar.is_driver_facing_eligible
    ? "driver ✓"
    : "⚠ debug only";

  // Add debug-only-row class to rows that are not eligible for driver-facing.
  // This provides a secondary visual cue in addition to the group separator.
  const debugRowClass = !ar.is_driver_facing_eligible ? " debug-only-row" : "";

  // Source provenance display for prepared route events (Issue #99 / Stage 2).
  // Per #95 display contract: source_type_label first, raw_type second, norm type third.
  const ev = activeEvents?.get(r.event_id);
  const sourceTypeLabelHtml = ev?.route_source_type_label
    ? `<br><span class="ev-row-source-label">${escapeHtml(ev.route_source_type_label)}</span>`
      + `<span class="ev-row-raw-type">&nbsp;(raw:${escapeHtml(ev.raw_type ?? "—")})</span>`
    : "";

  // Direction provenance display (Issue #99 follow-up — Datakam direction convention).
  // Shows raw facing direction alongside effective travel direction used by evaluator.
  // route_raw_facing_direction_deg is only set for adapted route events.
  // For synthetic fixtures this is undefined and nothing extra is shown.
  // WIP — NOT Product Canon.
  const rawFacingDirHtml = ev?.route_raw_facing_direction_deg != null
    ? `<br><span class="ev-row-dir-facing">facing: ${ev.route_raw_facing_direction_deg}°</span>`
    : "";

  // Source speed display (Issue #99 P2 fix).
  // target_speed_kmh is null for non-speed_limit events (camera, hazard, unknown).
  // route_source_speed_kmh preserves the source SPEED attribute for debug/provenance
  // display without implying it is a RoadAhead target speed rule.
  // Only shown in debug table when target_speed_kmh is null and source speed exists.
  const sourceSpeedNote =
    r.target_speed_kmh == null && ev?.route_source_speed_kmh != null
      ? `<br><span class="ev-row-source-speed">src: ${ev.route_source_speed_kmh} km/h <em>(advisory attr, not target)</em></span>`
      : "";

  return `<tr class="event-row-${r.status}${debugRowClass}">
    <td><code>${escapeHtml(r.event_id)}</code></td>
    <td>${escapeHtml(r.normalized_type)}${sourceTypeLabelHtml}</td>
    <td>${r.target_speed_kmh != null ? r.target_speed_kmh : "–"}${sourceSpeedNote}</td>
    <td class="dist-cell">${distStr}</td>
    <td class="dist-cell proj-derived">${alongStr}</td>
    <td class="dist-cell proj-derived">${crossStr}</td>
    <td class="dist-cell dir-derived">${tangentStr}</td>
    <td class="dist-cell dir-derived">${srcDirStr}<span class="ev-row-dir-eff-note">&nbsp;(eff.)</span>${rawFacingDirHtml}<br><span class="dirtype-label">dirtype=${srcDirtypeStr}</span></td>
    <td class="dist-cell dir-derived">${deltaStr}</td>
    <td class="dir-derived"><span class="dir-compat-badge ${dcStatusClass}">${escapeHtml(dcStatus)}</span></td>
    <td><span class="event-status event-status-${r.status}">${r.status}</span></td>
    <td class="reason-code-cell">
      <span class="ar-kind ${arKindClass}">${escapeHtml(ar.kind)}</span>
      <span class="ar-eligible ${arEligibleClass}">${arEligibleText}</span><br>
      <span class="ar-code">${escapeHtml(ar.code)}</span>
    </td>
    <td class="reason-cell" title="${escapeHtml(r.reason)}">${escapeHtml(r.reason)}</td>
  </tr>`;
}

/**
 * Build the group separator <tr> + all event rows for one reason-kind group.
 *
 * Returns empty string if the group has no records (keeps the table clean
 * when filtering leaves a group empty).
 *
 * EMULATOR DEBUG / QA ONLY — not driver-facing.
 * Group semantics reflect the Slices 4.1–4.3 WIP baseline only — not Canon.
 *
 * @param kind - Group kind (accepted / suppressed / not_processed).
 * @param records - Records for this group.
 * @param activeEvents - Optional active event map for source provenance display.
 *   Only set in prepared route mode (Issue #99 / Stage 2 / WIP).
 */
function buildGroupRows(
  kind: "accepted" | "suppressed" | "not_processed",
  records: EventSelectionRecord[],
  activeEvents?: Map<string, PreparedEvent>
): string {
  if (records.length === 0) return "";

  const CONFIG: Record<
    "accepted" | "suppressed" | "not_processed",
    { label: string; note: string; headerClass: string }
  > = {
    accepted: {
      label: "✓ Accepted — driver-facing eligible",
      note: "May appear in the driver-facing three-circle display (selected_primary / accepted_candidate)",
      headerClass: "group-header-accepted",
    },
    suppressed: {
      label: "⊘ Suppressed — debug / QA only · NOT driver-facing",
      note:
        "Visible in debug; suppressed from driver-facing selection " +
        "(event-applicability Canon truth 12; ui-model Canon truth 13). " +
        "Debug visibility does NOT imply driver-facing eligibility.",
      headerClass: "group-header-suppressed",
    },
    not_processed: {
      label: "○ Not processed — out of scope for this slice",
      note:
        "Event type not in the current applicability processing scope " +
        "(speed_limit, static_camera, and road_bump are processed; others are not). " +
        "Not driver-facing.",
      headerClass: "group-header-not-processed",
    },
  };

  const { label, note, headerClass } = CONFIG[kind];
  const count = records.length;

  const separatorRow = `<tr class="group-header-row">
    <td colspan="13" class="group-header-cell ${headerClass}">
      ${label} · ${count} event${count !== 1 ? "s" : ""}
      <span class="group-header-note">${note}</span>
    </td>
  </tr>`;

  return separatorRow + records.map((r) => buildEventRow(r, activeEvents)).join("");
}

/**
 * Build the filter control bar HTML.
 * Buttons are tagged with data-filter attributes; listeners are attached
 * separately by attachDebugFilterListeners after innerHTML is set.
 */
function buildFilterBar(
  total: number,
  acceptedCount: number,
  suppressedCount: number,
  notDFCount: number
): string {
  const btn = (f: DebugFilterMode, label: string): string => {
    const activeClass = debugFilter === f ? " filter-btn-active" : "";
    return `<button class="filter-btn${activeClass}" data-filter="${f}" type="button">${escapeHtml(label)}</button>`;
  };

  return `<div class="debug-filter-bar">
    <span class="filter-label">Show events:</span>
    ${btn("all", `All (${total})`)}
    ${btn("accepted", `Accepted (${acceptedCount})`)}
    ${btn("suppressed", `Suppressed (${suppressedCount})`)}
    ${btn("not_driver_facing", `Not driver-facing (${notDFCount})`)}
    <span class="filter-note">Filter affects debug table only — not event selection behavior</span>
  </div>`;
}

/**
 * Attach click listeners to the filter buttons inside the debug section.
 * Must be called after section.innerHTML is set (buttons are freshly created).
 * Sets the module-level debugFilter and triggers a re-render.
 */
function attachDebugFilterListeners(section: HTMLElement): void {
  section
    .querySelectorAll<HTMLButtonElement>(".filter-btn[data-filter]")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        const f = btn.dataset["filter"] as DebugFilterMode | undefined;
        if (f) {
          debugFilter = f;
          render();
        }
      });
    });
}

// ---------------------------------------------------------------------------
// Debug panel
// ---------------------------------------------------------------------------

/**
 * Render the debug / QA panel.
 *
 * EMULATOR DEBUG / QA UI — NOT THE DRIVER-FACING UI.
 * Not final UX design. Not a navigator. Not an anti-radar.
 * Reason / status / kind names are WIP / not Product Canon.
 *
 * Slice 4.4 additions vs Slice 4.3:
 *   - Records separated into accepted / suppressed / not_processed groups
 *     with visual group separator rows.
 *   - Filter bar (all / accepted / suppressed / not_driver_facing) controls
 *     table visibility without affecting event selection behavior.
 *   - buildEventRow extracted to reduce inline duplication.
 *   - ".debug-only-row" class applied to non-driver-facing rows as secondary
 *     visual indicator.
 *   - ar.eligible text changed from "debug" to "⚠ debug only" for clarity.
 *   - ar-kind badge placed before ar-code in the reason code cell.
 */
function renderDebugPanel(state: SimulationState): void {
  const section = document.getElementById("debug-section");
  if (!section) return;

  const { minLon, maxLon } = getRouteLonSpan(activeRoute);
  const vp = state.vehicleRoutePosition;
  const provenance = activeRoute.provenance;

  // Build active event map for source provenance display in event rows.
  // Only populated in prepared route mode (Issue #99 / Stage 2).
  const evSourceMode = deriveEventSourceMode();
  const activeEventsForSim = getActiveEventsForSim();
  const activeEventsMap: Map<string, PreparedEvent> | undefined =
    evSourceMode.kind === "prepared_route"
      ? new Map(activeEventsForSim.map((e) => [e.event_id, e]))
      : undefined;

  // Separate records into reason-kind groups.
  // Uses applicabilityReason.kind from Slice 4.3 / Issue #53.
  const allRecords = state.eventSelection.records;
  const acceptedRecords = allRecords.filter(
    (r) => r.applicabilityReason.kind === "accepted"
  );
  const suppressedRecords = allRecords.filter(
    (r) => r.applicabilityReason.kind === "suppressed"
  );
  const notProcessedRecords = allRecords.filter(
    (r) => r.applicabilityReason.kind === "not_processed"
  );
  const notDFRecords = allRecords.filter(
    (r) => !r.applicabilityReason.is_driver_facing_eligible
  );

  // Build table body based on current filter.
  // Filter affects table visibility only — selection behavior is unchanged.
  let tableBodyHtml: string;
  if (debugFilter === "accepted") {
    tableBodyHtml = buildGroupRows("accepted", acceptedRecords, activeEventsMap);
  } else if (debugFilter === "suppressed") {
    tableBodyHtml = buildGroupRows("suppressed", suppressedRecords, activeEventsMap);
  } else if (debugFilter === "not_driver_facing") {
    tableBodyHtml =
      buildGroupRows("suppressed", suppressedRecords, activeEventsMap) +
      buildGroupRows("not_processed", notProcessedRecords, activeEventsMap);
  } else {
    // "all" — show all groups with separators
    tableBodyHtml =
      buildGroupRows("accepted", acceptedRecords, activeEventsMap) +
      buildGroupRows("suppressed", suppressedRecords, activeEventsMap) +
      buildGroupRows("not_processed", notProcessedRecords, activeEventsMap);
  }

  if (tableBodyHtml === "") {
    tableBodyHtml = `<tr><td colspan="13" class="table-empty-msg">No events match the current filter.</td></tr>`;
  }

  const configSubset = {
    speed_limit_lookahead_WIP: EMULATOR_TUNING_DEFAULTS.lookahead.speed_limit,
    static_camera_lookahead_WIP: EMULATOR_TUNING_DEFAULTS.lookahead.static_camera,
    direction_applicability_WIP: {
      direction_delta_accept_deg: EMULATOR_TUNING_DEFAULTS.direction_applicability.direction_delta_accept_deg,
      direction_delta_reject_above_deg: EMULATOR_TUNING_DEFAULTS.direction_applicability.direction_delta_reject_above_deg,
      approach_window_m: EMULATOR_TUNING_DEFAULTS.direction_applicability.approach_window_m,
      // Issue #67: cross-track/off-route rejection threshold.
      // Used as the WIP reject threshold for off-route suppression.
      // WIP emulator default — NOT Canon. (tuning-and-validation Canon truths 1, 2)
      route_projection_reject_m_WIP: EMULATOR_TUNING_DEFAULTS.direction_applicability.route_projection_reject_m,
    },
    enforcement_profile_WIP: {
      profile_id: EMULATOR_TUNING_DEFAULTS.enforcement_profile.profile_id,
      label: EMULATOR_TUNING_DEFAULTS.enforcement_profile.label,
      absolute_kmh: EMULATOR_TUNING_DEFAULTS.enforcement_profile.absolute_kmh,
      legal_claim: EMULATOR_TUNING_DEFAULTS.enforcement_profile.legal_claim,
      notes: EMULATOR_TUNING_DEFAULTS.enforcement_profile.notes,
    },
  };

  // Event source summary for debug panel header (Issue #99 / Stage 2).
  const evSourceLabelText = eventSourceLabel(evSourceMode);
  const evSourceModeClass =
    evSourceMode.kind === "prepared_route"
      ? "op-source-prepared"
      : evSourceMode.kind === "no_prepared"
        ? "op-source-no-prepared"
        : "op-source-synthetic";
  const evSourceBannerHtml =
    evSourceMode.kind !== "synthetic"
      ? `<div class="debug-event-source-banner ${evSourceModeClass}">
          Event source: <strong>${escapeHtml(evSourceLabelText)}</strong>
          <span class="debug-event-source-note">· WIP debug only · not Canon</span>
        </div>`
      : "";

  section.innerHTML = `
    <h2>Debug Panel <span class="wip-badge">Emulator QA only — not driver-facing UI</span></h2>

    ${evSourceBannerHtml}

    <div class="debug-warning">
      ⚠ All numeric thresholds shown below are <strong>WIP emulator defaults — NOT Product Canon</strong>.
      Projection, direction compatibility, and applicability reason values are <strong>per-session derived data</strong> —
      not persisted to base fixture files. (event-applicability Canon truth 13; event-data Canon truth 11)
      Source direction fields are <strong>candidate metadata only, not verified truth</strong>.
      (event-applicability Canon truth 8)
      Direction compatibility shown is a WIP baseline (Slice 4.2) — candidate semantics, not Canon.
      Branch/ramp/parallel-carriageway ambiguity handling is deferred to later child issues.
      <strong>Reason code column</strong> is a WIP structured suppression/acceptance reason model (Slice 4.3 / Issue #53) —
      codes, kind values, and is_driver_facing_eligible reflect the simplified Slices 4.1–4.3 baseline only.
      Full taxonomy is deferred to later child issues under Issue #48.
      <strong>Debug visibility does NOT imply driver-facing eligibility.</strong>
    </div>

    <div class="debug-grid">
      <div class="debug-block">
        <h3>Active Route</h3>
        <dl class="debug-dl">
          <dt>Route ID / Provider</dt>
          <dd><code>${escapeHtml(provenance.provider)}</code></dd>
          <dt>Generated</dt>
          <dd>${escapeHtml(provenance.generated_at)}</dd>
          <dt>Route lon span</dt>
          <dd>${minLon.toFixed(3)}° → ${maxLon.toFixed(3)}°</dd>
          <dt>Total route length</dt>
          <dd class="proj-derived">${vp.total_route_length_m.toFixed(0)} m <span class="wip-inline">(arc-length, per-session)</span></dd>
          <dt>Notes</dt>
          <dd class="notes-cell">${escapeHtml(provenance.notes ?? "–")}</dd>
          <dt>Total events loaded</dt>
          <dd>${SYNTHETIC_PREPARED_EVENTS.length} (synthetic prepared events — speed_limit + static_camera + road_bump)</dd>
        </dl>
      </div>

      <div class="debug-block">
        <h3>Simulation State</h3>
        <dl class="debug-dl">
          <dt>Route progress</dt>
          <dd>${(state.progress * 100).toFixed(1)}%</dd>
          <dt>Vehicle longitude <span class="wip-inline">(projection-derived)</span></dt>
          <dd>${state.vehicleLon.toFixed(5)}°</dd>
          <dt>Current speed</dt>
          <dd>${state.speedKmh} km/h (manual — no provider speed)</dd>
        </dl>
      </div>

      <div class="debug-block">
        <h3>Vehicle Route Position <span class="wip-inline proj-derived-label">per-session derived</span></h3>
        <dl class="debug-dl">
          <dt>Along-route distance</dt>
          <dd class="proj-derived">${vp.along_route_m.toFixed(0)} m from route start</dd>
          <dt>Total route length</dt>
          <dd class="proj-derived">${vp.total_route_length_m.toFixed(0)} m</dd>
          <dt>Segment index</dt>
          <dd class="proj-derived">${vp.segment_index} (0-based)</dd>
          <dt>Projected lon / lat</dt>
          <dd class="proj-derived">${vp.projected_lon.toFixed(5)}° / ${vp.projected_lat.toFixed(5)}°</dd>
        </dl>
      </div>

      <div class="debug-block">
        <h3>Speed Reference</h3>
        <dl class="debug-dl">
          <dt>State</dt>
          <dd><strong>${escapeHtml(state.speedReference.state)}</strong></dd>
          <dt>Target speed</dt>
          <dd>${
            state.speedReference.target_speed_kmh != null
              ? `${state.speedReference.target_speed_kmh} km/h (advisory, not legal)`
              : "– (none)"
          }</dd>
          <dt>Reason</dt>
          <dd>${escapeHtml(state.speedReference.reason)}</dd>
        </dl>
      </div>
    </div>

    <div class="debug-block debug-block-full">
      <h3>
        Event Selection
        <span class="wip-inline">speed_limit + static_camera + road_bump scope · projection-derived distance · cross-track/off-route suppression · direction compat · Slices 4.1–4.4 · Issues #65 #67 #75</span>
      </h3>
      <p class="debug-note">
        Ahead/behind determined by <strong>projection-derived along-route distance</strong>.
        Lookahead guardrails (WIP defaults — not Canon):
        speed_limit min <strong>${EMULATOR_TUNING_DEFAULTS.lookahead.speed_limit.min_display_distance_m} m</strong> /
        max <strong>${EMULATOR_TUNING_DEFAULTS.lookahead.speed_limit.max_lookahead_m} m</strong>;
        static_camera min <strong>${EMULATOR_TUNING_DEFAULTS.lookahead.static_camera.min_display_distance_m} m</strong> /
        max <strong>${EMULATOR_TUNING_DEFAULTS.lookahead.static_camera.max_lookahead_m} m</strong>.
        <strong>off_route_cross_track</strong> (Issue #67) = within lookahead window but cross-track distance exceeds
        WIP rejection threshold (<code>route_projection_reject_m</code> =
        <strong>${EMULATOR_TUNING_DEFAULTS.direction_applicability.route_projection_reject_m} m</strong> WIP default, not Canon);
        suppressed from driver-facing selection before direction check is applied.
        <strong>direction_conflict</strong> = within window, on-route, but direction incompatible; suppressed from driver-facing selection.
        Direction compatibility columns (⟳) are <em class="dir-derived-label">per-session derived debug data</em> —
        source direction is candidate metadata only, not verified truth. WIP baseline semantics — not Canon.
        <strong>Along-route / Cross-track</strong> (⊕) are per-session derived projection values — not persisted to fixtures.
        <strong>secondary</strong> = next event inside the simplified window only, not global next event on route.
        <strong>Reason code</strong> (✦) is per-session derived structured reason data — WIP Slices 4.1–4.3 + Issue #67 baseline, not Canon.
        Hover over the Reason cell for the full reason text.
        <strong>Debug-only rows</strong> (marked ⚠ debug only) must not appear driver-facing.
        (ui-model Canon truth 13; event-applicability Canon truth 12)
      </p>

      ${buildFilterBar(
        allRecords.length,
        acceptedRecords.length,
        suppressedRecords.length,
        notDFRecords.length
      )}

      <div class="table-scroll">
        <table class="event-table">
          <thead>
            <tr>
              <th>Event ID</th>
              <th>Type</th>
              <th>Target km/h</th>
              <th>Signed distance</th>
              <th class="proj-derived-label">Along-route ⊕</th>
              <th class="proj-derived-label">Cross-track ⊕</th>
              <th class="dir-derived-label">Tangent ⟳</th>
              <th class="dir-derived-label">Src dir ⟳</th>
              <th class="dir-derived-label">Delta ⟳</th>
              <th class="dir-derived-label">Dir compat ⟳</th>
              <th>Status</th>
              <th class="reason-code-header">Reason code ✦ <span class="wip-inline">WIP · not Canon</span></th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            ${tableBodyHtml}
          </tbody>
        </table>
      </div>
      <p class="debug-note-small">
        ⊕ per-session derived projection values — not persisted to base fixture files (event-applicability Canon truth 13)
        <br>⟳ per-session derived direction compatibility values — source direction is candidate metadata, not verified truth
        (event-applicability Canon truth 8; Slice 4.2 WIP — not Canon)
        <br>✦ per-session derived structured reason code — WIP suppression/acceptance reason model (Slice 4.3 / Issue #53; cross-track baseline Issue #67);
        codes, kind, and is_driver_facing_eligible reflect Slices 4.1–4.3 + Issue #67 baseline only — NOT Product Canon;
        off_route_cross_track suppresses events where cross-track &gt; route_projection_reject_m (WIP 50 m) before direction check;
        full taxonomy deferred to later child issues under Issue #48
        <br>⚠ debug only — NOT driver-facing eligible; visible in debug / QA; suppressed from driver-facing selection
        (ui-model Canon truth 13; event-applicability Canon truth 12)
      </p>
    </div>

    <div class="debug-block debug-block-full">
      <h3>Active Tuning Config <span class="wip-inline">WIP defaults — NOT Canon · subset shown</span></h3>
      <pre class="debug-pre">${escapeHtml(JSON.stringify(configSubset, null, 2))}</pre>
    </div>
  `;

  // Attach filter button listeners after innerHTML is set.
  attachDebugFilterListeners(section);
}

// ---------------------------------------------------------------------------
// Lifecycle / Order Diagnostics (Issue #102 / Stage 2)
//
// Read-only diagnostics surface for prepared-event evaluation lifecycle and
// ordering behavior. No selection or lifecycle behavior changes are made here.
//
// Shows:
//   - event source mode and current vehicle/threshold state
//   - route-ordered list of nearby events (sorted ascending by distance_m)
//   - primary/next explanation with "closer but not primary" note
//   - departure tracking: why an event left primary/next
//
// WIP diagnostics — NOT Product Canon. Per-session derived data only.
// (event-applicability Canon truth 12: suppressed candidates must remain
//  inspectable in debug; event-data Canon truth 11: no derived fields
//  written back to fixtures)
// ---------------------------------------------------------------------------

/**
 * Detect when primary or next/secondary changed between ticks and record the
 * current reason code for the departing event.
 *
 * Called in render() BEFORE updating diagPrevPrimaryId / diagPrevNextId.
 * Reads current state.eventSelection.records to find the new reason for the
 * departed event.
 *
 * WIP diagnostics only — no selection behavior change. Issue #102 / Stage 2.
 */
function updateDiagDepartures(state: SimulationState): void {
  const currentPrimaryId = state.eventSelection.primary?.event_id ?? null;
  const currentNextId = state.eventSelection.secondary?.event_id ?? null;

  // Detect primary departure.
  if (
    diagPrevPrimaryId !== null &&
    diagPrevPrimaryId !== currentPrimaryId
  ) {
    const depRecord = state.eventSelection.records.find(
      (r) => r.event_id === diagPrevPrimaryId
    );
    if (depRecord) {
      diagLastPrimaryDeparture = {
        event_id: depRecord.event_id,
        distance_m: depRecord.distance_m,
        reason_code: depRecord.applicabilityReason.code,
        reason_kind: depRecord.applicabilityReason.kind,
        status: depRecord.status,
      };
    }
  }

  // Detect next/secondary departure.
  if (
    diagPrevNextId !== null &&
    diagPrevNextId !== currentNextId
  ) {
    const depRecord = state.eventSelection.records.find(
      (r) => r.event_id === diagPrevNextId
    );
    if (depRecord) {
      diagLastNextDeparture = {
        event_id: depRecord.event_id,
        distance_m: depRecord.distance_m,
        reason_code: depRecord.applicabilityReason.code,
        reason_kind: depRecord.applicabilityReason.kind,
        status: depRecord.status,
      };
    }
  }
}

/**
 * Render the lifecycle/order diagnostics panel into #diag-section.
 *
 * EMULATOR DEBUG / QA UI — NOT THE DRIVER-FACING UI.
 * Diagnostics only — no selection or lifecycle behavior changes.
 * No WIP thresholds are modified. No evaluator logic is changed.
 *
 * Shows:
 *   1. Event source mode + vehicle state + WIP thresholds (read-only).
 *   2. Primary/next explanation (which event, distance, reason, why closer not primary).
 *   3. Departure tracking (last event that left primary/next, and reason code).
 *   4. Route-ordered event list (sorted ascending by distance_m; ahead first).
 *
 * WIP diagnostics — NOT Product Canon. Issue #102 / Stage 2.
 */
function renderDiagnosticsPanel(state: SimulationState): void {
  const section = document.getElementById("diag-section");
  if (!section) return;

  const vp = state.vehicleRoutePosition;
  const sel = state.eventSelection;
  const evSourceMode = deriveEventSourceMode();
  const cfg = EMULATOR_TUNING_DEFAULTS;

  // ---------------------------------------------------------------------------
  // 1. Event source mode + vehicle state + WIP thresholds block
  // ---------------------------------------------------------------------------

  const evSourceLabel = eventSourceLabel(evSourceMode);
  const evSourceKind = evSourceMode.kind;

  const vehicleStateHtml = `
    <div class="diag-grid">
      <div class="diag-block">
        <h3 class="diag-h3">Event Source &amp; Vehicle State</h3>
        <dl class="debug-dl">
          <dt>Event source mode</dt>
          <dd><code class="diag-mode-${evSourceKind}">${escapeHtml(evSourceKind)}</code>
            &nbsp;${escapeHtml(evSourceLabel)}</dd>
          <dt>Vehicle along-route <span class="wip-inline proj-derived-label">per-session</span></dt>
          <dd class="proj-derived">${vp.along_route_m.toFixed(0)} m from route start</dd>
          <dt>Route total length <span class="wip-inline proj-derived-label">per-session</span></dt>
          <dd class="proj-derived">${vp.total_route_length_m.toFixed(0)} m</dd>
          <dt>Route progress</dt>
          <dd>${(state.progress * 100).toFixed(2)}%</dd>
          <dt>Simulated speed</dt>
          <dd>${state.speedKmh} km/h (manual — no provider speed)</dd>
        </dl>
      </div>
      <div class="diag-block">
        <h3 class="diag-h3">WIP Thresholds <span class="wip-inline">not Canon</span></h3>
        <dl class="debug-dl">
          <dt>speed_limit lookahead</dt>
          <dd>min <strong>${cfg.lookahead.speed_limit.min_display_distance_m} m</strong>
            / max <strong>${cfg.lookahead.speed_limit.max_lookahead_m} m</strong></dd>
          <dt>static_camera lookahead</dt>
          <dd>min <strong>${cfg.lookahead.static_camera.min_display_distance_m} m</strong>
            / max <strong>${cfg.lookahead.static_camera.max_lookahead_m} m</strong></dd>
          <dt>road_bump lookahead</dt>
          <dd>min <strong>${cfg.lookahead.road_bump.min_display_distance_m} m</strong>
            / max <strong>${cfg.lookahead.road_bump.max_lookahead_m} m</strong></dd>
          <dt>Cross-track reject</dt>
          <dd><strong>${cfg.direction_applicability.route_projection_reject_m} m</strong>
            (route_projection_reject_m WIP)</dd>
          <dt>Direction accept ≤</dt>
          <dd><strong>${cfg.direction_applicability.direction_delta_accept_deg}°</strong></dd>
          <dt>Direction reject above</dt>
          <dd><strong>${cfg.direction_applicability.direction_delta_reject_above_deg}°</strong></dd>
        </dl>
      </div>
    </div>`;

  // ---------------------------------------------------------------------------
  // 2. Primary / next explanation + "closer but not primary" detection
  // ---------------------------------------------------------------------------

  const primaryRecord = sel.records.find((r) => r.status === "selected");
  const secondaryId = sel.secondary?.event_id ?? null;

  // Build the primary/next explanation lines.
  const primaryLine = primaryRecord
    ? `<span class="diag-primary-badge">Primary</span>
       event <code>${escapeHtml(primaryRecord.event_id)}</code>
       · ${primaryRecord.distance_m.toFixed(0)} m ahead
       · <code>${escapeHtml(primaryRecord.applicabilityReason.code)}</code>
       · ${escapeHtml(primaryRecord.normalized_type)}`
    : `<span class="diag-no-primary">No primary event</span>`;

  const nextRecord = sel.records.find(
    (r) => r.event_id === secondaryId && secondaryId !== null
  );
  const nextLine = nextRecord
    ? `<span class="diag-next-badge">Next</span>
       event <code>${escapeHtml(nextRecord.event_id)}</code>
       · ${nextRecord.distance_m.toFixed(0)} m ahead
       · <code>${escapeHtml(nextRecord.applicabilityReason.code)}</code>
       · ${escapeHtml(nextRecord.normalized_type)}`
    : `<em>No next/secondary event</em>`;

  // Detect closer events that are NOT primary — show their reason.
  const primaryDistM = primaryRecord?.distance_m ?? Infinity;
  const closerNotPrimary = sel.records
    .filter(
      (r) =>
        r.distance_m > 0 &&
        r.distance_m < primaryDistM &&
        r.event_id !== (primaryRecord?.event_id ?? "") &&
        r.status !== "out_of_scope"
    )
    .sort((a, b) => a.distance_m - b.distance_m);

  const closerNotPrimaryHtml =
    closerNotPrimary.length > 0
      ? closerNotPrimary
          .map(
            (r) =>
              `<div class="diag-closer-row">
                <span class="diag-closer-badge">Closer, not primary</span>
                event <code>${escapeHtml(r.event_id)}</code>
                · ${r.distance_m.toFixed(0)} m ahead
                · reason: <code>${escapeHtml(r.applicabilityReason.code)}</code>
                (${escapeHtml(r.applicabilityReason.kind)})
                · status: <code>${escapeHtml(r.status)}</code>
              </div>`
          )
          .join("")
      : primaryRecord
        ? `<div class="diag-no-closer"><em>No closer events ahead</em></div>`
        : `<div class="diag-no-closer"><em>No primary event selected</em></div>`;

  // ---------------------------------------------------------------------------
  // 3. Departure tracking
  // ---------------------------------------------------------------------------

  const fmtDeparture = (dep: DiagDeparture | null, role: string): string => {
    if (dep === null) return `<em>No ${role} departure recorded this session</em>`;
    const distStr =
      dep.distance_m >= 0
        ? `${dep.distance_m.toFixed(0)} m ahead`
        : `${Math.abs(dep.distance_m).toFixed(0)} m behind`;
    return `<span class="diag-departure-badge">Was ${role}</span>
      event <code>${escapeHtml(dep.event_id)}</code>
      · now ${distStr}
      · status: <code>${escapeHtml(dep.status)}</code>
      · reason: <code>${escapeHtml(dep.reason_code)}</code>
      (${escapeHtml(dep.reason_kind)})`;
  };

  const departureHtml = `
    <div class="diag-departure-row">${fmtDeparture(diagLastPrimaryDeparture, "primary")}</div>
    <div class="diag-departure-row">${fmtDeparture(diagLastNextDeparture, "next")}</div>`;

  const explanationHtml = `
    <div class="diag-block diag-block-full">
      <h3 class="diag-h3">Primary / Next Explanation
        <span class="wip-inline">per-session diagnostics · not Canon</span>
      </h3>
      <div class="diag-explanation">
        <div class="diag-explanation-row">${primaryLine}</div>
        <div class="diag-explanation-row">${nextLine}</div>
      </div>
      <div class="diag-closer-section">
        <strong>Closer events not primary:</strong>
        ${closerNotPrimaryHtml}
      </div>
      <div class="diag-departure-section">
        <strong>Disappearance / departure tracking:</strong>
        ${departureHtml}
      </div>
    </div>`;

  // ---------------------------------------------------------------------------
  // 4. Route-ordered event list (sorted ascending by distance_m, ahead first)
  // ---------------------------------------------------------------------------

  // Sort: ahead events (distance_m > 0) ascending, then behind (distance_m <= 0) descending.
  // For each row compute the marker eval state from the existing buildMarkerEvalStateMap logic.
  const evalStateMap =
    evSourceMode.kind === "prepared_route"
      ? buildMarkerEvalStateMap(state)
      : null;

  // Pre-build active event map for source provenance (source_type_label, source_ref).
  const activeEventsMap = new Map<string, PreparedEvent>(
    getActiveEventsForSim().map((e) => [e.event_id, e])
  );

  const aheadRecords = sel.records
    .filter((r) => r.distance_m > 0)
    .sort((a, b) => a.distance_m - b.distance_m);

  const behindRecords = sel.records
    .filter((r) => r.distance_m <= 0)
    .sort((a, b) => b.distance_m - a.distance_m); // closest behind first

  const buildDiagRow = (
    r: EventSelectionRecord,
    idx: number,
    isAhead: boolean
  ): string => {
    const pe = activeEventsMap.get(r.event_id);
    const sourceLabel = pe?.route_source_type_label ?? "–";
    const sourceRef = pe?.route_source_ref ?? "–";
    const rawType = pe?.raw_type ?? r.normalized_type;
    const markerState = evalStateMap?.get(r.event_id) ?? "–";

    const isSelected = r.status === "selected";
    const isNext = r.event_id === secondaryId;

    let roleCell = "–";
    if (isSelected) roleCell = `<span class="diag-role-primary">primary</span>`;
    else if (isNext) roleCell = `<span class="diag-role-next">next</span>`;
    else if (r.status === "candidate") roleCell = `<span class="diag-role-eligible">eligible</span>`;
    else if (r.applicabilityReason.kind === "suppressed") roleCell = `<span class="diag-role-suppressed">suppressed</span>`;
    else if (r.applicabilityReason.kind === "not_processed") roleCell = `<span class="diag-role-oos">out_of_scope</span>`;

    const distCell = isAhead
      ? `+${r.distance_m.toFixed(0)}`
      : r.distance_m.toFixed(0);

    const rowClass =
      isSelected
        ? " diag-row-primary"
        : isNext
          ? " diag-row-next"
          : r.applicabilityReason.kind === "suppressed"
            ? " diag-row-suppressed"
            : "";

    return `
      <tr class="diag-event-row${rowClass}">
        <td class="diag-td-idx">${idx + 1}</td>
        <td class="diag-td-id" title="${escapeHtml(r.event_id)}">${escapeHtml(r.event_id.slice(0, 12))}…</td>
        <td class="diag-td-ref">${escapeHtml(sourceRef)}</td>
        <td class="diag-td-label" title="${escapeHtml(sourceLabel)}">${escapeHtml(sourceLabel)}</td>
        <td class="diag-td-raw">${escapeHtml(String(rawType))}</td>
        <td class="diag-td-norm">${escapeHtml(r.normalized_type)}</td>
        <td class="diag-td-dist ${isAhead ? "diag-dist-ahead" : "diag-dist-behind"}">${distCell}</td>
        <td class="diag-td-along proj-derived">${r.projection_along_route_m.toFixed(0)}</td>
        <td class="diag-td-status"><code>${escapeHtml(r.status)}</code></td>
        <td class="diag-td-code"><code>${escapeHtml(r.applicabilityReason.code)}</code></td>
        <td class="diag-td-kind">${escapeHtml(r.applicabilityReason.kind)}</td>
        <td class="diag-td-role">${roleCell}</td>
        <td class="diag-td-marker">${escapeHtml(String(markerState))}</td>
      </tr>`;
  };

  let tableRowsHtml = "";
  if (aheadRecords.length > 0) {
    tableRowsHtml += `<tr class="diag-group-sep"><td colspan="13">↑ Ahead (${aheadRecords.length} events) — sorted nearest first</td></tr>`;
    tableRowsHtml += aheadRecords.map((r, i) => buildDiagRow(r, i, true)).join("");
  }
  if (behindRecords.length > 0) {
    tableRowsHtml += `<tr class="diag-group-sep"><td colspan="13">↓ Behind (${behindRecords.length} events) — sorted nearest first</td></tr>`;
    tableRowsHtml += behindRecords.map((r, i) => buildDiagRow(r, i, false)).join("");
  }
  if (tableRowsHtml === "") {
    tableRowsHtml = `<tr><td colspan="13" class="table-empty-msg">No events in current evaluation set.</td></tr>`;
  }

  const eventListHtml = `
    <div class="diag-block diag-block-full">
      <h3 class="diag-h3">Route-Ordered Event List
        <span class="wip-inline">sorted by along-route distance · per-session · not Canon</span>
      </h3>
      <p class="debug-note">
        Events sorted by <strong>signed along-route distance</strong> from vehicle (projection-derived, per-session).
        Ahead events shown first (ascending distance), then behind events.
        <strong>source_type_label</strong> is the primary human-readable label.
        Marker eval state shown only in <code>prepared_route</code> mode.
        <strong>Diagnostics only — no selection behavior changed.</strong>
      </p>
      <div class="table-scroll">
        <table class="event-table diag-event-table">
          <thead>
            <tr>
              <th class="diag-th-idx">#</th>
              <th>Event ID</th>
              <th>Source Ref</th>
              <th>Source Label</th>
              <th>raw_type</th>
              <th>norm type</th>
              <th>Dist (m)</th>
              <th class="proj-derived-label">Along-route ⊕</th>
              <th>Status</th>
              <th>Reason code</th>
              <th>Kind</th>
              <th>Role</th>
              <th>Marker state</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
      </div>
      <p class="debug-note-small">
        ⊕ per-session derived projection value — not persisted to base fixture files
        (event-applicability Canon truth 13)
      </p>
    </div>`;

  section.innerHTML = `
    <h2>Lifecycle / Order Diagnostics
      <span class="wip-badge">Issue #102 · diagnostics only · no selection/lifecycle behavior changes · WIP · not Canon</span>
    </h2>
    <div class="debug-warning">
      ⚠ Read-only diagnostics. No selection, lifecycle, or threshold changes are made here.
      All data is per-session derived — not persisted. WIP emulator debug — NOT Product Canon.
      Values reflect current evaluator behavior; see
      <code>docs/research/roadahead-stage2-lifecycle-order-diagnostics.md</code> for findings.
    </div>
    ${vehicleStateHtml}
    ${explanationHtml}
    ${eventListHtml}
  `;
}

// ---------------------------------------------------------------------------
// Route import section (Issue #79 / Slice 4.10)
//
// Renders route import controls and status into #route-import-section.
// EMULATOR OPERATOR / QA UI ONLY — NOT THE DRIVER-FACING UI.
// NOT Product Canon. Not navigation. Not routing. Not provider data.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Route/Data panel (Issue #93 / Stage 2)
//
// Rendered into #route-data-panel in the right-side sim-panel.
// Provides registry-based route selection (primary route load action).
// Shows route/geometry/events status after route is selected.
//
// Route is the load unit: selecting a route from the registry loads both
// geometry and prepared events together — the user does not do them separately.
//
// EMULATOR OPERATOR / QA UI ONLY — NOT THE DRIVER-FACING UI.
// NOT Product Canon. Not navigation. Not routing. Not driver-facing.
// Issue #93 / Stage 2.
// ---------------------------------------------------------------------------

/**
 * Render the Route/Data panel into #route-data-panel.
 *
 * Shows:
 *   - Route selector (dropdown of active registry routes + Load button)
 *   - Route/geometry status (once a route is loaded)
 *   - Prepared events status (loaded summary, not prepared, or error)
 *
 * Re-attaches the Load button listener after each innerHTML update.
 * Called on every render() cycle.
 *
 * EMULATOR OPERATOR / QA UI ONLY — NOT THE DRIVER-FACING UI.
 * NOT Product Canon. Issue #93 / Stage 2.
 */
function renderRouteDataPanel(): void {
  const panel = document.getElementById("route-data-panel");
  if (!panel) return;

  // Build route selector options from registry.
  let selectorHtml = "";
  if (routeRegistryLoadError !== null) {
    selectorHtml = `
      <div class="route-data-registry-error">
        Registry load error: ${escapeHtml(routeRegistryLoadError)}
      </div>`;
  } else if (routeRegistry === null) {
    selectorHtml = `<span class="route-data-loading">Loading route registry…</span>`;
  } else {
    const activeRoutes = routeRegistry.routes.filter(
      (r) => r.status === "active"
    );
    const options = activeRoutes
      .map(
        (r) =>
          `<option value="${escapeHtml(r.id)}"${activeRegistryRouteId === r.id ? " selected" : ""}>${escapeHtml(r.name)}</option>`
      )
      .join("");
    selectorHtml = `
      <div class="route-data-selector-row">
        <label for="route-data-select" class="route-data-label">Route</label>
        <select id="route-data-select" class="route-data-select">
          <option value="">— select route —</option>
          ${options}
        </select>
        <button id="route-data-load-btn" type="button" class="sim-btn sim-btn-green route-data-load-btn"
          title="Load selected route — geometry + prepared events · route is the load unit">Load</button>
      </div>`;
  }

  // Build status section — errors always visible; registry vs synthetic state.
  let statusHtml = "";

  if (routeImportError !== null) {
    const staleNote =
      activeRegistryRouteId !== null || activeRouteSource.kind !== "synthetic"
        ? `<div class="route-data-import-error-stale">Previous route may still be active on the map.</div>`
        : "";
    statusHtml += `
      <div class="route-data-import-error" role="alert">
        <strong>Latest load failed:</strong> ${escapeHtml(routeImportError)}
        ${staleNote}
      </div>`;
  }

  if (activeRegistryRouteId !== null && routeRegistry !== null) {
    const entry = routeRegistry.routes.find(
      (r) => r.id === activeRegistryRouteId
    );
    const routeName = entry?.name ?? activeRegistryRouteId;
    const waypointCount = activeRoute.coordinates.length;

    let eventsStatusHtml = "";
    let eventsDetailHtml = "";
    const evState = routeEventsState;
    if (evState.kind === "not_loaded") {
      eventsStatusHtml = `<span class="route-data-status-na">Events: —</span>`;
    } else if (evState.kind === "loading") {
      eventsStatusHtml = `<span class="route-data-status-loading">Events: loading…</span>`;
    } else if (evState.kind === "not_prepared") {
      eventsStatusHtml = `<span class="route-data-status-not-prepared">Events: not prepared</span>`;
    } else if (evState.kind === "error") {
      eventsStatusHtml = `<span class="route-data-status-error" title="${escapeHtml(evState.message)}">Events: dataset error ⚠</span>`;
    } else if (evState.kind === "loaded") {
      const ds = evState.dataset;
      const n = ds.summary.selected_events;
      const buf = ds.corridor.buffer_m;
      eventsStatusHtml = `<span class="route-data-status-loaded">Events: ${n} prepared · corridor ${buf} m</span>`;

      // Build source-label counts with checkboxes (Issue #97 / Stage 2).
      // Counts are by source_type_label (primary) — coarse by_type is shown separately.
      const labelCounts: Record<string, number> = {};
      for (const ev of ds.events) {
        labelCounts[ev.source_type_label] =
          (labelCounts[ev.source_type_label] ?? 0) + 1;
      }
      const labelRows = Object.entries(labelCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([lbl, cnt]) => {
          const checked = preparedEventVisibleLabels.has(lbl) ? " checked" : "";
          const escapedLbl = escapeHtml(lbl);
          return `
            <label class="ev-filter-row">
              <input type="checkbox" class="ev-filter-checkbox" data-label="${escapedLbl}"${checked}>
              <span class="ev-filter-label">${escapedLbl}</span>
              <span class="ev-filter-count">${cnt}</span>
            </label>`;
        })
        .join("");

      eventsDetailHtml = `
        <div class="ev-source-legend">
          <div class="ev-source-legend-header">
            <span class="ev-source-legend-title">Source labels · candidate observations</span>
            <span class="ev-source-legend-note">not applicability · not driver-facing</span>
          </div>
          <div class="ev-filter-list" id="ev-filter-list">
            ${labelRows}
          </div>
          <div class="ev-source-legend-bytype">
            norm: speed_limit ${ds.summary.by_type.speed_limit}
            · static_camera ${ds.summary.by_type.static_camera}
            · road_bump ${ds.summary.by_type.road_bump}
            · unknown ${ds.summary.by_type.unknown}
          </div>
        </div>`;
    }

    statusHtml += `
      <div class="route-data-status-block">
        <div class="route-data-status-row">
          <span class="route-data-status-label">Route:</span>
          <span class="route-data-status-value">${escapeHtml(routeName)}</span>
        </div>
        <div class="route-data-status-row">
          <span class="route-data-status-label">Geometry:</span>
          <span class="route-data-status-value route-data-status-loaded">loaded · ${waypointCount} points</span>
        </div>
        <div class="route-data-status-row">
          <span class="route-data-status-label"></span>
          <span class="route-data-status-value">${eventsStatusHtml}</span>
        </div>
      </div>
      ${eventsDetailHtml}`;
  } else if (activeRouteSource.kind === "synthetic") {
    const waypointCount = activeRoute.coordinates.length;
    statusHtml += `
      <div class="route-data-status-block">
        <div class="route-data-status-row">
          <span class="route-data-status-label">Route:</span>
          <span class="route-data-status-value">Synthetic fixture (default)</span>
        </div>
        <div class="route-data-status-row">
          <span class="route-data-status-label">Geometry:</span>
          <span class="route-data-status-value route-data-status-loaded">loaded · ${waypointCount} points</span>
        </div>
        <div class="route-data-status-row">
          <span class="route-data-status-label"></span>
          <span class="route-data-status-value route-data-status-not-prepared">Events: synthetic applicability fixtures (not route-scoped prepared data)</span>
        </div>
      </div>`;
  }

  panel.innerHTML = `
    <div class="route-data-panel-inner">
      <div class="route-data-header">
        <span class="route-data-title">Route / Data</span>
        <span class="route-data-wip-badge">WIP · geometry + events · not navigation · not Canon</span>
      </div>
      ${selectorHtml}
      ${statusHtml}
    </div>
  `;

  // Attach Load button listener after innerHTML replacement.
  attachRouteDataPanelListeners(panel);
}

/**
 * Attach the Load button listener and per-label filter checkboxes to
 * freshly rendered route-data-panel controls.
 *
 * Must be called after panel.innerHTML is set (nodes are freshly created).
 * Same pattern as attachRouteImportListeners() / attachDebugFilterListeners().
 *
 * Filter checkboxes (Issue #97 / Stage 2):
 *   Each checkbox carries a data-label attribute matching a source_type_label.
 *   Toggling a checkbox updates preparedEventVisibleLabels and re-renders
 *   event markers without reloading the route or dataset.
 *
 * Issue #93 / Stage 2. Issue #97 / Stage 2.
 */
function attachRouteDataPanelListeners(panel: HTMLElement): void {
  const loadBtn = panel.querySelector<HTMLButtonElement>("#route-data-load-btn");
  const selectEl = panel.querySelector<HTMLSelectElement>("#route-data-select");
  loadBtn?.addEventListener("click", () => {
    if (!routeRegistry || !selectEl) return;
    const selectedId = selectEl.value;
    if (!selectedId) return;
    const entry = routeRegistry.routes.find((r) => r.id === selectedId);
    if (!entry) return;
    loadRouteFromRegistry(entry);
  });

  // Wire per-label filter checkboxes (Issue #97 / Stage 2).
  // Each change updates preparedEventVisibleLabels and re-renders markers.
  // Does not reload the route or dataset — filter is view-only.
  const filterList = panel.querySelector<HTMLElement>("#ev-filter-list");
  filterList?.addEventListener("change", (evt) => {
    const target = evt.target;
    if (
      !(target instanceof HTMLInputElement) ||
      target.type !== "checkbox" ||
      !target.dataset["label"]
    )
      return;

    const label = target.dataset["label"];
    if (target.checked) {
      preparedEventVisibleLabels.add(label);
    } else {
      preparedEventVisibleLabels.delete(label);
    }

    // Re-render markers with updated visibility (no route/dataset reload).
    // Pass current eval states so the visual overlay is preserved after filter
    // toggle (Issue #99 / Stage 2). WIP debug overlay — not driver-facing.
    if (routeEventsState.kind === "loaded") {
      const currentEvalStates =
        deriveEventSourceMode().kind === "prepared_route"
          ? buildMarkerEvalStateMap(getState())
          : undefined;
      updateEventMarkersVisibility(
        routeEventsState.dataset.events,
        preparedEventVisibleLabels,
        currentEvalStates
      );
    }
    // Do NOT call render() here — checkboxes are already in the DOM and
    // re-rendering would recreate the panel and lose checkbox focus.
  });
}

/**
 * Render the route import section into #route-import-section.
 *
 * Shows:
 *   - file input to load a local GeoJSON route file
 *   - active route source label
 *   - reset-to-synthetic button
 *   - parse error message (if any)
 *   - disclaimer note
 *
 * EMULATOR OPERATOR / QA UI ONLY — NOT THE DRIVER-FACING UI.
 * Route geometry only — no event import, no speed limits, no provider data.
 * Not navigation. Not routing. NOT Product Canon. (Issue #79 / Slice 4.10)
 */
function renderRouteImportSection(): void {
  const section = document.getElementById("route-import-section");
  if (!section) return;

  const sourceLabel =
    activeRouteSource.kind === "synthetic"
      ? `<span class="route-source-synthetic">Synthetic fixture (default)</span>`
      : `<span class="route-source-imported">GeoJSON import: <code>${escapeHtml(activeRouteSource.filename)}</code></span>`;

  const errorHtml =
    routeImportError !== null
      ? `<div class="route-import-error-msg" role="alert">
          <strong>Import error:</strong> ${escapeHtml(routeImportError)}
         </div>`
      : "";

  const resetDisabled = activeRouteSource.kind === "synthetic" ? " disabled" : "";

  const rostov1ActiveClass =
    activeRouteSource.kind === "geojson" &&
    activeRouteSource.filename === ROSTOV1_ASSET_NAME
      ? " route-btn-active"
      : "";

  section.innerHTML = `
    <h2>Route Geometry Import
      <span class="wip-badge">local file · geometry only · not routing · not navigation · not Canon</span>
    </h2>
    <p class="route-import-disclaimer">
      <strong>Route geometry only.</strong>
      Load a local manually-created GeoJSON file to replace the synthetic route.
      No event import. No speed limits. No provider data. No network.
      Synthetic scenarios are tied to the synthetic route —
      selecting a scenario resets to synthetic route.
    </p>
    <div class="route-import-controls">
      <label for="geojson-file-input" class="route-import-file-label">Load GeoJSON route</label>
      <input
        type="file"
        id="geojson-file-input"
        accept=".json,.geojson"
        class="route-import-file-input"
      >
      <button
        id="reset-to-synthetic-btn"
        type="button"
        class="reset-synthetic-btn"${resetDisabled}
      >Reset to synthetic route</button>
    </div>
    <div class="route-import-controls route-import-known-routes">
      <span class="route-import-known-label">Owner-provided known routes:</span>
      <button
        id="load-rostov1-btn"
        type="button"
        class="load-known-route-btn${rostov1ActiveClass}"
        title="Load Rostov1 owner-provided route (FeatureCollection, LineString, 52 waypoints, lon-first WGS84) — geometry only, not provider data"
      >Load Rostov1 route</button>
      <span class="route-import-known-note">WIP · geometry only · not routing · not navigation</span>
    </div>
    <div class="route-source-row">
      <span class="route-source-label-text">Active route source:</span>
      <span class="route-source-value" id="route-source-value">${sourceLabel}</span>
    </div>
    ${errorHtml}
    <p class="route-import-format-note">
      Supported formats: GeoJSON LineString geometry, GeoJSON Feature (LineString),
      GeoJSON FeatureCollection (first LineString used).
      Coordinates must be <code>[longitude, latitude]</code> (WGS84, longitude-first).
      Minimum 2 coordinate pairs required.
      <br>
      <strong>Rostov1:</strong> owner-provided known-route file
      (<code>data/raw/routes/Rostov1.geojson</code>) — FeatureCollection, 1 Feature,
      LineString, 52 waypoints, coordinates [lon, lat], lon ~38.6°–39.4°E, lat ~56.6°–57.2°N.
      Bundled as <code>public/routes/Rostov1.geojson</code> (Issue #87 / Stage 2).
    </p>
  `;

  // Attach listeners to freshly created controls after innerHTML replacement.
  // Must happen after every render because innerHTML discards old nodes and
  // their event listeners. Same pattern as attachDebugFilterListeners().
  attachRouteImportListeners(section);
}

// ---------------------------------------------------------------------------
// Upcoming events strip (Issue #78 / Slice 4.9)
//
// WIP emulator QA display — NOT the driver-facing UI.
// NOT Product Canon. Not navigation. Not routing. Not ETA. Not traffic.
//
// Derives display items from existing SimulationState / eventSelection.records
// only. Does NOT call selectEvents() again. Does NOT recompute projection,
// direction compatibility, or event selection.
//
// Filter: accepted / driver-facing-eligible records with distance_m > 0.
// Sort: ascending by distance_m (nearest first).
// Limit: MAX_UPCOMING_STRIP_ITEMS.
// ---------------------------------------------------------------------------

/** Max items shown in the upcoming events strip. WIP constant — not Canon. */
const MAX_UPCOMING_STRIP_ITEMS = 5;

/** A single resolved item for the upcoming events strip. Derived UI-only type. */
interface UpcomingEventItem {
  event_id: string;
  normalized_type: string;
  /** Type-aware advisory label from getEventDisplaySemantics(). UI only. */
  advisory_label: string;
  /** Positive signed distance ahead in metres (distance_m from the record). */
  distance_m: number;
  /** True if this event is the currently selected primary event. */
  is_primary: boolean;
}

/**
 * Derive upcoming event strip items from existing SimulationState.
 *
 * Filter: applicabilityReason.is_driver_facing_eligible === true AND distance_m > 0.
 * Sort: ascending by distance_m (nearest first).
 * Limit: MAX_UPCOMING_STRIP_ITEMS.
 *
 * Does NOT call selectEvents(). Does NOT recompute projection or direction.
 * Reuses eventSelection.records from the already-computed state.
 *
 * WIP emulator QA display — NOT the driver-facing UI. NOT Product Canon.
 * Not navigation. Not routing. Not ETA. (Issue #78 / Slice 4.9)
 */
function getUpcomingEventItems(state: SimulationState): UpcomingEventItem[] {
  const primaryId = state.eventSelection.primary?.event_id ?? null;
  return state.eventSelection.records
    .filter(
      (r) => r.applicabilityReason.is_driver_facing_eligible && r.distance_m > 0
    )
    .sort((a, b) => a.distance_m - b.distance_m)
    .slice(0, MAX_UPCOMING_STRIP_ITEMS)
    .map((r) => ({
      event_id: r.event_id,
      normalized_type: r.normalized_type,
      advisory_label: getEventDisplaySemantics(r.normalized_type).primaryAdvisoryLabel,
      distance_m: r.distance_m,
      is_primary: r.event_id === primaryId,
    }));
}

/**
 * Format a distance-ahead value as a compact string.
 * WIP emulator QA display only — not Product Canon.
 */
function formatDistanceAhead(distance_m: number): string {
  if (distance_m >= 1000) {
    return `${(distance_m / 1000).toFixed(1)} km`;
  }
  return `${Math.round(distance_m)} m`;
}

/**
 * Render the upcoming events strip into #upcoming-events-strip.
 *
 * Shows accepted/eligible events ahead of the current vehicle position,
 * derived from existing eventSelection.records. Updates on every render cycle
 * (manual slider, playback, scenario selection, speed changes) through the
 * existing render() path.
 *
 * WIP emulator QA display — NOT the driver-facing UI. NOT Product Canon.
 * Not navigation. Not routing. Not ETA. Not traffic.
 * Derived from existing applicability output only — no new domain logic.
 * (Issue #78 / Slice 4.9)
 */
function renderUpcomingEventsStrip(state: SimulationState): void {
  const section = document.getElementById("upcoming-events-strip");
  if (!section) return;

  const items = getUpcomingEventItems(state);

  let bodyHtml: string;
  if (items.length === 0) {
    bodyHtml = `
      <p class="upcoming-empty">
        No accepted upcoming events in current window
        <span class="upcoming-empty-note">(no driver-facing eligible events with positive distance)</span>
      </p>`;
  } else {
    const cards = items
      .map((item) => {
        const primaryBadge = item.is_primary
          ? `<span class="upcoming-primary-badge">current primary</span>`
          : "";
        // Normalise type to a CSS-safe class suffix (underscores → dashes).
        const typeSlug = item.normalized_type.replace(/_/g, "-");
        const primaryClass = item.is_primary ? " upcoming-card-primary" : "";
        return `<div class="upcoming-card upcoming-type-${escapeHtml(typeSlug)}${primaryClass}">
          <div class="upcoming-card-top">
            <code class="upcoming-event-id">${escapeHtml(item.event_id)}</code>
            ${primaryBadge}
          </div>
          <div class="upcoming-advisory">${escapeHtml(item.advisory_label)}</div>
          <div class="upcoming-distance">${escapeHtml(formatDistanceAhead(item.distance_m))}</div>
        </div>`;
      })
      .join("");
    bodyHtml = `<div class="upcoming-cards">${cards}</div>`;
  }

  section.innerHTML = `
    <h2>Upcoming Events
      <span class="wip-badge">emulator QA display — not driver-facing UI · not navigation · not Canon</span>
    </h2>
    <p class="upcoming-note">
      Accepted/eligible candidate events ahead of current position.
      Derived from existing applicability output — no new event selection logic.
      Not navigation. Not routing. Not ETA. WIP QA display only.
    </p>
    ${bodyHtml}
  `;
}

// ---------------------------------------------------------------------------
// Scenario inspector (Issue #70)
//
// Renders selected synthetic scenario metadata to #scenario-inspector.
// Shows expected values from the scenario definition for QA comparison.
// Does NOT duplicate domain logic from runScenarioSweep.ts.
//
// WIP / QA tool only — NOT the driver-facing UI. NOT Product Canon.
// ---------------------------------------------------------------------------

/**
 * Render the scenario inspector panel for the currently selected scenario.
 *
 * Shows scenario id, title, applied inputs, and expected outcomes from the
 * scenario definition. When no scenario is selected, shows a "manual control"
 * notice. Expected values are for QA comparison only — actual values are in
 * the debug panel below.
 *
 * EMULATOR DEBUG / QA ONLY — not driver-facing. NOT Product Canon.
 */
function renderScenarioInspector(): void {
  const el = document.getElementById("scenario-inspector");
  if (!el) return;

  if (!selectedScenarioId) {
    el.innerHTML = `
      <h2>Scenario Inspector <span class="wip-badge">debug / QA only</span></h2>
      <p class="scenario-inspector-empty">No scenario selected — manual control active.
        Select a scenario from the <strong>Scenario</strong> dropdown in the header above.</p>
    `;
    return;
  }

  const scenario = findScenario(selectedScenarioId);
  if (!scenario) {
    el.innerHTML = `
      <h2>Scenario Inspector <span class="wip-badge">debug / QA only</span></h2>
      <p class="scenario-inspector-empty">Scenario not found: ${escapeHtml(selectedScenarioId)}</p>
    `;
    return;
  }

  const progressPct = (scenario.routeProgressFraction * 100).toFixed(0);

  const primaryEventHtml =
    scenario.expectedPrimaryEventId !== undefined
      ? scenario.expectedPrimaryEventId !== null
        ? `<code>${escapeHtml(scenario.expectedPrimaryEventId)}</code>`
        : `<em>none</em>`
      : `<em class="scenario-check-skipped">check skipped</em>`;

  const refStateHtml =
    scenario.expectedSpeedReferenceState !== undefined
      ? `<code>${escapeHtml(scenario.expectedSpeedReferenceState)}</code>`
      : `<em class="scenario-check-skipped">check skipped</em>`;

  const targetSpeedHtml =
    scenario.expectedTargetSpeedKmh !== undefined
      ? scenario.expectedTargetSpeedKmh !== null
        ? `${scenario.expectedTargetSpeedKmh} km/h <span class="scenario-advisory-note">(advisory, not legal)</span>`
        : `<em>none</em>`
      : `<em class="scenario-check-skipped">check skipped</em>`;

  const checksCount = scenario.eventChecks?.length ?? 0;
  const checksHtml =
    checksCount === 0
      ? `<li><em>no per-event checks defined</em></li>`
      : (scenario.eventChecks ?? [])
          .map((check) => {
            const parts: string[] = [
              `<code class="scenario-check-eventid">${escapeHtml(check.eventId)}</code>`,
            ];
            if (check.expectedStatus !== undefined)
              parts.push(`status: <code>${escapeHtml(check.expectedStatus)}</code>`);
            if (check.expectedReasonCode !== undefined)
              parts.push(`code: <code>${escapeHtml(check.expectedReasonCode)}</code>`);
            if (check.expectedReasonKind !== undefined)
              parts.push(`kind: <code>${escapeHtml(check.expectedReasonKind)}</code>`);
            if (check.expectNonZeroCrossTrack)
              parts.push(`cross-track &gt; 0`);
            return `<li>${parts.join(" · ")}</li>`;
          })
          .join("\n");

  el.innerHTML = `
    <h2>Scenario Inspector <span class="wip-badge">debug / QA only — not Product Canon</span></h2>
    <p class="scenario-inspector-note">
      Expected values from scenario definition — WIP QA/debug comparison only, not Product Canon.
      Actual emulator output is shown in the debug panel below.
    </p>
    <div class="scenario-inspector-grid">
      <div class="scenario-meta-item">
        <span class="scenario-meta-label">ID</span>
        <code class="scenario-meta-value">${escapeHtml(scenario.id)}</code>
      </div>
      <div class="scenario-meta-item scenario-meta-title-item">
        <span class="scenario-meta-label">Title</span>
        <span class="scenario-meta-value">${escapeHtml(scenario.title)}</span>
      </div>
      <div class="scenario-meta-item">
        <span class="scenario-meta-label">Route progress</span>
        <span class="scenario-meta-value"><code>${scenario.routeProgressFraction}</code> (${progressPct}%)</span>
      </div>
      <div class="scenario-meta-item">
        <span class="scenario-meta-label">Speed (applied)</span>
        <span class="scenario-meta-value">${scenario.speedKmh} km/h</span>
      </div>
      <div class="scenario-meta-item">
        <span class="scenario-meta-label">Expected primary event</span>
        <span class="scenario-meta-value">${primaryEventHtml}</span>
      </div>
      <div class="scenario-meta-item">
        <span class="scenario-meta-label">Expected ref state</span>
        <span class="scenario-meta-value">${refStateHtml}</span>
      </div>
      <div class="scenario-meta-item">
        <span class="scenario-meta-label">Expected target speed</span>
        <span class="scenario-meta-value">${targetSpeedHtml}</span>
      </div>
    </div>
    <div class="scenario-checks-block">
      <h3>Event checks (${checksCount})</h3>
      <ul class="scenario-checks-list">
        ${checksHtml}
      </ul>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Evidence snapshot (Issue #72 / Slice 4.7)
//
// Builds a Markdown-formatted copyable snapshot of the current emulator state
// for pasting into GitHub PR / issue comments as manual QA evidence.
//
// Generated entirely from SimulationState — no domain logic is duplicated.
// Debug filter does NOT affect snapshot contents; all event records are
// always included regardless of the current filter setting.
//
// EMULATOR DEBUG / QA ONLY — NOT Product Canon, not driver-facing output,
// not legal guidance, not safety-certified behavior.
// ---------------------------------------------------------------------------

/**
 * Escape pipe characters so table cells are not broken in GitHub Markdown.
 * Also removes newlines which would break table rows.
 */
function escapeMd(s: string | number | null | undefined): string {
  if (s == null) return "–";
  return String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

/**
 * Build a GitHub-Markdown-formatted evidence snapshot from the current state.
 *
 * Uses getEventSelectionSummary() and selectedScenarioId from module scope.
 * No domain logic is recalculated; all data comes from SimulationState.
 *
 * EMULATOR DEBUG / QA ONLY — NOT Product Canon, not driver-facing, not legal.
 */
function buildEvidenceSnapshotMarkdown(state: SimulationState): string {
  const { acceptedCount, suppressedCount, notProcessedCount } =
    getEventSelectionSummary(state);
  const { primary } = state.eventSelection;
  const refState = state.speedReference.state;
  const targetSpeed = state.speedReference.target_speed_kmh;

  let modeLine: string;
  if (selectedScenarioId) {
    const sc = findScenario(selectedScenarioId);
    modeLine = sc
      ? `Scenario ${escapeMd(sc.id)} — ${escapeMd(sc.title)}`
      : `Scenario ${escapeMd(selectedScenarioId)}`;
  } else {
    modeLine = "Manual control (no scenario selected)";
  }

  const progressPct = Math.round(state.progress * 100);
  const primaryLine = primary ? escapeMd(primary.event_id) : "none";

  // Type-aware target speed line: avoid fake speed for camera / road_bump.
  const primarySemantics = getEventDisplaySemantics(primary?.normalized_type);
  const targetLine =
    primarySemantics.hasTargetSpeed && targetSpeed != null
      ? `${targetSpeed} km/h (advisory only — not legal)`
      : primarySemantics.hasTargetSpeed
        ? "none"
        : `none (${primarySemantics.noSpeedLabel})`;

  const tableHeader =
    "| Event | Type | Status | Reason code | Kind | Eligible | Signed dist m | Cross-track m |";
  const tableSep =
    "|---|---|---|---|---|---|---:|---:|";

  const tableRows = state.eventSelection.records.map((r) => {
    const signedDist =
      r.distance_m >= 0
        ? `+${r.distance_m.toFixed(0)}`
        : `${r.distance_m.toFixed(0)}`;
    const crossTrack = r.projection_cross_track_m.toFixed(1);
    const eligible = r.applicabilityReason.is_driver_facing_eligible
      ? "yes"
      : "no";
    return (
      `| ${escapeMd(r.event_id)}` +
      ` | ${escapeMd(r.normalized_type)}` +
      ` | ${escapeMd(r.status)}` +
      ` | ${escapeMd(r.applicabilityReason.code)}` +
      ` | ${escapeMd(r.applicabilityReason.kind)}` +
      ` | ${escapeMd(eligible)}` +
      ` | ${escapeMd(signedDist)}` +
      ` | ${escapeMd(crossTrack)} |`
    );
  });

  const routeSourceLine =
    activeRouteSource.kind === "synthetic"
      ? "synthetic fixture (default)"
      : `GeoJSON import: ${activeRouteSource.filename}`;

  const lines = [
    `## RoadAhead Emulator Manual Evidence Snapshot`,
    ``,
    `- Mode: ${modeLine}`,
    `- Active route source: ${routeSourceLine}`,
    `- Route progress: ${progressPct}% / ${state.progress.toFixed(4)}`,
    `- Current speed: ${state.speedKmh} km/h`,
    `- Primary event: ${primaryLine}`,
    `- Primary event type: ${primary ? escapeMd(primary.normalized_type) : "none"}`,
    `- Primary advisory context: ${escapeMd(primarySemantics.primaryAdvisoryLabel)}`,
    `- Speed reference: ${escapeMd(refState)}`,
    `- Target speed: ${targetLine}`,
    `- Counts: accepted ${acceptedCount} / suppressed ${suppressedCount} / not_processed ${notProcessedCount}`,
    ``,
    `### Event records`,
    tableHeader,
    tableSep,
    ...tableRows,
    ``,
    `_WIP emulator QA evidence only — not Product Canon, not legal guidance, not safety-certified._`,
  ];

  return lines.join("\n");
}

/**
 * Render the evidence snapshot panel into #evidence-snapshot.
 *
 * Called on every render cycle so the snapshot always reflects current state.
 * Re-attaches the Copy button listener after each innerHTML update.
 *
 * Clipboard API is used when available; on failure or absence the textarea
 * is selected so the user can copy manually.
 *
 * EMULATOR DEBUG / QA ONLY — NOT Product Canon, not driver-facing.
 */
function renderEvidenceSnapshot(state: SimulationState): void {
  const section = document.getElementById("evidence-snapshot");
  if (!section) return;

  const markdown = buildEvidenceSnapshotMarkdown(state);

  section.innerHTML = `
    <h2>Manual Evidence Snapshot
      <span class="wip-badge">debug / QA only — not Product Canon</span>
    </h2>
    <p class="evidence-snapshot-note">
      Copyable snapshot of current emulator state for pasting into GitHub PR / issue comments.
      Generated from SimulationState — no domain logic duplicated.
      WIP / debug / QA only — not Product Canon, not legal guidance, not safety-certified.
      Snapshot always includes all event records regardless of the debug filter above.
    </p>
    <div class="evidence-snapshot-toolbar">
      <button id="copy-snapshot-btn" class="copy-snapshot-btn" type="button">Copy snapshot</button>
      <span id="copy-snapshot-status" class="copy-snapshot-status" aria-live="polite"></span>
    </div>
    <textarea
      id="evidence-snapshot-text"
      class="evidence-snapshot-textarea"
      readonly
      spellcheck="false"
      aria-label="Markdown evidence snapshot — select all and copy, or use the Copy button"
    >${escapeHtml(markdown)}</textarea>
  `;

  const btn = document.getElementById(
    "copy-snapshot-btn"
  ) as HTMLButtonElement | null;
  const statusEl = document.getElementById("copy-snapshot-status");
  const textarea = document.getElementById(
    "evidence-snapshot-text"
  ) as HTMLTextAreaElement | null;

  const showStatus = (msg: string): void => {
    if (!statusEl) return;
    statusEl.textContent = msg;
    setTimeout(() => {
      if (statusEl) statusEl.textContent = "";
    }, 2500);
  };

  btn?.addEventListener("click", () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(markdown).then(() => {
        showStatus("Copied!");
      }).catch(() => {
        textarea?.select();
        showStatus("Copy failed — select text manually.");
      });
    } else {
      textarea?.select();
      try {
        document.execCommand("copy");
        showStatus("Copied!");
      } catch {
        showStatus("Copy unavailable — select text manually.");
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

buildApp();
