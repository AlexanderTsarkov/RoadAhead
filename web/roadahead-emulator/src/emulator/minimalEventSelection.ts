/**
 * Minimal event selection — Phase 0 emulator
 * (Slice 4.1 / Issue #49 — route projection baseline;
 *  Slice 4.2 / Issue #51 — direction compatibility integration;
 *  Slice 4.3 / Issue #53 — applicability suppression reason model)
 *
 * APPLICABILITY SUPPRESSION REASON MODEL (Slice 4.3)
 * EventSelectionRecord now carries a structured ApplicabilityReason in addition
 * to the existing human-readable reason string. The structured reason provides
 * a machine-readable kind/code/label/is_driver_facing_eligible breakdown of each
 * selection outcome.
 *
 * ApplicabilityReason values are per-session derived debug/runtime data.
 * They MUST NOT be written back to base prepared event fixtures.
 * (event-applicability Canon truth 13; event-data Canon truth 11)
 *
 * All reason codes, kind values, and the is_driver_facing_eligible flag are WIP
 * baseline semantics for Slices 4.1–4.3 + Issue #67 only — NOT Product Canon.
 * The full applicability taxonomy is deferred to later child issues under #48.
 *
 * CROSS-TRACK / OFF-ROUTE SUPPRESSION BASELINE (Issue #67)
 * After projection exists and the projection_missing guard passes, cross-track
 * distance (cross_track_m) is evaluated before direction compatibility.
 * If cross_track_m exceeds the WIP rejection threshold
 * (config.direction_applicability.route_projection_reject_m, WIP default 50 m),
 * the event is suppressed with:
 *   EventStatus:              off_route_cross_track
 *   ApplicabilityReasonCode:  route_projection_cross_track_rejected
 *   kind:                     suppressed
 *   is_driver_facing_eligible: false
 *
 * This suppression runs after distance-based checks (behind / too_far / too_close)
 * but before direction compatibility can allow candidate/selected behavior.
 * An off-route event with null direction is now suppressed for cross-track before
 * direction_unknown — this is the new precedence for Issue #67.
 *
 * The threshold (route_projection_reject_m = 50 m WIP) is reused from the
 * existing direction_applicability config. No new numeric constant is added.
 * This value is WIP emulator default — NOT Product Canon.
 * (tuning-and-validation Canon truths 1, 2; Issue #67 — not Canon)
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
 * These status names are WIP / not Canon. The structured suppression reason
 * model is introduced in Slice 4.3 / Issue #53 (applicabilityReason.ts).
 * The full taxonomy may change in later child issues under Issue #48.
 *
 * The following remain explicitly NOT implemented and are deferred to later
 * child issues under Issue #48:
 *   - Branch / ramp / parallel carriageway ambiguity handling
 *   - Projection competitor heuristics
 *   - Full suppression reason taxonomy
 *
 * Selection scope (Issue #65): speed_limit and static_camera events.
 * Selection scope extended in Issue #75: road_bump / hazardous road segment
 * candidates. road_bump enters the same existing applicability pipeline as
 * speed_limit and static_camera: projection → signed distance → min/max lookahead
 * → cross-track rejection → direction compatibility. WIP per-type lookahead
 * guardrails apply from EmulatorTuningConfig.lookahead.road_bump. No advisory
 * target speed is introduced for road_bump events; speedReference stays "unknown"
 * when a road_bump event is primary. Full hazard display semantics are deferred
 * to Issue #76. WIP — NOT Product Canon.
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
import type {
  EmulatorTuningConfig,
  LookaheadGuardrails,
} from "../contracts/tuningConfig.js";
import type { EventProjectionRecord } from "./routeProjection.js";
import type { DirectionCompatibilityRecord } from "./directionCompatibility.js";
import {
  makeApplicabilityReason,
  type ApplicabilityReason,
} from "./applicabilityReason.js";

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
 *
 * "projection_missing" added in Slice 4.3 (Issue #53). Conservative: when no
 * projection record is available for a speed_limit event, suppress from driver-
 * facing selection rather than falling through to a misleading distance=0
 * "behind" status. Debug-visible.
 * WIP — not Canon. Maps to ApplicabilityReasonCode "missing_projection".
 *
 * "off_route_cross_track" added in Issue #67. Cross-track distance from the event
 * to the nearest route segment exceeds the WIP rejection threshold
 * (route_projection_reject_m). Event is off-route; suppressed before direction
 * compatibility is evaluated. An off-route event with null direction may now be
 * suppressed for cross-track before direction_unknown — this is the new precedence
 * for Issue #67. WIP — not Canon. Maps to ApplicabilityReasonCode
 * "route_projection_cross_track_rejected".
 */
export type EventStatus =
  | "behind" // event is behind the vehicle (negative along-route distance)
  | "too_far" // ahead but beyond WIP max_lookahead_m (simplified window only)
  | "too_close" // ahead but inside WIP min_display_distance_m (simplified window only)
  | "off_route_cross_track" // cross-track distance exceeds WIP reject threshold — suppressed before direction check (Issue #67 WIP)
  | "direction_conflict" // within window; direction incompatible — suppressed (Slice 4.2 WIP)
  | "direction_unknown" // within window; direction could not be evaluated — suppressed (Slice 4.2 WIP)
  | "direction_unsupported" // within window; dirtype not handled — suppressed (Slice 4.2 WIP)
  | "projection_missing" // no projection record; conservative suppressed — (Slice 4.3 WIP)
  | "candidate" // ahead and within window; direction compatible or bidirectional; not selected
  | "selected" // selected primary applicable event
  | "out_of_scope"; // event type not in current applicability processing scope

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
   * Structured applicability suppression / acceptance reason (Slice 4.3 / Issue #53).
   *
   * Per-session derived debug/runtime data — MUST NOT be persisted to base fixtures.
   * (event-applicability Canon truth 13; event-data Canon truth 11)
   *
   * Provides machine-readable kind / code / label / is_driver_facing_eligible
   * breakdown of the selection outcome, in addition to the human-readable reason
   * string above.
   *
   * WIP — NOT Product Canon. Full taxonomy deferred to later child issues under #48.
   */
  applicabilityReason: ApplicabilityReason;
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
// Applicability processing scope
// ---------------------------------------------------------------------------

/**
 * Return per-type lookahead guardrails from the active tuning config.
 *
 * Returns null for types not yet in the applicability processing scope.
 * A null result routes the event to out_of_scope status.
 *
 * In-scope types (WIP — NOT Product Canon):
 *   speed_limit    — first vertical slice (Issue #49 / #65)
 *   static_camera  — Issue #65 eligibility baseline
 *   road_bump      — Issue #75 hazardous road segment eligibility baseline
 *
 * road_bump uses WIP per-type lookahead guardrails:
 *   EmulatorTuningConfig.lookahead.road_bump (WIP defaults — not Canon).
 * No target speed is introduced for road_bump events; speedReference remains
 * "unknown" when road_bump is the selected primary event.
 * Full hazard display semantics deferred to Issue #76.
 *
 * WIP — NOT Product Canon. Lookahead values are WIP emulator defaults.
 * (tuning-and-validation Canon truths 1, 2; Issue #75 WIP baseline)
 */
function getEventLookaheadGuardrails(
  normalized_type: string,
  config: EmulatorTuningConfig
): LookaheadGuardrails | null {
  if (normalized_type === "speed_limit") return config.lookahead.speed_limit;
  if (normalized_type === "static_camera") return config.lookahead.static_camera;
  if (normalized_type === "road_bump") return config.lookahead.road_bump;
  return null;
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
 *  1. Events not in the applicability processing scope → status: out_of_scope.
 *     speed_limit, static_camera, and road_bump are processed through the full
 *     pipeline. Other types (if any future types are added) remain out_of_scope.
 *     (Issue #65 — static_camera WIP extension; Issue #75 — road_bump WIP; NOT Canon)
 *  2. In-scope events with no projection record → status: projection_missing.
 *     Conservative: suppress rather than inferring distance=0 ("behind"). (Slice 4.3 WIP)
 *  3. In-scope events with negative or zero distance → status: behind.
 *  4. In-scope events with distance > max_lookahead_m → status: too_far.
 *     Per-type WIP default from EmulatorTuningConfig.lookahead[type].max_lookahead_m.
 *  5. In-scope events with 0 < distance < min_display_distance_m → status: too_close.
 *     (WIP Slice 4.1 simplified minimum window; not a general product rule that
 *     close events are always hidden. Future slices may revise this.)
 *     Per-type WIP default from EmulatorTuningConfig.lookahead[type].min_display_distance_m.
 *  5a.[Issue #67] In-scope events within the distance window; cross-track check:
 *     If cross_track_m > config.direction_applicability.route_projection_reject_m
 *     (WIP default 50 m) → status: off_route_cross_track (suppressed, debug-visible).
 *     This runs after projection exists and after distance-based checks, but before
 *     direction compatibility can allow candidate/selected behavior.
 *     An off-route event with null direction may be suppressed here (off_route_cross_track)
 *     before reaching the direction_unknown guard — this is the new Issue #67 precedence.
 *     Threshold is reused from existing config (route_projection_reject_m = 50 m WIP).
 *     WIP emulator default — NOT Canon. (tuning-and-validation Canon truths 1, 2)
 *  6. [Slice 4.2] In-scope events within window, cross-track below threshold;
 *     direction suppression rules:
 *     - "incompatible"  → direction_conflict   (suppressed, debug-visible)
 *     - "unknown"       → direction_unknown    (suppressed, debug-visible)
 *     - "unsupported"   → direction_unsupported (suppressed, debug-visible)
 *     Conservative: when direction applicability is ambiguous or cannot be
 *     evaluated, prefer suppression / non-claim over driver-facing display.
 *     (event-applicability Canon truth 12; ui-model Canon truth 13; WIP)
 *  7. Remaining in-scope events → status: candidate.
 *     Only "compatible" and "bidirectional" direction statuses reach this step.
 *     Bidirectional candidates are labeled in the reason string (WIP: dirtype=0
 *     treated as compatible for this baseline; semantics not Canon).
 *  8. Candidates sorted ascending by distance. First → selected (primary).
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
  const projectionMap = new Map<string, EventProjectionRecord>(
    projections.map((p) => [p.event_id, p])
  );

  const dirCompatMap = new Map<string, DirectionCompatibilityRecord>(
    directionCompatibilityRecords.map((r) => [r.event_id, r])
  );

  const records: EventSelectionRecord[] = [];

  for (const event of events) {
    const proj = projectionMap.get(event.event_id);
    const dirCompat = dirCompatMap.get(event.event_id) ?? null;

    // Route events not in the applicability processing scope to out_of_scope.
    // speed_limit, static_camera, and road_bump are processed through the full
    // pipeline. Any other event type returns null and is routed out_of_scope.
    // (Issue #65 — static_camera WIP extension; Issue #75 — road_bump WIP; NOT Canon)
    const guardrails = getEventLookaheadGuardrails(event.normalized_type, config);
    if (guardrails === null) {
      records.push({
        event_id: event.event_id,
        normalized_type: event.normalized_type,
        target_speed_kmh: event.target_speed_kmh,
        distance_m: proj?.signed_distance_m ?? 0,
        projection_along_route_m: proj?.projection.best.along_route_m ?? 0,
        projection_cross_track_m: proj?.projection.best.cross_track_m ?? 0,
        status: "out_of_scope",
        reason: `Type "${event.normalized_type}" is not in the current applicability processing scope (speed_limit, static_camera, road_bump are processed; others are not). WIP — NOT Canon.`,
        applicabilityReason: makeApplicabilityReason("event_type_out_of_scope"),
        directionCompatibility: null,
      });
      continue;
    }

    // Explicit projection_missing guard — must come before distance-based checks.
    // If no projection record is available for an in-scope event, suppress
    // conservatively rather than inferring distance=0 (which would misleadingly
    // produce a "behind" status). Debug-visible only.
    // WIP — not Canon. Maps to ApplicabilityReasonCode "missing_projection".
    // (event-applicability Canon truth 12; Slice 4.3 / Issue #53)
    if (proj === undefined) {
      records.push({
        event_id: event.event_id,
        normalized_type: event.normalized_type,
        target_speed_kmh: event.target_speed_kmh,
        distance_m: 0,
        projection_along_route_m: 0,
        projection_cross_track_m: 0,
        status: "projection_missing",
        reason:
          `No projection record found for event ${event.event_id}. ` +
          `Conservative: suppressed from driver-facing selection; debug-visible. ` +
          `(WIP — not Canon; per-session derived debug data)`,
        applicabilityReason: makeApplicabilityReason("missing_projection"),
        directionCompatibility: dirCompat,
      });
      continue;
    }

    // From here, proj is always defined.
    const distanceM = proj.signed_distance_m;
    const along_route_m = proj.projection.best.along_route_m;
    const cross_track_m = proj.projection.best.cross_track_m;

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
        applicabilityReason: makeApplicabilityReason("behind_vehicle"),
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
        applicabilityReason: makeApplicabilityReason("outside_max_lookahead"),
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
        applicabilityReason: makeApplicabilityReason("inside_min_display_window"),
        directionCompatibility: dirCompat,
      });
    } else if (
      cross_track_m > config.direction_applicability.route_projection_reject_m
    ) {
      // Cross-track / off-route suppression (Issue #67).
      // Event is within the distance window but projects to the route at a
      // cross-track distance exceeding the WIP rejection threshold.
      // Suppressed before direction compatibility is evaluated — an off-route
      // event with null direction will receive off_route_cross_track here rather
      // than direction_unknown (new Issue #67 precedence).
      // Threshold: config.direction_applicability.route_projection_reject_m
      // WIP default: 50 m. NOT Canon. (tuning-and-validation Canon truths 1, 2)
      // Debug-visible. Not driver-facing.
      // (event-applicability Canon truth 12; ui-model Canon truth 13)
      records.push({
        event_id: event.event_id,
        normalized_type: event.normalized_type,
        target_speed_kmh: event.target_speed_kmh,
        distance_m: distanceM,
        projection_along_route_m: along_route_m,
        projection_cross_track_m: cross_track_m,
        status: "off_route_cross_track",
        reason:
          `${distanceM.toFixed(0)} m ahead — cross-track distance ${cross_track_m.toFixed(1)} m ` +
          `exceeds WIP rejection threshold (route_projection_reject_m = ` +
          `${config.direction_applicability.route_projection_reject_m} m). ` +
          `Off-route: suppressed from driver-facing selection; debug-visible. ` +
          `(WIP emulator default — not Canon; Issue #67 baseline; per-session derived debug data)`,
        applicabilityReason: makeApplicabilityReason(
          "route_projection_cross_track_rejected"
        ),
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
        applicabilityReason: makeApplicabilityReason("direction_conflict"),
        directionCompatibility: dirCompat,
      });
    } else if (dirCompat === null) {
      // No direction compatibility record at all (distinct from direction_unknown,
      // which has a computed record whose evaluated status is "unknown").
      // Conservative: suppress from driver-facing selection.
      // Visible in debug only. (event-applicability Canon truth 12; Slice 4.2 WIP)
      records.push({
        event_id: event.event_id,
        normalized_type: event.normalized_type,
        target_speed_kmh: event.target_speed_kmh,
        distance_m: distanceM,
        projection_along_route_m: along_route_m,
        projection_cross_track_m: cross_track_m,
        status: "direction_unknown",
        reason:
          `${distanceM.toFixed(0)} m ahead — no direction compatibility record. ` +
          `Conservative: suppressed from driver-facing selection; debug-visible. ` +
          `(WIP candidate semantics — not Canon; per-session derived debug data)`,
        applicabilityReason: makeApplicabilityReason("missing_direction_record"),
        directionCompatibility: null,
      });
    } else if (dirCompat.status === "unknown") {
      // Direction could not be evaluated (missing/null source direction or dirtype).
      // Conservative: when direction applicability is ambiguous or cannot be
      // determined, prefer suppression over driver-facing display.
      // Visible in debug only. (event-applicability Canon truth 12; Slice 4.2 WIP)
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
          `Direction detail: ${dirCompat.reason} ` +
          `(WIP candidate semantics — not Canon; per-session derived debug data)`,
        applicabilityReason: makeApplicabilityReason("direction_unknown"),
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
        applicabilityReason: makeApplicabilityReason("direction_unsupported"),
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
        applicabilityReason: makeApplicabilityReason("accepted_candidate"),
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
    primaryRecord.applicabilityReason = makeApplicabilityReason("selected_primary");
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
