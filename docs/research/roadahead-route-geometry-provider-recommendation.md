---
status: Research / technical recommendation
canon: false
source: POC V1 WIP spec §3, §4, §8.3, §20.2; companion decision workbook (route provider section); direction applicability recommendation; external provider documentation
purpose: Recommend a route geometry provider strategy for the POC V1 interactive web route emulator
context: RoadAhead POC V1, interactive web route emulator, route-known mode first; provider supplies route geometry only
---

# RoadAhead — Route geometry provider recommendation (POC V1)

> **Status — Research / technical recommendation. Not Canon.**
> This document is input for a future Canon / decision review. It is not an implementation plan, not an implementation slice, not a decision record, and not Canon. It does not select a final provider, does not approve any integration, does not commit RoadAhead to any pricing or licensing arrangement, and does not promote any provider's output to verified product truth. External provider claims are sourced to current public documentation at the time of writing and are explicitly subject to provider-side change.

## 1. Executive recommendation

For the **POC V1 interactive web route emulator** (WIP spec §3, §4) the recommended starting posture is:

- **Yandex** should remain the **primary candidate** for Russia-focused route geometry **if and only if** its current API/key/terms/pricing constraints turn out to be acceptable for a local POC. The HTTP Router API is the clearest provider-neutral source of route polyline data. The JS API is attractive for browser-side route building and rendering, but a future implementation slice must verify that geometry can be extracted cleanly into the normalized RouteGeometry contract without coupling event-selection logic to Yandex-specific objects. The conditional posture is deliberate; Yandex commits the POC to an online dependency, an API key, a domain restriction model, and explicit caching limits (see §3.A and §7).
- **GPX / KML / GeoJSON import** must be treated as a **required fallback for the first emulator, not an afterthought**. It is the only route source that works fully offline, is fully deterministic, sidesteps every provider-side risk, and supports the known Yaroslavl-Moscow corridor immediately.
- **Manual / debug polyline** should exist as a **minimal emergency fallback** for deterministic test cases — curves, T-junctions, ramps, divided carriageways — where realistic provider geometry would obscure what is being validated.
- **OSRM / GraphHopper** should be **deferred** for the first emulator. They are credible future options, but they add deployment or external-API choices that are not justified before the emulator's event-selection behavior is validated, and unless Yandex turns out to be impractical for the Russia-focused POC.
- **Recorded GPS tracks** are noted as a future input class but are not first-priority for an interactive route-planning emulator.
- **Provider output must be normalized into RoadAhead's internal route geometry contract before any event-selection logic uses it**, so direction-applicability code (the direction applicability recommendation, §3.C, §3.D, §3.G) never depends on provider-specific objects.

This recommendation deliberately keeps RoadAhead's commitment to any one provider as small as possible. POC V1 is not a navigator (WIP spec §1, §4, §18). The route provider is a geometry source for the emulator, not part of the product.

## 2. POC V1 route geometry requirements (the normalized contract)

The emulator and event-selection layers should consume a single normalized **RouteGeometry** shape, regardless of where the route came from. Concrete field names are not prescribed here (that belongs to a later implementation slice).

The contract must support:

- **ordered polyline coordinates** along the route, using a **longitude-first** internal convention — `{ lon, lat }` object fields or `[lon, lat]` arrays — at the adapter exit. Recommended reason: Datakam `X/Y` fields, GeoJSON (RFC 7946), the Yandex HTTP Router API, OSRM, and GraphHopper all use longitude-first ordering; adopting this internally avoids silent transposition bugs. If a map or UI library requires a different order, convert only at the view boundary, not inside the RouteGeometry contract or event-selection logic;
- **total route length** in metres;
- **cumulative distance per vertex/segment** so any along-route distance can be computed cheaply;
- **segment bearings** so the local route approach tangent (direction applicability recommendation §3.D) is well-defined;
- **point-to-route projection** — given a candidate event point, compute the nearest point on the route, the corresponding `projected_route_segment_index`, the cross-track distance, and the along-route distance;
- **`event_route_position_m`** — along-route distance from route start to the projection of a candidate event (direction applicability recommendation §2);
- **`vehicle_route_position_m`** — along-route distance from route start to the projection of the simulated vehicle (direction applicability recommendation §2);
- **`distance_ahead_m`** — `event_route_position_m − vehicle_route_position_m` (direction applicability recommendation §2);
- **local route approach tangent near an event** — averaged segment bearings across a short approach window before the event projection (direction applicability recommendation §3.D);
- **provider source identifier and route generation timestamp** so debug surfaces and reproducibility tracking can record which adapter produced the geometry and when;
- **optional route metadata for debug** — total duration estimate, raw provider step structure, raw provider IDs — kept clearly as **debug-only**, never as product truth (see §4 and WIP spec §4).

RoadAhead does **not** need any of the following from the route provider, regardless of which provider is chosen:

- **ETA** — POC V1 simulated time advances from manually controlled speed (WIP spec §3, §4);
- **traffic / real-time speeds** — irrelevant; provider speed is not RoadAhead truth (WIP spec §4);
- **provider speed limits** — POC V1 does not claim legal speed-limit correctness (WIP spec §16, §18);
- **lane guidance**;
- **turn-by-turn instructions**;
- **rerouting** — POC V1 does not reroute (WIP spec §3, §18);
- **voice / navigation UI**;
- **legal speed-limit data** — RoadAhead is not a navigator and not a legal-limit authority (WIP spec §1, §18).

Cleanly separating "needed geometry" from "everything else the provider returns" is what allows the adapter boundary (§4) to stay narrow.

## 3. Candidate provider analysis

The analysis below distinguishes **provider facts found from current public sources** (cited inline) from **interpretation/recommendation** (clearly labelled). All quoted product details are subject to provider-side change; verify before integration. Where a fact is uncertain, it is marked as such.

### 3.A. Yandex route geometry provider

**Provider facts found from public sources at time of writing:**

- Yandex offers an HTTP "Retrieving Route Details API" (Router API) at `https://api.routing.yandex.net/v2/route` keyed by `apikey`, accepting `waypoints` with up to **50 waypoints** for driving/truck modes and up to **25** for other modes. Routes are returned as step-level objects containing a `polyline.points` array of `[longitude, latitude]` coordinate pairs in WGS84 decimal degrees, plus per-step `duration` and `length`. The published per-key rate limit is **50 requests per second**. Sources: Yandex Router API "Overview", "Request format", "Response format", "Quick start", "Configuring restrictions for API keys" — <https://yandex.com/maps-api/docs/router-api/index.html>, <https://yandex.com/dev/router/doc/en/request>, <https://yandex.com/maps-api/docs/router-api/response.html>, <https://yandex.com/maps-api/docs/router-api/quickstart.html>, <https://yandex.com/maps-api/docs/router-api/limit.html>.
- Yandex also offers a **JavaScript API** that builds routes directly in the browser. JS API v2.1 exposes a `route()` function with `auto`, `masstransit`, and `pedestrian` modes and renders the result as a polyline on the map. JS API v3 (`ymaps3`) exposes `YMapFeature` with GeoJSON `LineString` geometry whose `coordinates` are `[longitude, latitude]` pairs accessible programmatically. Sources: "Build a route between two points" — <https://yandex.com/maps-api/docs/js-api/examples/cases/building-route.html>, "Route progress" — <https://yandex.com/maps-api/docs/js-api/examples/cases/progress.html>, "YMapFeature" — <https://yandex.com/maps-api/docs/js-api/object/geo-objects/YMapFeature.html>, JS API v2.1 `route` reference — <https://yandex.com/dev/jsapi-v2-1/doc/en/v2-1/ref/reference/route>.
- **Pricing published on the Yandex Maps API "Rates" page** at the time of writing:
  - **JavaScript API + Geocoder**: free up to **2.5M requests/year**; Basic license starts at $10,000/year for 2.5M requests, scaling up to $32,500/year for 50M requests. Source: "Rates" — <https://yandex.com/maps-api/tariffs> and "JavaScript API" — <https://yandex.com/maps-api/products/js-api?lang=en>.
  - **Router API (Retrieving Route Details + Distance Matrix)**: free up to **250,000 requests/year**; Basic license starts at $1,625/year for 250k requests, scaling up to $65,000/year for 50M requests. Source: "Rates" — <https://yandex.com/maps-api/tariffs> and "API Routes for transport and pedestrians" — <https://yandex.com/maps-api/products/router-api?lang=en>.
- **Caching / storage terms.** The Yandex.Maps API Terms of Use (clause 2.3.11.4) explicitly state that the Service Data — including geocoding and routing results — may not be saved, processed, or altered other than **temporary caching for the purposes of the Service for a period not exceeding 30 days**. Source: <https://yandex.com/legal/maps_api/> §2.3.11.4. Separately, the Router API product page documents that indefinite storage **may** be available depending on the licensing tier ("Basic" vs "Advanced"); the precise terms of the Advanced licence are not fully published. Source: <https://yandex.com/maps-api/products/router-api>.
- **API key restrictions.** API keys can be restricted by Referer (domain) and by IP/IP-range, including IPv4 and IPv6 with subnet masks. Restrictions apply to billable requests. Source: "Configuring restrictions for API keys" — <https://yandex.com/maps-api/docs/router-api/limit.html>.
- **Tracking / vehicle-monitoring restriction.** The Terms of Use (clause 2.3.11.3) prohibit using the Service to "create any systems for monitoring vehicles, persons or other objects that would display real-time information or any other dispatch/control-related services." Source: <https://yandex.com/legal/maps_api/> §2.3.11.3.

**Interpretation for the POC V1 emulator (not provider fact):**

- The **HTTP Router API** is the more straightforward provider-neutral source for route geometry: its response delivers a `polyline.points` array of `[longitude, latitude]` coordinates that can be extracted and normalized at the adapter boundary without depending on Yandex-specific rendering objects.
- The **JS API** is attractive for browser-side route building and map rendering; however, its route geometry is surfaced through Yandex-specific feature objects (e.g., `YMapFeature` in v3, route result objects in v2.1). A future implementation slice must verify that coordinate arrays can be extracted cleanly into the normalized RouteGeometry contract — without the event-selection or direction-applicability layers referencing Yandex-specific types. This is not a blocker, but it must be confirmed before the JS API path is adopted as the geometry source. Either path could feed the normalized RouteGeometry through an adapter.
- The JS API removes the need for a server-side proxy. The HTTP Router API would normally be considered server-side; using it directly from the browser would expose the API key in client code, which the API key restrictions partially mitigate (Referer / IP filtering) but do not fully solve. A small local proxy is the conservative pattern, but a proxy is itself infrastructure and is **not** approved by this document. The proxy-vs-direct decision belongs to a later implementation slice.
- Russia coverage is the strongest fit for the Yaroslavl-Moscow corridor (WIP spec §22), where the POC's evidence base — Datakam/OpenSpeedcam manual QA, OSM corridor sampling — has been built.
- The **30-day caching window** in §2.3.11.4 is enough for the emulator: the emulator only needs to render and project the route during a session and immediately afterwards, not retain it as canonical data. RoadAhead must **not** commit Yandex-derived route geometry to the repo (see §7).
- The **vehicle-monitoring clause (§2.3.11.3)** appears to target dispatch/control systems with real-time tracking. The POC V1 emulator is a development tool with manually controlled simulated speed and no production users; nonetheless, this clause is flagged as a risk that should be re-read by a person before any product-stage use beyond the local emulator.
- **Russia-focused operational risk** — Yandex services are operated from Russia and depend on Russian network and regulatory conditions. This is not a unique POC risk but is worth flagging because the emulator is being developed by a contributor located in (or shifting between) different jurisdictions. Geographic accessibility of the API and of the docs may vary by the developer's network location and is not guaranteed by this document.

**Risks for Yandex specifically:**

- vendor dependency on a single Russia-focused provider;
- API changes (v2 → v3 transition has already happened on the JS side; further breaking changes are normal);
- key exposure if the HTTP API is used directly from the browser without a proxy;
- quota changes — the published free tier (250k Router calls/year, 2.5M JS API calls/year) is generous for a single-developer POC but is not contractually guaranteed long-term;
- terms changes — the §2.3.11.4 caching limit and §2.3.11.3 tracking clause are documented today but may evolve;
- **online dependency** — any Yandex use makes the emulator non-functional offline. This is the structural reason GPX/KML/GeoJSON import (§3.B) is required, not optional.

### 3.B. GPX / KML / GeoJSON imported route

**Format facts:**

- **GPX 1.1** is a lightweight XML format published by Topografix in 2004. It uses the WGS84 datum, decimal-degree latitude and longitude, and ISO 8601 UTC timestamps. It distinguishes **waypoints** (`wpt`), **routes** (`rte` containing `rtept` references — planned turn points), and **tracks** (`trk` containing `trkseg` containing `trkpt` — recorded path). Source: <https://www.topografix.com/gpx.asp>, <https://www.topografix.com/gpx/1/1/>.
- **KML 2.2 / 2.3** is an XML-based standard adopted by the Open Geospatial Consortium as the OpenGIS KML Encoding Standard (OGC 12-007r2). Geometry is expressed inside `<Placemark>` elements as `<Point>`, `<LineString>`, or `<Polygon>`; route polylines are normally encoded as a single `<Placemark>` containing a `<LineString>` whose `<coordinates>` is a whitespace-separated list of `lon,lat[,alt]` tuples. Sources: <https://ogc.org/standards/kml>, <https://docs.ogc.org/is/12-007r2/12-007r2.html>, <https://developers.google.com/kml/documentation/kmlreference>.
- **GeoJSON** (RFC 7946) represents a route most directly as a `Feature` with `geometry.type = "LineString"` and `coordinates` as an ordered array of `[longitude, latitude]` pairs (optionally `[longitude, latitude, altitude]`), where all coordinates are in the WGS84 coordinate reference system. It is plain JSON, trivially parseable in browsers without extra dependencies. Source: IETF RFC 7946 — <https://www.rfc-editor.org/rfc/rfc7946>.

**Interpretation for the POC V1 emulator:**

- All three formats provide what §2 needs: ordered polyline coordinates in WGS84 from which cumulative distance, segment bearings, projection, and local approach tangent can be computed locally.
- **GeoJSON LineString** is the simplest to consume in a browser-side emulator because it is plain JSON and shares geometry conventions with both the Yandex JS API v3 (`YMapFeature` LineString — see §3.A) and the GraphHopper non-encoded response (§3.D).
- **GPX track** is the most natural format for recorded drives and for routes exported from popular tools.
- **KML LineString** is the most natural format for routes exchanged with Google Earth / mapping tools that prefer KML.
- File-imported routes are **deterministic**, **offline-capable**, **provider-independent**, and **safe to keep on local disk**. They are well-suited to the Yaroslavl-Moscow corridor where the POC's manual QA has been done.
- File-imported routes **do not solve route planning** from "start point + end point". They only carry a pre-existing path. This is acceptable for POC V1 validation but is the main reason a provider remains a candidate at all.
- File-imported routes need exactly the same normalization, projection, and tangent logic as provider routes. The adapter boundary (§4) is what makes that uniform.

**Risks:**

- **Privacy** — recorded GPX of personal drives contains private travel data and must not be committed (see §7);
- **Quality / sampling rate** — recorded GPX tracks can be sparse, dense, or noisy depending on the recording device; the normalization layer must tolerate variable sampling;
- **Datum / format quirks** — older GPX files or hand-edited KML may carry namespace or schema inconsistencies; the import path should fail safely on malformed input rather than silently producing partial geometry;
- **No road graph context** — file routes give a path, not road class, lanes, or junction structure (this is also true of the bare provider polyline, see §8).

### 3.C. Manually defined polyline / debug route

**Interpretation only** (no external sources needed):

- Hand-authored polylines (small in-repo fixtures or in-emulator scratch entries) are ideal for tiny **deterministic test cases**: a straight road, a curve before an event, an event placed just after a curve, a T-junction, a ramp, a divided carriageway, two parallel routes, an overpass — exactly the cases the direction applicability validation plan (direction applicability recommendation §7) requires.
- They are not user-friendly enough for an end-to-end "pick start and finish on a map" emulator session; that is the provider's job.
- A short manual polyline can also be the **emergency fallback** when the provider is unreachable, the API key is missing, and no GPX/GeoJSON file is loaded.

**Risks:**

- false sense of confidence — passing the direction applicability tuning on a hand-authored straight line does not generalize to coarse real-world polylines (direction applicability recommendation §9);
- temptation to commit "interesting real corridors" as manual polylines, which would smuggle private/external geometry into the repo. Manual polylines should be **synthetic and abstract** when committed.

### 3.D. OSRM / GraphHopper

**Provider facts:**

- **OSRM** is an open-source OSM-based routing engine. The HTTP API exposes `GET /{service}/{version}/{profile}/{coordinates}[.{format}]?option=value...`; the `route` service supports `overview=full|simplified|false` and `geometries=polyline|polyline6|geojson` for controlling the returned geometry. Sources: <https://github.com/Project-OSRM/osrm-backend/blob/master/docs/http.md>, <https://project-osrm.org/docs/v5.24.0/api/>.
- The **public OSRM demo server** at `router.project-osrm.org` documents an API usage policy of **at most ~1 request per second**, requires a valid `User-Agent`, requires attribution to OSRM and ODbL data, **is not suitable for production use**, and **may be withdrawn at any time**. Sources: <https://github.com/Project-OSRM/osrm-backend/wiki/Api-usage-policy>, <https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server>.
- **GraphHopper Directions API** returns route geometry as either an encoded polyline (`points_encoded=true`, default) or a GeoJSON `LineString` (`points_encoded=false`) under `path.points`. Pricing at time of writing: a free non-commercial tier of **500 daily credits**, then paid tiers starting at **€69/month** (Basic), scaling up to Premium / Custom. Sources: <https://docs.graphhopper.com/openapi/routing/postroute>, <https://docs.graphhopper.com/openapi/section/plans-and-rate-limits>, <https://www.graphhopper.com/pricing>.
- Both OSRM and GraphHopper consume **OpenStreetMap (OSM) data**, which is licensed under **ODbL 1.0** and requires attribution to "© OpenStreetMap contributors". OSM coverage of Russia exists and is usable for routing, but its absolute density and `maxspeed` tagging vary; the relevant comparative observations are in `docs/research/osm-road-metadata-source-review.md`.

**Interpretation for the POC V1 emulator:**

- Both are credible long-term options, especially if RoadAhead later needs offline routing on a local OSM extract.
- For the **first** Russia-focused POC, both add structural complexity that is not justified:
  - the OSRM demo server is unsuitable for sustained POC use (1 rps + no production guarantee), and self-hosting an OSRM server is a deployment step that exceeds POC V1 scope and would require approval under CLAUDE.md's "Do not add infrastructure casually" rule;
  - the GraphHopper free tier (500 credits/day) is enough for hobbyist use but is a third-party API with its own key/rate-limit/terms regime parallel to Yandex;
  - OSM coverage and `maxspeed` quality variability in Russia (per `osm-road-metadata-source-review.md`) is fine for routing geometry but means OSRM/GraphHopper bring no obvious advantage over Yandex for the corridor at hand.
- Both are excellent candidates for a later evaluation if Yandex is blocked, if RoadAhead moves toward offline routing, or if OSM-based routing becomes valuable for other reasons (e.g., cross-referencing with the OSM `maxspeed` and `railway=level_crossing` work already documented in `osm-road-metadata-source-review.md`).

**Risks:**

- **OSRM**: demo server is not a stable POC input; self-hosting introduces infrastructure not approved by this iteration.
- **GraphHopper**: third-party API, key management, free-tier credit cap, separate terms; effectively adds a parallel "Yandex-shaped" risk profile.
- **Both**: attribution requirements (OSM/ODbL); OSM data variability in Russia; **none of this is a fault of OSRM/GraphHopper** — it is a consequence of OSM being the underlying source, which RoadAhead already accepts conditionally for the OSM tile background in the QA viewer.

### 3.E. Recorded GPS track

**Interpretation only:**

- A recorded GPS track is essentially a GPX track or GeoJSON LineString (§3.B). The same normalization path applies. The reason it is listed separately is **purpose**: a recorded track is **after-the-fact field input** for replay validation, not an interactive start/finish planning input.
- Recorded GPS is a strong future input for the moment RoadAhead transitions from emulator validation toward real-device runs (WIP spec §21).
- It is **not first priority** for the POC V1 interactive route emulator because the emulator is explicitly about route-planning style "pick start and finish, then move along it" interaction (WIP spec §3).
- Eventually a recorded GPS track will likely flow through the same import pipe as GPX/KML/GeoJSON, with privacy and provenance handling (see §7).

## 4. Recommended architecture boundary

The boundary is intentionally narrow. RoadAhead's product/runtime layers must not depend on any provider-specific object shape.

```
Provider / imported route source
  -> raw provider format
       (Yandex HTTP / Yandex JS API feature / GPX / KML / GeoJSON / manual polyline)
  -> RouteSourceAdapter (provider-specific, isolated)
       (parses, normalizes, attributes provenance)
  -> normalized RouteGeometry object (§2 contract)
  -> projection / tangent / route-position utilities
       (used by direction applicability — direction applicability recommendation §3)
  -> RoadAhead event selection / emulator
```

Rules:

- **Provider-specific code stays at the adapter boundary.** Datakam/OpenSpeedcam event selection, direction applicability, urgency model, and three-circle UI logic **must not** import provider types or call provider SDKs directly.
- **Event selection consumes normalized geometry only.** The direction applicability recommendation (sections §2, §3.C, §3.D, §3.G) is written in terms of `route polyline`, `event_route_position_m`, `vehicle_route_position_m`, `route_projection_distance_m`, and `local route approach tangent`. None of those terms are provider-specific.
- **Direction applicability must not depend on Yandex-specific objects.** This is a non-negotiable architectural rule because it is the only way the same logic survives a provider swap.
- **The same normalized contract must work** for Yandex (HTTP and JS API), GPX, KML, GeoJSON, manually defined polylines, and later OSRM/GraphHopper. Any "shortcut" that relies on a provider-specific field is a smell.
- **Provider source identity and route generation timestamp** flow through the adapter into the normalized object so debug surfaces can record which adapter produced the geometry (§2). The product layer treats these as debug fields only.
- **Coordinate convention** — use **longitude-first** (`{ lon, lat }` or `[lon, lat]`) at the adapter exit and throughout RouteGeometry internals. This matches Datakam `X/Y`, GeoJSON (RFC 7946), the Yandex HTTP Router API, OSRM, and GraphHopper. Any conversion to a different order for a map/UI library must happen at the view boundary only. Mixing conventions inside the RouteGeometry layer or event-selection logic is a known source of silent bugs.

This is a **boundary**, not an implementation. It does not name files, modules, classes, or directories. That belongs to a later implementation slice.

## 5. Recommended first implementation strategy (recommendation, not implementation)

This is a **recommendation, not code, and not an implementation issue**. It identifies a likely future order. Per CLAUDE.md and the iteration descriptor, this document **does not** create implementation slice issues.

Recommended sequence:

1. **Define the normalized RouteGeometry contract** (§2) in a dedicated future implementation slice. Locking the contract before any adapter is written prevents accidental coupling.
2. **Support GPX / KML / GeoJSON (or GeoJSON first)** as the first emulator route source. This is the fastest path to deterministic local emulator validation, sidesteps provider risk during the most volatile period of UI tuning, and naturally pairs with the manual polyline debug fixtures from §3.C.
3. **Add a Yandex route provider adapter** once GPX/GeoJSON works end-to-end **and** the current API/terms/pricing have been re-verified at integration time (not at this document's writing time). Decide between HTTP Router API + local proxy and JS API direct-render at that point, not before.
4. **Keep manual / debug polyline support** as test fixtures and as the emergency fallback when no other source is configured.
5. **Defer OSRM / GraphHopper** until at least one of: (a) the emulator's event-selection behavior is validated, (b) Yandex turns out to be impractical, or (c) offline / OSM-aware routing becomes a real need (e.g., for cross-referencing with OSM `maxspeed` per `osm-road-metadata-source-review.md`).

Cautions:

- **Do not** create implementation slice issues in this task.
- **Do not** treat this order as a roadmap; it is a likely default that a future audit/plan should re-confirm.
- The order may flip (e.g., Yandex first) if a future audit shows GPX import is unexpectedly expensive — but the **architectural boundary** in §4 must hold either way.

## 6. Starting recommendation table

| Option | POC V1 role | Strengths | Weaknesses | Recommendation |
|---|---|---|---|---|
| Yandex route geometry (HTTP Router API + JS API) | Primary candidate, conditional | Clean polyline access; Russia-focused coverage; documented free tier; JS API works browser-side | Online dependency; API key exposure if used direct from browser; 30-day caching limit; vendor / terms risk; vehicle-monitoring clause risk | Primary candidate **if and only if** current API/terms/pricing are acceptable at integration time; verify before adopting |
| GPX / KML / GeoJSON import | Required fallback | Fully offline; deterministic; no API; matches existing Yaroslavl-Moscow QA work; trivial to consume in browser (especially GeoJSON) | Does not solve route planning from start/end points; recorded GPX has privacy implications; quality varies by source | **Required** for first emulator; implement first |
| Manual / debug polyline | Test fixture / emergency fallback | Deterministic test cases for direction-applicability scenarios; in-repo when synthetic | Not user-friendly for full sessions; risk of smuggling real-world geometry into repo | Support as dev/test fixture only |
| OSRM | Deferred future | Open source; self-hostable; standard polyline output; OSM-based | Public demo server unsuitable for sustained use; self-hosting is infrastructure (not POC scope); attribution required | Defer; reconsider if offline/OSM-aware routing becomes needed |
| GraphHopper | Deferred future | Standard polyline / GeoJSON output; managed service; small free tier exists | Third-party API parallel to Yandex; rate/credit limits; commercial pricing; attribution required | Defer; reconsider if Yandex is blocked |
| Recorded GPS track | Future input | Real field data; natural fit for post-emulator phases; flows through same import pipe | Not interactive; privacy implications; out of phase with POC V1 route planning UX | Accept later as GPX-like input |

## 7. Provider terms / data policy concerns

This section consolidates data-handling rules that flow from §1, §3, and CLAUDE.md.

- **Raw Datakam / OpenSpeedcam data stays local and uncommitted** (WIP spec §14.6; CLAUDE.md "Private/raw data stays local by default"). The route provider does not change this.
- **Provider route geometry may have its own caching / storage restrictions.** For Yandex specifically, the Maps API Terms of Use §2.3.11.4 limit caching of routing results to **temporary caching for the purposes of the Service, not exceeding 30 days**. Source: <https://yandex.com/legal/maps_api/>. The Router API product page documents that indefinite storage is licence-dependent. Source: <https://yandex.com/maps-api/products/router-api>. Other providers (OSRM, GraphHopper) carry the ODbL attribution requirement for OSM-derived data; OSRM's demo server adds its own usage policy at <https://github.com/Project-OSRM/osrm-backend/wiki/Api-usage-policy>.
- **Do not commit private routes** (e.g., a personal home-work GPX). Recorded GPS / GPX contains private travel data and falls under CLAUDE.md's "private location data" boundary.
- **Do not commit raw external datasets** brought in to seed the emulator.
- **Use small synthetic / manually curated route fixtures** in the repo if route fixtures are needed (e.g., a 2 km synthetic curve, a synthetic T-junction). Fixtures should be obviously synthetic — abstract geometry, no real-world correspondence.
- **Avoid mixing provider-derived data into committed product truth** unless the provider's terms explicitly allow it. Yandex's §2.3.11.4 effectively forbids this for Router results within the basic licence; Advanced-licence terms are not analysed here.
- **Provider-derived route geometry exported to another format is still provider-derived.** A Yandex route saved out as a GeoJSON file is subject to the same caching/storage terms as the original response — it must not be treated as a user-owned GPX/KML/GeoJSON file simply because it is now in a neutral format. For Yandex, short-lived in-memory / in-session caching is acceptable under the 30-day temporary-caching clause (§2.3.11.4); persistent on-disk caching of Yandex-derived routes is **not** approved by this document. If the emulator offers a "save route as GeoJSON" feature for Yandex-derived geometry, the saved file is a temporary local cache subject to those terms, not a user-owned asset. For GPX/KML/GeoJSON files the user provides themselves (e.g., an exported route from a mapping tool), local persistence is fine because the user owns the file. Long-lived committed fixtures in the repo must be **synthetic or user-provided**, not provider-derived.
- **If terms are unclear at integration time, mark as blocker / risk** and stop. Re-read the relevant Terms of Use before any non-trivial use; the citations in this document are research evidence, not legal review.

This section is **not legal advice.** It records what the provider's public documentation said at the time of writing. Verify before integration.

## 8. Risks and unknowns

- **Current Yandex terms / pricing may block or complicate a local POC.** The free tiers (Router 250k/year; JS API 2.5M/year) are documented today but are not guaranteed. The §2.3.11.4 caching limit and §2.3.11.3 vehicle-monitoring clause must be re-read at integration time.
- **Browser key exposure.** If the HTTP Router API is called directly from browser code, the API key ends up in client traffic. Yandex's API key Referer / IP restrictions reduce abuse risk but do not change the fact that the key is visible to network observers.
- **Online dependency.** Any provider — Yandex, OSRM, GraphHopper — makes the emulator non-functional without network. This is the structural reason GPX/KML/GeoJSON import is required, not optional (§1, §5).
- **Provider geometry can be coarse or noisy.** Polylines are typically simplified for transmission; a single route segment may not match the actual road centerline exactly. This is the same reason the direction applicability recommendation (§3.D, §9) uses an averaged tangent over an approach window rather than a single segment bearing.
- **Route polyline may differ from actual road lane / carriageway.** Polylines are usually one-line-per-road, not per carriageway. Divided carriageway scenarios may project an event onto the chosen carriageway's polyline correctly but lose visibility of opposite-carriageway candidates — handled by the branch ambiguity step (direction applicability recommendation §3.G).
- **OSM quality variability** affects OSRM / GraphHopper (and any later OSM-derived layer). The `osm-road-metadata-source-review.md` corridor sampling already documents 63–68% `maxspeed` coverage and significant variability in camera / traffic-calming density. Routing geometry quality is generally better than tag-attribute coverage, but variability exists.
- **GPX / manual routes avoid provider risk but reduce UX realism.** "Pick start and finish on a map" is a real product affordance for an emulator that wants to feel like normal route planning. File import is fine for validation but loses that affordance.
- **Branch ambiguity detection may require more road graph detail than a simple route polyline.** A pure polyline does not know "this is a service road, that is the main carriageway" — branch ambiguity (direction applicability recommendation §3.G) currently uses a polyline-only heuristic. Stronger detection would need road-graph data (e.g., OSM ways or a router that exposes step-level graph info). That is a future tuning item, not a POC V1 requirement.
- **Imported routes may lack road graph context.** A GPX/KML/GeoJSON file is geometry only — no road class, no `maxspeed`, no junction tags. The emulator should never imply such context when only file geometry is loaded.
- **Storing route geometry and private travel routes has privacy implications.** This is a recurring theme; the rule is "do not commit private routes" (§7).
- **Terms drift.** Every external citation in this document is a snapshot. Providers change pricing, quotas, and terms without warning. A future iteration that actually integrates a provider must re-verify the relevant page before relying on it.

## 9. Validation plan (provider-choice validation in the emulator)

This validation plan tests the **provider choice and the normalization layer**, not the direction applicability thresholds (those are validated separately per the direction applicability recommendation §7). It is intended to fit inside the same emulator surface.

Targeted questions:

- Can a start/end route be produced for a known **Yaroslavl-Moscow segment** under each candidate provider/source? Where it cannot, why?
- Is the returned polyline **stable enough** between repeated runs for the same start/end pair that local route approach tangents are not flapping?
- Is the polyline **detailed enough** that the local route approach tangent (direction applicability recommendation §3.D) is meaningful — i.e., not dominated by polyline simplification artefacts?
- Does **projection of Datakam candidates** onto the resulting polyline behave plausibly on the curated direction-applicability scenarios (direction applicability recommendation §7) — straight road, curve before event, divided carriageway, T-junction, fork, ramp, parallel road, event just after a turn?
- Are **curves represented with enough geometry detail** to support the averaged-tangent approach? When they are not, does the truncated-window fallback (direction applicability recommendation §3.D) behave reasonably?
- Are **divided carriageways and ramp cases** distinguishable enough at the polyline level that the branch ambiguity step (direction applicability recommendation §3.G) has something to work with? When they are not (e.g., the provider returned one centerline for both directions), is this observable in the debug surface so the limitation is at least visible?
- Can a route be **saved and reloaded** as a GeoJSON or GPX file for emulator replay without re-hitting the provider every time? This is a key reliability test for Yandex specifically. Note: a GeoJSON file produced by exporting a Yandex-derived route is still Yandex-derived data and must be treated as a temporary local cache subject to provider caching terms (§7), not as a user-owned route file. Long-lived committed replay fixtures must be synthetic or user-provided, not provider-derived.
- Does **the same emulator route contract** work with Yandex output, GeoJSON input, and a manual polyline fixture, with no event-selection code changes between them? This is the architectural test (§4).
- Can the **debug fields from the direction applicability recommendation §6** (event/vehicle route position, projection distance, segment index, competing-projection counts, local approach tangent) be computed from each provider's output through the same RouteGeometry interface?

Outputs the emulator should record per scenario:

- which adapter produced the geometry;
- raw provider segment count vs. simplified count (if exposed);
- per-scenario observations: did the projection look right? did the local tangent look right? did branch ambiguity fire when expected?
- screenshots / notes; **no raw Datakam / OpenSpeedcam data committed**, **no real personal routes committed**.

Success criterion for "Yandex is acceptable as primary candidate":

- For at least one realistic Yaroslavl-Moscow sub-corridor, the Yandex polyline supports the direction-applicability checks at parity with a hand-curated GeoJSON polyline; **and**
- the terms / pricing reverification confirms there is no new blocker; **and**
- the emulator can replay the same route from a saved GeoJSON without going back to Yandex every time.

Success criterion for "GPX/KML/GeoJSON is acceptable as fallback":

- A locally authored or exported file loads, normalizes, and feeds the direction-applicability pipeline cleanly on the same direction-applicability scenarios.

This document does not claim those criteria are met today. It defines what the emulator must demonstrate before any provider choice is promoted past WIP.

## 10. Canon-readiness split

This document is Research. Nothing here is being promoted to Canon by this PR. The classification below is informational; it helps a later Canon / decision review separate stable principles from provider-specific tuning.

### 10.1 Possible future Canon candidates

These look **stable enough** for later Canon promotion or an ADR after the web emulator validates the boundary holds:

- The route provider supplies **geometry only**.
- Provider **speed, ETA, traffic speed, and segment speed are not RoadAhead truth.**
- Event selection consumes a **normalized RouteGeometry contract**, not provider-specific objects.
- **GPX / KML / GeoJSON import is required** as a deterministic fallback for local emulator validation.
- A **debug-visible adapter boundary** exists: the provider source and route generation timestamp are recorded in the normalized object and are visible in the emulator debug surface.
- **RoadAhead is not a navigator.**

### 10.2 Must remain WIP / provider-specific

These items should **stay WIP** and **should not** be promoted to Canon based on this document alone:

- Exact **Yandex API choice** (HTTP Router API vs. JS API v2.1 vs. JS API v3).
- **Pricing / terms assessment** — every external citation here is a snapshot; the actual decision needs a re-read at integration time.
- **Adapter implementation details** — file layout, module boundaries, types, naming.
- **Caching policy** — in-session only? in-memory only? bounded on-disk cache? out of scope here.
- **OSRM / GraphHopper deferral timing** — when (if ever) to revisit.
- **Exact route fixture format** for the in-repo synthetic test fixtures.
- **Branch ambiguity mechanism beyond a polyline** — whether to require road-graph data, and from where.

## 11. Cross-links

WIP spec and decision context:

- [`../product/wip/roadahead-poc-v1-three-circle-assistant.md`](../product/wip/roadahead-poc-v1-three-circle-assistant.md) — main POC V1 WIP spec; this document expands §3, §4, §8.3, and §20.2.
- [`../product/wip/roadahead-poc-v1-initial-product-decisions-workbook.md`](../product/wip/roadahead-poc-v1-initial-product-decisions-workbook.md) — companion rationale / input history (route geometry provider section).

Companion recommendation slice (Issue #20):

- [`roadahead-direction-applicability-recommendation.md`](roadahead-direction-applicability-recommendation.md) — direction applicability / route-path applicability recommendation; defines the geometry-consuming side of the §2 contract.

Source-level research:

- [`datakam-speedcam-format-and-route-qa.md`](datakam-speedcam-format-and-route-qa.md) — Datakam / OpenSpeedcam format and Yaroslavl-Moscow corridor QA, including the corridor used as the validation target above.
- [`osm-road-metadata-source-review.md`](osm-road-metadata-source-review.md) — OSM road metadata corridor sampling; relevant to the OSRM / GraphHopper deferral and to any future use of OSM `maxspeed` or `railway=level_crossing` alongside route geometry.
- [`driver-helper-gibdd-camera-map-source-review.md`](driver-helper-gibdd-camera-map-source-review.md) — Driver Helper / GIBDD camera map source review; relevant context for "what other Russia-focused data sources exist", but **not** a route geometry provider.
