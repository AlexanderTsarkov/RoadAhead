---
status: Product Canon
canon: true
area: route-geometry
source:
  - ../product-boundary/product-boundary.md
  - ../validation-emulator/validation-emulator.md
  - ../../wip/roadahead-poc-v1-three-circle-assistant.md
  - ../../wip/roadahead-poc-v1-initial-product-decisions-workbook.md
  - ../../../research/roadahead-route-geometry-provider-recommendation.md
  - ../../../research/roadahead-direction-applicability-recommendation.md
  - ../../../research/roadahead-prepared-event-store-recommendation.md
  - https://github.com/AlexanderTsarkov/RoadAhead/issues/21
related_decisions: []
last_reviewed: 2026-05-20
---

# Route Geometry

## Purpose

This area defines RoadAhead's stable product boundary for route geometry in POC V1.

Route geometry is a **spatial reference** consumed by the route-known validation emulator to enable route-path applicability evaluation, route progress tracking, local approach tangent computation, and candidate event selection. It is an **input to RoadAhead behavior**, not a source of speed truth, legal limit truth, or enforcement truth.

Consuming route geometry for these purposes does **not** make RoadAhead a navigator. The provider that supplies route geometry does not become part of the product. Provider speed, ETA, traffic data, lane guidance, and other non-geometry signals are not RoadAhead product truth and must not flow into driver-facing values or event-selection logic.

This area exists alongside [`product-boundary`](../product-boundary/product-boundary.md) — which establishes at the identity level that RoadAhead is not a navigator and that route providers may supply geometry only — and [`validation-emulator`](../validation-emulator/validation-emulator.md) — which establishes that route-known mode is the primary POC V1 validation mode. This area refines those commitments at the route-geometry level: how geometry is bounded, normalized, and consumed.

## Canon truths

1. **Route geometry is a permitted input to RoadAhead route-known validation.** Consuming a route polyline from a provider or from a file is consistent with RoadAhead's product scope and does not exceed it.

2. **Consuming route geometry does not make RoadAhead a navigator.** Route geometry serves as a spatial reference for route-known behavior; it is not a navigation product offering, a turn-by-turn guidance system, or a route-planning service. This is a direct extension of [`product-boundary`](../product-boundary/product-boundary.md) truth 2.

3. **POC V1 route-known behavior depends on an explicit route geometry source.** Route-known mode — the primary POC V1 validation mode — requires a known route polyline. Without an explicit route geometry source, route-known behavior is undefined. Route-unknown / no-route mode is future strategy only, not POC V1 scope (consistent with [`validation-emulator`](../validation-emulator/validation-emulator.md) truths 4 and 5).

4. **Route geometry is used as a spatial reference for progress, projection, local approach tangent, and applicability evaluation at the principle level.** Specifically, route geometry supports: tracking the vehicle's along-route position; projecting candidate events onto the route; computing the local route approach tangent near an event; and evaluating route-path applicability. These uses are spatial-reference-only. The geometry does not supply speed truth, legal limits, or event confidence.

5. **Route providers supply geometry, not RoadAhead behavioral truth.** When a route provider is used, it is a geometry source. Provider speed, ETA, traffic speed, segment speed, posted speed-limit data, lane guidance, turn instructions, and route optimization outputs are not RoadAhead product truth and must not be consumed by event-selection or driver-facing logic.

6. **Provider speed, ETA, traffic speed, segment speed, posted-limit data, lane guidance, turn instructions, and route optimization are explicitly excluded from RoadAhead's use of route provider output.** These exclusions hold regardless of which provider is used and regardless of what the provider makes available in its response. RoadAhead needs geometry; it does not need anything else the provider returns.

7. **Route geometry must be normalized behind a provider boundary before RoadAhead logic consumes it.** Event-selection logic, route-path applicability evaluation, and direction-applicability checks must consume a normalized route geometry representation, not provider-specific objects. Provider-specific types and objects must not reach into event-selection or core product logic.

8. **Provider-specific objects and coordinate conventions must not leak into core product logic.** Provider coupling that bypasses the adapter boundary is an architectural defect. Any provider swap — or introduction of a file-import fallback — must leave event-selection and direction-applicability logic unchanged.

9. **Longitude-first coordinate convention is the recommended internal adapter-exit convention for route geometry.** Using `{ lon, lat }` ordering (or `[lon, lat]`) at the adapter exit is consistent with the Datakam `X/Y` field convention, GeoJSON (RFC 7946), and the coordinate output of Yandex HTTP Router API, OSRM, and GraphHopper. This avoids silent transposition bugs when the same geometry is compared against candidate event coordinates. Conversion to a different order for a map or UI library must happen at the view boundary only, not inside route geometry internals or event-selection logic.

10. **Provider-derived route geometry has provenance and caching / licensing constraints; long-lived committed fixtures must not silently become user-owned truth.** Route geometry returned by an online provider may carry caching or storage restrictions under that provider's terms. A provider-derived polyline exported to a neutral format (e.g., GeoJSON) is still provider-derived and subject to those constraints. Long-lived committed fixtures in the repository must be synthetic, abstract, or user-provided, not provider-derived data retained as if it were owned by the project.

11. **Route geometry quality affects event applicability; when geometry is too coarse, ambiguous, or conflicting, downstream driver-facing behavior must remain conservative.** Polyline simplification, sparse sampling, parallel carriageway ambiguity, and ramp / branch proximity can degrade projection accuracy and local approach tangent reliability. When route geometry is insufficient to determine applicability with confidence, the conservative posture established in [`product-boundary`](../product-boundary/product-boundary.md) truth 9 applies: suppress over confident display.

## Scope

This area covers:

- **Role of route geometry in route-known POC V1** — what route geometry is for (spatial reference for progress, projection, tangent, applicability) and what it is not for (speed truth, legal limits, behavioral truth).
- **Provider boundary at the product level** — the rule that a route provider is a geometry source, that its non-geometry outputs are excluded, and that consuming geometry does not make RoadAhead a navigator.
- **Geometry-only provider input** — the exclusion of provider speed, ETA, traffic speed, segment speed, posted limits, lane guidance, and turn instructions from RoadAhead logic.
- **Normalized route geometry principle** — the requirement that a provider adapter boundary exists and that event-selection logic consumes normalized geometry, not provider-native objects.
- **Coordinate convention at the adapter-exit level** — the longitude-first internal convention and the view-boundary rule for any required conversion.
- **Provenance and caching boundary at the principle level** — the distinction between in-session provider-derived geometry (acceptable under typical provider terms) and long-lived committed provider-derived fixtures (not acceptable without explicit approval).
- **Conservative behavior when geometry is ambiguous or poor** — the requirement that applicability evaluation defaults to suppression when route geometry cannot support a confident applicability determination.

## Non-goals

These topics are explicitly out of scope for this area. They belong in WIP / research, future implementation issues, future Canon areas, or future ADRs:

- **Final provider selection** — no provider (Yandex, OSRM, GraphHopper, GPX/KML/GeoJSON import, manual polyline, recorded GPS) is selected as final by this Canon area. See [`../../../research/roadahead-route-geometry-provider-recommendation.md`](../../../research/roadahead-route-geometry-provider-recommendation.md) §10.2.
- **Exact API choice** — no specific API variant (Yandex HTTP Router API vs JS API v2.1 vs v3, OSRM route service version, GraphHopper Directions API version) is committed here.
- **Exact `RouteGeometry` schema** — field names, types, constraints, and the precise set of derived fields in the normalized contract are not Canonized here. See [`../../../research/roadahead-route-geometry-provider-recommendation.md`](../../../research/roadahead-route-geometry-provider-recommendation.md) §2.
- **Exact coordinate conversion code** — how a specific provider adapter converts from provider-native to normalized form is implementation detail.
- **Exact route projection algorithm** — including the nearest-point projection method, segment-index lookup, cross-track distance computation, and edge cases for closed or degenerate polylines. See [`../../../research/roadahead-direction-applicability-recommendation.md`](../../../research/roadahead-direction-applicability-recommendation.md) §3.C.
- **Exact local tangent calculation** — approach window length, weighted vs. unweighted averaging, truncated-window fallback, and sensitivity to polyline density. See [`../../../research/roadahead-direction-applicability-recommendation.md`](../../../research/roadahead-direction-applicability-recommendation.md) §3.D.
- **Exact branch / ambiguity detection thresholds** — `branch_zone_radius_m`, `projection_competitor_delta_m`, `competitor_heading_delta_deg`, and related parameters. See [`../../../research/roadahead-direction-applicability-recommendation.md`](../../../research/roadahead-direction-applicability-recommendation.md) §3.G, §4.
- **UI route drawing details** — how the route polyline is rendered in the emulator UI, map tile integration, zoom behavior, route color and styling. Belongs in a future `ui-model` Canon area.
- **Pricing, key management, or provider account setup** — these are operational implementation concerns, not product Canon.
- **Legal interpretation of provider terms** — any statement about whether a specific provider's terms permit or prohibit a specific use requires legal review at integration time, not Canon promotion. See [`../../../research/roadahead-route-geometry-provider-recommendation.md`](../../../research/roadahead-route-geometry-provider-recommendation.md) §7.
- **Implementation slicing** — file layout, module names, adapter class design, TypeScript types, testing approach.
- **Production navigation behavior** — turn-by-turn voice guidance, rerouting, ETA display, or any navigation product feature. Covered by the non-navigator boundary in [`product-boundary`](../product-boundary/product-boundary.md).

## Product rules

These rules are normative. They follow from the Canon truths and constrain implementation, data behavior, and UX:

- **Route geometry may be used only as geometry / spatial reference, not as navigation product scope.** Any feature that uses route geometry — rendering a route polyline, computing vehicle position along the route, projecting candidate events — must be justified by spatial-reference needs, not navigation product needs. Route planning, rerouting, turn guidance, and ETA display are navigator scope and are excluded.

- **Do not consume provider speed, ETA, traffic speed, segment speed, or posted limit data as RoadAhead truth.** When a provider response includes these fields, they must be discarded at the adapter boundary. They must not reach event-selection logic, urgency computation, or the driver-facing UI.

- **Normalize provider output at the adapter boundary before any RoadAhead logic uses it.** A provider adapter translates from the provider-native format to the normalized route geometry representation. Event-selection, direction-applicability, and urgency logic import only the normalized form.

- **Keep provider-specific objects at the adapter boundary.** Yandex-specific route result objects, OSRM geometry objects, GeoJSON `Feature` wrappers, or any other provider-native type must not appear in event-selection logic, direction-applicability checks, urgency computation, or the debug-surface schema.

- **Keep coordinate convention explicit; do not mix `lat/lon` and `lon/lat` silently.** Use longitude-first (`{ lon, lat }` or `[lon, lat]`) inside route geometry and event-selection logic. If a map or UI library requires a different order, convert only at the view boundary. Document the convention at any boundary crossing.

- **Preserve provenance for provider-derived geometry and cached / exported route files.** A route geometry object should record which adapter produced it and when, so debug surfaces can display this information and so reviewers can determine whether a persisted route file is provider-derived or user-owned.

- **If route geometry is ambiguous or insufficient for applicability, downstream event selection must prefer suppression over confident display.** Coarse polylines, sparse sampling, parallel carriageway ambiguity, and branch-zone proximity can all degrade applicability confidence. When geometry quality is insufficient, the conservative posture from [`product-boundary`](../product-boundary/product-boundary.md) truth 9 governs: do not show a candidate confidently when the geometry cannot support a confident determination.

- **Do not commit provider-derived route geometry as long-lived fixtures.** Route geometry obtained from an online provider under provider terms is subject to those terms. Committed fixtures must be synthetic, abstract, or user-provided. Provider-derived geometry may be held in memory during a session but must not be committed to the repository as if it were project-owned geometry.

## Implementation-facing implications

These implications are intentionally high-level and stable. Concrete code, schema, and adapter design belong to future implementation slices or WIP / research:

- **A provider adapter boundary should be defined as a future implementation slice.** The adapter translates from any provider-native format (Yandex HTTP, Yandex JS API, GPX, KML, GeoJSON, manual polyline) to the normalized route geometry contract. This boundary is the mechanism by which provider coupling is contained.

- **Route-known emulator should consume normalized route geometry, not provider-native objects directly.** Event-selection, direction-applicability, and urgency logic should reference only the normalized contract fields. If a future provider change or fallback path changes the adapter, core logic should be unaffected.

- **Any provider-derived exported route must be treated according to provider provenance and caching constraints.** If the emulator offers a "save route" or "export route" feature, the saved file must be labeled with its provenance (provider-derived vs user-provided) and must not be treated as a project-owned or user-owned asset if it originated from a provider with caching restrictions.

- **Projection, tangent, and applicability implementation should cite the future `event-applicability` Canon or WIP / research until that area is promoted.** The mechanics of route projection, local approach tangent computation, and branch-ambiguity detection belong in the `event-applicability` area (planned). Until that Canon area exists, implementation should cite [`../../../research/roadahead-direction-applicability-recommendation.md`](../../../research/roadahead-direction-applicability-recommendation.md) for the relevant pipeline and starting defaults.

- **Route drawing in the emulator UI must not imply route planning or navigation product scope.** Rendering a route polyline on a map is a validation affordance. UI copy, tooltips, and labels must not describe this as "navigation", "directions", "turn-by-turn", or any equivalent navigator framing. This is a direct constraint from [`product-boundary`](../product-boundary/product-boundary.md) product rules.

- **Route-specific derived fields (along-route positions, projection distances, tangent values) are per-route computed values, not global event truth.** These are computed when evaluating a candidate against a specific route. They must not be stored as permanent properties of the base event record. See [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §7 for the architectural rationale.

## Still WIP / not Canon

The items below are deliberately **not promoted to Canon** in this PR. They remain WIP, research, or future-Canon candidates and are listed here so they cannot be mistaken for stable route-geometry truth.

- **Final provider / API selection** — including the decision among Yandex HTTP Router API, Yandex JS API v2.1 / v3, OSRM, GraphHopper, GPX/KML/GeoJSON import, manual polyline, and recorded GPS track. See [`../../../research/roadahead-route-geometry-provider-recommendation.md`](../../../research/roadahead-route-geometry-provider-recommendation.md) §1, §10.2.
- **Yandex HTTP Router API vs JS API boundary** — including the proxy-vs-direct-browser question, API key exposure handling, and the verification of terms / pricing at integration time. See [`../../../research/roadahead-route-geometry-provider-recommendation.md`](../../../research/roadahead-route-geometry-provider-recommendation.md) §3.A, §10.2.
- **OSRM / GraphHopper / manual polyline / GPX / KML / GeoJSON final role** — whether each is used, when, and in what priority order. See [`../../../research/roadahead-route-geometry-provider-recommendation.md`](../../../research/roadahead-route-geometry-provider-recommendation.md) §3.B–§3.E, §6.
- **Exact normalized `RouteGeometry` schema** — field names, types, constraints, and the precise set of required and optional fields. See [`../../../research/roadahead-route-geometry-provider-recommendation.md`](../../../research/roadahead-route-geometry-provider-recommendation.md) §2.
- **Exact coordinate representation in code** — while longitude-first is the recommended convention at the adapter exit, the exact TypeScript/code representation (object shape, array form, wrapper type) is implementation detail.
- **Exact route projection / tangent / progress algorithm** — projection method, segment iteration order, cross-track distance formula, edge-case handling. See [`../../../research/roadahead-direction-applicability-recommendation.md`](../../../research/roadahead-direction-applicability-recommendation.md) §3.C, §3.D.
- **Exact geometry quality thresholds** — `route_projection_accept_m`, `route_projection_warn_m`, and related values that determine when a projection is acceptable. See [`../../../research/roadahead-direction-applicability-recommendation.md`](../../../research/roadahead-direction-applicability-recommendation.md) §4.
- **Exact branch ambiguity heuristics** — `branch_zone_radius_m`, `projection_competitor_delta_m`, `competitor_heading_delta_deg`. See [`../../../research/roadahead-direction-applicability-recommendation.md`](../../../research/roadahead-direction-applicability-recommendation.md) §3.G, §4.
- **Exact route fixture / export / cache directory and lifecycle** — where synthetic fixtures live in the repo, how they are named, what format, and how they are refreshed.
- **Exact provider terms / legal interpretation** — whether specific provider use in the POC meets provider terms requires re-reading the relevant Terms of Use at integration time. No Canon claim is made about any provider's terms. See [`../../../research/roadahead-route-geometry-provider-recommendation.md`](../../../research/roadahead-route-geometry-provider-recommendation.md) §7.
- **Exact UI route drawing and controls** — how the route polyline is rendered, map affordances, zoom, route-planning UI controls. Belongs in a future `ui-model` area.
- **Implementation file / module layout** — adapter file names, module structure, TypeScript type locations, directory hierarchy.

## Source traceability

Each Canon truth is supported by one or more sources. Links are relative to this file.

- **Truth 1 — Route geometry is a permitted input to RoadAhead route-known validation.**
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §3 (Interactive web route emulator — requires a route geometry provider to build a road-following route), §4 (Route geometry provider boundary — provider used only to obtain route geometry).
  - [`../product-boundary/product-boundary.md`](../product-boundary/product-boundary.md) truth 8 (route providers may supply geometry; consuming geometry is within product scope).
  - [`../validation-emulator/validation-emulator.md`](../validation-emulator/validation-emulator.md) truth 4 (route-known mode is the primary POC V1 validation mode; it relies on explicit route geometry).

- **Truth 2 — Consuming route geometry does not make RoadAhead a navigator.**
  - [`../product-boundary/product-boundary.md`](../product-boundary/product-boundary.md) truth 2 (RoadAhead is not a turn-by-turn navigator; any consumption of route geometry is a means to anticipatory road understanding, not a navigation product offering) and truth 8 (route providers supply geometry, not RoadAhead behavioral truth).
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §1 (RoadAhead is not a navigator), §4 (Route geometry provider boundary — the route provider is used only to obtain route geometry; it is not part of RoadAhead's product/runtime logic), §18 (Explicit non-goals — full route engine or navigation).
  - [`../../../research/roadahead-route-geometry-provider-recommendation.md`](../../../research/roadahead-route-geometry-provider-recommendation.md) §1 (POC V1 is not a navigator; the route provider is a geometry source for the emulator, not part of the product), §10.1 (RoadAhead is not a navigator — stable future Canon candidate).

- **Truth 3 — POC V1 route-known behavior depends on an explicit route geometry source.**
  - [`../validation-emulator/validation-emulator.md`](../validation-emulator/validation-emulator.md) truth 4 (route-known mode is the primary POC V1 validation mode) and truth 5 (route-unknown is future strategy only, not POC V1 implementation scope).
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §3 (emulator builds a road-following route through a route geometry provider), §4 (Route geometry provider boundary — route geometry is required for the route-known mode emulator).
  - [`../../../research/roadahead-direction-applicability-recommendation.md`](../../../research/roadahead-direction-applicability-recommendation.md) §1 (RoadAhead should select candidate events using route-path applicability; requires a route polyline), §2 (Definitions — route polyline is the ordered sequence used for applicability checks; route-known mode is the primary POC V1 context).

- **Truth 4 — Route geometry is used as a spatial reference for progress, projection, local approach tangent, and applicability evaluation at the principle level.**
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §4 (Route geometry provider boundary — provider used to obtain route geometry for route-path applicability, route projection, and local approach tangent computation).
  - [`../../../research/roadahead-route-geometry-provider-recommendation.md`](../../../research/roadahead-route-geometry-provider-recommendation.md) §2 (normalized RouteGeometry contract must support: ordered polyline coordinates, total route length, cumulative distance per vertex, segment bearings, point-to-route projection, `vehicle_route_position_m`, `event_route_position_m`, `distance_ahead_m`, local route approach tangent).
  - [`../../../research/roadahead-direction-applicability-recommendation.md`](../../../research/roadahead-direction-applicability-recommendation.md) §2 (Definitions — `vehicle_route_position_m`, `event_route_position_m`, `distance_ahead_m`, `route_projection_distance_m`, local route approach tangent) and §3.C–§3.D (Route projection and local tangent computation using the route polyline).

- **Truth 5 — Route providers supply geometry, not RoadAhead behavioral truth.**
  - [`../product-boundary/product-boundary.md`](../product-boundary/product-boundary.md) truth 8 (route providers may supply geometry, not RoadAhead behavioral truth; provider speed, ETA, traffic speed, segment speed, posted-limit data, lane / turn instructions and other non-geometry signals are not RoadAhead product truth).
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §4 (provider speed, ETA, traffic speed, and segment speed are not RoadAhead speed truth), §18 (Explicit non-goals — treating route provider's speed / ETA / traffic speed as RoadAhead truth).
  - [`../../../research/roadahead-route-geometry-provider-recommendation.md`](../../../research/roadahead-route-geometry-provider-recommendation.md) §1 (the route provider is a geometry source; provider speed/ETA/traffic/segment speed are not RoadAhead truth), §2 (RoadAhead does not need ETA, traffic / real-time speeds, provider speed limits, lane guidance, turn-by-turn instructions, or rerouting), §10.1 (provider supplies geometry only — stable future Canon candidate).

- **Truth 6 — Provider speed, ETA, traffic speed, segment speed, posted-limit data, lane guidance, turn instructions, and route optimization are explicitly excluded.**
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §4 (hard boundaries: provider speed, ETA, traffic speed, and segment speed are not RoadAhead speed truth).
  - [`../../../research/roadahead-route-geometry-provider-recommendation.md`](../../../research/roadahead-route-geometry-provider-recommendation.md) §2 (explicit exclusion list: ETA, traffic / real-time speeds, provider speed limits, lane guidance, turn-by-turn instructions, rerouting, voice / navigation UI, legal speed-limit data).
  - [`../product-boundary/product-boundary.md`](../product-boundary/product-boundary.md) product rules ("Do not present route-provider non-geometry data as RoadAhead truth").

- **Truth 7 — Route geometry must be normalized behind a provider boundary before RoadAhead logic consumes it.**
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §4 (Route geometry provider boundary — the route provider is not part of RoadAhead's product/runtime logic; provider output is a geometry source only).
  - [`../../../research/roadahead-route-geometry-provider-recommendation.md`](../../../research/roadahead-route-geometry-provider-recommendation.md) §1 (provider output must be normalized into RoadAhead's internal route geometry contract before any event-selection logic uses it), §4 (recommended architecture boundary — `RouteSourceAdapter` isolates provider-specific parsing from the normalized `RouteGeometry` object), §10.1 (event selection consumes a normalized RouteGeometry contract, not provider-specific objects — stable future Canon candidate).
  - [`../../../research/roadahead-direction-applicability-recommendation.md`](../../../research/roadahead-direction-applicability-recommendation.md) §3.C–§3.D (direction applicability pipeline is written in terms of normalized contract fields: `route polyline`, `event_route_position_m`, `vehicle_route_position_m`, `route_projection_distance_m`, `local route approach tangent` — none of which are provider-specific).

- **Truth 8 — Provider-specific objects and coordinate conventions must not leak into core product logic.**
  - [`../../../research/roadahead-route-geometry-provider-recommendation.md`](../../../research/roadahead-route-geometry-provider-recommendation.md) §4 (Rules: provider-specific code stays at the adapter boundary; event selection consumes normalized geometry only; direction applicability must not depend on Yandex-specific objects — this is a non-negotiable architectural rule; the same normalized contract must work for Yandex, GPX, KML, GeoJSON, manual polylines, and later OSRM/GraphHopper).
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §4 (route provider is not part of RoadAhead's product/runtime logic).

- **Truth 9 — Longitude-first coordinate convention is the recommended internal adapter-exit convention for route geometry.**
  - [`../../../research/roadahead-route-geometry-provider-recommendation.md`](../../../research/roadahead-route-geometry-provider-recommendation.md) §2 (recommended reason: Datakam `X/Y` fields, GeoJSON RFC 7946, Yandex HTTP Router API, OSRM, and GraphHopper all use longitude-first; adopting this internally avoids silent transposition bugs; if a map or UI library requires a different order, convert only at the view boundary, not inside the RouteGeometry contract or event-selection logic) and §4 (coordinate convention — use longitude-first at the adapter exit and throughout RouteGeometry internals; conversion to a different order for a map/UI library must happen at the view boundary only).

- **Truth 10 — Provider-derived route geometry has provenance and caching / licensing constraints; long-lived committed fixtures must not silently become user-owned truth.**
  - [`../../../research/roadahead-route-geometry-provider-recommendation.md`](../../../research/roadahead-route-geometry-provider-recommendation.md) §7 (provider route geometry may have its own caching / storage restrictions; Yandex §2.3.11.4 limits caching to 30 days temporary caching for the purposes of the Service; provider-derived route geometry exported to another format is still provider-derived and subject to those terms; long-lived committed fixtures in the repo must be synthetic or user-provided, not provider-derived) and §2 (provider source identifier and route generation timestamp flow through the adapter into the normalized object so debug surfaces can record which adapter produced the geometry and when).
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §14.6 (raw data policy — raw external data stays local and uncommitted).
  - [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §6 (data-policy rules — committed fixtures must be small, synthetic, or manually curated; full generated external-data stores must not be committed).

- **Truth 11 — Route geometry quality affects event applicability; when geometry is too coarse, ambiguous, or conflicting, downstream driver-facing behavior must remain conservative.**
  - [`../product-boundary/product-boundary.md`](../product-boundary/product-boundary.md) truth 9 (RoadAhead guidance must be conservative when applicability or data truth is ambiguous; prefer suppression / non-claim over confident display).
  - [`../../../research/roadahead-route-geometry-provider-recommendation.md`](../../../research/roadahead-route-geometry-provider-recommendation.md) §8 (risks: provider geometry can be coarse or noisy; polylines are typically simplified for transmission; route polyline may differ from actual road lane / carriageway) and §9 (validation questions include: is the polyline detailed enough that local route approach tangent is meaningful? are curves represented with enough geometry detail?).
  - [`../../../research/roadahead-direction-applicability-recommendation.md`](../../../research/roadahead-direction-applicability-recommendation.md) §1 (recommendation deliberately favors suppression on doubt), §3.D (averaged tangent over an approach window to avoid noise/jitter from coarse polylines), §9 (risks — route provider geometry can be coarse or shifted; candidate coordinates may be offset to the side of the road).

Umbrella issue and governance:

- Issue [#21 — Promote stable RoadAhead POC V1 WIP decisions to Canon / decision records](https://github.com/AlexanderTsarkov/RoadAhead/issues/21) — umbrella issue under which this Canon promotion lives.
- [`../README.md`](../README.md) — area-based Canon structure, area document template, and area split / merge / cross-link rules.
- [`../../README.md`](../../README.md) — product documentation map, status-layer rules, and Canon promotion rule.

## Related areas

- **[`product-boundary`](../product-boundary/product-boundary.md)** (existing Canon area) — what RoadAhead is and is not; the non-navigator identity; the route-provider geometry-only rule at the boundary level; legal / safety non-claims; external-data candidate boundary; conservative posture under ambiguity. This `route-geometry` area refines the boundary-level commitments in `product-boundary` truths 2 and 8 at the route-geometry level.

- **[`validation-emulator`](../validation-emulator/validation-emulator.md)** (existing Canon area) — the interactive web route emulator as POC V1 validation surface; route-known mode as the primary validation mode; route-unknown as future strategy only. The `route-geometry` area defines the geometry boundary and normalization principle that route-known mode depends on (refining `validation-emulator` truths 4 and 5 at the geometry level).

- **`event-data`** (planned; not yet a Canon area) — external-source data policy, raw-data-import-only rule, prepared normalized candidate event shape, future `VerifiedRoadEvent` boundary. Route-specific derived fields (along-route positions, projection distances, tangent values) are per-route computed values, not global base event truth; the boundary between the base event schema and route-specific fields is a concern of the `event-data` area when it is promoted. See planning entry in [`../README.md`](../README.md).

- **`event-applicability`** (planned; not yet a Canon area) — route / path applicability, direction applicability against the local route approach tangent, branch / intersection ambiguity handling, conservative suppression. The `event-applicability` area will define the specific algorithms, thresholds, and pipeline that consume the normalized route geometry established by this area. See planning entry in [`../README.md`](../README.md).

- **`speed-reference`** (planned; not yet a Canon area) — active POC V1 speed modes, target-speed semantics from the event itself, `provisional_limit` deferral. The exclusion of provider speed from RoadAhead truth (truth 6) directly constrains what `speed-reference` may treat as an authoritative speed source. See planning entry in [`../README.md`](../README.md).

- **`feedback-and-enforcement`** (planned; not yet a Canon area) — pass-feedback tiers, camera-risk feedback, `enforcement_tolerance` severity buffer. Not directly a geometry concern, but the conservative-suppression principle from truth 11 applies when geometry quality is insufficient for applicability; the `feedback-and-enforcement` area should not weaken this posture. See planning entry in [`../README.md`](../README.md).

- **`ui-model`** (planned; not yet a Canon area) — three-circle UI, primary / secondary event roles, visual states, sign-like primitives, layout. Route polyline rendering in the emulator UI belongs here; product rules in the `route-geometry` area require that route drawing not imply navigation product scope, which the `ui-model` area must honor. See planning entry in [`../README.md`](../README.md).

- **`tuning-and-validation`** (planned; not yet a Canon area) — threshold tuning, scenario sweep methodology, validation evidence required before promoting a tuning value to Canon. The geometry quality thresholds (`route_projection_accept_m`, `_warn_m`, approach window bounds, branch ambiguity parameters) listed in [Still WIP / not Canon](#still-wip--not-canon) will require emulator-based validation before any promotion, governed by the methodology this area will Canonize. See planning entry in [`../README.md`](../README.md).
