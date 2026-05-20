/**
 * Synthetic prepared event fixture — Phase 0 emulator (Slice 2 / Issue #44)
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
 * Two speed_limit events placed along the synthetic test route defined in
 * routeGeometry.synthetic.ts. Coordinates are chosen to lie on the synthetic
 * route so that later slices can exercise the applicability gate without
 * ambiguity in a straight-road scenario.
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
    // No source direction for this event — fully bidirectional fixture.
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
    // Explicit direction for this event to exercise direction-applicability
    // testing in later slices. Value is synthetic, not from any real source.
    source_direction_deg: 90,
    source_dirtype: 1,
    imported_at: "2026-05-20T00:00:00Z",
  },
];
