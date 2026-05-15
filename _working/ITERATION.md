RA-0001__Project_Bootstrap_and_Datakam_Data_QA.v1

Work Area: Product discovery / data-source validation / initial tooling
Tech Area: Repository bootstrap, documentation structure, external road-event data import, local web viewer

Scope:
- Establish the initial project repository discipline for RoadAhead.
- Keep AI/Cursor operating rules stable and generic in `CLAUDE.md`.
- Use this file as the current iteration descriptor and phase context.
- Prepare the project for the first practical validation step: inspecting Datakam/OpenSpeedcam-style road-event data on a local web map.
- Build only the minimum structure and tooling needed to evaluate whether external candidate data is useful for a familiar region.

Explicit non-scope:
- No Android overlay implementation.
- No navigation or routing engine.
- No backend, accounts, sync, or cloud infrastructure.
- No crowdsourcing/social layer.
- No committing full external datasets or private GPS tracks.
- No treating Datakam/OpenSpeedcam or any external source as verified truth.

Current product framing:
- RoadAhead is not a navigator and not an anti-radar.
- RoadAhead is an overlay assistant for anticipatory road understanding.
- External data sources provide candidates; trusted product data must become verified road events through manual, visual, or field verification.

Candidate first deliverable:
- Local Datakam regional web viewer.
- Load a local `speedcam` text file.
- Parse `IDX,X,Y,TYPE,SPEED,DIRTYPE,DIRECTION`.
- Treat `X` as longitude and `Y` as latitude.
- Filter to a known region.
- Show candidate events on a browser map.
- Preserve raw source fields and source provenance.
- Support visual QA before any trusted road-event layer is built.

Order (high-level):
1. Repository bootstrap: README, generic `CLAUDE.md`, `.gitignore`, `_working/` policy.
2. Create initial docs structure for product WIP, Canon, Research, and Decisions.
3. Capture Datakam/OpenSpeedcam format notes as Research, not Canon.
4. Define minimal ExternalObservation / RoadEvent terminology.
5. Build the smallest local web viewer for regional visual QA.
6. Validate data quality against a familiar region.
7. Decide whether Datakam/OpenSpeedcam should remain a source candidate for future MVP work.

Definition of Done for this iteration:
- `CLAUDE.md` remains stable policy and does not contain temporary milestone state.
- `_working/ITERATION.md` accurately describes the active phase.
- Repo has enough structure for small, reviewable implementation slices.
- Raw/private data remains excluded from git by default.
- First Datakam QA viewer can be planned or implemented without ambiguity about scope and non-scope.

Notes:
- This file is phase context, not Canon.
- Update this file when the active iteration changes.
- Durable product truth must be promoted to the appropriate docs/Canon or decision record.
