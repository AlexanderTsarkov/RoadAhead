/**
 * Simulation state — Phase 0 emulator (Slice 3 / Issue #46)
 *
 * Computes the full per-tick simulation state from user inputs and fixtures.
 * Ties together route progress, event selection, and speed reference.
 *
 * This module is the single integration point for the emulator logic.
 * It is called on every user input change (slider, speed controls) and
 * produces an immutable snapshot of the emulator state for rendering.
 *
 * No derived fields are written back to the source fixtures.
 * (event-data Canon truth 11; event-applicability Canon truth 13)
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
import { progressToLon } from "./routeProgress.js";
import {
  selectEvents,
  type EventSelectionResult,
} from "./minimalEventSelection.js";
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
   * Vehicle longitude derived from progress via simplified longitude
   * interpolation. Valid only for the straight east-bound synthetic fixture.
   * SIMPLIFIED SYNTHETIC-ROUTE LOGIC.
   */
  vehicleLon: number;
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
 * SIMPLIFIED SYNTHETIC-ROUTE LOGIC: vehicle position derived from longitude
 * interpolation along the straight east-bound route. Full geospatial
 * projection is deferred to Slice 4.
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
  const vehicleLon = progressToLon(progress, route);
  const eventSelection = selectEvents(vehicleLon, events, config);
  const speedReference = computeSpeedReference(eventSelection.primary);

  return {
    progress,
    speedKmh,
    vehicleLon,
    eventSelection,
    speedReference,
  };
}
