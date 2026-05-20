/**
 * Route projection utilities — Phase 0 emulator (Slice 4.1 / Issue #49)
 *
 * WIP EMULATOR MATH — NOT PRODUCT CANON
 *
 * Replaces the Slice 3 longitude-only shortcut with a route-geometry
 * projection baseline. Projects event points and the vehicle position onto
 * the route polyline and computes projection-derived along-route and
 * cross-track distances.
 *
 * Math model:
 *   Local planar / equirectangular metres approximation.
 *   1° lat ≈ 111,320 m (constant approximation).
 *   1° lon ≈ 111,320 × cos(lat_rad) m (segment midpoint latitude per segment).
 *   Exact geodesic precision is NOT required for this emulator baseline.
 *   This approximation is valid for the Phase 0 fixture area (near 55°N).
 *
 * NOT Canon: this math is a WIP emulator baseline. Exact projection math,
 * geodesic accuracy, and ambiguity handling for branches / parallel
 * carriageways are deferred to later child issues under Issue #48.
 *
 * Canon authority:
 *   docs/product/areas/route-geometry/route-geometry.md
 *   docs/product/areas/event-applicability/event-applicability.md
 *     truth 13: route-specific derived fields must not be persisted to base
 *     event records
 *   docs/product/areas/event-data/event-data.md (truth 11)
 */

import type { RouteGeometry, LonLatCoord } from "../contracts/routeGeometry.js";
import type { PreparedEvent } from "../contracts/preparedEvent.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A point projected onto the nearest segment of the route polyline.
 *
 * All values are per-session derived. Must not be persisted to base fixtures.
 * (event-applicability Canon truth 13)
 */
export interface ProjectedPoint {
  /** Zero-based index of the route segment receiving this projection. */
  segment_index: number;
  /** Longitude of the projected point on the route polyline (WGS84). */
  projected_lon: number;
  /** Latitude of the projected point on the route polyline (WGS84). */
  projected_lat: number;
  /** Along-route distance from route start to projected point, metres. */
  along_route_m: number;
  /**
   * Perpendicular (cross-track) distance from the input point to the route
   * polyline, metres. Used for future direction-applicability work.
   */
  cross_track_m: number;
}

/** Full result of projecting an arbitrary [lon, lat] point onto the route. */
export interface RouteProjectionResult {
  /** The best (minimum cross-track) projection found across all segments. */
  best: ProjectedPoint;
  /** Input longitude as supplied. */
  input_lon: number;
  /** Input latitude as supplied. */
  input_lat: number;
}

/**
 * Vehicle position along the route, derived from the route progress slider.
 *
 * Computed from cumulative arc-length interpolation along the route polyline,
 * not from raw longitude interpolation (replaces Slice 3 progressToLon
 * shortcut).
 *
 * Per-session derived. Not persisted.
 */
export interface VehicleRoutePosition {
  /** Route progress in [0, 1] as set by the user. */
  progress: number;
  /** Along-route distance from route start to vehicle position, metres. */
  along_route_m: number;
  /** Longitude of the vehicle on the route polyline (WGS84). */
  projected_lon: number;
  /** Latitude of the vehicle on the route polyline (WGS84). */
  projected_lat: number;
  /** Zero-based index of the route segment the vehicle is on. */
  segment_index: number;
  /** Total route length in metres. */
  total_route_length_m: number;
}

/**
 * Per-event projection record — per-session derived data.
 *
 * Computed at session/render time from route geometry and event coordinates.
 * MUST NOT be persisted back to the base PreparedEvent fixture.
 * (event-applicability Canon truth 13; event-data Canon truth 11)
 */
export interface EventProjectionRecord {
  /** Event identifier, mirrors PreparedEvent.event_id. */
  event_id: string;
  /** Event longitude from PreparedEvent (WGS84). */
  event_lon: number;
  /** Event latitude from PreparedEvent (WGS84). */
  event_lat: number;
  /** Projection of the event point onto the route polyline. */
  projection: RouteProjectionResult;
  /**
   * Signed along-route distance from vehicle to event.
   * Positive = event is ahead of vehicle (further along route).
   * Negative = event is behind vehicle (already passed).
   * Metres.
   *
   * This is the primary ahead/behind signal replacing the Slice 3
   * longitude-only shortcut.
   */
  signed_distance_m: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Approximate metres per degree of latitude. Constant approximation. */
const METRES_PER_DEG_LAT = 111_320;

/** Approximate metres per degree of longitude at the given latitude. */
function metresPerDegLon(latDeg: number): number {
  return 111_320 * Math.cos((latDeg * Math.PI) / 180);
}

/**
 * Compute the Euclidean length of a route segment in metres using local
 * equirectangular approximation at the segment midpoint latitude.
 */
function segmentLengthM(a: LonLatCoord, b: LonLatCoord): number {
  const refLat = (a[1] + b[1]) / 2;
  const mLon = metresPerDegLon(refLat);
  const dx = (b[0] - a[0]) * mLon;
  const dy = (b[1] - a[1]) * METRES_PER_DEG_LAT;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Project a 2D point (px, py) onto segment [(ax, ay), (bx, by)] in metres.
 * Returns parameter t ∈ [0, 1], projected point (qx, qy), and cross-track
 * distance.
 */
function projectToSegment2D(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): { t: number; qx: number; qy: number; crossTrackM: number } {
  const dxAB = bx - ax;
  const dyAB = by - ay;
  const segLenSq = dxAB * dxAB + dyAB * dyAB;
  let t: number;
  if (segLenSq === 0) {
    t = 0;
  } else {
    t = ((px - ax) * dxAB + (py - ay) * dyAB) / segLenSq;
    t = Math.max(0, Math.min(1, t));
  }
  const qx = ax + t * dxAB;
  const qy = ay + t * dyAB;
  const dtx = px - qx;
  const dty = py - qy;
  return { t, qx, qy, crossTrackM: Math.sqrt(dtx * dtx + dty * dty) };
}

// ---------------------------------------------------------------------------
// Public functions
// ---------------------------------------------------------------------------

/**
 * Project a point [lon, lat] onto the route polyline.
 *
 * Tests every segment and returns the projection with minimum cross-track
 * distance.
 *
 * Each segment is evaluated in a local coordinate frame anchored at the
 * segment start point (a), so:
 *   ax = 0,  ay = 0
 *   bx = (b[0] - a[0]) * mLon,  by = (b[1] - a[1]) * METRES_PER_DEG_LAT
 *   px = (lon - a[0]) * mLon,   py = (lat - a[1]) * METRES_PER_DEG_LAT
 * The projected point is then converted back to lon/lat using the same anchor.
 * This avoids large absolute coordinate values and keeps the metre
 * approximation accurate within each segment.
 *
 * mLon uses the segment midpoint latitude (a[1] + b[1]) / 2.
 *
 * WIP EMULATOR MATH — NOT PRODUCT CANON. Local equirectangular approximation.
 *
 * @param lon - Input longitude (WGS84).
 * @param lat - Input latitude (WGS84).
 * @param route - Normalized route geometry (must have ≥ 2 coordinates).
 * @returns RouteProjectionResult with best segment projection.
 * @throws Error if route has fewer than 2 coordinates.
 */
export function projectPointToRoute(
  lon: number,
  lat: number,
  route: RouteGeometry
): RouteProjectionResult {
  const coords = route.coordinates;
  if (coords.length < 2) {
    throw new Error(
      `projectPointToRoute: route requires at least 2 coordinates, got ${coords.length}`
    );
  }

  let bestProjection: ProjectedPoint | null = null;
  let cumulativeM = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];
    const lon0 = a[0];
    const lat0 = a[1];
    const refLat = (lat0 + b[1]) / 2;
    const mLon = metresPerDegLon(refLat);

    // Local frame anchored at segment start — avoids large absolute values.
    const bx = (b[0] - lon0) * mLon;
    const by = (b[1] - lat0) * METRES_PER_DEG_LAT;
    const px = (lon - lon0) * mLon;
    const py = (lat - lat0) * METRES_PER_DEG_LAT;

    const segLen = segmentLengthM(a, b);
    // ax = ay = 0 (local frame origin at segment start)
    const { t, qx, qy, crossTrackM } = projectToSegment2D(
      px, py, 0, 0, bx, by
    );

    const candidate: ProjectedPoint = {
      segment_index: i,
      projected_lon: lon0 + (mLon > 0 ? qx / mLon : 0),
      projected_lat: lat0 + qy / METRES_PER_DEG_LAT,
      along_route_m: cumulativeM + t * segLen,
      cross_track_m: crossTrackM,
    };

    if (bestProjection === null || crossTrackM < bestProjection.cross_track_m) {
      bestProjection = candidate;
    }

    cumulativeM += segLen;
  }

  // bestProjection is always set when coords.length >= 2 (guarded above)
  return { best: bestProjection!, input_lon: lon, input_lat: lat };
}

/**
 * Compute the vehicle's position along the route from route progress [0, 1].
 *
 * Uses cumulative arc-length interpolation — not raw longitude interpolation.
 * Produces a position that is correct for non-straight routes (not only east-
 * bound straight routes). Replaces the Slice 3 progressToLon shortcut for
 * vehicle position.
 *
 * WIP EMULATOR MATH — NOT PRODUCT CANON.
 *
 * @param progress - Route progress in [0, 1] from the route progress slider.
 * @param route - Normalized route geometry.
 * @returns VehicleRoutePosition with along-route distance and projected coords.
 */
export function computeVehicleRoutePosition(
  progress: number,
  route: RouteGeometry
): VehicleRoutePosition {
  const coords = route.coordinates;
  if (coords.length < 2) {
    throw new Error(
      `computeVehicleRoutePosition: route requires at least 2 coordinates, got ${coords.length}`
    );
  }

  const clampedProgress = Math.max(0, Math.min(1, progress));

  const segLengths: number[] = [];
  let totalM = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const len = segmentLengthM(coords[i], coords[i + 1]);
    segLengths.push(len);
    totalM += len;
  }

  if (totalM === 0) {
    throw new Error(
      "computeVehicleRoutePosition: route has zero total length (all coordinates are identical)"
    );
  }

  const targetM = clampedProgress * totalM;
  let remaining = targetM;

  for (let i = 0; i < segLengths.length; i++) {
    const isLastSeg = i === segLengths.length - 1;
    if (remaining <= segLengths[i] || isLastSeg) {
      const t = segLengths[i] > 0 ? Math.min(remaining / segLengths[i], 1) : 0;
      const a = coords[i];
      const b = coords[i + 1];
      return {
        progress: clampedProgress,
        along_route_m: targetM,
        projected_lon: a[0] + t * (b[0] - a[0]),
        projected_lat: a[1] + t * (b[1] - a[1]),
        segment_index: i,
        total_route_length_m: totalM,
      };
    }
    remaining -= segLengths[i];
  }

  // Unreachable with valid geometry guarded above; satisfies TypeScript.
  /* istanbul ignore next */
  throw new Error("computeVehicleRoutePosition: failed to locate vehicle segment (internal error)");
}

/**
 * Compute signed along-route distance from vehicle to event.
 *
 * Positive = event is ahead of vehicle. Negative = event is behind.
 * Metres.
 *
 * @param vehiclePosition - Current vehicle route position.
 * @param eventProjection - Event's route projection result.
 * @returns Signed distance in metres (positive = ahead, negative = behind).
 */
export function signedDistanceFromVehicle(
  vehiclePosition: VehicleRoutePosition,
  eventProjection: RouteProjectionResult
): number {
  return eventProjection.best.along_route_m - vehiclePosition.along_route_m;
}

/**
 * Project all prepared events onto the route and compute per-event projection
 * records for the current vehicle position.
 *
 * Returns per-session derived data. MUST NOT be persisted to base fixtures.
 * (event-applicability Canon truth 13; event-data Canon truth 11)
 *
 * @param events - Prepared candidate events.
 * @param route - Normalized route geometry.
 * @param vehiclePosition - Current vehicle route position.
 * @returns EventProjectionRecord array, one entry per event.
 */
export function projectEventsToRoute(
  events: PreparedEvent[],
  route: RouteGeometry,
  vehiclePosition: VehicleRoutePosition
): EventProjectionRecord[] {
  return events.map((event) => {
    const projection = projectPointToRoute(event.lon, event.lat, route);
    return {
      event_id: event.event_id,
      event_lon: event.lon,
      event_lat: event.lat,
      projection,
      signed_distance_m: signedDistanceFromVehicle(vehiclePosition, projection),
    };
  });
}
