#!/usr/bin/env node
/**
 * prepareRouteEvents.mjs — Stage 2 / Issue #93 / Issue #95
 *
 * Local script: generates a route-scoped prepared event dataset from a local
 * raw OpenSpeedcam/Datakam CSV file.
 *
 * USAGE:
 *   npm run prepare:route-events -- \
 *     --route public/routes/Rostov1.geojson \
 *     --raw ../../data/raw/datakam/speedcam.txt \
 *     --route-id rostov1 \
 *     --buffer-m 3000 \
 *     --out public/route-events/Rostov1.events.json
 *
 * DATA POLICY:
 *   - Raw OpenSpeedcam/Datakam source files must NOT be committed.
 *   - The prepared output may be committed only when explicitly generated
 *     for emulator use and confirmed to be route-scoped/bounded.
 *   - source.raw_source_committed is always false in output.
 *
 * GEOMETRY:
 *   - Haversine/equirectangular approximation — acceptable for Stage 2 baseline.
 *   - No heavyweight GIS dependencies.
 *
 * WIP TYPE MAPPING (not Product Canon):
 *   Full 12-code mapping aligned with the Datakam QA viewer.
 *   Canonical source: data/config/datakam-type-mapping.json
 *   Documentation: docs/research/datakam-openspeedcam-type-mapping.md
 *   Unknown codes → "unknown"; unknown events are preserved, not silently dropped.
 *   Each event includes source_type_label preserving the source-level type string.
 *
 * NOT Product Canon. Not navigation. Not routing. Not safety-certified.
 * Canon authority: docs/product/areas/event-data/event-data.md
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Parse --key value style CLI args. Returns a Map of key → value. */
function parseArgs(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args.set(key, next);
        i++;
      } else {
        args.set(key, true);
      }
    }
  }
  return args;
}

const cliArgs = parseArgs(process.argv.slice(2));

const routeGeoJsonPath = cliArgs.get("route");
const rawCsvPath = cliArgs.get("raw");
const routeId = cliArgs.get("route-id");
const bufferMRaw = cliArgs.get("buffer-m");
const outPath = cliArgs.get("out");

if (!routeGeoJsonPath || !rawCsvPath || !routeId || !outPath) {
  console.error(
    "Error: missing required arguments.\n" +
      "Usage: node scripts/prepareRouteEvents.mjs \\\n" +
      "  --route public/routes/Rostov1.geojson \\\n" +
      "  --raw ../../data/raw/datakam/openspeedcam.csv \\\n" +
      "  --route-id rostov1 \\\n" +
      "  --buffer-m 3000 \\\n" +
      "  --out public/route-events/Rostov1.events.json"
  );
  process.exit(1);
}

/** Corridor buffer in metres — default 3000 when --buffer-m is omitted. */
let bufferM = 3000;
if (bufferMRaw !== undefined) {
  bufferM = parseFloat(String(bufferMRaw));
  if (!Number.isFinite(bufferM) || bufferM <= 0) {
    console.error(
      `Error: --buffer-m must be a finite number greater than 0, got "${String(bufferMRaw)}"`
    );
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Geometry utilities (haversine / equirectangular approximation)
// ---------------------------------------------------------------------------

const EARTH_RADIUS_M = 6_371_000;

/** Haversine distance in metres between two WGS84 coordinate pairs. */
function haversineM(lat1, lon1, lat2, lon2) {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Compute the perpendicular distance from point P to segment AB,
 * and the along-segment fraction t ∈ [0,1].
 *
 * Uses equirectangular projection centred on the segment midpoint — acceptable
 * approximation for Stage 2 baseline distances (sub-10 km scale).
 *
 * Returns { distanceM, tFraction, projLat, projLon }
 *   distanceM     — perpendicular distance from P to the nearest segment point, in metres
 *   tFraction     — [0,1] along-segment fraction of the nearest point
 *   projLat/Lon   — WGS84 coordinates of the nearest segment point
 */
function pointToSegment(pLat, pLon, aLat, aLon, bLat, bLon) {
  const latRef = (aLat + bLat) / 2;
  const cosLat = Math.cos((latRef * Math.PI) / 180);

  const dxAB = (bLon - aLon) * cosLat;
  const dyAB = bLat - aLat;
  const dxAP = (pLon - aLon) * cosLat;
  const dyAP = pLat - aLat;

  const lenSq = dxAB * dxAB + dyAB * dyAB;

  let t = 0;
  if (lenSq > 0) {
    t = (dxAP * dxAB + dyAP * dyAB) / lenSq;
    t = Math.max(0, Math.min(1, t));
  }

  const projLon = aLon + t * (bLon - aLon);
  const projLat = aLat + t * (bLat - aLat);
  const distanceM = haversineM(pLat, pLon, projLat, projLon);

  return { distanceM, tFraction: t, projLat, projLon };
}

/**
 * Find the nearest point on a route polyline to a given (lat, lon).
 *
 * Returns:
 *   distanceToRouteM        — perpendicular distance to route in metres
 *   projectedRouteDistanceM — along-route arc-length from start to projection, in metres
 *
 * Route coordinates are [lon, lat] pairs (GeoJSON / longitude-first convention).
 */
function nearestPointOnRoute(lat, lon, routeCoords) {
  let bestDistance = Infinity;
  let bestAlongRoute = 0;

  let cumulativeArcM = 0;

  for (let i = 0; i < routeCoords.length - 1; i++) {
    const [aLon, aLat] = routeCoords[i];
    const [bLon, bLat] = routeCoords[i + 1];
    const segLenM = haversineM(aLat, aLon, bLat, bLon);

    const { distanceM, tFraction } = pointToSegment(lat, lon, aLat, aLon, bLat, bLon);

    if (distanceM < bestDistance) {
      bestDistance = distanceM;
      bestAlongRoute = cumulativeArcM + tFraction * segLenM;
    }

    cumulativeArcM += segLenM;
  }

  return {
    distanceToRouteM: bestDistance,
    projectedRouteDistanceM: bestAlongRoute,
  };
}

// ---------------------------------------------------------------------------
// WIP TYPE mapping — full 12-code mapping aligned with openSpeedcamTypeMap.ts
// and web/datakam-viewer/src/parseSpeedcam.ts.
//
// Canonical machine-readable source: data/config/datakam-type-mapping.json
// Documentation: docs/research/datakam-openspeedcam-type-mapping.md
//
// Not Product Canon. Unknown codes map to "unknown" (preserved, not dropped).
// Each event records both normalized type AND source_type_label.
// ---------------------------------------------------------------------------

/**
 * Load and index the canonical TYPE mapping from data/config/datakam-type-mapping.json.
 *
 * Returns a Map of rawType → { sourceLabel, normalizedType }.
 *
 * The mapping JSON is the single canonical reference; the TypeScript runtime
 * counterpart is web/roadahead-emulator/src/contracts/openSpeedcamTypeMap.ts.
 */
function loadTypeMappingFromJson(scriptDir) {
  const mappingPath = path.resolve(scriptDir, "../../../data/config/datakam-type-mapping.json");
  let mappingJson;
  try {
    mappingJson = JSON.parse(fs.readFileSync(mappingPath, "utf8"));
  } catch (e) {
    console.error(
      `Error: could not load TYPE mapping from ${mappingPath}\n` +
        `  ${e.message}\n` +
        "  Ensure data/config/datakam-type-mapping.json exists in the repo root."
    );
    process.exit(1);
  }
  const entries = mappingJson.entries;
  if (!Array.isArray(entries)) {
    console.error("Error: datakam-type-mapping.json must have an 'entries' array.");
    process.exit(1);
  }
  const map = new Map();
  for (const entry of entries) {
    if (typeof entry.raw_type !== "number" || typeof entry.source_label !== "string" || typeof entry.normalized_type !== "string") {
      console.error(`Error: invalid mapping entry: ${JSON.stringify(entry)}`);
      process.exit(1);
    }
    map.set(entry.raw_type, {
      sourceLabel: entry.source_label,
      normalizedType: entry.normalized_type,
    });
  }
  return map;
}

const TYPE_MAP = loadTypeMappingFromJson(__dirname);

/**
 * @param {number} rawType
 * @returns {{ normalizedType: string, sourceLabel: string }}
 */
function mapOscType(rawType) {
  const entry = TYPE_MAP.get(rawType);
  if (entry) {
    return { normalizedType: entry.normalizedType, sourceLabel: entry.sourceLabel };
  }
  return { normalizedType: "unknown", sourceLabel: "unknown" };
}

// ---------------------------------------------------------------------------
// GeoJSON route loader
// ---------------------------------------------------------------------------

/** Extract [lon, lat][] coordinates from a GeoJSON file (LineString, Feature, or FeatureCollection). */
function loadRouteCoords(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const json = JSON.parse(raw);

  if (json.type === "LineString") {
    return json.coordinates;
  }
  if (json.type === "Feature" && json.geometry?.type === "LineString") {
    return json.geometry.coordinates;
  }
  if (json.type === "FeatureCollection") {
    for (const feat of json.features ?? []) {
      if (feat.geometry?.type === "LineString") {
        return feat.geometry.coordinates;
      }
    }
    throw new Error("FeatureCollection contains no LineString feature");
  }
  throw new Error(`Unsupported GeoJSON type: "${json.type}"`);
}

// ---------------------------------------------------------------------------
// CSV parser
// ---------------------------------------------------------------------------

/**
 * Parse a raw OpenSpeedcam/Datakam CSV line into fields.
 *
 * Format: IDX,X,Y,TYPE,SPEED,DIRTYPE,DIRECTION
 *
 * Handles header lines with trailing comments:
 *   "IDX,X,Y,TYPE,SPEED,DIRTYPE,DIRECTION // OpenSpeedcam 10-03-2026 11:33"
 * and comment-only lines beginning with "//".
 *
 * Returns null for header/comment/invalid lines.
 * Returns { idx, lon, lat, type, speed, dirtype, direction } on success.
 */
function parseCsvLine(line, lineNumber) {
  const trimmed = line.trim();

  // Skip blank lines and comment-only lines
  if (!trimmed || trimmed.startsWith("//")) return null;

  // Strip trailing // comment (handles "DIRECTION // OpenSpeedcam 10-03-2026 11:33")
  const withoutComment = trimmed.split("//")[0].trim();

  const parts = withoutComment.split(",").map((p) => p.trim());

  if (parts.length < 7) return null;

  const [idxRaw, xRaw, yRaw, typeRaw, speedRaw, dirtypeRaw, dirRaw] = parts;

  // Skip header row: first field is "IDX" (case-insensitive)
  if (idxRaw.toLowerCase() === "idx") return null;

  const idx = parseInt(idxRaw, 10);
  const lon = parseFloat(xRaw); // X = longitude
  const lat = parseFloat(yRaw); // Y = latitude
  const type = parseInt(typeRaw, 10);
  const speed = parseInt(speedRaw, 10);
  const dirtype = parseInt(dirtypeRaw, 10);
  const direction = parseInt(dirRaw, 10);

  if (
    isNaN(idx) ||
    isNaN(lon) ||
    isNaN(lat) ||
    isNaN(type) ||
    isNaN(speed) ||
    isNaN(dirtype) ||
    isNaN(direction)
  ) {
    return null;
  }

  if (lon < -180 || lon > 180 || lat < -90 || lat > 90) return null;

  return { idx, lon, lat, type, speed, dirtype, direction };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log("RoadAhead prepareRouteEvents.mjs — Stage 2 / Issue #93 / Issue #95");
console.log("WIP — not Product Canon. Raw source files not committed.");
console.log("");

// Resolve paths relative to cwd (the emulator root when invoked via npm run)
const resolvedRoutePath = path.resolve(routeGeoJsonPath);
const resolvedRawPath = path.resolve(rawCsvPath);
const resolvedOutPath = path.resolve(outPath);

// ── Load route geometry ────────────────────────────────────────────────────

console.log(`Loading route geometry: ${resolvedRoutePath}`);
let routeCoords;
try {
  routeCoords = loadRouteCoords(resolvedRoutePath);
  if (!Array.isArray(routeCoords) || routeCoords.length < 2) {
    console.error("Error: route must have at least 2 coordinate pairs.");
    process.exit(1);
  }
  console.log(`  Route loaded: ${routeCoords.length} waypoints`);
} catch (e) {
  console.error(`Error loading route GeoJSON: ${e.message}`);
  process.exit(1);
}

// ── Verify raw CSV exists ──────────────────────────────────────────────────

if (!fs.existsSync(resolvedRawPath)) {
  console.error(
    `Error: raw CSV file not found: ${resolvedRawPath}\n` +
      "Raw OpenSpeedcam/Datakam files must be local-only and not committed.\n" +
      "Provide the raw file path via --raw to run the preparation script."
  );
  process.exit(1);
}

// ── Parse and filter CSV ───────────────────────────────────────────────────

console.log(`Reading raw CSV: ${resolvedRawPath}`);
console.log(`Corridor buffer: ${bufferM} m`);
console.log("");

const csvText = fs.readFileSync(resolvedRawPath, "utf8");
const lines = csvText.split(/\r?\n/);

let rawRowsScanned = 0;
let skippedInvalid = 0;
let skippedOutsideCorridor = 0;

const byType = { speed_limit: 0, static_camera: 0, road_bump: 0, unknown: 0 };
const bySourceLabel = {};
const events = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const parsed = parseCsvLine(line, i + 1);

  if (parsed === null) {
    // header / comment / blank — not counted as a raw data row
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("//") && !trimmed.toLowerCase().startsWith("idx")) {
      skippedInvalid++;
      rawRowsScanned++;
    }
    continue;
  }

  rawRowsScanned++;

  const { idx, lon, lat, type, speed, dirtype, direction } = parsed;

  // Compute distance to route
  const { distanceToRouteM, projectedRouteDistanceM } = nearestPointOnRoute(
    lat,
    lon,
    routeCoords
  );

  // Filter to corridor
  if (distanceToRouteM > bufferM) {
    skippedOutsideCorridor++;
    continue;
  }

  // Map type — full 12-code mapping from data/config/datakam-type-mapping.json
  const { normalizedType, sourceLabel } = mapOscType(type);

  // Advisory speed: use SPEED if > 0, else null
  const speedKmh = speed > 0 ? speed : null;

  byType[normalizedType]++;
  bySourceLabel[sourceLabel] = (bySourceLabel[sourceLabel] ?? 0) + 1;

  events.push({
    id: `osc_${idx}`,
    source_ref: String(idx),
    source: "openspeedcam_datakam",
    raw_type: type,
    type: normalizedType,
    source_type_label: sourceLabel,
    lon,
    lat,
    speed_kmh: speedKmh,
    dirtype,
    direction_deg: direction,
    distance_to_route_m: Math.round(distanceToRouteM * 10) / 10,
    projected_route_distance_m: Math.round(projectedRouteDistanceM * 10) / 10,
  });
}

// Sort events by projected_route_distance_m (ascending — route order)
events.sort((a, b) => a.projected_route_distance_m - b.projected_route_distance_m);

// ── Build output dataset ───────────────────────────────────────────────────

const dataset = {
  schema_version: 1,
  route_id: routeId,
  generated_at: new Date().toISOString(),
  source: {
    kind: "openspeedcam_datakam_prepared",
    raw_source_committed: false,
    raw_format: "IDX,X,Y,TYPE,SPEED,DIRTYPE,DIRECTION",
    type_mapping_ref: "data/config/datakam-type-mapping.json",
    type_mapping_doc: "docs/research/datakam-openspeedcam-type-mapping.md",
  },
  corridor: {
    buffer_m: bufferM,
  },
  summary: {
    raw_rows_scanned: rawRowsScanned,
    selected_events: events.length,
    skipped_invalid: skippedInvalid,
    skipped_outside_corridor: skippedOutsideCorridor,
    by_type: byType,
    by_source_label: bySourceLabel,
  },
  events,
};

// ── Write output ───────────────────────────────────────────────────────────

const outDir = path.dirname(resolvedOutPath);
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(resolvedOutPath, JSON.stringify(dataset, null, 2), "utf8");

// ── Print summary ──────────────────────────────────────────────────────────

console.log("── Preparation summary ─────────────────────────────────────────");
console.log(`Route ID:                ${routeId}`);
console.log(`Route waypoints:         ${routeCoords.length}`);
console.log(`Corridor buffer:         ${bufferM} m`);
console.log(`Raw rows scanned:        ${rawRowsScanned}`);
console.log(`Selected events:         ${events.length}`);
console.log(`Skipped (invalid):       ${skippedInvalid}`);
console.log(`Skipped (outside corr.): ${skippedOutsideCorridor}`);
console.log(`By normalized type:`);
console.log(`  speed_limit:           ${byType.speed_limit}`);
console.log(`  static_camera:         ${byType.static_camera}`);
console.log(`  road_bump:             ${byType.road_bump}`);
console.log(`  unknown:               ${byType.unknown}`);
console.log(`By source label:`);
const sortedLabels = Object.entries(bySourceLabel).sort((a, b) => b[1] - a[1]);
for (const [label, count] of sortedLabels) {
  console.log(`  ${label.padEnd(28)} ${count}`);
}
console.log(`Output:                  ${resolvedOutPath}`);
console.log("────────────────────────────────────────────────────────────────");
console.log("");
console.log("WIP TYPE mapping used (not Product Canon):");
console.log("  Full 12-code mapping from data/config/datakam-type-mapping.json");
console.log("  Camera types (1-5) → static_camera");
console.log("  101 → speed_limit");
console.log("  Hazard types (100, 102-106) → road_bump");
console.log("  Unknown codes → unknown (preserved, not dropped)");
console.log("  source_type_label field preserves source-level label per event");
console.log("");
console.log("Data policy:");
console.log("  Raw source file: NOT committed (local only).");
console.log("  Prepared output may be committed only if explicitly approved.");
console.log("  source.raw_source_committed = false in output.");
console.log("");
console.log("Done.");
