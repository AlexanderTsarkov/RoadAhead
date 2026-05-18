---
status: Research / technical recommendation
canon: false
source: POC V1 WIP spec §9, §11, §11.5, §12, §13, §20.5; companion decision workbook (threshold tuning rationale); direction applicability, route geometry provider, prepared event store, and enforcement profile recommendations
purpose: Recommend starting tuning defaults and validation strategy for driver-facing timing, speed smoothing, deceleration urgency, pass feedback, and lookahead guardrails in the POC V1 interactive web route emulator
context: RoadAhead POC V1, interactive web route emulator, route-known mode; emulator tuning only, not safety/legal claims
---

# RoadAhead — Threshold tuning recommendation (POC V1)

> **Status — Research / technical recommendation. Not Canon.**
> This document is input for a future Canon / decision review. It is not an implementation plan, not an implementation slice, not a decision record, and not Canon. It does **not** claim safety correctness, human-factors certification, or legal correctness for any value below. All numbers are **emulator tuning starting defaults** — recommended values to explore in a scenario sweep, not final settings and not facts about real driving. It does **not** redefine enforcement profile semantics (those live in the enforcement profile recommendation), does **not** redefine direction applicability semantics (those live in the direction applicability recommendation), and does **not** redefine the prepared event store (that lives in the prepared event store recommendation).

## 1. Executive recommendation

For the **POC V1 interactive web route emulator** (WIP spec §3, §9, §11–§13, §20.5) the recommended starting posture is:

- **POC V1 should define threshold and timing values as explicit emulator tuning config**, not as hidden code constants. The tuning config is the single place where `pass_feedback_hold_s`, `display_hysteresis_kmh`, `clear_hysteresis_kmh`, `alpha_smoothing_ms`, reaction-time defaults, deceleration profile values, and per-type lookahead guardrails are sourced.
- **Start with conservative, broadly explorable defaults** (§5, §6, §7, §8, §9, §10) so the emulator can validate three-circle behaviour from one coherent baseline, then sweep variants.
- **All recommended values are WIP / emulator tuning starting defaults, not Canon, not safety-certified, and not human-factors certified.** They are explicitly subject to revision after the scenario sweep described in §10.
- **Each tuning value must be visible in the emulator's debug / config surface** alongside the raw inputs it derives behaviour from, so a reviewer can confirm that the active configuration is what they think it is and so each value can be changed independently for tuning experiments.
- **Validation is by scenario sweep in the web emulator**, not by picking a number and treating it as truth (§10, §13). The sweep is the path from "starting default" to "tuned, then promotable".
- **The enforcement profile remains a separate concern.** Normal guidance bands compute against `target_speed_kmh`, never against `target_speed_kmh + resolved_enforcement_tolerance_kmh` (WIP spec §11.4; enforcement profile recommendation §1, §3, §9). The enforcement threshold only enters at `unsafe_likely`, pass-feedback severity tiers, and the camera-risk variant.
- **Threshold tuning config is session/config state, not base event data** (§11). Route-derived and tuning-derived fields are never stored on the prepared event record (prepared event store recommendation §5, §7).

This recommendation deliberately favours **tunable, debug-visible, conservative starting defaults** over picking the "correct" number now. POC V1 is validating behaviour; the only way the chosen numbers become trustworthy is by running them through scenario sweeps and inspecting the result, not by quoting them from a spec.

### 1.1 Relationship to WIP spec §9 / §20.5 working defaults

This recommendation proposes some **revised starting defaults** for the emulator tuning sweep that differ from the working defaults currently in WIP spec §9 and §20.5 (notably reaction-time defaults and the upper end of the deceleration profiles). The WIP spec values were themselves marked as "starting points for emulator tuning, not Canon" (WIP spec §9, §20.5). The intent here is not to replace the WIP spec by fiat; the intent is to propose a broader, more explicitly tunable set that the scenario sweep (§10) can then narrow down with evidence. Where this document and the WIP spec disagree on numbers, the **range and the tunability are the recommendation**, and the chosen baseline number is a starting point inside that range — both ranges should be explorable in the sweep so the eventual choice is evidence-driven, not assumption-driven. The WIP spec text itself does not need to change as part of this PR; if and when emulator evidence justifies it, a later WIP-spec update or Canon decision can pick a tuned baseline from the validated range.

## 2. Definitions

These terms are used throughout this document. They align with WIP spec §9, §11, §12, §13, §20.5 and with the enforcement profile recommendation §2. Exact field names are informative; final names belong to a later implementation slice and may differ.

- **`pass_feedback_hold_s`** — the duration in seconds for which post-pass feedback (Tier 1 stable red ring, Tier 2 red inner fill / reversed digits, or camera-risk variant) remains visible after the vehicle passes a primary event (WIP spec §12.5, §13.4). Long enough to register, short enough not to block the next event.
- **`display_hysteresis_kmh`** — a small symmetric UI smoothing band around `target_speed_kmh`. The current-speed circle stays in its current visual state while `current_speed_kmh` is within `target_speed_kmh ± display_hysteresis_kmh`. Prevents the urgency ring from flickering on/off around the target. **Separate from `enforcement_tolerance`** (WIP spec §11.5, §12.1; enforcement profile recommendation §1, §9). Lives in threshold tuning, not in the enforcement profile.
- **`clear_hysteresis_kmh`** — a small additional km/h band used when clearing an active visual state (e.g., after passing an event or dropping below a previously over-target speed). Prevents rapid re-alert / re-clear oscillation when the driver hovers near the boundary. May be equal to or slightly larger than `display_hysteresis_kmh` (§7).
- **`alpha_smoothing_ms`** — a UI-side time constant in milliseconds for smoothing the **displayed** current-speed indicator (e.g., a low-pass / exponential moving filter over the manually controlled `current_speed_kmh`). Affects the *displayed* number and the *visual* state transitions only. Does **not** change the raw simulated speed used as truth elsewhere (§7).
- **reaction time** (`reaction_time_default_s`, `reaction_time_high_speed_s`) — the time in seconds the model assumes between the moment a driver should begin reacting and the moment effective deceleration begins. POC V1 uses a single configurable default and an optional higher value for high-speed / poor-visibility debug scenarios. Used as an input to `reaction_distance_m` (§5). **A modelling assumption, not a human-factors certification.**
- **deceleration profile** — the named set of constant longitudinal deceleration values (`smooth`, `normal`, `strong`, `emergency`) used to map the model's required-deceleration value to an urgency band (§5). Used in m/s². **An emulator tuning model, not a vehicle braking specification, not a human comfort study.**
- **required deceleration** (`required_decel_mps2`) — the constant deceleration that, applied over the usable distance to the event after the reaction distance, would bring the vehicle from `current_speed_kmh` down to `target_speed_kmh`. Computed per active event from the live speed, distance, reaction time, and (when configured) safety margin (§5).
- **smooth / normal / strong / emergency deceleration** — named urgency thresholds in the deceleration profile (§4). Lower-magnitude values represent comfortable deceleration; higher-magnitude values represent firmer or near-emergency braking. Strictly POC tuning categories, not vehicle braking specifications.
- **lookahead guardrail** — a per-event-type cap or floor on display distance applied **on top of** the dynamic action-horizon computation (WIP spec §9). The dynamic horizon is the primary rule; guardrails prevent obviously-too-late or obviously-too-early displays (§8).
- **minimum display distance** — the per-type lower bound on `distance_ahead_m` at which an event may transition from `hidden` to a visible state (`awareness` or an active band). Below this distance, the event is too close to be displayed usefully; the system's response is owned by WIP spec §9, §12.3 (pre-pass unrecoverable trigger) and is not redefined here.
- **maximum lookahead distance** — the per-type upper bound on `distance_ahead_m` at which an event may be considered for display. Beyond this distance, the event is too far away to be relevant to the current driving moment and is suppressed from the visible UI (it may still appear in debug).
- **event urgency band** — the named pre-pass urgency category for the current primary event (`awareness`, `smooth_required`, `normal_required`, `strong_required`, `emergency_required`, `unsafe_likely`) per WIP spec §9 and §11.3. This document recommends a mapping from `required_decel_mps2` to these bands; it does **not** redefine ring intensity or visual semantics (those live in WIP spec §11.3).
- **pre-pass warning** — any active visual state of the current-speed circle / event circles **before** the event is passed (`awareness` through `emergency_required` and `unsafe_likely`). Triggered by the urgency model (WIP spec §9, §11) using the tuning values defined here.
- **post-pass feedback** — the visual state after the event is passed (Tier 0 / Tier 1 / Tier 2; WIP spec §12.4; enforcement profile recommendation §7), held for `pass_feedback_hold_s` (§8).
- **target speed** (`target_speed_kmh`) — the event's posted / recommended / advisory speed (e.g., Datakam `SPEED`), sourced from the prepared event record. The reference for normal guidance and required-deceleration urgency (WIP spec §11.4; enforcement profile recommendation §2).
- **enforcement threshold** (`enforcement_threshold_speed`) — `target_speed_kmh + resolved_enforcement_tolerance_kmh`, computed per event in the active session from the active enforcement profile (enforcement profile recommendation §2, §3). Used **only** for `unsafe_likely`, pass-feedback severity tiers, and the camera-risk variant; never for normal guidance bands.
- **emulator tuning config** — the configuration object holding all values defined in this document (and any future tuning values). Distinct from the prepared event store (event data, prepared event store recommendation §5), from the route geometry contract (route geometry provider recommendation §2), and from the enforcement profile (enforcement profile recommendation §4). Inspectable in the emulator's debug surface (§13).
- **scenario sweep** — the structured matrix of emulator runs described in §10, used to validate that a tuning value behaves as intended across speeds, targets, distances, event types, profiles, and route geometries before any value is treated as durable.

## 3. Threshold tuning model

The model below describes how the tuning values are **wired into** event handling. It does **not** redefine pre-pass urgency, pass feedback, camera-risk visuals, or enforcement-threshold semantics — those are owned by WIP spec §9, §11–§13 and the enforcement profile recommendation §3, §7. This section only specifies the **interface** between the tuning values and those features.

### 3.1 Speed and distance feed required deceleration

The pre-pass urgency model (WIP spec §9, §11) is driven by the live values:

- `current_speed_kmh` — the manually controlled simulated speed (WIP spec §3, §4);
- `target_speed_kmh` — the active primary event's target (WIP spec §11.4; enforcement profile recommendation §2);
- `distance_ahead_m` — `event_route_position_m − vehicle_route_position_m` (direction applicability recommendation §2; route geometry provider recommendation §2);
- `reaction_time_s` — from the tuning config (§4, §6);
- `safety_margin_m` — optional, from the tuning config (§6).

`required_decel_mps2` is computed from these per active event (§5). The urgency band (§5) is then derived from `required_decel_mps2` and the deceleration profile thresholds (§4).

### 3.2 Required deceleration is computed against `target_speed_kmh`, not the enforcement threshold

This is the same rule as WIP spec §11.4 and enforcement profile recommendation §1, §3, §9, restated here so the tuning model does not silently violate it:

- Normal guidance bands (`awareness`, `smooth_required`, `normal_required`, `strong_required`, `emergency_required`) compute `required_decel_mps2` against `target_speed_kmh`.
- `unsafe_likely` is the only pre-pass band that uses `enforcement_threshold_speed`, per enforcement profile recommendation §3.3 and WIP spec §9, §12.2.
- The threshold tuning config must never substitute `target_speed_kmh + resolved_enforcement_tolerance_kmh` for `target_speed_kmh` inside the normal guidance computation. Doing so would teach the driver to consume the legal enforcement tolerance buffer as normal driving speed (WIP spec §11.4).

### 3.3 Hysteresis smooths UI state changes; it does not move thresholds

`display_hysteresis_kmh` and `clear_hysteresis_kmh` are **UI smoothing only**. They do not change `target_speed_kmh`, do not change `enforcement_threshold_speed`, do not change `resolved_enforcement_tolerance_kmh`, and do not change the deceleration profile values. Their only purpose is to prevent flicker / oscillation in the visible UI state when `current_speed_kmh` hovers near a boundary (§7).

### 3.4 Alpha smoothing affects the displayed indicator; it does not rewrite raw speed truth

`alpha_smoothing_ms` controls how the current-speed indicator's *displayed* number responds to changes in the manually controlled `current_speed_kmh`. The model's authoritative simulated speed — used for required-deceleration computation, urgency-band selection, pass-speed sampling, and event-selection — must remain the raw `current_speed_kmh`. Any smoothed/displayed variant is for visual readability only and must be visibly distinct in debug (§7, §13).

### 3.5 Pass feedback uses sampled `pass_speed_kmh` and holds for `pass_feedback_hold_s`

`pass_speed_kmh` is sampled from the **authoritative** simulated speed at the pass point (enforcement profile recommendation §2; WIP spec §12.4). It is **not** the lagging display-smoothed value. The visible post-pass state (Tier 0 / Tier 1 / Tier 2 / camera-risk variant) then holds for `pass_feedback_hold_s` (§8). If the sweep is explicitly validating visual-mode-only behaviour, that is a debug variant and must be labelled as such in the debug surface; the default sampling rule is the raw `current_speed_kmh`.

### 3.6 Lookahead guardrails cap or floor the dynamic horizon

The dynamic action-horizon (WIP spec §9) is the primary rule for `hidden` → `awareness` → active-band transitions. Per-type guardrails (§9) apply **on top of** it:

- a `minimum display distance` ensures the event does not first appear so close that the visible band is essentially "you are already at the event";
- a `maximum lookahead distance` ensures the event does not appear so far away that it is irrelevant to the current driving moment (and so that nearer events are not pushed out of the visible stack by distant ones).

The guardrails are per-type because the appropriate window depends on whether the event affects sustained speed regime (`speed_limit`), is a discrete risk-feedback point (`static_camera`), or is a local advisory hazard (`road_bump`) — see §9.

### 3.7 What the model does not do

- It does **not** define the urgency-ring alpha values (WIP spec §11.3 does that).
- It does **not** define the pass-feedback visual treatment (WIP spec §12.4 and §13 do that).
- It does **not** define the camera-icon pulse cadence (WIP spec §13.3).
- It does **not** redefine `enforcement_threshold_speed` (enforcement profile recommendation §3 does that).
- It does **not** redefine direction applicability (the direction applicability recommendation does that).
- It does **not** decide the storage engine, schema, or fixture layout (the prepared event store recommendation does that).

The model is intentionally narrow: it owns the numeric tuning surface and the model formulas that consume those values.

## 4. Recommended starting defaults table

All values below are **recommended emulator tuning starting defaults**. They are **not Canon**, **not safety-certified**, **not legal**, and **must be validated** in the web emulator scenario sweep (§10) before any promotion. Use cautious language when referring to them in product or implementation discussion: "recommended starting default", "emulator tuning value".

The columns are:

- **Field** — informative tuning-config field name; final names belong to a later implementation slice.
- **Starting default** — the value the first emulator slice should boot with.
- **Suggested tuning range** — the inclusive interval the scenario sweep should explore around the starting default.
- **Applies to** — which event types, urgency stages, or UI features the value affects.
- **Rationale** — short justification for the chosen starting value.
- **Status** — `recommended_starting_default` / `emulator_tuning` / `not_canon` / `must_be_validated`. All values below carry **all four** of these statuses simultaneously; the column is kept as a per-row reminder.

### 4.1 Timing and hysteresis values

| Field | Starting default | Suggested tuning range | Applies to | Rationale | Status |
|---|---|---|---|---|---|
| `pass_feedback_hold_s` | 2.0 s | 1.5–3.0 s | post-pass Tier 1 / Tier 2 / camera-risk visual hold (WIP spec §12.4, §12.5, §13.2, §13.4) | Long enough to register a passed-event feedback at a glance, short enough not to block the next event from becoming primary. Starting toward the lower end of WIP spec §12.5's 3–5 s range because the dynamic action-horizon (WIP spec §9) can re-prioritise quickly and a long hold can hide an upcoming urgent event; the sweep should explore the WIP spec's longer values explicitly. | recommended_starting_default; emulator_tuning; not_canon; must_be_validated |
| `display_hysteresis_kmh` | 2 km/h | 1–3 km/h | current-speed circle visual state around `target_speed_kmh` (WIP spec §11.1, §11.5) | A symmetric ±2 km/h band is large enough to absorb small fluctuations from manual emulator speed control without flapping the urgency ring, and small enough not to silently teach the driver that 2 km/h above target is normal. | recommended_starting_default; emulator_tuning; not_canon; must_be_validated |
| `clear_hysteresis_kmh` | 3 km/h | 2–5 km/h | clearing an over-target or active-band visual state after passing or slowing (§7) | Slightly larger than `display_hysteresis_kmh` so that re-entering an active state does not happen immediately after clearing. Range allows the sweep to test asymmetric clear behaviour. | recommended_starting_default; emulator_tuning; not_canon; must_be_validated |
| `alpha_smoothing_ms` | 300 ms | 150–500 ms (test 250–400 ms first) | current-speed indicator's displayed number / visible state transitions (§7) | 300 ms is short enough that the displayed number tracks manual speed control nearly in real time, long enough to avoid the indicator jittering on rapid control inputs. The 150–500 ms range covers both crisp-response and softer-response settings. | recommended_starting_default; emulator_tuning; not_canon; must_be_validated |

### 4.2 Reaction-time defaults

| Field | Starting default | Suggested tuning range | Applies to | Rationale | Status |
|---|---|---|---|---|---|
| `reaction_time_default_s` | 1.0 s | 0.8–1.5 s | `reaction_distance_m` for all event types in default scenarios (§5, §6) | A POC modelling default chosen at the lower end so the dynamic horizon does not push the warning unrealistically far ahead for low-speed scenarios. **Not** a claim about real human reaction time. Range allows the sweep to explore values closer to the WIP spec §9's 2.0 s working default. | recommended_starting_default; emulator_tuning; not_canon; must_be_validated |
| `reaction_time_high_speed_s` | 1.5 s | 1.2–2.0 s | `reaction_distance_m` in the high-speed / poor-visibility debug scenario (§6) | A second reaction-time configuration used to validate that the urgency banding behaves sensibly under a slower-response assumption. Range covers the WIP spec §9 working defaults of 2.0 / 2.5 s in part. | recommended_starting_default; emulator_tuning; not_canon; must_be_validated |
| `safety_margin_m` | 0 m (optional 5–10 m for debug) | 0–10 m | `usable_distance_m` in the required-deceleration formula (§5, §6) | The default behaviour does not pad the usable distance; emulator operators may enable a small margin to validate that the urgency banding is not sensitive to a few metres of slop. | recommended_starting_default; emulator_tuning; not_canon; must_be_validated |

### 4.3 Deceleration profile values

| Field | Starting default | Suggested tuning range | Applies to | Rationale | Status |
|---|---|---|---|---|---|
| `decel_smooth_mps2` | 1.0 m/s² | 0.7–1.3 m/s² | `awareness` ↔ `smooth_required` boundary (§5) | Comfortable, anticipatory deceleration band. Matches the lower bound used in WIP spec §9. | recommended_starting_default; emulator_tuning; not_canon; must_be_validated |
| `decel_normal_mps2` | 2.0 m/s² | 1.5–2.5 m/s² | `smooth_required` ↔ `normal_required` boundary (§5) | A clearly more deliberate deceleration than `smooth`; the urgency ring should be visibly stronger here. Slightly above the WIP spec §9 1.5 m/s² working value so the sweep can validate both. | recommended_starting_default; emulator_tuning; not_canon; must_be_validated |
| `decel_strong_mps2` | 3.5 m/s² | 3.0–4.5 m/s² | `normal_required` ↔ `strong_required` boundary (§5) | Firm deceleration band; warning should feel materially urgent. Above the WIP spec §9 2.5 m/s² value so the sweep can compare. | recommended_starting_default; emulator_tuning; not_canon; must_be_validated |
| `decel_emergency_mps2` | 6.0 m/s² | 5.0–7.0 m/s² | `strong_required` ↔ `emergency_required` boundary (§5); also the threshold past which `unsafe_likely` is plausible | Higher than WIP spec §9's 3.4 m/s² "design" value to give the sweep room to explore how often the model should reach `emergency_required` before `unsafe_likely`. The exact value is one of the tuning items the sweep is most likely to revise. | recommended_starting_default; emulator_tuning; not_canon; must_be_validated |

### 4.4 Per-type lookahead guardrails

| Field | Starting default | Suggested tuning range | Applies to | Rationale | Status |
|---|---|---|---|---|---|
| `speed_limit.min_display_distance_m` | 150–200 m | 100–250 m | minimum `distance_ahead_m` at which a `speed_limit` may transition from `hidden` to visible (§9.A) | Earlier display because speed-regime changes affect sustained driving, not a single moment. | recommended_starting_default; emulator_tuning; not_canon; must_be_validated |
| `speed_limit.max_lookahead_m` | 800–1000 m | 600–1200 m | maximum `distance_ahead_m` at which a `speed_limit` is considered for display (§9.A) | Caps display so distant limits do not push nearer events out of the visible stack. | recommended_starting_default; emulator_tuning; not_canon; must_be_validated |
| `static_camera.min_display_distance_m` | 200–300 m | 150–350 m | minimum `distance_ahead_m` at which a `static_camera` may become visible (§9.B) | Camera-risk feedback needs clear preparation time; slightly earlier than `speed_limit` to allow a calm response. | recommended_starting_default; emulator_tuning; not_canon; must_be_validated |
| `static_camera.max_lookahead_m` | 1000–1200 m | 800–1400 m | maximum `distance_ahead_m` for `static_camera` display (§9.B) | Long enough to support anticipatory awareness without turning into a navigator-style "camera ahead in 2 km" alert. | recommended_starting_default; emulator_tuning; not_canon; must_be_validated |
| `road_bump.min_display_distance_m` | 80–120 m | 60–150 m | minimum `distance_ahead_m` at which a `road_bump` may become visible (§9.C) | Local hazard; too-early display is noise. | recommended_starting_default; emulator_tuning; not_canon; must_be_validated |
| `road_bump.max_lookahead_m` | 400–600 m | 300–800 m | maximum `distance_ahead_m` for `road_bump` display (§9.C) | Limits the visible distance so multiple distant bumps do not clutter the UI. | recommended_starting_default; emulator_tuning; not_canon; must_be_validated |

### 4.5 Note on values that intentionally differ from WIP spec §9 / §20.5

A subset of the values above intentionally differs from the working defaults currently in WIP spec §9 / §20.5 — most notably `reaction_time_default_s` (1.0 s here vs 2.0 s in WIP §9), `decel_normal_mps2` (2.0 vs 1.5 m/s²), `decel_strong_mps2` (3.5 vs 2.5 m/s²), `decel_emergency_mps2` (6.0 vs 3.4 m/s²), and `pass_feedback_hold_s` (2.0 vs 4.0 s). The WIP spec values were themselves marked as "starting points for emulator tuning, not Canon" (WIP spec §9, §20.5). The sweep ranges above cover both the WIP spec working defaults and these revised starting defaults, so the sweep can compare them empirically. This document does **not** propose updating WIP spec §9 / §20.5 numbers as part of this PR; that is a later step taken only if emulator evidence supports it.

## 5. Required deceleration / urgency bands

This section defines the model formula used to compute `required_decel_mps2` and the mapping from `required_decel_mps2` to the WIP spec §9 urgency bands. It is an **emulator behaviour model**, not a safety certification, not a vehicle braking specification, and not a human-factors model.

### 5.1 Formula

Inputs:

- `current_speed_kmh` — manually controlled (WIP spec §3, §4);
- `target_speed_kmh` — the active primary event's target;
- `distance_to_event_m` — `distance_ahead_m` from direction applicability recommendation §2 / route geometry provider recommendation §2;
- `reaction_time_s` — from the tuning config (§4, §6);
- `safety_margin_m` — from the tuning config, default `0` (§4, §6).

Unit conversions:

```
current_speed_mps = current_speed_kmh / 3.6
target_speed_mps  = target_speed_kmh  / 3.6
```

Reaction distance (distance covered at current speed during the reaction interval):

```
reaction_distance_m = current_speed_mps * reaction_time_s
```

Usable distance (distance remaining after reaction time and any margin):

```
usable_distance_m = max(
    distance_to_event_m - reaction_distance_m - safety_margin_m,
    small_positive_value
)
```

The `small_positive_value` is a numerical floor (e.g., a small fraction of a metre) so the formula is well-defined when the vehicle is essentially at the event point. The pre-pass unrecoverable trigger (WIP spec §12.3) and `unsafe_likely` (WIP spec §9, §12.2) own the at-or-past-the-event behaviour; this floor exists only to avoid a divide-by-zero in the urgency-band computation.

Required deceleration to reach `target_speed_kmh`:

```
required_decel_mps2 = max(
    0,
    (current_speed_mps^2 - target_speed_mps^2) / (2 * usable_distance_m)
)
```

The `max(0, …)` clamp covers the case where the vehicle is already at or below target (no deceleration required).

### 5.2 Use this formula for pre-pass normal guidance bands against `target_speed_kmh`

This is the same rule as WIP spec §11.4 and §3.2 above. The formula above uses `target_speed_mps` (the m/s form of `target_speed_kmh`). Substituting `enforcement_threshold_speed` for `target_speed_kmh` in this formula is **not** permitted for the normal-guidance bands. The enforcement-threshold form of the same formula is used **only** to derive whether `unsafe_likely` should fire (§5.4), per enforcement profile recommendation §3.3 and WIP spec §9, §12.2.

### 5.3 Suggested band mapping

The mapping below uses the deceleration profile values from §4.3 as boundaries. The bands themselves are WIP spec §9 / §11.3 vocabulary; this document only recommends the comparison thresholds.

| Band | Condition |
|---|---|
| `awareness` | event relevant inside the per-type lookahead window (§9), but `required_decel_mps2` is not yet above `decel_smooth_mps2`. The driver still has comfortable room. |
| `smooth_required` | `required_decel_mps2 <= decel_smooth_mps2` (i.e., a `smooth` deceleration started now would reach target). |
| `normal_required` | `decel_smooth_mps2 < required_decel_mps2 <= decel_normal_mps2`. |
| `strong_required` | `decel_normal_mps2 < required_decel_mps2 <= decel_strong_mps2`. |
| `emergency_required` | `decel_strong_mps2 < required_decel_mps2 <= decel_emergency_mps2`. |
| `unsafe_likely` | reaching `enforcement_threshold_speed` safely is no longer realistic — see §5.4. |

The boundaries above are **half-open** with `<=` on the upper side so that exactly hitting a profile value places the band at the named level (`smooth_required` exactly at `decel_smooth_mps2`, etc.). The exact comparison (`<` vs `<=`) is a tuning question; the sweep should validate that band transitions happen at the expected speeds.

The `awareness` band is intentionally distance/lookahead-gated rather than deceleration-gated: it is the visible state when the event has entered the dynamic action-horizon (WIP spec §9) and per-type lookahead window (§9 here) but no deceleration is required yet. The intent is to use it for early, calm preview of an upcoming event.

### 5.4 `unsafe_likely`

`unsafe_likely` is the only pre-pass band that uses `enforcement_threshold_speed`, per enforcement profile recommendation §3.3 and WIP spec §9, §12.2.

The recommended emulator computation:

1. Recompute the formula in §5.1 using `enforcement_threshold_speed / 3.6` in place of `target_speed_mps`. Call the result `required_decel_to_threshold_mps2`.
2. Compare `required_decel_to_threshold_mps2` to `decel_emergency_mps2` (and, optionally, to a separately tunable `realistic_safe_braking_max_mps2` if the sweep finds it useful).
3. If `required_decel_to_threshold_mps2` exceeds `decel_emergency_mps2`, the vehicle can no longer realistically reach `enforcement_threshold_speed` without unsafe / emergency-level braking — fire `unsafe_likely`.
4. The pre-pass unrecoverable distance trigger (WIP spec §12.3) is an additional path into the critical pre-pass state, owned by WIP spec §12.3 — this document does not redefine it.

Align this with enforcement profile recommendation §3.3 and WIP spec §12.2: `unsafe_likely` is the **only** pre-pass place where the enforcement threshold appears; everywhere else in the normal-guidance bands uses `target_speed_kmh`.

### 5.5 Display smoothing vs raw computation

The emulator should compute `required_decel_mps2` and the urgency band against the **raw** `current_speed_kmh`, not against the smoothed display value. The smoothed display value (§7) drives the **shown** number on the current-speed indicator; the band selection drives the **shown** ring intensity. The two streams converge in the rendered UI but are separately computed.

The debug surface (§13) must expose the raw computed `required_decel_mps2` so a reviewer can verify the chosen band corresponds to the formula's output and is not being hidden by the smoothing.

### 5.6 What this section does not over-spec

WIP spec §11 owns the rendering of the urgency ring (alpha values, neutral-at-target rule, live recalculation rule). This section provides enough formula and threshold guidance for a future implementation slice to consume the urgency-band output and render it per WIP spec §11. It does **not** specify ring widths, colours, alpha curves, blink rates, or per-band animation details.

## 6. Reaction time and safety margin

### 6.1 Recommended defaults

- `reaction_time_default_s = 1.0 s` — used in all default scenarios.
- `reaction_time_high_speed_s = 1.5 s` — used in a high-speed / poor-visibility debug scenario, selectable in the emulator's tuning config (§13).
- `safety_margin_m = 0` by default; optional `5–10 m` for debug runs validating sensitivity of the urgency banding to a small distance pad.

These are **modelling assumptions**, not statements about real human reaction time. The sweep (§10) deliberately explores ranges that include longer reaction-time values (up to ~2.0 s) so the emulator can be compared against the WIP spec §9 working default of 2.0 / 2.5 s.

### 6.2 Optional driver-adjustable reaction time

A driver-adjustable reaction-time setting (e.g., "I am tired / driving at night / new driver") is **out of POC V1 scope** and is mentioned here only to flag that the emulator's tuning config separation already supports it as a later addition. Adding it would not change the model — only the value selection — but it would change product UX, which is not in POC V1 (§14, §15).

### 6.3 What these defaults do not imply

- They do **not** imply that all drivers can safely react within the chosen reaction time.
- They do **not** constitute human-factors certification.
- They do **not** establish a standard reaction time for any driving scenario.
- They are not legal or safety guidance.

A future product or real-device prototype must revisit reaction-time assumptions explicitly; nothing here pre-decides that.

## 7. Speed smoothing and hysteresis

The three values `alpha_smoothing_ms`, `display_hysteresis_kmh`, and `clear_hysteresis_kmh` cover **three distinct concerns** that are easy to conflate. The recommendations below keep them separate.

### 7.1 `alpha_smoothing_ms` — displayed-indicator smoothing only

- Affects the **displayed number** on the current-speed circle and the **visible state transitions** that depend on the displayed number for animation continuity.
- Does **not** change the raw `current_speed_kmh` used for required-deceleration computation, urgency-band selection, pass-speed sampling, or event selection.
- Implemented as a UI-side low-pass / exponential moving filter or equivalent over the raw `current_speed_kmh`; the exact filter shape is an implementation choice. The sweep should record the displayed-vs-raw difference at the relevant moments (band transitions, pass points, hysteresis boundaries) so smoothing is visible, not implicit.
- Recommended starting value `300 ms`; explore `150–500 ms` (with `250–400 ms` as the most promising sub-range to validate first).

### 7.2 `display_hysteresis_kmh` — prevents urgency-ring jitter around target

- A symmetric ±`display_hysteresis_kmh` band around `target_speed_kmh` inside which the current-speed circle keeps its current visual state (WIP spec §11.1, §11.5).
- Prevents the urgency ring from flickering on/off when `current_speed_kmh` brushes against the target.
- Does **not** change `target_speed_kmh`, `enforcement_threshold_speed`, or the deceleration thresholds.
- Recommended starting value `2 km/h`; explore `1–3 km/h`.

### 7.3 `clear_hysteresis_kmh` — prevents oscillation when clearing a state

- Applied when clearing an active visual state (e.g., when transitioning out of an over-target urgency band after passing or after the driver slows below the previously over-target speed).
- May be equal to or slightly larger than `display_hysteresis_kmh` so re-entry into the active state does not happen immediately after clearing.
- Recommended starting value `3 km/h`; explore `2–5 km/h`.

### 7.4 Pass speed sampling uses authoritative simulated speed

`pass_speed_kmh` is sampled from the **raw** `current_speed_kmh` at the pass point. It is **not** the lagging display-smoothed value. The reason: pass-feedback tiering (WIP spec §12.4; enforcement profile recommendation §7) must reflect what the vehicle actually did, not the indicator's smoothed approximation. If the emulator is explicitly testing visual-mode-only pass behaviour, that variant must be a labelled debug toggle in the tuning config, not the default.

### 7.5 Debug must show raw, smoothed, and hysteresis state separately

The emulator debug surface (§13) must show:

- raw `current_speed_kmh`;
- displayed `current_speed_kmh` (after `alpha_smoothing_ms`);
- `target_speed_kmh`;
- `enforcement_threshold_speed`;
- `display_hysteresis_kmh` and the current hysteresis state (e.g., `within_display_band` / `above_band` / `below_band`);
- `clear_hysteresis_kmh` and the current clear state (e.g., `cleared_recently` / `armed`).

Collapsing these into a single field would defeat the separation rule (§1) and would make it harder to tune any one of them independently.

## 8. Pass feedback timing

### 8.1 Starting value and range

- `pass_feedback_hold_s = 2.0 s`.
- Suggested tuning range: `1.5–3.0 s`.
- Purpose: visible enough to register, short enough not to block the next event from becoming primary.

This is shorter than the WIP spec §12.5 working default of ~4 s; the sweep (§10) should explicitly compare the 2 s, 3 s, and 4 s settings on scenarios where a second event arrives close behind the first, so the trade-off between feedback clarity and next-event responsiveness is evidence-driven.

### 8.2 Interruption policy when another event becomes urgent during the hold

If another event becomes primary during the `pass_feedback_hold_s` window, two basic policies exist:

1. **Interrupt the hold** for the higher-priority upcoming event; the new primary takes over the speed circle and the just-passed feedback collapses (or shrinks into a secondary / compact state).
2. **Keep the hold** in a secondary / compact state while the new primary takes over the speed circle.

The **recommended conservative initial behaviour** is:

- Allow an urgent upcoming event to **interrupt** the hold when the upcoming event's urgency band is `strong_required`, `emergency_required`, or `unsafe_likely` for the new primary's `target_speed_kmh`.
- Allow the hold to continue at full visual treatment when the upcoming event's urgency band is `awareness`, `smooth_required`, or `normal_required`.
- Record any interruption in the debug surface with: the time of interruption, the interrupting event's `event_id`, and its urgency band at the moment of interruption.

This is a **recommendation**, not an implementation rule. The sweep should validate both policies on the relevant scenarios (e.g., `road_bump` immediately after a `speed_limit` with a high pass speed) and the chosen behaviour should be the one whose debug-visible outcome reads cleanest to a human reviewer.

### 8.3 Camera-risk variant timing

The camera-risk visual variant (WIP spec §13; enforcement profile recommendation §3.3, §6.2) uses the same `pass_feedback_hold_s` value as the non-camera Tier 2 visual (WIP spec §13.4 working default `~4 s` aligns with §8.1 here). The optional camera-icon pulse (WIP spec §13.3) sits inside the stable hold; its cadence is owned by WIP spec §13.3 and is not redefined here.

### 8.4 What this section does not do

- It does **not** define the visual treatment of pass feedback (WIP spec §12.4 / §13 do that).
- It does **not** define what counts as "the pass point" — that is the route-projection logic from the direction applicability recommendation §2 and the route geometry provider recommendation §2.
- It does **not** define how `pass_speed_kmh` is compared to `target_speed_kmh` and `enforcement_threshold_speed` — enforcement profile recommendation §7 does that.

## 9. Per-type lookahead guardrails

These are **per-event-type bounds** on the dynamic action-horizon (WIP spec §9). The dynamic horizon is the primary rule; the guardrails are caps and floors that prevent obviously-too-late or obviously-too-early displays.

### 9.A. `speed_limit`

- **Minimum display distance:** 150–200 m.
- **Maximum lookahead:** 800–1000 m.

Rationale:

- `speed_limit` changes the **sustained** speed regime, not a single moment; the driver benefits from earlier awareness than for a discrete hazard.
- The minimum prevents the speed-limit sign first appearing at a distance where there is essentially no time to prepare (the dynamic horizon usually catches this first; the floor is a safety net).
- The maximum prevents distant speed-limit changes from pushing a nearer, more time-relevant event out of the visible stack. It also avoids the emulator feeling like a navigator listing every distant change.

### 9.B. `static_camera`

- **Minimum display distance:** 200–300 m.
- **Maximum lookahead:** 1000–1200 m.

Rationale:

- Camera-risk feedback (WIP spec §13; enforcement profile recommendation §6.2) benefits from a clearly visible preparation window; abrupt braking near a camera is exactly what the UI should help the driver avoid.
- Slightly larger windows than `speed_limit` because the camera variant carries an explicit risk-feedback semantic that the driver should have time to respond to calmly.
- The wording is **anticipatory speed-awareness**, not "camera detected" anti-radar language; the visual treatment must follow WIP spec §13.1's "possible camera risk" wording rule.

### 9.C. `road_bump`

- **Minimum display distance:** 80–120 m.
- **Maximum lookahead:** 400–600 m.

Rationale:

- A road bump is a **local** hazard. Too-early display is noise: the driver does not benefit from being told about a bump 800 m away when there is plenty of time to handle other events first.
- Normal guidance based on the event's advisory `target_speed_kmh` is sufficient (enforcement profile recommendation §6.3 recommends leaving `road_bump` out of the enforcement profile's `applies_to_event_types` by default; this document does not change that).
- No legal enforcement implication; the lookahead exists only to drive useful UI for an advisory hazard.

### 9.D. Speed-aware lookahead is a future improvement

These values are **fixed per-type distances** for POC V1. A future version may compute lookahead by **time-to-event** rather than distance only — e.g., "show `speed_limit` between 12 s and 30 s ahead at current speed". A time-based lookahead aligns more naturally with the dynamic action-horizon (WIP spec §9) and is plausibly the right long-term form.

POC V1 explicitly uses **distance-based** guardrails because:

- the dynamic action-horizon (WIP spec §9) already does the speed-aware part of the calculation;
- distance-based guardrails are simpler to reason about and to tune in the sweep;
- moving to time-based later does not require rewriting the data model — it is a tuning-config change in the same place.

Do **not** turn RoadAhead into a full navigator. The per-type lookahead bounds are intentionally narrower than navigator-style "next 5 km" preview lists.

### 9.E. Interaction with the dynamic action-horizon

The dynamic action-horizon (WIP spec §9) decides when an event transitions from `hidden` to `awareness` or to an active band based on the urgency model (§5). The per-type guardrails apply **on top of** the dynamic horizon:

- if the dynamic horizon would make the event visible **inside** `min_display_distance_m`, the visible state is governed by WIP spec §9 and §12.3 (pre-pass unrecoverable trigger); this document does not redefine that behaviour.
- if the dynamic horizon would make the event visible **beyond** `max_lookahead_m`, it stays `hidden` to the driver (it may still appear in debug with a `suppressed_too_far` flag).

In effect: the dynamic horizon decides "is this event time-relevant?"; the per-type guardrails decide "is this event type-appropriate to show at this distance?".

## 10. Scenario sweep / tuning matrix

The scenario sweep is the path from "recommended starting default" to "tuned, then promotable". It is the emulator validation strategy for every value in §4. The sweep should be deterministic, reproducible, and inspectable.

### 10.1 Sweep axes

For each tuning experiment, vary the following inputs:

- **Current speeds:** 40, 60, 80, 100, 120 km/h.
- **Target speeds:** 20, 40, 60, 80, 90 km/h.
- **Distances to event at scenario start:** 50, 100, 200, 500, 1000 m.
- **Enforcement profiles:** `russia_default_plus_20_kmh`, `zero_tolerance_debug` (enforcement profile recommendation §5.1, §5.2).
- **Event types:** `speed_limit`, `static_camera`, `road_bump` (WIP spec §7.1).
- **Road geometry:** straight, curve, event just after a curve, branch / ambiguous case (the latter mirroring the direction applicability recommendation §7's scenario set).

Not every combination needs to be run; the sweep should cover the **boundary** cases (band transitions, pass-speed tiers, lookahead floor/cap behaviour, hysteresis around `target_speed_kmh`) deliberately, then sample the interior for unexpected effects.

### 10.2 Per-scenario debug record

For each scenario, the emulator should record:

- the **primary event selected** (`event_id`, `normalized_type`);
- `distance_to_event_m` at scenario start and at each visual state transition;
- `current_speed_kmh` — both **raw** (authoritative) and **smoothed** (displayed);
- `target_speed_kmh`;
- `enforcement_threshold_speed` (where applicable; null when the event is out of the active profile's `applies_to_event_types`);
- `required_decel_mps2` (raw, from §5.1) and `required_decel_to_threshold_mps2` (for `unsafe_likely`, §5.4);
- the selected **urgency band** at each transition;
- `pass_speed_kmh` at the pass point (from the **authoritative** simulated speed, §3.5);
- `pass_feedback_tier` (Tier 0 / Tier 1 / Tier 2) from enforcement profile recommendation §7;
- `pass_feedback_hold_s` actually observed (start time, end time, and outcome — completed, interrupted, or overridden);
- whether the **camera-risk variant** activated (enforcement profile recommendation §6.2);
- any **debug suppression** or **interruption reasons** (e.g., `suppressed_too_far`, `min_display_distance_floor`, `hold_interrupted_by_urgent_upcoming`).

These records are **per-session runtime artefacts** (prepared event store recommendation §10.4 analogue for the enforcement profile applies here too): they belong in emulator debug exports, not in the prepared event store.

### 10.3 Sweep acceptance gate

The sweep is acceptable when:

- All band transitions occur at the expected speeds for each scenario, given the tuning values in use.
- All pass-feedback tiers occur exactly at the boundaries from enforcement profile recommendation §7.1.
- All per-type lookahead floors and caps fire as expected and are visible in debug.
- All hysteresis state transitions correspond to the configured `display_hysteresis_kmh` and `clear_hysteresis_kmh` values.
- All smoothed-vs-raw differences are explainable from the configured `alpha_smoothing_ms` value.
- Pass-feedback interruption policy behaves predictably; interruption events are recorded in debug.

This document does **not** claim the sweep has been run today. §10.3 defines what the emulator must demonstrate before any tuning value here is promoted past WIP.

## 11. Data/config implications

This section connects to the previous recommendation slices. Threshold tuning config is **emulator/session config**, not base event data.

### 11.1 What goes where

- **Prepared event store (prepared event store recommendation §5)** holds `target_speed_kmh`, `normalized_type`, direction fields, identity, location, and reserved validation metadata. Nothing from this document is added to it.
- **Route geometry contract (route geometry provider recommendation §2)** holds polyline coordinates, cumulative distance, segment bearings, and route-projection utilities. Nothing from this document is added to it.
- **Enforcement profile (enforcement profile recommendation §4)** holds the configurable enforcement-tolerance object (active profile id, tolerance mode, absolute_kmh, etc.). Nothing from this document is added to it.
- **Threshold tuning config** holds the values in §4.1, §4.2, §4.3, §4.4 plus any future tuning fields. **Separate object** from the enforcement profile and from the prepared event store.

### 11.2 Why this separation matters

- The **same event** has the same `target_speed_kmh` regardless of which tuning config is active. Storing `pass_feedback_hold_s` on the event record would silently bake the active tuning into event data and make the same dataset behave differently on rebuild for trivial config reasons.
- The **same enforcement profile** is independent of the tuning config: changing `alpha_smoothing_ms` must not move `enforcement_threshold_speed`, and changing `absolute_kmh` must not move `display_hysteresis_kmh` (§13). Keeping the two objects separate makes that invariance trivially enforceable.
- **Reproducible emulator runs** depend on the active tuning config being inspectable. Future saved emulator runs may record the active tuning config (and the active enforcement profile, and the active route, and the active dataset version) for reproducibility, but those records belong to the run artefact, not to the base event.

### 11.3 What the runtime / debug may emit

The emulator may emit per-session runtime / debug output that includes the active tuning values (§13). This output is debug, not durable event truth. Persisting it across runs is a future emulator-replay concern, not a base-event concern.

## 12. Risks and unknowns

This document inherits known unknowns from the WIP spec and the prior recommendation slices. They are restated so the reader is not misled by the apparent precision of the proposed defaults.

- **Tuning values may be wrong for real driving.** The starting defaults in §4 are emulator tuning assumptions, chosen for behavioural validation. They are not safety guidance.
- **Values are not safety-certified.** No claim is made about real-world safe braking, safe reaction time, or safe display distance.
- **Driver reaction time varies** with age, fatigue, distraction, weather, visibility, vehicle condition, and many other factors. A single configured value cannot represent a real population.
- **Deceleration comfort varies** by vehicle (mass, tyres, brake condition), road surface (dry asphalt, wet, ice, gravel), weather, load, downhill / uphill grade, and driver preference. The named `smooth` / `normal` / `strong` / `emergency` categories are emulator labels, not physics-grounded categories.
- **Too-early warnings create noise and user distrust.** A 600 m warning for a single bump is a navigator-style alert, which is exactly what RoadAhead is not (WIP spec §1, §18).
- **Too-late warnings create stress and abrupt braking.** A 50 m warning for an 80 km/h speed-limit change requires emergency-level deceleration. The dynamic horizon (WIP spec §9) is intended to prevent this, but the per-type guardrails also matter.
- **Smoothing can hide urgent changes.** A high `alpha_smoothing_ms` smooths the displayed indicator but can also delay the driver's perception of a real speed increase. The raw value used for urgency-band selection prevents the model from being fooled, but the *driver* still sees the smoothed number.
- **Hysteresis can delay useful state transitions.** A high `display_hysteresis_kmh` keeps the ring quiet around target, but a too-high value can make the urgency state lag a real over-target situation.
- **Camera language can drift into anti-radar semantics.** Even with WIP spec §13.1's "possible camera risk" wording rule, a too-long lookahead window or too-prominent visual could feel like anti-radar; RoadAhead is not an anti-radar (WIP spec §1, §16, §18).
- **Road-bump guidance can feel noisy if shown too early.** The per-type lookahead range here is intentionally tighter; an emulator showing road-bump warnings 500 m ahead is likely doing the wrong thing.
- **Fixed distance guardrails are a simplification.** A time-based lookahead (§9.D) may be more appropriate later; POC V1's distance-based approach is acceptable for tuning but is not the final shape.
- **Emulator validation on synthetic routes may not generalize** to real-device behaviour. The sweep (§10) is necessary but not sufficient; real-device validation is a later phase (WIP spec §21).
- **Datakam `target_speed_kmh` is candidate data, not verified truth** (prepared event store recommendation §9.1; WIP spec §16). The tuning model is no better than the target speed it consumes.
- **The values in §4 intentionally differ in places from WIP spec §9 / §20.5.** The sweep is what reconciles them; until the sweep runs, both number sets are working defaults, not truths.

## 13. Validation plan

The validation plan defines **acceptance checks** for the tuning surface itself, independent of the scenario sweep that exercises the values. The plan fits inside the same emulator surface used by the prior recommendation slices and is intended to be enforceable by reviewer inspection of the debug surface.

Required checks, in roughly executable order:

- **All tuning values are visible in the debug surface.** The active `pass_feedback_hold_s`, `display_hysteresis_kmh`, `clear_hysteresis_kmh`, `alpha_smoothing_ms`, `reaction_time_default_s`, `reaction_time_high_speed_s`, `safety_margin_m`, `decel_smooth_mps2`, `decel_normal_mps2`, `decel_strong_mps2`, `decel_emergency_mps2`, and the per-type lookahead guardrails (`min_display_distance_m`, `max_lookahead_m` for each of `speed_limit`, `static_camera`, `road_bump`) are all inspectable in the debug surface, alongside the live raw inputs (`current_speed_kmh`, `target_speed_kmh`, `distance_ahead_m`).
- **Each tuning field changes only its intended behaviour.** Changing `pass_feedback_hold_s` does not change band transitions; changing `display_hysteresis_kmh` does not change `enforcement_threshold_speed`; changing `alpha_smoothing_ms` does not change `pass_speed_kmh` sampling; changing `decel_emergency_mps2` does not change the `awareness` / `smooth_required` boundary; changing a per-type `max_lookahead_m` does not affect a different type's display.
- **Normal guidance uses `target_speed_kmh`, not `enforcement_threshold_speed`.** Sweep the same route under two profiles (e.g., `russia_default_plus_20_kmh` and `zero_tolerance_debug`) and confirm that the `awareness` / `smooth_required` / `normal_required` / `strong_required` / `emergency_required` band boundaries do not move with the profile change. Only `unsafe_likely` and pass-feedback tiers should move (mirrors enforcement profile recommendation §12).
- **Enforcement threshold affects only `unsafe_likely`, pass tier, and the camera-risk variant.** The same sweep verifies enforcement profile recommendation §3.3's "exactly three places" rule end-to-end through this document's formula and band thresholds.
- **Hysteresis does not move thresholds.** Change `display_hysteresis_kmh` from `1` to `3` km/h and confirm that `target_speed_kmh`, `enforcement_threshold_speed`, and the deceleration profile values do not change in debug. Confirm that the urgency-band selection still uses the unmodified `target_speed_kmh`.
- **`alpha_smoothing_ms` does not change `pass_speed_kmh` sampling.** Run the same scenario with `alpha_smoothing_ms` at the lower and upper ends of its range; confirm `pass_speed_kmh` is identical (both samples drawn from raw `current_speed_kmh` at the pass point).
- **Emergency / unsafe state appears only when required decel exceeds configured limits.** Run scenarios that should produce `emergency_required` but not `unsafe_likely`, and scenarios that should produce `unsafe_likely`; confirm the right band is chosen, and confirm `unsafe_likely` uses the **threshold** form of the formula (§5.4), not the target form.
- **Road-bump warnings are not displayed too far ahead.** With `road_bump.max_lookahead_m` at the recommended starting value, a `road_bump` 800 m ahead is not visible to the driver (it may appear in debug with `suppressed_too_far`).
- **Static camera warnings are early enough to avoid abrupt braking.** With `static_camera.min_display_distance_m` at the recommended starting value, a `static_camera` at the relevant target speed appears with enough room for at least `normal_required` deceleration (and ideally `smooth_required`) given the scenario's current speed.
- **Pass feedback is visible but interruptible by urgent upcoming events.** With `pass_feedback_hold_s = 2.0 s` and an urgent upcoming `road_bump` after a `speed_limit`, confirm the hold can be interrupted per §8.2 and that the interruption is recorded in debug.
- **Scenario sweep results can be compared before/after tuning changes.** Re-running the same scenario after changing one tuning field produces a debug output that differs only in the expected places. Diffing two sweep runs surfaces tuning impact cleanly.

This document does **not** claim these acceptance checks are met today. §13 defines what the emulator must demonstrate before any threshold tuning item is promoted past WIP.

## 14. Canon-readiness split

This document is Research. Nothing here is being promoted to Canon by this PR. The classification below is informational; it helps a later Canon / decision review separate stable principles from tuning / implementation details.

### 14.1 Possible future Canon candidates

These principles look **stable enough** to be considered for later Canon promotion or an ADR after the emulator scenario sweep demonstrates them:

- **Tuning config is explicit and debug-visible.** Threshold and timing values are sourced from a single inspectable tuning object, not hidden constants.
- **Threshold tuning is separate from the enforcement profile.** The two objects are independent; changing one does not silently change the other.
- **Normal guidance is target-speed-based.** Normal urgency bands compute `required_decel_mps2` against `target_speed_kmh`, never against `target_speed_kmh + resolved_enforcement_tolerance_kmh`.
- **Raw and smoothed speed are separately observable.** The debug surface distinguishes the authoritative raw `current_speed_kmh` from the displayed/smoothed indicator value and from the hysteresis state.
- **The required-deceleration model is the basis of urgency.** Band selection is driven by `required_decel_mps2` against the configured deceleration profile thresholds, with `unsafe_likely` as the only band consuming `enforcement_threshold_speed`.
- **Base events do not store tuning-derived values.** Tuning state is session/config, not event data; route-derived state is route-session, not event data; the base prepared event record is route- and tuning-agnostic.
- **Scenario sweeps are required before Canon promotion.** Tuning values move past WIP only with reproducible emulator evidence.

### 14.2 Must remain WIP

These items must **stay WIP / emulator tuning** and should **not** be promoted to Canon based on this document alone:

- **Exact numeric defaults** for `pass_feedback_hold_s`, `display_hysteresis_kmh`, `clear_hysteresis_kmh`, `alpha_smoothing_ms`.
- **Exact deceleration thresholds** for `decel_smooth_mps2`, `decel_normal_mps2`, `decel_strong_mps2`, `decel_emergency_mps2` (and any future `realistic_safe_braking_max_mps2`).
- **Exact reaction time values** (`reaction_time_default_s`, `reaction_time_high_speed_s`), and any `safety_margin_m`.
- **Exact hysteresis values** beyond the rule that `display_hysteresis_kmh` and `clear_hysteresis_kmh` are separate, debug-visible, and small.
- **Exact `alpha_smoothing_ms` value** and the implementation choice of filter shape.
- **Exact `pass_feedback_hold_s`** value and the exact interruption policy.
- **Exact per-type lookahead caps and floors** for `speed_limit`, `static_camera`, `road_bump`.
- **Interruption policy details** for pass feedback (§8.2).
- **Time-based vs distance-based lookahead.** POC V1 uses distance-based; the time-based future direction (§9.D) is a candidate, not a decision.
- **Any real-world safety claims** about human reaction time, comfortable braking, safe lookahead, or compliance with any standard.

## 15. Cross-links

WIP spec and decision context:

- [`../product/wip/roadahead-poc-v1-three-circle-assistant.md`](../product/wip/roadahead-poc-v1-three-circle-assistant.md) — main POC V1 WIP spec; this document expands §9 (dynamic preview / action thresholds), §11.5 (suggested POC tuning fields), §12.5 (pass feedback hold timing), §13.4 (camera-risk defaults), and §20.5 (threshold tuning ranges).
- [`../product/wip/roadahead-poc-v1-initial-product-decisions-workbook.md`](../product/wip/roadahead-poc-v1-initial-product-decisions-workbook.md) — companion rationale / input history.

Companion recommendation slices (Issue #20):

- [`roadahead-direction-applicability-recommendation.md`](roadahead-direction-applicability-recommendation.md) — direction applicability recommendation; supplies the eligibility decision and `distance_ahead_m` that feed the urgency model.
- [`roadahead-route-geometry-provider-recommendation.md`](roadahead-route-geometry-provider-recommendation.md) — route geometry provider recommendation; defines the normalized `RouteGeometry` contract from which `event_route_position_m` and `vehicle_route_position_m` are derived.
- [`roadahead-prepared-event-store-recommendation.md`](roadahead-prepared-event-store-recommendation.md) — prepared event store recommendation; defines the `target_speed_kmh` source the tuning model consumes and the separation that keeps tuning-derived values off the base event record.
- [`roadahead-enforcement-profile-recommendation.md`](roadahead-enforcement-profile-recommendation.md) — enforcement profile recommendation; owns `resolved_enforcement_tolerance_kmh` and `enforcement_threshold_speed`, which this document references only at `unsafe_likely`, pass-feedback tiers, and the camera-risk variant.

Source-level research (background only; not safety / legal sources):

- [`datakam-speedcam-format-and-route-qa.md`](datakam-speedcam-format-and-route-qa.md) — Datakam / OpenSpeedcam format and field semantics, the origin of `target_speed_kmh` for POC V1 candidate events.
- [`datakam-manual-qa-status-semantics.md`](datakam-manual-qa-status-semantics.md) — manual QA status semantics; relevant context that `target_speed_kmh` from Datakam remains candidate data, not verified truth, regardless of tuning choice.
