---
status: Process / Documentation governance
canon: false
purpose: Signpost for the WIP product specs folder
context: docs/product/wip/ — working product specs, hypotheses, open questions
---

# RoadAhead Product WIP — signpost

> **Status — Process / Documentation governance.**
> This file is a short signpost for `docs/product/wip/`. It is **not** Canon, **not** an implementation plan, and does **not** itself contain any product truth.

## What this folder is

`docs/product/wip/` holds **working** RoadAhead product specifications. WIP files may contain:

- accepted working assumptions;
- hypotheses still being validated;
- open questions and deferred decisions;
- tuning candidates and starting defaults;
- exploratory product framing.

WIP is the right home for product thinking that is **not yet** stable enough for Canon and is **not** purely a research recommendation.

## What this folder is not

- WIP is **not** Canon. WIP is not implementation truth.
- WIP is **not** a decision record. ADRs live under `docs/decisions/` (when that folder exists).
- WIP is **not** durable research. Research and technical recommendations live under [`../../research/`](../../research/).
- WIP is **not** active iteration scratch. Phase context lives in [`../../../_working/ITERATION.md`](../../../_working/ITERATION.md) (see `CLAUDE.md` "_working/ Policy").

## Conflict rules

- When two WIP docs in this folder disagree, the most recent reader-facing WIP spec wins. (For POC V1 today, that is `roadahead-poc-v1-three-circle-assistant.md`; the companion workbook is rationale / input history.)
- When a WIP doc and a Research recommendation disagree, the conflict must be **called out** — not silently resolved — and addressed in the next WIP refinement or Canon review.
- WIP must **not** silently overwrite Canon. Once Canon exists for an area, changes to that area happen by deliberate Canon / ADR PR, not by editing WIP.

## Linking expectations

WIP docs should link to:

- the relevant [`../../research/`](../../research/) docs that informed them;
- the GitHub Issue(s) and PR(s) that produced or revised them;
- the future Canon area(s) under [`../areas/`](../areas/) that the WIP content is expected to feed into, **once those areas exist**. Do not pre-link to areas that have not been created.

## Files in this folder

The current WIP spec and rationale workbook live alongside this README:

- `roadahead-poc-v1-three-circle-assistant.md` — current reader-facing POC V1 WIP product spec.
- `roadahead-poc-v1-initial-product-decisions-workbook.md` — companion rationale / input history workbook.

A WIP index may appear here later if the POC V1 spec splits into multiple area-specific WIP files.

## Related files

- [`../README.md`](../README.md) — product documentation map and status-layer rules.
- [`../areas/README.md`](../areas/README.md) — area-based Canon structure and template.
- [`../../research/`](../../research/) — durable research and technical recommendations.
- [`../../../_working/ITERATION.md`](../../../_working/ITERATION.md) — current iteration context.
- [`../../../CLAUDE.md`](../../../CLAUDE.md) — stable AI / Cursor operating rules.
