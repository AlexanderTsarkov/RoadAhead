/**
 * Route-order-first lifecycle selection — Issue #104 / Stage 2
 *
 * WIP EMULATOR IMPLEMENTATION — NOT PRODUCT CANON
 *
 * Implements the first behavioral baseline for event display lifecycle and
 * ordering for prepared route events in the Stage 2 emulator.
 *
 * This module is a SEPARATE WIP layer applied ONLY to prepared route events.
 * It does NOT replace selectEvents() from minimalEventSelection.ts, which
 * continues to drive the synthetic scenario sweep unchanged.
 *
 * Problems fixed (from docs/research/roadahead-stage2-lifecycle-order-diagnostics.md):
 *
 *   Symptom 1 — Ordering instability:
 *     Old: filter/evaluate each event individually → sort survivors → pick primary.
 *     A close event suppressed by too_close allows a farther event to become primary.
 *     Fix: build route-ordered queue first → assign lifecycle → pick primary/next
 *     from stable route order without too_close causing premature removal.
 *
 *   Symptom 2 — Early disappearance:
 *     Old: events inside min_display_distance_m become too_close → suppressed.
 *     Fix: lifecycle phases active_reaction and passing keep the event visible
 *     through close range and past the event point; only passed_cleared removes it.
 *
 * Lifecycle phases (WIP — NOT Product Canon):
 *
 *   notification    — ahead of vehicle; signed_distance_m > min_display_distance_m.
 *                     Visible as upcoming.
 *   active_reaction — close but ahead; 0 < signed_distance_m <= min_display_distance_m.
 *                     Replaces too_close suppression for primary/next selection.
 *   passing         — at or just past event; -clear_distance_m <= signed_distance_m <= 0.
 *                     Keeps event visible through the pass point.
 *   passed_cleared  — beyond clear threshold; signed_distance_m < -clear_distance_m.
 *                     Event may be removed (soft removal — not a hard driver-facing filter).
 *   not_applicable  — hard-rejected by direction, cross-track, out_of_scope, or
 *                     missing projection data.
 *
 * Hard filters (remove from primary/next selection):
 *   - out_of_scope (type not in processing scope)
 *   - projection_missing
 *   - off_route_cross_track
 *   - direction_conflict / direction_unknown / direction_unsupported / missing_direction_record
 *   - passed_cleared (past event + WIP clear threshold)
 *
 * Soft states (do NOT remove from primary/next):
 *   - notification (ahead but far)
 *   - active_reaction (close ahead, was too_close before)
 *   - passing (at/just past event)
 *
 * Primary/next selection:
 *   Sort route-ordered events by projection_along_route_m ascending.
 *   primary = first event where lifecycle is in {notification, active_reaction, passing}
 *   next    = second such event
 *
 * Clear distance (WIP — NOT Product Canon):
 *   ROUTE_ORDER_CLEAR_DISTANCE_M = 30 m past event point.
 *   Conservative default: small enough to keep events visible through the pass,
 *   large enough to give a clear signal that the vehicle has passed.
 *   Not editable in this issue; may be tuned in future slices.
 *
 * Canon authority:
 *   docs/product/areas/event-applicability/event-applicability.md
 *     truth 12: suppressed candidates must remain inspectable in debug
 *     truth 13: route-specific fields not persisted to base event records
 *   docs/product/areas/ui-model/ui-model.md
 *     truth 13: suppressed candidates must not appear driver-facing
 *
 * NOT Canon: this module is a WIP implementation for Issue #104 / Stage 2.
 */

import type { PreparedEvent } from "../contracts/preparedEvent.js";
import type {
  EmulatorTuningConfig,
  LookaheadGuardrails,
} from "../contracts/tuningConfig.js";
import type { EventProjectionRecord } from "./routeProjection.js";
import type { DirectionCompatibilityRecord } from "./directionCompatibility.js";
import {
  makeApplicabilityReason,
  type ApplicabilityReason,
  type ApplicabilityReasonCode,
} from "./applicabilityReason.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * WIP clear distance (m) past an event point after which the event transitions
 * from "passing" to "passed_cleared" and may be removed from primary/next.
 *
 * Conservative default: 30 m provides a small hysteresis window so the event
 * remains visible as the vehicle physically passes the marker before clearing.
 *
 * WIP emulator default — NOT Product Canon.
 * Not user-editable in this issue. (Issue #104 / Stage 2)
 */
export const ROUTE_ORDER_CLEAR_DISTANCE_M = 30; // metres past event point

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Minimal WIP lifecycle phases for prepared-event display.
 *
 * These phases replace the old too_close suppression for the route-order
 * lifecycle model. All phase names are WIP — NOT Product Canon.
 *
 * (Issue #104 / Stage 2)
 */
export type LifecyclePhase =
  /** Ahead of vehicle; not yet in close-reaction range. */
  | "notification"
  /** Close ahead; within min_display_distance_m — replaces too_close suppression. */
  | "active_reaction"
  /** At or just past event point; within WIP clear distance hysteresis. */
  | "passing"
  /** Past event and beyond clear distance — may be removed from primary/next. */
  | "passed_cleared"
  /** Hard-rejected: direction, cross-track, out_of_scope, or missing projection. */
  | "not_applicable";

/**
 * Per-event record in the route-order lifecycle evaluation.
 *
 * Per-session derived data — MUST NOT be persisted to base fixtures.
 * (event-applicability Canon truth 13; event-data Canon truth 11)
 *
 * WIP — NOT Product Canon. (Issue #104 / Stage 2)
 */
export interface RouteOrderRecord {
  event_id: string;
  normalized_type: string;
  target_speed_kmh: number | null;
  /**
   * Signed along-route distance from vehicle to event.
   * Positive = ahead, negative = behind. Metres.
   */
  signed_distance_m: number;
  /** Event's along-route position from route start, metres. */
  projection_along_route_m: number;
  /** Cross-track distance from event to nearest route segment, metres. */
  projection_cross_track_m: number;
  /** WIP lifecycle phase for this event. NOT Product Canon. */
  lifecycle: LifecyclePhase;
  /**
   * Whether this event was hard-rejected (not_applicable or passed_cleared).
   * Hard-rejected events are excluded from primary/next selection.
   */
  is_hard_rejected: boolean;
  /**
   * Position of this event in the route-ordered queue (0-based, ascending
   * along_route_m). Includes all events, including hard-rejected ones.
   */
  route_order_index: number;
  /** Human-readable rejection reason if hard-rejected. Null if not rejected. */
  hard_reject_reason: string | null;
  /**
   * Type-specific min_display_distance_m threshold used to determine the
   * boundary between notification and active_reaction lifecycle phases.
   * Null if the event type is out of scope.
   * WIP — NOT Product Canon.
   */
  min_display_distance_m: number | null;
  /**
   * WIP clear distance used (metres). Constant for now; may become per-type later.
   * WIP — NOT Product Canon.
   */
  clear_distance_m: number;
  /** Human-readable debug reason string. */
  reason: string;
  /**
   * Structured applicability reason.
   * Per-session derived debug/runtime data — MUST NOT be persisted.
   * WIP — NOT Product Canon.
   */
  applicabilityReason: ApplicabilityReason;
  /**
   * Direction compatibility record for this event, if available.
   * Null for out_of_scope events or if no compatibility record was computed.
   */
  directionCompatibility: DirectionCompatibilityRecord | null;
}

/**
 * Result of the route-order-first lifecycle selection pass.
 *
 * Per-session derived — not persisted.
 * WIP — NOT Product Canon. (Issue #104 / Stage 2)
 */
export interface RouteOrderResult {
  /** Primary event selected via route-order-first. Null if none. */
  primary: PreparedEvent | null;
  /** Next event (following primary in route order). Null if none. */
  next: PreparedEvent | null;
  /** All route-order records (sorted ascending by projection_along_route_m). */
  records: RouteOrderRecord[];
  /** WIP clear distance used in this evaluation pass (metres). */
  clear_distance_m: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Return per-type lookahead guardrails, or null for out-of-scope types.
 * Mirrors getEventLookaheadGuardrails() from minimalEventSelection.ts.
 * WIP — NOT Product Canon.
 */
function getGuardrails(
  normalized_type: string,
  config: EmulatorTuningConfig
): LookaheadGuardrails | null {
  if (normalized_type === "speed_limit") return config.lookahead.speed_limit;
  if (normalized_type === "static_camera") return config.lookahead.static_camera;
  if (normalized_type === "road_bump") return config.lookahead.road_bump;
  return null;
}

/**
 * Compute the WIP lifecycle phase for an event given its signed distance
 * and the type-specific min_display_distance_m threshold.
 *
 * Phase semantics (WIP — NOT Product Canon):
 *   signed_distance_m > min_display_distance_m      → notification
 *   0 < signed_distance_m ≤ min_display_distance_m  → active_reaction
 *   -clear_distance_m ≤ signed_distance_m ≤ 0       → passing
 *   signed_distance_m < -clear_distance_m            → passed_cleared
 *
 * (Issue #104 / Stage 2)
 */
function computeLifecyclePhase(
  signed_distance_m: number,
  min_display_distance_m: number,
  clear_distance_m: number
): Exclude<LifecyclePhase, "not_applicable"> {
  if (signed_distance_m > min_display_distance_m) {
    return "notification";
  }
  if (signed_distance_m > 0) {
    return "active_reaction";
  }
  if (signed_distance_m >= -clear_distance_m) {
    return "passing";
  }
  return "passed_cleared";
}

// ---------------------------------------------------------------------------
// Core selection function
// ---------------------------------------------------------------------------

/**
 * Route-order-first lifecycle selection for prepared route events.
 *
 * WIP EMULATOR IMPLEMENTATION — NOT PRODUCT CANON.
 *
 * Implements the baseline fix for ordering instability and early disappearance
 * described in docs/research/roadahead-stage2-lifecycle-order-diagnostics.md.
 *
 * Flow:
 *   1. For each event, determine if it is hard-rejected (direction, cross-track,
 *      out_of_scope, missing projection).
 *   2. For non-hard-rejected events, assign a WIP lifecycle phase based on
 *      signed_distance_m relative to min_display_distance_m and clear_distance_m.
 *   3. Sort all records by projection_along_route_m ascending (route order).
 *   4. Select primary = first event where lifecycle is not not_applicable and
 *      not passed_cleared (i.e., lifecycle in {notification, active_reaction, passing}).
 *   5. Select next = second such event.
 *
 * Key behavioral difference from selectEvents():
 *   - Events inside min_display_distance_m (old too_close) are classified as
 *     active_reaction and remain eligible for primary/next selection.
 *   - Events stay primary through the pass point until clear_distance_m is exceeded.
 *   - Primary/next come from stable route order, not from filtering survivors.
 *
 * Does NOT apply to synthetic scenarios — those continue to use selectEvents().
 *
 * WIP — NOT Product Canon. All thresholds are from EMULATOR_TUNING_DEFAULTS.
 *
 * @param events - All prepared candidate events for this session.
 * @param projections - Per-event projection records from projectEventsToRoute.
 * @param directionCompatibilityRecords - Per-event direction compatibility records.
 * @param config - Active emulator tuning config (WIP defaults).
 * @returns Route-order lifecycle result (transient; not persisted).
 */
export function selectEventsRouteOrder(
  events: PreparedEvent[],
  projections: EventProjectionRecord[],
  directionCompatibilityRecords: DirectionCompatibilityRecord[],
  config: EmulatorTuningConfig
): RouteOrderResult {
  const projectionMap = new Map<string, EventProjectionRecord>(
    projections.map((p) => [p.event_id, p])
  );
  const dirCompatMap = new Map<string, DirectionCompatibilityRecord>(
    directionCompatibilityRecords.map((r) => [r.event_id, r])
  );

  const clearDist = ROUTE_ORDER_CLEAR_DISTANCE_M;
  const rawRecords: RouteOrderRecord[] = [];

  for (const event of events) {
    const proj = projectionMap.get(event.event_id);
    const dirCompat = dirCompatMap.get(event.event_id) ?? null;
    const guardrails = getGuardrails(event.normalized_type, config);

    // --- Hard rejection: out_of_scope ---
    if (guardrails === null) {
      rawRecords.push({
        event_id: event.event_id,
        normalized_type: event.normalized_type,
        target_speed_kmh: event.target_speed_kmh,
        signed_distance_m: proj?.signed_distance_m ?? 0,
        projection_along_route_m: proj?.projection.best.along_route_m ?? 0,
        projection_cross_track_m: proj?.projection.best.cross_track_m ?? 0,
        lifecycle: "not_applicable",
        is_hard_rejected: true,
        route_order_index: 0,
        hard_reject_reason: "event_type_out_of_scope",
        min_display_distance_m: null,
        clear_distance_m: clearDist,
        reason: `Hard-rejected: type "${event.normalized_type}" is not in the current applicability scope (speed_limit, static_camera, road_bump). WIP — NOT Canon.`,
        applicabilityReason: makeApplicabilityReason("event_type_out_of_scope"),
        directionCompatibility: null,
      });
      continue;
    }

    // --- Hard rejection: projection_missing ---
    if (proj === undefined) {
      rawRecords.push({
        event_id: event.event_id,
        normalized_type: event.normalized_type,
        target_speed_kmh: event.target_speed_kmh,
        signed_distance_m: 0,
        projection_along_route_m: 0,
        projection_cross_track_m: 0,
        lifecycle: "not_applicable",
        is_hard_rejected: true,
        route_order_index: 0,
        hard_reject_reason: "missing_projection",
        min_display_distance_m: guardrails.min_display_distance_m,
        clear_distance_m: clearDist,
        reason: `Hard-rejected: no projection record. Conservative suppression. WIP — NOT Canon.`,
        applicabilityReason: makeApplicabilityReason("missing_projection"),
        directionCompatibility: dirCompat,
      });
      continue;
    }

    const distM = proj.signed_distance_m;
    const along_m = proj.projection.best.along_route_m;
    const cross_m = proj.projection.best.cross_track_m;
    const minDist = guardrails.min_display_distance_m;

    // --- Hard rejection: off_route_cross_track ---
    if (cross_m > config.direction_applicability.route_projection_reject_m) {
      rawRecords.push({
        event_id: event.event_id,
        normalized_type: event.normalized_type,
        target_speed_kmh: event.target_speed_kmh,
        signed_distance_m: distM,
        projection_along_route_m: along_m,
        projection_cross_track_m: cross_m,
        lifecycle: "not_applicable",
        is_hard_rejected: true,
        route_order_index: 0,
        hard_reject_reason: "route_projection_cross_track_rejected",
        min_display_distance_m: minDist,
        clear_distance_m: clearDist,
        reason:
          `Hard-rejected: cross-track ${cross_m.toFixed(1)} m > reject threshold ` +
          `${config.direction_applicability.route_projection_reject_m} m. Off-route. WIP — NOT Canon.`,
        applicabilityReason: makeApplicabilityReason("route_projection_cross_track_rejected"),
        directionCompatibility: dirCompat,
      });
      continue;
    }

    // --- Hard rejection: direction incompatible ---
    if (dirCompat?.status === "incompatible") {
      rawRecords.push({
        event_id: event.event_id,
        normalized_type: event.normalized_type,
        target_speed_kmh: event.target_speed_kmh,
        signed_distance_m: distM,
        projection_along_route_m: along_m,
        projection_cross_track_m: cross_m,
        lifecycle: "not_applicable",
        is_hard_rejected: true,
        route_order_index: 0,
        hard_reject_reason: "direction_conflict",
        min_display_distance_m: minDist,
        clear_distance_m: clearDist,
        reason:
          `Hard-rejected: direction conflict. ${dirCompat.reason} ` +
          `WIP conservative suppression — NOT Canon.`,
        applicabilityReason: makeApplicabilityReason("direction_conflict"),
        directionCompatibility: dirCompat,
      });
      continue;
    }

    // --- Hard rejection: no direction record ---
    if (dirCompat === null) {
      rawRecords.push({
        event_id: event.event_id,
        normalized_type: event.normalized_type,
        target_speed_kmh: event.target_speed_kmh,
        signed_distance_m: distM,
        projection_along_route_m: along_m,
        projection_cross_track_m: cross_m,
        lifecycle: "not_applicable",
        is_hard_rejected: true,
        route_order_index: 0,
        hard_reject_reason: "missing_direction_record",
        min_display_distance_m: minDist,
        clear_distance_m: clearDist,
        reason: `Hard-rejected: no direction compatibility record. Conservative suppression. WIP — NOT Canon.`,
        applicabilityReason: makeApplicabilityReason("missing_direction_record"),
        directionCompatibility: null,
      });
      continue;
    }

    // --- Hard rejection: direction unknown ---
    if (dirCompat.status === "unknown") {
      rawRecords.push({
        event_id: event.event_id,
        normalized_type: event.normalized_type,
        target_speed_kmh: event.target_speed_kmh,
        signed_distance_m: distM,
        projection_along_route_m: along_m,
        projection_cross_track_m: cross_m,
        lifecycle: "not_applicable",
        is_hard_rejected: true,
        route_order_index: 0,
        hard_reject_reason: "direction_unknown",
        min_display_distance_m: minDist,
        clear_distance_m: clearDist,
        reason:
          `Hard-rejected: direction could not be evaluated. ${dirCompat.reason} ` +
          `WIP conservative suppression — NOT Canon.`,
        applicabilityReason: makeApplicabilityReason("direction_unknown"),
        directionCompatibility: dirCompat,
      });
      continue;
    }

    // --- Hard rejection: direction unsupported ---
    if (dirCompat.status === "unsupported") {
      rawRecords.push({
        event_id: event.event_id,
        normalized_type: event.normalized_type,
        target_speed_kmh: event.target_speed_kmh,
        signed_distance_m: distM,
        projection_along_route_m: along_m,
        projection_cross_track_m: cross_m,
        lifecycle: "not_applicable",
        is_hard_rejected: true,
        route_order_index: 0,
        hard_reject_reason: "direction_unsupported",
        min_display_distance_m: minDist,
        clear_distance_m: clearDist,
        reason:
          `Hard-rejected: dirtype not supported by this baseline. ${dirCompat.reason} ` +
          `WIP conservative suppression — NOT Canon.`,
        applicabilityReason: makeApplicabilityReason("direction_unsupported"),
        directionCompatibility: dirCompat,
      });
      continue;
    }

    // --- Non-hard-rejected: compatible or bidirectional direction ---
    // Assign lifecycle phase based on signed distance.
    const lifecycle = computeLifecyclePhase(distM, minDist, clearDist);
    const isPassedCleared = lifecycle === "passed_cleared";

    // Reason note for bidirectional.
    const dirNote =
      dirCompat.status === "bidirectional"
        ? " Direction: bidirectional (WIP — dirtype=0; semantics not Canon)."
        : ` Direction: ${dirCompat.status}.`;

    let lifecycleDesc: string;
    switch (lifecycle) {
      case "notification":
        lifecycleDesc = `${distM.toFixed(0)} m ahead — notification (> ${minDist} m min_display threshold).`;
        break;
      case "active_reaction":
        lifecycleDesc = `${distM.toFixed(0)} m ahead — active_reaction (within ${minDist} m min_display; was too_close in old model).`;
        break;
      case "passing":
        lifecycleDesc = `${Math.abs(distM).toFixed(0)} m past event — passing (within ${clearDist} m WIP clear distance).`;
        break;
      case "passed_cleared":
        lifecycleDesc = `${Math.abs(distM).toFixed(0)} m past event — passed_cleared (> ${clearDist} m WIP clear threshold).`;
        break;
    }

    const reasonCode: ApplicabilityReasonCode = isPassedCleared
      ? "lifecycle_passed_cleared"
      : "lifecycle_visible";

    rawRecords.push({
      event_id: event.event_id,
      normalized_type: event.normalized_type,
      target_speed_kmh: event.target_speed_kmh,
      signed_distance_m: distM,
      projection_along_route_m: along_m,
      projection_cross_track_m: cross_m,
      lifecycle,
      is_hard_rejected: isPassedCleared,
      route_order_index: 0,
      hard_reject_reason: isPassedCleared ? "lifecycle_passed_cleared" : null,
      min_display_distance_m: minDist,
      clear_distance_m: clearDist,
      reason: `${lifecycleDesc}${dirNote} WIP lifecycle model — NOT Canon. (Issue #104)`,
      applicabilityReason: makeApplicabilityReason(reasonCode),
      directionCompatibility: dirCompat,
    });
  }

  // ---------------------------------------------------------------------------
  // Sort by projection_along_route_m ascending (route order).
  // This establishes the stable route-order queue that primary/next selection
  // is drawn from, independent of per-event filtering results.
  // ---------------------------------------------------------------------------
  rawRecords.sort((a, b) => a.projection_along_route_m - b.projection_along_route_m);

  // Assign route_order_index after sort.
  rawRecords.forEach((r, i) => {
    r.route_order_index = i;
  });

  // ---------------------------------------------------------------------------
  // Primary / next selection from route-ordered queue.
  //
  // Eligible = lifecycle in {notification, active_reaction, passing}.
  // NOT eligible = not_applicable (hard-rejected) or passed_cleared.
  //
  // Primary = first eligible event in route order.
  // Next    = second eligible event in route order.
  // ---------------------------------------------------------------------------
  const eligibleRecords = rawRecords.filter(
    (r) =>
      r.lifecycle === "notification" ||
      r.lifecycle === "active_reaction" ||
      r.lifecycle === "passing"
  );

  let primary: PreparedEvent | null = null;
  let next: PreparedEvent | null = null;

  if (eligibleRecords.length > 0) {
    const primaryRecord = eligibleRecords[0];
    primaryRecord.applicabilityReason = makeApplicabilityReason("route_order_primary");
    primaryRecord.reason = `ROUTE-ORDER PRIMARY — ${primaryRecord.reason}`;
    primary = events.find((e) => e.event_id === primaryRecord.event_id) ?? null;
  }

  if (eligibleRecords.length > 1) {
    const nextRecord = eligibleRecords[1];
    nextRecord.applicabilityReason = makeApplicabilityReason("route_order_next");
    nextRecord.reason = `ROUTE-ORDER NEXT — ${nextRecord.reason}`;
    next = events.find((e) => e.event_id === nextRecord.event_id) ?? null;
  }

  return { primary, next, records: rawRecords, clear_distance_m: clearDist };
}
