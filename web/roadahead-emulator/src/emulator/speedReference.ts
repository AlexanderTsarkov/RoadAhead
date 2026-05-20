/**
 * Speed reference state — Phase 0 emulator (Slice 3 / Issue #46)
 *
 * Computes the advisory speed reference context from the primary applicable
 * event selected by the event selection pass.
 *
 * POC V1 active states: unknown, approach_target.
 * (speed-reference Canon truths 3, 4)
 *
 * This is advisory guidance context — NOT a legal speed-limit authority,
 * NOT safety-certified, and NOT an enforcement claim.
 * (speed-reference Canon truths 1, 4, 5; product-boundary Canon truths 2–5)
 *
 * Canon authority:
 *   docs/product/areas/speed-reference/speed-reference.md
 *   docs/product/areas/product-boundary/product-boundary.md
 *
 * NOT Canon: exact state set and transition logic are WIP and subject to
 * revision by future slices and Canon updates.
 */

import type { PreparedEvent } from "../contracts/preparedEvent.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * POC V1 active speed reference states.
 *
 * Only "unknown" and "approach_target" are active in POC V1.
 * (speed-reference Canon truth 3; speed-reference Canon truth 4)
 *
 * "on_target", "exceeding_target", "post_pass", "no_route" etc. are future
 * states and are NOT implemented in this slice.
 */
export type SpeedReferenceState = "unknown" | "approach_target";

/**
 * Advisory speed reference context derived from the primary applicable event.
 *
 * This is guidance context only. target_speed_kmh, when present, is the
 * advisory target from the candidate event record — not a legal speed limit,
 * not a safety certification, and not an enforcement threshold.
 *
 * The enforcement threshold (target_speed_kmh + enforcement_tolerance) is
 * computed separately and is NOT represented here.
 * (speed-reference Canon truths 4, 5; enforcement-profile recommendation §3)
 */
export interface SpeedReferenceContext {
  /** Current speed reference state. */
  state: SpeedReferenceState;
  /**
   * Advisory target speed in km/h.
   * Only present when state = "approach_target".
   * Sourced from primary event target_speed_kmh — not a legal authority.
   * (speed-reference Canon truths 4, 5)
   */
  target_speed_kmh: number | null;
  /** Reason for this state, for the debug panel. */
  reason: string;
}

// ---------------------------------------------------------------------------
// Computation
// ---------------------------------------------------------------------------

/**
 * Compute the speed reference context from the primary applicable event.
 *
 * Returns "approach_target" when there is a primary event with a
 * target_speed_kmh value; returns "unknown" otherwise.
 *
 * (speed-reference Canon truths 3, 4, 5)
 *
 * @param primary - The selected primary applicable event, or null.
 * @returns Advisory SpeedReferenceContext (not a legal or safety claim).
 */
export function computeSpeedReference(
  primary: PreparedEvent | null
): SpeedReferenceContext {
  if (primary === null) {
    return {
      state: "unknown",
      target_speed_kmh: null,
      reason: "No applicable event selected.",
    };
  }

  if (primary.target_speed_kmh === null) {
    return {
      state: "unknown",
      target_speed_kmh: null,
      reason: `Primary event "${primary.event_id}" has no target_speed_kmh.`,
    };
  }

  return {
    state: "approach_target",
    target_speed_kmh: primary.target_speed_kmh,
    reason: `Primary event "${primary.event_id}" provides target_speed_kmh = ${primary.target_speed_kmh} km/h (advisory, not legal authority).`,
  };
}
