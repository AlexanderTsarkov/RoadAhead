/**
 * Route progress utilities — Phase 0 emulator (Slice 3 / Issue #46)
 *
 * LEGACY / SIMPLE FALLBACK MODULE
 *
 * As of Slice 4.1 (Issue #49), the core emulator pipeline uses
 * routeProjection.ts for vehicle position and event distance computation.
 * This module is retained for display helpers (getRouteLonSpan) used in
 * main.ts. The functions below are legacy utilities from the Slice 3
 * longitude-only approach:
 *
 *   progressToLon    — no longer used by simulationState.ts (replaced by
 *                       computeVehicleRoutePosition in routeProjection.ts).
 *   lonToProgress    — longitude-to-progress inverse; not used by core logic.
 *   signedDistanceAlongRouteM — longitude-only distance; no longer used by
 *                       minimalEventSelection.ts (replaced by projection-
 *                       derived signed_distance_m).
 *   SYNTHETIC_ROUTE_REFERENCE_LAT — no longer used by core logic.
 *
 *   getRouteLonSpan  — still used by main.ts for route info display.
 *   lonDegToMetresPerDeg — kept as a utility; not used by core logic.
 *
 * These functions are valid ONLY for straight east-bound synthetic fixtures.
 * Do not use for real routes, curved routes, or north/south routes.
 *
 * Canon authority:
 *   docs/product/areas/route-geometry/route-geometry.md
 *   docs/product/areas/event-applicability/event-applicability.md (truth 13:
 *     route-specific derived fields are not persisted onto base event records)
 *
 * NOT Canon: this simplified logic is a legacy WIP implementation from Slice 3.
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
