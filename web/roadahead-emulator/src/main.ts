/**
 * RoadAhead Phase 0 — Web Route Emulator
 * Slice 4.1 / Issue #49: route projection baseline
 * Slice 4.2 / Issue #51: direction compatibility baseline
 *
 * Wires together synthetic fixtures, emulator logic, and a minimal UI.
 *
 * RESEARCH AND VALIDATION TOOL ONLY.
 * Not the final delivery surface. Not a navigator. Not an anti-radar.
 * Not a legal speed-limit authority. Not safety-certified.
 * All numeric values shown are WIP emulator defaults — not Product Canon.
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

  app.innerHTML = `
    <header>
      <h1>RoadAhead Phase 0 — Web Route Emulator</h1>
      <p class="subtitle">
        Phase 0 validation emulator · Slice 4.2 — direction compatibility baseline ·
        not the final delivery surface
      </p>
    </header>

    <main>
      <section class="wip-notice">
        <strong>Research &amp; validation tool only.</strong>
        Not a navigator. Not an anti-radar. Not a legal speed-limit authority.
        Not safety-certified. All numeric values are WIP emulator defaults, not Product Canon.
        Uses <strong>synthetic fixtures only</strong> — no Yandex API, no provider, no network,
        no account required.
      </section>

      <section class="controls-section">
        <h2>Simulation Controls</h2>
        <p class="controls-note">
          Synthetic straight east-bound route · lon ${minLon.toFixed(3)}° → ${maxLon.toFixed(3)}° ·
          3 synthetic speed_limit events · no real GPS
        </p>
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
      </section>

      <section class="three-circle-section">
        <h2>Speed Reference Display <span class="wip-badge">WIP visual styling — not final design</span></h2>
        <div class="three-circles" id="three-circles">
          <!-- populated by render() -->
        </div>
        <p class="speed-ref-state-row" id="speed-ref-state-row">
          <!-- populated by render() -->
        </p>
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
          <li>Source direction fields (<code>source_direction_deg</code>, <code>source_dirtype</code>) are <strong>candidate metadata only</strong> — not verified truth. (event-applicability Canon truth 8)</li>
        </ul>
        <p class="authority-note">
          <strong>Product Canon is the primary authority.</strong>
          See <code>docs/product/areas/</code> in the repository.
          This emulator is a WIP validation tool.
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
// Debug panel
// ---------------------------------------------------------------------------

function renderDebugPanel(state: SimulationState): void {
  const section = document.getElementById("debug-section");
  if (!section) return;

  const { minLon, maxLon } = getRouteLonSpan(SYNTHETIC_ROUTE);
  const vp = state.vehicleRoutePosition;
  const provenance = SYNTHETIC_ROUTE.provenance;

  // Build lookup maps for the event table
  const projMap = new Map(
    state.eventProjections.map((p) => [p.event_id, p])
  );
  const dirCompatMap = new Map(
    state.directionCompatibility.map((r) => [r.event_id, r])
  );

  const eventRows = state.eventSelection.records
    .map((r) => {
      const proj = projMap.get(r.event_id);
      const dc = dirCompatMap.get(r.event_id);

      const distStr =
        r.distance_m >= 0
          ? `+${r.distance_m.toFixed(0)} m`
          : `${r.distance_m.toFixed(0)} m`;
      const alongStr = proj
        ? `${proj.projection.best.along_route_m.toFixed(0)} m`
        : "–";
      const crossStr = proj
        ? `${proj.projection.best.cross_track_m.toFixed(1)} m`
        : "–";

      // Direction compatibility columns (per-session derived, Slice 4.2)
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

      return `<tr class="event-row-${r.status}">
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
        <td class="reason-cell">${escapeHtml(r.reason)}</td>
      </tr>`;
    })
    .join("");

  const configSubset = {
    speed_limit_lookahead_WIP: EMULATOR_TUNING_DEFAULTS.lookahead.speed_limit,
    direction_applicability_WIP: {
      direction_delta_accept_deg: EMULATOR_TUNING_DEFAULTS.direction_applicability.direction_delta_accept_deg,
      direction_delta_reject_above_deg: EMULATOR_TUNING_DEFAULTS.direction_applicability.direction_delta_reject_above_deg,
      approach_window_m: EMULATOR_TUNING_DEFAULTS.direction_applicability.approach_window_m,
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
    <h2>Debug Panel</h2>

    <div class="debug-warning">
      ⚠ All numeric thresholds shown below are <strong>WIP emulator defaults — NOT Product Canon</strong>.
      Projection and direction compatibility values are <strong>per-session derived data</strong> —
      not persisted to base fixture files. (event-applicability Canon truth 13; event-data Canon truth 11)
      Source direction fields are <strong>candidate metadata only, not verified truth</strong>.
      (event-applicability Canon truth 8)
      Direction compatibility shown is a WIP baseline (Slice 4.2) — candidate semantics, not Canon.
      Branch/ramp/parallel-carriageway ambiguity handling is deferred to later child issues.
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
          <dd>${SYNTHETIC_PREPARED_EVENTS.length} (synthetic speed_limit fixtures)</dd>
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
        <span class="wip-inline">speed_limit scope · projection-derived distance · direction compat · Slice 4.2</span>
      </h3>
      <p class="debug-note">
        Ahead/behind determined by <strong>projection-derived along-route distance</strong>.
        Lookahead guardrails: speed_limit min <strong>${EMULATOR_TUNING_DEFAULTS.lookahead.speed_limit.min_display_distance_m} m</strong> /
        max <strong>${EMULATOR_TUNING_DEFAULTS.lookahead.speed_limit.max_lookahead_m} m</strong>
        (WIP defaults — not Canon).
        <strong>direction_conflict</strong> = within window but direction incompatible; suppressed from driver-facing selection.
        Direction compatibility columns (⟳) are <em class="dir-derived-label">per-session derived debug data</em> —
        source direction is candidate metadata only, not verified truth. WIP baseline semantics — not Canon.
        <strong>Along-route / Cross-track</strong> (⊕) are per-session derived projection values — not persisted to fixtures.
        <strong>secondary</strong> = next event inside the simplified window only, not global next event on route.
      </p>
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
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            ${eventRows}
          </tbody>
        </table>
      </div>
      <p class="debug-note-small">
        ⊕ per-session derived projection values — not persisted to base fixture files (event-applicability Canon truth 13)
        <br>⟳ per-session derived direction compatibility values — source direction is candidate metadata, not verified truth
        (event-applicability Canon truth 8; Slice 4.2 WIP — not Canon)
      </p>
    </div>

    <div class="debug-block debug-block-full">
      <h3>Active Tuning Config <span class="wip-inline">WIP defaults — NOT Canon · subset shown</span></h3>
      <pre class="debug-pre">${escapeHtml(JSON.stringify(configSubset, null, 2))}</pre>
    </div>
  `;
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
