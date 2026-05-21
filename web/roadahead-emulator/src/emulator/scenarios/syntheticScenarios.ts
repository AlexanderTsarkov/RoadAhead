/**
 * Synthetic scenario set — Phase 0 emulator scenario sweep harness
 * (Slice 5 / Issue #59)
 *
 * WIP VALIDATION EVIDENCE — NOT PRODUCT CANON
 *
 * This file defines the initial set of synthetic emulator scenarios. Each
 * scenario exercises one or more debug states of the existing emulator logic
 * against the synthetic fixtures from preparedEvents.synthetic.ts.
 *
 * IMPORTANT SCOPE NOTES:
 *
 *   - Scenarios are WIP validation artifacts. Passing scenarios only means
 *     the current WIP emulator behavior matches the current WIP expected
 *     outcomes for synthetic fixtures. They are NOT Canon evidence.
 *
 *   - No new applicability algorithms are introduced here. The scenarios
 *     call computeSimulationState() and check its output.
 *
 *   - No numeric tuning value is promoted to Canon by these scenarios.
 *     Thresholds visible in the expected outcomes (175 m min window,
 *     900 m max lookahead) come from EMULATOR_TUNING_DEFAULTS, which are
 *     WIP defaults only. (tuning-and-validation Canon truths 1, 2)
 *
 *   - These scenarios do NOT make legal, safety, or human-factors claims.
 *     (tuning-and-validation Canon truth 9)
 *
 *   - No Yandex API, no provider, no network, no account required.
 *     Synthetic fixtures only.
 *
 * Route geometry reference (synthetic, east-bound, not a real road):
 *   lon 37.600 → 37.675, lat 55.750 (constant)
 *   6 waypoints, 5 segments × ~941 m ≈ 4706 m total route length
 *
 * Synthetic events (preparedEvents.synthetic.ts):
 *   evt-001  lon=37.624  speed_limit 60 km/h  null direction   → direction_unknown
 *   evt-002  lon=37.651  speed_limit 40 km/h  east (90°, dirtype=1)   → compatible
 *   evt-003  lon=37.638  speed_limit 80 km/h  west (270°, dirtype=1)  → direction_conflict
 *   evt-004  lon=37.619  speed_limit 50 km/h  dirtype=99 (unsupported) → direction_unsupported
 *   evt-005  lon=37.655  static_camera  null   → out_of_scope / not_processed
 *   evt-006  lon=37.640, lat=55.751 (off-route ~111 m north)  null → direction_unknown, non-zero cross-track
 *
 * Approximate along-route positions from route start:
 *   evt-004 ≈  1192 m   evt-001 ≈ 1506 m   evt-003 ≈ 2384 m
 *   evt-006 ≈  2509 m   evt-002 ≈ 3199 m   evt-005 ≈ 3450 m
 *
 * WIP lookahead window: [175 m, 900 m] from vehicle (EMULATOR_TUNING_DEFAULTS)
 *
 * Canon authority: docs/product/areas/
 * NOT Canon: this module and all scenario definitions are WIP.
 */

import type { EmulatorScenario } from "./scenarioTypes.js";

/**
 * Initial synthetic scenario set for Phase 0 emulator sweep.
 *
 * 8 scenarios covering the debug states defined in Issue #59 scope.
 * Designed to be manually reviewable — not exhaustive.
 *
 * WIP VALIDATION EVIDENCE — NOT PRODUCT CANON.
 */
export const SYNTHETIC_SCENARIOS: EmulatorScenario[] = [
  // ---------------------------------------------------------------------------
  // S-001: no_applicable_event_all_too_far
  //
  // Vehicle at route start (progress=0%). All speed_limit events are > 900 m
  // ahead of vehicle → all too_far. No primary event. Speed reference = unknown.
  //
  // WIP — NOT Canon. The 900 m threshold is a WIP default, not Canon.
  // (tuning-and-validation Canon truths 1, 2)
  // ---------------------------------------------------------------------------
  {
    id: "S-001",
    title: "no_applicable_event — all speed_limit events too_far at route start",
    routeProgressFraction: 0.0,
    speedKmh: 60,

    expectedPrimaryEventId: null,
    expectedSpeedReferenceState: "unknown",
    expectedTargetSpeedKmh: null,

    eventChecks: [
      {
        eventId: "synthetic-evt-001",
        expectedStatus: "too_far",
        expectedReasonCode: "outside_max_lookahead",
        expectedReasonKind: "suppressed",
      },
      {
        eventId: "synthetic-evt-002",
        expectedStatus: "too_far",
        expectedReasonCode: "outside_max_lookahead",
        expectedReasonKind: "suppressed",
      },
      // evt-005 is static_camera → always out_of_scope regardless of distance.
      {
        eventId: "synthetic-evt-005",
        expectedStatus: "out_of_scope",
        expectedReasonCode: "event_type_out_of_scope",
        expectedReasonKind: "not_processed",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // S-002: compatible_speed_limit_selected_as_primary
  //
  // Vehicle at progress ≈ 62% (≈ 2918 m from route start).
  // evt-002 (east, dirtype=1, 40 km/h) is ≈ 281 m ahead → within window [175,900 m],
  // direction compatible (delta ≈ 0°) → selected as primary.
  // All other speed_limit events are behind the vehicle.
  //
  // WIP — NOT Canon. 40 km/h is an advisory emulator target, not a legal authority.
  // Direction compatibility result is WIP baseline (Slice 4.2) — not Canon.
  // (speed-reference Canon truths 4, 5; event-applicability Canon truth 8)
  // ---------------------------------------------------------------------------
  {
    id: "S-002",
    title: "compatible_speed_limit_selected — evt-002 (east, 40 km/h) is primary at ~62% progress",
    routeProgressFraction: 0.62,
    speedKmh: 60,

    expectedPrimaryEventId: "synthetic-evt-002",
    expectedSpeedReferenceState: "approach_target",
    expectedTargetSpeedKmh: 40,

    eventChecks: [
      {
        eventId: "synthetic-evt-002",
        expectedStatus: "selected",
        expectedReasonCode: "selected_primary",
        expectedReasonKind: "accepted",
      },
      // evt-001 is behind vehicle at this progress.
      {
        eventId: "synthetic-evt-001",
        expectedStatus: "behind",
        expectedReasonCode: "behind_vehicle",
        expectedReasonKind: "suppressed",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // S-003: direction_unknown_suppressed
  //
  // Vehicle at progress ≈ 18% (≈ 847 m from route start).
  // evt-001 (null source_direction_deg, null source_dirtype) is ≈ 659 m ahead →
  // within window [175,900 m], but direction cannot be evaluated → direction_unknown.
  // Conservative: suppressed from driver-facing selection.
  // No primary event (all suppressed or too_far). Speed reference = unknown.
  //
  // WIP — NOT Canon. direction_unknown is WIP Slice 4.2 semantics.
  // (event-applicability Canon truth 12; ui-model Canon truth 13)
  // ---------------------------------------------------------------------------
  {
    id: "S-003",
    title: "direction_unknown_suppressed — evt-001 (null direction) in window but suppressed",
    routeProgressFraction: 0.18,
    speedKmh: 60,

    expectedPrimaryEventId: null,
    expectedSpeedReferenceState: "unknown",

    eventChecks: [
      {
        eventId: "synthetic-evt-001",
        expectedStatus: "direction_unknown",
        expectedReasonCode: "direction_unknown",
        expectedReasonKind: "suppressed",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // S-004: direction_conflict_suppressed
  //
  // Vehicle at progress ≈ 40% (≈ 1882 m from route start).
  // evt-003 (west, 270°, dirtype=1, 80 km/h) is ≈ 502 m ahead → within window,
  // direction delta ≈ 180° > reject threshold (60°) → direction_conflict.
  // Suppressed from driver-facing selection; visible in debug only.
  // No primary event. Speed reference = unknown.
  //
  // WIP — NOT Canon. direction_conflict status and reject threshold are WIP.
  // (event-applicability Canon truth 12; Slice 4.2 / Issue #51 WIP)
  // ---------------------------------------------------------------------------
  {
    id: "S-004",
    title: "direction_conflict_suppressed — evt-003 (west, delta≈180°) in window but suppressed",
    routeProgressFraction: 0.40,
    speedKmh: 60,

    expectedPrimaryEventId: null,
    expectedSpeedReferenceState: "unknown",

    eventChecks: [
      {
        eventId: "synthetic-evt-003",
        expectedStatus: "direction_conflict",
        expectedReasonCode: "direction_conflict",
        expectedReasonKind: "suppressed",
      },
      // evt-006 (off-route, null direction) is also in window at this progress.
      // Checks non-zero cross-track (event placed ~111 m north of route).
      // WIP debug check — NOT Canon. No off-route suppression behavior exists yet.
      {
        eventId: "synthetic-evt-006",
        expectedStatus: "direction_unknown",
        expectNonZeroCrossTrack: true,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // S-005: direction_unsupported_suppressed
  //
  // Vehicle at progress ≈ 18% (≈ 847 m from route start).
  // evt-004 (source_dirtype=99, unsupported sentinel value) is ≈ 345 m ahead →
  // within window [175,900 m], dirtype not handled by the Slice 4.2 baseline
  // → direction_unsupported. Suppressed from driver-facing selection.
  //
  // WIP — NOT Canon. dirtype=99 is a synthetic sentinel for QA coverage only;
  // it has no real Datakam or Canon semantic.
  // Conservative: when dirtype is unrecognized, prefer suppression.
  // (event-applicability Canon truth 12; Slice 4.5 / Issue #57 WIP)
  // ---------------------------------------------------------------------------
  {
    id: "S-005",
    title: "direction_unsupported_suppressed — evt-004 (dirtype=99) in window but suppressed",
    routeProgressFraction: 0.18,
    speedKmh: 60,

    expectedPrimaryEventId: null,
    expectedSpeedReferenceState: "unknown",

    eventChecks: [
      {
        eventId: "synthetic-evt-004",
        expectedStatus: "direction_unsupported",
        expectedReasonCode: "direction_unsupported",
        expectedReasonKind: "suppressed",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // S-006: out_of_scope_not_processed
  //
  // Vehicle at progress ≈ 62% (same as S-002). evt-005 is a static_camera event.
  // Non-speed_limit events are always out_of_scope in the current selection scope
  // regardless of distance. Visible in debug only.
  //
  // WIP — NOT Canon. out_of_scope / not_processed semantics are WIP Slice 4
  // (event-applicability Canon truth 12; Slice 4.5 / Issue #57 WIP)
  // ---------------------------------------------------------------------------
  {
    id: "S-006",
    title: "out_of_scope_not_processed — evt-005 (static_camera) always not_processed in current scope",
    routeProgressFraction: 0.62,
    speedKmh: 60,

    eventChecks: [
      {
        eventId: "synthetic-evt-005",
        expectedStatus: "out_of_scope",
        expectedReasonCode: "event_type_out_of_scope",
        expectedReasonKind: "not_processed",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // S-007: too_close
  //
  // Vehicle at progress ≈ 30% (≈ 1412 m from route start).
  // evt-001 is ≈ 94 m ahead → less than min_display_distance_m (175 m) → too_close.
  // Distance check runs before direction check; evt-001 gets too_close status
  // (not direction_unknown) at this distance. (Slice 4.1 WIP simplified window)
  // No primary event. Speed reference = unknown.
  //
  // WIP — NOT Canon. 175 m is a WIP default. too_close is a simplified WIP
  // debug status — not a general product rule. Future urgency/applicability
  // behavior may revise how events at this distance are treated.
  // (tuning-and-validation Canon truths 1, 2)
  // ---------------------------------------------------------------------------
  {
    id: "S-007",
    title: "too_close — evt-001 (~94 m ahead) inside min_display_distance_m (175 m WIP default)",
    routeProgressFraction: 0.30,
    speedKmh: 60,

    expectedPrimaryEventId: null,
    expectedSpeedReferenceState: "unknown",

    eventChecks: [
      {
        eventId: "synthetic-evt-001",
        expectedStatus: "too_close",
        expectedReasonCode: "inside_min_display_window",
        expectedReasonKind: "suppressed",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // S-008: behind_vehicle
  //
  // Vehicle at progress ≈ 90% (≈ 4235 m from route start).
  // All speed_limit events are behind the vehicle. No primary. Speed ref = unknown.
  //
  // WIP — NOT Canon. "behind" status is per-session derived data.
  // (event-applicability Canon truth 13)
  // ---------------------------------------------------------------------------
  {
    id: "S-008",
    title: "behind_vehicle — all events behind at progress ~90%",
    routeProgressFraction: 0.90,
    speedKmh: 60,

    expectedPrimaryEventId: null,
    expectedSpeedReferenceState: "unknown",
    expectedTargetSpeedKmh: null,

    eventChecks: [
      {
        eventId: "synthetic-evt-001",
        expectedStatus: "behind",
        expectedReasonCode: "behind_vehicle",
        expectedReasonKind: "suppressed",
      },
      {
        eventId: "synthetic-evt-002",
        expectedStatus: "behind",
        expectedReasonCode: "behind_vehicle",
        expectedReasonKind: "suppressed",
      },
    ],
  },
];
