/**
 * WIP raw OpenSpeedcam / Datakam TYPE code mapping layer — Stage 2 / Issue #93
 *
 * Maps raw integer TYPE codes from OpenSpeedcam/Datakam CSV rows to normalized
 * event type strings consumed by the emulator.
 *
 * ⚠ THIS MAPPING IS WIP AND NOT PRODUCT CANON ⚠
 *
 * The mapping is based on observed data patterns and publicly available
 * OpenSpeedcam format conventions, but has not been formally verified.
 * It is intentionally conservative — unknown / ambiguous codes map to
 * "unknown" rather than being silently dropped or incorrectly mapped.
 *
 * Known observed raw TYPE codes in Stage 2 evaluation data:
 *   1, 101, 102, 104
 *
 * Do NOT overstate legal or product meaning of any raw type code.
 * The emulator treats all events as candidate observations — not verified truth.
 * (event-data Canon truths 1, 5; product-boundary Canon)
 *
 * Raw TYPE is always preserved in the prepared event output (raw_type field)
 * regardless of the normalized type result. Unknown codes are not silently dropped.
 *
 * To revise this mapping, update MAP_OSC_TYPE_TO_NORMALIZED and document the
 * reasoning. Do NOT promote any mapping to Product Canon without explicit review.
 *
 * Canon authority: docs/product/areas/event-data/event-data.md
 * WIP research: docs/research/roadahead-prepared-event-store-recommendation.md
 */

import type { RouteEventNormalizedType } from "./routeEventDataset.js";

/**
 * WIP mapping of raw OpenSpeedcam/Datakam TYPE integer codes to normalized
 * event type strings.
 *
 * Rationale for each mapping (WIP — not Canon):
 *
 *   101 → "static_camera"
 *     Observed with speed values in Stage 2 evaluation data. Consistent with
 *     fixed point-enforcement camera in OpenSpeedcam format conventions.
 *     WIP — not confirmed against authoritative format documentation.
 *
 *   102 → "speed_limit"
 *     Observed with lower speed values (40 km/h) in Stage 2 evaluation data.
 *     Consistent with speed limit sign / zone in OpenSpeedcam format conventions.
 *     WIP — not confirmed against authoritative format documentation.
 *
 *   104 → "road_bump"
 *     Observed in Stage 2 evaluation area. Consistent with road bump / hazard
 *     in OpenSpeedcam format conventions.
 *     WIP — not confirmed against authoritative format documentation.
 *
 *   1 → "unknown"
 *     Observed in Stage 2 evaluation data. Insufficient confirmed data to
 *     assign a conservative mapping. Preserved as "unknown" to avoid incorrect
 *     categorisation. WIP.
 *
 *   All other codes → "unknown"
 *     Any raw TYPE code not in this table maps to "unknown". Unknown events are
 *     retained in the prepared output with their raw_type preserved.
 *     They do NOT appear in the driver-facing three-circle display.
 */
const MAP_OSC_TYPE_TO_NORMALIZED: ReadonlyMap<number, RouteEventNormalizedType> =
  new Map([
    [101, "static_camera"],
    [102, "speed_limit"],
    [104, "road_bump"],
    // 1 is intentionally omitted — maps to "unknown" via fallback below.
  ]);

/**
 * Map a raw OpenSpeedcam/Datakam TYPE integer to a normalized event type.
 *
 * Returns "unknown" for any code not in the WIP mapping table.
 * Never throws — always returns a valid RouteEventNormalizedType.
 *
 * WIP — NOT Product Canon. The mapping is conservative and subject to revision.
 * Unknown events are preserved in the prepared output — they are not dropped.
 *
 * @param rawType - Raw integer TYPE value from the OpenSpeedcam/Datakam CSV.
 * @returns Normalized event type string, or "unknown" if the code is unmapped.
 */
export function mapOscTypeToNormalized(
  rawType: number
): RouteEventNormalizedType {
  return MAP_OSC_TYPE_TO_NORMALIZED.get(rawType) ?? "unknown";
}

/**
 * Return a human-readable note about the WIP status of the TYPE mapping.
 * Included in prepared event dataset output for operator visibility.
 */
export const OSC_TYPE_MAP_WIP_NOTE =
  "WIP TYPE mapping — Stage 2 baseline, not Product Canon. " +
  "Unknown codes are preserved as type=unknown and not silently dropped. " +
  "Mapped: 101→static_camera, 102→speed_limit, 104→road_bump. " +
  "Unmapped: 1 and all other codes → unknown.";
