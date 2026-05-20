/**
 * RoadAhead Phase 0 — Web Route Emulator
 * Slice 3 / Issue #46: first minimal vertical slice
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
        Phase 0 validation emulator · Slice 3 — first minimal vertical slice ·
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
          2 synthetic speed_limit events · no real GPS
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
          <li>Event applicability logic in this slice is <strong>simplified for the straight synthetic fixture only</strong>.</li>
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
// this file for Slice 3 simplicity. If the UI grows significantly in later
// slices, consider extracting them to dedicated rendering modules under
// src/ui/. Do not refactor now.
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
  // Secondary is the next event inside the simplified candidate window —
  // not the global next event on the route. Full secondary semantics are WIP.
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
  const routeLenM =
    (maxLon - minLon) *
    (111_320 * Math.cos((55.75 * Math.PI) / 180));
  const provenance = SYNTHETIC_ROUTE.provenance;

  const eventRows = state.eventSelection.records
    .map((r) => {
      const distStr =
        r.distance_m >= 0
          ? `+${r.distance_m.toFixed(0)} m`
          : `${r.distance_m.toFixed(0)} m`;
      return `<tr class="event-row-${r.status}">
        <td><code>${escapeHtml(r.event_id)}</code></td>
        <td>${escapeHtml(r.normalized_type)}</td>
        <td>${r.target_speed_kmh != null ? r.target_speed_kmh : "–"}</td>
        <td class="dist-cell">${distStr}</td>
        <td><span class="event-status event-status-${r.status}">${r.status}</span></td>
        <td class="reason-cell">${escapeHtml(r.reason)}</td>
      </tr>`;
    })
    .join("");

  const configSubset = {
    speed_limit_lookahead_WIP: EMULATOR_TUNING_DEFAULTS.lookahead.speed_limit,
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
      Event selection logic is <strong>simplified for the straight synthetic fixture only</strong>
      (longitude ordering; no full projection, no direction compatibility, no branch/ramp handling).
      Full applicability is deferred to Slice 4.
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
          <dd>${minLon.toFixed(3)}° → ${maxLon.toFixed(3)}° (≈ ${routeLenM.toFixed(0)} m, synthetic)</dd>
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
          <dt>Vehicle longitude <span class="wip-inline">(simplified interpolation)</span></dt>
          <dd>${state.vehicleLon.toFixed(5)}°</dd>
          <dt>Current speed</dt>
          <dd>${state.speedKmh} km/h (manual — no provider speed)</dd>
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
        <span class="wip-inline">speed_limit scope · simplified longitude ordering · Slice 3</span>
      </h3>
      <p class="debug-note">
        Ahead/behind determined by longitude sign for the east-bound straight route only.
        Lookahead guardrails: speed_limit min <strong>${EMULATOR_TUNING_DEFAULTS.lookahead.speed_limit.min_display_distance_m} m</strong> /
        max <strong>${EMULATOR_TUNING_DEFAULTS.lookahead.speed_limit.max_lookahead_m} m</strong>
        (WIP defaults — not Canon).
        <strong>too_far / too_close</strong> are simplified Slice 3 debug statuses based on the WIP
        min/max display window — not final driver-facing event-applicability semantics and not a
        general product rule. Future urgency and applicability behavior may revise how events in
        these zones are treated.
        Full route projection, direction compatibility matrix, and branch/ramp handling are
        deferred to Slice 4 (event-applicability Canon truths 1, 2, 10).
        <strong>secondary</strong> = next event inside the simplified window only, not global next event on route.
      </p>
      <div class="table-scroll">
        <table class="event-table">
          <thead>
            <tr>
              <th>Event ID</th>
              <th>Type</th>
              <th>Target km/h</th>
              <th>Distance</th>
              <th>Status</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            ${eventRows}
          </tbody>
        </table>
      </div>
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
