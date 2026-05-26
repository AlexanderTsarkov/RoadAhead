/**
 * WIP raw OpenSpeedcam / Datakam TYPE code mapping layer — Stage 2 / Issue #95
 *
 * Maps raw integer TYPE codes from OpenSpeedcam/Datakam CSV rows to:
 *   - source_label: the human-readable source-level type string
 *   - normalized_type: the emulator RouteEventNormalizedType for applicability logic
 *
 * ⚠ THIS MAPPING IS WIP AND NOT PRODUCT CANON ⚠
 *
 * This is the full 12-code mapping, aligned with the Datakam QA viewer
 * (web/datakam-viewer/src/parseSpeedcam.ts) and documented in:
 *   docs/research/datakam-openspeedcam-type-mapping.md
 *
 * Machine-readable canonical source: data/config/datakam-type-mapping.json
 * That JSON is read by the extractor script at preparation time.
 * This file is the corresponding runtime TypeScript layer — it must stay
 * aligned with data/config/datakam-type-mapping.json and parseSpeedcam.ts.
 *
 * Any revision to the mapping must be reflected in all three locations:
 *   1. data/config/datakam-type-mapping.json  (extractor input)
 *   2. web/datakam-viewer/src/parseSpeedcam.ts (QA viewer)
 *   3. this file (emulator runtime)
 *
 * The mapping is based on observed data patterns and manually checked in
 * the Datakam QA viewer. It has not been formally verified against
 * authoritative format documentation.
 *
 * Raw TYPE is always preserved in the prepared event output (raw_type field)
 * alongside source_type_label regardless of the normalized type result.
 * Unknown codes are not silently dropped.
 *
 * Canon authority: docs/product/areas/event-data/event-data.md
 * Research: docs/research/datakam-openspeedcam-type-mapping.md
 */

import type { RouteEventNormalizedType } from "./routeEventDataset.js";

/** A single TYPE mapping entry: raw code → source label + normalized type. */
export interface OscTypeMappingEntry {
  readonly rawType: number;
  readonly sourceLabel: string;
  readonly normalizedType: RouteEventNormalizedType;
}

/**
 * Full 12-code Datakam/OpenSpeedcam TYPE mapping.
 *
 * Source labels match web/datakam-viewer/src/parseSpeedcam.ts TYPE_MEANINGS.
 * Normalized types are the emulator POC V1 categories:
 *   speed_limit | static_camera | road_bump | unknown
 *
 * Camera types (1–5) → static_camera
 * Speed-limit sign (101) → speed_limit
 * Hazard / bump types (100, 102–106) → road_bump
 * Unknown codes → "unknown" via fallback; source_label will be "unknown"
 *
 * WIP rationale for each entry:
 *
 *   1  static_camera        → static_camera
 *     Fixed point speed/enforcement camera. Observed in Rostov1 evaluation data.
 *
 *   2  traffic_light_camera → static_camera
 *     Traffic-light camera. Mapped to static_camera for POC V1 scope.
 *
 *   3  red_light_camera     → static_camera
 *     Red-light camera. Observed in Rostov1 evaluation data.
 *
 *   4  average_speed_camera → static_camera
 *     Average-speed (section) camera.
 *
 *   5  mobile_camera        → static_camera
 *     Mobile speed camera.
 *
 *   100 pedestrian_crossing → road_bump
 *     Pedestrian crossing. Mapped to road_bump (hazard category).
 *     Observed in Rostov1 evaluation data.
 *
 *   101 speed_limit         → speed_limit
 *     Speed-regime / speed-limit sign. Includes ordinary speed-limit signs
 *     and settlement signs implying a default speed regime (WIP QA observation).
 *     Observed in Rostov1 evaluation data.
 *
 *   102 speed_bump          → road_bump
 *     Speed bump / road bump. Bidirectional rows (DIRTYPE=2) are expected.
 *     Observed in Rostov1 evaluation data.
 *
 *   103 bad_road            → road_bump
 *     Bad road / surface hazard. Mapped to road_bump (hazard category).
 *     Observed in Rostov1 evaluation data.
 *
 *   104 dangerous_turn      → road_bump
 *     Dangerous turn / curve. Mapped to road_bump (hazard category).
 *     Observed in Rostov1 evaluation data.
 *
 *   105 dangerous_intersection → road_bump
 *     Dangerous intersection. Mapped to road_bump (hazard category).
 *
 *   106 other_danger        → road_bump
 *     Other danger. Observed as railway crossing in ≥1 manual QA check.
 *     Source label other_danger preserved; railway crossing is a known subtype.
 *     Mapped to road_bump (hazard category).
 *     Observed in Rostov1 evaluation data.
 */
export const OSC_TYPE_MAP: ReadonlyArray<OscTypeMappingEntry> = [
  { rawType: 1,   sourceLabel: "static_camera",         normalizedType: "static_camera" },
  { rawType: 2,   sourceLabel: "traffic_light_camera",   normalizedType: "static_camera" },
  { rawType: 3,   sourceLabel: "red_light_camera",       normalizedType: "static_camera" },
  { rawType: 4,   sourceLabel: "average_speed_camera",   normalizedType: "static_camera" },
  { rawType: 5,   sourceLabel: "mobile_camera",          normalizedType: "static_camera" },
  { rawType: 100, sourceLabel: "pedestrian_crossing",    normalizedType: "road_bump"     },
  { rawType: 101, sourceLabel: "speed_limit",            normalizedType: "speed_limit"   },
  { rawType: 102, sourceLabel: "speed_bump",             normalizedType: "road_bump"     },
  { rawType: 103, sourceLabel: "bad_road",               normalizedType: "road_bump"     },
  { rawType: 104, sourceLabel: "dangerous_turn",         normalizedType: "road_bump"     },
  { rawType: 105, sourceLabel: "dangerous_intersection", normalizedType: "road_bump"     },
  { rawType: 106, sourceLabel: "other_danger",           normalizedType: "road_bump"     },
];

/** Fast lookup map: raw TYPE integer → mapping entry. */
const MAP_BY_RAW_TYPE: ReadonlyMap<number, OscTypeMappingEntry> = new Map(
  OSC_TYPE_MAP.map((e) => [e.rawType, e])
);

/**
 * Map a raw OpenSpeedcam/Datakam TYPE integer to a normalized event type.
 *
 * Returns "unknown" for any code not in the WIP mapping table.
 * Never throws — always returns a valid RouteEventNormalizedType.
 *
 * WIP — NOT Product Canon. See docs/research/datakam-openspeedcam-type-mapping.md
 *
 * @param rawType - Raw integer TYPE value from the OpenSpeedcam/Datakam CSV.
 * @returns Normalized event type string, or "unknown" if the code is unmapped.
 */
export function mapOscTypeToNormalized(
  rawType: number
): RouteEventNormalizedType {
  return MAP_BY_RAW_TYPE.get(rawType)?.normalizedType ?? "unknown";
}

/**
 * Map a raw OpenSpeedcam/Datakam TYPE integer to its source label string.
 *
 * Returns "unknown" for any code not in the WIP mapping table.
 * The source label preserves the source-level distinction even when
 * multiple raw types share the same normalized emulator category.
 *
 * WIP — NOT Product Canon.
 *
 * @param rawType - Raw integer TYPE value from the OpenSpeedcam/Datakam CSV.
 * @returns Source label string, or "unknown" if the code is unmapped.
 */
export function mapOscTypeToSourceLabel(rawType: number): string {
  return MAP_BY_RAW_TYPE.get(rawType)?.sourceLabel ?? "unknown";
}

/**
 * Return a human-readable note about the WIP status of the TYPE mapping.
 * Included in prepared event dataset output for operator visibility.
 */
export const OSC_TYPE_MAP_WIP_NOTE =
  "Full 12-code WIP TYPE mapping — Stage 2 / Issue #95, not Product Canon. " +
  "Camera types (1–5) → static_camera. " +
  "101 → speed_limit. " +
  "Hazard types (100, 102–106) → road_bump. " +
  "Unknown codes → unknown (preserved, not dropped). " +
  "source_type_label field preserves source-level distinction per event. " +
  "See data/config/datakam-type-mapping.json and docs/research/datakam-openspeedcam-type-mapping.md.";
