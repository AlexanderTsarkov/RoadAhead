/**
 * PreparedEvent contract — Phase 0 emulator (Slice 2 / Issue #44)
 *
 * Defines the shape of a prepared normalized candidate event consumed by the
 * Phase 0 route emulator. This type is used to load and validate synthetic
 * fixture data; it is NOT a production schema and NOT Product Canon.
 *
 * Canon authority:
 *   docs/product/areas/event-data/event-data.md
 *   docs/product/areas/product-boundary/product-boundary.md
 *
 * Key Canon constraints encoded here:
 *   - Events are candidate observations, not verified RoadAhead truth
 *     (event-data truth 1, 5).
 *   - POC V1 scope is speed_limit, static_camera, road_bump
 *     (event-data truth 6).
 *   - Source provenance is preserved through normalization (truth 8).
 *   - Route-specific derived fields (projection, tangent, direction delta,
 *     applicability decision) are NOT part of this record; they are computed
 *     per route at runtime (truth 11).
 *   - Committed fixtures must be synthetic; no raw Datakam/OpenSpeedcam rows
 *     (truth 13).
 *
 * NOT Canon: exact field names, types, nullability, and schema shape are
 * WIP and subject to revision by future implementation slices or ADRs.
 */

/** POC V1 supported normalized event types (event-data Canon truth 6). */
export type NormalizedEventType = "speed_limit" | "static_camera" | "road_bump";

/**
 * A prepared normalized candidate event.
 *
 * All instances are candidate observations, not verified RoadAhead truth.
 * No instance of this type makes a legal speed-limit or enforcement claim.
 *
 * Route-specific computed values (projection distance, along-route position,
 * direction delta, applicability decision) are explicitly absent. They belong
 * on per-session derived structures, not here.
 */
export interface PreparedEvent {
  /**
   * Deterministic stable identifier for this event within the prepared store.
   * Must be stable across re-imports of the same source data.
   * (event-data Canon truth 9)
   */
  event_id: string;

  /**
   * Source dataset identifier.
   * For synthetic fixtures: "synthetic_fixture".
   * For future real imports: "datakam" | "openspeedcam" | etc.
   * (event-data Canon truth 8)
   */
  source: string;

  /** Source-side row identifier or index. Null allowed for synthetic fixtures. */
  source_event_id: string | null;

  /**
   * Dataset / revision label for provenance tracing.
   * For synthetic fixtures: "synthetic-fixture-v0".
   * (event-data Canon truth 8)
   */
  source_dataset_version: string;

  /**
   * Raw source type code as it appeared in the original data.
   * Preserved for provenance. Null for synthetic fixtures.
   * (event-data Canon truth 8)
   */
  raw_type: string | null;

  /**
   * Normalized event type. POC V1 scope: speed_limit, static_camera, road_bump.
   * (event-data Canon truth 6)
   */
  normalized_type: NormalizedEventType;

  /**
   * WGS84 longitude, decimal degrees. Longitude-first per Canon convention.
   * (route-geometry Canon truth 9)
   */
  lon: number;

  /**
   * WGS84 latitude, decimal degrees.
   */
  lat: number;

  /**
   * Advisory target speed in km/h. Required for speed_limit; nullable for
   * other types that do not carry a target speed.
   * This is the reference for normal guidance — NOT enforcement threshold.
   * (enforcement-profile recommendation §2; threshold-tuning recommendation §3.2)
   */
  target_speed_kmh: number | null;

  /**
   * Raw direction value from the source dataset (e.g., Datakam DIRECTION field),
   * in degrees. A candidate signal for direction applicability — semantics are
   * WIP and not Canon.
   * (event-applicability Canon truth 8; direction-applicability research §3.E)
   */
  source_direction_deg: number | null;

  /**
   * Raw dirtype value from the source dataset (e.g., Datakam DIRTYPE field).
   * 0 / 1 / 2 semantics remain WIP and not Canon.
   * (event-applicability Canon Still WIP; direction-applicability research §3.E)
   */
  source_dirtype: number | null;

  /**
   * ISO 8601 timestamp of when this record was imported / created.
   * Provenance only — not used in emulator logic.
   */
  imported_at: string;
}
