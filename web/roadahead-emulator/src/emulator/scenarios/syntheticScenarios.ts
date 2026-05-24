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
 *   evt-005  lon=37.655  static_camera  null   → direction_unknown (suppressed) when in window
 *   evt-006  lon=37.640, lat=55.751 (off-route ~111 m north)  null → off_route_cross_track (Issue #67)
 *   evt-007  lon=37.648  static_camera  east (90°, dirtype=1)  → compatible; eligible when in window
 *   evt-008  lon=37.632  static_camera  west (270°, dirtype=1) → direction_conflict (suppressed)
 *   evt-009  lon=37.643, lat=55.751 (off-route ~111 m north)   → off_route_cross_track (Issue #67)
 *
 * Approximate along-route positions from route start:
 *   evt-004 ≈  1187 m   evt-001 ≈ 1499 m   evt-008 ≈ 1999 m   evt-003 ≈ 2373 m
 *   evt-009 ≈  2687 m   evt-006 ≈  2503 m   evt-007 ≈ 2998 m   evt-002 ≈ 3186 m   evt-005 ≈ 3436 m
 *
 * WIP lookahead windows (EMULATOR_TUNING_DEFAULTS):
 *   speed_limit:    [175 m,  900 m] from vehicle
 *   static_camera:  [250 m, 1100 m] from vehicle
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
  // ahead → too_far. All static_camera events are > 1100 m ahead → too_far.
  // No primary event. Speed reference = unknown.
  //
  // WIP — NOT Canon. The 900 m / 1100 m thresholds are WIP defaults, not Canon.
  // (tuning-and-validation Canon truths 1, 2)
  // ---------------------------------------------------------------------------
  {
    id: "S-001",
    title: "no_applicable_event — all events too_far at route start",
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
      // evt-005 (static_camera, null direction): now processed through the
      // applicability pipeline (Issue #65). At route start (0%), evt-005 is
      // ~3436 m ahead → > 1100 m static_camera max_lookahead → too_far.
      // (Previously out_of_scope before Issue #65. WIP — NOT Canon.)
      {
        eventId: "synthetic-evt-005",
        expectedStatus: "too_far",
        expectedReasonCode: "outside_max_lookahead",
        expectedReasonKind: "suppressed",
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
      // evt-006 (off-route speed_limit, ~111 m north, null direction) is also in
      // window at this progress (~621 m ahead). Cross-track ≈ 111 m > 50 m WIP
      // reject threshold → off_route_cross_track (Issue #67 baseline).
      // New precedence: cross-track suppression fires before direction_unknown.
      // WIP — NOT Canon. (Issue #67; tuning-and-validation Canon truths 1, 2)
      {
        eventId: "synthetic-evt-006",
        expectedStatus: "off_route_cross_track",
        expectedReasonCode: "route_projection_cross_track_rejected",
        expectedReasonKind: "suppressed",
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
  // S-006: static_camera_direction_unknown_suppressed
  //
  // Vehicle at progress ≈ 62% (≈ 2906 m from route start, same region as S-002).
  // evt-005 (static_camera, null direction) is ≈ 530 m ahead → within the
  // static_camera lookahead window [250–1100 m]; direction cannot be evaluated
  // (null source_direction_deg and source_dirtype) → direction_unknown → suppressed.
  //
  // Before Issue #65 evt-005 was out_of_scope / not_processed. After Issue #65
  // it enters the applicability pipeline and is suppressed with a structured
  // direction_unknown reason. This updated scenario documents the new behavior.
  //
  // S-002 at the same progress still selects evt-002 (speed_limit) as primary
  // since speed_limit and static_camera candidates compete by distance and
  // evt-005 is direction_unknown (suppressed, not a candidate).
  //
  // WIP — NOT Canon. Behavior semantics are WIP Issue #65 baseline.
  // (event-applicability Canon truth 12; ui-model Canon truth 13)
  // ---------------------------------------------------------------------------
  {
    id: "S-006",
    title: "static_camera_direction_unknown_suppressed — evt-005 (null direction) in window at ~62%",
    routeProgressFraction: 0.62,
    speedKmh: 60,

    eventChecks: [
      // evt-005 (static_camera, null direction): now in the applicability
      // pipeline (Issue #65). At 62% progress (≈2906 m), evt-005 at ≈3436 m
      // is ≈530 m ahead → within static_camera window [250–1100 m].
      // Null direction → direction_unknown → suppressed. NOT driver-facing.
      // WIP — NOT Canon. (event-applicability Canon truth 12)
      {
        eventId: "synthetic-evt-005",
        expectedStatus: "direction_unknown",
        expectedReasonCode: "direction_unknown",
        expectedReasonKind: "suppressed",
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

  // ---------------------------------------------------------------------------
  // S-009: static_camera_accepted_as_primary
  //
  // WIP VALIDATION EVIDENCE for Issue #65 — NOT Product Canon.
  //
  // Vehicle at progress ≈ 48% (≈ 2250 m from route start).
  // evt-007 (static_camera, east, 90°, dirtype=1) is ≈ 748 m ahead →
  // within static_camera lookahead window [250–1100 m]; direction compatible
  // (delta ≈ 0°) → candidate → selected as primary.
  //
  // At this position all speed_limit events are either behind, too_far, or
  // direction-suppressed:
  //   evt-002 (speed_limit, 40 km/h, east): ≈ 936 m ahead → > 900 m → too_far
  //   evt-003 (speed_limit, west): ≈ 123 m ahead → < 175 m → too_close
  //   evt-001, evt-004: behind
  // So evt-007 is the only candidate and is selected as the primary advisory
  // event context (static_camera with null target_speed_kmh).
  //
  // speed_reference = "unknown" because static_camera has no target_speed_kmh.
  // This is correct per-design: advisory target speed does not apply to
  // static_camera events in this model. (speed-reference Canon truths 4, 5)
  //
  // Accepted / driver-facing eligible means the event may appear in the
  // debug/QA panel as a candidate; it is emulator/QA visibility only —
  // NOT a final driver-facing product UI claim. NOT anti-radar. NOT an
  // enforcement warning. NOT a legal authority claim.
  //
  // WIP — NOT Canon. static_camera eligibility is Issue #65 WIP baseline.
  // Lookahead thresholds are WIP emulator defaults (tuning-and-validation
  // Canon truths 1, 2). No numeric value promoted to Canon.
  // ---------------------------------------------------------------------------
  {
    id: "S-009",
    title: "static_camera_accepted_as_primary — evt-007 (east, compatible) selected at ~48% progress",
    routeProgressFraction: 0.48,
    speedKmh: 60,

    expectedPrimaryEventId: "synthetic-evt-007",
    expectedSpeedReferenceState: "unknown",
    expectedTargetSpeedKmh: null,

    eventChecks: [
      // evt-007 (static_camera, east): compatible direction, in window → selected.
      {
        eventId: "synthetic-evt-007",
        expectedStatus: "selected",
        expectedReasonCode: "selected_primary",
        expectedReasonKind: "accepted",
      },
      // evt-002 (speed_limit, east, 40 km/h): too_far at this position.
      {
        eventId: "synthetic-evt-002",
        expectedStatus: "too_far",
        expectedReasonCode: "outside_max_lookahead",
        expectedReasonKind: "suppressed",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // S-010: static_camera_behind
  //
  // WIP VALIDATION EVIDENCE for Issue #65 — NOT Product Canon.
  //
  // Vehicle at progress ≈ 75% (≈ 3515 m from route start).
  // evt-007 (static_camera, east) at ≈ 2998 m → ≈ 517 m behind vehicle →
  // behind (negative along-route distance) → suppressed with behind_vehicle reason.
  // No primary event. Speed reference = unknown.
  //
  // WIP — NOT Canon. "behind" status is per-session derived data.
  // (event-applicability Canon truth 13; Issue #65 WIP baseline)
  // ---------------------------------------------------------------------------
  {
    id: "S-010",
    title: "static_camera_behind — evt-007 (east) is behind vehicle at ~75% progress",
    routeProgressFraction: 0.75,
    speedKmh: 60,

    expectedPrimaryEventId: null,
    expectedSpeedReferenceState: "unknown",

    eventChecks: [
      // evt-007 (static_camera, east): behind vehicle at this progress.
      {
        eventId: "synthetic-evt-007",
        expectedStatus: "behind",
        expectedReasonCode: "behind_vehicle",
        expectedReasonKind: "suppressed",
      },
      // evt-002 (speed_limit, east): also behind at this progress.
      {
        eventId: "synthetic-evt-002",
        expectedStatus: "behind",
        expectedReasonCode: "behind_vehicle",
        expectedReasonKind: "suppressed",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // S-011: static_camera_direction_conflict_suppressed
  //
  // WIP VALIDATION EVIDENCE for Issue #65 — NOT Product Canon.
  //
  // Vehicle at progress ≈ 25% (≈ 1172 m from route start).
  // evt-008 (static_camera, west, 270°, dirtype=1) at ≈ 1999 m → ≈ 827 m ahead →
  // within static_camera lookahead window [250–1100 m]; direction incompatible
  // (delta ≈ 180° > reject threshold 60°) → direction_conflict → suppressed.
  // Not driver-facing. Visible in debug / QA only. No primary event.
  //
  // Conservative: when direction is incompatible, prefer suppression over
  // driver-facing display.
  // (event-applicability Canon truth 12; ui-model Canon truth 13; Issue #65 WIP)
  //
  // WIP — NOT Canon. direction_conflict status and thresholds are WIP defaults.
  // ---------------------------------------------------------------------------
  {
    id: "S-011",
    title: "static_camera_direction_conflict_suppressed — evt-008 (west, delta≈180°) in window at ~25%",
    routeProgressFraction: 0.25,
    speedKmh: 60,

    expectedPrimaryEventId: null,
    expectedSpeedReferenceState: "unknown",

    eventChecks: [
      // evt-008 (static_camera, west, 270°): direction_conflict suppressed.
      {
        eventId: "synthetic-evt-008",
        expectedStatus: "direction_conflict",
        expectedReasonCode: "direction_conflict",
        expectedReasonKind: "suppressed",
      },
      // evt-007 (static_camera, east): too_far at this progress (>1100 m).
      {
        eventId: "synthetic-evt-007",
        expectedStatus: "too_far",
        expectedReasonCode: "outside_max_lookahead",
        expectedReasonKind: "suppressed",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // S-012: static_camera_off_route_cross_track_rejected
  //
  // WIP VALIDATION EVIDENCE for Issue #67 — NOT Product Canon.
  // (Updated from Issue #65 direction_unknown baseline to Issue #67 cross-track
  //  suppression baseline. New precedence: cross-track fires before direction_unknown.)
  //
  // Vehicle at progress ≈ 38% (≈ 1781 m from route start).
  // evt-009 (static_camera, off-route ~111 m north, null direction) at ≈ 2687 m
  // → ≈ 906 m ahead → within static_camera lookahead window [250–1100 m];
  // cross-track ≈ 111 m > route_projection_reject_m (50 m WIP) →
  // off_route_cross_track (suppressed before direction_unknown check).
  //
  // Verifies that off-route static_camera candidates:
  //   - are processed through the applicability pipeline (not blanket out_of_scope
  //     solely by event type — evidenced by reasonKind = suppressed, not
  //     not_processed);
  //   - have non-zero cross-track distance visible in the debug table;
  //   - are suppressed with the new off-route reason (not direction_unknown)
  //     per the Issue #67 cross-track-before-direction precedence.
  //
  // Threshold: config.direction_applicability.route_projection_reject_m = 50 m WIP.
  // WIP emulator default — NOT Canon. (tuning-and-validation Canon truths 1, 2)
  // (event-applicability Canon truth 12; Issue #67 baseline)
  // ---------------------------------------------------------------------------
  {
    id: "S-012",
    title: "static_camera_off_route_cross_track_rejected — evt-009 (off-route, ~111 m) in window at ~38%",
    routeProgressFraction: 0.38,
    speedKmh: 60,

    expectedPrimaryEventId: null,
    expectedSpeedReferenceState: "unknown",

    eventChecks: [
      // evt-009 (static_camera, off-route, null direction): processed through
      // the applicability pipeline (not out_of_scope by type); cross-track ≈ 111 m
      // > 50 m WIP threshold → off_route_cross_track (suppressed, debug-visible).
      // New Issue #67 precedence: cross-track fires before direction_unknown.
      {
        eventId: "synthetic-evt-009",
        expectedStatus: "off_route_cross_track",
        expectedReasonCode: "route_projection_cross_track_rejected",
        expectedReasonKind: "suppressed",
        expectNonZeroCrossTrack: true,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // S-013: off_route_speed_limit_cross_track_rejected (Issue #67)
  //
  // WIP VALIDATION EVIDENCE for Issue #67 — NOT Product Canon.
  //
  // Dedicated scenario confirming that the off-route speed_limit fixture
  // (evt-006) is suppressed by the new cross-track/off-route baseline.
  //
  // Vehicle at progress ≈ 40% (≈ 1882 m from route start).
  // evt-006 (speed_limit, lon=37.640, lat=55.751 — off-route ~111 m north,
  // null direction) at ≈ 2503 m → ≈ 621 m ahead → within speed_limit lookahead
  // window [175–900 m]. Cross-track ≈ 111 m > route_projection_reject_m (50 m
  // WIP default) → off_route_cross_track → suppressed from driver-facing.
  //
  // Confirms the Issue #67 cross-track-before-direction precedence:
  //   - evt-006 is suppressed for cross-track, not direction_unknown.
  //   - No primary event. Speed reference = unknown.
  //   - On-route speed_limit events are not in window at this position:
  //       evt-001 (lon=37.624) ≈ 1499 m → behind
  //       evt-002 (lon=37.651) ≈ 3186 m → 1304 m ahead → too_far
  //       evt-003 (lon=37.638) ≈ 2373 m → 491 m ahead → direction_conflict
  //
  // Threshold: config.direction_applicability.route_projection_reject_m = 50 m WIP.
  // NOT Canon. (tuning-and-validation Canon truths 1, 2; Issue #67 baseline)
  // ---------------------------------------------------------------------------
  {
    id: "S-013",
    title: "off_route_speed_limit_cross_track_rejected — evt-006 (off-route, ~111 m) suppressed at ~40%",
    routeProgressFraction: 0.40,
    speedKmh: 60,

    expectedPrimaryEventId: null,
    expectedSpeedReferenceState: "unknown",

    eventChecks: [
      // evt-006: off-route speed_limit, cross-track ≈ 111 m > 50 m WIP threshold.
      // Suppressed with off_route_cross_track before direction_unknown check.
      // New Issue #67 cross-track/off-route baseline.
      {
        eventId: "synthetic-evt-006",
        expectedStatus: "off_route_cross_track",
        expectedReasonCode: "route_projection_cross_track_rejected",
        expectedReasonKind: "suppressed",
        expectNonZeroCrossTrack: true,
      },
      // evt-002 (on-route, eastbound, 40 km/h): too_far at this position.
      // Confirms on-route speed_limit candidate behavior is not affected.
      {
        eventId: "synthetic-evt-002",
        expectedStatus: "too_far",
        expectedReasonCode: "outside_max_lookahead",
        expectedReasonKind: "suppressed",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // S-014: off_route_static_camera_cross_track_rejected (Issue #67)
  //
  // WIP VALIDATION EVIDENCE for Issue #67 — NOT Product Canon.
  //
  // Dedicated scenario confirming that the off-route static_camera fixture
  // (evt-009) is suppressed by the new cross-track/off-route baseline.
  //
  // Vehicle at progress ≈ 38% (≈ 1781 m from route start).
  // evt-009 (static_camera, lon=37.643, lat=55.751 — off-route ~111 m north,
  // null direction) at ≈ 2687 m → ≈ 906 m ahead → within static_camera
  // lookahead window [250–1100 m]. Cross-track ≈ 111 m > route_projection_reject_m
  // (50 m WIP default) → off_route_cross_track → suppressed from driver-facing.
  //
  // Confirms that off-route static_camera candidates:
  //   - enter the applicability pipeline (not blanket out_of_scope by type);
  //   - are suppressed by cross-track, not direction_unknown;
  //   - are debug-visible with non-zero cross-track displayed.
  //
  // Counterpart to S-013 for static_camera type.
  //
  // Threshold: config.direction_applicability.route_projection_reject_m = 50 m WIP.
  // NOT Canon. (tuning-and-validation Canon truths 1, 2; Issue #67 baseline)
  // ---------------------------------------------------------------------------
  {
    id: "S-014",
    title: "off_route_static_camera_cross_track_rejected — evt-009 (off-route, ~111 m) suppressed at ~38%",
    routeProgressFraction: 0.38,
    speedKmh: 60,

    expectedPrimaryEventId: null,
    expectedSpeedReferenceState: "unknown",

    eventChecks: [
      // evt-009: off-route static_camera, cross-track ≈ 111 m > 50 m WIP threshold.
      // Suppressed with off_route_cross_track before direction_unknown check.
      // New Issue #67 cross-track/off-route baseline.
      {
        eventId: "synthetic-evt-009",
        expectedStatus: "off_route_cross_track",
        expectedReasonCode: "route_projection_cross_track_rejected",
        expectedReasonKind: "suppressed",
        expectNonZeroCrossTrack: true,
      },
      // evt-007 (on-route, eastbound static_camera): too_far at this position
      // (≈1217 m ahead > 1100 m static_camera max_lookahead).
      // Confirms on-route static_camera candidate behavior is not affected.
      {
        eventId: "synthetic-evt-007",
        expectedStatus: "too_far",
        expectedReasonCode: "outside_max_lookahead",
        expectedReasonKind: "suppressed",
      },
    ],
  },
];
