/**
 * Direction compatibility baseline — Phase 0 emulator (Slice 4.2 / Issue #51)
 *
 * WIP EMULATOR IMPLEMENTATION — NOT PRODUCT CANON
 *
 * Computes per-session direction compatibility between the local route approach
 * tangent (derived from route geometry) and source direction candidate metadata
 * from prepared events.
 *
 * Source direction fields (source_direction_deg, source_dirtype) are treated as
 * candidate metadata, not verified truth.
 * (event-applicability Canon truth 8; event-data Canon truth 11;
 *  direction-applicability research §3.E)
 *
 * Math model:
 *   Local planar / equirectangular approximation consistent with routeProjection.ts.
 *   Heading is clockwise from north, in degrees [0, 360).
 *   WIP EMULATOR MATH — NOT PRODUCT CANON.
 *
 * dirtype semantics (WIP — NOT Canon):
 *   0     → treated as bidirectional (WIP convention; source interpretation not fully verified)
 *   1     → treated as directional; apply source_direction_deg if present
 *   null  → unknown; cannot evaluate direction applicability
 *   other → unsupported; handle in later child issues
 *
 * Threshold values come from EmulatorTuningConfig.direction_applicability (WIP
 * defaults — not Canon; tuning-and-validation Canon truths 1, 2).
 *
 * Canon authority:
 *   docs/product/areas/event-applicability/event-applicability.md
 *     truth 8: source direction fields are candidate metadata, not verified truth
 *     truth 12: suppressed candidates remain inspectable in debug
 *     truth 13: route-specific derived fields not persisted to base fixtures
 *   docs/product/areas/event-data/event-data.md (truth 11)
 *   docs/product/areas/tuning-and-validation/tuning-and-validation.md (truths 1, 2)
 *
 * NOT Canon: this logic is a WIP baseline for Slice 4.2. Exact thresholds,
 * dirtype semantics, and multi-segment tangent computation are all subject to
 * revision in later child issues under Issue #48.
 */

import type { RouteGeometry } from "../contracts/routeGeometry.js";
import type { PreparedEvent } from "../contracts/preparedEvent.js";
import type { DirectionApplicabilityConfig } from "../contracts/tuningConfig.js";
import type { EventProjectionRecord } from "./routeProjection.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Baseline direction compatibility status for a prepared event candidate.
 *
 * WIP candidate semantics — NOT final product-applicability status and NOT
 * Product Canon. Naming and boundary semantics may be revised in later child
 * issues under Issue #48.
 *
 * Semantics (WIP):
 *   compatible    — source direction is consistent with route approach tangent
 *                   (delta ≤ direction_delta_accept_deg).
 *   incompatible  — source direction clearly conflicts with route approach
 *                   tangent (delta > direction_delta_reject_above_deg, or in
 *                   the ambiguous band, treated conservatively as incompatible
 *                   for this baseline).
 *   bidirectional — source dirtype signals event applies in both directions
 *                   (WIP: dirtype=0 convention; semantics not Canon).
 *   unknown       — source direction metadata absent or dirtype is null;
 *                   cannot evaluate; treated conservatively.
 *   unsupported   — source dirtype value not handled by this baseline.
 */
export type DirectionCompatibilityStatus =
  | "compatible"
  | "incompatible"
  | "bidirectional"
  | "unknown"
  | "unsupported";

/**
 * Per-session direction compatibility record for a single prepared event.
 *
 * MUST NOT be persisted to base prepared event fixtures.
 * (event-applicability Canon truth 13; event-data Canon truth 11)
 *
 * All fields are per-session derived debug/runtime data. They must be clearly
 * labeled as such in any UI surface where they are displayed.
 */
export interface DirectionCompatibilityRecord {
  /** Event identifier, mirrors PreparedEvent.event_id. */
  event_id: string;

  /**
   * Local route approach tangent at the event's projection point, clockwise
   * degrees from north. Derived from route geometry only (not from provider
   * speed, lane, or turn data). Per-session derived.
   * Null if the tangent cannot be computed (degenerate segment geometry).
   * WIP EMULATOR MATH — NOT PRODUCT CANON.
   */
  route_tangent_deg: number | null;

  /**
   * Source direction candidate value from the prepared event record.
   * Mirrors PreparedEvent.source_direction_deg.
   * Candidate metadata — NOT verified truth.
   * (event-applicability Canon truth 8)
   */
  source_direction_deg: number | null;

  /**
   * Source dirtype value from the prepared event record.
   * Mirrors PreparedEvent.source_dirtype.
   * WIP candidate metadata — dirtype semantics are not Canon.
   */
  source_dirtype: number | null;

  /**
   * Smallest-angle delta between route approach tangent and source direction,
   * degrees in [0, 180]. Null if either tangent or source direction is null
   * (i.e. when evaluation cannot proceed).
   * Circular wrap-around is handled: 359° vs 1° → 2°, not 358°.
   * WIP EMULATOR MATH — NOT PRODUCT CANON.
   */
  direction_delta_deg: number | null;

  /**
   * Baseline direction compatibility status.
   * WIP candidate semantics — NOT Canon. See DirectionCompatibilityStatus.
   */
  status: DirectionCompatibilityStatus;

  /**
   * Human-readable reason for this status, for the debug panel.
   * Per-session derived. Clearly labeled as debug/WIP context.
   * Must not be displayed driver-facing.
   */
  reason: string;
}

// ---------------------------------------------------------------------------
// Math helpers — WIP EMULATOR MATH — NOT PRODUCT CANON
// ---------------------------------------------------------------------------

/**
 * Normalize an angle in degrees to [0, 360).
 *
 * Handles values outside [0, 360) including negatives.
 * WIP EMULATOR MATH — NOT PRODUCT CANON.
 *
 * @param deg - Angle in degrees (any real value).
 * @returns Equivalent angle in [0, 360).
 */
export function normalizeDegrees(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Compute the smallest angle between two headings, in degrees [0, 180].
 *
 * Handles circular wrap-around correctly:
 *   359° vs   1° →   2° (not 358°)
 *     1° vs 359° →   2°
 *    10° vs 190° → 180°
 *     0° vs 180° → 180°
 *    90° vs  90° →   0°
 *
 * WIP EMULATOR MATH — NOT PRODUCT CANON.
 *
 * @param a - First heading in degrees (any real value).
 * @param b - Second heading in degrees (any real value).
 * @returns Smallest angle between a and b, in [0, 180].
 */
export function smallestAngleDeltaDeg(a: number, b: number): number {
  const na = normalizeDegrees(a);
  const nb = normalizeDegrees(b);
  const diff = Math.abs(na - nb);
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Compute the heading in degrees (clockwise from north) from point a to b.
 *
 * Uses local equirectangular approximation consistent with routeProjection.ts:
 *   dx = (bLon - aLon) × mLon  (metres east)
 *   dy = (bLat - aLat) × METRES_PER_DEG_LAT  (metres north)
 *   heading = atan2(dx, dy) → clockwise-from-north heading
 *
 * mLon uses the midpoint latitude of the two points.
 * 1° lat ≈ 111,320 m (constant approximation).
 * 1° lon ≈ 111,320 × cos(lat_rad) m.
 *
 * Returns null if the two points are identical (degenerate input).
 *
 * WIP EMULATOR MATH — NOT PRODUCT CANON.
 *
 * @param aLon - Start longitude (WGS84).
 * @param aLat - Start latitude (WGS84).
 * @param bLon - End longitude (WGS84).
 * @param bLat - End latitude (WGS84).
 * @returns Heading in degrees [0, 360), clockwise from north; or null if degenerate.
 */
export function headingDegBetweenPoints(
  aLon: number,
  aLat: number,
  bLon: number,
  bLat: number
): number | null {
  const METRES_PER_DEG_LAT = 111_320;
  const refLat = (aLat + bLat) / 2;
  const mLon = METRES_PER_DEG_LAT * Math.cos((refLat * Math.PI) / 180);
  const dx = (bLon - aLon) * mLon; // metres east
  const dy = (bLat - aLat) * METRES_PER_DEG_LAT; // metres north
  if (dx === 0 && dy === 0) return null;
  // atan2(east, north) gives clockwise-from-north bearing
  const headingRad = Math.atan2(dx, dy);
  return normalizeDegrees((headingRad * 180) / Math.PI);
}

// ---------------------------------------------------------------------------
// Route tangent computation
// ---------------------------------------------------------------------------

/**
 * Compute the local route approach tangent at an event's projection point.
 *
 * Uses the heading of the route segment that contains the projection
 * (segment coords[segment_index] → coords[segment_index + 1]).
 * This is the WIP baseline approach for Slice 4.2. A more refined multi-
 * segment weighted tangent using approach_window_m is deferred to later
 * child issues under Issue #48.
 *
 * Returns null if the segment is degenerate (zero length) or the segment
 * index is out of bounds.
 *
 * WIP EMULATOR MATH — NOT PRODUCT CANON.
 * Does NOT use provider speed, ETA, traffic, lane, turn, or posted-limit data.
 * Derived from route geometry only.
 *
 * @param route - Normalized route geometry.
 * @param projection - Event's route projection record (provides segment_index).
 * @returns Approach tangent heading in degrees [0, 360), or null if degenerate.
 */
export function computeRouteTangentAtProjection(
  route: RouteGeometry,
  projection: EventProjectionRecord
): number | null {
  const segIdx = projection.projection.best.segment_index;
  const coords = route.coordinates;
  if (segIdx < 0 || segIdx + 1 >= coords.length) return null;
  const a = coords[segIdx];
  const b = coords[segIdx + 1];
  return headingDegBetweenPoints(a[0], a[1], b[0], b[1]);
}

// ---------------------------------------------------------------------------
// Compatibility computation
// ---------------------------------------------------------------------------

/**
 * Compute the baseline direction compatibility for a single prepared event.
 *
 * Source direction fields are treated as candidate metadata, not verified truth.
 * (event-applicability Canon truth 8)
 *
 * dirtype interpretation (WIP — NOT Canon):
 *   null  → unknown; cannot evaluate. Conservative: status = unknown.
 *   0     → bidirectional WIP candidate; status = bidirectional.
 *   1     → directional; compare source_direction_deg to route tangent.
 *   other → unsupported; extend in later child issues.
 *
 * For dirtype=1 events, the ambiguous band
 * (direction_delta_accept_deg < delta ≤ direction_delta_reject_above_deg) is
 * treated conservatively as incompatible in this baseline. A finer ambiguous
 * status may be introduced in later child issues.
 *
 * Results are per-session derived. MUST NOT be persisted to base fixtures.
 * (event-applicability Canon truth 13; event-data Canon truth 11)
 *
 * @param event - Prepared candidate event (source direction treated as candidate).
 * @param projection - Event's route projection record.
 * @param route - Normalized route geometry.
 * @param config - Direction applicability thresholds (WIP defaults — not Canon).
 * @returns DirectionCompatibilityRecord (per-session derived, not persisted).
 */
export function computeDirectionCompatibility(
  event: PreparedEvent,
  projection: EventProjectionRecord,
  route: RouteGeometry,
  config: DirectionApplicabilityConfig
): DirectionCompatibilityRecord {
  const routeTangentDeg = computeRouteTangentAtProjection(route, projection);

  const base = {
    event_id: event.event_id,
    route_tangent_deg: routeTangentDeg,
    source_direction_deg: event.source_direction_deg,
    source_dirtype: event.source_dirtype,
    direction_delta_deg: null as number | null,
  };

  // dirtype null → cannot determine directionality; conservative unknown
  if (event.source_dirtype === null) {
    const detail =
      event.source_direction_deg !== null
        ? `source_direction_deg=${event.source_direction_deg}° present but dirtype is null — cannot confirm directionality`
        : "source_direction_deg and source_dirtype are both null";
    return {
      ...base,
      status: "unknown",
      reason:
        `${detail}. ` +
        `Conservative: treated as unknown. ` +
        `(per-session derived debug data; WIP candidate semantics — not Canon)`,
    };
  }

  // dirtype 0 → bidirectional (WIP convention; semantics not Canon)
  if (event.source_dirtype === 0) {
    return {
      ...base,
      status: "bidirectional",
      reason:
        `Source dirtype=0 — treated as bidirectional WIP candidate. ` +
        `Event applies in both directions per this baseline; may be selected if ` +
        `other checks pass. ` +
        `(WIP dirtype=0 semantics — not Canon; per-session derived debug data)`,
    };
  }

  // dirtype 1 → directional; need source_direction_deg and route tangent
  if (event.source_dirtype === 1) {
    if (event.source_direction_deg === null) {
      return {
        ...base,
        status: "unknown",
        reason:
          `Source dirtype=1 (directional) but source_direction_deg is null. ` +
          `Cannot compute direction delta. Conservative: treated as unknown. ` +
          `(per-session derived debug data; WIP candidate semantics — not Canon)`,
      };
    }

    if (routeTangentDeg === null) {
      return {
        ...base,
        status: "unknown",
        reason:
          `Route approach tangent could not be computed (degenerate segment geometry). ` +
          `Conservative: treated as unknown. ` +
          `(per-session derived debug data; WIP candidate semantics — not Canon)`,
      };
    }

    const delta = smallestAngleDeltaDeg(routeTangentDeg, event.source_direction_deg);
    const baseWithDelta = { ...base, direction_delta_deg: delta };

    if (delta <= config.direction_delta_accept_deg) {
      return {
        ...baseWithDelta,
        status: "compatible",
        reason:
          `Route tangent ${routeTangentDeg.toFixed(1)}° · source direction ${event.source_direction_deg}° · ` +
          `delta ${delta.toFixed(1)}° ≤ accept threshold ${config.direction_delta_accept_deg}° → compatible. ` +
          `(WIP threshold — not Canon; per-session derived debug data)`,
      };
    }

    if (delta > config.direction_delta_reject_above_deg) {
      return {
        ...baseWithDelta,
        status: "incompatible",
        reason:
          `Route tangent ${routeTangentDeg.toFixed(1)}° · source direction ${event.source_direction_deg}° · ` +
          `delta ${delta.toFixed(1)}° > reject threshold ${config.direction_delta_reject_above_deg}° → incompatible (direction conflict). ` +
          `Suppressed from driver-facing selection. ` +
          `(WIP threshold — not Canon; per-session derived debug data)`,
      };
    }

    // Ambiguous band: direction_delta_accept_deg < delta ≤ direction_delta_reject_above_deg.
    // Conservative baseline: treat as incompatible and suppress from driver-facing selection.
    // A finer ambiguous status may be introduced in later child issues under Issue #48.
    return {
      ...baseWithDelta,
      status: "incompatible",
      reason:
        `Route tangent ${routeTangentDeg.toFixed(1)}° · source direction ${event.source_direction_deg}° · ` +
        `delta ${delta.toFixed(1)}° in ambiguous band ` +
        `(${config.direction_delta_accept_deg}°–${config.direction_delta_reject_above_deg}°). ` +
        `Conservative baseline: treated as incompatible. ` +
        `(WIP threshold — not Canon; per-session derived debug data)`,
    };
  }

  // Any other dirtype value → unsupported
  return {
    ...base,
    status: "unsupported",
    reason:
      `Source dirtype=${event.source_dirtype} is not handled by this baseline. ` +
      `Treated as unsupported. Extend in later child issues under Issue #48. ` +
      `(per-session derived debug data; WIP candidate semantics — not Canon)`,
  };
}

/**
 * Compute direction compatibility records for all prepared events.
 *
 * Returns per-session derived data. MUST NOT be persisted to base fixtures.
 * (event-applicability Canon truth 13; event-data Canon truth 11)
 *
 * @param events - All prepared candidate events.
 * @param projections - Per-event projection records from projectEventsToRoute.
 * @param route - Normalized route geometry.
 * @param config - Direction applicability thresholds (WIP defaults — not Canon).
 * @returns DirectionCompatibilityRecord array, one entry per event.
 */
export function computeDirectionCompatibilityRecords(
  events: PreparedEvent[],
  projections: EventProjectionRecord[],
  route: RouteGeometry,
  config: DirectionApplicabilityConfig
): DirectionCompatibilityRecord[] {
  const projectionMap = new Map<string, EventProjectionRecord>(
    projections.map((p) => [p.event_id, p])
  );

  return events.map((event) => {
    const projection = projectionMap.get(event.event_id);
    if (projection === undefined) {
      return {
        event_id: event.event_id,
        route_tangent_deg: null,
        source_direction_deg: event.source_direction_deg,
        source_dirtype: event.source_dirtype,
        direction_delta_deg: null,
        status: "unknown" as DirectionCompatibilityStatus,
        reason:
          `No projection record found for event ${event.event_id}. ` +
          `Cannot compute direction compatibility. ` +
          `(per-session derived debug data; WIP candidate semantics — not Canon)`,
      };
    }
    return computeDirectionCompatibility(event, projection, route, config);
  });
}
