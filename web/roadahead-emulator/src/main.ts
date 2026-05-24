/**
 * RoadAhead Phase 0 — Web Route Emulator
 * Slice 4.1 / Issue #49: route projection baseline
 * Slice 4.2 / Issue #51: direction compatibility baseline
 * Slice 4.3 / Issue #53: applicability suppression reason model
 * Slice 4.4 / Issue #55: debug accepted / suppressed view
 * Slice 4.5 / Issue #57: synthetic applicability fixture cases
 * Slice 4.6 / Issue #63: sticky operator simulation header
 *
 * Wires together synthetic fixtures, emulator logic, and a minimal UI.
 *
 * EMULATOR DEBUG / QA UI — NOT THE DRIVER-FACING UI.
 * Not the final delivery surface. Not a navigator. Not an anti-radar.
 * Not a legal speed-limit authority. Not safety-certified.
 * All numeric values shown are WIP emulator defaults — not Product Canon.
 * Reason / status names used in the debug panel are WIP / not Product Canon.
 *
 * No provider API, no network calls, no user account required.
 * Uses synthetic fixtures only (Slice 2 / Issue #44).
 *
 * Canon authority: docs/product/areas/
 */

import "./style.css";
import { SYNTHETIC_ROUTE } from "./fixtures/routeGeometry.synthetic.js";
import { SYNTHETIC_PREPARED_EVENTS } from "./fixtures/preparedEvents.synthetic.js";
import { EMULATOR_TUNING_DEFAULTS } from "./config/emulatorTuningDefaults.js";
import {
  computeSimulationState,
  type SimulationState,
} from "./emulator/simulationState.js";
import { getRouteLonSpan } from "./emulator/routeProgress.js";
import type { EventSelectionRecord } from "./emulator/minimalEventSelection.js";

// ---------------------------------------------------------------------------
// Mutable simulation inputs (user-controlled)
// ---------------------------------------------------------------------------

/** Route progress percentage: 0–100. Converted to [0,1] for logic. */
let routeProgressPct = 0;

/**
 * Current simulated speed in km/h.
 * No provider speed is used.
 * (validation-emulator Canon truth 6)
 */
let currentSpeedKmh = 60;

// ---------------------------------------------------------------------------
// Debug filter state
//
// Controls which event groups are visible in the debug table.
// This filter affects debug table visibility only — it does NOT change event
// selection behavior. Accepted/suppressed grouping is based on
// applicabilityReason.kind and applicabilityReason.is_driver_facing_eligible.
//
// "all"             — show all events regardless of kind
// "accepted"        — show only applicabilityReason.kind === "accepted"
// "suppressed"      — show only applicabilityReason.kind === "suppressed"
// "not_driver_facing" — show all where is_driver_facing_eligible === false
//                       (covers suppressed + not_processed)
//
// WIP — NOT Product Canon. Filter state is local to this emulator session.
// ---------------------------------------------------------------------------

type DebugFilterMode = "all" | "accepted" | "suppressed" | "not_driver_facing";
let debugFilter: DebugFilterMode = "all";

// ---------------------------------------------------------------------------
// State computation
// ---------------------------------------------------------------------------

function getState(): SimulationState {
  return computeSimulationState(
    routeProgressPct / 100,
    currentSpeedKmh,
    SYNTHETIC_ROUTE,
    SYNTHETIC_PREPARED_EVENTS,
    EMULATOR_TUNING_DEFAULTS
  );
}

// ---------------------------------------------------------------------------
// DOM construction
// ---------------------------------------------------------------------------

function buildApp(): void {
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) throw new Error("Root #app element not found");

  const { minLon, maxLon } = getRouteLonSpan(SYNTHETIC_ROUTE);

  // ---------------------------------------------------------------------------
  // Sticky operator simulation header (Slice 4.6 / Issue #63)
  //
  // The op-header is position:sticky so it remains visible while scrolling the
  // debug table below. Controls and the three-circle display are housed here.
  //
  // EMULATOR OPERATOR / QA UI ONLY — NOT THE DRIVER-FACING UI.
  // Not final UX design. All values are WIP emulator defaults — not Canon.
  //
  // The same DOM IDs used by attachControls() (progress-slider, speed-input,
  // speed-down-10, speed-down-1, speed-up-1, speed-up-10) and renderThreeCircles()
  // (three-circles, speed-ref-state-row) are preserved in the sticky header so
  // those functions wire and render correctly without changes.
  // ---------------------------------------------------------------------------

  app.innerHTML = `
    <div id="op-header" class="op-header" aria-label="Operator simulation header — emulator debug / QA only">
      <div class="op-header-row op-header-top-row">
        <span class="op-header-title">RoadAhead Phase 0 · Operator Simulation</span>
        <span class="op-header-wip-badge">debug / QA only — not driver-facing UI</span>
        <span class="op-header-route-info">
          Synthetic E-bound · lon ${minLon.toFixed(3)}° → ${maxLon.toFixed(3)}° ·
          ${SYNTHETIC_PREPARED_EVENTS.length} events · no real GPS
        </span>
      </div>

      <div class="op-header-row op-header-controls-row">
        <div class="op-controls-block">
          <div class="control-row">
            <label for="progress-slider" class="control-label">Route Progress</label>
            <input
              type="range"
              id="progress-slider"
              min="0" max="100" value="0" step="1"
              class="progress-slider"
            >
            <span id="progress-display" class="control-value">0%</span>
          </div>
          <div class="control-row">
            <label class="control-label">Current Speed</label>
            <div class="speed-control-group">
              <button id="speed-down-10" class="speed-btn" type="button">−10</button>
              <button id="speed-down-1" class="speed-btn" type="button">−1</button>
              <input
                type="number"
                id="speed-input"
                value="60"
                min="0" max="250" step="1"
                class="speed-input"
              >
              <button id="speed-up-1" class="speed-btn" type="button">+1</button>
              <button id="speed-up-10" class="speed-btn" type="button">+10</button>
              <span class="unit">km/h</span>
            </div>
          </div>
        </div>
      </div>

      <div class="op-header-row op-header-state-row">
        <div class="op-circles-wrap">
          <div class="three-circles" id="three-circles"><!-- populated by render() --></div>
          <p class="speed-ref-state-row" id="speed-ref-state-row"><!-- populated by render() --></p>
        </div>
        <div class="op-summary" id="op-summary"><!-- populated by renderOperatorHeader() --></div>
      </div>
    </div>

    <header>
      <h1>RoadAhead Phase 0 — Web Route Emulator</h1>
      <p class="subtitle">
        Phase 0 validation emulator · Slice 4.6 — sticky operator simulation header ·
        emulator debug / QA UI only — not the driver-facing UI · not final UX design
      </p>
    </header>

    <main>
      <section class="wip-notice">
        <strong>Emulator debug / QA tool only — NOT the driver-facing UI.</strong>
        Not a navigator. Not an anti-radar. Not a legal speed-limit authority.
        Not safety-certified. All numeric values are WIP emulator defaults, not Product Canon.
        Reason / status names shown in the debug panel are WIP / not Product Canon.
        Uses <strong>synthetic fixtures only</strong> — no Yandex API, no provider, no network,
        no account required.
      </section>

      <section class="debug-section" id="debug-section">
        <!-- populated by render() -->
      </section>

      <section class="canon-guardrails">
        <h2>Product Canon guardrails</h2>
        <ul>
          <li>RoadAhead is <strong>not</strong> a navigator.</li>
          <li>RoadAhead is <strong>not</strong> an anti-radar.</li>
          <li>RoadAhead is <strong>not</strong> a legal speed-limit authority.</li>
          <li>RoadAhead is <strong>not</strong> safety-certified.</li>
          <li>External road-event data is <strong>candidate input only</strong>, not verified RoadAhead truth.</li>
          <li>Raw Datakam / OpenSpeedcam data is <strong>import / source material only</strong>.</li>
          <li>Route providers may supply <strong>geometry only</strong>; provider non-geometry signals are not RoadAhead truth.</li>
          <li><strong>No numeric tuning value is Product Canon</strong> at this stage.</li>
          <li>Projection values and direction compatibility values shown in the debug panel are <strong>per-session derived data only</strong> — not persisted to base fixture files.</li>
          <li>Direction compatibility shown is a <strong>WIP baseline (Slice 4.2)</strong> — candidate semantics only. Branch/ramp/parallel-carriageway ambiguity handling is deferred to later child issues.</li>
          <li>Applicability reason codes (Slice 4.3) are <strong>per-session derived WIP debug data, not Product Canon</strong>. Full reason taxonomy is deferred to later child issues under Issue #48.</li>
          <li>The debug accepted/suppressed grouping (Slice 4.4) reflects the simplified Slices 4.1–4.3 baseline only — <strong>debug visibility does not imply driver-facing eligibility</strong>.</li>
          <li>Source direction fields (<code>source_direction_deg</code>, <code>source_dirtype</code>) are <strong>candidate metadata only</strong> — not verified truth. (event-applicability Canon truth 8)</li>
        </ul>
        <p class="authority-note">
          <strong>Product Canon is the primary authority.</strong>
          See <code>docs/product/areas/</code> in the repository.
          This emulator is a WIP validation / QA tool.
        </p>
      </section>
    </main>
  `;

  attachControls();
  render();
}

// ---------------------------------------------------------------------------
// Control wiring
// ---------------------------------------------------------------------------

function attachControls(): void {
  const progressSlider = document.getElementById(
    "progress-slider"
  ) as HTMLInputElement | null;
  const speedInputEl = document.getElementById(
    "speed-input"
  ) as HTMLInputElement | null;

  progressSlider?.addEventListener("input", () => {
    routeProgressPct = parseInt(progressSlider.value, 10);
    render();
  });

  speedInputEl?.addEventListener("change", () => {
    const val = parseInt(speedInputEl.value, 10);
    if (!isNaN(val)) {
      currentSpeedKmh = clampSpeed(val);
      speedInputEl.value = String(currentSpeedKmh);
      render();
    }
  });

  document
    .getElementById("speed-down-10")
    ?.addEventListener("click", () => adjustSpeed(-10));
  document
    .getElementById("speed-down-1")
    ?.addEventListener("click", () => adjustSpeed(-1));
  document
    .getElementById("speed-up-1")
    ?.addEventListener("click", () => adjustSpeed(1));
  document
    .getElementById("speed-up-10")
    ?.addEventListener("click", () => adjustSpeed(10));
}

function clampSpeed(v: number): number {
  return Math.max(0, Math.min(250, v));
}

function adjustSpeed(delta: number): void {
  currentSpeedKmh = clampSpeed(currentSpeedKmh + delta);
  const el = document.getElementById("speed-input") as HTMLInputElement | null;
  if (el) el.value = String(currentSpeedKmh);
  render();
}

// ---------------------------------------------------------------------------
// Render cycle
//
// NOTE: renderThreeCircles and renderDebugPanel are kept as flat functions in
// this file for simplicity. If the UI grows significantly in later slices,
// consider extracting them to dedicated rendering modules under src/ui/.
// Do not refactor now.
// ---------------------------------------------------------------------------

function render(): void {
  const state = getState();
  updateProgressDisplay();
  renderThreeCircles(state);
  renderOperatorHeader(state);
  renderDebugPanel(state);
}

function updateProgressDisplay(): void {
  const el = document.getElementById("progress-display");
  if (el) el.textContent = `${routeProgressPct}%`;
}

// ---------------------------------------------------------------------------
// Three-circle display
// ---------------------------------------------------------------------------

function renderThreeCircles(state: SimulationState): void {
  const container = document.getElementById("three-circles");
  if (!container) return;

  const { primary, secondary } = state.eventSelection;
  const refState = state.speedReference.state;

  const primarySpeedText =
    primary?.target_speed_kmh != null
      ? String(primary.target_speed_kmh)
      : "–";
  const primarySubLabel =
    primary != null
      ? `${primary.event_id}`
      : "no applicable event";

  const secondarySpeedText =
    secondary?.target_speed_kmh != null
      ? String(secondary.target_speed_kmh)
      : "–";
  const secondarySubLabel =
    secondary != null ? `next in window: ${secondary.event_id}` : "–";

  const primaryActiveClass =
    refState === "approach_target" ? "circle-state-active" : "circle-state-inactive";

  container.innerHTML = `
    <div class="circle circle-current" title="Simulated current speed (manual control)">
      <div class="circle-value">${state.speedKmh}</div>
      <div class="circle-label">current speed<br><span class="circle-unit">km/h</span></div>
    </div>

    <div class="circle circle-primary ${primaryActiveClass}" title="Primary applicable event — advisory target speed">
      <div class="circle-value">${primarySpeedText}</div>
      <div class="circle-label">primary event<br><span class="circle-sublabel">${escapeHtml(primarySubLabel)}</span></div>
    </div>

    <div class="circle circle-secondary" title="Secondary context — next event inside simplified candidate window (not global next event; full secondary semantics are WIP)">
      <div class="circle-value">${secondarySpeedText}</div>
      <div class="circle-label">secondary<br><span class="circle-sublabel">${escapeHtml(secondarySubLabel)}</span></div>
    </div>
  `;

  const stateRow = document.getElementById("speed-ref-state-row");
  if (stateRow) {
    const stateClass =
      refState === "approach_target" ? "state-approach-target" : "state-unknown";
    stateRow.innerHTML =
      `Speed reference state: ` +
      `<strong class="${stateClass}">${escapeHtml(refState)}</strong> — ` +
      `<span class="state-reason">${escapeHtml(state.speedReference.reason)}</span>`;
  }
}

// ---------------------------------------------------------------------------
// Operator header — sticky summary (Slice 4.6 / Issue #63)
//
// EMULATOR OPERATOR / QA UI ONLY — NOT THE DRIVER-FACING UI.
// The sticky header summarises the live simulation state so the operator can
// monitor primary event, speed reference state, target speed, and event
// selection counts while scrolling the debug table below.
//
// All values are derived from SimulationState and are WIP emulator defaults —
// not Product Canon. No domain logic is duplicated here.
// ---------------------------------------------------------------------------

/**
 * Derive accepted / suppressed / not_processed counts from simulation state.
 *
 * Uses applicabilityReason.kind from each EventSelectionRecord.
 * Counts match the debug table grouping exactly.
 *
 * EMULATOR DEBUG / QA ONLY — not driver-facing.
 */
function getEventSelectionSummary(state: SimulationState): {
  acceptedCount: number;
  suppressedCount: number;
  notProcessedCount: number;
} {
  const records = state.eventSelection.records;
  return {
    acceptedCount: records.filter((r) => r.applicabilityReason.kind === "accepted").length,
    suppressedCount: records.filter((r) => r.applicabilityReason.kind === "suppressed").length,
    notProcessedCount: records.filter((r) => r.applicabilityReason.kind === "not_processed").length,
  };
}

/**
 * Render the live summary strip inside the sticky operator header.
 *
 * Updates #op-summary with:
 *   - primary event id (or "none")
 *   - speed reference state
 *   - target speed if any
 *   - accepted / suppressed / not_processed counts
 *   - current primary reason code if available
 *
 * All values are derived from SimulationState. No domain logic is duplicated.
 *
 * EMULATOR OPERATOR / QA UI ONLY — NOT THE DRIVER-FACING UI.
 * Not final UX design. All values are WIP emulator defaults — not Canon.
 */
function renderOperatorHeader(state: SimulationState): void {
  const summaryEl = document.getElementById("op-summary");
  if (!summaryEl) return;

  const { primary } = state.eventSelection;
  const refState = state.speedReference.state;
  const targetSpeed = state.speedReference.target_speed_kmh;
  const { acceptedCount, suppressedCount, notProcessedCount } =
    getEventSelectionSummary(state);

  // Find the selected primary record to extract its reason code.
  const primaryRecord = primary
    ? state.eventSelection.records.find((r) => r.event_id === primary.event_id)
    : null;
  const reasonCode = primaryRecord?.applicabilityReason.code ?? null;

  const primaryHtml = primary
    ? `<code class="op-summary-event-id">${escapeHtml(primary.event_id)}</code>`
    : `<em class="op-summary-none">none</em>`;

  const targetHtml =
    targetSpeed != null
      ? `<span class="op-summary-target-speed">${targetSpeed} km/h</span>`
      : `<em class="op-summary-none">–</em>`;

  const stateClass = refState === "approach_target"
    ? "op-state-approach-target"
    : "op-state-unknown";

  const reasonHtml = reasonCode
    ? `<div class="op-summary-item">
        <span class="op-summary-label">Reason code</span>
        <code class="op-summary-value op-reason-code">${escapeHtml(reasonCode)}</code>
      </div>`
    : "";

  summaryEl.innerHTML = `
    <div class="op-summary-grid">
      <div class="op-summary-item">
        <span class="op-summary-label">Primary event</span>
        <span class="op-summary-value">${primaryHtml}</span>
      </div>
      <div class="op-summary-item">
        <span class="op-summary-label">Ref state</span>
        <span class="op-summary-value ${stateClass}">${escapeHtml(refState)}</span>
      </div>
      <div class="op-summary-item">
        <span class="op-summary-label">Target speed</span>
        <span class="op-summary-value">${targetHtml}</span>
      </div>
      <div class="op-summary-item">
        <span class="op-summary-label">Accepted</span>
        <span class="op-summary-value op-count-accepted">${acceptedCount}</span>
      </div>
      <div class="op-summary-item">
        <span class="op-summary-label">Suppressed</span>
        <span class="op-summary-value op-count-suppressed">${suppressedCount}</span>
      </div>
      <div class="op-summary-item">
        <span class="op-summary-label">Not processed</span>
        <span class="op-summary-value op-count-not-processed">${notProcessedCount}</span>
      </div>
      ${reasonHtml}
    </div>
  `;
}


// EMULATOR DEBUG / QA UI — NOT THE DRIVER-FACING UI.
// buildEventRow and buildGroupRows are used only by renderDebugPanel.
// The grouping and filtering logic (accepted / suppressed / not_driver_facing)
// reflects the simplified Slices 4.1–4.3 baseline only.
// Debug visibility does NOT imply driver-facing eligibility.
// Reason / status / kind names are WIP / not Product Canon.
// ---------------------------------------------------------------------------

/**
 * Build a single <tr> for the debug event table.
 *
 * Uses inline fields from EventSelectionRecord (projection_along_route_m,
 * projection_cross_track_m, directionCompatibility) rather than separate
 * lookup maps. Values are identical to the state lookup maps — derived from
 * the same projection pass.
 *
 * EMULATOR DEBUG / QA ONLY — not driver-facing output.
 * Per-session derived data — not persisted to base fixture files.
 * (event-applicability Canon truth 13; event-data Canon truth 11)
 */
function buildEventRow(r: EventSelectionRecord): string {
  const distStr =
    r.distance_m >= 0
      ? `+${r.distance_m.toFixed(0)} m`
      : `${r.distance_m.toFixed(0)} m`;

  const alongStr = `${r.projection_along_route_m.toFixed(0)} m`;
  const crossStr = `${r.projection_cross_track_m.toFixed(1)} m`;

  const dc = r.directionCompatibility;
  const tangentStr =
    dc?.route_tangent_deg != null
      ? `${dc.route_tangent_deg.toFixed(1)}°`
      : "–";
  const srcDirStr =
    dc?.source_direction_deg != null
      ? `${dc.source_direction_deg}°`
      : "–";
  const srcDirtypeStr =
    dc?.source_dirtype != null ? String(dc.source_dirtype) : "–";
  const deltaStr =
    dc?.direction_delta_deg != null
      ? `${dc.direction_delta_deg.toFixed(1)}°`
      : "–";
  const dcStatus = dc?.status ?? "–";
  const dcStatusClass =
    dc != null ? `dir-compat-${dc.status}` : "dir-compat-unknown";

  const ar = r.applicabilityReason;
  const arKindClass = `ar-kind-${ar.kind}`;
  const arEligibleClass = ar.is_driver_facing_eligible
    ? "ar-eligible-yes"
    : "ar-eligible-no";
  // "⚠ debug only" makes non-driver-facing status explicit at a glance.
  const arEligibleText = ar.is_driver_facing_eligible
    ? "driver ✓"
    : "⚠ debug only";

  // Add debug-only-row class to rows that are not eligible for driver-facing.
  // This provides a secondary visual cue in addition to the group separator.
  const debugRowClass = !ar.is_driver_facing_eligible ? " debug-only-row" : "";

  return `<tr class="event-row-${r.status}${debugRowClass}">
    <td><code>${escapeHtml(r.event_id)}</code></td>
    <td>${escapeHtml(r.normalized_type)}</td>
    <td>${r.target_speed_kmh != null ? r.target_speed_kmh : "–"}</td>
    <td class="dist-cell">${distStr}</td>
    <td class="dist-cell proj-derived">${alongStr}</td>
    <td class="dist-cell proj-derived">${crossStr}</td>
    <td class="dist-cell dir-derived">${tangentStr}</td>
    <td class="dist-cell dir-derived">${srcDirStr}<br><span class="dirtype-label">dirtype=${srcDirtypeStr}</span></td>
    <td class="dist-cell dir-derived">${deltaStr}</td>
    <td class="dir-derived"><span class="dir-compat-badge ${dcStatusClass}">${escapeHtml(dcStatus)}</span></td>
    <td><span class="event-status event-status-${r.status}">${r.status}</span></td>
    <td class="reason-code-cell">
      <span class="ar-kind ${arKindClass}">${escapeHtml(ar.kind)}</span>
      <span class="ar-eligible ${arEligibleClass}">${arEligibleText}</span><br>
      <span class="ar-code">${escapeHtml(ar.code)}</span>
    </td>
    <td class="reason-cell" title="${escapeHtml(r.reason)}">${escapeHtml(r.reason)}</td>
  </tr>`;
}

/**
 * Build the group separator <tr> + all event rows for one reason-kind group.
 *
 * Returns empty string if the group has no records (keeps the table clean
 * when filtering leaves a group empty).
 *
 * EMULATOR DEBUG / QA ONLY — not driver-facing.
 * Group semantics reflect the Slices 4.1–4.3 WIP baseline only — not Canon.
 */
function buildGroupRows(
  kind: "accepted" | "suppressed" | "not_processed",
  records: EventSelectionRecord[]
): string {
  if (records.length === 0) return "";

  const CONFIG: Record<
    "accepted" | "suppressed" | "not_processed",
    { label: string; note: string; headerClass: string }
  > = {
    accepted: {
      label: "✓ Accepted — driver-facing eligible",
      note: "May appear in the driver-facing three-circle display (selected_primary / accepted_candidate)",
      headerClass: "group-header-accepted",
    },
    suppressed: {
      label: "⊘ Suppressed — debug / QA only · NOT driver-facing",
      note:
        "Visible in debug; suppressed from driver-facing selection " +
        "(event-applicability Canon truth 12; ui-model Canon truth 13). " +
        "Debug visibility does NOT imply driver-facing eligibility.",
      headerClass: "group-header-suppressed",
    },
    not_processed: {
      label: "○ Not processed — out of scope for this slice",
      note:
        "Event type not in the current applicability processing scope " +
        "(speed_limit and static_camera are processed; others are not). " +
        "Not driver-facing.",
      headerClass: "group-header-not-processed",
    },
  };

  const { label, note, headerClass } = CONFIG[kind];
  const count = records.length;

  const separatorRow = `<tr class="group-header-row">
    <td colspan="13" class="group-header-cell ${headerClass}">
      ${label} · ${count} event${count !== 1 ? "s" : ""}
      <span class="group-header-note">${note}</span>
    </td>
  </tr>`;

  return separatorRow + records.map(buildEventRow).join("");
}

/**
 * Build the filter control bar HTML.
 * Buttons are tagged with data-filter attributes; listeners are attached
 * separately by attachDebugFilterListeners after innerHTML is set.
 */
function buildFilterBar(
  total: number,
  acceptedCount: number,
  suppressedCount: number,
  notDFCount: number
): string {
  const btn = (f: DebugFilterMode, label: string): string => {
    const activeClass = debugFilter === f ? " filter-btn-active" : "";
    return `<button class="filter-btn${activeClass}" data-filter="${f}" type="button">${escapeHtml(label)}</button>`;
  };

  return `<div class="debug-filter-bar">
    <span class="filter-label">Show events:</span>
    ${btn("all", `All (${total})`)}
    ${btn("accepted", `Accepted (${acceptedCount})`)}
    ${btn("suppressed", `Suppressed (${suppressedCount})`)}
    ${btn("not_driver_facing", `Not driver-facing (${notDFCount})`)}
    <span class="filter-note">Filter affects debug table only — not event selection behavior</span>
  </div>`;
}

/**
 * Attach click listeners to the filter buttons inside the debug section.
 * Must be called after section.innerHTML is set (buttons are freshly created).
 * Sets the module-level debugFilter and triggers a re-render.
 */
function attachDebugFilterListeners(section: HTMLElement): void {
  section
    .querySelectorAll<HTMLButtonElement>(".filter-btn[data-filter]")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        const f = btn.dataset["filter"] as DebugFilterMode | undefined;
        if (f) {
          debugFilter = f;
          render();
        }
      });
    });
}

// ---------------------------------------------------------------------------
// Debug panel
// ---------------------------------------------------------------------------

/**
 * Render the debug / QA panel.
 *
 * EMULATOR DEBUG / QA UI — NOT THE DRIVER-FACING UI.
 * Not final UX design. Not a navigator. Not an anti-radar.
 * Reason / status / kind names are WIP / not Product Canon.
 *
 * Slice 4.4 additions vs Slice 4.3:
 *   - Records separated into accepted / suppressed / not_processed groups
 *     with visual group separator rows.
 *   - Filter bar (all / accepted / suppressed / not_driver_facing) controls
 *     table visibility without affecting event selection behavior.
 *   - buildEventRow extracted to reduce inline duplication.
 *   - ".debug-only-row" class applied to non-driver-facing rows as secondary
 *     visual indicator.
 *   - ar.eligible text changed from "debug" to "⚠ debug only" for clarity.
 *   - ar-kind badge placed before ar-code in the reason code cell.
 */
function renderDebugPanel(state: SimulationState): void {
  const section = document.getElementById("debug-section");
  if (!section) return;

  const { minLon, maxLon } = getRouteLonSpan(SYNTHETIC_ROUTE);
  const vp = state.vehicleRoutePosition;
  const provenance = SYNTHETIC_ROUTE.provenance;

  // Separate records into reason-kind groups.
  // Uses applicabilityReason.kind from Slice 4.3 / Issue #53.
  const allRecords = state.eventSelection.records;
  const acceptedRecords = allRecords.filter(
    (r) => r.applicabilityReason.kind === "accepted"
  );
  const suppressedRecords = allRecords.filter(
    (r) => r.applicabilityReason.kind === "suppressed"
  );
  const notProcessedRecords = allRecords.filter(
    (r) => r.applicabilityReason.kind === "not_processed"
  );
  const notDFRecords = allRecords.filter(
    (r) => !r.applicabilityReason.is_driver_facing_eligible
  );

  // Build table body based on current filter.
  // Filter affects table visibility only — selection behavior is unchanged.
  let tableBodyHtml: string;
  if (debugFilter === "accepted") {
    tableBodyHtml = buildGroupRows("accepted", acceptedRecords);
  } else if (debugFilter === "suppressed") {
    tableBodyHtml = buildGroupRows("suppressed", suppressedRecords);
  } else if (debugFilter === "not_driver_facing") {
    tableBodyHtml =
      buildGroupRows("suppressed", suppressedRecords) +
      buildGroupRows("not_processed", notProcessedRecords);
  } else {
    // "all" — show all groups with separators
    tableBodyHtml =
      buildGroupRows("accepted", acceptedRecords) +
      buildGroupRows("suppressed", suppressedRecords) +
      buildGroupRows("not_processed", notProcessedRecords);
  }

  if (tableBodyHtml === "") {
    tableBodyHtml = `<tr><td colspan="13" class="table-empty-msg">No events match the current filter.</td></tr>`;
  }

  const configSubset = {
    speed_limit_lookahead_WIP: EMULATOR_TUNING_DEFAULTS.lookahead.speed_limit,
    static_camera_lookahead_WIP: EMULATOR_TUNING_DEFAULTS.lookahead.static_camera,
    direction_applicability_WIP: {
      direction_delta_accept_deg: EMULATOR_TUNING_DEFAULTS.direction_applicability.direction_delta_accept_deg,
      direction_delta_reject_above_deg: EMULATOR_TUNING_DEFAULTS.direction_applicability.direction_delta_reject_above_deg,
      approach_window_m: EMULATOR_TUNING_DEFAULTS.direction_applicability.approach_window_m,
      // Issue #67: cross-track/off-route rejection threshold.
      // Used as the WIP reject threshold for off-route suppression.
      // WIP emulator default — NOT Canon. (tuning-and-validation Canon truths 1, 2)
      route_projection_reject_m_WIP: EMULATOR_TUNING_DEFAULTS.direction_applicability.route_projection_reject_m,
    },
    enforcement_profile_WIP: {
      profile_id: EMULATOR_TUNING_DEFAULTS.enforcement_profile.profile_id,
      label: EMULATOR_TUNING_DEFAULTS.enforcement_profile.label,
      absolute_kmh: EMULATOR_TUNING_DEFAULTS.enforcement_profile.absolute_kmh,
      legal_claim: EMULATOR_TUNING_DEFAULTS.enforcement_profile.legal_claim,
      notes: EMULATOR_TUNING_DEFAULTS.enforcement_profile.notes,
    },
  };

  section.innerHTML = `
    <h2>Debug Panel <span class="wip-badge">Emulator QA only — not driver-facing UI</span></h2>

    <div class="debug-warning">
      ⚠ All numeric thresholds shown below are <strong>WIP emulator defaults — NOT Product Canon</strong>.
      Projection, direction compatibility, and applicability reason values are <strong>per-session derived data</strong> —
      not persisted to base fixture files. (event-applicability Canon truth 13; event-data Canon truth 11)
      Source direction fields are <strong>candidate metadata only, not verified truth</strong>.
      (event-applicability Canon truth 8)
      Direction compatibility shown is a WIP baseline (Slice 4.2) — candidate semantics, not Canon.
      Branch/ramp/parallel-carriageway ambiguity handling is deferred to later child issues.
      <strong>Reason code column</strong> is a WIP structured suppression/acceptance reason model (Slice 4.3 / Issue #53) —
      codes, kind values, and is_driver_facing_eligible reflect the simplified Slices 4.1–4.3 baseline only.
      Full taxonomy is deferred to later child issues under Issue #48.
      <strong>Debug visibility does NOT imply driver-facing eligibility.</strong>
    </div>

    <div class="debug-grid">
      <div class="debug-block">
        <h3>Active Route</h3>
        <dl class="debug-dl">
          <dt>Route ID / Provider</dt>
          <dd><code>${escapeHtml(provenance.provider)}</code></dd>
          <dt>Generated</dt>
          <dd>${escapeHtml(provenance.generated_at)}</dd>
          <dt>Route lon span</dt>
          <dd>${minLon.toFixed(3)}° → ${maxLon.toFixed(3)}° (synthetic)</dd>
          <dt>Total route length</dt>
          <dd class="proj-derived">${vp.total_route_length_m.toFixed(0)} m <span class="wip-inline">(arc-length, per-session)</span></dd>
          <dt>Notes</dt>
          <dd class="notes-cell">${escapeHtml(provenance.notes ?? "–")}</dd>
          <dt>Total events loaded</dt>
          <dd>${SYNTHETIC_PREPARED_EVENTS.length} (synthetic prepared events — speed_limit + static_camera)</dd>
        </dl>
      </div>

      <div class="debug-block">
        <h3>Simulation State</h3>
        <dl class="debug-dl">
          <dt>Route progress</dt>
          <dd>${(state.progress * 100).toFixed(1)}%</dd>
          <dt>Vehicle longitude <span class="wip-inline">(projection-derived)</span></dt>
          <dd>${state.vehicleLon.toFixed(5)}°</dd>
          <dt>Current speed</dt>
          <dd>${state.speedKmh} km/h (manual — no provider speed)</dd>
        </dl>
      </div>

      <div class="debug-block">
        <h3>Vehicle Route Position <span class="wip-inline proj-derived-label">per-session derived</span></h3>
        <dl class="debug-dl">
          <dt>Along-route distance</dt>
          <dd class="proj-derived">${vp.along_route_m.toFixed(0)} m from route start</dd>
          <dt>Total route length</dt>
          <dd class="proj-derived">${vp.total_route_length_m.toFixed(0)} m</dd>
          <dt>Segment index</dt>
          <dd class="proj-derived">${vp.segment_index} (0-based)</dd>
          <dt>Projected lon / lat</dt>
          <dd class="proj-derived">${vp.projected_lon.toFixed(5)}° / ${vp.projected_lat.toFixed(5)}°</dd>
        </dl>
      </div>

      <div class="debug-block">
        <h3>Speed Reference</h3>
        <dl class="debug-dl">
          <dt>State</dt>
          <dd><strong>${escapeHtml(state.speedReference.state)}</strong></dd>
          <dt>Target speed</dt>
          <dd>${
            state.speedReference.target_speed_kmh != null
              ? `${state.speedReference.target_speed_kmh} km/h (advisory, not legal)`
              : "– (none)"
          }</dd>
          <dt>Reason</dt>
          <dd>${escapeHtml(state.speedReference.reason)}</dd>
        </dl>
      </div>
    </div>

    <div class="debug-block debug-block-full">
      <h3>
        Event Selection
        <span class="wip-inline">speed_limit + static_camera scope · projection-derived distance · cross-track/off-route suppression · direction compat · Slices 4.1–4.4 · Issues #65 #67</span>
      </h3>
      <p class="debug-note">
        Ahead/behind determined by <strong>projection-derived along-route distance</strong>.
        Lookahead guardrails (WIP defaults — not Canon):
        speed_limit min <strong>${EMULATOR_TUNING_DEFAULTS.lookahead.speed_limit.min_display_distance_m} m</strong> /
        max <strong>${EMULATOR_TUNING_DEFAULTS.lookahead.speed_limit.max_lookahead_m} m</strong>;
        static_camera min <strong>${EMULATOR_TUNING_DEFAULTS.lookahead.static_camera.min_display_distance_m} m</strong> /
        max <strong>${EMULATOR_TUNING_DEFAULTS.lookahead.static_camera.max_lookahead_m} m</strong>.
        <strong>off_route_cross_track</strong> (Issue #67) = within lookahead window but cross-track distance exceeds
        WIP rejection threshold (<code>route_projection_reject_m</code> =
        <strong>${EMULATOR_TUNING_DEFAULTS.direction_applicability.route_projection_reject_m} m</strong> WIP default, not Canon);
        suppressed from driver-facing selection before direction check is applied.
        <strong>direction_conflict</strong> = within window, on-route, but direction incompatible; suppressed from driver-facing selection.
        Direction compatibility columns (⟳) are <em class="dir-derived-label">per-session derived debug data</em> —
        source direction is candidate metadata only, not verified truth. WIP baseline semantics — not Canon.
        <strong>Along-route / Cross-track</strong> (⊕) are per-session derived projection values — not persisted to fixtures.
        <strong>secondary</strong> = next event inside the simplified window only, not global next event on route.
        <strong>Reason code</strong> (✦) is per-session derived structured reason data — WIP Slices 4.1–4.3 + Issue #67 baseline, not Canon.
        Hover over the Reason cell for the full reason text.
        <strong>Debug-only rows</strong> (marked ⚠ debug only) must not appear driver-facing.
        (ui-model Canon truth 13; event-applicability Canon truth 12)
      </p>

      ${buildFilterBar(
        allRecords.length,
        acceptedRecords.length,
        suppressedRecords.length,
        notDFRecords.length
      )}

      <div class="table-scroll">
        <table class="event-table">
          <thead>
            <tr>
              <th>Event ID</th>
              <th>Type</th>
              <th>Target km/h</th>
              <th>Signed distance</th>
              <th class="proj-derived-label">Along-route ⊕</th>
              <th class="proj-derived-label">Cross-track ⊕</th>
              <th class="dir-derived-label">Tangent ⟳</th>
              <th class="dir-derived-label">Src dir ⟳</th>
              <th class="dir-derived-label">Delta ⟳</th>
              <th class="dir-derived-label">Dir compat ⟳</th>
              <th>Status</th>
              <th class="reason-code-header">Reason code ✦ <span class="wip-inline">WIP · not Canon</span></th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            ${tableBodyHtml}
          </tbody>
        </table>
      </div>
      <p class="debug-note-small">
        ⊕ per-session derived projection values — not persisted to base fixture files (event-applicability Canon truth 13)
        <br>⟳ per-session derived direction compatibility values — source direction is candidate metadata, not verified truth
        (event-applicability Canon truth 8; Slice 4.2 WIP — not Canon)
        <br>✦ per-session derived structured reason code — WIP suppression/acceptance reason model (Slice 4.3 / Issue #53; cross-track baseline Issue #67);
        codes, kind, and is_driver_facing_eligible reflect Slices 4.1–4.3 + Issue #67 baseline only — NOT Product Canon;
        off_route_cross_track suppresses events where cross-track &gt; route_projection_reject_m (WIP 50 m) before direction check;
        full taxonomy deferred to later child issues under Issue #48
        <br>⚠ debug only — NOT driver-facing eligible; visible in debug / QA; suppressed from driver-facing selection
        (ui-model Canon truth 13; event-applicability Canon truth 12)
      </p>
    </div>

    <div class="debug-block debug-block-full">
      <h3>Active Tuning Config <span class="wip-inline">WIP defaults — NOT Canon · subset shown</span></h3>
      <pre class="debug-pre">${escapeHtml(JSON.stringify(configSubset, null, 2))}</pre>
    </div>
  `;

  // Attach filter button listeners after innerHTML is set.
  attachDebugFilterListeners(section);
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

buildApp();
