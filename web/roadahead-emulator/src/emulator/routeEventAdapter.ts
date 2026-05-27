/**
 * Route event adapter — Stage 2 / Issue #99
 *
 * Adapts prepared route-scoped RouteEvent records (from RouteEventDataset)
 * into PreparedEvent records consumed by the existing applicability/evaluation
 * pipeline (routeProjection, directionCompatibility, minimalEventSelection).
 *
 * This adapter is the narrowest possible bridge — it maps field names and
 * preserves all provenance fields as optional PreparedEvent extension fields
 * (route_source_type_label, route_source_ref, route_raw_facing_direction_deg).
 *
 * Design goals:
 *   - Preserve #95 display contract: source_type_label remains primary label,
 *     raw_type (as string) is provenance, normalized type is coarse context.
 *   - Backward-compatible: synthetic fixture PreparedEvents are unaffected.
 *   - No new evaluation logic: "unknown" type events route to out_of_scope
 *     in selectEvents() via getEventLookaheadGuardrails() → null → out_of_scope.
 *   - Apply Datakam/OpenSpeedcam DIRECTION convention (Issue #99 follow-up):
 *     DIRECTION is the sign/camera FACING direction, not vehicle travel direction.
 *     The evaluator receives the effective vehicle travel direction:
 *       source_direction_deg = (RouteEvent.direction_deg + 180) % 360
 *     The raw facing direction is preserved in route_raw_facing_direction_deg
 *     for debug display. Synthetic fixtures are NOT affected.
 *   - Preserve route geometry: lon and lat are mapped directly.
 *   - Preserve speed: speed_kmh → target_speed_kmh (advisory context only,
 *     not a legal authority — event-data Canon truths 1, 5).
 *
 * Datakam/OpenSpeedcam DIRECTION convention (Stage 2 WIP — not Product Canon):
 *   The DIRECTION field records where the sign/camera is facing, which is
 *   generally toward the approaching vehicle. Therefore the applicable vehicle
 *   travel direction is approximately opposite:
 *     effective_travel_direction = (DIRECTION + 180) % 360
 *   This is applied only to adapted route events — not to synthetic fixtures.
 *   See: docs/research/datakam-openspeedcam-type-mapping.md §DIRECTION
 *   WIP source-semantics evidence — not globally verified. Not Product Canon.
 *   (event-applicability Canon truth 8; direction-applicability research §3.E)
 *
 * speed_kmh → target_speed_kmh mapping (P2 fix — Issue #99):
 *   target_speed_kmh is set ONLY for normalized speed_limit events.
 *   For all other event types (static_camera, road_bump, unknown), it is null.
 *   Cameras and hazards carry a SPEED attribute in the source dataset; that
 *   value is an advisory/source attribute of the sign or camera record and is
 *   NOT a RoadAhead target speed rule. Assigning it to target_speed_kmh for
 *   non-speed_limit events caused computeSpeedReference() to emit approach_target
 *   for cameras/hazards — this was incorrect behavior.
 *   The raw source speed is preserved in route_source_speed_kmh for debug/
 *   provenance display on all event types (does not drive guidance).
 *
 * What this adapter does NOT do:
 *   - Does not change evaluation logic or thresholds.
 *   - Does not promote any value to Product Canon.
 *   - Does not add final driver-facing warning behavior.
 *   - Does not use projected_route_distance_m from the dataset — the evaluator
 *     recomputes projections at runtime from lon/lat and route geometry.
 *
 * EMULATOR WIP — NOT Product Canon. Not safety-certified. Not final behavior.
 * All route events remain candidate observations (event-data Canon truths 1, 5).
 *
 * Canon authority:
 *   docs/product/areas/event-data/event-data.md (truths 1, 5, 8, 11)
 *   docs/product/areas/event-applicability/event-applicability.md (truth 13)
 */

import type { PreparedEvent } from "../contracts/preparedEvent.js";
import type { RouteEvent } from "../contracts/routeEventDataset.js";

// ---------------------------------------------------------------------------
// DIRTYPE convention helpers
// ---------------------------------------------------------------------------

/**
 * Translate a Datakam/OpenSpeedcam DIRTYPE value to the evaluator's
 * source_dirtype representation.
 *
 * The evaluator (directionCompatibility.ts) only handles:
 *   0 → bidirectional
 *   1 → directional
 *   null → unknown
 *   other → unsupported (suppressed)
 *
 * Datakam/OpenSpeedcam DIRTYPE=2 means "both directions" — semantically
 * equivalent to the evaluator's bidirectional (source_dirtype=0). Without this
 * mapping, DIRTYPE=2 rows (e.g. many speed_bump events) would be incorrectly
 * suppressed as direction_unsupported.
 *
 * Mapping (Stage 2 WIP — NOT Product Canon):
 *   DIRTYPE 0 → 0  (all directions → evaluator bidirectional; no change)
 *   DIRTYPE 1 → 1  (one direction → evaluator directional; no change)
 *   DIRTYPE 2 → 0  (both directions → evaluator bidirectional)
 *   other     → pass through (evaluator will return direction_unsupported)
 *
 * The raw DIRTYPE is preserved in PreparedEvent.route_raw_dirtype for debug
 * display — the popup shows both the source DIRTYPE and the evaluator value.
 * Synthetic fixture PreparedEvents are NOT affected by this mapping.
 *
 * WIP — NOT Product Canon. Source semantics not globally verified.
 * See: docs/research/datakam-openspeedcam-type-mapping.md §DIRTYPE
 *
 * @param rawDirtype - Raw DIRTYPE value from the source dataset.
 * @returns Evaluator-compatible source_dirtype value.
 */
export function datakamDirtypeToEvaluatorDirtype(rawDirtype: number | null): number | null {
  if (rawDirtype === 2) return 0; // "both directions" → evaluator bidirectional
  return rawDirtype;              // 0, 1, null, and unknown values pass through
}

// ---------------------------------------------------------------------------
// Direction convention helpers
// ---------------------------------------------------------------------------

/**
 * Compute the effective vehicle travel direction from a Datakam/OpenSpeedcam
 * DIRECTION value.
 *
 * Datakam/OpenSpeedcam DIRECTION is the sign/camera facing direction (toward
 * approaching vehicles). The applicable vehicle travel direction is opposite:
 *   effective_travel_direction = (facing_direction + 180) % 360
 *
 * This convention is applied only in this adapter for route event datasets.
 * Synthetic fixture PreparedEvents are NOT affected.
 *
 * WIP Stage 2 source-semantics convention — NOT Product Canon.
 * Not globally verified. Individual points should be interpreted per-point.
 * See: docs/research/datakam-openspeedcam-type-mapping.md §DIRECTION
 * (event-applicability Canon truth 8; direction-applicability research §3.E)
 *
 * @param facingDirectionDeg - Raw DIRECTION value from the source dataset (0–360).
 * @returns Effective vehicle travel direction in degrees [0, 360).
 */
export function datakamFacingToTravelDirection(facingDirectionDeg: number): number {
  return (facingDirectionDeg + 180) % 360;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

/**
 * Adapt a single RouteEvent to a PreparedEvent for the applicability pipeline.
 *
 * Field mapping:
 *   RouteEvent.id              → PreparedEvent.event_id
 *   RouteEvent.source          → PreparedEvent.source
 *   RouteEvent.source_ref      → PreparedEvent.source_event_id
 *   RouteEvent.type            → PreparedEvent.normalized_type
 *     ("unknown" is valid — routes to out_of_scope in selectEvents)
 *   RouteEvent.raw_type (num)  → PreparedEvent.raw_type (string, provenance)
 *   RouteEvent.lon, .lat       → PreparedEvent.lon, PreparedEvent.lat
 *   RouteEvent.speed_kmh       → PreparedEvent.target_speed_kmh  (speed_limit only)
 *     Set to null for static_camera, road_bump, unknown — source SPEED is an
 *     advisory/source attribute of the record, not a RoadAhead target speed rule.
 *     (speed-reference Canon truths 4, 5; event-data Canon truths 1, 5)
 *   RouteEvent.speed_kmh       → PreparedEvent.route_source_speed_kmh (all types)
 *     Preserved for debug/provenance display. Does not drive target-speed guidance.
 *   (direction_deg + 180) % 360 → PreparedEvent.source_direction_deg
 *     (effective vehicle travel direction — Datakam DIRECTION convention WIP)
 *   RouteEvent.direction_deg   → PreparedEvent.route_raw_facing_direction_deg
 *     (raw source-facing direction; preserved for debug display)
 *   datakamDirtypeToEvaluatorDirtype(dirtype) → PreparedEvent.source_dirtype
 *     (DIRTYPE 2 mapped to 0 — "both directions" → evaluator bidirectional)
 *   RouteEvent.dirtype         → PreparedEvent.route_raw_dirtype
 *     (raw source DIRTYPE; preserved for debug display)
 *   RouteEvent.source_type_label → PreparedEvent.route_source_type_label
 *   RouteEvent.source_ref      → PreparedEvent.route_source_ref
 *
 * Note: projected_route_distance_m from the RouteEvent dataset is NOT used
 * here. The evaluator recomputes projection from lon/lat + route geometry at
 * runtime via projectEventsToRoute(). This ensures runtime projection is
 * consistent with the currently active route geometry.
 * (event-applicability Canon truth 13; event-data Canon truth 11)
 *
 * All adapted events remain candidate observations — not verified truth.
 * (event-data Canon truths 1, 5)
 *
 * EMULATOR WIP — NOT Product Canon. Stage 2 / Issue #99.
 *
 * @param ev - A prepared route-scoped RouteEvent.
 * @returns A PreparedEvent suitable for the applicability/evaluation pipeline.
 */
export function adaptRouteEventToPreparedEvent(ev: RouteEvent): PreparedEvent {
  // Apply the Datakam/OpenSpeedcam DIRECTION convention:
  // DIRECTION is the sign/camera facing direction (toward approaching vehicles).
  // The evaluator needs the effective vehicle travel direction = (DIRECTION + 180) % 360.
  // The raw facing direction is preserved in route_raw_facing_direction_deg.
  // WIP — NOT Product Canon. Synthetic fixtures are unaffected.
  const effectiveTravelDirectionDeg = datakamFacingToTravelDirection(ev.direction_deg);

  return {
    event_id: ev.id,
    source: ev.source,
    source_event_id: ev.source_ref,
    source_dataset_version: "openspeedcam_datakam_prepared_v1",
    raw_type: String(ev.raw_type),
    normalized_type: ev.type,
    lon: ev.lon,
    lat: ev.lat,
    // Only speed_limit events set target_speed_kmh. Cameras, hazards, and unknown
    // events carry a SPEED attribute in the source dataset, but it is an advisory/
    // source attribute of the sign or camera record — NOT a RoadAhead target speed
    // rule. Setting it for non-speed_limit events caused computeSpeedReference()
    // to incorrectly emit approach_target for cameras/hazards (P2 fix — Issue #99).
    // Source speed is preserved in route_source_speed_kmh for all types.
    target_speed_kmh: ev.type === "speed_limit" ? ev.speed_kmh : null,
    // Raw source SPEED value preserved for debug/provenance display on all event
    // types. Does NOT drive target-speed guidance for non-speed_limit events.
    route_source_speed_kmh: ev.speed_kmh,
    // Effective vehicle travel direction — Datakam convention (facing + 180) % 360.
    // Used by directionCompatibility.ts for direction delta computation.
    source_direction_deg: effectiveTravelDirectionDeg,
    // Translate DIRTYPE=2 ("both directions") to evaluator bidirectional (0).
    // Without this, DIRTYPE=2 rows (e.g. speed_bump) are suppressed as unsupported.
    // WIP — NOT Product Canon. Synthetic fixtures are unaffected.
    source_dirtype: datakamDirtypeToEvaluatorDirtype(ev.dirtype),
    imported_at: new Date().toISOString(),
    // Stage 2 / Issue #99 — optional provenance extension fields.
    // Preserved for display code; not used by the evaluation pipeline.
    route_source_type_label: ev.source_type_label,
    route_source_ref: ev.source_ref,
    // Raw source-facing direction from the DIRECTION field (before 180° inversion).
    // Shown in debug popup alongside the effective travel direction.
    // WIP — NOT Product Canon.
    route_raw_facing_direction_deg: ev.direction_deg,
    // Raw DIRTYPE from the source dataset (before adapter normalization).
    // Shown in debug popup alongside the evaluator's effective source_dirtype.
    // WIP — NOT Product Canon.
    route_raw_dirtype: ev.dirtype,
  };
}

/**
 * Adapt an array of RouteEvents to PreparedEvents for the applicability pipeline.
 *
 * Calls adaptRouteEventToPreparedEvent for each event.
 *
 * All adapted events remain candidate observations — not verified truth.
 * EMULATOR WIP — NOT Product Canon. Stage 2 / Issue #99.
 *
 * @param events - Prepared route-scoped RouteEvents from a RouteEventDataset.
 * @returns PreparedEvent array for use with computeSimulationState().
 */
export function adaptRouteEventsToPreparedEvents(
  events: RouteEvent[]
): PreparedEvent[] {
  return events.map(adaptRouteEventToPreparedEvent);
}
