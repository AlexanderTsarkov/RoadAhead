/**
 * Scenario sweep runner — Phase 0 emulator (Slice 5 / Issue #59)
 *
 * WIP VALIDATION EVIDENCE — NOT PRODUCT CANON
 *
 * Runs the SYNTHETIC_SCENARIOS against the existing emulator domain logic
 * (computeSimulationState) and reports expected-vs-actual outcomes for each
 * defined check. Produces structured pass/fail output to stdout.
 *
 * HOW TO RUN (from web/roadahead-emulator/):
 *   npm run scenario:sweep
 *
 * This runner:
 *   - calls computeSimulationState() with synthetic fixtures + WIP tuning defaults;
 *   - checks expectedPrimaryEventId, expectedSpeedReferenceState,
 *     expectedTargetSpeedKmh, and per-event EventStatus / reason code / kind;
 *   - does NOT test browser UI behavior;
 *   - does NOT use Playwright, Cypress, or any browser automation;
 *   - does NOT require Yandex API, any provider, network, or user account;
 *   - does NOT add new applicability algorithms;
 *   - does NOT promote numeric values to Product Canon.
 *
 * OUTPUT DISCLAIMER:
 *   Scenario results are WIP validation evidence only.
 *   They are NOT Product Canon, NOT legal validation, NOT safety validation,
 *   NOT human-factors validation.
 *   Passing scenarios only means current WIP emulator behavior matches
 *   the current WIP expected outcomes for synthetic fixtures.
 *   No numeric tuning value is promoted to Canon by these results.
 *   (tuning-and-validation Canon truths 1, 2, 9)
 *
 * Canon authority: docs/product/areas/
 * NOT Canon: this module, all scenarios, and all sweep results are WIP.
 */

// Minimal process type declaration — avoids requiring @types/node.
// Only process.exit is used by this runner.
declare const process: { exit(code: number): never };

import { computeSimulationState } from "../simulationState.js";
import { SYNTHETIC_ROUTE } from "../../fixtures/routeGeometry.synthetic.js";
import { SYNTHETIC_PREPARED_EVENTS } from "../../fixtures/preparedEvents.synthetic.js";
import { EMULATOR_TUNING_DEFAULTS } from "../../config/emulatorTuningDefaults.js";
import { SYNTHETIC_SCENARIOS } from "./syntheticScenarios.js";
import type {
  EmulatorScenario,
  EventOutcomeCheck,
  CheckResult,
  ScenarioResult,
  SweepResult,
} from "./scenarioTypes.js";
import type { EventSelectionRecord } from "../minimalEventSelection.js";

// ---------------------------------------------------------------------------
// Runner — check evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate a single top-level check (primary event ID, speed reference state,
 * or target speed).
 *
 * Returns a CheckResult with pass/fail, expected, and actual values.
 */
function makeCheck(
  checkName: string,
  expected: string,
  actual: string
): CheckResult {
  return {
    checkName,
    passed: expected === actual,
    expectedValue: expected,
    actualValue: actual,
  };
}

/**
 * Evaluate all per-event checks for one EventOutcomeCheck definition.
 *
 * Looks up the event's EventSelectionRecord from the selection output.
 * Returns one CheckResult per defined expected field.
 */
function evaluateEventChecks(
  check: EventOutcomeCheck,
  records: EventSelectionRecord[]
): CheckResult[] {
  const record = records.find((r) => r.event_id === check.eventId);

  if (record === undefined) {
    // The event was not found in records at all — fail all checks for it.
    const notFoundMsg = `record not found for event_id="${check.eventId}"`;
    const results: CheckResult[] = [];
    if (check.expectedStatus !== undefined) {
      results.push({
        checkName: `${check.eventId}.status`,
        passed: false,
        expectedValue: check.expectedStatus,
        actualValue: notFoundMsg,
      });
    }
    if (check.expectedReasonCode !== undefined) {
      results.push({
        checkName: `${check.eventId}.reasonCode`,
        passed: false,
        expectedValue: check.expectedReasonCode,
        actualValue: notFoundMsg,
      });
    }
    if (check.expectedReasonKind !== undefined) {
      results.push({
        checkName: `${check.eventId}.reasonKind`,
        passed: false,
        expectedValue: check.expectedReasonKind,
        actualValue: notFoundMsg,
      });
    }
    if (check.expectNonZeroCrossTrack === true) {
      results.push({
        checkName: `${check.eventId}.crossTrack>0`,
        passed: false,
        expectedValue: ">0.1 m",
        actualValue: notFoundMsg,
      });
    }
    return results;
  }

  const results: CheckResult[] = [];

  if (check.expectedStatus !== undefined) {
    results.push(
      makeCheck(
        `${check.eventId}.status`,
        check.expectedStatus,
        record.status
      )
    );
  }

  if (check.expectedReasonCode !== undefined) {
    results.push(
      makeCheck(
        `${check.eventId}.reasonCode`,
        check.expectedReasonCode,
        record.applicabilityReason.code
      )
    );
  }

  if (check.expectedReasonKind !== undefined) {
    results.push(
      makeCheck(
        `${check.eventId}.reasonKind`,
        check.expectedReasonKind,
        record.applicabilityReason.kind
      )
    );
  }

  if (check.expectNonZeroCrossTrack === true) {
    const crossTrack = record.projection_cross_track_m;
    const passed = crossTrack > 0.1;
    results.push({
      checkName: `${check.eventId}.crossTrack>0`,
      passed,
      expectedValue: ">0.1 m",
      actualValue: `${crossTrack.toFixed(1)} m`,
    });
  }

  return results;
}

/**
 * Run a single scenario against the current emulator domain logic.
 *
 * Calls computeSimulationState() with synthetic fixtures and WIP tuning
 * defaults, then evaluates all defined checks.
 *
 * Does not modify any fixture or config. Does not persist any output.
 * (event-applicability Canon truth 13; event-data Canon truth 11)
 */
function runScenario(scenario: EmulatorScenario): ScenarioResult {
  const state = computeSimulationState(
    scenario.routeProgressFraction,
    scenario.speedKmh,
    SYNTHETIC_ROUTE,
    SYNTHETIC_PREPARED_EVENTS,
    EMULATOR_TUNING_DEFAULTS
  );

  const checks: CheckResult[] = [];

  // --- Top-level checks ---

  if (scenario.expectedPrimaryEventId !== undefined) {
    const actualPrimary = state.eventSelection.primary?.event_id ?? null;
    checks.push(
      makeCheck(
        "primary_event_id",
        String(scenario.expectedPrimaryEventId),
        String(actualPrimary)
      )
    );
  }

  if (scenario.expectedSpeedReferenceState !== undefined) {
    checks.push(
      makeCheck(
        "speed_reference_state",
        scenario.expectedSpeedReferenceState,
        state.speedReference.state
      )
    );
  }

  if (scenario.expectedTargetSpeedKmh !== undefined) {
    const actualTarget = state.speedReference.target_speed_kmh;
    checks.push(
      makeCheck(
        "target_speed_kmh",
        String(scenario.expectedTargetSpeedKmh),
        String(actualTarget)
      )
    );
  }

  // --- Per-event checks ---

  if (scenario.eventChecks !== undefined) {
    for (const eventCheck of scenario.eventChecks) {
      const eventResults = evaluateEventChecks(
        eventCheck,
        state.eventSelection.records
      );
      checks.push(...eventResults);
    }
  }

  const passCount = checks.filter((c) => c.passed).length;
  const failCount = checks.filter((c) => !c.passed).length;

  return {
    scenario,
    checks,
    passed: failCount === 0,
    passCount,
    failCount,
  };
}

/**
 * Run all scenarios and aggregate results.
 */
function runAllScenarios(): SweepResult {
  const scenarioResults = SYNTHETIC_SCENARIOS.map(runScenario);

  const passedScenarios = scenarioResults.filter((r) => r.passed).length;
  const failedScenarios = scenarioResults.filter((r) => !r.passed).length;
  const totalChecks = scenarioResults.reduce((n, r) => n + r.checks.length, 0);
  const passedChecks = scenarioResults.reduce((n, r) => n + r.passCount, 0);
  const failedChecks = scenarioResults.reduce((n, r) => n + r.failCount, 0);

  return {
    scenarioResults,
    totalScenarios: scenarioResults.length,
    passedScenarios,
    failedScenarios,
    totalChecks,
    passedChecks,
    failedChecks,
  };
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

const PASS = "PASS";
const FAIL = "FAIL";
const WIDTH_STATUS = 4;
const WIDTH_CHECK = 30;
const WIDTH_VALUE = 25;

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

function printSweepResults(result: SweepResult): void {
  console.log("=".repeat(72));
  console.log("RoadAhead Phase 0 — Scenario Sweep");
  console.log("Slice 5 / Issue #59 — WIP validation evidence harness");
  console.log("=".repeat(72));
  console.log();
  console.log(
    "DISCLAIMER: Scenario results are WIP validation evidence only."
  );
  console.log(
    "  NOT Product Canon. NOT legal / safety / human-factors validation."
  );
  console.log(
    "  Passing scenarios only means current WIP emulator behavior matches"
  );
  console.log("  current WIP expected outcomes for synthetic fixtures.");
  console.log(
    "  No numeric tuning value is promoted to Canon by these results."
  );
  console.log(
    "  Synthetic fixtures only — no Yandex API, no provider, no network."
  );
  console.log();

  for (const r of result.scenarioResults) {
    const scenarioStatus = r.passed ? PASS : FAIL;
    console.log(
      `[${r.scenario.id}] ${scenarioStatus}  ${r.scenario.title}`
    );
    console.log(
      `  progress=${(r.scenario.routeProgressFraction * 100).toFixed(0)}%  speed=${r.scenario.speedKmh} km/h  checks=${r.passCount}/${r.checks.length} passed`
    );

    for (const check of r.checks) {
      const status = check.passed ? PASS : FAIL;
      const line = [
        "  ",
        pad(status, WIDTH_STATUS),
        "  ",
        pad(check.checkName, WIDTH_CHECK),
        "  expected=",
        pad(check.expectedValue, WIDTH_VALUE),
        "  actual=",
        check.actualValue,
      ].join("");
      console.log(line);
    }

    console.log();
  }

  console.log("-".repeat(72));
  console.log(
    `Scenarios: ${result.totalScenarios} total  |  ` +
      `${result.passedScenarios} passed  |  ${result.failedScenarios} failed`
  );
  console.log(
    `Checks:    ${result.totalChecks} total  |  ` +
      `${result.passedChecks} passed  |  ${result.failedChecks} failed`
  );
  console.log("-".repeat(72));
  console.log();

  if (result.failedScenarios === 0) {
    console.log(`ALL ${result.totalScenarios} SCENARIOS PASSED`);
  } else {
    console.log(
      `${result.failedScenarios} SCENARIO(S) FAILED — see FAIL lines above`
    );
  }

  console.log();
  console.log(
    "WIP — scenario results are validation evidence only, not Product Canon."
  );
  console.log("=".repeat(72));
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const result = runAllScenarios();
printSweepResults(result);

// Exit with non-zero code if any scenario fails, so CI can detect failures.
if (result.failedScenarios > 0) {
  process.exit(1);
}
