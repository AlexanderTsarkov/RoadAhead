/**
 * Simulation state — Phase 0 emulator
 * (Slice 4.1 / Issue #49 — route projection baseline;
 *  Slice 4.2 / Issue #51 — direction compatibility integration)
 *
 * Computes the full per-tick simulation state from user inputs and fixtures.
 * Ties together route projection, direction compatibility, event selection,
 * and speed reference.
 *
 * This module is the single integration point for the emulator logic.
 * It is called on every user input change (slider, speed controls) and
 * produces an immutable snapshot of the emulator state for rendering.
 *
 * No derived fields are written back to the source fixtures.
 * (event-data Canon truth 11; event-applicability Canon truth 13)
 *
 * What changed in Slice 4.2 vs Slice 4.1:
 *   - Per-event direction compatibility records (directionCompatibility) are
 *     now computed and stored in SimulationState via
 *     computeDirectionCompatibilityRecords.
 *   - selectEvents now receives directionCompatibilityRecords so that events
 *     with status "incompatible" are suppressed (direction_conflict status).
 *
 * What changed in Slice 4.1 vs Slice 3:
 *   - Vehicle position is now computed via arc-length projection
 *     (computeVehicleRoutePosition) instead of longitude interpolation
 *     (progressToLon). vehicleLon is derived from vehicleRoutePosition.
 *   - Per-event projection records (eventProjections) are computed and
 *     stored in SimulationState for the debug panel.
 *   - selectEvents receives VehicleRoutePosition + EventProjectionRecord[]
 *     instead of vehicleLon, so ahead/behind is projection-derived.
 *
 * Canon authority:
 *   docs/product/areas/route-geometry/route-geometry.md
 *   docs/product/areas/event-applicability/event-applicability.md (truth 13)
 *   docs/product/areas/speed-reference/speed-reference.md (truths 3, 4, 5)
 *   docs/product/areas/validation-emulator/validation-emulator.md
 *     truth 6: simulate vehicle with manual speed control; no provider speed
 *
 * NOT Canon: exact state shape is WIP and subject to revision.
 */

import type { RouteGeometry } from "../contracts/routeGeometry.js";
import type { PreparedEvent } from "../contracts/preparedEvent.js";
import type { EmulatorTuningConfig } from "../contracts/tuningConfig.js";
import {
  computeVehicleRoutePosition,
  projectEventsToRoute,
  type VehicleRoutePosition,
  type EventProjectionRecord,
} from "./routeProjection.js";
import {
  selectEvents,
  type EventSelectionResult,
} from "./minimalEventSelection.js";
import {
  computeDirectionCompatibilityRecords,
  type DirectionCompatibilityRecord,
} from "./directionCompatibility.js";
import {
  computeSpeedReference,
  type SpeedReferenceContext,
} from "./speedReference.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The full computed simulation state for a given progress and speed.
 *
 * This is an immutable snapshot produced from user inputs and fixtures.
 * It is not persisted and must not be written back to fixture files.
 */
export interface SimulationState {
  /** Route progress in [0, 1] — the value set by the user via the slider. */
  progress: number;
  /**
   * Current simulated speed in km/h — the value set by the user via speed
   * controls. No provider speed is used.
   * (validation-emulator Canon truth 6)
   */
  speedKmh: number;
  /**
   * Vehicle longitude derived from route projection.
   * Equals vehicleRoutePosition.projected_lon; kept for UI display convenience.
   */
  vehicleLon: number;
  /**
   * Vehicle position along the route, computed via cumulative arc-length
   * interpolation. Replaces the Slice 3 longitude-only progressToLon shortcut.
   * Per-session derived — not persisted.
   */
  vehicleRoutePosition: VehicleRoutePosition;
  /**
   * Per-event projection records derived from route geometry and event coords.
   * Per-session derived — MUST NOT be persisted to base fixtures.
   * (event-applicability Canon truth 13; event-data Canon truth 11)
   */
  eventProjections: EventProjectionRecord[];
  /**
   * Per-event direction compatibility records (Slice 4.2 / Issue #51).
   * Computed from route geometry and source direction candidate metadata.
   * Per-session derived — MUST NOT be persisted to base fixtures.
   * Source direction fields are candidate metadata, not verified truth.
   * (event-applicability Canon truth 13; event-data Canon truth 11;
   *  event-applicability Canon truth 8)
   */
  directionCompatibility: DirectionCompatibilityRecord[];
  /** Event selection result (primary, secondary, and per-event debug records). */
  eventSelection: EventSelectionResult;
  /**
   * Advisory speed reference context.
   * Not a legal authority. Not safety-certified.
   * (speed-reference Canon truths 1, 3, 4, 5)
   */
  speedReference: SpeedReferenceContext;
}

// ---------------------------------------------------------------------------
// Computation
// ---------------------------------------------------------------------------

/**
 * Compute the full simulation state from user inputs and fixtures.
 *
 * Called on every user input change. Produces an immutable state snapshot.
 * Never modifies the route, events, or config arguments.
 *
 * Slice 4.1 change: vehicle position and event ahead/behind determination
 * are now projection-derived (arc-length based) rather than longitude-only.
 *
 * @param progress - Route progress in [0, 1] (from slider).
 * @param speedKmh - Current simulated speed in km/h (from speed controls).
 * @param route - Normalized synthetic route geometry (not modified).
 * @param events - Prepared candidate events (not modified).
 * @param config - Active emulator tuning config (WIP defaults, not Canon).
 * @returns Immutable simulation state snapshot.
 */
export function computeSimulationState(
  progress: number,
  speedKmh: number,
  route: RouteGeometry,
  events: PreparedEvent[],
  config: EmulatorTuningConfig
): SimulationState {
  const vehicleRoutePosition = computeVehicleRoutePosition(progress, route);
  const eventProjections = projectEventsToRoute(events, route, vehicleRoutePosition);
  const directionCompatibility = computeDirectionCompatibilityRecords(
    events,
    eventProjections,
    route,
    config.direction_applicability
  );
  const eventSelection = selectEvents(
    events,
    eventProjections,
    directionCompatibility,
    config
  );
  const speedReference = computeSpeedReference(eventSelection.primary);

  return {
    progress,
    speedKmh,
    vehicleLon: vehicleRoutePosition.projected_lon,
    vehicleRoutePosition,
    eventProjections,
    directionCompatibility,
    eventSelection,
    speedReference,
  };
}
