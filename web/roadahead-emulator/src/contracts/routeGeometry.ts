/**
 * RouteGeometry contract — Phase 0 emulator (Slice 2 / Issue #44)
 *
 * Defines the normalized internal representation of a route geometry consumed
 * by the Phase 0 emulator. This type is used to load and validate synthetic
 * fixture data; it is NOT a production schema and NOT Product Canon.
 *
 * Canon authority:
 *   docs/product/areas/route-geometry/route-geometry.md
 *   docs/product/areas/product-boundary/product-boundary.md
 *
 * Key Canon constraints encoded here:
 *   - Route providers may supply geometry only; provider speed, ETA, traffic,
 *     segment-speed, and posted-limit data are excluded from RoadAhead truth
 *     (product-boundary Canon truth 8; route-geometry Canon truths 5, 6).
 *   - Coordinates are WGS84 longitude-first [lon, lat]
 *     (route-geometry Canon truth 9).
 *   - Provider-derived geometry is not a long-lived committed fixture; committed
 *     fixtures must be synthetic (route-geometry Canon truth 10).
 *   - Event selection consumes the normalized geometry, not provider-native
 *     objects, so future provider adapters do not require rewriting logic
 *     (route-geometry Canon truths 7, 8).
 *
 * NOT Canon: exact field names, types, and schema shape are WIP and subject
 * to revision by future implementation slices or ADRs.
 */

/**
 * A single WGS84 coordinate pair, longitude-first.
 * [longitude, latitude] in decimal degrees.
 * (route-geometry Canon truth 9)
 */
export type LonLatCoord = [number, number];

/**
 * Provenance metadata carried alongside a route geometry fixture.
 * Traces the fixture back to its source without embedding provider data.
 */
export interface RouteGeometryProvenance {
  /**
   * Source identifier.
   * For synthetic fixtures: "synthetic_fixture".
   * For future provider-adapted imports: "yandex_router" | "osrm" | "graphhopper" | etc.
   */
  provider: string;

  /** ISO 8601 timestamp of when this fixture was generated or recorded. */
  generated_at: string;

  /** Optional free-text notes, e.g., "Synthetic straight-road test segment". */
  notes?: string;
}

/**
 * Normalized route geometry as consumed by the emulator's event-selection
 * and vehicle-simulation logic.
 *
 * This is the internal contract that route-provider adapters must produce.
 * No provider-specific fields (speed limits, ETAs, traffic, turn instructions,
 * lane data) appear here — only geometry and provenance.
 *
 * The exact internal shape remains WIP per route-geometry Canon Still WIP.
 */
export interface RouteGeometry {
  /**
   * Ordered sequence of WGS84 [lon, lat] coordinate pairs forming the route
   * polyline. Longitude-first throughout.
   * Minimum two points required to form a valid segment.
   */
  coordinates: LonLatCoord[];

  /**
   * Provenance metadata identifying where this geometry came from.
   * Required so future adapters can be distinguished from synthetic fixtures.
   */
  provenance: RouteGeometryProvenance;
}

/**
 * GeoJSON Feature wrapper around a LineString, used as the on-disk fixture
 * format before normalization to RouteGeometry.
 *
 * An adapter (normalizeGeoJsonRoute) converts this to RouteGeometry so that
 * event-selection logic is decoupled from the fixture format.
 */
export interface GeoJsonLineStringFeature {
  type: "Feature";
  geometry: {
    type: "LineString";
    /** Coordinate pairs are [lon, lat] (longitude-first). */
    coordinates: LonLatCoord[];
  };
  properties: {
    provider: string;
    generated_at: string;
    notes?: string;
    [key: string]: unknown;
  };
}

/**
 * Normalize a GeoJSON LineString Feature into the emulator's internal
 * RouteGeometry representation.
 *
 * This is the only place the GeoJSON fixture format is interpreted.
 * All downstream emulator logic operates on RouteGeometry, not on the
 * GeoJSON-specific shape.
 *
 * Performs lightweight structural validation and throws a descriptive Error
 * on any contract violation. This is fixture/contract validation only — not
 * route logic.
 */
export function normalizeGeoJsonRoute(
  feature: GeoJsonLineStringFeature
): RouteGeometry {
  if (feature.type !== "Feature") {
    throw new Error(
      `normalizeGeoJsonRoute: expected GeoJSON type "Feature", got "${String(feature.type)}"`
    );
  }
  if (feature.geometry.type !== "LineString") {
    throw new Error(
      `normalizeGeoJsonRoute: expected geometry type "LineString", got "${String(feature.geometry.type)}"`
    );
  }

  const coords = feature.geometry.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) {
    throw new Error(
      `normalizeGeoJsonRoute: coordinates must be an array with at least 2 entries, got ${Array.isArray(coords) ? coords.length : typeof coords}`
    );
  }
  for (let i = 0; i < coords.length; i++) {
    const coord = coords[i];
    if (!Array.isArray(coord) || coord.length < 2) {
      throw new Error(
        `normalizeGeoJsonRoute: coordinate at index ${i} must be a [lon, lat] tuple`
      );
    }
    const [lon, lat] = coord;
    if (typeof lon !== "number" || !isFinite(lon)) {
      throw new Error(
        `normalizeGeoJsonRoute: coordinate[${i}][0] (lon) must be a finite number, got ${String(lon)}`
      );
    }
    if (typeof lat !== "number" || !isFinite(lat)) {
      throw new Error(
        `normalizeGeoJsonRoute: coordinate[${i}][1] (lat) must be a finite number, got ${String(lat)}`
      );
    }
  }

  const provider = feature.properties["provider"];
  if (typeof provider !== "string" || provider.trim() === "") {
    throw new Error(
      `normalizeGeoJsonRoute: properties.provider must be a non-empty string`
    );
  }
  const generatedAt = feature.properties["generated_at"];
  if (typeof generatedAt !== "string" || generatedAt.trim() === "") {
    throw new Error(
      `normalizeGeoJsonRoute: properties.generated_at must be a non-empty string`
    );
  }

  return {
    coordinates: coords,
    provenance: {
      provider,
      generated_at: generatedAt,
      notes: feature.properties["notes"] as string | undefined,
    },
  };
}
