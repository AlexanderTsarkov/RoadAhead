/**
 * Route event adapter — Stage 2 / Issue #99
 *
 * Adapts prepared route-scoped RouteEvent records (from RouteEventDataset)
 * into PreparedEvent records consumed by the existing applicability/evaluation
 * pipeline (routeProjection, directionCompatibility, minimalEventSelection).
 *
 * This adapter is the narrowest possible bridge — it maps field names and
 * preserves all provenance fields as optional PreparedEvent extension fields
 * (route_source_type_label, route_source_ref).
 *
 * Design goals:
 *   - Preserve #95 display contract: source_type_label remains primary label,
 *     raw_type (as string) is provenance, normalized type is coarse context.
 *   - Backward-compatible: synthetic fixture PreparedEvents are unaffected.
 *   - No new evaluation logic: "unknown" type events route to out_of_scope
 *     in selectEvents() via getEventLookaheadGuardrails() → null → out_of_scope.
 *   - Preserve direction metadata: dirtype and direction_deg are mapped to
 *     source_dirtype and source_direction_deg used by directionCompatibility.ts.
 *   - Preserve route geometry: lon and lat are mapped directly.
 *   - Preserve speed: speed_kmh → target_speed_kmh (advisory context only,
 *     not a legal authority — event-data Canon truths 1, 5).
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
 *   RouteEvent.speed_kmh       → PreparedEvent.target_speed_kmh
 *     (advisory context only — not legal authority; event-data Canon truths 1, 5)
 *   RouteEvent.direction_deg   → PreparedEvent.source_direction_deg
 *   RouteEvent.dirtype         → PreparedEvent.source_dirtype
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
  return {
    event_id: ev.id,
    source: ev.source,
    source_event_id: ev.source_ref,
    source_dataset_version: "openspeedcam_datakam_prepared_v1",
    raw_type: String(ev.raw_type),
    normalized_type: ev.type,
    lon: ev.lon,
    lat: ev.lat,
    target_speed_kmh: ev.speed_kmh,
    source_direction_deg: ev.direction_deg,
    source_dirtype: ev.dirtype,
    imported_at: new Date().toISOString(),
    // Stage 2 / Issue #99 — optional provenance extension fields.
    // Preserved for display code; not used by the evaluation pipeline.
    route_source_type_label: ev.source_type_label,
    route_source_ref: ev.source_ref,
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
