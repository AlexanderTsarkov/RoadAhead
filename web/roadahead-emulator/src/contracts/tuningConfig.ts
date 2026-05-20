/**
 * EmulatorTuningConfig contract — Phase 0 emulator (Slice 2 / Issue #44)
 *
 * Defines the shape of the emulator tuning configuration object used in later
 * slices. This type is NOT Canon and NOT a production specification.
 *
 * Canon authority:
 *   docs/product/areas/tuning-and-validation/tuning-and-validation.md
 *
 * IMPORTANT: No numeric tuning value is Product Canon.
 * Every field in EmulatorTuningConfig is a WIP emulator default. Values are
 * emulator tuning starting defaults that must be validated through scenario
 * sweeps before any Canon promotion. (tuning-and-validation Canon truths 1, 2,
 * 3, 6, 7, 8)
 *
 * Source of numeric defaults:
 *   docs/research/roadahead-threshold-tuning-recommendation.md §4
 *   docs/research/roadahead-direction-applicability-recommendation.md §4
 *   docs/research/roadahead-enforcement-profile-recommendation.md §4–§5
 *
 * NOT Canon: exact field names, types, and shape are WIP and subject to
 * revision by future implementation slices or ADRs.
 */

// ---------------------------------------------------------------------------
// Enforcement profile
// ---------------------------------------------------------------------------

/**
 * Tolerance resolution mode. Only "absolute_kmh" is active in POC V1.
 * "percent" and "hybrid" are reserved schema slots for future jurisdictions.
 * (enforcement-profile recommendation §4)
 */
export type ToleranceMode = "absolute_kmh" | "percent" | "hybrid";

/**
 * An enforcement tolerance profile.
 *
 * The profile describes how to resolve the enforcement tolerance for a given
 * event. POC V1 uses absolute_kmh mode only. The enforcement threshold is
 * target_speed_kmh + resolved_enforcement_tolerance_kmh.
 *
 * The enforcement threshold is used ONLY for:
 *   - pre-pass unsafe_likely
 *   - post-pass severity tiers (Tier 0 / Tier 1 / Tier 2)
 *   - camera-risk feedback
 * It is NEVER used for normal guidance bands.
 * (enforcement-profile recommendation §1, §3; threshold-tuning §3.2)
 *
 * WIP emulator default — not Canon — not a legal claim about any jurisdiction.
 * (tuning-and-validation Canon truths 1, 2)
 */
export interface EnforcementToleranceProfile {
  /**
   * Stable slug identifier for this profile.
   * Example: "russia_default_plus_20_kmh"
   */
  profile_id: string;

  /** Short human-readable label for debug / config surface display. */
  label: string;

  /** Intended jurisdiction hint. Does NOT make the profile legal truth. */
  country_or_region: string | null;

  /** Tolerance resolution mode. Only "absolute_kmh" active in POC V1. */
  tolerance_mode: ToleranceMode;

  /**
   * Absolute tolerance in km/h. Required when tolerance_mode = "absolute_kmh".
   * WIP emulator default — not Canon — not legally verified.
   */
  absolute_kmh: number | null;

  /**
   * Event types this profile applies to. Null/empty = applies to all in-scope
   * POC V1 types. (enforcement-profile recommendation §4)
   */
  applies_to_event_types: string[] | null;

  /** Free-text notes, e.g., "WIP working default; not legal truth". */
  notes: string | null;

  /** Where the values came from. */
  source: string | null;

  /**
   * Lifecycle label.
   * "poc_default" = active POC default; "debug" = emulator-only debug profile;
   * "experimental" = tuning experiment; "future" = reserved but not active;
   * "disabled" = explicitly off.
   */
  status: "poc_default" | "experimental" | "debug" | "future" | "disabled";

  /**
   * Always false in POC V1. No profile is legal truth.
   * (enforcement-profile recommendation §4; product-boundary Canon truths 3, 4)
   */
  legal_claim: false;
}

// ---------------------------------------------------------------------------
// Per-event-type lookahead guardrails
// ---------------------------------------------------------------------------

/**
 * Lookahead distance guardrails for a single event type.
 *
 * WIP emulator defaults — not Canon — must be validated via scenario sweeps.
 * (threshold-tuning recommendation §4.4, §9; tuning-and-validation Canon truths 1, 2)
 */
export interface LookaheadGuardrails {
  /**
   * Minimum distance ahead (m) at which the event may transition from hidden
   * to a visible state. Below this, the event is too close to display usefully.
   * WIP emulator default — not Canon.
   */
  min_display_distance_m: number;

  /**
   * Maximum distance ahead (m) at which the event is considered for display.
   * Beyond this, the event is too far away to be relevant right now.
   * WIP emulator default — not Canon.
   */
  max_lookahead_m: number;
}

// ---------------------------------------------------------------------------
// Direction applicability config
// ---------------------------------------------------------------------------

/**
 * Direction applicability thresholds.
 *
 * WIP emulator defaults — not Canon — must be validated via scenario sweeps.
 * (direction-applicability recommendation §4; tuning-and-validation Canon truths 1, 2)
 */
export interface DirectionApplicabilityConfig {
  /**
   * Direction delta (deg) at or below which the event is strongly compatible.
   * WIP emulator default — not Canon.
   */
  direction_delta_confident_deg: number;

  /**
   * Direction delta (deg) at or below which the event is accepted if other
   * checks pass. WIP emulator default — not Canon.
   */
  direction_delta_accept_deg: number;

  /**
   * Direction delta (deg) upper bound of the ambiguous band
   * (direction_delta_accept_deg < delta <= this). Suppressed from driver-facing
   * selection; visible in debug. WIP emulator default — not Canon.
   */
  direction_delta_ambiguous_max_deg: number;

  /**
   * Direction delta (deg) above which the event is rejected as direction
   * conflict. WIP emulator default — not Canon.
   */
  direction_delta_reject_above_deg: number;

  /** Route projection accept threshold (m). WIP emulator default — not Canon. */
  route_projection_accept_m: number;

  /** Route projection warn threshold (m). WIP emulator default — not Canon. */
  route_projection_warn_m: number;

  /** Route projection reject threshold (m). WIP emulator default — not Canon. */
  route_projection_reject_m: number;

  /**
   * Length of the route segment window used to compute the local approach
   * tangent (m). WIP emulator default — not Canon.
   */
  approach_window_m: number;

  /** Minimum approach window (m) for short segments / sharp turns. WIP default. */
  approach_window_min_m: number;

  /** Maximum approach window (m) when polyline is sparse. WIP default. */
  approach_window_max_m: number;

  /**
   * Radius (m) around a junction/fork/ramp within which stricter projection
   * rules apply. WIP emulator default — not Canon.
   */
  branch_zone_radius_m: number;

  /**
   * Cross-track distance delta (m) within which a competing projection is
   * considered a projection competitor. WIP emulator default — not Canon.
   */
  projection_competitor_delta_m: number;

  /**
   * Minimum bearing difference (deg) between competing segments for a
   * competing projection to count as ambiguity. WIP emulator default — not Canon.
   */
  competitor_heading_delta_deg: number;
}

// ---------------------------------------------------------------------------
// Deceleration profile
// ---------------------------------------------------------------------------

/**
 * Constant deceleration values (m/s²) used to map required deceleration to
 * urgency bands.
 *
 * These are emulator tuning categories, NOT vehicle braking specifications and
 * NOT human-factors certified values.
 * WIP emulator defaults — not Canon.
 * (threshold-tuning recommendation §4.3; tuning-and-validation Canon truths 1, 2)
 */
export interface DecelerationProfile {
  /**
   * awareness ↔ smooth_required boundary.
   * Comfortable, anticipatory deceleration.
   * WIP emulator default — not Canon.
   */
  decel_smooth_mps2: number;

  /**
   * smooth_required ↔ normal_required boundary.
   * Clearly deliberate deceleration.
   * WIP emulator default — not Canon.
   */
  decel_normal_mps2: number;

  /**
   * normal_required ↔ strong_required boundary.
   * Firm deceleration; materially urgent.
   * WIP emulator default — not Canon.
   */
  decel_strong_mps2: number;

  /**
   * strong_required ↔ emergency_required boundary.
   * Near-emergency braking level.
   * WIP emulator default — not Canon.
   */
  decel_emergency_mps2: number;
}

// ---------------------------------------------------------------------------
// Top-level config
// ---------------------------------------------------------------------------

/**
 * The complete emulator tuning configuration object for the Phase 0 emulator.
 *
 * This is the single place where all numeric WIP defaults live. Every field
 * is a WIP emulator default, not Product Canon. Values must be validated via
 * scenario sweeps before any promotion.
 * (tuning-and-validation Canon truths 1, 2, 3, 4, 6)
 *
 * The active config must be surfaced in the emulator's debug panel so a
 * reviewer can confirm the active configuration is what they think it is.
 * (validation-emulator Canon truth 7; threshold-tuning recommendation §1, §13)
 */
export interface EmulatorTuningConfig {
  // -------------------------------------------------------------------------
  // Timing and hysteresis
  // WIP emulator defaults — not Canon.
  // Source: threshold-tuning recommendation §4.1
  // -------------------------------------------------------------------------

  /**
   * Duration (s) for which post-pass feedback remains visible after the
   * vehicle passes a primary event.
   * WIP emulator default — not Canon.
   */
  pass_feedback_hold_s: number;

  /**
   * Symmetric UI smoothing band (km/h) around target_speed_kmh. Prevents
   * urgency ring from flickering on/off near the target.
   * Separate from enforcement_tolerance.
   * WIP emulator default — not Canon.
   */
  display_hysteresis_kmh: number;

  /**
   * Additional km/h band used when clearing an active visual state. Prevents
   * rapid re-alert / re-clear oscillation.
   * WIP emulator default — not Canon.
   */
  clear_hysteresis_kmh: number;

  /**
   * Time constant (ms) for smoothing the displayed current-speed indicator.
   * Does NOT change the raw simulated speed used for logic.
   * WIP emulator default — not Canon.
   */
  alpha_smoothing_ms: number;

  // -------------------------------------------------------------------------
  // Reaction-time defaults
  // WIP emulator defaults — not Canon — NOT human-factors certified.
  // Source: threshold-tuning recommendation §4.2
  // -------------------------------------------------------------------------

  /**
   * Reaction time (s) used in reaction_distance_m for default scenarios.
   * A modelling assumption — not a real human reaction time claim.
   * WIP emulator default — not Canon.
   */
  reaction_time_default_s: number;

  /**
   * Reaction time (s) for high-speed / poor-visibility debug scenarios.
   * WIP emulator default — not Canon.
   */
  reaction_time_high_speed_s: number;

  /**
   * Optional safety margin (m) subtracted from usable_distance_m.
   * Default 0 m; emulator operators may enable a small value for debug sweeps.
   * WIP emulator default — not Canon.
   */
  safety_margin_m: number;

  // -------------------------------------------------------------------------
  // Deceleration profile
  // WIP emulator defaults — not Canon — NOT vehicle braking specifications.
  // Source: threshold-tuning recommendation §4.3
  // -------------------------------------------------------------------------
  deceleration: DecelerationProfile;

  // -------------------------------------------------------------------------
  // Per-type lookahead guardrails
  // WIP emulator defaults — not Canon.
  // Source: threshold-tuning recommendation §4.4
  // -------------------------------------------------------------------------
  lookahead: {
    speed_limit: LookaheadGuardrails;
    static_camera: LookaheadGuardrails;
    road_bump: LookaheadGuardrails;
  };

  // -------------------------------------------------------------------------
  // Direction applicability
  // WIP emulator defaults — not Canon.
  // Source: direction-applicability recommendation §4
  // -------------------------------------------------------------------------
  direction_applicability: DirectionApplicabilityConfig;

  // -------------------------------------------------------------------------
  // Enforcement profile
  // WIP emulator default — not Canon — not legally verified.
  // Source: enforcement-profile recommendation §4–§5
  // -------------------------------------------------------------------------
  enforcement_profile: EnforcementToleranceProfile;
}
