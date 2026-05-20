/**
 * Minimal event selection — Phase 0 emulator
 * (Slice 4.1 / Issue #49 — route projection baseline;
 *  Slice 4.2 / Issue #51 — direction compatibility integration)
 *
 * DIRECTION COMPATIBILITY BASELINE (Slice 4.2)
 * Event selection incorporates direction compatibility results. The mapping
 * from DirectionCompatibilityStatus to EventStatus is:
 *
 *   compatible    → candidate (passes into driver-facing selection)
 *   bidirectional → candidate (WIP: dirtype=0 treated as bidirectional;
 *                              semantics not Canon; labeled in reason string)
 *   incompatible  → direction_conflict   (suppressed from driver-facing selection)
 *   unknown       → direction_unknown    (suppressed from driver-facing selection)
 *   unsupported   → direction_unsupported (suppressed from driver-facing selection)
 *
 * Canon principle: when direction applicability is ambiguous or cannot be
 * evaluated, driver-facing behavior must prefer suppression / non-claim over
 * confident display. Suppressed candidates remain visible in emulator debug.
 * (event-applicability Canon truth 12; ui-model Canon truth 13)
 *
 * These status names are WIP / not Canon. The full suppression reason taxonomy
 * is deferred to a later child issue under Issue #48.
 *
 * The following remain explicitly NOT implemented and are deferred to later
 * child issues under Issue #48:
 *   - Branch / ramp / parallel carriageway ambiguity handling
 *   - Projection competitor heuristics
 *   - Full suppression reason taxonomy
 *
 * Selection scope: speed_limit events only.
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
 * NOT Canon: this simplified logic is a WIP implementation for Slices 4.1–4.2.
 */

import type { PreparedEvent } from "../contracts/preparedEvent.js";
import type { EmulatorTuningConfig } from "../contracts/tuningConfig.js";
import type { EventProjectionRecord } from "./routeProjection.js";
import type { DirectionCompatibilityRecord } from "./directionCompatibility.js";

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
 *
 * Direction-related statuses added in Slice 4.2 (Issue #51). All three are
 * suppressed from driver-facing selection and visible in emulator debug only.
 * These status names are WIP / not Canon — the full taxonomy is deferred.
 * (event-applicability Canon truth 12; ui-model Canon truth 13)
 *
 *   direction_conflict    — direction compatibility is "incompatible"; clear
 *                           direction conflict with the route approach tangent.
 *   direction_unknown     — direction compatibility could not be evaluated
 *                           (missing or null source direction/dirtype). Conservative:
 *                           when applicability is ambiguous, prefer suppression.
 *   direction_unsupported — source dirtype value not handled by this baseline.
 *                           Conservative: prefer suppression until extended.
 */
export type EventStatus =
  | "behind" // event is behind the vehicle (negative along-route distance)
  | "too_far" // ahead but beyond WIP max_lookahead_m (simplified window only)
  | "too_close" // ahead but inside WIP min_display_distance_m (simplified window only)
  | "direction_conflict" // within window; direction incompatible — suppressed (Slice 4.2 WIP)
  | "direction_unknown" // within window; direction could not be evaluated — suppressed (Slice 4.2 WIP)
  | "direction_unsupported" // within window; dirtype not handled — suppressed (Slice 4.2 WIP)
  | "candidate" // ahead and within window; direction compatible or bidirectional; not selected
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
  /**
   * Direction compatibility record for this event (if available).
   * Per-session derived debug data — NOT persisted to base fixtures.
   * Null for out_of_scope events or if no compatibility record was computed.
   * (event-applicability Canon truth 13; Slice 4.2 / Issue #51)
   */
  directionCompatibility: DirectionCompatibilityRecord | null;
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
 * Selection rules (uses projection-derived along-route distance + direction
 * compatibility from Slice 4.2):
 *
 *  1. Non-speed_limit events → status: out_of_scope (not processed here).
 *  2. speed_limit events with negative or zero distance → status: behind.
 *  3. speed_limit events with distance > max_lookahead_m → status: too_far.
 *     (WIP default from EmulatorTuningConfig.lookahead.speed_limit.max_lookahead_m)
 *  4. speed_limit events with 0 < distance < min_display_distance_m → status: too_close.
 *     (WIP Slice 4.1 simplified minimum window; not a general product rule that
 *     close events are always hidden. Future slices may revise this.)
 *     (WIP default from EmulatorTuningConfig.lookahead.speed_limit.min_display_distance_m)
 *  5. [Slice 4.2] speed_limit events within window; direction suppression rules:
 *     - "incompatible"  → direction_conflict   (suppressed, debug-visible)
 *     - "unknown"       → direction_unknown    (suppressed, debug-visible)
 *     - "unsupported"   → direction_unsupported (suppressed, debug-visible)
 *     Conservative: when direction applicability is ambiguous or cannot be
 *     evaluated, prefer suppression / non-claim over driver-facing display.
 *     (event-applicability Canon truth 12; ui-model Canon truth 13; WIP)
 *  6. Remaining speed_limit events → status: candidate.
 *     Only "compatible" and "bidirectional" direction statuses reach this step.
 *     Bidirectional candidates are labeled in the reason string (WIP: dirtype=0
 *     treated as compatible for this baseline; semantics not Canon).
 *  7. Candidates sorted ascending by distance. First → selected (primary).
 *     Second → candidate (secondary context, within the same simplified window;
 *     NOT the global next event on the route — full secondary semantics are WIP).
 *
 * Direction compatibility results are passed in from the caller (computed
 * separately by computeDirectionCompatibilityRecords in simulationState.ts).
 *
 * All lookahead thresholds come from EmulatorTuningConfig and are WIP emulator
 * defaults — not Product Canon (tuning-and-validation Canon truths 1, 2).
 *
 * @param events - All prepared candidate events for this session.
 * @param projections - Per-event projection records from projectEventsToRoute.
 *   Each record already carries signed_distance_m relative to the current
 *   vehicle position (computed by projectEventsToRoute).
 * @param directionCompatibilityRecords - Per-event direction compatibility records
 *   from computeDirectionCompatibilityRecords (Slice 4.2 / Issue #51).
 * @param config - Active emulator tuning config (WIP defaults).
 * @returns Event selection result (transient; not persisted to fixtures).
 */
export function selectEvents(
  events: PreparedEvent[],
  projections: EventProjectionRecord[],
  directionCompatibilityRecords: DirectionCompatibilityRecord[],
  config: EmulatorTuningConfig
): EventSelectionResult {
  const guardrails = config.lookahead.speed_limit;

  const projectionMap = new Map<string, EventProjectionRecord>(
    projections.map((p) => [p.event_id, p])
  );

  const dirCompatMap = new Map<string, DirectionCompatibilityRecord>(
    directionCompatibilityRecords.map((r) => [r.event_id, r])
  );

  const records: EventSelectionRecord[] = [];

  for (const event of events) {
    const proj = projectionMap.get(event.event_id);
    const distanceM = proj !== undefined ? proj.signed_distance_m : 0;
    const along_route_m = proj?.projection.best.along_route_m ?? 0;
    const cross_track_m = proj?.projection.best.cross_track_m ?? 0;
    const dirCompat = dirCompatMap.get(event.event_id) ?? null;

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
        directionCompatibility: null,
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
        directionCompatibility: dirCompat,
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
        directionCompatibility: dirCompat,
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
        directionCompatibility: dirCompat,
      });
    } else if (dirCompat?.status === "incompatible") {
      // Direction conflict: clear mismatch between route approach tangent and
      // source direction candidate. Suppressed from driver-facing selection.
      // Visible in debug only. (event-applicability Canon truth 12; Slice 4.2 WIP)
      records.push({
        event_id: event.event_id,
        normalized_type: event.normalized_type,
        target_speed_kmh: event.target_speed_kmh,
        distance_m: distanceM,
        projection_along_route_m: along_route_m,
        projection_cross_track_m: cross_track_m,
        status: "direction_conflict",
        reason:
          `${distanceM.toFixed(0)} m ahead — direction conflict. ` +
          `Suppressed from driver-facing selection; debug-visible. ` +
          `Direction detail: ${dirCompat.reason} ` +
          `(WIP candidate semantics — not Canon; per-session derived debug data)`,
        directionCompatibility: dirCompat,
      });
    } else if (dirCompat?.status === "unknown" || dirCompat === null) {
      // Direction could not be evaluated (missing/null source direction or dirtype).
      // Conservative: when direction applicability is ambiguous or cannot be
      // determined, prefer suppression over driver-facing display.
      // Visible in debug only. (event-applicability Canon truth 12; Slice 4.2 WIP)
      const detail = dirCompat !== null ? dirCompat.reason : "No direction compatibility record computed.";
      records.push({
        event_id: event.event_id,
        normalized_type: event.normalized_type,
        target_speed_kmh: event.target_speed_kmh,
        distance_m: distanceM,
        projection_along_route_m: along_route_m,
        projection_cross_track_m: cross_track_m,
        status: "direction_unknown",
        reason:
          `${distanceM.toFixed(0)} m ahead — direction could not be evaluated. ` +
          `Conservative: suppressed from driver-facing selection; debug-visible. ` +
          `Direction detail: ${detail} ` +
          `(WIP candidate semantics — not Canon; per-session derived debug data)`,
        directionCompatibility: dirCompat,
      });
    } else if (dirCompat.status === "unsupported") {
      // Source dirtype not handled by this baseline.
      // Conservative: suppress from driver-facing selection until the baseline is
      // extended to handle this dirtype value in a later child issue.
      // Visible in debug only. (event-applicability Canon truth 12; Slice 4.2 WIP)
      records.push({
        event_id: event.event_id,
        normalized_type: event.normalized_type,
        target_speed_kmh: event.target_speed_kmh,
        distance_m: distanceM,
        projection_along_route_m: along_route_m,
        projection_cross_track_m: cross_track_m,
        status: "direction_unsupported",
        reason:
          `${distanceM.toFixed(0)} m ahead — source dirtype not supported by this baseline. ` +
          `Conservative: suppressed from driver-facing selection; debug-visible. ` +
          `Direction detail: ${dirCompat.reason} ` +
          `(WIP candidate semantics — not Canon; per-session derived debug data)`,
        directionCompatibility: dirCompat,
      });
    } else {
      // candidate: direction is "compatible" or "bidirectional".
      // Only these two statuses reach driver-facing event selection.
      const dirNote =
        dirCompat.status === "bidirectional"
          ? ` Direction: bidirectional (WIP — dirtype=0 treated as compatible for this baseline; semantics not Canon).`
          : ` Direction: ${dirCompat.status}.`;
      records.push({
        event_id: event.event_id,
        normalized_type: event.normalized_type,
        target_speed_kmh: event.target_speed_kmh,
        distance_m: distanceM,
        projection_along_route_m: along_route_m,
        projection_cross_track_m: cross_track_m,
        status: "candidate",
        reason: `${distanceM.toFixed(0)} m ahead — within lookahead window [${guardrails.min_display_distance_m}–${guardrails.max_lookahead_m} m] (WIP defaults, not Canon).${dirNote}`,
        directionCompatibility: dirCompat,
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
