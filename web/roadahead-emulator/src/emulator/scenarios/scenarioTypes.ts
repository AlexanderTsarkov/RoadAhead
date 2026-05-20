/**
 * Scenario type definitions — Phase 0 emulator scenario sweep harness
 * (Slice 5 / Issue #59)
 *
 * WIP VALIDATION EVIDENCE — NOT PRODUCT CANON
 *
 * Defines the TypeScript model for synthetic emulator scenarios. Each
 * scenario specifies:
 *   - emulator inputs: route progress fraction and simulated speed;
 *   - expected top-level outcomes: primary event ID, speed reference state,
 *     advisory target speed;
 *   - optional per-event checks: EventStatus, ApplicabilityReasonCode, kind.
 *
 * Scenario definitions are WIP validation artifacts, NOT Product Canon.
 * Passing scenarios only means current WIP emulator behavior matches the
 * current WIP expected outcomes for synthetic fixtures.
 *
 * They are NOT legal validation, NOT safety validation, and NOT
 * human-factors validation. No numeric tuning value is promoted to Canon
 * by these scenarios. (tuning-and-validation Canon truths 1, 2, 9)
 *
 * Canon authority: docs/product/areas/
 * NOT Canon: this module and all scenario definitions are WIP.
 */

import type { EventStatus } from "../minimalEventSelection.js";
import type { SpeedReferenceState } from "../speedReference.js";
import type {
  ApplicabilityReasonCode,
  ApplicabilityReasonKind,
} from "../applicabilityReason.js";

// ---------------------------------------------------------------------------
// Scenario input / expected output model
// ---------------------------------------------------------------------------

/**
 * A single synthetic emulator scenario definition.
 *
 * Specifies emulator inputs and expected outputs for one validation check.
 * All field values and expected outcomes are WIP — NOT Product Canon.
 */
export interface EmulatorScenario {
  /** Short machine-readable identifier (e.g. "S-001"). */
  id: string;

  /** Human-readable title for display in sweep output. */
  title: string;

  /**
   * Route progress fraction [0, 1].
   * Converted to the [0, 100] slider range inside computeSimulationState.
   */
  routeProgressFraction: number;

  /**
   * Simulated vehicle speed in km/h.
   * No provider speed is used. (validation-emulator Canon truth 6)
   */
  speedKmh: number;

  // -------------------------------------------------------------------------
  // Top-level expected outcome checks
  // If a field is undefined, that check is skipped.
  // -------------------------------------------------------------------------

  /**
   * Expected primary event ID, or null if no primary event is expected.
   * If undefined, this check is skipped.
   */
  expectedPrimaryEventId?: string | null;

  /**
   * Expected advisory speed reference state.
   * (speed-reference Canon truths 3, 4 — advisory context, not legal)
   * If undefined, this check is skipped.
   */
  expectedSpeedReferenceState?: SpeedReferenceState;

  /**
   * Expected advisory target speed in km/h from the primary event.
   * If undefined, this check is skipped.
   * null = checks that target_speed_kmh is null (no target).
   */
  expectedTargetSpeedKmh?: number | null;

  // -------------------------------------------------------------------------
  // Per-event checks
  // -------------------------------------------------------------------------

  /**
   * Optional per-event outcome checks.
   * Each entry checks one event's status and/or applicability reason.
   */
  eventChecks?: EventOutcomeCheck[];
}

/**
 * A single per-event outcome check within a scenario.
 *
 * Checks that a specific event has the expected status and/or reason.
 * All expected values are WIP — NOT Product Canon.
 */
export interface EventOutcomeCheck {
  /** Event ID to look up in the selection records. */
  eventId: string;

  /**
   * Expected event status (e.g. "selected", "behind", "direction_conflict").
   * WIP status names — NOT Product Canon.
   * If undefined, this check is skipped.
   */
  expectedStatus?: EventStatus;

  /**
   * Expected applicability reason code.
   * WIP reason codes — NOT Product Canon.
   * If undefined, this check is skipped.
   */
  expectedReasonCode?: ApplicabilityReasonCode;

  /**
   * Expected applicability reason kind.
   * ("accepted" | "suppressed" | "not_processed")
   * WIP — NOT Product Canon.
   * If undefined, this check is skipped.
   */
  expectedReasonKind?: ApplicabilityReasonKind;

  /**
   * If true, checks that projection_cross_track_m > 0.1 m.
   * Verifies that off-route events show non-zero cross-track in debug.
   * WIP debug check only — NOT Product Canon.
   * If undefined or false, this check is skipped.
   */
  expectNonZeroCrossTrack?: boolean;
}

// ---------------------------------------------------------------------------
// Sweep result types
// ---------------------------------------------------------------------------

/** Result of a single named check within a scenario. */
export interface CheckResult {
  /** Short label for the check (e.g. "primary_event_id"). */
  checkName: string;
  passed: boolean;
  /** String representation of the expected value. */
  expectedValue: string;
  /** String representation of the actual value. */
  actualValue: string;
}

/** Result of running a single scenario. */
export interface ScenarioResult {
  scenario: EmulatorScenario;
  checks: CheckResult[];
  passed: boolean;
  passCount: number;
  failCount: number;
}

/** Aggregated result of the full scenario sweep. */
export interface SweepResult {
  scenarioResults: ScenarioResult[];
  totalScenarios: number;
  passedScenarios: number;
  failedScenarios: number;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
}
