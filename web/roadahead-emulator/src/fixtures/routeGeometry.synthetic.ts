/**
 * Synthetic route geometry fixture — Phase 0 emulator (Slice 2 / Issue #44)
 *
 * SYNTHETIC FIXTURE — NOT REAL DATA
 * This route is a hand-authored synthetic segment. It is NOT derived from any
 * route provider (Yandex, OSRM, GraphHopper, GPX, KML, or GeoJSON export).
 * It does NOT represent a real road or a real navigated path.
 * It is a simple straight test segment for Phase 0 emulator validation only.
 *
 * Provenance: provider = "synthetic_fixture"
 *
 * Canon authority:
 *   docs/product/areas/route-geometry/route-geometry.md (truths 5, 6, 7, 8, 9, 10)
 *   docs/product/areas/product-boundary/product-boundary.md (truth 8)
 *
 * Fixture rules (route-geometry Canon truth 10; issue #44 scope):
 *   - Synthetic only; not provider-derived.
 *   - GeoJSON LineString feature wrapper with provenance properties.
 *   - Coordinates: WGS84, longitude-first [lon, lat] (route-geometry truth 9).
 *   - No provider speed, ETA, traffic, posted-limit, lane, or turn data.
 *   - Normalized via normalizeGeoJsonRoute() before use in emulator logic.
 *
 * The two synthetic events in preparedEvents.synthetic.ts are placed along
 * this route at approximately lon 37.624 and lon 37.651.
 */

import {
  type GeoJsonLineStringFeature,
  type RouteGeometry,
  normalizeGeoJsonRoute,
} from "../contracts/routeGeometry.js";

/**
 * Raw GeoJSON LineString feature for the synthetic test route.
 *
 * Six [lon, lat] waypoints forming a roughly east-bound straight segment
 * in the 55.75°N area. Coordinates are synthetic — no real road is implied.
 *
 * SYNTHETIC FIXTURE — provider: "synthetic_fixture"
 */
export const SYNTHETIC_ROUTE_GEOJSON: GeoJsonLineStringFeature = {
  type: "Feature",
  geometry: {
    type: "LineString",
    // [longitude, latitude] — longitude-first throughout.
    // Synthetic straight east-bound test segment.
    coordinates: [
      [37.600, 55.750],
      [37.615, 55.750],
      [37.630, 55.750],
      [37.645, 55.750],
      [37.660, 55.750],
      [37.675, 55.750],
    ],
  },
  properties: {
    provider: "synthetic_fixture",
    generated_at: "2026-05-20T00:00:00Z",
    notes:
      "Synthetic straight east-bound test segment for Phase 0 emulator validation. " +
      "Not a real road. Not provider-derived. " +
      "Two speed_limit events from preparedEvents.synthetic.ts are placed along this route.",
  },
};

/**
 * Normalized RouteGeometry for use by emulator logic in later slices.
 *
 * This is the normalized form consumed by event-selection and vehicle-
 * simulation code. It is decoupled from the GeoJSON fixture format so that
 * future provider adapters (Yandex / OSRM / GPX / etc.) can produce the
 * same RouteGeometry interface without rewriting downstream logic.
 * (route-geometry Canon truths 7, 8)
 *
 * SYNTHETIC FIXTURE — not provider-derived.
 */
export const SYNTHETIC_ROUTE: RouteGeometry =
  normalizeGeoJsonRoute(SYNTHETIC_ROUTE_GEOJSON);
