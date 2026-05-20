/**
 * Minimal event selection — Phase 0 emulator (Slice 3 / Issue #46)
 *
 * SIMPLIFIED SYNTHETIC-ROUTE LOGIC
 * Event selection uses longitude ordering only. It is valid ONLY for the
 * straight east-bound synthetic fixture. The following are explicitly NOT
 * implemented here and are deferred to Slice 4 (Event applicability
 * foundation):
 *   - Full route projection (cross-track distance, segment index)
 *   - Direction-compatibility matrix
 *   - Branch / ramp / parallel carriageway ambiguity handling
 *   - Projection competitor heuristics
 *   - Conservative handling of bidirectional / unknown dirtype semantics
 *
 * Selection scope for this slice: speed_limit events only.
 * static_camera and road_bump are out of scope for Slice 3.
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
 * NOT Canon: this simplified logic is a WIP implementation for Slice 3.
 */

import type { PreparedEvent } from "../contracts/preparedEvent.js";
import type { EmulatorTuningConfig } from "../contracts/tuningConfig.js";
import {
  signedDistanceAlongRouteM,
  SYNTHETIC_ROUTE_REFERENCE_LAT,
} from "./routeProgress.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Status of an event relative to the current vehicle position.
 *
 * used in the debug panel (event-applicability Canon truth 12).
 */
export type EventStatus =
  | "behind" // event is behind the vehicle (negative distance)
  | "too_far" // event is ahead but beyond max_lookahead_m guardrail (WIP default)
  | "too_close" // event is ahead but within min_display_distance_m guardrail (WIP default)
  | "candidate" // event is ahead and within window, but not selected as primary
  | "selected" // event is the selected primary applicable event
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
  /** Signed distance: positive = ahead, negative = behind. Metres. */
  distance_m: number;
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
  /** The next candidate event after primary, or null if none. */
  secondary: PreparedEvent | null;
  /** Per-event debug records (all events, not just selected). */
  records: EventSelectionRecord[];
}

// ---------------------------------------------------------------------------
// Selection logic
// ---------------------------------------------------------------------------

/**
 * Select the primary and secondary applicable events from the given event
 * list for the current vehicle longitude.
 *
 * Selection rules (SIMPLIFIED for straight east-bound synthetic route):
 *
 *  1. Non-speed_limit events → status: out_of_scope (not processed in Slice 3).
 *  2. speed_limit events with negative distance → status: behind (suppressed).
 *  3. speed_limit events with distance > max_lookahead_m → status: too_far.
 *     (WIP default from EmulatorTuningConfig.lookahead.speed_limit.max_lookahead_m)
 *  4. speed_limit events with distance < min_display_distance_m → status: too_close.
 *     (WIP default from EmulatorTuningConfig.lookahead.speed_limit.min_display_distance_m)
 *  5. Remaining speed_limit events → status: candidate.
 *  6. Candidates sorted ascending by distance. First → selected (primary).
 *     Second → candidate (secondary context).
 *
 * SIMPLIFIED SYNTHETIC-ROUTE LOGIC: ahead/behind uses longitude ordering only.
 * Full route projection, direction compatibility, and ambiguity handling are
 * deferred to Slice 4 (event-applicability Canon truths 1, 2, 10).
 *
 * All lookahead thresholds come from EmulatorTuningConfig and are WIP emulator
 * defaults — not Product Canon (tuning-and-validation Canon truths 1, 2).
 *
 * @param vehicleLon - Vehicle longitude derived from route progress.
 * @param events - All prepared candidate events for this session.
 * @param config - Active emulator tuning config (WIP defaults).
 * @returns Event selection result (transient; not persisted to fixtures).
 */
export function selectEvents(
  vehicleLon: number,
  events: PreparedEvent[],
  config: EmulatorTuningConfig
): EventSelectionResult {
  const guardrails = config.lookahead.speed_limit;

  const records: EventSelectionRecord[] = [];

  for (const event of events) {
    const distanceM = signedDistanceAlongRouteM(
      vehicleLon,
      event.lon,
      SYNTHETIC_ROUTE_REFERENCE_LAT
    );

    if (event.normalized_type !== "speed_limit") {
      records.push({
        event_id: event.event_id,
        normalized_type: event.normalized_type,
        target_speed_kmh: event.target_speed_kmh,
        distance_m: distanceM,
        status: "out_of_scope",
        reason: `Type "${event.normalized_type}" not processed in Slice 3 (speed_limit only).`,
      });
      continue;
    }

    if (distanceM <= 0) {
      records.push({
        event_id: event.event_id,
        normalized_type: event.normalized_type,
        target_speed_kmh: event.target_speed_kmh,
        distance_m: distanceM,
        status: "behind",
        reason: `Behind vehicle by ${Math.abs(distanceM).toFixed(0)} m (simplified longitude check; east-bound only).`,
      });
    } else if (distanceM > guardrails.max_lookahead_m) {
      records.push({
        event_id: event.event_id,
        normalized_type: event.normalized_type,
        target_speed_kmh: event.target_speed_kmh,
        distance_m: distanceM,
        status: "too_far",
        reason: `${distanceM.toFixed(0)} m ahead — beyond max lookahead ${guardrails.max_lookahead_m} m (WIP default, not Canon).`,
      });
    } else if (distanceM < guardrails.min_display_distance_m) {
      records.push({
        event_id: event.event_id,
        normalized_type: event.normalized_type,
        target_speed_kmh: event.target_speed_kmh,
        distance_m: distanceM,
        status: "too_close",
        reason: `${distanceM.toFixed(0)} m ahead — within min display distance ${guardrails.min_display_distance_m} m (WIP default, not Canon).`,
      });
    } else {
      records.push({
        event_id: event.event_id,
        normalized_type: event.normalized_type,
        target_speed_kmh: event.target_speed_kmh,
        distance_m: distanceM,
        status: "candidate",
        reason: `${distanceM.toFixed(0)} m ahead — within lookahead window [${guardrails.min_display_distance_m}–${guardrails.max_lookahead_m} m] (WIP defaults, not Canon).`,
      });
    }
  }

  // Sort candidates by ascending distance; first is primary, second is secondary.
  const candidateRecords = records
    .filter((r) => r.status === "candidate")
    .sort((a, b) => a.distance_m - b.distance_m);

  let primary: PreparedEvent | null = null;
  let secondary: PreparedEvent | null = null;

  if (candidateRecords.length > 0) {
    const primaryRecord = candidateRecords[0];
    primaryRecord.status = "selected";
    primaryRecord.reason =
      `SELECTED — ${primaryRecord.reason}`;
    primary =
      events.find((e) => e.event_id === primaryRecord.event_id) ?? null;

    if (candidateRecords.length > 1) {
      secondary =
        events.find(
          (e) => e.event_id === candidateRecords[1].event_id
        ) ?? null;
    }
  }

  return { primary, secondary, records };
}
