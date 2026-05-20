/**
 * Minimal event selection — Phase 0 emulator (Slice 4.1 / Issue #49)
 *
 * ROUTE-PROJECTION BASELINE
 * Event selection uses projection-derived along-route distance for the
 * ahead/behind determination. This replaces the Slice 3 longitude-only
 * shortcut. The following remain explicitly NOT implemented and are deferred
 * to later child issues under Issue #48:
 *   - Direction-compatibility matrix
 *   - Branch / ramp / parallel carriageway ambiguity handling
 *   - Projection competitor heuristics
 *   - Conservative handling of bidirectional / unknown dirtype semantics
 *
 * Selection scope for this slice: speed_limit events only.
 * static_camera and road_bump are out of scope.
 *
 * Canon authority:
 *   docs/product/areas/event-applicability/event-applicability.md
 *     truth 1: geographic proximity alone is insufficient
 *     truth 12: suppressed candidates must remain inspectable in debug
 *     truth 13: route-specific fields not persisted to base event records
 *   docs/product/areas/ui-model/ui-model.md
 *     truth 13: suppressed candidates must not appear driver-facing
 *   docs/product/areas/speed-reference/speed-reference.md (truths 3, 4, 5)
 *   docs/product/areas/tuning-and-validation/tuning-and-validation.md
 *     (truths 1, 2: all thresholds used here are WIP defaults, not Canon)
 *
 * NOT Canon: this simplified logic is a WIP implementation for Slice 4.1.
 */

import type { PreparedEvent } from "../contracts/preparedEvent.js";
import type { EmulatorTuningConfig } from "../contracts/tuningConfig.js";
import type {
  VehicleRoutePosition,
  EventProjectionRecord,
} from "./routeProjection.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Status of an event relative to the current vehicle position.
 *
 * Used in the debug panel (event-applicability Canon truth 12).
 *
 * "too_far" and "too_close" are simplified debug statuses derived from the
 * WIP lookahead guardrails in EmulatorTuningConfig. They are NOT final
 * product-applicability semantics and NOT Product Canon. They mean "outside
 * the simplified Slice 4.1 display window" — not that the event is globally
 * useless or should always be hidden. Future urgency, applicability, and
 * hysteresis behavior (later Slice 4 child issues) may revise how events in
 * these zones are treated. (tuning-and-validation Canon truths 1, 2)
 */
export type EventStatus =
  | "behind" // event is behind the vehicle (negative along-route distance)
  | "too_far" // ahead but beyond WIP max_lookahead_m (simplified window only)
  | "too_close" // ahead but inside WIP min_display_distance_m (simplified window only)
  | "candidate" // ahead and within the simplified window; not selected as primary
  | "selected" // selected primary applicable event
  | "out_of_scope"; // event type not processed in this slice (non speed_limit)

/**
 * Debug record for a single event's selection result.
 *
 * These records are per-session / per-state only.
 * They MUST NOT be written back to the base PreparedEvent fixture.
 * (event-applicability Canon truth 13; event-data Canon truth 11)
 */
export interface EventSelectionRecord {
  event_id: string;
  normalized_type: string;
  target_speed_kmh: number | null;
  /**
   * Signed along-route distance from vehicle to event.
   * Positive = ahead, negative = behind. Metres.
   * Derived from route projection (replaces Slice 3 longitude-only shortcut).
   */
  distance_m: number;
  /**
   * Event's along-route position from route start, metres.
   * Per-session derived value — not persisted to fixture.
   * (event-applicability Canon truth 13)
   */
  projection_along_route_m: number;
  /**
   * Cross-track distance from event point to nearest route segment, metres.
   * Per-session derived value — not persisted to fixture.
   * (event-applicability Canon truth 13)
   */
  projection_cross_track_m: number;
  status: EventStatus;
  /** Human-readable reason for this status, for the debug panel. */
  reason: string;
}

/**
 * Result of the minimal event selection pass.
 * All fields are computed per session and are not persisted.
 */
export interface EventSelectionResult {
  /** The selected primary applicable event, or null if none. */
  primary: PreparedEvent | null;
  /**
   * The next event inside the simplified candidate window, or null.
   *
   * NOTE: this is the next event that qualifies within the same simplified
   * lookahead window as the primary — NOT the global next event on the route.
   * Events outside the window (too_far, too_close, behind) are excluded.
   * Full secondary-context semantics, ordering, and driver-facing eligibility
   * are WIP and will be defined in later slices.
   */
  secondary: PreparedEvent | null;
  /** Per-event debug records (all events, not just selected). */
  records: EventSelectionRecord[];
}

// ---------------------------------------------------------------------------
// Selection logic
// ---------------------------------------------------------------------------

/**
 * Select the primary and secondary applicable events from the given event
 * list for the current vehicle route position.
 *
 * Selection rules (uses projection-derived along-route distance):
 *
 *  1. Non-speed_limit events → status: out_of_scope (not processed here).
 *  2. speed_limit events with negative or zero distance → status: behind.
 *  3. speed_limit events with distance > max_lookahead_m → status: too_far.
 *     (WIP default from EmulatorTuningConfig.lookahead.speed_limit.max_lookahead_m)
 *  4. speed_limit events with 0 < distance < min_display_distance_m → status: too_close.
 *     (WIP Slice 4.1 simplified minimum window; not a general product rule that
 *     close events are always hidden. Future slices may revise this.)
 *     (WIP default from EmulatorTuningConfig.lookahead.speed_limit.min_display_distance_m)
 *  5. Remaining speed_limit events → status: candidate.
 *  6. Candidates sorted ascending by distance. First → selected (primary).
 *     Second → candidate (secondary context, within the same simplified window;
 *     NOT the global next event on the route — full secondary semantics are WIP).
 *
 * PROJECTION BASELINE: ahead/behind uses projection-derived along-route
 * distance. Direction compatibility and ambiguity handling are deferred to
 * later Slice 4 child issues (event-applicability Canon truths 1, 2, 10).
 *
 * All lookahead thresholds come from EmulatorTuningConfig and are WIP emulator
 * defaults — not Product Canon (tuning-and-validation Canon truths 1, 2).
 *
 * @param vehiclePosition - Vehicle route position from computeVehicleRoutePosition.
 * @param events - All prepared candidate events for this session.
 * @param projections - Per-event projection records from projectEventsToRoute.
 * @param config - Active emulator tuning config (WIP defaults).
 * @returns Event selection result (transient; not persisted to fixtures).
 */
export function selectEvents(
  vehiclePosition: VehicleRoutePosition,
  events: PreparedEvent[],
  projections: EventProjectionRecord[],
  config: EmulatorTuningConfig
): EventSelectionResult {
  // Suppress unused-variable lint for vehiclePosition (used implicitly via projections)
  void vehiclePosition;

  const guardrails = config.lookahead.speed_limit;

  const projectionMap = new Map<string, EventProjectionRecord>(
    projections.map((p) => [p.event_id, p])
  );

  const records: EventSelectionRecord[] = [];

  for (const event of events) {
    const proj = projectionMap.get(event.event_id);
    const distanceM = proj !== undefined ? proj.signed_distance_m : 0;
    const along_route_m = proj?.projection.best.along_route_m ?? 0;
    const cross_track_m = proj?.projection.best.cross_track_m ?? 0;

    if (event.normalized_type !== "speed_limit") {
      records.push({
        event_id: event.event_id,
        normalized_type: event.normalized_type,
        target_speed_kmh: event.target_speed_kmh,
        distance_m: distanceM,
        projection_along_route_m: along_route_m,
        projection_cross_track_m: cross_track_m,
        status: "out_of_scope",
        reason: `Type "${event.normalized_type}" not processed in this slice (speed_limit only).`,
      });
      continue;
    }

    if (distanceM <= 0) {
      records.push({
        event_id: event.event_id,
        normalized_type: event.normalized_type,
        target_speed_kmh: event.target_speed_kmh,
        distance_m: distanceM,
        projection_along_route_m: along_route_m,
        projection_cross_track_m: cross_track_m,
        status: "behind",
        reason: `Behind vehicle by ${Math.abs(distanceM).toFixed(0)} m (projection-derived along-route distance).`,
      });
    } else if (distanceM > guardrails.max_lookahead_m) {
      records.push({
        event_id: event.event_id,
        normalized_type: event.normalized_type,
        target_speed_kmh: event.target_speed_kmh,
        distance_m: distanceM,
        projection_along_route_m: along_route_m,
        projection_cross_track_m: cross_track_m,
        status: "too_far",
        reason: `${distanceM.toFixed(0)} m ahead — beyond max lookahead ${guardrails.max_lookahead_m} m (WIP default, not Canon).`,
      });
    } else if (distanceM < guardrails.min_display_distance_m) {
      records.push({
        event_id: event.event_id,
        normalized_type: event.normalized_type,
        target_speed_kmh: event.target_speed_kmh,
        distance_m: distanceM,
        projection_along_route_m: along_route_m,
        projection_cross_track_m: cross_track_m,
        status: "too_close",
        reason: `${distanceM.toFixed(0)} m ahead — inside min display window (< ${guardrails.min_display_distance_m} m). WIP Slice 4.1 simplified window only; not a general product rule that close events are always hidden. Future urgency/applicability behavior may revise this. (WIP default, not Canon)`,
      });
    } else {
      records.push({
        event_id: event.event_id,
        normalized_type: event.normalized_type,
        target_speed_kmh: event.target_speed_kmh,
        distance_m: distanceM,
        projection_along_route_m: along_route_m,
        projection_cross_track_m: cross_track_m,
        status: "candidate",
        reason: `${distanceM.toFixed(0)} m ahead — within lookahead window [${guardrails.min_display_distance_m}–${guardrails.max_lookahead_m} m] (WIP defaults, not Canon).`,
      });
    }
  }

  // Sort candidates ascending by distance; first is primary, second is secondary.
  const candidateRecords = records
    .filter((r) => r.status === "candidate")
    .sort((a, b) => a.distance_m - b.distance_m);

  let primary: PreparedEvent | null = null;
  let secondary: PreparedEvent | null = null;

  if (candidateRecords.length > 0) {
    const primaryRecord = candidateRecords[0];
    primaryRecord.status = "selected";
    primaryRecord.reason = `SELECTED — ${primaryRecord.reason}`;
    primary = events.find((e) => e.event_id === primaryRecord.event_id) ?? null;

    if (candidateRecords.length > 1) {
      secondary =
        events.find(
          (e) => e.event_id === candidateRecords[1].event_id
        ) ?? null;
    }
  }

  return { primary, secondary, records };
}
