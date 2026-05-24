/**
 * WIP applicability suppression / acceptance reason model — Phase 0 emulator
 * (Slice 4.3 / Issue #53)
 *
 * WIP EMULATOR IMPLEMENTATION — NOT PRODUCT CANON
 *
 * Introduces a structured reason model for event selection / applicability
 * outcomes. This is a per-session debug/runtime model only.
 *
 * Purpose:
 *   Previous slices (4.1, 4.2) used a mix of EventStatus strings and human-
 *   readable reason strings. This module adds a structured layer that separates
 *   the selection outcome kind (accepted / suppressed / not_processed) from the
 *   specific code (why), allowing the debug UI and future logic layers to
 *   consume structured reason data rather than parsing strings.
 *
 * IMPORTANT SCOPE NOTES:
 *   - All names here are WIP and not Product Canon. The full applicability
 *     taxonomy is deferred to later child issues under Issue #48.
 *   - No new applicability algorithms are introduced here.
 *   - Reason values are per-session derived debug/runtime data.
 *     They MUST NOT be written back to base prepared event fixtures.
 *     (event-applicability Canon truth 13; event-data Canon truth 11)
 *   - is_driver_facing_eligible reflects only this simplified WIP baseline
 *     (Slices 4.1–4.3). It is not final product-level applicability.
 *
 * Canon authority:
 *   docs/product/areas/event-applicability/event-applicability.md
 *     truth 12: suppressed candidates must remain inspectable in debug
 *     truth 13: route-specific fields not persisted to base event records
 *   docs/product/areas/ui-model/ui-model.md
 *     truth 13: suppressed candidates must not appear driver-facing
 *   docs/product/areas/tuning-and-validation/tuning-and-validation.md
 *     truths 1, 2: no numeric value is Canon
 *
 * NOT Canon: this module is a WIP implementation for Slice 4.3 / Issue #53.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Top-level category of an applicability outcome.
 *
 * WIP — NOT Product Canon.
 *
 *   "accepted"       — event passed selection checks and is eligible for
 *                      driver-facing display (subject to is_driver_facing_eligible).
 *   "suppressed"     — event was evaluated but excluded from driver-facing
 *                      selection. Remains visible in emulator debug.
 *   "not_processed"  — event type or state was not evaluated in this slice
 *                      (e.g. non-speed_limit events in the current scope).
 */
export type ApplicabilityReasonKind =
  | "accepted"
  | "suppressed"
  | "not_processed";

/**
 * Specific reason code for an applicability outcome.
 *
 * WIP — NOT Product Canon. Names and boundary semantics may change in later
 * child issues under Issue #48.
 *
 *   selected_primary           — event was selected as the primary applicable event.
 *   accepted_candidate         — event passed direction checks and is within the
 *                                lookahead window; not the primary (secondary context).
 *   behind_vehicle             — event is behind the vehicle (negative along-route distance).
 *   outside_max_lookahead      — event is ahead but beyond the WIP max lookahead threshold.
 *   inside_min_display_window  — event is ahead but inside the WIP min display distance.
 *   direction_conflict         — within window; source direction is incompatible with
 *                                route approach tangent.
 *   direction_unknown          — within window; direction could not be evaluated
 *                                (missing/null source direction or dirtype).
 *   direction_unsupported      — within window; source dirtype value not handled
 *                                by this baseline.
 *   event_type_out_of_scope    — event type not processed in this slice
 *                                (non speed_limit).
 *   missing_projection         — no projection record was available for this event;
 *                                conservative suppression.
 *   missing_direction_record   — no direction compatibility record was available;
 *                                conservative suppression (distinct from direction_unknown
 *                                which has a computed record with unknown status).
 *   route_projection_cross_track_rejected — cross-track distance from the event to the
 *                                nearest route segment exceeds the WIP rejection threshold
 *                                (route_projection_reject_m from EmulatorTuningConfig).
 *                                Event is off-route; suppressed from driver-facing selection
 *                                before direction compatibility is evaluated.
 *                                WIP / not Canon. (Issue #67 baseline)
 */
export type ApplicabilityReasonCode =
  | "selected_primary"
  | "accepted_candidate"
  | "behind_vehicle"
  | "outside_max_lookahead"
  | "inside_min_display_window"
  | "direction_conflict"
  | "direction_unknown"
  | "direction_unsupported"
  | "event_type_out_of_scope"
  | "missing_projection"
  | "missing_direction_record"
  | "route_projection_cross_track_rejected";

/**
 * Structured applicability suppression / acceptance reason.
 *
 * Carried per event in EventSelectionRecord. Per-session derived debug/runtime
 * data — MUST NOT be persisted to base prepared event fixtures.
 * (event-applicability Canon truth 13; event-data Canon truth 11)
 *
 * WIP — NOT Product Canon. See ApplicabilityReasonCode for code semantics.
 */
export interface ApplicabilityReason {
  /**
   * Top-level outcome category.
   * WIP — NOT Canon.
   */
  kind: ApplicabilityReasonKind;

  /**
   * Specific reason code.
   * WIP — NOT Canon.
   */
  code: ApplicabilityReasonCode;

  /**
   * Short human-readable label for display in the debug UI.
   * Corresponds to the code. WIP — NOT Canon.
   */
  label: string;

  /**
   * Whether this outcome is eligible for driver-facing display under the
   * simplified WIP baseline (Slices 4.1–4.3).
   *
   * true  → selected_primary and accepted_candidate only; these are the only
   *         two states that may appear in the driver-facing three-circle display.
   * false → all suppressed and not_processed states must not appear driver-facing.
   *         (ui-model Canon truth 13; event-applicability Canon truth 12)
   *
   * WIP BASELINE — not a general product-applicability determination.
   * Full applicability, hysteresis, urgency, and feedback semantics are
   * deferred to later child issues under Issue #48.
   */
  is_driver_facing_eligible: boolean;
}

// ---------------------------------------------------------------------------
// Reason table — WIP — NOT Canon
// ---------------------------------------------------------------------------

/**
 * Lookup table mapping each ApplicabilityReasonCode to its static properties.
 *
 * WIP — NOT Product Canon.
 * Used by makeApplicabilityReason to construct ApplicabilityReason values.
 */
const REASON_TABLE: Record<
  ApplicabilityReasonCode,
  { kind: ApplicabilityReasonKind; label: string; is_driver_facing_eligible: boolean }
> = {
  selected_primary: {
    kind: "accepted",
    label: "selected_primary",
    is_driver_facing_eligible: true,
  },
  accepted_candidate: {
    kind: "accepted",
    label: "accepted_candidate",
    is_driver_facing_eligible: true,
  },
  behind_vehicle: {
    kind: "suppressed",
    label: "behind_vehicle",
    is_driver_facing_eligible: false,
  },
  outside_max_lookahead: {
    kind: "suppressed",
    label: "outside_max_lookahead",
    is_driver_facing_eligible: false,
  },
  inside_min_display_window: {
    kind: "suppressed",
    label: "inside_min_display_window",
    is_driver_facing_eligible: false,
  },
  direction_conflict: {
    kind: "suppressed",
    label: "direction_conflict",
    is_driver_facing_eligible: false,
  },
  direction_unknown: {
    kind: "suppressed",
    label: "direction_unknown",
    is_driver_facing_eligible: false,
  },
  direction_unsupported: {
    kind: "suppressed",
    label: "direction_unsupported",
    is_driver_facing_eligible: false,
  },
  event_type_out_of_scope: {
    kind: "not_processed",
    label: "event_type_out_of_scope",
    is_driver_facing_eligible: false,
  },
  missing_projection: {
    kind: "suppressed",
    label: "missing_projection",
    is_driver_facing_eligible: false,
  },
  missing_direction_record: {
    kind: "suppressed",
    label: "missing_direction_record",
    is_driver_facing_eligible: false,
  },
  route_projection_cross_track_rejected: {
    kind: "suppressed",
    label: "route_projection_cross_track_rejected",
    is_driver_facing_eligible: false,
  },
};

// ---------------------------------------------------------------------------
// Constructor helper
// ---------------------------------------------------------------------------

/**
 * Construct an ApplicabilityReason from a reason code.
 *
 * Looks up static properties (kind, label, is_driver_facing_eligible) from
 * the WIP reason table. The caller provides only the code.
 *
 * WIP — NOT Product Canon.
 *
 * @param code - WIP ApplicabilityReasonCode.
 * @returns Fully constructed ApplicabilityReason (per-session, not persisted).
 */
export function makeApplicabilityReason(
  code: ApplicabilityReasonCode
): ApplicabilityReason {
  const entry = REASON_TABLE[code];
  return {
    kind: entry.kind,
    code,
    label: entry.label,
    is_driver_facing_eligible: entry.is_driver_facing_eligible,
  };
}
