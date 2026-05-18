---
status: Research / technical recommendation
canon: false
source: POC V1 WIP spec §10, §11, §12, §13, §20.4; companion decision workbook Q13, Q14; direction applicability, route geometry provider, and prepared event store recommendations
purpose: Recommend an enforcement profile / emulator configuration model for the POC V1 interactive web route emulator
context: RoadAhead POC V1, interactive web route emulator, Russia-focused initial profile; emulator/feedback model only, not a legal authority
---

# RoadAhead — Enforcement profile / emulator config recommendation (POC V1)

> **Status — Research / technical recommendation. Not Canon.**
> This document is input for a future Canon / decision review. It is not an implementation plan, not an implementation slice, not a decision record, and not Canon. It does **not** claim legal correctness of any speed limit. It does **not** treat any jurisdiction profile (including the Russia +20 km/h POC default) as legal advice or verified legal truth. It does **not** define pass-feedback timing, hysteresis, deceleration profiles, reaction time, alpha smoothing, or per-type lookahead guardrails — those belong to a separate threshold tuning recommendation (Issue #20 §5; WIP spec §20.5).

## 1. Executive recommendation

For the **POC V1 interactive web route emulator** (WIP spec §3, §10–§13, §20.4) the recommended starting posture is:

- **POC V1 should use an explicit `enforcement_tolerance_profile` object**, not a hard-coded tolerance constant. The profile is the **sole source** of the resolved tolerance value used by severity / risk feedback.
- The **initial Russia-focused POC default** is `russia_default_plus_20_kmh` — **absolute tolerance of +20 km/h**, treated as a WIP working default for the Russia-focused emulator. It is not a legal guarantee and must be re-verified against current official/legal/public sources before any product or legal use.
- **`enforcement_threshold_speed = target_speed_kmh + resolved_enforcement_tolerance_kmh`** is the single formula used wherever the enforcement threshold is referenced.
- **Normal guidance remains based on `target_speed_kmh`**, not on `enforcement_threshold_speed`. The enforcement profile must **not** be allowed to leak into the `awareness` / `smooth_required` / `normal_required` / `strong_required` / `emergency_required` bands (WIP spec §11.4).
- **Enforcement profile affects only**: pre-pass `unsafe_likely`, post-pass severity tiers (Tier 0 / Tier 1 / Tier 2), and the camera-risk feedback variant (WIP spec §11.4, §12, §13).
- **The selected profile and the resolved tolerance must be visible in the emulator debug/config surface**, not buried in code constants. The point of having a profile object is that the active configuration is inspectable per session.
- **Live profile switching is optional / nice-to-have.** Static config at emulator start is sufficient for the first emulator validation slice. If live switching is added, the emulator must recompute all active enforcement-derived values immediately and surface the change in debug.
- **No legal correctness claim is made or implied** by any profile in this document. The profile is an emulator / feedback configuration, not a legal authority.

This recommendation deliberately separates **three concepts that are easy to conflate**:

- `target_speed_kmh` — what the event itself says (the posted / recommended target),
- `enforcement_tolerance` — a configurable severity buffer, used only for `unsafe_likely` / pass severity / camera-risk feedback,
- `display_hysteresis_kmh` — UI smoothing around `target_speed_kmh`, unrelated to enforcement.

Each is sourced differently and serves a different purpose. Mixing them — especially silently substituting `target_speed + enforcement_tolerance` for `target_speed` in normal guidance — would teach the driver to drive at the tolerance buffer as if it were the target, which is explicitly not desired (WIP spec §11.4).

## 2. Definitions

These terms are used throughout this document. They align with WIP spec §10–§13 and §20.4 and with the companion workbook (Q13, Q14). Exact field names belong to a later implementation slice and may differ.

- **`target_speed_kmh`** — the event's posted / recommended / advisory speed, sourced from the prepared event record (e.g., Datakam `SPEED` for `speed_limit`, `static_camera`, or `road_bump`). The reference for normal guidance and required-deceleration urgency. Nullable for event types that do not carry a target speed.
- **`current_speed_kmh`** — the simulated vehicle speed in POC V1, manually controlled by the user (WIP spec §3, §4).
- **`pass_speed_kmh`** — the value of `current_speed_kmh` at the instant the vehicle passes the event point on the route. Sampled once per event pass; the exact sampling rule is an emulator concern.
- **`enforcement_tolerance`** — a configurable severity buffer above `target_speed_kmh`, used **only** for `unsafe_likely`, pass-feedback tiers, and camera-risk feedback (WIP spec §11.4, §12, §13). Not used for normal guidance.
- **`resolved_enforcement_tolerance_kmh`** — the enforcement tolerance expressed as an absolute km/h value, after the active profile has been applied to the event's `target_speed_kmh`. In POC V1 the resolved value comes directly from the profile's `absolute_kmh` field (percent / hybrid modes are reserved for the future).
- **`enforcement_threshold_speed`** — `target_speed_kmh + resolved_enforcement_tolerance_kmh`. Computed per event in the active route session; not stored on the base event record (§10).
- **`enforcement_tolerance_profile`** — a small named configuration object that describes how to resolve the enforcement tolerance for a given event. The schema is in §4. The single source of truth for tolerance values inside the emulator's enforcement model.
- **`jurisdiction profile`** — an `enforcement_tolerance_profile` whose `country_or_region` field is set and whose values are intended to represent a particular jurisdiction's enforcement tolerance. **Working/non-final** in POC V1; not legal truth even when filled in (e.g., `russia_default_plus_20_kmh`).
- **`display_hysteresis_kmh`** — a small UI smoothing value around `target_speed_kmh`, used only to avoid jitter in the current-speed indicator (WIP spec §11.5). **Separate** from `enforcement_tolerance`. Lives in threshold tuning, not in the enforcement profile.
- **`pass_feedback_tier`** — one of Tier 0, Tier 1, Tier 2, defined by comparing `pass_speed_kmh` against `target_speed_kmh` and `enforcement_threshold_speed` (WIP spec §12.4; §7 of this document). A severity / feedback category, **not** a legal verdict.
- **`camera-risk feedback`** — the visual variant of `pass_feedback_hold` used for `static_camera` events when the event was passed (or about to be passed unrecoverably) above the enforcement threshold (WIP spec §13). Communicates only "possible camera risk", not violation / fine / confirmed capture / guaranteed enforcement.
- **`unsafe_likely`** — a pre-pass urgency state on the left-circle red ring, defined as: the vehicle can no longer realistically pass the event at or below `enforcement_threshold_speed` without unsafe / emergency-level braking (WIP spec §9, §12.2). The only place the enforcement threshold appears in the pre-pass urgency bands.
- **`emulator config`** — the configuration values selected for an emulator session, including the active `enforcement_tolerance_profile`. Distinct from the prepared event store (the event data) and from runtime/debug outputs.
- **active config vs debug display** — *active config* is what the running emulator session is actually using to compute behavior. *Debug display* is how that config is surfaced for inspection. The two must be consistent; a debug surface that lies about the active config is a defect.
- **legal truth / non-claim boundary** — the line this document refuses to cross. RoadAhead POC V1 does not claim that any profile reflects current law or regulatory practice. Jurisdiction profile values are working assumptions, marked as needing re-verification before any product/legal use.

## 3. POC V1 enforcement model

The model below describes how the enforcement profile is **wired into** event handling. It does not redefine pre-pass urgency, pass feedback, or camera-risk visuals — those are owned by WIP spec §11–§13. This section only specifies the **interface** between the profile and those features.

### 3.1 Inputs

For each event evaluated by the emulator in route-known mode:

- `event.normalized_type` (POC scope: `speed_limit`, `static_camera`, `road_bump`; WIP spec §7.1);
- `event.target_speed_kmh` (nullable for some event types);
- `current_speed_kmh` (manually controlled);
- `pass_speed_kmh` (sampled at the pass point);
- the active `enforcement_tolerance_profile` (session-level config, §8);
- `resolved_enforcement_tolerance_kmh` (computed from the profile applied to this event).

### 3.2 Computed values

For each event with a non-null `target_speed_kmh`:

```
resolved_enforcement_tolerance_kmh
    = resolve_profile(active_profile, event)        // §4

enforcement_threshold_speed
    = target_speed_kmh + resolved_enforcement_tolerance_kmh
```

`enforcement_threshold_speed` is a per-event, per-session computed value. It is **not** part of the base prepared event record (§10; prepared event store recommendation §5, §7).

### 3.3 Where the threshold is used

The enforcement threshold appears in **exactly three places**:

- **Pre-pass `unsafe_likely`** (WIP spec §9, §12.2) — the blinking pre-pass condition that means "passing this event at or below the enforcement threshold without unsafe braking is no longer realistic". This is the only place `enforcement_threshold_speed` appears in the pre-pass urgency bands; the other bands (`awareness` / `smooth_required` / `normal_required` / `strong_required` / `emergency_required`) are computed against `target_speed_kmh`, not the threshold (WIP spec §11.4).
- **Post-pass tiers** (WIP spec §12.4) — the comparison `pass_speed_kmh` vs `target_speed_kmh` vs `enforcement_threshold_speed` (§7 of this document) classifies the pass into Tier 0 / Tier 1 / Tier 2.
- **Camera-risk variant** (WIP spec §13) — the camera-risk visual is triggered only when `pass_speed_kmh > enforcement_threshold_speed` (or the equivalent pre-pass unrecoverable condition). Below the threshold, a passed camera shows only non-critical over-target feedback (or none, if at/below target).

Anywhere else in the system that needs a "speed reference" must use `target_speed_kmh`, not `enforcement_threshold_speed`. In particular, `display_hysteresis_kmh` always wraps `target_speed_kmh`, never the enforcement threshold.

### 3.4 What the model does not do

- It does **not** define how to draw the red urgency ring (WIP spec §11 does that).
- It does **not** define how long `pass_feedback_hold` lasts (WIP spec §12.5; threshold tuning, Issue #20 §5).
- It does **not** define the camera-icon pulse cadence (WIP spec §13.3).
- It does **not** define the deceleration profiles or reaction time (WIP spec §9; threshold tuning).
- It does **not** decide whether `display_hysteresis_kmh` is 1 km/h or 2 km/h (WIP spec §11.5; threshold tuning).
- It does **not** claim that exceeding the enforcement threshold actually results in a fine, ticket, or camera capture in any jurisdiction.

The model is intentionally narrow: it owns *what the threshold value is and when it is consulted*, nothing else.

## 4. Recommended POC profile schema

The schema below is a **recommended starting shape** for the `enforcement_tolerance_profile` object. Field names are informative; final names belong to a later implementation slice. The schema is intentionally minimal for POC V1, with explicitly reserved fields for futures that POC V1 must not foreclose.

### 4.1 Fields

| Field | Type | Nullable | POC V1 status | Rationale |
|---|---|---|---|---|
| `profile_id` | string (stable slug) | no | active | Stable identifier for the profile, e.g., `russia_default_plus_20_kmh`. Used by `emulator config` to select the active profile and by debug to display which profile is active. |
| `label` | string | no | active | Short human-readable name shown in the emulator dropdown / debug surface (e.g., `Russia (POC default, +20 km/h)`). |
| `country_or_region` | string (ISO code or free text) | yes | active | Hint about intended jurisdiction. Nullable because debug / synthetic profiles need not be tied to one. Setting it does **not** make the profile legal truth (see `legal_claim`). |
| `tolerance_mode` | enum (`absolute_kmh`, `percent`, `hybrid`) | no | only `absolute_kmh` active | Selects how the tolerance value is resolved for a given event. POC V1 implements `absolute_kmh` only; `percent` and `hybrid` are reserved schema slots for a later implementation. |
| `absolute_kmh` | int | yes | active for `absolute_kmh` mode | The absolute tolerance value in km/h. Required when `tolerance_mode = absolute_kmh`; null otherwise. Example: `20` for `russia_default_plus_20_kmh`. |
| `percent` | number | yes | **reserved** (future) | The proportional tolerance (e.g., `5` meaning 5%). Reserved for future jurisdictions where regulatory tolerance is expressed proportionally. **Not active in POC V1.** |
| `min_kmh` | int | yes | **reserved** (future) | Optional minimum tolerance floor for `percent` or `hybrid` modes. **Not active in POC V1.** |
| `max_kmh` | int | yes | **reserved** (future) | Optional maximum tolerance ceiling for `percent` or `hybrid` modes. **Not active in POC V1.** |
| `applies_to_event_types` | array of normalized type strings | yes | active | Subset of `normalized_type` values the profile applies to. Null / empty means "applies to all in-scope POC event types" (`speed_limit`, `static_camera`, with cautious treatment for `road_bump`; see §6). |
| `notes` | string | yes | active | Free-text notes — e.g., "WIP working default; not legal truth". |
| `source` / `rationale` | string | yes | active | Where the values came from (e.g., "WIP spec §20.4; needs re-verification against current Russian regulations before any product/legal use"). |
| `status` | enum (`poc_default`, `experimental`, `debug`, `future`, `disabled`) | no | active | Lifecycle / intent label. `poc_default` for the active POC default; `debug` for emulator-only debug profiles; `future` for reserved profiles not active in POC V1; `experimental` for tuning experiments; `disabled` for explicitly off. |
| `legal_claim` | bool | no, fixed `false` | active | **Always `false`** in POC V1. The schema reserves the field so that any future tightening of legal posture has a place to declare it explicitly; until then the field is a permanent reminder that no profile is legal truth. |

### 4.2 Resolution function

The resolution function is the only place a profile's mode is interpreted. In POC V1 it is small enough to keep inline; the schema simply leaves room for the future modes.

```
resolve_profile(profile, event) -> resolved_enforcement_tolerance_kmh:
    if event.normalized_type not in (profile.applies_to_event_types or all_in_scope):
        return undefined  // event is out of profile scope; emulator decides behavior
    if profile.tolerance_mode == "absolute_kmh":
        return profile.absolute_kmh
    if profile.tolerance_mode == "percent":
        // reserved; not implemented in POC V1
        raise NotImplementedInPocV1
    if profile.tolerance_mode == "hybrid":
        // reserved; not implemented in POC V1
        raise NotImplementedInPocV1
```

POC V1 must **explicitly fail** if a non-`absolute_kmh` mode is selected, rather than silently fall back to a default. Silent fallback would defeat the schema's purpose of making the active configuration inspectable.

### 4.3 What the schema is not

- It is **not** a database of jurisdictions.
- It is **not** a legal source.
- It is **not** a runtime decision-making engine; it is a small named config object.
- It does **not** carry pass-feedback timing, hysteresis, alpha, reaction time, or deceleration values; those are threshold tuning (Issue #20 §5, §9 of this document).
- It does **not** belong on the base event record; it lives in emulator session/config state (§10).

## 5. Initial profiles

The POC V1 emulator should ship with a **small set** of named profiles. The set below is the recommended starting point. **Do not** add a broad country list in POC V1; jurisdiction breadth is a future concern (§11, §13).

### 5.1 `russia_default_plus_20_kmh` — POC default

| Field | Value |
|---|---|
| `profile_id` | `russia_default_plus_20_kmh` |
| `label` | Russia (POC default, +20 km/h) |
| `country_or_region` | RU |
| `tolerance_mode` | `absolute_kmh` |
| `absolute_kmh` | 20 |
| `applies_to_event_types` | `speed_limit`, `static_camera` (see §6 for `road_bump`) |
| `status` | `poc_default` |
| `legal_claim` | `false` |
| `source` / `rationale` | WIP working default for the Russia-focused emulator (WIP spec §20.4; companion workbook Q13). **Working assumption**, not legal guidance; current Russian regulatory tolerance must be re-verified against official/legal/public sources before any product/legal use. |

This profile is the working default for the first emulator slice. It is not legal advice. It is not "verified". It is a configurable starting value chosen because the WIP spec uses Russia as the initial POC focus and +20 km/h as the working tolerance number.

### 5.2 `zero_tolerance_debug` — debug

| Field | Value |
|---|---|
| `profile_id` | `zero_tolerance_debug` |
| `label` | Zero tolerance (debug) |
| `country_or_region` | (null) |
| `tolerance_mode` | `absolute_kmh` |
| `absolute_kmh` | 0 |
| `applies_to_event_types` | (null = all in-scope) |
| `status` | `debug` |
| `legal_claim` | `false` |
| `source` / `rationale` | Validates pass tier transitions exactly at `target_speed_kmh`. With this profile, `enforcement_threshold_speed == target_speed_kmh`, so Tier 1 collapses to a single km/h band and Tier 2 begins immediately above target. Useful for emulator regression tests where the exact threshold transition needs to be unambiguous. |

`zero_tolerance_debug` is intentionally simple. It is the cleanest way to verify that **everywhere the threshold is consulted, it actually equals `target_speed_kmh + 0` and not some hidden offset**. If a regression silently smuggled a +5 km/h or +20 km/h offset into the model, this profile would catch it.

### 5.3 `generic_percent_future` — future / not active

| Field | Value |
|---|---|
| `profile_id` | `generic_percent_future` |
| `label` | Generic percent tolerance (future, not active) |
| `country_or_region` | (null) |
| `tolerance_mode` | `percent` |
| `percent` | e.g., 5 |
| `applies_to_event_types` | (null = all in-scope) |
| `status` | `future` |
| `legal_claim` | `false` |
| `source` / `rationale` | Reserved schema example for a future implementation. Useful for jurisdictions where regulatory tolerance is expressed proportionally to the target speed rather than as a fixed km/h offset (WIP spec §12.1). **Not active in POC V1.** If selected in POC V1, the resolution function (§4.2) must explicitly fail. |

This profile exists in the schema-level recommendation only. It is **not** intended to be selectable from the POC V1 emulator dropdown; emulator UIs may either omit `future`-status profiles from the live selector entirely or show them as visibly disabled.

### 5.4 `custom_debug_profile` — emulator-only manual override

| Field | Value |
|---|---|
| `profile_id` | `custom_debug_profile` |
| `label` | Custom (debug override) |
| `country_or_region` | (null) |
| `tolerance_mode` | `absolute_kmh` |
| `absolute_kmh` | user-entered (e.g., 5, 10, 15, 25) |
| `applies_to_event_types` | (null = all in-scope) |
| `status` | `debug` |
| `legal_claim` | `false` |
| `source` / `rationale` | Allows the emulator operator to type an arbitrary `absolute_kmh` value for scenario testing — e.g., comparing pass-tier transitions under +10, +15, +25 — without inventing a new named profile. Not persisted as product truth; lives in emulator session state only. |

`custom_debug_profile` is **debug surface only**. It must not be exposed as a "country" or "jurisdiction" preset, and it must not be persisted into product configuration files that could later be mistaken for a verified jurisdiction profile.

### 5.5 What is intentionally not on the list

- **No broad jurisdiction database in POC V1.** Belarus, EU member states, etc. are not added here. Once a Russia-focused POC has validated the model, adding new jurisdictions is a small data change; doing it now would pretend at coverage the POC has not earned.
- **No user-persistable custom profiles in POC V1.** `custom_debug_profile` lives in session state only. Persistent user profiles are a UX concern (§11, §13).
- **No Datakam-sourced jurisdiction guesses.** The profile is emulator/config state; it does not read jurisdiction from the prepared event store (§10).

## 6. Event-type applicability

The enforcement profile interacts differently with each POC V1 event type. The rules below resolve which feedback semantics apply.

### 6.1 `speed_limit` (Datakam `TYPE=101`)

- `target_speed_kmh` exists on the event.
- The enforcement profile **applies** to pre-pass `unsafe_likely` and to post-pass tiers (Tier 0 / Tier 1 / Tier 2).
- Tier 2 wording is "passed above the configured threshold" — **not** a legal verdict. The visual is the red inner fill / reversed digits described in WIP spec §12.4; the semantic is severity, not enforcement.
- No camera-risk variant is triggered for `speed_limit` (camera-risk is reserved for `static_camera`; WIP spec §13).

### 6.2 `static_camera` (Datakam `TYPE=1`)

- `target_speed_kmh` exists on the event.
- The enforcement profile **applies** to pre-pass `unsafe_likely` and to the camera-risk threshold (WIP spec §13.2).
- The camera-risk variant is triggered only when `pass_speed_kmh > enforcement_threshold_speed` (or the pre-pass unrecoverable equivalent). Below the threshold, only non-critical over-target feedback is shown (WIP spec §13.2).
- Wording for the camera-risk variant is **"possible camera risk"** only — no violation, no fine, no confirmed capture, no guaranteed enforcement (WIP spec §13.1).
- Tier 2 for `static_camera` means "possible camera risk", **not** "you were ticketed".

### 6.3 `road_bump` (Datakam `TYPE=102`)

- `target_speed_kmh` (Datakam `SPEED`) may exist as an **advisory / slowdown target**, not an enforcement target (WIP spec §7.3).
- Normal guidance for `road_bump` uses `target_speed_kmh` for the deceleration urgency, exactly as for other event types (WIP spec §11.4). The enforcement profile does **not** change normal guidance.
- **Use the enforcement profile cautiously for `road_bump`.** Recommended POC posture:
  - Allow pre-pass `unsafe_likely` to be computed against `enforcement_threshold_speed` for `road_bump` only if the rest of the visual treatment makes it clear that the warning is "you are likely to take this bump fast enough to be a problem", not "you are likely to be fined".
  - Pass-feedback tiers may be reused **visually** (Tier 0 / Tier 1 / Tier 2) for consistency with the other event types, but the **wording / semantic** for Tier 1 / Tier 2 must avoid implying legal enforcement. "Passed above advisory target", not "passed above legal threshold".
  - If keeping a single shared visual treatment risks user confusion ("does Tier 2 for a road bump mean a fine?"), POC V1 may instead choose to **not apply the enforcement profile to `road_bump`** and show only target-based feedback for that type. The decision belongs to the emulator validation pass (§12).
- The recommended emulator default is therefore: `russia_default_plus_20_kmh.applies_to_event_types = [speed_limit, static_camera]` — leaving `road_bump` out of enforcement-profile semantics by default — with `road_bump` evaluated against `target_speed_kmh` only. The emulator should still expose `road_bump`-with-profile as a debug toggle for validation.

### 6.4 Other event types

Other Datakam types (`TYPE=106 other_danger`, average-speed cameras, red-light cameras, mobile cameras, dangerous turn, bad road, pedestrian crossing, dangerous intersection) are **deferred** by POC V1 default (WIP spec §7.1, §7.2, §7.4). The enforcement profile schema reserves `applies_to_event_types` so a future implementation can extend coverage without changing the model.

### 6.5 Events without `target_speed_kmh`

If `event.target_speed_kmh` is null, the enforcement model has no defined output for that event. The emulator must:

- skip `unsafe_likely` for that event;
- skip pass-feedback tiers;
- skip camera-risk semantics;
- record the skip in debug so a missing target is visible during tuning.

A missing target speed is not a profile bug; it is an event-data condition.

## 7. Pass-feedback semantics

This section documents the **tier logic** the enforcement profile feeds into. It does **not** define pass-feedback hold timing, hysteresis values, or alpha — those belong to threshold tuning (§9; Issue #20 §5; WIP spec §11.5, §12.5).

### 7.1 Tier definitions (carried from WIP spec §12.4)

For an event with a non-null `target_speed_kmh`, after the pass point:

- **Tier 0** — `pass_speed_kmh <= target_speed_kmh`. No pass feedback. Speed circle returns to neutral. Clear primary, transition per WIP spec §10.5 / §12.6.
- **Tier 1** — `target_speed_kmh < pass_speed_kmh <= enforcement_threshold_speed`. Stable red outer ring / outline; inner area stays normal; no fill, no reverse digits, no blink (WIP spec §12.4).
- **Tier 2** — `pass_speed_kmh > enforcement_threshold_speed`. Red inner fill; reversed (white) digits; stable hold for `pass_feedback_hold_s` (WIP spec §12.4).

For `static_camera`, Tier 2 additionally triggers the camera-risk visual variant (camera icon instead of digits, optional short pulse — WIP spec §13.2, §13.3).

### 7.2 Tier names are severity / feedback categories

The tier names — **Tier 0 / Tier 1 / Tier 2** — are severity categories inside the emulator's feedback model. They are **not** legal verdicts. Specifically:

- For **`static_camera`**, **Tier 2 means "possible camera risk"** — not "violation", not "fine", not "confirmed capture", not "guaranteed enforcement". The visual makes the over-threshold pass visible; it does not assert what happens next in the real world (WIP spec §13.1).
- For **non-camera `speed_limit`**, **Tier 2 means "passed above the configured threshold"** — not "legally convicted", not "fined", not "speeding ticket". The visual is the same red inner fill described in WIP spec §12.4; the semantic is "you are noticeably above the configured threshold", nothing more.
- For **`road_bump`**, the visual may reuse Tier 1 / Tier 2 (§6.3) but the **wording must not imply legal enforcement**. If a debug overlay or explainer text describes the tier, it should say "passed above advisory target" or similar — not "above enforcement threshold". When `road_bump` is left out of the profile's `applies_to_event_types` (the recommended default, §6.3), no Tier 1 / Tier 2 is computed for it at all.

The cumulative product principle: **RoadAhead never claims a legal outcome**. Tier names communicate "how the pass compared to the target / threshold", not "what the legal system will do about it".

### 7.3 Out of scope for this section

The following items belong to Section 5 of Issue #20 (threshold tuning) and are **not** addressed here:

- `pass_feedback_hold_s` value;
- `display_hysteresis_kmh` value;
- `clear_hysteresis_kmh` value;
- `alpha_smoothing_ms` value;
- deceleration profile values;
- reaction-time defaults;
- per-type lookahead guardrails.

This section only owns the comparison formula and the semantic naming of the resulting tiers.

## 8. Emulator config recommendation

The emulator's session config is the place where the active enforcement profile lives. The emulator must surface the active profile and the derived values in a debug view, separate from the pure rendering layer.

### 8.1 Recommended emulator-visible configuration

The following should be inspectable in the emulator's config / debug surface:

- **`selected_enforcement_profile_id`** — the active profile's `profile_id`.
- **`resolved_enforcement_tolerance_kmh`** — the resolved tolerance for the currently active event. Computed by `resolve_profile(active_profile, current_primary_event)` (§4.2). Shown as `null` / `undefined` when no primary event is active or when the event's `normalized_type` is out of the profile's `applies_to_event_types`.
- **`enforcement_threshold_speed`** — `target_speed_kmh + resolved_enforcement_tolerance_kmh` for the current primary event. Shown alongside `target_speed_kmh` so the reviewer can verify both.
- **`target_speed_kmh`** — the current primary event's target, shown **separately** from `enforcement_threshold_speed`. The two must be displayed side-by-side; collapsing them into a single field would defeat the separation rule (§1).
- **`display_hysteresis_kmh`** — shown as a **separate** debug field, clearly labelled as UI smoothing only (WIP spec §11.5). Must not be visually adjacent to `resolved_enforcement_tolerance_kmh` in a way that suggests they are the same quantity (§9).
- **`event.normalized_type`** — the current primary event's type, so the reviewer can confirm event-type applicability (§6).
- **`pass_feedback_tier`** — Tier 0 / Tier 1 / Tier 2 for the most recent pass, or `null` before a pass occurs.
- **`camera_risk_variant_active`** — boolean; `true` only when the current visual state is the camera-risk variant (WIP spec §13.2).
- **`legal_claim`** — fixed `false`, with a short label like "for emulator feedback only". Always shown next to the profile to keep the non-claim boundary visible.

### 8.2 Config mode

POC V1 may implement either of the following, in order of recommended priority:

1. **Static config at emulator start** (recommended for the first slice). The profile is selected once, e.g., via a dropdown or a config file, and applies for the whole session. Switching profiles requires a session reload. This is enough to validate the model and is much cheaper to build correctly than live switching.
2. **Live profile switching** (nice-to-have). The profile can be changed mid-session via the emulator UI. If implemented:
   - all enforcement-derived values must be recomputed immediately for the active event (and any subsequent events);
   - the change must be surfaced in debug (e.g., a timestamped `profile_switched_at` entry, the previous `profile_id`, the new `profile_id`) so emulator runs that include a switch are interpretable;
   - the change must not retroactively re-classify already-recorded pass-feedback tiers — those are historical outputs of the prior config.

### 8.3 Where the profile must not be hidden

- **Not in code constants.** A hard-coded `ENFORCEMENT_TOLERANCE_KMH = 20` in source code is exactly the pattern this recommendation is replacing.
- **Not in a single global default that is invisible to the operator.** Even if the only profile is `russia_default_plus_20_kmh`, its `profile_id`, `label`, `tolerance_mode`, and resolved value must be visible in the emulator's debug surface.
- **Not stored on the base prepared event record.** Enforcement state belongs to the emulator session, not to the event data (§10; prepared event store recommendation §7).

### 8.4 Minimal interaction model

For the first emulator slice, the operator should be able to:

- see the active `profile_id` and `label`;
- see the resolved `enforcement_threshold_speed` for the current primary event;
- toggle between the small set of POC profiles (§5) — at minimum `russia_default_plus_20_kmh` and `zero_tolerance_debug`;
- (optional) set `custom_debug_profile.absolute_kmh` to an arbitrary value.

Anything beyond this is future / nice-to-have for POC V1.

## 9. Separation from threshold tuning

This document deliberately **does not** define values for the following. They are owned by Section 5 of Issue #20 (threshold tuning) and by WIP spec §11.5, §12.5, §20.5:

- `pass_feedback_hold_s` (default and acceptable range);
- `display_hysteresis_kmh` (numeric value);
- `clear_hysteresis_kmh` (numeric value);
- `alpha_smoothing_ms` (UI smoothing duration);
- deceleration profile values (smooth / normal / strong / emergency);
- reaction-time defaults (ordinary / high-speed) and optional UI margin;
- per-type lookahead guardrails (maximum lookahead caps, minimum display distances, type-specific tuning).

These are mentioned here only to **separate** them from the enforcement profile. They are different fields, sourced from different concerns, tuned through a different process. Mixing them into the enforcement profile schema would re-introduce the conflation that §1 sets out to prevent.

In particular: `display_hysteresis_kmh` is **not** an enforcement tolerance. It must not be substituted for the enforcement tolerance, even when it happens to be numerically small.

## 10. Data/store implications

This section connects to the prepared event store recommendation. The enforcement profile **does not** belong on the base event record.

### 10.1 Base event record (prepared event store)

The prepared event store (prepared event store recommendation §5) carries route-independent event truth:

- `target_speed_kmh` lives on the event;
- `normalized_type` lives on the event;
- direction fields, identity, location, validation metadata, etc. live on the event.

### 10.2 Enforcement profile is session / config state

`enforcement_tolerance_profile`, `resolved_enforcement_tolerance_kmh`, and `enforcement_threshold_speed` are **emulator session / config state**, not event data:

- the active profile is selected per session;
- `resolved_enforcement_tolerance_kmh` is computed at the time the event is evaluated, against the active profile;
- `enforcement_threshold_speed` is `target_speed_kmh + resolved_enforcement_tolerance_kmh` and is therefore session-derived;
- pass-feedback tier outcomes are runtime / debug output, not stored on the event record.

### 10.3 Why this separation matters

- The **same event** can yield different tiers under different profiles. Storing `enforcement_threshold_speed` on the event would silently bake one profile into the event data and make a different profile's tier classifications misleading. The prepared event store recommendation §7 makes the same architectural point for route-projection fields.
- **Future user-custom profiles** (§13) must be able to act as configuration overrides without mutating source events. Mutating the event record on profile change would defeat reproducibility of imports and would conflict with `superseded_by_event_id` / supersede semantics (prepared event store recommendation §5.6).
- **Reproducible emulator runs** depend on the profile being inspectable in session/config; if the threshold lived on the event record, "rerun the same scenario with a different profile" would require rewriting the data.

### 10.4 What the runtime may emit

The emulator may emit runtime / debug output that includes:

- `selected_enforcement_profile_id`;
- `resolved_enforcement_tolerance_kmh`;
- per-event `enforcement_threshold_speed`;
- per-event `pass_feedback_tier` and `camera_risk_variant_active`;
- per-event `unsafe_likely_triggered_at_*` markers (timestamp, distance, current speed) for debug.

These outputs are **per-session runtime artifacts**, not durable event truth. They are appropriate for emulator logs / debug exports, not for the prepared event store.

## 11. Risks and unknowns

This document inherits known unknowns from the WIP spec and the previous recommendation slices. They are restated here so the reader is not misled by the apparent precision of the proposed schema.

- **Russia +20 km/h is a POC working default, not a legal guarantee.** The value is taken from the WIP spec's working assumption (WIP spec §20.4). It is plausible at the time of writing but not legally verified by this document; current Russian regulatory tolerance may differ or change. Re-verification against current official/legal/public sources is required before any product/legal use.
- **Legal / regulatory rules may change.** Even when re-verified, jurisdiction values are not stable forever. The schema's `source` / `rationale` and `notes` fields should record the verification date so staleness is detectable.
- **Jurisdiction rules may be more complex than absolute or percent tolerance.** Real-world enforcement can vary by camera type, road class, urban vs interurban, time of day, current regulatory campaign, or other factors. The schema's `hybrid` / `min_kmh` / `max_kmh` slots exist so this can be modelled later without rewriting POC V1 code, but POC V1 does not attempt it.
- **Camera enforcement may vary by camera type, road, region, or current regulation.** POC V1's `static_camera` semantics are deliberately narrow (WIP spec §7.2). Average-speed and red-light cameras are deferred precisely because their enforcement model is not point-comparable to `static_camera`.
- **Teaching users to drive at `target + tolerance` is explicitly not desired** (WIP spec §11.4). The risk is real: if `display_hysteresis_kmh`, `target_speed_kmh`, and `enforcement_tolerance` are not visually separated in the emulator debug surface, an emulator operator (or a future product designer) could conclude that "normal driving speed = target + tolerance". The schema and debug rules in §8 exist specifically to prevent that conclusion.
- **UI must avoid implying fines, violations, or confirmed captures.** Even with the camera-risk wording locked to "possible camera risk" (WIP spec §13.1), an over-aggressive visual could still imply enforcement certainty. The wording-vs-visual interplay is owned by WIP spec §12.4, §13.2, §13.3 and is not finalized.
- **Over-configuring profiles can distract from POC validation.** Adding many jurisdiction profiles before the model is validated would multiply the number of things the emulator has to be right about. The recommended initial set (§5) is intentionally minimal.
- **Road-bump / advisory events are not enforcement events.** Reusing the tier visual for `road_bump` is acceptable only with non-enforcement wording (§6.3). If wording cannot be made unambiguously non-enforcement, leaving `road_bump` out of the profile's `applies_to_event_types` is the safer default.
- **Profile switching can confuse test interpretation if not logged / debug-visible.** Live switching (§8.2) is fine if and only if it is timestamped and inspectable in debug. Otherwise a run that crosses a profile boundary becomes ambiguous to reviewers ("which tier classification belongs to which profile?").
- **Datakam `target_speed_kmh` is candidate data, not verified truth.** The enforcement model depends on `target_speed_kmh` being correct on the event; if the source data is wrong, the threshold derived from it is wrong by the same amount. The prepared event store recommendation §9.1 already states this; the enforcement profile inherits it.
- **No legal source verification is performed in this document.** The single-line factual claim that this document makes about regulatory tolerance is: "the WIP spec carries Russia +20 km/h as a POC working default". Everything else — including whether +20 km/h reflects current Russian regulatory practice — is explicitly outside the scope of this recommendation.

## 12. Validation plan

The emulator validation checks below verify the enforcement model itself, not pass-feedback timing, hysteresis, or alpha (those are owned by threshold tuning). The plan fits inside the same emulator surface used by the prior recommendation slices.

Required checks, in roughly executable order:

- **Same scenario under two profiles.** Run an identical route and identical speed trace under `russia_default_plus_20_kmh` (`absolute_kmh = 20`) and `zero_tolerance_debug` (`absolute_kmh = 0`). Verify that tier classifications change at exactly the predicted speeds and nowhere else.
- **Normal guidance independence.** Verify the urgency bands (`awareness`, `smooth_required`, `normal_required`, `strong_required`, `emergency_required`) compute against `target_speed_kmh`, **not** `enforcement_threshold_speed`. Change `absolute_kmh` between profiles and confirm the urgency bands do not move (WIP spec §11.4).
- **`unsafe_likely` uses the threshold.** Verify the blinking `unsafe_likely` state activates when the vehicle can no longer realistically reach `enforcement_threshold_speed` at the event, not `target_speed_kmh` (WIP spec §9, §12.2). The trigger point should shift when the profile changes.
- **Tier boundaries.** Verify Tier 0 → Tier 1 transition occurs exactly at `pass_speed_kmh > target_speed_kmh` (with no enforcement-tolerance dependency), and Tier 1 → Tier 2 transition occurs exactly at `pass_speed_kmh > enforcement_threshold_speed`. The transition between Tier 1 and Tier 2 must move when the profile is swapped.
- **Camera-risk gating.** Verify the camera-risk visual variant activates only when `pass_speed_kmh > enforcement_threshold_speed` for `static_camera` events. Below the threshold, the variant must not appear (WIP spec §13.2).
- **Hysteresis isolation.** Change `display_hysteresis_kmh` and confirm `enforcement_threshold_speed` does not change. Change the profile's `absolute_kmh` and confirm `display_hysteresis_kmh` does not change. The two values must move independently.
- **Profile change recomputes.** If live switching is implemented, switch the profile mid-scenario and verify that the active event's `resolved_enforcement_tolerance_kmh`, `enforcement_threshold_speed`, `unsafe_likely` trigger, and tier classification all update immediately, with the change recorded in debug.
- **`road_bump` non-enforcement.** With `road_bump` left out of the profile's `applies_to_event_types` (recommended default, §6.3), verify no Tier 1 / Tier 2 classification is computed for `road_bump` events and no camera-risk variant is ever triggered.
- **Debug surface fields.** Confirm the emulator's debug view shows `selected_enforcement_profile_id`, `resolved_enforcement_tolerance_kmh`, `enforcement_threshold_speed`, `target_speed_kmh`, `display_hysteresis_kmh`, `pass_feedback_tier`, `camera_risk_variant_active`, and `legal_claim: false`, with `target_speed_kmh` and `enforcement_threshold_speed` shown side-by-side (§8.1).
- **Non-`absolute_kmh` failure mode.** Attempting to select a `percent` or `hybrid` profile in POC V1 must fail explicitly (§4.2). Silent fallback to a default is a failure.
- **No legal claim emitted.** No pass-feedback or camera-risk output anywhere should use words like "violation", "fine", "convicted", "ticketed", "confirmed capture", or "guaranteed enforcement" (WIP spec §13.1; §7.2).

This document does **not** claim these criteria are met today. It defines what the emulator must demonstrate before any enforcement-profile item is promoted past WIP.

## 13. Canon-readiness split

This document is Research. Nothing here is promoted to Canon by this PR. The classification below is informational; it helps a later Canon / decision review separate stable principles from tuning / implementation details.

### 13.1 Possible future Canon candidates

These principles look **stable enough** to be considered for later Canon promotion or an ADR after the emulator validation demonstrates them:

- **Enforcement tolerance is explicit, configurable session/config state**, not a hard-coded constant.
- **`target_speed` and `enforcement_tolerance` are separate concepts.** Normal guidance uses `target_speed`, not `target_speed + tolerance`.
- **Enforcement tolerance affects only `unsafe_likely`, post-pass severity tiers, and the camera-risk variant.** It has no other surface in the product.
- **`display_hysteresis_kmh` is a separate concept** from `enforcement_tolerance` and is not used to derive enforcement-related thresholds.
- **No legal correctness is claimed.** Profiles are emulator/feedback configurations.
- **Camera-risk wording is "possible camera risk" only.** No "violation", "fine", "confirmed capture", or "guaranteed enforcement" claims.
- **Enforcement profile is session/config state, not base event data.** It is not stored on the prepared event record (prepared event store recommendation §7).
- **The active profile must be inspectable** in the emulator's debug surface, not hidden in code constants.

### 13.2 Must remain WIP

These items must **stay WIP / emulator tuning** and should **not** be promoted to Canon based on this document alone:

- **Exact default profile values beyond the Russia POC default.** The number `+20 km/h` for `russia_default_plus_20_kmh` is the WIP working default and is not legally verified by this document.
- **Any broader jurisdiction database.** POC V1's profile set is intentionally minimal.
- **Legal source verification.** Whether +20 km/h reflects current Russian regulatory tolerance is outside this document's scope; the WIP value is not legal truth.
- **Live profile switching UI.** The first emulator may ship without it.
- **Custom profile UX.** `custom_debug_profile` is debug surface only; product-grade user profiles are future work.
- **Road-bump pass-feedback semantics.** The recommended default leaves `road_bump` out of `applies_to_event_types`, but the wording / visual question for `road_bump` Tier 1 / Tier 2 is open.
- **Any persistence of user profiles.** POC V1 does not persist user-customized profiles as product truth.
- **Exact threshold tuning values handled by Section 5 of Issue #20.** Hold timing, hysteresis numbers, alpha smoothing, deceleration profiles, reaction time, and per-type lookahead caps are explicitly out of scope for this document.

## 14. Cross-links

WIP spec and decision context:

- [`../product/wip/roadahead-poc-v1-three-circle-assistant.md`](../product/wip/roadahead-poc-v1-three-circle-assistant.md) — main POC V1 WIP spec; this document expands §10, §11.4, §12, §13, and §20.4.
- [`../product/wip/roadahead-poc-v1-initial-product-decisions-workbook.md`](../product/wip/roadahead-poc-v1-initial-product-decisions-workbook.md) — companion rationale / input history (workbook decisions Q13, Q14).

Companion recommendation slices (Issue #20):

- [`roadahead-direction-applicability-recommendation.md`](roadahead-direction-applicability-recommendation.md) — direction applicability recommendation; supplies the eligibility decision that precedes the enforcement model.
- [`roadahead-route-geometry-provider-recommendation.md`](roadahead-route-geometry-provider-recommendation.md) — route geometry provider recommendation; the route polyline against which event-route position (and therefore `pass_speed_kmh` sampling) is computed.
- [`roadahead-prepared-event-store-recommendation.md`](roadahead-prepared-event-store-recommendation.md) — prepared event store recommendation; defines the `target_speed_kmh` source the enforcement model consumes (§5.3) and the route-vs-session separation that keeps the enforcement profile out of the base event record (§7, §10 above).

Source-level research (background only; not legal sources):

- [`datakam-speedcam-format-and-route-qa.md`](datakam-speedcam-format-and-route-qa.md) — Datakam / OpenSpeedcam format and field semantics, the origin of `target_speed_kmh` for POC V1 candidate events.
- [`datakam-manual-qa-status-semantics.md`](datakam-manual-qa-status-semantics.md) — manual QA status semantics; `target_speed_kmh` from Datakam remains candidate data, not verified truth, regardless of profile choice.
