/**
 * Full 12-code Datakam/OpenSpeedcam TYPE mapping.
 *
 * This is the canonical source-label mapping for the QA viewer.
 * The same mapping (with emulator normalized_type additions) is documented in:
 *   docs/research/datakam-openspeedcam-type-mapping.md
 *   data/config/datakam-type-mapping.json  (machine-readable, used by extractor)
 *   web/roadahead-emulator/src/contracts/openSpeedcamTypeMap.ts (emulator runtime)
 *
 * Any revision to this mapping must be reflected in all four locations.
 *
 * WIP — not Product Canon.
 */
export const TYPE_MEANINGS: Record<number, string> = {
  1: "static_camera",
  2: "traffic_light_camera",
  3: "red_light_camera",
  4: "average_speed_camera",
  5: "mobile_camera",
  100: "pedestrian_crossing",
  101: "speed_limit",
  102: "speed_bump",
  103: "bad_road",
  104: "dangerous_turn",
  105: "dangerous_intersection",
  106: "other_danger",
};

export interface SpeedcamRow {
  idx: number;
  lon: number;
  lat: number;
  type: number;
  normalizedType: string;
  speed: number;
  dirtype: number;
  direction: number;
}

export interface ParseResult {
  rows: SpeedcamRow[];
  totalPhysicalLines: number;
  parsedValid: number;
  skippedInvalid: number;
  distinctTypes: number[];
  unknownTypes: number[];
}

function stripComment(line: string): string {
  const idx = line.indexOf("//");
  return idx !== -1 ? line.slice(0, idx).trim() : line.trim();
}

export function parseSpeedcamText(text: string): ParseResult {
  const lines = text.split(/\r?\n/);
  const totalPhysicalLines = lines.length;
  const rows: SpeedcamRow[] = [];
  let skippedInvalid = 0;

  for (const raw of lines) {
    const line = stripComment(raw);
    if (!line) {
      skippedInvalid++;
      continue;
    }

    const parts = line.split(",");
    if (parts.length !== 7) {
      skippedInvalid++;
      continue;
    }

    const [idxS, xS, yS, typeS, speedS, dirtypeS, directionS] = parts.map(
      (p) => p.trim()
    );

    const idx = parseInt(idxS, 10);
    const lon = parseFloat(xS);
    const lat = parseFloat(yS);
    const type = parseInt(typeS, 10);
    const speed = parseInt(speedS, 10);
    const dirtype = parseInt(dirtypeS, 10);
    const direction = parseInt(directionS, 10);

    if (
      [idx, lon, lat, type, speed, dirtype, direction].some((v) =>
        isNaN(v)
      )
    ) {
      skippedInvalid++;
      continue;
    }

    rows.push({
      idx,
      lon,
      lat,
      type,
      normalizedType: TYPE_MEANINGS[type] ?? "unknown",
      speed,
      dirtype,
      direction,
    });
  }

  const typeSet = new Set(rows.map((r) => r.type));
  const distinctTypes = [...typeSet].sort((a, b) => a - b);
  const unknownTypes = distinctTypes.filter((t) => !(t in TYPE_MEANINGS));

  return {
    rows,
    totalPhysicalLines,
    parsedValid: rows.length,
    skippedInvalid,
    distinctTypes,
    unknownTypes,
  };
}
