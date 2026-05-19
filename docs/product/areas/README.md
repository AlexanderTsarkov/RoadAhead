---
status: Process / Documentation governance
canon: false
purpose: Area-based structure, initial taxonomy, and Canon doc template for RoadAhead Product Canon
context: docs/product/areas/ — stable product truth organized by area
---

# RoadAhead Product Canon — areas

> **Status — Process / Documentation governance.**
> This file defines how `docs/product/areas/` is organized and what a Canon area document looks like. It is **not** Canon by itself, and it does **not** promote any product content to Canon. No area Canon docs are created by this PR.

## Purpose

`docs/product/areas/` is the home for stable RoadAhead product **Canon**, organized by **area**.

This file exists so that:

- area Canon docs are created deliberately by area, not as a random heap of files;
- contributors and AI assistants have a single place to look up the current area taxonomy and the rules for extending it;
- Canon area docs share a consistent template so each area is readable, citable, and implementation-facing.

The document map and the WIP / Research / Canon / ADR rules live one level up in [`../README.md`](../README.md). This file focuses specifically on the **area** layer of Canon.

## What "area" means

An **area** is a top-level building block of the product: a stable, recurring concern that already shows up across multiple WIP docs, research docs, issues, or PRs and that benefits from one durable Canon doc.

An area is **not**:

- a temporary feature branch;
- a one-off "stable decisions for issue #N" dump;
- a synonym for "all Canon" — Canon is split by area, not unified into a single doc;
- a re-statement of the WIP spec — Canon is shorter, more stable, and implementation-facing;
- an implementation slice (implementation slicing happens in issues / PRs, not in Canon).

Areas should be **created incrementally**, as stable product truth emerges from WIP and Research. Most areas will be created **at the same time** as their first Canon doc — not before.

## Folder rules

- Each area lives at `docs/product/areas/<area-id>/`.
- `<area-id>` is a short, stable, lowercase, hyphen-separated identifier (e.g., `product-boundary`, `event-applicability`).
- A typical area folder will contain a small number of Canon `.md` files. Most areas can start with a single `<area-id>.md` Canon doc; multi-file areas should only emerge when content actually demands a split.
- **Do not create empty area directories.** An area folder appears in the repo only when a Canon doc is being added in the same PR, or a near-term PR will add one.
- **Do not create a new area merely because one issue needs a place to put text.** Prefer extending an existing area when the concept belongs there. If no area fits, the content stays in WIP / Research until either an existing area can host it or a new area is justified.
- The numbered taxonomy below is a **planning index**, not a folder listing. Folders appear only when their first Canon doc is added.

## Initial area taxonomy (expected to evolve)

This taxonomy is **initial and expected to evolve**. It is **not** a final list, **not** exhaustive, and **not** a promise that every area will receive a Canon doc on the same schedule. Some areas may never get one. Some areas may be merged or split. Names may change.

Each entry below names an area, gives a short purpose, and lists the WIP-spec sections it currently corresponds to. The WIP-spec section numbers are pointers to source material, not Canon claims.

1. **`product-boundary`**
   - What RoadAhead is and is not (anticipatory road-understanding assistant; not a navigator; not an anti-radar).
   - Legal / safety non-claims (no legal speed-limit correctness claim; no anti-radar / enforcement claim).
   - Product identity and positioning.
   - WIP-spec source pointers: §1, §16, §18, `README.md` "Product positioning".
2. **`validation-emulator`**
   - POC V1 staged validation path (Phase 0 web emulator → deferred Android phases).
   - Interactive web route emulator scope and intent.
   - Route-known validation mode first; route-unknown later.
   - Android deferral.
   - WIP-spec source pointers: §2, §3, §18, §19, §22.
3. **`route-geometry`**
   - Route provider boundary (geometry only).
   - Geometry-only provider role; provider speed / ETA / traffic speed are not RoadAhead truth.
   - Normalized RouteGeometry contract (route polyline, route projection, along-route distances, local route approach tangent).
   - WIP-spec source pointers: §3, §4, §20.2; research recommendation: `roadahead-route-geometry-provider-recommendation.md`.
4. **`event-data`**
   - External-source data policy (Datakam / OpenSpeedcam treated as candidate input only).
   - Raw data is import-only; not committed; not runtime data.
   - Prepared, normalized candidate events (the runtime-side shape).
   - Future `VerifiedRoadEvent` boundary (out of POC V1 scope).
   - WIP-spec source pointers: §14, §16, §20.3; research recommendation: `roadahead-prepared-event-store-recommendation.md`.
5. **`event-applicability`**
   - Route / path applicability (not pure nearest-point lookup).
   - Direction applicability against the local route approach tangent.
   - Branch / intersection ambiguity handling.
   - Conservative suppression (better to suppress than to confidently show the wrong sign).
   - WIP-spec source pointers: §8, §20.1; research recommendation: `roadahead-direction-applicability-recommendation.md`.
6. **`speed-reference`**
   - Active POC V1 modes: `unknown`, `approach_target`.
   - Target speed semantics (sourced from the event itself).
   - Provisional limit (`provisional_limit`) deferral and the conditions a future provisional-limit mode would require.
   - Current speed semantics (manually controlled simulated speed in POC V1).
   - WIP-spec source pointers: §10, §17.
7. **`feedback-and-enforcement`**
   - Pass feedback (Tier 0 / Tier 1 / Tier 2; `pass_feedback_hold`).
   - Camera-risk feedback (semantic variant of pass feedback; "possible camera risk" only).
   - Enforcement profile model (`enforcement_tolerance` as a configurable severity buffer; not a legal claim).
   - Strict separation of `target_speed` (normal guidance) vs `enforcement_tolerance` (severity-only) vs `display_hysteresis_kmh` (UI smoothing only).
   - WIP-spec source pointers: §11, §12, §13, §20.4; research recommendation: `roadahead-enforcement-profile-recommendation.md`.
8. **`ui-model`**
   - Three-circle UI (left / middle / right circles).
   - Primary and secondary event roles.
   - Visual states (idle, awareness, approach, pass-feedback hold).
   - Sign-like primitives (red border, white center, target-speed numeric, simple symbols).
   - Layout (POC V1 horizontal only; vertical deferred).
   - WIP-spec source pointers: §5, §6, §15, §21.
9. **`tuning-and-validation`**
   - Threshold tuning (timings, hysteresis, deceleration profiles, reaction times, lookahead guardrails).
   - Scenario sweep methodology.
   - Validation evidence required before promoting a tuning value to Canon.
   - What remains WIP until measured.
   - WIP-spec source pointers: §9, §11.5, §12.5, §13.4, §20.5; research recommendation: `roadahead-threshold-tuning-recommendation.md`.

This taxonomy is intentionally a **starting structure**, not a freeze. Future PRs may rename, merge, split, or add areas — see the rules below.

### Cross-cutting note on `tuning-and-validation`

The `tuning-and-validation` area is unusual: it is partly a **method** (how a value becomes promotable) and partly a **collection of values** (specific thresholds, durations, profiles). Future Canon work may keep these together, or split the methodology (which is more durable) from individual tuned values (which are evidence-driven and can land separately). Either resolution is acceptable; the choice should be made when the first Canon doc is proposed in this area.

## When to split, merge, or cross-link areas

Areas exist to keep Canon readable and durable. They should be reorganized when keeping the current structure causes harm, not for cosmetic reasons.

- **Split** when one area accumulates clearly unrelated concepts and a single Canon doc can no longer be kept short, stable, and implementation-facing. Splits should produce two well-named areas, not one well-named area and one residual bucket.
- **Merge** when two areas cannot be maintained independently — when changes to one always require changes to the other, the boundary is fictitious. Merge with a clear redirect from the older area paths.
- **Cross-link** when a concept genuinely belongs to two areas but has one **primary owner**. Put the durable Canon truth in the primary area; cross-link from the secondary area instead of duplicating the content. Duplication leads to silent drift.
- **Rename** only when the new name is materially clearer. Renames are a small breakage and should still be done in their own PR with a brief rationale.

In all four cases, the change is a deliberate, reviewed PR — not an opportunistic edit inside another PR.

## Issue #21 — Canon promotion tracker (per area)

Issue [#21](https://github.com/AlexanderTsarkov/RoadAhead/issues/21) is the umbrella issue for promoting stable POC V1 WIP decisions to Canon and / or ADRs. So that Canon does not land as a single dumping-ground PR, the tracker on Issue #21 should be organized **by area**, using the taxonomy above.

Suggested status categories per area on Issue #21:

- **pending** — not yet evaluated for promotion;
- **in review** — a candidate Canon / ADR PR is open or under discussion;
- **promoted** — Canon doc and / or ADR exists in the repo;
- **kept WIP** — the area was reviewed and intentionally remains WIP (with reason);
- **blocked pending validation** — promotion is blocked on emulator evidence, scenario sweep results, or other measured validation.

This PR does **not** edit Issue #21 itself. The tracker update is a separate, explicit task.

## Recommended Canon area document template

A new Canon area doc should follow the template below. Sections may be omitted only if they are genuinely not applicable; do not omit a section just because it is empty for the moment — write "None at this time" so reviewers can see the area was considered.

```markdown
---
status: Product Canon
canon: true
area: <area-id>
source:
  - <relative link to source WIP doc(s)>
  - <relative link to source Research doc(s)>
  - <Issue / PR link(s) that justified promotion>
related_decisions: []
last_reviewed: YYYY-MM-DD
---

# <Area Name>

## Purpose

What this area covers and why it exists as a separate area. One short paragraph.

## Canon truths

A short, numbered or bulleted list of stable, implementation-facing truths for this
area. Each item should be short enough to remember and stable enough to cite. Do not
restate the WIP spec; restate only the truths that are durable now.

## Scope

What is in scope for this area. Useful when a related concept lives in a neighbouring
area and might otherwise be assumed to belong here.

## Non-goals

What is explicitly out of scope for this area. This prevents Canon from drifting into
adjacent areas.

## Product rules

Rules that follow from the Canon truths and constrain implementation, UX, or data
behavior. These are normative, not aspirational.

## Implementation-facing implications

How the Canon truths and rules surface in code, data shape, configuration, debug,
or UX. Brief, concrete, and stable.

## Still WIP / not Canon

Items inside this area that are still WIP, still tuning, still pending validation, or
still under research. **This section is mandatory** so that unresolved questions cannot
be mistaken for stable truth. If there are none, write "None at this time" — do not
omit the section.

## Source traceability

Links to the WIP, Research, Issue, and PR sources that justify each Canon truth above.
A truth without a source link is suspicious.

## Related areas

Cross-links to other areas that touch this area's concepts. **Cross-link, do not
duplicate.** If a concept lives primarily in another area, link it; do not restate it.
```

Rules for using the template:

- **`Canon truths`** must be short, stable, and implementation-facing. Long narrative belongs in the WIP spec or in an ADR.
- **`Still WIP / not Canon`** must be present and must explicitly prevent unresolved tuning, research, or open questions from being mistaken for stable truth.
- **`Source traceability`** must link to WIP, Research, Issues, and PRs. Do not write "see WIP spec" without a link.
- **`Related areas`** must cross-link, not duplicate content. Duplication causes silent drift between areas.
- The frontmatter `area` field must match the folder name `<area-id>`.
- The frontmatter `last_reviewed` field is a date; refresh it whenever Canon for the area is materially re-reviewed (not on every typo fix).
- The frontmatter `related_decisions` field lists ADRs (when `docs/decisions/` exists) that explain *why* a Canon truth was chosen.

## Future work / open questions

These are explicitly **out of scope for this PR** and are listed as future work, not commitments:

- Decide whether `tuning-and-validation` should split into a **methodology** Canon doc plus per-value tuning records, or stay as one area.
- Decide whether `feedback-and-enforcement` should split `feedback` (visual / behavioral pass feedback) from `enforcement-profile` (severity-only buffer model). They are linked today; whether they remain one area depends on how Canon language settles.
- Decide whether `event-data` and `event-applicability` should be served by a parent **`events`** umbrella area or remain two siblings. Either is reasonable.
- Define the format and location of decision records (`docs/decisions/`) and the ADR template. Out of scope for this PR; will be addressed when the first ADR is proposed.
- Define the Issue #21 promotion tracker layout on the issue itself. Out of scope here; the issue is not edited by this PR.

## What this file is not

- It is **not** Canon. It defines how Canon areas are organized; it does not state any product truth.
- It is **not** an implementation plan.
- It is **not** a final taxonomy. The taxonomy will evolve as Canon truths emerge.

## Related files

- [`../README.md`](../README.md) — product documentation map and status-layer rules.
- [`../wip/`](../wip/) — current WIP product specs.
- [`../../research/`](../../research/) — durable research and technical recommendations.
- [`../../../_working/ITERATION.md`](../../../_working/ITERATION.md) — current iteration context.
- [`../../../CLAUDE.md`](../../../CLAUDE.md) — stable AI / Cursor operating rules.
