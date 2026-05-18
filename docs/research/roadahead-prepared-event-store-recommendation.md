---
status: Research / technical recommendation
canon: false
source: POC V1 WIP spec §7, §8, §14, §16, §20.3; companion decision workbook Q15; direction applicability recommendation; route geometry provider recommendation; Datakam research notes
purpose: Recommend a practical data path and prepared event store strategy for the POC V1 interactive web route emulator
context: RoadAhead POC V1, interactive web route emulator, route-known mode; raw Datakam/OpenSpeedcam is import material only
---

# RoadAhead — Prepared event store / data path recommendation (POC V1)

> **Status — Research / technical recommendation. Not Canon.**
> This document is input for a future Canon / decision review. It is not an implementation plan, not an implementation slice, not a decision record, and not Canon. It does not finalize a storage engine, does not approve any schema, does not promote Datakam/OpenSpeedcam data to verified product truth, and does not claim legal correctness of any speed limit. It does not create implementation issues.

## 1. Executive recommendation

For the **POC V1 interactive web route emulator** (WIP spec §3, §14, §20.3), the recommended starting posture is:

- **Raw Datakam/OpenSpeedcam `speedcam.txt` is import/source material only.** It is never runtime product data, is never read directly by the emulator at runtime, and stays local and uncommitted (WIP spec §14.1, §14.6; `.gitignore` `data/raw/*`).
- **The first emulator slice may start with a small normalized JSON or GeoJSON fixture** if that is the fastest and safest path to validating the three-circle behaviour, direction applicability (the direction applicability recommendation), and route projection (the route geometry provider recommendation). A fixture-only start does **not** mean JSON/GeoJSON is the long-term runtime store; it means a small, deterministic, reviewable artefact is enough for the first behaviour-only emulator runs.
- **Any committed fixture must be small, synthetic, or manually curated** so it is safe to keep in the repo. **Full generated Datakam-derived stores must not be committed** unless explicitly approved as a separate decision (WIP spec §14.6).
- **The normalized event schema should be designed as a migration-compatible subset of a future SQLite (and, later, GeoPackage) prepared event store.** The JSON/GeoJSON fixture is the same schema serialized to JSON; SQLite is the same schema serialized to tables. Field names and types should be stable across both. This is the central architectural rule of this recommendation.
- **SQLite with a spatial index is the intended product/runtime direction** once the emulator demonstrates the behaviour is right and once route-corridor candidate selection on realistic data sizes (or eventual Android packaging) makes a real geo-indexed store the better choice (WIP spec §14.3, §20.3).
- **GeoPackage** is an attractive **later** option if geospatial interoperability becomes valuable (export/import, integration with GIS tools, sharing curated fixtures with external collaborators). It is built on SQLite, so adopting SQLite first keeps the GeoPackage option open without committing to it.
- **A server-side spatial database (e.g., PostGIS) is explicitly out of POC V1 scope** (WIP spec §14.3, §18; CLAUDE.md "Do not add infrastructure casually").
- **Route-projection / route-derived fields are not stored as global event truth.** They are specific to a particular route and must be computed per route (and optionally cached per route/session), separate from the base event record (see §7).

This recommendation deliberately favours a **small, reviewable first step** with a **clearly named migration path**, over a heavier "right architecture now" jump that is harder to validate cheaply. The motivation is the same as the previous two recommendation slices: POC V1 is validating behaviour, not building a runtime data platform.

## 2. Definitions

These terms are used throughout this document. They align with the WIP spec, the workbook, and the direction applicability and route geometry provider recommendations. Exact field names belong to a later implementation slice and may differ.

- **raw source data** — the unmodified Datakam/OpenSpeedcam `speedcam.txt` file (or equivalent vendor distribution). Treated as import material, not runtime data; remains local and uncommitted (`.gitignore` `data/raw/*`).
- **ExternalObservation** — a candidate event row from an external source (currently Datakam/OpenSpeedcam) that has been parsed but not promoted to verified product truth (WIP spec §16; `datakam-manual-visual-validation.md`).
- **prepared event** — an ExternalObservation that has been normalized into RoadAhead's prepared event schema (§5). Still candidate data, not verified truth, but expressed in the RoadAhead-internal shape that the emulator and event-selection layer consume.
- **normalized event schema** — the field set used for prepared events (§5). The schema is the same regardless of physical storage (JSON fixture, GeoJSON fixture, SQLite table, GeoPackage feature table).
- **fixture** — a small, deterministic, in-repo data file used for emulator tests and reviewer-friendly scenarios. Always synthetic or manually curated; never a wholesale export of external data.
- **committed fixture** — a fixture that is tracked in git. Subject to the data-policy rules in §6.
- **generated local store** — a larger normalized event dataset produced locally by an importer from raw Datakam/OpenSpeedcam input. Stays local; not committed unless explicitly approved as a separate decision.
- **runtime event store** — the storage used by the emulator (and, later, Android) at runtime to look up candidate events for the current route or corridor. In POC V1, this can be a fixture; in the intended product direction, this is SQLite with a spatial index (§3.C).
- **source dataset version** — an identifier for the specific Datakam/OpenSpeedcam dataset / file revision an event was imported from (header timestamp, file hash, or vendor revision). Used for reproducibility and for future supersede / refresh workflows.
- **route-projection cache fields** — route-specific derived values (event-along-route position, route-projection distance, projected segment index, local approach tangent, direction delta, applicability decision) that are computed when a candidate is evaluated against a specific route. They are **not** part of the base event record (§7).
- **validation metadata** — schema fields reserved for a future user/community validation lifecycle (e.g., `validation_status`, confirm/reject counters, last-confirmed / last-rejected timestamps, user-added flags). Reserved only; not implemented in POC V1 (WIP spec §14.5, §20.6).
- **spatial lookup** — a query that selects events within a bounding box, polygon, or polyline corridor without scanning every event. In SQLite this typically uses an R-tree index; in a JSON fixture it is an in-memory scan over a small array.
- **migration path** — a documented path from the first POC store (JSON or GeoJSON fixture) to the intended later store (SQLite with a spatial index, then optionally GeoPackage). The path requires schema continuity: the same field names and types serialize cleanly from one form to the other.
- **VerifiedRoadEvent (future, not POC V1)** — the future product class of events that have been promoted through manual / community / field validation. POC V1 does not produce VerifiedRoadEvents; it only consumes ExternalObservation-derived prepared events (WIP spec §16; `datakam-manual-visual-validation.md`).

## 3. POC V1 data-path options

The candidate data paths below are evaluated for the **first emulator slice** specifically, not as a final runtime architecture. Provider-style facts about formats are common knowledge (RFC 7946 GeoJSON, SQLite, GeoPackage 1.3 / OGC 12-128r19); recommendation-level interpretation is clearly labelled.

### 3.A. Normalized JSON fixture

**Format facts:**

- Plain JSON, single file (or small set of files) under a deterministic schema.
- Trivially loadable in a browser-side emulator with no extra dependencies.
- Diffable in PR review.

**Interpretation for POC V1:**

- **Small.** The first emulator scenarios need on the order of tens to low hundreds of events, not 16k corridor events; a JSON fixture is a natural shape.
- **Simple.** No DB driver, no migration tooling, no async query, no schema bootstrap. Behaviour can be validated against the file directly.
- **Browser-friendly.** Both Yandex JS API and GeoJSON-based emulator paths (the route geometry provider recommendation §3.A, §3.B) already imply browser-side route consumption; a JSON event fixture matches that environment.
- **Deterministic.** Reviewer-friendly tests: a fixture maps obviously to inspected behaviour.
- **Weak for large spatial lookup.** Once event counts cross a few thousand and route-corridor / bbox lookups are performance-sensitive, an in-memory linear scan is acceptable but increasingly wasteful, and any meaningful spatial-index work is duplicating what SQLite would provide for free.
- **Good first step**, weak long-term store.

**Risks:**

- temptation to commit "a real subset of speedcam" as a fixture, which would smuggle external data into the repo. Committed fixtures must remain synthetic or manually curated (§6, WIP spec §14.6);
- schema drift between a JSON fixture and a later SQLite store if the schema is not designed as a stable subset from the start (the central architectural rule, §1).

### 3.B. GeoJSON fixture

**Format facts:**

- IETF RFC 7946. Plain JSON with `Feature` / `FeatureCollection` / `LineString` / `Point` types and `[longitude, latitude]` coordinate ordering. Source: <https://www.rfc-editor.org/rfc/rfc7946>.
- Natural map-renderable shape for point events (`Point` geometry) and curated route fixtures (`LineString` geometry).
- Properties on each `Feature` can carry the rest of the normalized event schema.

**Interpretation for POC V1:**

- **Standard geospatial interchange.** A GeoJSON fixture works the same way for the emulator and for any external GIS-style tooling a future contributor might use.
- **Directly map-renderable.** Useful when emulator debug overlays need to show fixture events on a map without parsing custom JSON.
- **Coordinates naturally longitude-first**, consistent with Datakam `X/Y`, the Yandex HTTP Router API, OSRM, and GraphHopper (route geometry provider recommendation §2, §4). This is the same coordinate convention recommended for `RouteGeometry`, so the two layers stay aligned.
- **Properties can carry normalized fields** — every schema field that is not coordinate / geometry can live under `properties`.
- **Still weak for large runtime store**, same as the plain JSON fixture (§3.A).
- **Good first web/debug artefact** — possibly the slightly better default than plain JSON when the fixture will be inspected on a map, slightly worse than plain JSON when the fixture is non-spatial schema test data.

**Risks:**

- same as §3.A;
- minor risk that adding `LineString` features (e.g., a corridor outline) to the same file accidentally implies route or segment geometry is part of the event record — it must not be (route projection is route-specific, §7).

### 3.C. SQLite with ordinary indexes / R-tree spatial index

**Format facts:**

- SQLite is an embedded relational database with strong cross-platform support. The optional R-tree module (`CREATE VIRTUAL TABLE ... USING rtree(...)`) supports spatial bounding-box indexing of 1D/2D/3D ranges. Sources: <https://www.sqlite.org/index.html>, <https://www.sqlite.org/rtree.html>.
- Android ships SQLite as a system library; both web and native runtimes have well-known SQLite paths (e.g., `sql.js` for the browser, `better-sqlite3` for Node, `Room` on Android).

**Interpretation for POC V1:**

- **Better runtime direction.** Schema, indexing, bbox/corridor query, and reproducible "this is the canonical store" semantics are all native.
- **Android-friendly.** SQLite is the dominant on-device store on Android; aiming the schema at SQLite keeps Phase 1 / Phase 2 cheap.
- **Durable.** Stable file format, well-defined backup/migrate story.
- **Good for larger event sets and route corridor queries.** R-tree gives bounding-box prefilter; ordinary B-tree indexes handle `normalized_type`, `enabled_for_poc`, `validation_status`.
- **More implementation complexity.** Requires schema migration tooling, a SQLite driver in the chosen runtime, and a small importer.
- **Driver/packaging choices are not free.** Browser-side SQLite (`sql.js`, `wa-sqlite`, or similar) is non-trivial to load, especially before the emulator has demonstrated stable behaviour. Server-side or build-time SQLite is fine but adds an architectural step the POC does not need on day one.
- **Not necessary for the first behaviour-only emulator** unless full corridor-scale data is required immediately.

**Risks:**

- premature optimization if adopted before the emulator behaviour is validated;
- driver / WASM packaging choice can become a side-quest that delays the actual product validation;
- accidental introduction of provider-derived geometry into a committed SQLite snapshot, which would re-introduce the data-policy problems §6 is trying to prevent.

### 3.D. GeoPackage

**Format facts:**

- GeoPackage is an open OGC standard built on top of SQLite, with conventions for vector features, attributes, metadata, tile pyramids, and extensions. Sources: <https://www.geopackage.org/>, OGC 12-128r19.
- Because it is SQLite under the hood, every SQLite tool can open a GeoPackage; specialized GIS tools (QGIS, GDAL) understand the standard's feature/metadata conventions.

**Interpretation for POC V1:**

- **Geospatial interoperability.** Curated fixtures or generated stores in GeoPackage can be read by standard GIS tools, which is useful for QA and for sharing curated examples.
- **Good future export/import/runtime candidate.** A SQLite event store can later be repackaged as a GeoPackage feature table without changing the schema model.
- **More complexity than POC V1 needs.** GeoPackage adds standards conformance work (spatial reference systems, table metadata, naming conventions) that is valuable later but not on the first emulator.
- **Defer unless interoperability becomes valuable.** It is more attractive than re-inventing GIS metadata if interoperability becomes a real requirement; otherwise plain SQLite is enough.

**Risks:**

- standards-conformance scope creep if adopted too early;
- accidental treatment of a GeoPackage file as "validated" data simply because it is in a GIS-standard format — it remains ExternalObservation-derived candidate data (WIP spec §16).

### 3.E. Server-side spatial database

**Format facts:**

- PostGIS (on PostgreSQL) and equivalents support advanced spatial queries, indexing, and concurrent multi-user access. Not local-first.

**Interpretation for POC V1:**

- **Good future sync/validation/community backend.** Once user-added events, community validation, moderation, and sync exist (WIP spec §14.5, §20.6, §21), a server-side spatial database is the natural home.
- **Explicitly out of POC V1.** CLAUDE.md: "Do not add infrastructure casually. Backend, accounts, sync, cloud storage, telemetry, large frameworks, or new service dependencies require explicit rationale and approval." POC V1 has no such rationale.
- **Must not block POC V1.** The data model can be designed so a later move to a server-side DB is possible without rewriting the schema (§5, §8).

**Risks:**

- infrastructure creep;
- premature commitment to multi-user / sync semantics that distract from the behavioural validation POC V1 is for.

## 4. Recommended first data path

This is a **recommended ordered path, not implementation slicing and not implementation issues**. Per CLAUDE.md, the iteration descriptor (`_working/ITERATION.md`), and §1, this document **does not** create implementation issues. The order below is what a future audit/plan should re-confirm before any code work begins.

1. **Define the normalized event schema** (§5) as the single source of truth, independent of physical storage. The schema is what both the JSON fixture and the future SQLite table conform to.
2. **Produce or load a small committed fixture** — JSON or GeoJSON, synthetic or manually curated — sized for the first emulator behaviour scenarios (the direction applicability recommendation §7 already enumerates the scenarios; route geometry provider recommendation §9 echoes them). The fixture content is what makes the emulator's behaviour deterministically inspectable.
3. **Support a local, uncommitted, generated prepared dataset** for larger corridor experiments (e.g., the Yaroslavl-Moscow ellipse subset from `datakam-speedcam-format-and-route-qa.md`). The generation script reads local raw `speedcam.txt`, applies the normalized schema, and emits an uncommitted file or local store. The repo never carries the output.
4. **Keep the committed fixture and the locally generated store schema-identical**, so any code that consumes the fixture works on the larger store without changes (the central architectural rule from §1).
5. **Migrate to SQLite + spatial index** when one or more of:
   - route-corridor lookup performance on the larger generated store becomes inconvenient for tuning;
   - Android-side / runtime direction (WIP spec §21) becomes near-term enough that the schema benefits from being SQLite-native;
   - validation-metadata semantics (§9.5, WIP spec §14.5) become useful enough that relational queries are worth their cost.
6. **Consider GeoPackage later** if geospatial interoperability is useful (export to GIS tools, curated fixture sharing, integration with future map-data layers — WIP spec §17 OSM use cases, `osm-road-metadata-source-review.md`).

Cautions:

- **This is not implementation slicing.** The order is a recommendation, not a sequence of tickets.
- **No implementation issues are created here.**
- **This is research / technical recommendation.** A future audit/plan can flip the order (e.g., adopt SQLite first) if it has a concrete reason to.
- The **architectural rule (schema continuity)** holds either way: whichever step is taken first, the prepared event schema must remain a migration-compatible subset of the later store.

## 5. Minimum normalized event schema for POC V1

The schema below is a **recommended starting field set**, with nullability rules and rationale. Exact field names are informative; final names belong to a later implementation slice. The schema is intentionally **a migration-compatible subset of a future SQLite store** — JSON-shaped today, table-shaped tomorrow, with the same field names and types.

### 5.1 Identity / source

| Field | Type | Nullable | Rationale |
|---|---|---|---|
| `event_id` | string (UUID or deterministic hash) | no | Stable RoadAhead-internal identifier, independent of source row id. |
| `source` | string enum (`datakam`, …) | no | Which external source this row came from. Allows future multi-source ingestion without schema change. |
| `source_event_id` / `source_idx` | string or int | yes | The original `IDX` (Datakam `IDX` per `datakam-speedcam-format-and-route-qa.md`). Carries traceability back to raw source. |
| `source_dataset_version` | string | yes | Vendor dataset revision / file hash / header timestamp (e.g., `OpenSpeedcam 10-03-2026 11:33`). Required for reproducibility and future refresh logic. |
| `imported_at` | ISO 8601 timestamp | no | When this row entered the prepared store. |
| `raw_type` | int | no | The unmodified source `TYPE`. Preserves provenance even when normalization changes. |
| `normalized_type` | string enum (§5.3) | no | RoadAhead-internal class; the field event-selection logic actually reads. |
| `enabled_for_poc` | bool | no | Quick toggle to scope a candidate in or out of POC V1 behaviour without deleting it (WIP spec §7.1). |

### 5.2 Location

| Field | Type | Nullable | Rationale |
|---|---|---|---|
| `lat` | float (WGS84) | no | Latitude of the candidate point. |
| `lon` | float (WGS84) | no | Longitude of the candidate point. Stored separately rather than as a single coordinate array so that SQLite indexes and R-tree bounding-box queries are direct. |
| `coordinate_source` | string enum (`source_xy`, `manual`, `derived`, …) | yes | Records whether the coordinate is from the raw source row, a manual fix, or a later derived correction. Allows future audit without losing provenance. |
| `location_confidence` / `source_confidence` | float \[0, 1\] | yes | Optional confidence value if the source provides one. Datakam/OpenSpeedcam currently does not; field is reserved for future sources. |

Coordinate convention: **longitude-first internally** (`{ lon, lat }` / `[lon, lat]`) at the schema and adapter boundary, matching Datakam `X/Y`, GeoJSON (RFC 7946), Yandex Router API, OSRM, and GraphHopper (route geometry provider recommendation §2, §4). UI/map libraries that require latitude-first ordering should convert only at the view boundary.

### 5.3 Speed / event semantics

| Field | Type | Nullable | Rationale |
|---|---|---|---|
| `target_speed_kmh` | int | yes | Posted / advisory speed at the event (Datakam `SPEED`). Nullable because not all event types carry a target speed. |
| `event_class` / `semantic_class` | string enum (`speed_regime_candidate`, `point_hazard`, `camera_point`) | no | Coarse behaviour-relevant class for event selection (WIP spec §7.3): speed-regime, local target / hazard, camera point. Distinct from `normalized_type` because normalization can grow without rewriting event-selection logic. |
| `normalized_type` | string enum | no | Specific RoadAhead-internal type. POC V1 values: `speed_limit` (`TYPE=101`), `static_camera` (`TYPE=1`), `road_bump` (`TYPE=102`). Other Datakam types remain ineligible for POC by default (WIP spec §7.1, §7.4). |

The mapping from Datakam `TYPE` to `normalized_type` lives in the importer, not as a runtime SQL switch. The runtime layer only sees the normalized class.

### 5.4 Direction

| Field | Type | Nullable | Rationale |
|---|---|---|---|
| `direction_type` / `source_dirtype` | int | yes | Datakam `DIRTYPE` (`0`, `1`, `2`; `datakam-road-bump-direction-semantics.md`). Carried through unchanged so a later interpretation pass can revisit semantics. |
| `source_direction_deg` | int | yes | Raw Datakam `DIRECTION` value. Preserved without inversion. |
| `vehicle_applicable_direction_deg` / `applicable_vehicle_bearings_deg` | int or array of ints | yes | Derived under the working `DIRECTION + 180` assumption (direction applicability recommendation §3.E); one bearing for `DIRTYPE=1`, two opposite bearings for `DIRTYPE=2`. **Derived field, not source truth.** |
| `direction_interpretation_status` | string enum | yes | Optional manual QA hint (`likely_camera_or_sign_facing_direction`, `unclear_or_wrong`, …) from `datakam-manual-qa-status-semantics.md`. Reserved field; manually populated when available. |
| `direction_confidence` | float \[0, 1\] | yes | Optional confidence about the direction interpretation. Reserved field. |

`vehicle_applicable_direction_deg` is intentionally a **derived** field. It is stored alongside `source_direction_deg` for convenience, but a downstream consumer that wants the raw data can always read `source_direction_deg`. The derivation may be revisited per dataset version (`datakam-manual-qa-status-semantics.md` finding 1, marked non-final).

### 5.5 Route-projection fields — see §7

Route-projection fields are **explicitly not part of the base event record**. They are computed per route, optionally cached per route/session, and discussed in §7. Including them in the base record would couple the prepared event store to a particular route's geometry, which contradicts the entire architecture of the route geometry provider recommendation §4.

### 5.6 QA / validation fields (reserved)

| Field | Type | Nullable | Rationale |
|---|---|---|---|
| `validation_status` | string enum | yes | Reserved field. Possible values include `unknown`, `unconfirmed`, `looks_correct`, `wrong`, `needs_drive`, `confirmed`, `disputed`, `removed_candidate` (mirrors `datakam-manual-qa-status-semantics.md` and WIP spec §14.5). POC V1 reads this only as a soft override (suppression hint), not as ground truth. |
| `confirmations_count` | int | yes | Reserved for future community validation (WIP spec §14.5, §20.6). Not populated in POC V1. |
| `rejections_count` | int | yes | Reserved for future community validation. Not populated in POC V1. |
| `last_confirmed_at` | ISO 8601 timestamp | yes | Reserved. Not populated in POC V1. |
| `last_rejected_at` | ISO 8601 timestamp | yes | Reserved. Not populated in POC V1. |
| `user_added` | bool | yes | Reserved future field; defaults to `false` for all imported rows. |
| `superseded_by_event_id` | string | yes | Reserved for future supersede / refresh workflow; allows replacing an old event without deleting its history. |

POC V1 does not implement validation workflow (WIP spec §20.6). The schema simply **does not foreclose** it.

### 5.7 Runtime / debug flags

| Field | Type | Nullable | Rationale |
|---|---|---|---|
| `enabled_for_poc` | bool | no | Already listed in §5.1; restated here because it is also a runtime flag, not just an identity field. |
| `confidence` / `source_confidence` | float \[0, 1\] | yes | Already listed in §5.2; restated as a runtime / debug input. |
| `suppression_reason_codes` | array of strings | yes | Runtime/debug only — recorded when a candidate is suppressed in a particular route session (direction applicability recommendation §3.H). **Not stored on the base event record** in the prepared store; emitted per-session by the emulator. |

`suppression_reason_codes` are deliberately route-session-scoped: a candidate may be suppressed on one route (e.g., `direction_conflict`) and eligible on another (e.g., the opposite-direction route). Storing them globally would make a suppression decision sticky across routes, which is exactly the wrong product behaviour.

## 6. Fixture strategy

This section consolidates data-policy rules from CLAUDE.md ("Private/raw data stays local by default"; "Do not commit raw/private/external datasets"), WIP spec §14.6, and `.gitignore` (`data/raw/*`, `*.gpx`, `*.kml`, `*.fit`).

### 6.1 What may be committed

- **Small synthetic fixtures** — abstract events created by hand, with no real-world correspondence. The preferred form of committed fixture. Synthetic does not mean unrealistic; it means the geometry and event placement are authored to exercise specific scenarios, not extracted from a real corridor.
- **Small manually curated fixtures**, if safe and approved on a case-by-case basis — e.g., a handful of locations re-keyed and minimized so they cannot be mistaken for "a real dataset". Approval lives outside this document; the default assumption is "synthetic only".
- **Schema example files** — a fixture file whose purpose is to document the schema, with obviously placeholder coordinates.
- **No raw source rows unless explicitly synthetic / minimized** — even one row pulled verbatim out of `speedcam.txt` becomes "committed raw external data". Synthetic substitutes are always preferred.

### 6.2 What must not be committed

- **Raw `speedcam.txt`** or any equivalent vendor source file (WIP spec §14.6; `.gitignore` `data/raw/*`).
- **Full generated Datakam-derived stores** — corridor exports, ellipse subsets, JSON dumps, SQLite snapshots of large slices. Even if normalized to RoadAhead schema, a full generated store is "external data laundered through a script", not safe-to-commit content.
- **Personal route / GPS data** — recorded GPX, KML, or FIT files of personal drives (`.gitignore` already excludes `*.gpx`, `*.kml`, `*.fit`; route geometry provider recommendation §7).
- **Provider-derived route geometry** (e.g., Yandex Router API output saved as GeoJSON) unless the provider's terms explicitly allow committed redistribution **and** that has been approved. By default this is forbidden under Yandex's Terms of Use §2.3.11.4 (route geometry provider recommendation §7).
- **Any blended file** that mixes synthetic and raw rows. If a fixture contains even one row sourced verbatim from raw external data, the entire file becomes raw external data for repo purposes.

### 6.3 Recommended fixture location (future / candidate, not created here)

This task is docs-only and **does not create directories or files** other than this recommendation document. The candidate future locations below are recommendations for a later implementation slice, not directories to create now.

Likely candidates, in roughly preferred order:

- a `fixtures/` directory close to the emulator code (once it exists), so emulator tests pick fixtures up by relative path;
- a `web/.../fixtures/` directory under whichever future web app consumes them;
- `docs/research/fixtures/` only if the fixtures are specifically reviewer-facing illustrative material attached to a research note;
- explicitly **not** under `data/`, `data/raw/`, `data/processed/`, or `data/private/`, because those paths are reserved for local/uncommitted material (`.gitignore`).

Final location is a future implementation decision; this recommendation only requires that wherever they live, they meet §6.1 and §6.2.

### 6.4 Fixture content — scenarios to cover

A first fixture set should be sized to validate behaviour, not to mirror real data. Suggested scenario coverage:

- one `speed_limit` candidate (Datakam `TYPE=101`, working assumption `DIRTYPE=1`);
- one `static_camera` candidate (Datakam `TYPE=1`, working assumption `DIRTYPE=1`);
- one `road_bump` candidate (Datakam `TYPE=102`, `DIRTYPE=2` to exercise bidirectional handling per `datakam-road-bump-direction-semantics.md`);
- one `DIRTYPE=1` candidate that is direction-compatible with the route;
- one `DIRTYPE=2` candidate that is bidirectional;
- one `DIRTYPE=0` candidate **for debug only**, suppressed from driver-facing selection (the direction applicability recommendation §3.E recommends suppression; `DIRTYPE=0` is ~0.04% of `TYPE=102` per `datakam-road-bump-direction-semantics.md`);
- one direction-conflict candidate (good projection, conflicting `DIRECTION`) to exercise §5 / direction applicability recommendation §5;
- one wrong-road / branch-ambiguity scenario (a candidate near a T-junction or fork that should be suppressed under direction applicability recommendation §3.G);
- optionally one near-duplicate or same-location case if it is needed to exercise duplicate handling — but not required for the first slice, since duplicates are rare in the inspected corridor (`datakam-road-bump-direction-semantics.md`).

Each fixture event must carry the §5 fields so it doubles as a schema example.

## 7. Route-specific derived data

This is the architectural rule that keeps the schema clean and the storage simple.

**Route-projection fields are specific to a particular route geometry.** They are valid only for the route they were computed against. They must **not** be stored as canonical event fields, because:

- the same event can have different `route_projection_distance_m` and `event_route_position_m` on two different routes;
- direction applicability against the local route approach tangent is route-specific (direction applicability recommendation §3.D);
- branch ambiguity is route-specific (direction applicability recommendation §3.G);
- caching them per-event globally would silently lock an event to one route's projection forever.

The recommended model is:

- **Base event record** (§5) — global, route-independent.
- **Route-candidate materialization** — computed per route session by the emulator (or by a future caching layer keyed on route geometry hash). May be temporary in memory or in a local cache that is keyed on the route, not the event.

### 7.1 Route-candidate fields (route-derived, computed per route)

- `event_id` (foreign key to base event);
- `route_id` / `route_geometry_hash` (identifies which route this materialization belongs to);
- `event_route_position_m` (along-route distance to the projection — direction applicability recommendation §2);
- `route_projection_distance_m` (cross-track distance — direction applicability recommendation §2);
- `projected_route_segment_index` (index of the route polyline segment the event projects onto — direction applicability recommendation §3.C);
- `local_route_approach_tangent_deg` (averaged bearing over the approach window — direction applicability recommendation §3.D);
- `direction_delta_deg` (angular delta between local tangent and applicable vehicle direction — direction applicability recommendation §3.F);
- `applicability_decision` (`eligible` / `flagged` / `suppressed` — direction applicability recommendation §3.H);
- `suppression_reason_codes` (list, route-session-scoped — direction applicability recommendation §3.H, §5.7 above).

### 7.2 Storage options for the route-candidate cache

- **In-memory only** for the first emulator slice — recomputed each time a route is selected. Simplest; no persistence concerns.
- **Per-session local cache file** if memoizing across page reloads is useful (route geometry hash as key).
- **A future SQLite `route_candidate_cache` table** keyed on `route_geometry_hash` + `event_id`, populated when a route is materialized and discarded when the route is replaced. Optional; not required for POC V1.

The base event schema (§5) must remain free of route-derived fields under all three options. A future SQLite design therefore has two separate tables (or table groups): a base `prepared_events` table and a derived `route_candidate_cache` table (§8.4).

## 8. Migration path to SQLite / GeoPackage

Schema continuity is the central architectural rule (§1). Concretely:

### 8.1 Field naming and type stability

- Keep field names and types stable enough that a JSON fixture record maps **column-for-column** onto a SQLite row. Use the same `lat`, `lon`, `normalized_type`, `event_class`, `enabled_for_poc`, `source_dataset_version` names in both; do not rename on serialization.
- Avoid JSON-only conveniences (e.g., a packed `direction` object with `{ type, deg }` if the SQLite store will need `direction_type` and `source_direction_deg` as separate columns) unless the serializer is symmetric.

### 8.2 Coordinate convention

- **Longitude-first internally** in JSON, GeoJSON, and SQLite — `lon` before `lat` in code paths and `[lon, lat]` in geometry arrays — matching Datakam `X/Y`, GeoJSON (RFC 7946), Yandex Router API, OSRM, and GraphHopper (route geometry provider recommendation §2, §4). Map / UI libraries that prefer latitude-first ordering convert only at the view boundary.

### 8.3 Separation of base events vs route-derived candidates

Two distinct logical tables, even when the physical store is still a JSON fixture:

- **Base event table** — `prepared_events` (route-independent, §5);
- **Route-derived candidate table** — `route_candidate_cache` (route-specific, §7), populated per route session.

The fixture / JSON shape can collapse these into one document only because the route-derived part is empty in a fixture; SQLite makes the split explicit. Either way, code that consumes events should reason about the two layers independently.

### 8.4 Possible future tables

The exact SQL schema is **out of scope for this document**, but the future table set will likely include:

- `external_observations` — optional raw-import staging if the importer keeps the unnormalized rows for traceability;
- `prepared_events` — the §5 schema, the runtime event source;
- `event_source_metadata` — one row per source dataset version, recording vendor, header, file hash, import timestamp, and row count;
- `event_validation_status` — split out from `prepared_events` if the validation workflow grows enough to warrant its own table (WIP spec §14.5);
- `route_candidate_cache` — §7.1 route-derived fields, keyed on `(route_geometry_hash, event_id)`.

This is illustrative, not prescriptive. The actual schema design belongs to a future implementation slice.

### 8.5 Spatial index strategy

- **Start with a bounding-box prefilter** computed in code (or a coarse grid index) when the store is still a JSON/GeoJSON fixture. For fixture-scale event counts (tens to low hundreds), a linear scan is fine; no real "index" is required.
- **Move to a SQLite R-tree index** (`CREATE VIRTUAL TABLE prepared_events_rtree USING rtree(id, min_lon, max_lon, min_lat, max_lat)`) once event counts cross a few thousand. The R-tree gives bounding-box / corridor prefilters cheaply; ordinary B-tree indexes on `normalized_type` / `enabled_for_poc` handle the type filter.
- **Move to a GeoPackage geometry table** only if GeoPackage's interoperability becomes valuable; the underlying SQLite shape is unchanged.

The exact engine and index choice is a future decision; what matters for §8 is that the schema does not have to be rewritten when the engine changes.

### 8.6 Android compatibility

- SQLite is the dominant on-device store on Android. Aiming the schema at SQLite keeps Phase 1 / Phase 2 (WIP spec §2, §21) cheap.
- The route-candidate cache (§7) should remain transient or per-session even on-device; persisting it as a global truth conflicts with the per-route semantics.
- No need to decide a specific Android SQLite library (Room, SQLDelight, raw `android.database.sqlite.SQLiteDatabase`, etc.) at this stage.

## 9. Data quality / policy risks

These risks are restated here from CLAUDE.md, the WIP spec, the workbook, and the Datakam research notes so the reader is not misled by the apparent precision of the proposed schema.

### 9.1 Source semantics

- **Datakam source semantics are not globally verified.** Visual QA on the Yaroslavl-Moscow corridor is `looks_correct` evidence (`datakam-manual-visual-validation.md`), not `VerifiedRoadEvent` truth (WIP spec §16).
- **Type mapping can change by dataset / version.** `TYPE_MEANINGS` in `tools/datakam/inspect_speedcam.py` is best-effort; new releases may introduce new codes or re-use codes for different semantics.
- **`DIRECTION` interpretation remains a working assumption.** The `(DIRECTION + 180) mod 360` rule is QA evidence from a limited geographic sample (`datakam-manual-qa-status-semantics.md` finding 1). Do not hard-code it as global truth.
- **`DIRTYPE=0` remains unclear** (≈0.04% of `TYPE=102` per `datakam-road-bump-direction-semantics.md`). The schema preserves the raw value; the recommended POC posture is to suppress these from driver-facing selection but keep them in debug (direction applicability recommendation §3.E).
- **Duplicate / near-duplicate events may exist** (rare per the corridor audit; 0 exact duplicates inside the Moscow-Yaroslavl ellipse, 7 across the whole file globally per `datakam-road-bump-direction-semantics.md`). Schema reserves `superseded_by_event_id` for a future supersede / refresh workflow.

### 9.2 Repository / data policy

- **Generated stores can accidentally smuggle raw external data into the repo.** This is the most likely failure mode of the data path; §6 exists to prevent it.
- **Full data may have licensing / redistribution constraints.** Datakam/OpenSpeedcam licensing has not been audited as part of this document; raw datasets stay local (WIP spec §14.6).
- **Personal GPS / route data is private** (`.gitignore` `*.gpx`, `*.kml`, `*.fit`; route geometry provider recommendation §7). Do not commit personal drives or routes that imply them.
- **Provider-derived route geometry is not user-owned even when re-saved as GeoJSON.** A Yandex-derived route saved as GeoJSON is still subject to provider caching/storage terms (route geometry provider recommendation §7).

### 9.3 Architectural risks

- **Fixture overfitting risk** — synthetic data can pass while real corridor data fails. Fixtures are necessary but not sufficient; emulator validation must also exercise locally generated, larger datasets (kept uncommitted).
- **Schema overbuild risk** — do not implement community validation, accounts, sync, or moderation prematurely (WIP spec §14.5, §20.6). The schema reserves fields; the runtime does not yet populate them.
- **Schema drift risk** — without a stable schema rule (the central architectural rule from §1), a JSON fixture can diverge from the future SQLite store, and the migration path described in §8 becomes a rewrite.
- **Route-derived contamination risk** — adding route-projection fields to the base event record looks convenient but silently couples the prepared store to a single route's geometry (§7). Resist.

## 10. Validation plan

This validation plan checks the **data path and schema**, not direction applicability or provider choice (those are validated separately per the previous recommendation slices). It is intended to fit inside the same emulator surface.

Targeted questions:

- Can a **small committed fixture drive the emulator** with no raw source dependency? (If not, the data path is leaking raw data into the runtime layer.)
- Can events be **selected by route corridor / bbox** at fixture scale without an explicit index? (Confirms the in-code prefilter assumption in §8.5.)
- Can **direction applicability debug fields** (the direction applicability recommendation §6) be computed from the fixture? (Confirms the schema carries enough direction information.)
- Can **the same normalized event shape support** `speed_limit`, `static_camera`, and `road_bump`? (Confirms the `normalized_type` / `event_class` split is sufficient.)
- Can **route-derived fields be recomputed** when the route changes? (Confirms §7 — route projection is not baked into the base event record.)
- Can **disabled / wrong / unknown QA statuses suppress events** in driver-facing selection without deleting them? (Confirms validation metadata is read as a soft override, not as ground truth.)
- Can a **generated local uncommitted corridor store** be rebuilt deterministically from raw input? (Confirms the importer is reproducible and that the raw → prepared flow is automatable.)
- Does the data path **avoid committing raw or generated external data**? (Confirms §6 holds end-to-end. The PR diff should never include `data/raw/*`, `*.gpx`, or any provider-derived file.)
- Are **future SQLite table columns obvious from the fixture schema**? (Confirms migration path readiness; if a reviewer cannot map a fixture record to a SQL `CREATE TABLE`, schema continuity has broken.)

This document does **not** claim these criteria are met today. It defines what the emulator and importer must demonstrate before any data-path item is promoted past WIP.

## 11. Canon-readiness split

This document is Research. Nothing here is being promoted to Canon by this PR. The classification below is informational; it helps a later Canon / decision review separate stable principles from tuning / implementation details.

### 11.1 Possible future Canon candidates

These principles look **stable enough** to be considered for later Canon promotion or an ADR once the emulator validation demonstrates them:

- **Raw external data is import-only.** It is never runtime product data and is never committed (WIP spec §14.1, §14.6; CLAUDE.md).
- **Runtime uses prepared, normalized event records.** Not raw `speedcam.txt`; not vendor-shaped data.
- **Datakam/OpenSpeedcam remains ExternalObservation candidate data, not VerifiedRoadEvent truth** (WIP spec §16; `datakam-manual-visual-validation.md`).
- **Base event data and route-derived data are separate.** Route-projection fields are not part of the base event record (§7).
- **Small committed fixtures must be synthetic or safely curated.** No verbatim raw rows; no provider-derived geometry; no personal routes (§6).
- **Full generated stores are local / uncommitted by default.** Approval to commit a generated store is a separate, explicit decision, not a default.
- **Schema reserves future validation fields without implementing validation workflow.** The data model is forward-compatible; the runtime is not multi-user (WIP spec §14.5, §20.6).
- **Longitude-first internal coordinate convention**, matching Datakam, GeoJSON, Yandex, OSRM, and GraphHopper (route geometry provider recommendation §2, §4).

### 11.2 Must remain WIP

These items should **stay WIP** and should **not** be promoted to Canon based on this document alone:

- **Exact storage engine for the first implementation** (JSON fixture vs GeoJSON fixture vs SQLite immediately).
- **Exact JSON vs GeoJSON choice** for the first fixture format.
- **Exact SQLite schema** — table names, column types, constraints, foreign keys.
- **Exact spatial index strategy** — R-tree vs grid vs hybrid; index extents; rebuild cadence.
- **Fixture directory / location** (§6.3 lists candidates, none decided).
- **Full validation lifecycle** — confirmation thresholds, freshness rules, prompting policy, account model (WIP spec §20.6).
- **Licensing / redistribution decision for Datakam-derived stores** — whether and under what terms any subset can be redistributed.
- **Duplicate suppression heuristics** — beyond preserving `superseded_by_event_id`, no policy here.
- **Import tool implementation** — language, dependencies, CLI surface, output paths.

## 12. Cross-links

WIP spec and decision context:

- [`../product/wip/roadahead-poc-v1-three-circle-assistant.md`](../product/wip/roadahead-poc-v1-three-circle-assistant.md) — main POC V1 WIP spec; this document expands §14 and §20.3.
- [`../product/wip/roadahead-poc-v1-initial-product-decisions-workbook.md`](../product/wip/roadahead-poc-v1-initial-product-decisions-workbook.md) — companion rationale / input history (workbook decision Q15).

Companion recommendation slices (Issue #20):

- [`roadahead-direction-applicability-recommendation.md`](roadahead-direction-applicability-recommendation.md) — direction applicability / route-path applicability recommendation; the consumer of the route-derived fields described in §7.
- [`roadahead-route-geometry-provider-recommendation.md`](roadahead-route-geometry-provider-recommendation.md) — route geometry provider recommendation; defines the `RouteGeometry` boundary against which §7 route projection is computed.

Source-level research:

- [`datakam-speedcam-format-and-route-qa.md`](datakam-speedcam-format-and-route-qa.md) — Datakam / OpenSpeedcam format, parsed fields, TYPE mapping, and Moscow-Yaroslavl corridor QA used as the validation target above.
- [`datakam-manual-visual-validation.md`](datakam-manual-visual-validation.md) — source-level visual plausibility check on familiar corridors.
- [`datakam-manual-qa-status-semantics.md`](datakam-manual-qa-status-semantics.md) — manual QA status and direction-semantics findings (basis for the `DIRECTION + 180` working assumption and for the reserved `validation_status` field).
- [`datakam-road-bump-direction-semantics.md`](datakam-road-bump-direction-semantics.md) — `DIRTYPE` / `DIRECTION` distribution audit for `TYPE=102` road bumps, including the rare `DIRTYPE=0` slice and the duplicate-coordinate audit.
