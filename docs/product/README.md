---
status: Process / Documentation governance
canon: false
purpose: Product documentation map and rules for AI-assisted work
context: RoadAhead product documentation status layers and Cursor / AI work rules
---

# RoadAhead product documentation — map and governance

> **Status — Process / Documentation governance.**
> This file defines the documentation structure and rules under `docs/product/` and how WIP, Research, Canon, and decision records relate. It is **not** Canon by itself, and it does **not** promote any product content to Canon. Canon promotion is a separate, deliberate review.

## Purpose

This file is the entry point for RoadAhead product documentation. It exists so that:

- contributors and AI assistants can identify the **status layer** of any product doc before reading, writing, or extending it;
- Canon is built deliberately by area, not as a random collection of dumping-ground files;
- the rules for promoting WIP / Research to Canon are explicit, not implicit;
- Cursor / AI-assisted work has a stable place to look up "where does this belong?" without inventing a new structure each time.

The product itself is described in the WIP spec, research, and (eventually) Canon documents listed below — not in this file.

## Status layers

RoadAhead product documentation is organized by **status**, not by feature. Each layer has a different meaning, a different durability, and a different change process.

| Layer | Location | Meaning |
|---|---|---|
| WIP product specs | `docs/product/wip/` | Working product specs, hypotheses, open questions, accepted working assumptions, tuning candidates. **Not Canon.** May change. |
| Product Canon — areas | `docs/product/areas/` | Stable product truth, organized by **area** (a top-level building block of the product). Promoted only by explicit review. |
| Research inputs | `docs/research/` | Durable analysis, source reviews, and technical recommendations. Recommendations are **inputs**, not product truth by themselves. |
| Decision records / ADRs | `docs/decisions/` | Why a stable decision was made, what alternatives were considered, what tradeoffs were accepted. Created when (and only when) a decision is stable enough to record. |
| Iteration context | `_working/ITERATION.md` | Active phase context, scope and non-scope for the current iteration. **Not** durable product truth. |

`docs/decisions/` does not exist yet. It will be created when the first decision record is added under a separate, explicit PR.

### What each layer means

- **WIP — `docs/product/wip/`.** Working product specifications. May contain accepted working assumptions, unresolved questions, deferred ideas, and tuning candidates. WIP wins over older / outdated files inside the same WIP folder when there is a conflict, but **WIP is not implementation truth and is not Canon.** WIP may be revised at any time as understanding improves.
- **Research — `docs/research/`.** Source analysis (e.g., format reviews, manual QA of external datasets) and technical recommendations (e.g., direction applicability, route geometry provider, prepared event store, enforcement profile, threshold tuning). Research is durable and citable, but a research recommendation is **not** automatically product truth. It is an input for future Canon / decision review.
- **Product Canon — `docs/product/areas/`.** Stable product truth, organized by area. A Canon doc states what is **true now** for that area, with implementation-facing implications. Canon docs cite their source WIP / Research / issues / PRs.
- **Decisions / ADRs — `docs/decisions/`.** Decision records explain **why** a stable decision was made, what alternatives were rejected, and what tradeoffs were accepted. A decision record complements Canon: Canon says what is true; the ADR says why.
- **Iteration context — `_working/ITERATION.md`.** Phase context only. Treated as scratch / active-iteration state, not durable product truth (see `CLAUDE.md` "_working/ Policy").

### How the layers relate

```
docs/product/wip/                docs/research/
        \                              /
         \                            /
          \                          /
           v                        v
        explicit review (issue + PR)
                  |
                  v
        docs/product/areas/    docs/decisions/
        (Canon — what is true)  (ADR — why)
```

The arrows are deliberate. WIP and Research never become Canon by accident.

## Promotion rule

WIP and Research become Canon **only** through an explicit, reviewed PR. There is no automatic promotion path.

Concretely:

- Canon promotion must cite the **source WIP doc(s), Research doc(s), Issue(s), and PR(s)** that justify the promotion.
- **Tuning values** (thresholds, hysteresis, timings, deceleration profiles, reaction times, lookahead caps) and **safety-sensitive UX rules** (driver-facing alerting, urgency, pass feedback) require **validation evidence** — for example a documented scenario sweep, manual QA, or other recorded result — before Canon promotion. A number stays WIP until measured.
- Conflicts between WIP, Research, and (future) Canon must **not** be silently resolved. Call them out in the WIP / Canon review and resolve them deliberately.
- WIP and Research must **not** silently overwrite Canon. Once Canon exists for an area, changing it requires a deliberate PR that updates Canon (and an ADR if the change is substantive).
- Demoting Canon back to WIP is a deliberate action too. It requires an explicit PR with a stated reason and a follow-up plan.

## Relationship between Canon and ADR

- **Canon (`docs/product/areas/`)** answers: *what is true now for this area?* It is implementation-facing and intentionally short.
- **ADR (`docs/decisions/`)** answers: *why was this decision made? what was rejected? what tradeoffs were accepted?* It is decision-facing and intentionally narrative.

A stable decision may need both: a short Canon truth in the relevant area, and a separate ADR that records the reasoning. Not every Canon truth needs an ADR (some truths are obvious / non-controversial), and not every ADR produces Canon (some ADRs record process, scope, or deferral decisions).

## Cursor / AI work rules

Before creating or substantially extending any product doc, AI assistants and human contributors must:

1. **Identify the status layer.** Is the new content WIP, Research, Canon, or a decision record? If it is unclear, default to WIP or Research, not Canon.
2. **Place the doc in the correct location.** Use the routing in `CLAUDE.md` and the table above. Do not invent a new top-level folder under `docs/`.
3. **For Canon docs: identify the area.** Canon lives under `docs/product/areas/<area-id>/` per the area template in `docs/product/areas/README.md`. If no area fits, **do not** invent a new area lightly — propose an area taxonomy update first, or keep the content in WIP / Research until the area is clarified.
4. **Do not create generic dumping-ground Canon files.** Files like `canon.md`, `canon1.md`, `stable-decisions.md`, or `everything-stable.md` are **not allowed**. Canon is area-based.
5. **Do not promote WIP or Research silently.** WIP and Research can be cited from Canon, but promoting their content to Canon requires an explicit, reviewed PR (see "Promotion rule").
6. **Do not silently resolve conflicts** between WIP, Research, and Canon. If two sources disagree, surface the conflict in the PR and resolve it deliberately.
7. **Tuning and safety-sensitive UX stay WIP until measured.** A recommendation that proposes a starting default is not Canon, even when it is well-argued.
8. **Cite sources.** Canon docs and ADRs must link back to the WIP, Research, Issue, and PR that justify them.
9. **Keep changes small and reviewable** (per `CLAUDE.md`). One product-documentation concern per PR.
10. **Do not commit raw external data, secrets, or private location data** (per `CLAUDE.md` and `.gitignore`). Documentation may describe data shape; it must not include the raw data.

## Issue #21 — Canon promotion tracker

Issue [#21](https://github.com/AlexanderTsarkov/RoadAhead/issues/21) is the umbrella issue for promoting stable POC V1 WIP decisions to Canon and / or ADRs. To prevent Canon from being created as a single dumping-ground PR, that issue should track promotion **by area** using the taxonomy in [`areas/README.md`](areas/README.md).

Suggested status categories per area on Issue #21:

- **pending** — not yet evaluated for promotion;
- **in review** — a candidate Canon / ADR PR is open or under discussion;
- **promoted** — Canon doc and / or ADR exists in the repo;
- **kept WIP** — the area was reviewed and intentionally remains WIP (with reason);
- **blocked pending validation** — promotion is blocked on emulator evidence, scenario sweep results, or other measured validation.

This PR does **not** edit Issue #21 itself. Updating the tracker on Issue #21 is a separate, explicit task.

## What this file is not

- It is **not** Canon. It defines how Canon is built; it does not state any product truth.
- It is **not** an implementation plan. No code changes are implied.
- It is **not** a complete final taxonomy. The initial area taxonomy in [`areas/README.md`](areas/README.md) is expected to evolve as the product is understood better.

## Related files

- [`wip/`](wip/) — WIP product specs (current source of working product truth).
- [`areas/README.md`](areas/README.md) — area-based Canon structure, area taxonomy, and Canon doc template.
- [`../research/`](../research/) — durable research and technical recommendations.
- [`../../_working/ITERATION.md`](../../_working/ITERATION.md) — current iteration context.
- [`../../CLAUDE.md`](../../CLAUDE.md) — stable AI / Cursor operating rules.
- [`../../AGENTS.md`](../../AGENTS.md) — Cursor Cloud / dev-environment instructions.
