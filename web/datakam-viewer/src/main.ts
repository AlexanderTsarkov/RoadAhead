import L from "leaflet";
import { parseSpeedcamText, TYPE_MEANINGS, type SpeedcamRow } from "./parseSpeedcam";
import { inEllipse, type EllipseParams } from "./ellipseFilter";

// ── Type color palette ────────────────────────────────────────────────────────

const TYPE_COLORS: Record<number, string> = {
  1: "#e94560",   // static_camera — red
  2: "#ff8c42",   // traffic_light_camera — orange
  3: "#ffca3a",   // red_light_camera — yellow
  4: "#ff5a8a",   // average_speed_camera — pink
  5: "#c850c0",   // mobile_camera — purple
  100: "#6bcb77", // pedestrian_crossing — green
  101: "#4d96ff", // speed_limit — blue
  102: "#a8dadc", // speed_bump — light teal
  103: "#8b4513", // bad_road — brown
  104: "#ffa500", // dangerous_turn — amber
  105: "#e9c46a", // dangerous_intersection — sand
  106: "#9b9b9b", // other_danger — grey
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

// ── State ─────────────────────────────────────────────────────────────────────

let allRows: SpeedcamRow[] = [];
let activeTypeSet: Set<number> = new Set();
let regionMode: "all" | "ellipse" = "all";
let markers: L.CircleMarker[] = [];

// ── Map ───────────────────────────────────────────────────────────────────────

const map = L.map("map").setView([56.0, 38.0], 6);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// ── DOM refs ──────────────────────────────────────────────────────────────────

const fileInput = document.getElementById("file-input") as HTMLInputElement;
const parseStatsEl = document.getElementById("parse-stats") as HTMLDivElement;
const typeFiltersEl = document.getElementById("type-filters") as HTMLDivElement;
const applyBtn = document.getElementById("apply-btn") as HTMLButtonElement;

const elCenterLon = document.getElementById("el-centerLon") as HTMLInputElement;
const elCenterLat = document.getElementById("el-centerLat") as HTMLInputElement;
const elMajorKm = document.getElementById("el-majorKm") as HTMLInputElement;
const elMinorKm = document.getElementById("el-minorKm") as HTMLInputElement;
const elBearingDeg = document.getElementById("el-bearingDeg") as HTMLInputElement;
const regionRadios = document.querySelectorAll<HTMLInputElement>(
  'input[name="region-mode"]'
);

// ── File loading ──────────────────────────────────────────────────────────────

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const text = reader.result as string;
    const result = parseSpeedcamText(text);
    allRows = result.rows;

    renderParseStats(result.totalPhysicalLines, result.parsedValid, result.skippedInvalid, result.distinctTypes, result.unknownTypes);
    buildTypeFilters(result.distinctTypes);
    applyBtn.disabled = false;
    applyAndRender();
  };
  reader.readAsText(file, "utf-8");
});

// ── Parse stats ───────────────────────────────────────────────────────────────

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

// ── Type filter checkboxes ────────────────────────────────────────────────────

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

  typeFiltersEl.addEventListener("change", (e) => {
    const cb = e.target as HTMLInputElement;
    if (cb.type !== "checkbox") return;
    const t = parseInt(cb.dataset["type"]!, 10);
    if (cb.checked) {
      activeTypeSet.add(t);
    } else {
      activeTypeSet.delete(t);
    }
    renderMarkers();
  });
}

// ── Region mode ───────────────────────────────────────────────────────────────

regionRadios.forEach((radio) => {
  radio.addEventListener("change", () => {
    if (radio.checked) {
      regionMode = radio.value as "all" | "ellipse";
    }
  });
});

// ── Apply button ──────────────────────────────────────────────────────────────

applyBtn.addEventListener("click", () => {
  applyAndRender();
});

function applyAndRender(): void {
  renderMarkers();
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function getEllipseParams(): EllipseParams {
  return {
    centerLon: parseFloat(elCenterLon.value),
    centerLat: parseFloat(elCenterLat.value),
    majorAxisKm: parseFloat(elMajorKm.value),
    minorAxisKm: parseFloat(elMinorKm.value),
    bearingDeg: parseFloat(elBearingDeg.value),
  };
}

function buildPopupHtml(row: SpeedcamRow): string {
  const rows: [string, string][] = [
    ["IDX", String(row.idx)],
    ["TYPE (raw)", String(row.type)],
    ["TYPE (normalized)", row.normalizedType],
    ["SPEED", String(row.speed)],
    ["DIRTYPE", String(row.dirtype)],
    ["DIRECTION", String(row.direction)],
    ["lon", row.lon.toFixed(6)],
    ["lat", row.lat.toFixed(6)],
  ];

  const trs = rows
    .map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`)
    .join("");

  return `<table class="popup-table">${trs}</table>`;
}

function renderMarkers(): void {
  markers.forEach((m) => m.remove());
  markers = [];

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
    marker.bindPopup(buildPopupHtml(row), { maxWidth: 260 });
    marker.addTo(map);
    markers.push(marker);
  }
}
