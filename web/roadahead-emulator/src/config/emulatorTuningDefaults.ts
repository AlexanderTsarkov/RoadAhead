/**
 * Emulator tuning defaults — Phase 0 emulator (Slice 2 / Issue #44)
 *
 * WIP EMULATOR DEFAULTS — NOT PRODUCT CANON
 *
 * Every numeric value in this file is a WIP emulator tuning starting default.
 * None of these values are Product Canon. None are safety-certified. None make
 * legal or human-factors claims. All must be validated through scenario sweeps
 * before any promotion to Canon.
 * (tuning-and-validation Canon truths 1, 2, 3, 6, 7, 8)
 *
 * The active config must be surfaced in the emulator's debug panel so a
 * reviewer can confirm what configuration is active.
 * (validation-emulator Canon truth 7; threshold-tuning recommendation §1, §13)
 *
 * Numeric sources (all WIP research recommendations, not Canon):
 *   - Timing / hysteresis:
 *       docs/research/roadahead-threshold-tuning-recommendation.md §4.1
 *   - Reaction time:
 *       docs/research/roadahead-threshold-tuning-recommendation.md §4.2
 *   - Deceleration profile:
 *       docs/research/roadahead-threshold-tuning-recommendation.md §4.3
 *   - Lookahead guardrails:
 *       docs/research/roadahead-threshold-tuning-recommendation.md §4.4
 *   - Direction applicability thresholds:
 *       docs/research/roadahead-direction-applicability-recommendation.md §4
 *   - Enforcement profile:
 *       docs/research/roadahead-enforcement-profile-recommendation.md §4–§5
 *
 * Canon authority:
 *   docs/product/areas/tuning-and-validation/tuning-and-validation.md
 *   docs/product/areas/product-boundary/product-boundary.md
 */

import type { EmulatorTuningConfig } from "../contracts/tuningConfig.js";

/**
 * Default emulator tuning configuration for Phase 0 POC V1.
 *
 * WIP EMULATOR DEFAULTS — NOT PRODUCT CANON.
 * All numeric values are starting defaults for emulator scenario sweeps.
 * They must not be hard-coded into product logic, UI labels, or debug strings
 * as legally / safety / regulatorily authoritative.
 * (tuning-and-validation Canon truths 1, 2; threshold-tuning recommendation §1)
 */
export const EMULATOR_TUNING_DEFAULTS: EmulatorTuningConfig = {
  // -------------------------------------------------------------------------
  // Timing and hysteresis
  // WIP emulator defaults — not Canon.
  // Source: threshold-tuning recommendation §4.1
  // -------------------------------------------------------------------------

  /**
   * Post-pass feedback hold duration.
   * WIP starting default: 2.0 s (tuning range: 1.5–3.0 s).
   * NOT Canon. Must be validated via scenario sweep.
   */
  pass_feedback_hold_s: 2.0,

  /**
   * UI smoothing band around target_speed_kmh.
   * Separate from enforcement_tolerance.
   * WIP starting default: 2 km/h (tuning range: 1–3 km/h).
   * NOT Canon. Must be validated via scenario sweep.
   */
  display_hysteresis_kmh: 2,

  /**
   * Hysteresis band for clearing an active visual state.
   * WIP starting default: 3 km/h (tuning range: 2–5 km/h).
   * NOT Canon. Must be validated via scenario sweep.
   */
  clear_hysteresis_kmh: 3,

  /**
   * Time constant for smoothing the displayed speed indicator.
   * Does NOT change the authoritative simulated speed used for logic.
   * WIP starting default: 300 ms (tuning range: 150–500 ms).
   * NOT Canon. Must be validated via scenario sweep.
   */
  alpha_smoothing_ms: 300,

  // -------------------------------------------------------------------------
  // Reaction-time defaults
  // WIP emulator defaults — not Canon — NOT human-factors certified.
  // A modelling assumption; not a claim about real driver reaction time.
  // Source: threshold-tuning recommendation §4.2
  // -------------------------------------------------------------------------

  /**
   * Reaction time for default scenarios.
   * WIP starting default: 1.0 s (tuning range: 0.8–1.5 s).
   * NOT a human-factors certification. NOT Canon.
   */
  reaction_time_default_s: 1.0,

  /**
   * Reaction time for high-speed / poor-visibility debug scenarios.
   * WIP starting default: 1.5 s (tuning range: 1.2–2.0 s).
   * NOT a human-factors certification. NOT Canon.
   */
  reaction_time_high_speed_s: 1.5,

  /**
   * Optional safety margin subtracted from usable_distance_m.
   * WIP starting default: 0 m (emulator operators may use 5–10 m for debug).
   * NOT Canon.
   */
  safety_margin_m: 0,

  // -------------------------------------------------------------------------
  // Deceleration profile
  // WIP emulator defaults — not Canon.
  // NOT vehicle braking specifications. NOT human-factors certified.
  // Source: threshold-tuning recommendation §4.3
  // -------------------------------------------------------------------------
  deceleration: {
    /**
     * awareness ↔ smooth_required boundary.
     * WIP starting default: 1.0 m/s² (tuning range: 0.7–1.3 m/s²).
     * NOT Canon.
     */
    decel_smooth_mps2: 1.0,

    /**
     * smooth_required ↔ normal_required boundary.
     * WIP starting default: 2.0 m/s² (tuning range: 1.5–2.5 m/s²).
     * NOT Canon.
     */
    decel_normal_mps2: 2.0,

    /**
     * normal_required ↔ strong_required boundary.
     * WIP starting default: 3.5 m/s² (tuning range: 3.0–4.5 m/s²).
     * NOT Canon.
     */
    decel_strong_mps2: 3.5,

    /**
     * strong_required ↔ emergency_required boundary.
     * WIP starting default: 6.0 m/s² (tuning range: 5.0–7.0 m/s²).
     * NOT Canon.
     */
    decel_emergency_mps2: 6.0,
  },

  // -------------------------------------------------------------------------
  // Per-type lookahead guardrails
  // WIP emulator defaults — not Canon.
  // Source: threshold-tuning recommendation §4.4
  // -------------------------------------------------------------------------
  lookahead: {
    speed_limit: {
      /**
       * WIP starting default: 175 m (mid-point of 150–200 m range).
       * Tuning range: 100–250 m. NOT Canon.
       */
      min_display_distance_m: 175,
      /**
       * WIP starting default: 900 m (mid-point of 800–1000 m range).
       * Tuning range: 600–1200 m. NOT Canon.
       */
      max_lookahead_m: 900,
    },
    static_camera: {
      /**
       * WIP starting default: 250 m (mid-point of 200–300 m range).
       * Tuning range: 150–350 m. NOT Canon.
       */
      min_display_distance_m: 250,
      /**
       * WIP starting default: 1100 m (mid-point of 1000–1200 m range).
       * Tuning range: 800–1400 m. NOT Canon.
       */
      max_lookahead_m: 1100,
    },
    road_bump: {
      /**
       * WIP starting default: 100 m (mid-point of 80–120 m range).
       * Tuning range: 60–150 m. NOT Canon.
       */
      min_display_distance_m: 100,
      /**
       * WIP starting default: 500 m (mid-point of 400–600 m range).
       * Tuning range: 300–800 m. NOT Canon.
       */
      max_lookahead_m: 500,
    },
  },

  // -------------------------------------------------------------------------
  // Direction applicability thresholds
  // WIP emulator defaults — not Canon.
  // Source: direction-applicability recommendation §4
  // -------------------------------------------------------------------------
  direction_applicability: {
    /**
     * Strongly compatible direction delta.
     * WIP starting default: 30° (tuning range: 20–35°). NOT Canon.
     */
    direction_delta_confident_deg: 30,

    /**
     * Accept boundary direction delta.
     * WIP starting default: 45° (tuning range: 30–60°). NOT Canon.
     */
    direction_delta_accept_deg: 45,

    /**
     * Upper bound of the ambiguous band (45°–this value).
     * Events in this band are suppressed from driver-facing selection by
     * default and visible in debug only.
     * WIP starting default: 60° (tuning range: 45–75°). NOT Canon.
     */
    direction_delta_ambiguous_max_deg: 60,

    /**
     * Direction conflict threshold — events above this are rejected.
     * WIP starting default: 60° (same as ambiguous max). NOT Canon.
     */
    direction_delta_reject_above_deg: 60,

    /**
     * Route projection accept threshold.
     * WIP starting default: 25 m (tuning range: 15–40 m). NOT Canon.
     */
    route_projection_accept_m: 25,

    /**
     * Route projection warn threshold.
     * WIP starting default: 40 m (tuning range: 25–75 m). NOT Canon.
     */
    route_projection_warn_m: 40,

    /**
     * Route projection reject threshold.
     * WIP starting default: 50 m (tuning range: > 50 m). NOT Canon.
     */
    route_projection_reject_m: 50,

    /**
     * Approach window for local tangent computation.
     * WIP starting default: 50 m (tuning range: 25–100 m). NOT Canon.
     */
    approach_window_m: 50,

    /**
     * Minimum approach window.
     * WIP starting default: 25 m (tuning range: 10–30 m). NOT Canon.
     */
    approach_window_min_m: 25,

    /**
     * Maximum approach window.
     * WIP starting default: 100 m (tuning range: 75–150 m). NOT Canon.
     */
    approach_window_max_m: 100,

    /**
     * Junction / fork / ramp branch zone radius.
     * WIP starting default: 40 m (tuning range: 20–75 m). NOT Canon.
     */
    branch_zone_radius_m: 40,

    /**
     * Projection competitor cross-track distance delta.
     * WIP starting default: 12 m (tuning range: 5–25 m). NOT Canon.
     */
    projection_competitor_delta_m: 12,

    /**
     * Competitor segment bearing difference threshold.
     * WIP starting default: 35° (tuning range: 20–60°). NOT Canon.
     */
    competitor_heading_delta_deg: 35,
  },

  // -------------------------------------------------------------------------
  // Enforcement profile — Russia POC default
  // WIP emulator default — not Canon — not legally verified.
  // This is a configurable emulator profile only. It does NOT claim that
  // +20 km/h is the current Russian enforcement threshold, does NOT claim
  // legal correctness, and does NOT reflect regulatory advice.
  // (enforcement-profile recommendation §1, §5; product-boundary Canon
  //  truths 3, 4; feedback-and-enforcement Canon truths 4, 12)
  // Source: enforcement-profile recommendation §4–§5
  // -------------------------------------------------------------------------
  enforcement_profile: {
    profile_id: "russia_default_plus_20_kmh",
    label: "Russia (POC default, +20 km/h)",
    country_or_region: "RU",
    tolerance_mode: "absolute_kmh",
    /**
     * WIP working default: 20 km/h absolute tolerance.
     * NOT legally verified. NOT Canon.
     * Must be re-verified against current Russian regulations before any
     * product or legal use.
     */
    absolute_kmh: 20,
    applies_to_event_types: ["speed_limit", "static_camera"],
    notes:
      "WIP working default. Not legal truth. Needs re-verification against " +
      "current Russian regulations before any product/legal use. " +
      "Source: enforcement-profile recommendation §5.",
    source:
      "docs/research/roadahead-enforcement-profile-recommendation.md §1, §5, §11",
    status: "poc_default",
    legal_claim: false,
  },
};
