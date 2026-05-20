/**
 * Synthetic prepared event fixture — Phase 0 emulator (Slice 2 / Issue #44;
 * extended in Slice 4.2 / Issue #51 for direction compatibility baseline)
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
 *   - Initial scope: speed_limit events only (event-data Canon truth 6).
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
 * Three speed_limit events placed along the synthetic test route defined in
 * routeGeometry.synthetic.ts. Coordinates are chosen to lie on the synthetic
 * route so that direction-compatibility slices can exercise compatible,
 * incompatible, and unknown/null direction cases without ambiguity.
 *
 * Direction cases exercised by this fixture set (Slice 4.2 / Issue #51):
 *   synthetic-evt-001 — no direction metadata (source_direction_deg=null,
 *                       source_dirtype=null) → direction status: unknown
 *   synthetic-evt-002 — eastbound direction (source_direction_deg=90,
 *                       source_dirtype=1) → compatible with eastbound route (~90°)
 *   synthetic-evt-003 — westbound direction (source_direction_deg=270,
 *                       source_dirtype=1) → incompatible with eastbound route
 *                       (delta ≈ 180° > reject threshold)
 *
 * All instances are candidate observations — not verified RoadAhead truth.
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
];
