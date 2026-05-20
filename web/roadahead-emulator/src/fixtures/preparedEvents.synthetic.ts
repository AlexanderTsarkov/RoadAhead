/**
 * Synthetic prepared event fixture — Phase 0 emulator (Slice 2 / Issue #44;
 * extended in Slice 4.2 / Issue #51 for direction compatibility baseline;
 * extended in Slice 4.5 / Issue #57 for applicability fixture coverage)
 *
 * SYNTHETIC FIXTURE — NOT REAL DATA
 * These events are hand-authored synthetic records. They are NOT derived from,
 * and do NOT contain, any Datakam or OpenSpeedcam source rows. They are NOT
 * verified road events. They are NOT legally authoritative speed limits.
 * They are candidate observations for emulator validation only.
 *
 * Provenance: source = "synthetic_fixture", source_dataset_version = "synthetic-fixture-v0"
 *
 * Canon authority:
 *   docs/product/areas/event-data/event-data.md (truths 1, 3, 5, 6, 8, 11, 13)
 *   docs/product/areas/product-boundary/product-boundary.md (truths 2, 3, 4, 5, 6)
 *
 * Fixture rules (event-data Canon truth 13; issue #44 scope):
 *   - Synthetic only; no verbatim Datakam / OpenSpeedcam rows.
 *   - No route-specific derived fields (projection, tangent, direction delta,
 *     applicability decision) — those are computed per route at runtime
 *     (event-data Canon truth 11).
 *   - source and source_dataset_version explicitly mark synthetic provenance.
 *
 * Slice 4.2 additions (Issue #51):
 *   - synthetic-evt-003: added to exercise the direction incompatible case.
 *     source_direction_deg=270 (westbound), source_dirtype=1 (directional).
 *     The synthetic route is eastbound (~90°); delta ≈ 180° → incompatible.
 *     This is a purely synthetic record for direction compatibility testing.
 *
 * Slice 4.5 additions (Issue #57):
 *   Three new fixture records added to exercise debug states not covered
 *   by the original three events. No new applicability algorithms.
 *   No route-specific derived fields added to any fixture.
 *
 *   synthetic-evt-004 — direction_unsupported debug state:
 *     speed_limit with source_dirtype=99 (unsupported value).
 *     Exercises the "unsupported dirtype" branch in directionCompatibility.ts.
 *     Suppressed from driver-facing selection (conservative: unknown dirtype
 *     → direction_unsupported). Purely synthetic — dirtype=99 is not a real
 *     Datakam value and has no Canon semantic. WIP / not Canon.
 *
 *   synthetic-evt-005 — out_of_scope / not_processed debug state:
 *     static_camera event type (allowed by PreparedEvent contract; event-data
 *     Canon truth 6). Exercises the out_of_scope branch in minimalEventSelection.ts.
 *     Not driver-facing in the current slice. No camera behavior is implemented.
 *     target_speed_kmh=null (cameras do not carry a target speed in this model).
 *     WIP / not Canon.
 *
 *   synthetic-evt-006 — non-zero cross-track debug visibility:
 *     speed_limit placed slightly off the synthetic route (lat=55.751 vs
 *     route lat=55.750, ~111 m north). Makes cross-track distance visible in
 *     the debug panel for future cross-track / ambiguity work.
 *     No off-route suppression behavior is added in this slice — debug only.
 *     source_direction_deg=null, source_dirtype=null → direction_unknown.
 *     WIP / not Canon.
 *
 * Direction metadata on source_direction_deg / source_dirtype fields:
 *   - These fields are candidate metadata, NOT verified truth.
 *   - dirtype semantics are WIP and not Canon.
 *   - Direction compatibility is computed per-session at runtime; it is NOT
 *     stored back into these fixture records.
 *   (event-applicability Canon truth 8; event-data Canon truth 11)
 *
 * Coordinate system: WGS84 [lon, lat], longitude-first.
 * (route-geometry Canon truth 9)
 *
 * These coordinates are part of a hand-authored synthetic test segment.
 * They do not represent a real road, real speed limit, or real camera location.
 */

import type { PreparedEvent } from "../contracts/preparedEvent.js";

/**
 * Synthetic prepared candidate events for the Phase 0 emulator.
 *
 * Six synthetic events placed on or near the test route defined in
 * routeGeometry.synthetic.ts.
 *
 * Debug states exercised by this fixture set:
 *   synthetic-evt-001 — no direction metadata (source_direction_deg=null,
 *                       source_dirtype=null) → direction status: unknown
 *                       (suppressed from driver-facing)
 *   synthetic-evt-002 — eastbound direction (source_direction_deg=90,
 *                       source_dirtype=1) → compatible with eastbound route (~90°)
 *                       (driver-facing eligible when in window)
 *   synthetic-evt-003 — westbound direction (source_direction_deg=270,
 *                       source_dirtype=1) → incompatible with eastbound route
 *                       (delta ≈ 180° > reject threshold) → direction_conflict
 *                       (Slice 4.2 / Issue #51)
 *   synthetic-evt-004 — unsupported dirtype (source_dirtype=99) →
 *                       direction_unsupported (suppressed from driver-facing)
 *                       (Slice 4.5 / Issue #57 — SYNTHETIC, WIP, not Canon)
 *   synthetic-evt-005 — static_camera type → out_of_scope / not_processed
 *                       (not driver-facing; no camera behavior implemented)
 *                       (Slice 4.5 / Issue #57 — SYNTHETIC, WIP, not Canon)
 *   synthetic-evt-006 — off-route placement (lat=55.751 vs route lat=55.750)
 *                       → non-zero cross-track distance visible in debug;
 *                       direction_unknown (null metadata); debug only
 *                       (Slice 4.5 / Issue #57 — SYNTHETIC, WIP, not Canon)
 *
 * All instances are candidate observations — not verified RoadAhead truth.
 * New Slice 4.5 events are synthetic fixtures for debug/QA coverage only.
 * They are not verified road events and are not Product Canon.
 */
export const SYNTHETIC_PREPARED_EVENTS: PreparedEvent[] = [
  {
    event_id: "synthetic-evt-001",
    source: "synthetic_fixture",
    source_event_id: "synthetic-001",
    source_dataset_version: "synthetic-fixture-v0",
    raw_type: null,
    normalized_type: "speed_limit",
    // Longitude-first. Placed roughly 300 m along the synthetic route.
    // Synthetic coordinates only — not a real road location.
    lon: 37.624,
    lat: 55.750,
    // Advisory target speed for normal guidance (not enforcement threshold).
    target_speed_kmh: 60,
    // No source direction metadata — direction status will be unknown.
    source_direction_deg: null,
    source_dirtype: null,
    imported_at: "2026-05-20T00:00:00Z",
  },
  {
    event_id: "synthetic-evt-002",
    source: "synthetic_fixture",
    source_event_id: "synthetic-002",
    source_dataset_version: "synthetic-fixture-v0",
    raw_type: null,
    normalized_type: "speed_limit",
    // Longitude-first. Placed roughly 600 m along the synthetic route.
    // Synthetic coordinates only — not a real road location.
    lon: 37.651,
    lat: 55.750,
    target_speed_kmh: 40,
    // Eastbound direction (90°). Route is also ~90° eastbound.
    // Delta ≈ 0° → direction status: compatible.
    // Synthetic value — not from any real source.
    source_direction_deg: 90,
    source_dirtype: 1,
    imported_at: "2026-05-20T00:00:00Z",
  },
  {
    event_id: "synthetic-evt-003",
    source: "synthetic_fixture",
    source_event_id: "synthetic-003",
    source_dataset_version: "synthetic-fixture-v0",
    raw_type: null,
    normalized_type: "speed_limit",
    // Longitude-first. Placed between evt-001 and evt-002 along the route.
    // Synthetic coordinates only — not a real road location.
    lon: 37.638,
    lat: 55.750,
    target_speed_kmh: 80,
    // Westbound direction (270°). Route is ~90° eastbound.
    // Delta ≈ 180° → direction status: incompatible (direction conflict).
    // Added in Slice 4.2 / Issue #51 to exercise the incompatible case.
    // Synthetic value — not from any real source.
    source_direction_deg: 270,
    source_dirtype: 1,
    imported_at: "2026-05-20T00:00:00Z",
  },

  // ---------------------------------------------------------------------------
  // Slice 4.5 / Issue #57 additions — SYNTHETIC FIXTURE COVERAGE ONLY
  //
  // These three records exercise debug states not covered by evt-001–003.
  // They are hand-authored synthetic records. NOT real Datakam / OpenSpeedcam
  // rows. NOT verified road events. NOT Product Canon.
  // No new applicability algorithms are introduced here.
  // No route-specific derived fields are stored in these records.
  // ---------------------------------------------------------------------------

  {
    // SYNTHETIC — Slice 4.5 / Issue #57
    // Exercises: direction_unsupported debug state.
    //
    // source_dirtype=99 is an unsupported value not handled by the Slice 4.2
    // direction compatibility baseline (only dirtype 0, 1, and null are handled).
    // The existing logic in directionCompatibility.ts falls through to the
    // "unsupported" branch → DirectionCompatibilityStatus = "unsupported"
    // → EventStatus = "direction_unsupported" → suppressed from driver-facing.
    //
    // source_direction_deg=90 is provided but irrelevant — the unsupported
    // dirtype branch executes before any direction delta is computed.
    //
    // NOTE: dirtype=99 is a synthetic sentinel value. It has no real Datakam
    // or Canon semantic. It is used here only to trigger the unsupported branch
    // for debug/QA visibility. WIP — NOT Canon.
    event_id: "synthetic-evt-004",
    source: "synthetic_fixture",
    source_event_id: "synthetic-004",
    source_dataset_version: "synthetic-fixture-v0",
    raw_type: null,
    normalized_type: "speed_limit",
    // Longitude-first. Placed ~200 m along the synthetic route, before evt-001.
    // Synthetic coordinates only — not a real road location.
    lon: 37.619,
    lat: 55.750,
    target_speed_kmh: 50,
    // Eastbound (90°) — direction present but irrelevant; unsupported dirtype
    // branch executes first. Synthetic value — not from any real source.
    source_direction_deg: 90,
    // 99 = synthetic unsupported dirtype sentinel (WIP — NOT Canon).
    source_dirtype: 99,
    imported_at: "2026-05-20T00:00:00Z",
  },

  {
    // SYNTHETIC — Slice 4.5 / Issue #57
    // Exercises: out_of_scope / not_processed debug state.
    //
    // normalized_type="static_camera" is a non-speed_limit type within the
    // PreparedEvent contract scope (event-data Canon truth 6).
    // The existing selection logic in minimalEventSelection.ts routes all
    // non-speed_limit events to EventStatus = "out_of_scope" →
    // ApplicabilityReasonCode = "event_type_out_of_scope" → not_processed kind.
    // Not driver-facing. No camera behavior is implemented in this slice.
    //
    // target_speed_kmh=null: cameras do not carry a target speed in this model.
    // WIP — NOT Canon. No camera behavior or enforcement semantics added.
    event_id: "synthetic-evt-005",
    source: "synthetic_fixture",
    source_event_id: "synthetic-005",
    source_dataset_version: "synthetic-fixture-v0",
    raw_type: null,
    normalized_type: "static_camera",
    // Longitude-first. Placed ~700 m along the synthetic route, after evt-002.
    // Synthetic coordinates only — not a real camera location.
    lon: 37.655,
    lat: 55.750,
    // null: cameras do not carry a target speed in this model.
    target_speed_kmh: null,
    source_direction_deg: null,
    source_dirtype: null,
    imported_at: "2026-05-20T00:00:00Z",
  },

  {
    // SYNTHETIC — Slice 4.5 / Issue #57
    // Exercises: non-zero cross-track distance visible in debug panel.
    //
    // Placed ~111 m north of the synthetic route (lat=55.751 vs route lat=55.750;
    // 0.001° × 111,320 m/° ≈ 111 m cross-track). The event projects to the
    // nearest on-route point, producing a clearly non-zero cross-track value
    // in the debug table. This makes future cross-track / off-route ambiguity
    // work inspectable through the existing debug panel.
    //
    // No off-route suppression behavior is added in this slice.
    // No projection_missing is forced — the event is projected normally; only
    // the cross-track value will be elevated compared to on-route events.
    //
    // source_direction_deg=null, source_dirtype=null → direction_unknown
    // (consistent with evt-001 direction semantics).
    //
    // WIP — NOT Canon. Debug visibility only. The cross-track threshold for
    // off-route suppression is deferred to a later child issue under #48.
    event_id: "synthetic-evt-006",
    source: "synthetic_fixture",
    source_event_id: "synthetic-006",
    source_dataset_version: "synthetic-fixture-v0",
    raw_type: null,
    normalized_type: "speed_limit",
    // Longitude-first.
    // lon=37.640 places this between evt-001 (37.624) and evt-002 (37.651),
    // roughly 500 m along the route.
    // lat=55.751 is ~111 m north of the route (lat=55.750) — off-route.
    // Synthetic coordinates only — not a real road location.
    lon: 37.640,
    lat: 55.751,
    target_speed_kmh: 60,
    // No direction metadata — direction_unknown (same as evt-001).
    source_direction_deg: null,
    source_dirtype: null,
    imported_at: "2026-05-20T00:00:00Z",
  },
];
