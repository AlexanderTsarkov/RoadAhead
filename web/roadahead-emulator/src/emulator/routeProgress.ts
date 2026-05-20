/**
 * Route progress utilities — Phase 0 emulator (Slice 3 / Issue #46)
 *
 * SIMPLIFIED SYNTHETIC-ROUTE LOGIC
 * This module uses longitude interpolation only. It is valid ONLY for the
 * straight east-bound synthetic fixture from routeGeometry.synthetic.ts.
 * Full geospatial projection (cross-track distance, segment index lookup,
 * real curve handling) is NOT implemented here and is explicitly deferred
 * to Slice 4 (Event applicability foundation).
 *
 * Do not use this module for real routes, curved routes, or north/south
 * routes. The simplification is intentional and documented for the emulator
 * validation purpose only.
 *
 * Canon authority:
 *   docs/product/areas/route-geometry/route-geometry.md
 *   docs/product/areas/event-applicability/event-applicability.md (truth 13:
 *     route-specific derived fields are not persisted onto base event records)
 *
 * NOT Canon: this simplified logic is a WIP implementation for Slice 3.
 */

import type { RouteGeometry } from "../contracts/routeGeometry.js";

/**
 * Reference latitude for metre-per-degree-longitude approximations.
 * Taken from the synthetic fixture (all waypoints at lat 55.750).
 * Only valid near this latitude.
 */
export const SYNTHETIC_ROUTE_REFERENCE_LAT = 55.750;

/**
 * Approximate metres per degree of longitude at the given latitude.
 *
 * Uses the standard approximation: 1° lon ≈ 111,320 × cos(lat_rad) m.
 * Valid for small spans near the given latitude.
 */
export function lonDegToMetresPerDeg(latDeg: number): number {
  const latRad = (latDeg * Math.PI) / 180;
  return 111_320 * Math.cos(latRad);
}

/**
 * Get the longitude span of a route.
 *
 * SIMPLIFIED: assumes the route is monotonically east-bound (increasing lon).
 * Returns the min and max longitude found across all waypoints.
 */
export function getRouteLonSpan(
  route: RouteGeometry
): { minLon: number; maxLon: number } {
  const lons = route.coordinates.map(([lon]) => lon);
  return { minLon: Math.min(...lons), maxLon: Math.max(...lons) };
}

/**
 * Convert route progress [0, 1] to a longitude for the straight synthetic route.
 *
 * SIMPLIFIED SYNTHETIC-ROUTE LOGIC: linear interpolation between min and max
 * longitude. Valid only for the east-bound straight synthetic fixture.
 *
 * @param progress - Route progress in [0, 1]. Clamped to [0, 1].
 * @param route - Normalized route geometry.
 * @returns Interpolated longitude in decimal degrees.
 */
export function progressToLon(progress: number, route: RouteGeometry): number {
  const { minLon, maxLon } = getRouteLonSpan(route);
  const clamped = Math.max(0, Math.min(1, progress));
  return minLon + clamped * (maxLon - minLon);
}

/**
 * Convert a longitude to route progress [0, 1] for the straight synthetic route.
 *
 * SIMPLIFIED SYNTHETIC-ROUTE LOGIC: inverse of progressToLon.
 * Returns 0 if the route has zero longitude span.
 *
 * @param lon - Longitude in decimal degrees.
 * @param route - Normalized route geometry.
 * @returns Route progress in [0, 1], clamped.
 */
export function lonToProgress(lon: number, route: RouteGeometry): number {
  const { minLon, maxLon } = getRouteLonSpan(route);
  if (maxLon === minLon) return 0;
  return Math.max(0, Math.min(1, (lon - minLon) / (maxLon - minLon)));
}

/**
 * Approximate distance in metres from vehicleLon to eventLon along the
 * straight east-bound route.
 *
 * SIMPLIFIED SYNTHETIC-ROUTE LOGIC: uses longitude difference scaled by
 * metres-per-degree at the reference latitude. Returns a signed value:
 * positive = event is ahead (east), negative = event is behind (west/passed).
 *
 * @param vehicleLon - Vehicle longitude (from route progress).
 * @param eventLon - Event longitude from the prepared event record.
 * @param refLatDeg - Reference latitude for the lon→metre approximation.
 * @returns Signed distance in metres. Positive = ahead, negative = behind.
 */
export function signedDistanceAlongRouteM(
  vehicleLon: number,
  eventLon: number,
  refLatDeg: number
): number {
  return (eventLon - vehicleLon) * lonDegToMetresPerDeg(refLatDeg);
}
