/**
 * RoadAhead Phase 0 — Web Route Emulator
 * Issue #88 / Stage 2: Real map baseline — OSM background, route line, vehicle marker.
 * Issue #97 / Stage 2: Prepared event markers — source-type-aware display.
 * Issue #99 / Stage 2: Evaluation state overlay on prepared event markers.
 *
 * This module provides a Leaflet/OSM map surface for spatial evaluation of the
 * known route and vehicle position. It is a web-only debug / QA visualization
 * tool — not a navigator, not provider data, not routing, not the driver-facing UI.
 *
 * Map data © OpenStreetMap contributors (ODbL). Attribution is kept visible.
 *
 * EMULATOR DEBUG / QA UI — NOT THE DRIVER-FACING UI.
 * Not a navigator. Not an anti-radar. Not a legal speed-limit authority.
 * Not safety-certified. No provider speed, ETA, traffic, or routing.
 * Map is a spatial evaluation / debug surface only.
 * NOT Product Canon.
 *
 * Prepared event markers (Issue #97):
 *   Rendering a marker does NOT mean:
 *   - RoadAhead accepted the event as relevant;
 *   - the event is driver-facing;
 *   - the event is legally authoritative;
 *   - the event affects the three-circle control;
 *   - the event passed route applicability / relevance logic.
 *   Markers are candidate source observations only — emulator spatial QA.
 *
 * Evaluation state overlay (Issue #99 / Stage 2):
 *   When prepared events are evaluated through the applicability pipeline,
 *   marker visual state (border/weight/opacity) reflects evaluation status.
 *   Source-type fill color is always preserved — evaluation state uses
 *   border/weight/opacity only, not fill color.
 *   Evaluation state is WIP debug data only — not final driver-facing behavior,
 *   not legal truth, not safety-certified. NOT Product Canon.
 */

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RouteGeometry } from "./contracts/routeGeometry.js";
import type { RouteEvent } from "./contracts/routeEventDataset.js";

// ---------------------------------------------------------------------------
// Evaluation state overlay types (Issue #99 / Stage 2)
//
// Used to reflect applicability pipeline results on prepared event markers.
// Marker fill color (source-type identity) is always preserved.
// Evaluation state is shown through border/weight/opacity only.
//
// WIP emulator debug overlay — NOT Product Canon. NOT driver-facing behavior.
// NOT legal truth. NOT safety-certified. NOT final warning/alert semantics.
// ---------------------------------------------------------------------------

/**
 * Marker evaluation state derived from the applicability pipeline.
 *
 * Maps EventStatus / EventSelectionResult state to a compact visual category.
 * Used by updateEventMarkerEvaluationStates() to style markers.
 *
 * WIP — NOT Product Canon. Stage 2 / Issue #99.
 *
 *   "primary"      — selected primary applicable event (EventStatus "selected").
 *   "next"         — secondary candidate / next event in lookahead window.
 *   "eligible"     — other candidate inside lookahead window (not selected).
 *   "suppressed"   — suppressed by direction/cross-track/projection check.
 *   "inactive"     — behind vehicle, too far ahead, or too close.
 *   "out_of_scope" — event type not in evaluation scope ("unknown" types).
 *   "default"      — no evaluation state known (synthetic mode or unmapped).
 */
export type MarkerEvalState =
  | "primary"
  | "next"
  | "eligible"
  | "suppressed"
  | "inactive"
  | "out_of_scope"
  | "default";

// ---------------------------------------------------------------------------
// Mutable Leaflet instances
// ---------------------------------------------------------------------------

/** The Leaflet map instance. Null until initMap() is called. */
let map: L.Map | null = null;

/** The active route polyline layer. Null until the first route is set. */
let routePolyline: L.Polyline | null = null;

/**
 * The vehicle position marker — a vector CircleMarker.
 * No external image assets are loaded; the marker is drawn by Leaflet's
 * SVG/Canvas renderer. OSM tiles remain the only external map runtime resource.
 * Null until the first route is set.
 */
let vehicleMarker: L.CircleMarker | null = null;

/**
 * LayerGroup holding all prepared event CircleMarkers (Issue #97 / Stage 2).
 *
 * Individual markers are added/removed on every setEventMarkers() call.
 * The group is cleared by clearEventMarkers() and on route change.
 * Null until the map is initialized.
 *
 * Markers are candidate source observations — not applicability decisions,
 * not driver-facing eligibility, not three-circle control.
 * EMULATOR SPATIAL QA ONLY — NOT Product Canon.
 */
let eventMarkersLayer: L.LayerGroup | null = null;

/**
 * Cached marker ref entry: the Leaflet CircleMarker plus the originating
 * RouteEvent. Both are needed so that updateEventMarkerEvaluationStates()
 * can call setPopupContent() with current eval state, keeping popup content
 * in sync with marker border/opacity on every render tick.
 *
 * EMULATOR INTERNAL — NOT Product Canon. Stage 2 / Issue #99.
 */
interface MarkerRef {
  marker: L.CircleMarker;
  /** RouteEvent that produced this marker — used for popup re-generation. */
  event: RouteEvent;
}

/**
 * Map from RouteEvent.id → MarkerRef (Issue #99 / Stage 2).
 *
 * Populated by setEventMarkers() and cleared by clearEventMarkers().
 * Used by updateEventMarkerEvaluationStates() to call setStyle() and
 * setPopupContent() on existing markers without recreating them.
 *
 * Keys are RouteEvent.id values, which also serve as PreparedEvent.event_id
 * in the adapted events (via routeEventAdapter.ts). The evalStateMap passed
 * to updateEventMarkerEvaluationStates() uses the same id values as keys.
 *
 * Storing the RouteEvent alongside the marker allows popup re-generation from
 * the same data without rebuilding the DOM element — only the popup HTML is
 * refreshed via setPopupContent(). Fill color and geometry are unchanged.
 *
 * EMULATOR INTERNAL — NOT Product Canon. Stage 2 / Issue #99.
 */
let eventMarkerRefs: Map<string, MarkerRef> = new Map();

// ---------------------------------------------------------------------------
// Evaluation state visual style map (Issue #99 / Stage 2)
//
// Maps MarkerEvalState to Leaflet CircleMarker style overrides.
// Fill color is NOT changed — source-type identity is always preserved.
// Only border (color / weight) and fillOpacity are adjusted.
//
// WIP debug styling — NOT Product Canon. NOT driver-facing. NOT safety signal.
// ---------------------------------------------------------------------------

/**
 * Leaflet CircleMarker style fields controlled by evaluation state.
 * Only border and opacity are modified — fill color stays as source-type color.
 */
interface EvalStateStyle {
  color: string;       // border color
  weight: number;      // border weight
  fillOpacity: number; // fill opacity (source-type fill color is preserved)
}

/**
 * Style lookup by MarkerEvalState. WIP — NOT Product Canon.
 *
 * Opacity values are intentionally kept readable for QA inspection:
 *   primary / next / eligible — near full opacity; primary has gold border.
 *   suppressed — visible but clearly dimmed (0.55) so candidate layer stays readable.
 *   inactive / out_of_scope — dim but not invisible (0.45); candidate observations
 *     must remain inspectable on the map at normal zoom.
 *   default — full opacity; shown when no evaluation is active (synthetic mode).
 *
 * Fill color (source-type identity) is always preserved; only border and opacity change.
 * (Issue #99 follow-up — manual QA marker readability adjustment)
 */
const EVAL_STATE_STYLES: Record<MarkerEvalState, EvalStateStyle> = {
  primary: {
    color: "#FFD700", // gold border — primary event
    weight: 3,
    fillOpacity: 1.0,
  },
  next: {
    color: "#ffffff",  // white border — next/secondary event
    weight: 2.5,
    fillOpacity: 0.95,
  },
  eligible: {
    color: "#ffffff",  // white border — other eligible candidate
    weight: 1.5,
    fillOpacity: 0.85,
  },
  suppressed: {
    color: "#9ca3af", // gray border — suppressed by direction/cross-track
    weight: 1,
    fillOpacity: 0.55, // raised from 0.35 — suppressed candidates must remain inspectable
  },
  inactive: {
    color: "#9ca3af", // gray border — behind / too far / too close
    weight: 1,
    fillOpacity: 0.45, // raised from 0.20 — inactive candidates must remain visible at normal zoom
  },
  out_of_scope: {
    color: "#9ca3af", // gray border — unknown type, out of scope
    weight: 1,
    fillOpacity: 0.45, // raised from 0.25 — must remain visible as candidate observation
  },
  default: {
    color: "#ffffff",  // white border — no evaluation state (synthetic mode)
    weight: 1,
    fillOpacity: 0.85,
  },
};

/**
 * Return the visual style for a given MarkerEvalState.
 * Falls back to "default" for any unmapped state.
 */
function getEvalStateStyle(state: MarkerEvalState): EvalStateStyle {
  return EVAL_STATE_STYLES[state] ?? EVAL_STATE_STYLES["default"];
}

// ---------------------------------------------------------------------------
// Source-type-label color map (Issue #97 / Stage 2)
//
// Maps source_type_label → Leaflet CircleMarker fill color.
// Groups roughly by data category for QA readability.
//
// Color is purely a QA / debug differentiation aid — it carries no
// product meaning, no applicability weight, no Canon standing.
// Colors are local to this emulator; no external assets are used.
//
// Suggested groupings (per issue #97 scope):
//   camera-like:      static_camera, traffic_light_camera, red_light_camera,
//                     average_speed_camera, mobile_camera
//   speed-regime:     speed_limit
//   hazard/road:      speed_bump, bad_road, dangerous_turn,
//                     dangerous_intersection, other_danger
//   crossing:         pedestrian_crossing
// ---------------------------------------------------------------------------

/** Source-type-label color mapping. WIP — not Canon. */
const SOURCE_TYPE_LABEL_COLORS: Record<string, string> = {
  // camera-like
  static_camera: "#1d4ed8",          // blue-700
  traffic_light_camera: "#2563eb",   // blue-600
  red_light_camera: "#7c3aed",       // violet-600
  average_speed_camera: "#0891b2",   // cyan-600
  mobile_camera: "#0e7490",          // cyan-700

  // speed-regime
  speed_limit: "#9333ea",            // purple-600

  // hazard/road
  speed_bump: "#dc2626",             // red-600
  bad_road: "#ea580c",               // orange-600
  dangerous_turn: "#b45309",         // amber-700
  dangerous_intersection: "#d97706", // amber-600
  other_danger: "#c2410c",           // orange-700

  // crossing
  pedestrian_crossing: "#16a34a",    // green-600
};

/** Fallback color for unknown source_type_label values. */
const FALLBACK_MARKER_COLOR = "#6b7280"; // gray-500

/**
 * Return the marker fill color for the given source_type_label.
 *
 * Falls back to gray for any label not in the explicit map.
 * Color is a QA differentiation aid — no product meaning.
 */
function getSourceTypeLabelColor(label: string): string {
  return SOURCE_TYPE_LABEL_COLORS[label] ?? FALLBACK_MARKER_COLOR;
}

// ---------------------------------------------------------------------------
// Popup HTML builder (Issue #97 / Stage 2)
//
// Source-type-label-first popup order per #95 display rule.
// All field values are HTML-escaped before insertion.
// EMULATOR DEBUG POPUP ONLY — NOT THE DRIVER-FACING UI.
// ---------------------------------------------------------------------------

/** Minimal HTML escaper for popup field values. */
function escapeHtmlMapView(s: string | number | null | undefined): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Build popup HTML for a prepared event marker.
 *
 * Display order follows #95 contract:
 *   1. source_type_label (primary — Datakam/OSC source semantics)
 *   2. raw_type (debugging provenance)
 *   3. normalized type (coarse emulator context only)
 *   4. eval state (Issue #99 — WIP debug, shown when available)
 *   5. speed_kmh
 *   6. dirtype
 *   7. source facing direction (raw DIRECTION from dataset)
 *   8. effective travel direction (facing + 180) % 360 — WIP Datakam convention
 *   9. source ref / id
 *  10. distance_to_route_m
 *  11. projected_route_distance_m
 *  12. lon / lat
 *
 * Direction display (Issue #99 follow-up — Datakam convention):
 *   Datakam/OpenSpeedcam DIRECTION = sign/camera facing direction (toward
 *   approaching vehicles). The applicable vehicle travel direction is opposite.
 *   Both are shown for QA traceability.
 *   WIP — NOT Product Canon.
 *
 * EMULATOR DEBUG / QA POPUP — NOT THE DRIVER-FACING UI.
 * NOT Product Canon. Candidate source observations only.
 *
 * @param ev - The prepared route event.
 * @param evalState - Optional current evaluation state for this event.
 *   WIP debug data only — not final driver-facing behavior, not Canon.
 */
function buildEventPopupHtml(
  ev: RouteEvent,
  evalState?: MarkerEvalState
): string {
  const projKm =
    ev.projected_route_distance_m != null
      ? (ev.projected_route_distance_m / 1000).toFixed(2) + " km"
      : "—";

  const evalStateRow =
    evalState != null && evalState !== "default"
      ? `<tr><td>eval state</td><td><span class="ev-popup-eval-state ev-popup-eval-${escapeHtmlMapView(evalState)}">${escapeHtmlMapView(evalState)}</span> <em class="ev-popup-eval-note">WIP · debug only</em></td></tr>`
      : "";

  // Direction display (Issue #99 follow-up — Datakam/OSC direction convention).
  // DIRECTION = sign/camera facing direction (toward approaching vehicles).
  // Effective vehicle travel direction = (DIRECTION + 180) % 360.
  // Both are shown so QA can verify the direction inversion applied by the adapter.
  // WIP — NOT Product Canon. Source semantics not globally verified.
  const facingDirDeg = ev.direction_deg;
  const effectiveTravelDirDeg = (facingDirDeg + 180) % 360;

  // DIRTYPE display (Issue #99 P2 fix — DIRTYPE=2 → evaluator bidirectional).
  // Raw DIRTYPE from dataset is shown alongside the evaluator's effective source_dirtype.
  // DIRTYPE=2 ("both directions") is adapted to evaluator's bidirectional (0).
  // WIP — NOT Product Canon.
  const rawDirtype = ev.dirtype;
  const evalDirtype = rawDirtype === 2 ? 0 : rawDirtype;
  const dirtypeNote =
    rawDirtype === 2
      ? `<em class="ev-popup-dir-note">both directions → eval bidirectional (0) · WIP Datakam conv.</em>`
      : rawDirtype === 1
      ? `<em class="ev-popup-dir-note">one direction</em>`
      : rawDirtype === 0
      ? `<em class="ev-popup-dir-note">all directions</em>`
      : `<em class="ev-popup-dir-note">unknown/unsupported</em>`;
  const dirtypeEvalRow =
    rawDirtype !== evalDirtype
      ? `<tr><td>dirtype (eval)</td><td><strong>${escapeHtmlMapView(evalDirtype)}</strong> <em class="ev-popup-dir-note">adapter: ${rawDirtype}→${evalDirtype}</em></td></tr>`
      : "";

  return `
    <div class="ev-popup">
      <div class="ev-popup-header">
        <span class="ev-popup-source-label">${escapeHtmlMapView(ev.source_type_label)}</span>
        <span class="ev-popup-wip-badge">candidate observation · not applicability</span>
      </div>
      <table class="ev-popup-table">
        <tr><td>source label</td><td><strong>${escapeHtmlMapView(ev.source_type_label)}</strong></td></tr>
        <tr><td>raw type</td><td>${escapeHtmlMapView(ev.raw_type)}</td></tr>
        <tr><td>norm. type</td><td><em>${escapeHtmlMapView(ev.type)}</em></td></tr>
        ${evalStateRow}
        <tr><td>speed (src)</td><td>${ev.speed_kmh != null ? escapeHtmlMapView(ev.speed_kmh) + ` km/h${ev.type !== "speed_limit" ? ' <em class="ev-popup-eval-note">advisory attr · not target</em>' : ""}` : "—"}</td></tr>
        <tr><td>dirtype (src)</td><td>${escapeHtmlMapView(rawDirtype)} ${dirtypeNote}</td></tr>
        ${dirtypeEvalRow}
        <tr><td>facing dir (src)</td><td>${escapeHtmlMapView(facingDirDeg)}° <em class="ev-popup-dir-note">raw DIRECTION · sign/camera facing</em></td></tr>
        <tr><td>travel dir (eff.)</td><td><strong>${escapeHtmlMapView(effectiveTravelDirDeg)}°</strong> <em class="ev-popup-dir-note">(facing+180)%360 · WIP Datakam conv.</em></td></tr>
        <tr><td>id / ref</td><td>${escapeHtmlMapView(ev.id)} / ${escapeHtmlMapView(ev.source_ref)}</td></tr>
        <tr><td>dist to route</td><td>${escapeHtmlMapView(ev.distance_to_route_m.toFixed(1))} m</td></tr>
        <tr><td>proj. route pos</td><td>${projKm}</td></tr>
        <tr><td>lon / lat</td><td>${escapeHtmlMapView(ev.lon.toFixed(6))} / ${escapeHtmlMapView(ev.lat.toFixed(6))}</td></tr>
      </table>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize the Leaflet map inside the given container element.
 *
 * Creates an OSM tile layer with required attribution, a route polyline from
 * the initial route, and a vehicle marker at position 0. Fits the map to the
 * initial route bounds. Also initializes the event markers layer group.
 *
 * Must be called once after the map container element exists in the DOM.
 * Calling again on the same container is a no-op (guard on `map` instance).
 *
 * EMULATOR DEBUG / QA ONLY — not driver-facing. Not navigation.
 * Map data © OpenStreetMap contributors (ODbL). Attribution kept visible.
 * Issue #88 / Stage 2.
 *
 * @param containerId - DOM element id of the map container div.
 * @param initialRoute - The initial route to render as a polyline.
 */
export function initMap(
  containerId: string,
  initialRoute: RouteGeometry
): void {
  if (map !== null) return;

  const el = document.getElementById(containerId);
  if (!el) return;

  map = L.map(el, {
    // Zoom controls on the left — keeps them visible alongside the emulator UI.
    zoomControl: true,
    // Attribution control is required for OSM compliance; kept always visible.
    attributionControl: true,
  });

  // OSM raster tiles — dev/POC background only, not provider data truth.
  // Attribution: © OpenStreetMap contributors (ODbL).
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
  }).addTo(map);

  // Initialize event markers layer group (Issue #97 / Stage 2).
  // Layer is added to map below vehicle marker so vehicle stays on top.
  eventMarkersLayer = L.layerGroup().addTo(map);

  // Render the initial route and vehicle marker, then fit the map.
  setMapRoute(initialRoute);
}

/**
 * Replace the route polyline with a new route and fit the map to it.
 *
 * Converts GeoJSON [lon, lat] coordinate pairs to Leaflet [lat, lon] LatLngs.
 * Fits the map viewport to the new route bounds with a small padding.
 *
 * Called whenever the active route changes (GeoJSON import, Rostov1 load,
 * synthetic reset, or scenario selection reset).
 *
 * EMULATOR DEBUG / QA ONLY — geometry display, not provider truth.
 * Not navigation. Not routing. NOT Product Canon. Issue #88 / Stage 2.
 */
export function setMapRoute(route: RouteGeometry): void {
  if (!map) return;

  const latLngs = coordsToLatLngs(route.coordinates);

  // Replace existing polyline or create a new one.
  if (routePolyline) {
    routePolyline.setLatLngs(latLngs);
  } else {
    routePolyline = L.polyline(latLngs, {
      color: "#2563eb",
      weight: 4,
      opacity: 0.85,
    }).addTo(map);
  }

  // Fit the map to the new route bounds.
  if (latLngs.length >= 2) {
    map.fitBounds(routePolyline.getBounds(), { padding: [24, 24] });
  }

  // Move the vehicle marker to the start of the new route.
  // Uses a vector CircleMarker — no external icon assets required.
  if (latLngs.length > 0) {
    const start = latLngs[0];
    if (vehicleMarker) {
      vehicleMarker.setLatLng(start);
    } else {
      vehicleMarker = L.circleMarker(start, {
        radius: 9,
        color: "#fff",
        weight: 2,
        fillColor: "#e63600",
        fillOpacity: 1,
      }).addTo(map);
    }
  }
}

/**
 * Move the vehicle marker to the given projected position.
 *
 * Called on every render() cycle with the current projected lat/lon from
 * SimulationState.vehicleRoutePosition. No-op if the map is not initialized
 * or the position is not finite.
 *
 * EMULATOR DEBUG / QA ONLY — position is projection-derived, per-session data.
 * Not provider GPS. Not navigation. NOT Product Canon. Issue #88 / Stage 2.
 */
export function updateVehicleMarker(lat: number, lon: number): void {
  if (!map || !vehicleMarker) return;
  if (!isFinite(lat) || !isFinite(lon)) return;
  vehicleMarker.setLatLng([lat, lon]);
}

/**
 * Render prepared route event markers on the map (Issue #97 / Stage 2).
 *
 * Clears any previously rendered event markers and creates one CircleMarker
 * per event in the provided array. Markers use source-type-label-aware colors
 * and show a compact popup with source_type_label first (per #95 display rule).
 *
 * Only events whose source_type_label appears in `visibleLabels` are rendered.
 * This supports the per-label visibility filter without reloading the dataset.
 *
 * When `initialEvalStates` is provided, initial visual style is applied per
 * evaluation state (Issue #99 / Stage 2). This is WIP debug overlay only —
 * not driver-facing, not Canon, not safety-certified.
 *
 * Respects the existing route-load race guard: the caller (main.ts) must only
 * call this function after confirming the load token is still current.
 *
 * Stores marker refs in eventMarkerRefs for efficient eval state updates via
 * updateEventMarkerEvaluationStates() without recreating markers.
 *
 * EMULATOR SPATIAL QA ONLY — NOT THE DRIVER-FACING UI. NOT Product Canon.
 * Rendering a marker does NOT mean:
 *   - RoadAhead accepted the event as relevant;
 *   - the event is driver-facing;
 *   - the event passed applicability logic;
 *   - the event affects the three-circle control.
 *
 * Issue #97 / Stage 2. Issue #99 / Stage 2.
 *
 * @param events - Prepared route events to render.
 * @param visibleLabels - Set of source_type_label values to show. If a label
 *   is absent from the set, its markers are skipped (not rendered).
 * @param initialEvalStates - Optional map from event id → MarkerEvalState for
 *   initial visual styling. WIP debug overlay — not driver-facing, not Canon.
 */
export function setEventMarkers(
  events: RouteEvent[],
  visibleLabels: Set<string>,
  initialEvalStates?: Map<string, MarkerEvalState>
): void {
  if (!map || !eventMarkersLayer) return;

  // Clear all previously rendered event markers and refs.
  eventMarkersLayer.clearLayers();
  eventMarkerRefs = new Map();

  for (const ev of events) {
    if (!visibleLabels.has(ev.source_type_label)) continue;

    const fillColor = getSourceTypeLabelColor(ev.source_type_label);
    const evalState = initialEvalStates?.get(ev.id) ?? "default";
    const evalStyle = getEvalStateStyle(evalState);

    const marker = L.circleMarker([ev.lat, ev.lon], {
      radius: 7, // raised from 6 — markers must be visible at normal zoom without hunting
      color: evalStyle.color,
      weight: evalStyle.weight,
      fillColor,
      fillOpacity: evalStyle.fillOpacity,
    });

    marker.bindPopup(buildEventPopupHtml(ev, evalState), {
      maxWidth: 320,
      className: "ev-popup-container",
    });

    eventMarkersLayer.addLayer(marker);
    // Store marker + originating event so updateEventMarkerEvaluationStates()
    // can regenerate popup HTML with the current eval state on each render tick.
    eventMarkerRefs.set(ev.id, { marker, event: ev });
  }
}

/**
 * Remove all prepared event markers from the map (Issue #97 / Stage 2).
 *
 * Called when:
 *   - selected route changes;
 *   - route is reset to synthetic;
 *   - prepared dataset is missing / unloaded / invalid;
 *   - a new route load supersedes a prior one.
 *
 * Also clears eventMarkerRefs so stale marker handles are not kept.
 * (Issue #99 / Stage 2 — ref map cleanup on dataset change.)
 *
 * Safe to call before the map is initialized (no-op).
 * EMULATOR SPATIAL QA ONLY — NOT Product Canon.
 */
export function clearEventMarkers(): void {
  if (!eventMarkersLayer) return;
  eventMarkersLayer.clearLayers();
  eventMarkerRefs = new Map();
}

/**
 * Update prepared event marker visibility without re-creating all markers.
 *
 * Re-renders markers for the given event list applying the new filter.
 * Cheaper than reconstructing all markers when the source data has not changed,
 * but since CircleMarkers are lightweight and the dataset is bounded (~hundreds),
 * we simply call setEventMarkers() for correctness and simplicity.
 *
 * Caller is responsible for providing the full events array and the updated
 * visibleLabels set. No-op if map is not initialized.
 *
 * EMULATOR SPATIAL QA ONLY — NOT Product Canon. Issue #97 / Stage 2.
 *
 * @param events - The full prepared events array (unchanged).
 * @param visibleLabels - Updated set of visible source_type_labels.
 * @param currentEvalStates - Optional current evaluation states to apply.
 *   WIP debug overlay — not driver-facing, not Canon. Issue #99 / Stage 2.
 */
export function updateEventMarkersVisibility(
  events: RouteEvent[],
  visibleLabels: Set<string>,
  currentEvalStates?: Map<string, MarkerEvalState>
): void {
  setEventMarkers(events, visibleLabels, currentEvalStates);
}

/**
 * Update evaluation state visual styling on existing prepared event markers.
 *
 * Calls setStyle() on each marker in eventMarkerRefs to update border color,
 * weight, and fill opacity according to the new evaluation state. Fill color
 * (source-type identity) is NOT changed — only border and opacity are adjusted.
 *
 * Called from main.ts render() on every render tick when prepared events are
 * the active event source. Uses cached marker refs to avoid recreating markers.
 *
 * For markers not in eventMarkerRefs (filtered out by visibleLabels), the call
 * is a no-op — hidden markers are not updated.
 *
 * For event IDs absent from evalStates, the "default" style is applied so
 * markers revert to the baseline appearance when not being evaluated.
 *
 * EMULATOR DEBUG OVERLAY ONLY — NOT THE DRIVER-FACING UI. NOT Product Canon.
 * Evaluation states shown are WIP debug data only — not final behavior,
 * not legal truth, not safety-certified.
 *
 * Issue #99 / Stage 2.
 *
 * @param evalStates - Map from event id (RouteEvent.id = PreparedEvent.event_id)
 *   → MarkerEvalState. Derived from EventSelectionResult in main.ts.
 */
export function updateEventMarkerEvaluationStates(
  evalStates: Map<string, MarkerEvalState>
): void {
  for (const [eventId, ref] of eventMarkerRefs) {
    const state = evalStates.get(eventId) ?? "default";
    const style = getEvalStateStyle(state);

    // Update marker visual style (border / opacity).
    ref.marker.setStyle({
      color: style.color,
      weight: style.weight,
      fillOpacity: style.fillOpacity,
    });

    // Keep popup content in sync with the current eval state.
    // Without this, popup shows stale/initial state while marker border reflects
    // the current evaluation result. setPopupContent() does not reopen the popup
    // or cause layout churn — it only patches the existing DOM node (or queues
    // the update if the popup is closed). No markers are recreated.
    ref.marker.setPopupContent(buildEventPopupHtml(ref.event, state));
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Convert a RouteGeometry coordinates array ([lon, lat] pairs) to Leaflet
 * LatLng tuples ([lat, lon]).
 *
 * GeoJSON uses longitude-first; Leaflet uses latitude-first.
 */
function coordsToLatLngs(
  coords: ReadonlyArray<readonly [number, number]>
): L.LatLngTuple[] {
  return coords.map(([lon, lat]) => [lat, lon] as L.LatLngTuple);
}
