import L from "leaflet";
import { parseSpeedcamText, TYPE_MEANINGS, type SpeedcamRow } from "./parseSpeedcam";
import { inEllipse, type EllipseParams } from "./ellipseFilter";

// -- Type color palette -------------------------------------------------------

const TYPE_COLORS: Record<number, string> = {
  1: "#e94560",   // static_camera -- red
  2: "#ff8c42",   // traffic_light_camera -- orange
  3: "#ffca3a",   // red_light_camera -- yellow
  4: "#ff5a8a",   // average_speed_camera -- pink
  5: "#c850c0",   // mobile_camera -- purple
  100: "#6bcb77", // pedestrian_crossing -- green
  101: "#4d96ff", // speed_limit -- blue
  102: "#a8dadc", // speed_bump -- light teal
  103: "#8b4513", // bad_road -- brown
  104: "#ffa500", // dangerous_turn -- amber
  105: "#e9c46a", // dangerous_intersection -- sand
  106: "#9b9b9b", // other_danger -- grey
};

const DEFAULT_COLOR = "#ffffff";

function typeColor(type: number): string {
  return TYPE_COLORS[type] ?? DEFAULT_COLOR;
}

function makeIcon(color: string): L.CircleMarkerOptions {
  return {
    radius: 5,
    fillColor: color,
    color: "#000",
    weight: 0.8,
    opacity: 0.9,
    fillOpacity: 0.85,
  };
}

// -- Manual QA state ----------------------------------------------------------

const QA_STORAGE_KEY = "roadahead.datakamViewer.manualQa.v1";
const QA_SCHEMA_VERSION = 1;

const VISUAL_QA_STATUSES = [
  "unknown",
  "looks_correct",
  "wrong",
  "needs_drive",
  "missing_here",
] as const;

type VisualQaStatus = (typeof VISUAL_QA_STATUSES)[number];

const VISUAL_QA_LABELS: Record<VisualQaStatus, string> = {
  unknown: "unknown",
  looks_correct: "looks_correct",
  wrong: "wrong",
  needs_drive: "needs_drive",
  missing_here: "missing_here",
};

const DIRECTION_SEMANTICS_STATUSES = [
  "unknown",
  "likely_vehicle_travel_direction",
  "likely_camera_or_sign_facing_direction",
  "opposite_of_vehicle_direction",
  "unclear_or_wrong",
] as const;

type DirectionSemanticsStatus = (typeof DIRECTION_SEMANTICS_STATUSES)[number];

const DIRECTION_SEMANTICS_LABELS: Record<DirectionSemanticsStatus, string> = {
  unknown: "unknown",
  likely_vehicle_travel_direction: "likely_vehicle_travel_direction",
  likely_camera_or_sign_facing_direction: "likely_camera_or_sign_facing_direction",
  opposite_of_vehicle_direction: "opposite_of_vehicle_direction",
  unclear_or_wrong: "unclear_or_wrong",
};

interface QaRecord {
  schemaVersion: number;
  source: "datakam_speedcam";
  observationKey: string;
  idx: number;
  lon: number;
  lat: number;
  type: number;
  normalizedType: string;
  visualQaStatus: VisualQaStatus;
  directionSemanticsStatus: DirectionSemanticsStatus;
  updatedAt: string;
}

function isVisualQaStatus(value: string): value is VisualQaStatus {
  return (VISUAL_QA_STATUSES as readonly string[]).includes(value);
}

function isDirectionSemanticsStatus(value: string): value is DirectionSemanticsStatus {
  return (DIRECTION_SEMANTICS_STATUSES as readonly string[]).includes(value);
}

function observationKey(row: SpeedcamRow): string {
  return `datakam:${row.idx}`;
}

function makeQaRecord(row: SpeedcamRow): QaRecord {
  return {
    schemaVersion: QA_SCHEMA_VERSION,
    source: "datakam_speedcam",
    observationKey: observationKey(row),
    idx: row.idx,
    lon: row.lon,
    lat: row.lat,
    type: row.type,
    normalizedType: row.normalizedType,
    visualQaStatus: "unknown",
    directionSemanticsStatus: "unknown",
    updatedAt: new Date().toISOString(),
  };
}

function readStoredQaRecords(): Map<string, QaRecord> {
  const records = new Map<string, QaRecord>();
  const raw = localStorage.getItem(QA_STORAGE_KEY);
  if (!raw) return records;

  try {
    const parsed = JSON.parse(raw) as { records?: unknown };
    if (!Array.isArray(parsed.records)) return records;

    for (const item of parsed.records) {
      const record = item as Partial<QaRecord>;
      if (typeof record.observationKey !== "string") continue;
      const visualQaStatus = record.visualQaStatus;
      const directionSemanticsStatus = record.directionSemanticsStatus;
      if (typeof visualQaStatus !== "string" || !isVisualQaStatus(visualQaStatus)) continue;
      if (typeof directionSemanticsStatus !== "string" || !isDirectionSemanticsStatus(directionSemanticsStatus)) continue;

      records.set(record.observationKey, {
        schemaVersion: QA_SCHEMA_VERSION,
        source: "datakam_speedcam",
        observationKey: record.observationKey,
        idx: Number(record.idx),
        lon: Number(record.lon),
        lat: Number(record.lat),
        type: Number(record.type),
        normalizedType: String(record.normalizedType ?? "unknown"),
        visualQaStatus,
        directionSemanticsStatus,
        updatedAt: String(record.updatedAt ?? new Date().toISOString()),
      });
    }
  } catch {
    return new Map<string, QaRecord>();
  }

  return records;
}

function sortedQaRecords(): QaRecord[] {
  return [...qaRecordsByKey.values()].sort((a, b) => a.idx - b.idx);
}

function saveQaRecords(): void {
  localStorage.setItem(
    QA_STORAGE_KEY,
    JSON.stringify(
      {
        schemaVersion: QA_SCHEMA_VERSION,
        source: "datakam_speedcam",
        savedAt: new Date().toISOString(),
        records: sortedQaRecords(),
      },
      null,
      2
    )
  );
}

function setQaRecord(
  row: SpeedcamRow,
  updates: Partial<Pick<QaRecord, "visualQaStatus" | "directionSemanticsStatus">>
): void {
  const key = observationKey(row);
  const existing = qaRecordsByKey.get(key) ?? makeQaRecord(row);
  const next: QaRecord = {
    ...existing,
    schemaVersion: QA_SCHEMA_VERSION,
    source: "datakam_speedcam",
    observationKey: key,
    idx: row.idx,
    lon: row.lon,
    lat: row.lat,
    type: row.type,
    normalizedType: row.normalizedType,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  qaRecordsByKey.set(key, next);
  saveQaRecords();
  renderQaSummary();
}

// -- Direction arrows ---------------------------------------------------------

const DIRECTION_PANE = "direction-arrows";
const EARTH_RADIUS_M = 6371000;
const ARROW_SHAFT_M = 115;
const ARROW_BACK_M = 35;
const ARROW_HEAD_M = 24;
const ARROW_HEAD_ANGLE_DEG = 150;

function normalizeBearing(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

function isDrawableDirection(row: SpeedcamRow): boolean {
  return (row.dirtype === 1 || row.dirtype === 2) && Number.isFinite(row.direction);
}

function offsetLatLon(lat: number, lon: number, bearingDeg: number, meters: number): L.LatLngTuple {
  const bearing = (normalizeBearing(bearingDeg) * Math.PI) / 180;
  const angularDistance = meters / EARTH_RADIUS_M;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );

  return [(lat2 * 180) / Math.PI, (lon2 * 180) / Math.PI];
}

function createDirectionArrow(row: SpeedcamRow, bearingDeg: number): L.LayerGroup {
  const color = typeColor(row.type);
  const start = offsetLatLon(row.lat, row.lon, bearingDeg + 180, ARROW_BACK_M);
  const end = offsetLatLon(row.lat, row.lon, bearingDeg, ARROW_SHAFT_M);
  const headLeft = offsetLatLon(end[0], end[1], bearingDeg + ARROW_HEAD_ANGLE_DEG, ARROW_HEAD_M);
  const headRight = offsetLatLon(end[0], end[1], bearingDeg - ARROW_HEAD_ANGLE_DEG, ARROW_HEAD_M);

  const lineOptions: L.PolylineOptions = {
    color,
    weight: 2,
    opacity: 0.9,
    pane: DIRECTION_PANE,
    interactive: false,
  };

  return L.layerGroup([
    L.polyline([start, end], lineOptions),
    L.polyline([headLeft, end, headRight], lineOptions),
  ]);
}

function renderDirectionArrows(row: SpeedcamRow): void {
  if (!showDirectionArrows || !isDrawableDirection(row)) return;

  const bearing = normalizeBearing(row.direction);
  createDirectionArrow(row, bearing).addTo(directionLayerGroup);

  if (row.dirtype === 2) {
    createDirectionArrow(row, bearing + 180).addTo(directionLayerGroup);
  }
}

function describeDirectionArrows(row: SpeedcamRow): string {
  if (!isDrawableDirection(row)) return "not drawn";
  const bearing = normalizeBearing(row.direction);
  if (row.dirtype === 1) return `one source arrow at ${bearing}°`;
  return `two opposite source arrows at ${bearing}° / ${normalizeBearing(bearing + 180)}°`;
}

// -- State --------------------------------------------------------------------

let allRows: SpeedcamRow[] = [];
let rowByObservationKey: Map<string, SpeedcamRow> = new Map();
let qaRecordsByKey: Map<string, QaRecord> = readStoredQaRecords();
let activeTypeSet: Set<number> = new Set();
let regionMode: "all" | "ellipse" = "all";
let showDirectionArrows = true;
let markers: L.CircleMarker[] = [];

// -- Map ----------------------------------------------------------------------

const map = L.map("map").setView([56.0, 38.0], 6);
const directionPane = map.createPane(DIRECTION_PANE);
directionPane.style.zIndex = "450";
directionPane.style.pointerEvents = "none";
const directionLayerGroup = L.layerGroup().addTo(map);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// -- DOM refs -----------------------------------------------------------------

const fileInput = document.getElementById("file-input") as HTMLInputElement;
const parseStatsEl = document.getElementById("parse-stats") as HTMLDivElement;
const typeFiltersEl = document.getElementById("type-filters") as HTMLDivElement;
const applyBtn = document.getElementById("apply-btn") as HTMLButtonElement;
const directionArrowsToggle = document.getElementById("direction-arrows-toggle") as HTMLInputElement;
const qaSummaryEl = document.getElementById("qa-summary") as HTMLDivElement;
const exportQaBtn = document.getElementById("export-qa-btn") as HTMLButtonElement;

const elCenterLon = document.getElementById("el-centerLon") as HTMLInputElement;
const elCenterLat = document.getElementById("el-centerLat") as HTMLInputElement;
const elMajorKm = document.getElementById("el-majorKm") as HTMLInputElement;
const elMinorKm = document.getElementById("el-minorKm") as HTMLInputElement;
const elBearingDeg = document.getElementById("el-bearingDeg") as HTMLInputElement;
const regionRadios = document.querySelectorAll<HTMLInputElement>(
  'input[name="region-mode"]'
);

// -- File loading -------------------------------------------------------------

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const text = reader.result as string;
    const result = parseSpeedcamText(text);
    allRows = result.rows;
    rowByObservationKey = new Map(allRows.map((row) => [observationKey(row), row]));

    renderParseStats(result.totalPhysicalLines, result.parsedValid, result.skippedInvalid, result.distinctTypes, result.unknownTypes);
    buildTypeFilters(result.distinctTypes);
    applyBtn.disabled = false;
    applyAndRender();
  };
  reader.readAsText(file, "utf-8");
});

// -- Parse stats --------------------------------------------------------------

function renderParseStats(
  total: number,
  valid: number,
  skipped: number,
  distinct: number[],
  unknown: number[]
): void {
  const unknownStr =
    unknown.length > 0
      ? `<div><span class="stat-label">Unknown types:</span> <span class="stat-warn">${unknown.join(", ")}</span></div>`
      : `<div><span class="stat-label">Unknown types:</span> <span class="stat-ok">none</span></div>`;

  parseStatsEl.innerHTML = `
    <div><span class="stat-label">Physical lines:</span> ${total.toLocaleString()}</div>
    <div><span class="stat-label">Parsed valid rows:</span> <span class="stat-ok">${valid.toLocaleString()}</span></div>
    <div><span class="stat-label">Skipped / invalid:</span> ${skipped.toLocaleString()}</div>
    <div><span class="stat-label">Distinct types:</span> ${distinct.length}</div>
    ${unknownStr}
  `;
  parseStatsEl.classList.remove("hidden");
}

// -- Type filter checkboxes ---------------------------------------------------

function buildTypeFilters(distinctTypes: number[]): void {
  activeTypeSet = new Set(distinctTypes);
  typeFiltersEl.innerHTML = "";

  for (const t of distinctTypes) {
    const label = TYPE_MEANINGS[t] ?? `unknown (${t})`;
    const color = typeColor(t);
    const count = allRows.filter((r) => r.type === t).length;

    const row = document.createElement("label");
    row.className = "type-filter-row";
    row.innerHTML = `
      <input type="checkbox" data-type="${t}" checked />
      <span class="dot" style="background:${color}"></span>
      <span class="label-text">${t} · ${label}</span>
      <span class="count-badge">${count.toLocaleString()}</span>
    `;
    typeFiltersEl.appendChild(row);
  }
}

typeFiltersEl.addEventListener("change", (e) => {
  const cb = e.target as HTMLInputElement;
  if (cb.type !== "checkbox") return;
  const typeValue = cb.dataset["type"];
  if (!typeValue) return;

  const t = parseInt(typeValue, 10);
  if (cb.checked) {
    activeTypeSet.add(t);
  } else {
    activeTypeSet.delete(t);
  }
  renderMarkers();
});

// -- Direction display toggle -------------------------------------------------

directionArrowsToggle.addEventListener("change", () => {
  showDirectionArrows = directionArrowsToggle.checked;
  renderMarkers();
});

// -- Manual QA controls -------------------------------------------------------

document.addEventListener("change", (e) => {
  const select = e.target as HTMLSelectElement;
  if (!select.classList.contains("qa-select")) return;

  const key = select.dataset["observationKey"];
  const kind = select.dataset["qaKind"];
  if (!key || !kind) return;

  const row = rowByObservationKey.get(key);
  if (!row) return;

  if (kind === "visual" && isVisualQaStatus(select.value)) {
    setQaRecord(row, { visualQaStatus: select.value });
    return;
  }

  if (kind === "direction" && isDirectionSemanticsStatus(select.value)) {
    setQaRecord(row, { directionSemanticsStatus: select.value });
  }
});

exportQaBtn.addEventListener("click", () => {
  exportQaJson();
});

function countQaStatus<T extends string>(records: QaRecord[], selector: (record: QaRecord) => T): Map<T, number> {
  const counts = new Map<T, number>();
  for (const record of records) {
    const status = selector(record);
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }
  return counts;
}

function renderStatusCounts<T extends string>(
  values: readonly T[],
  labels: Record<T, string>,
  counts: Map<T, number>
): string {
  return values
    .map(
      (value) => `
        <div class="qa-count-row">
          <span>${labels[value]}</span>
          <strong>${counts.get(value) ?? 0}</strong>
        </div>
      `
    )
    .join("");
}

function renderQaSummary(): void {
  const records = sortedQaRecords();
  exportQaBtn.disabled = records.length === 0;

  if (records.length === 0) {
    qaSummaryEl.innerHTML = `
      <p class="hint">No manual QA records yet. Open a marker popup and assign statuses.</p>
    `;
    return;
  }

  const visualCounts = countQaStatus(records, (record) => record.visualQaStatus);
  const directionCounts = countQaStatus(records, (record) => record.directionSemanticsStatus);

  qaSummaryEl.innerHTML = `
    <div class="qa-total"><span>Stored QA records</span><strong>${records.length.toLocaleString()}</strong></div>
    <h3>Visual QA</h3>
    ${renderStatusCounts(VISUAL_QA_STATUSES, VISUAL_QA_LABELS, visualCounts)}
    <h3>Direction semantics</h3>
    ${renderStatusCounts(DIRECTION_SEMANTICS_STATUSES, DIRECTION_SEMANTICS_LABELS, directionCounts)}
  `;
}

function exportQaJson(): void {
  const payload = {
    schemaVersion: QA_SCHEMA_VERSION,
    source: "datakam_speedcam",
    exportedAt: new Date().toISOString(),
    note: "Manual QA statuses apply to Datakam ExternalObservation candidate rows only; they do not promote rows to VerifiedRoadEvent.",
    records: sortedQaRecords(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `datakam-manual-qa-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

// -- Region mode --------------------------------------------------------------

regionRadios.forEach((radio) => {
  radio.addEventListener("change", () => {
    if (radio.checked) {
      regionMode = radio.value as "all" | "ellipse";
    }
  });
});

// -- Apply button -------------------------------------------------------------

applyBtn.addEventListener("click", () => {
  applyAndRender();
});

function applyAndRender(): void {
  renderMarkers();
}

// -- Rendering ----------------------------------------------------------------

function getEllipseParams(): EllipseParams {
  return {
    centerLon: parseFloat(elCenterLon.value),
    centerLat: parseFloat(elCenterLat.value),
    majorAxisKm: parseFloat(elMajorKm.value),
    minorAxisKm: parseFloat(elMinorKm.value),
    bearingDeg: parseFloat(elBearingDeg.value),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildStatusSelect<T extends string>(
  qaKind: "visual" | "direction",
  key: string,
  selected: T,
  values: readonly T[],
  labels: Record<T, string>
): string {
  const options = values
    .map((value) => {
      const selectedAttr = value === selected ? " selected" : "";
      return `<option value="${escapeHtml(value)}"${selectedAttr}>${escapeHtml(labels[value])}</option>`;
    })
    .join("");

  return `
    <select class="qa-select" data-qa-kind="${qaKind}" data-observation-key="${escapeHtml(key)}">
      ${options}
    </select>
  `;
}

function buildPopupHtml(row: SpeedcamRow): string {
  const key = observationKey(row);
  const qa = qaRecordsByKey.get(key) ?? makeQaRecord(row);
  const rows: [string, string][] = [
    ["IDX", String(row.idx)],
    ["TYPE (raw)", String(row.type)],
    ["TYPE (normalized)", row.normalizedType],
    ["SPEED", String(row.speed)],
    ["DIRTYPE", String(row.dirtype)],
    ["DIRECTION", String(row.direction)],
    ["source arrows", describeDirectionArrows(row)],
    ["lon", row.lon.toFixed(6)],
    ["lat", row.lat.toFixed(6)],
  ];

  const trs = rows
    .map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`)
    .join("");

  return `
    <table class="popup-table">${trs}</table>
    <div class="popup-qa">
      <label>
        <span>Visual QA</span>
        ${buildStatusSelect("visual", key, qa.visualQaStatus, VISUAL_QA_STATUSES, VISUAL_QA_LABELS)}
      </label>
      <label>
        <span>Direction semantics</span>
        ${buildStatusSelect("direction", key, qa.directionSemanticsStatus, DIRECTION_SEMANTICS_STATUSES, DIRECTION_SEMANTICS_LABELS)}
      </label>
    </div>
  `;
}

function renderMarkers(): void {
  markers.forEach((m) => m.remove());
  markers = [];
  directionLayerGroup.clearLayers();

  const ellipseParams = getEllipseParams();

  for (const row of allRows) {
    if (!activeTypeSet.has(row.type)) continue;

    if (regionMode === "ellipse") {
      if (!inEllipse(row.lon, row.lat, ellipseParams)) continue;
    }

    const marker = L.circleMarker(
      [row.lat, row.lon],
      makeIcon(typeColor(row.type))
    );
    marker.bindPopup(buildPopupHtml(row), { maxWidth: 360 });
    marker.addTo(map);
    markers.push(marker);
    renderDirectionArrows(row);
  }
}

renderQaSummary();
