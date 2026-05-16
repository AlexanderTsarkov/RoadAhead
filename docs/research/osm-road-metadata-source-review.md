# OSM road metadata source review

## Status

Research note. External reference/source feasibility. Not Canon.

This document captures findings from issue #9: research whether OpenStreetMap road metadata can help validate or compare Datakam/OpenSpeedcam candidate events along the Moscow-Yaroslavl corridor.

This is **Research**, not Canon.

OSM is treated here as a reference/comparison source only. Nothing in this document promotes OSM data to verified RoadAhead truth, approves a production OSM integration, or endorses replacing Datakam/OpenSpeedcam with OSM.

## Context

RoadAhead currently uses OSM tiles as a visual background in the local Datakam QA viewer (`web/datakam-viewer/`). The tile layer is the standard OSM raster tile rendered image. It does not expose the underlying OSM data model, tags, or raw geometry.

Issue #9 asks whether the underlying OSM _data_ (road geometry, speed limits, crossing positions, enforcement-related objects) can be used as a secondary reference layer to compare against Datakam/OpenSpeedcam `ExternalObservation` candidates, particularly along the Moscow-Yaroslavl corridor.

## Source under review

- **OpenStreetMap (OSM)** — <https://www.openstreetmap.org>
- Data is community-contributed and maintained.

### OSM tiles vs. OSM data

These are different things:

| | OSM tiles | OSM data |
|---|---|---|
| What it is | Pre-rendered raster image | Raw vector data: nodes, ways, relations + tags |
| Current RoadAhead use | Background layer in QA viewer | Not yet used |
| What it enables | Visual context for map display | Querying geometry, tags, speed limits, POIs |
| Access method | Tile URL (XYZ/TMS) | Overpass API, planet file, extracts, local DB |

This matters for RoadAhead because the current tile background gives no programmatic access to road class, speed limit, crossing type, or enforcement position. The underlying OSM _data_ does.

## Relevant OSM tags

The following tags are directly relevant to RoadAhead's candidate-event workflow.

### Road class / geometry

| Tag | Meaning |
|---|---|
| `highway=motorway` | Motorway / federal expressway |
| `highway=trunk` | Trunk road (e.g. М8 / A104 Moscow-Yaroslavl federal highway) |
| `highway=primary` | Primary road |
| `highway=secondary` | Secondary road |
| `highway=tertiary` | Tertiary road |
| `highway=residential` | Residential street |
| `highway=unclassified` | Unclassified local road |

These tags on OSM ways define road class and carry associated tags for speed limits, lanes, access restrictions, etc. For the Moscow-Yaroslavl corridor, the M8/A104 federal highway is mapped as `highway=trunk`.

### Speed limits

| Tag | Meaning |
|---|---|
| `maxspeed=*` | Maximum legal speed limit, km/h by default. E.g. `maxspeed=90` or `maxspeed=RU:rural`. Applied to ways. |
| `maxspeed:forward=*` | Speed limit in the forward direction of the OSM way. |
| `maxspeed:backward=*` | Speed limit in the backward direction of the OSM way. |
| `source:maxspeed=*` | Source or type of the speed limit. E.g. `source:maxspeed=sign`, `source:maxspeed=RU:rural`. |
| `maxspeed:type=*` | Alternative to `source:maxspeed`, used in some communities. |
| `maxspeed=RU:urban` | Implicit Russian urban speed limit (60 km/h by law). |
| `maxspeed=RU:rural` | Implicit Russian rural/inter-urban speed limit (90 km/h by law). |
| `maxspeed=RU:motorway` | Implicit Russian motorway limit (110 km/h by law). |
| `maxspeed=RU:living_street` | Implicit Russian living street limit (20 km/h by law). |

**Implicit maxspeed values** are an important OSM feature: instead of tagging every road segment with a numeric value, mappers can tag `maxspeed=RU:urban` on roads inside settlements where the legal default (60 km/h) applies. This makes the OSM maxspeed dataset richer and more maintainable for Russia, but requires the consumer to interpret the code correctly.

**Direction semantics**: `maxspeed:forward` and `maxspeed:backward` follow OSM way direction, not compass bearing. The forward direction is from the first node to the last node of the way. This is similar in concept to Datakam's `DIRTYPE`/`DIRECTION` fields but uses a different coordinate system. See [OSM Forward & backward](https://wiki.openstreetmap.org/wiki/Forward_%26_backward,_left_%26_right).

### Traffic signs

| Tag | Meaning |
|---|---|
| `traffic_sign=*` | On nodes: marks the position of a traffic sign. Value typically encodes the sign type (e.g. `traffic_sign=maxspeed; 60`). Tagging conventions vary. |
| `highway=give_way` | Give-way sign position. |
| `highway=stop` | Stop sign position. |

`traffic_sign` node coverage in OSM is highly variable. Some mappers place explicit sign nodes; many road segments have no sign nodes even if signs exist on the ground.

### Pedestrian and road crossings

| Tag | Meaning |
|---|---|
| `highway=crossing` | Pedestrian / cyclist crossing point on a road. |
| `crossing=traffic_signals` | Crossing with traffic lights. |
| `crossing=uncontrolled` | Marked crossing without lights. |
| `crossing=unmarked` | Crossing with no markings. |

These are point nodes placed on road ways where crossings exist. Relevant to Datakam `TYPE=100 / pedestrian_crossing` candidates.

### Railway level crossings

| Tag | Meaning |
|---|---|
| `railway=level_crossing` | A node on both a road way and a railway way where road and railway cross at grade. |
| `railway=tram_level_crossing` | A crossing between a road and a tram line. |
| `crossing:barrier=*` | Barrier type: `full`, `half`, `no`. |
| `crossing:light=yes/no` | Whether lights are present. |
| `crossing:bell=yes/no` | Whether a bell/acoustic warning is present. |

`railway=level_crossing` is a core structural element in OSM where a highway way and a railway way share a node. These are distinct from pedestrian railway crossings (`railway=crossing`). This tag is directly comparable to Datakam `TYPE=106 / other_danger` observations that appear to correspond to railway crossings in the Moscow-Yaroslavl ellipse (see [datakam-manual-visual-validation.md](datakam-manual-visual-validation.md)).

### Traffic calming / road bumps

| Tag | Meaning |
|---|---|
| `traffic_calming=bump` | Speed bump (aggressive, sharp profile). |
| `traffic_calming=hump` | Speed hump (gentler, rounded profile). |
| `traffic_calming=table` | Raised pedestrian crossing table. |
| `traffic_calming=cushion` | Partial-width speed cushion. |

These are point or area nodes on road ways. Comparable to Datakam `TYPE=102 / road_bump` candidates. OSM distinguishes bump from hump; Datakam `TYPE=102` does not distinguish these.

### Enforcement and camera-related tags

| Tag | Meaning |
|---|---|
| `highway=speed_camera` | Node marking a speed camera position. |
| `enforcement=*` | General enforcement device node. Values include `speed`, `average_speed`, `traffic_signals`, `weight`, etc. |
| `camera:type=*` | Camera type sub-tag. |
| `maxspeed=*` | Often added to `highway=speed_camera` nodes to indicate the enforced limit. |

`highway=speed_camera` is the primary tag for fixed speed cameras in OSM. Coverage in Russia is significantly sparser than specialist camera databases (e.g. Datakam). Community-maintained; accuracy and freshness are not guaranteed. Average-speed-control zones (`enforcement=average_speed`) and mobile cameras are rarely mapped.

## Access methods

| Method | Description | Suitable for RoadAhead |
|---|---|---|
| **Overpass API** | Live query-on-demand HTTP API (<https://overpass-api.de>). Send OverpassQL or OQL query, receive JSON/XML matching elements. | Good for research queries and small corridor checks. Not suitable for production app queries (rate limits, latency, no SLA). |
| **Local OSM extract** | Download a country/region `.osm.pbf` file from Geofabrik (<https://download.geofabrik.de>). Process locally with osmium, pyosmium, or osmfilter. | Best for reproducible offline research. Allows arbitrary queries without network dependency. Russia extract is large (~2 GB PBF). |
| **Small precomputed GeoJSON subset** | Extract a small corridor-specific GeoJSON file offline once, commit (if small enough), use in viewer. | Good for a bounded viewer comparison layer. Must be regenerated when OSM data updates. |
| **Runtime app Overpass queries** | App calls Overpass at runtime to fetch road metadata for current position or route. | Not recommended for production. Overpass has rate limits, variable latency, no SLA. Would create external dependency for a safety-relevant use case. |

### Practical recommendation

For the current research and QA phase:

- Use **Overpass API** for bounded research queries with small bboxes. Respect rate limits: avoid large area queries, add `User-Agent` header, do not run repeated bulk queries.
- For any future viewer layer prototype: use a **small precomputed GeoJSON subset** extracted offline, scoped to the Moscow-Yaroslavl corridor only. This avoids runtime Overpass dependency.
- Do **not** build production runtime Overpass integration. A production app querying Overpass for safety-relevant road data would introduce an unavoidable external dependency with no reliability guarantees.
- A **local OSM extract** (e.g. Russia or Central Russia region from Geofabrik) would be appropriate for more comprehensive offline analysis if needed. Raw extract files should not be committed to the repo per data policy.

### Overpass rate-limit caution

The public Overpass API at `overpass-api.de` is a free community service. Usage policy requests:
- Avoid automated queries that repeat frequently.
- Keep bboxes small; do not query large country-scale areas.
- Add a descriptive `User-Agent` header identifying your project.
- Prefer off-peak hours for larger queries.
- Consider self-hosting Overpass for intensive use.

All queries in this research note used small bboxes (approximately 20×30 km) and were run once during the research session.

## Licensing and attribution

> **Note: This is not legal advice. This is a research summary for information purposes only. Consult appropriate legal sources for binding conclusions.**

### ODbL license

OSM data is licensed under the **Open Database License (ODbL) 1.0** by the OpenStreetMap Foundation.

Key implications under ODbL:

- **Attribution required**: Any product using OSM data must credit OpenStreetMap and its contributors.
- **Share-alike**: If you produce a derived database from OSM data, you must release that derived database under ODbL or a compatible license. This applies to databases, not necessarily to rendered outputs.
- **Produced works**: Maps, visualizations, and produced works (rendered images, app screens showing OSM-derived information) require attribution but not necessarily ODbL share-alike on the produced work itself.

### Attribution requirement

The OSMF Attribution Guidelines (see <https://osmfoundation.org/wiki/Licence/Attribution_Guidelines>) require:

- Displaying the attribution text `© OpenStreetMap contributors` on any map display.
- Making clear the data is under ODbL.
- For browsable maps, this typically appears as a visible corner credit on the map.

The current Datakam QA viewer already displays OSM tile attribution (as required by the OSM tile usage policy). Adding OSM _data_ as a comparison layer would require ensuring the attribution remains visible and correct.

### Mixing dataset caution

If RoadAhead derives a combined dataset from OSM data and Datakam/OpenSpeedcam data, the licensing implications of the combination would need explicit review. ODbL's share-alike clause applies to derived _databases_. RoadAhead's current posture (OSM as a reference layer, not merged with verified product data) is safer than mixing sources into a single derived database.

### Tile usage vs. data usage

- **OSM tile usage** (the current viewer) is governed by the [Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/), which allows reasonable use for personal/research purposes but prohibits high-volume tile crawling and requires attribution.
- **OSM data usage** is governed by ODbL, which is separate and more permissive in terms of downstream use (but requires share-alike for derived databases).

## Moscow-Yaroslavl sample check

### Method

Three small representative bboxes were queried via the Overpass API on 2026-05-15. Queries were kept small (approximately 15-30 km × 20-30 km each) to respect rate limits and avoid large data extraction.

Bboxes used:

| Area | Bbox (south, west, north, east) |
|---|---|
| Sergiev Posad / M8 area | 56.3, 38.1, 56.5, 38.4 |
| Pereslavl-Zalessky / M8 area | 57.0, 38.5, 57.3, 39.0 |
| Rostov Veliky area | 57.1, 39.3, 57.3, 39.8 |
| Yaroslavl city | 57.58, 39.7, 57.68, 39.95 |

No raw query output was committed to the repo. Results are summarized below.

### Road geometry and maxspeed coverage

**Sergiev Posad area** (motor roads: motorway / trunk / primary / secondary / tertiary):

| Metric | Value |
|---|---:|
| Total ways queried | 605 |
| Ways with `maxspeed` | 381 (63.0%) |
| Ways with `maxspeed:forward` | 48 |
| Ways with `maxspeed:backward` | 50 |
| Ways with `source:maxspeed` | 100 (16.5%) |

Dominant `maxspeed` values: `RU:rural` (194), `RU:urban` (39), `70` (28), `50` (26), `20` (21), `RU:motorway` (20), `60` (18), `90` (17).

Highway class distribution: secondary (199), tertiary (170), trunk (155), primary (61), motorway (20).

**Yaroslavl city area** (trunk / primary / secondary / tertiary):

| Metric | Value |
|---|---:|
| Total ways queried | 1,683 |
| Ways with `maxspeed` | 1,146 (68.1%) |
| Ways with `maxspeed:forward` | 17 |
| Ways with `maxspeed:backward` | 17 |
| Ways with `source:maxspeed` | 138 (8.2%) |

Dominant `maxspeed` values in Yaroslavl: explicit numeric values dominate (`60`: 859, `40`: 79, `90`: 58, `70`: 29) vs. implicit codes (`RU:urban`: 63, `RU:rural`: 39).

**Pereslavl-Zalessky area** (only trunk/primary/secondary/motorway sampled):

| Metric | Value |
|---|---:|
| Total ways queried | 4 |
| Ways with `maxspeed` | 4 (100%) |
| Dominant values | `RU:rural` (3), `60` (1) |

Note: only 4 major road ways in this small bbox indicates sparse major road coverage; most roads in this area are likely secondary/tertiary queried in a broader pass.

### Crossings and railway level crossings

| Area | `railway=level_crossing` | `highway=crossing` | `highway=speed_camera` |
|---|---:|---:|---:|
| Sergiev Posad (56.3–56.5, 38.1–38.4) | 37 | 357 | 30 |
| Rostov Veliky (57.1–57.3, 39.3–39.8) | 55 | — | 6 |
| Yaroslavl city (57.58–57.68, 39.7–39.95) | 112 | — | 39 |

`railway=level_crossing` is well-represented across all three sampled areas. Many crossing nodes carry additional sub-tags: `crossing:barrier`, `crossing:light`, `crossing:bell`, providing more detail than simply knowing a crossing exists.

Sample level-crossing tags observed:
- `{'railway': 'level_crossing'}` — bare tag only
- `{'crossing:barrier': 'full', 'crossing:bell': 'yes', 'crossing:light': 'yes', 'railway': 'level_crossing'}` — full barrier with lights and bell
- `{'crossing:barrier': 'no', 'crossing:bell': 'yes', 'crossing:light': 'yes', 'railway': 'level_crossing'}` — lights and bell, no barrier

### Traffic calming (road bumps)

| Area | `traffic_calming` nodes | Values observed |
|---|---:|---|
| Sergiev Posad | 104 | `bump` (49), `hump` (54), `yes` (1) |
| Yaroslavl city | 118 | — (distribution not separately recorded) |

Traffic calming nodes are present but coverage is sparser than Datakam `TYPE=102` density (see comparison section below).

### Speed cameras in OSM

`highway=speed_camera` nodes are present across all sampled areas but sparsely:
- Sergiev Posad: 30
- Yaroslavl city: 39
- Rostov area: 6

Many `highway=speed_camera` nodes carry `maxspeed=*` sub-tags indicating the enforced limit, but camera records in OSM are far less dense than in specialist databases like Datakam.

### Overpass query snippets used

Road metadata (ways):

```
[out:json][timeout:30];
(
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary)$"](56.3,38.1,56.5,38.4);
);
out tags;
```

Crossing and enforcement (nodes):

```
[out:json][timeout:30];
(
  node["railway"="level_crossing"](56.3,38.1,56.5,38.4);
  node["highway"="crossing"](56.3,38.1,56.5,38.4);
  node["highway"="speed_camera"](56.3,38.1,56.5,38.4);
  node["traffic_sign"](56.3,38.1,56.5,38.4);
);
out tags;
```

Traffic calming:

```
[out:json][timeout:30];
(
  node["traffic_calming"](56.3,38.1,56.5,38.4);
);
out tags;
```

### Limitations of this sample check

- Queries used small bboxes for three discrete areas. The corridor between these areas was not queried exhaustively.
- `maxspeed` coverage percentages reflect the queried bboxes only; coverage will vary along the full corridor.
- `maxspeed:forward` / `maxspeed:backward` presence is low (~2.5–8% of ways); direction-specific speed limits are uncommon in this region.
- Speed camera (`highway=speed_camera`) count is illustrative only; OSM camera mapping is known to be far sparser than specialist databases.
- No large extract was downloaded or committed.

## Comparison against Datakam candidates

The local `data/raw/datakam/speedcam.txt` file (ignored by git, not committed) was used for this comparison. The full-file summary and ellipse breakdown are documented in `docs/research/datakam-speedcam-format-and-route-qa.md`.

Datakam counts in the Moscow-Yaroslavl ellipse (centerLon=38.75, centerLat=56.70, major=300 km, minor=80 km, bearing=35°), computed locally:

| Datakam TYPE | Meaning | Count in ellipse |
|---:|---|---:|
| 1 | static_camera | 5,627 |
| 3 | red_light_camera | 877 |
| 100 | pedestrian_crossing | 945 |
| 101 | speed_limit | 1,015 |
| 102 | road_bump | 6,532 |
| 103 | bad_road | 257 |
| 104 | dangerous_turn | 602 |
| 105 | dangerous_intersection | 189 |
| 106 | other_danger | 434 |

### Speed limit / speed regime (Datakam TYPE=101 vs. OSM maxspeed)

Datakam `TYPE=101` represents speed-regime point events (see `datakam-manual-qa-status-semantics.md`): includes literal speed-limit sign positions and settlement entry/exit points. 1,015 such points in the ellipse.

OSM `maxspeed` is tagged on road _ways_, not as separate point events. Coverage is 63–68% across the sampled route areas. Most ways have either an explicit numeric value or an implicit regional code (`RU:rural`, `RU:urban`).

**Interpretation**: The two sources are structurally different:
- Datakam gives _point_ events marking where a speed-regime change occurs.
- OSM gives _segment_ tags showing what the speed limit is on that segment.

They are complementary, not directly overlapping. OSM is more useful for checking _what the limit is_ on a given segment; Datakam is more useful for _where the limit changes_. A combined QA pass could use OSM maxspeed to validate whether a Datakam `TYPE=101` point is near a segment boundary between different OSM maxspeed values — though this would require route geometry, not just point proximity.

### Other danger vs. railway crossings (Datakam TYPE=106 vs. OSM railway=level_crossing)

Datakam `TYPE=106 / other_danger` in the ellipse: **434** points.

From visual inspection documented in `datakam-manual-visual-validation.md`, many `TYPE=106` points in the Moscow-Yaroslavl region appear to correspond to railway crossings.

OSM `railway=level_crossing` in the three sampled sub-areas alone: **37 + 55 + 112 = 204** nodes. These cover only a fraction of the full ellipse area.

**Interpretation**: OSM railway level crossings are well-tagged and carry richer sub-tags (barrier, lights, bell). Datakam `TYPE=106` is a broader general-hazard category that may include railway crossings plus other unspecified hazards (road damage, dangerous sections, etc.). OSM crossing data could serve as a plausibility check for a subset of Datakam `TYPE=106` points: if a Datakam `TYPE=106` point is very close to an OSM `railway=level_crossing` node, that is supporting evidence for the candidate. Points that have no nearby OSM crossing could flag for further review. However, absence of an OSM crossing does not mean no crossing exists (OSM coverage is community-dependent and may be incomplete in some areas).

### Cameras and enforcement (Datakam cameras vs. OSM highway=speed_camera)

Datakam cameras in ellipse: **5,627** static cameras (TYPE=1) + 877 red-light cameras (TYPE=3) + small count of average-speed and mobile cameras.

OSM `highway=speed_camera` across three sampled sub-areas: **75** nodes total (30 + 6 + 39). Even accounting for the sampled areas being a fraction of the full ellipse, this illustrates that OSM camera coverage is far sparser than Datakam.

**Interpretation**: OSM is not a useful camera validation source for Russia. Datakam remains the primary candidate camera layer. OSM `highway=speed_camera` nodes that _are_ present could be used as independent spot checks, but coverage is too sparse for systematic validation.

### Road bumps vs. traffic calming (Datakam TYPE=102 vs. OSM traffic_calming)

Datakam `TYPE=102 / road_bump` in ellipse: **6,532** rows.

OSM `traffic_calming` nodes across two sampled sub-areas: **222** total (104 + 118).

**Interpretation**: OSM traffic calming coverage in Russia is much sparser than Datakam road_bump density. OSM distinguishes `bump` from `hump` (a useful semantic distinction); Datakam `TYPE=102` does not. OSM is not a reliable cross-reference for road bump density in Russia, but it could corroborate high-confidence bump locations near known settlements.

## Interpretation

### Where OSM is strong

- **Road geometry and classification**: OSM highway tags are well-mapped along the full Moscow-Yaroslavl corridor. Major roads (trunk, primary, secondary) are present and usable as a geometry layer.
- **maxspeed coverage**: 63–68% of roads in the sampled areas have `maxspeed` tags. Implicit Russian zone codes (`RU:rural`, `RU:urban`, `RU:motorway`) are widely used and encode the correct legal default. This is a meaningful, if incomplete, speed metadata layer.
- **Railway level crossings**: `railway=level_crossing` is well-mapped and carries richer sub-tags (barrier type, lights, bell). This is OSM's strongest comparative advantage vs. Datakam for this use case: it enables plausibility cross-check of Datakam `TYPE=106 / other_danger` candidates.
- **Pedestrian crossings**: `highway=crossing` nodes are present in urban areas and can be compared against Datakam `TYPE=100 / pedestrian_crossing`.

### Where OSM is weak

- **Camera / enforcement coverage**: Far sparser than Datakam in Russia. OSM `highway=speed_camera` is not a reliable source for validating or discovering camera locations along this corridor.
- **Speed-regime _change_ events**: OSM tags limits on segments, not point events marking where limits change. Datakam's `TYPE=101` point-event model is more directly useful for RoadAhead's anticipatory-warning use case.
- **Traffic calming density**: OSM `traffic_calming` coverage is significantly sparser than Datakam `TYPE=102` density in the corridor.
- **maxspeed:forward/backward**: Direction-specific maxspeed tagging is present but covers only ~2.5–8% of ways in the sampled areas. Datakam's per-row `DIRTYPE`/`DIRECTION` fields, while needing careful interpretation, cover direction-aware events more broadly.
- **Source or provenance of speed data**: `source:maxspeed` is present on only 8–16% of ways sampled. For most ways, it is impossible to verify from OSM alone whether the maxspeed is from a sign, from a legal default, or from a contributor assumption.

## Recommendation

### Is OSM useful as a road geometry layer?

**Yes.** OSM highway geometry is the most reliable free road geometry source for the corridor. It is already used as the visual tile background. Using it as a programmatic reference for road class and basic geometry adds value without significant risk.

### Is OSM useful as a speed metadata layer?

**Yes, with caveats.** Coverage at 63–68% is meaningful. Implicit zone codes work well for Russia. However, OSM is not a point-event source for speed-regime _changes_, and direction-specific coverage is sparse. OSM maxspeed would be most useful as a segment-level reference to cross-check whether a Datakam `TYPE=101` point is plausibly positioned near a speed-limit boundary, not as a replacement for Datakam's point-event model.

### Is OSM useful for railway crossing / hazard validation?

**Yes, this is the strongest OSM use case here.** OSM `railway=level_crossing` is well-mapped, structured, and carries richer detail than Datakam `TYPE=106 / other_danger`. Using OSM level crossings to corroborate or flag Datakam `TYPE=106` candidates is practical and low-risk.

### Is OSM useful for camera/enforcement validation?

**No — not as a systematic source.** Coverage in Russia is too sparse. OSM `highway=speed_camera` nodes could serve as individual corroboration spots, but they should not be relied upon as a validation layer for Datakam camera candidates.

### Should we create a follow-up issue for an optional OSM comparison layer in the Datakam QA viewer?

**Yes — narrowly scoped.** The highest-value follow-up would be an optional OSM `railway=level_crossing` overlay in the QA viewer, displayed alongside Datakam `TYPE=106 / other_danger` candidates. This would allow a reviewer to visually compare whether a Datakam `TYPE=106` point is near a known OSM railway crossing.

**Proposed narrow scope for follow-up issue:**

- Extract a small precomputed GeoJSON of OSM `railway=level_crossing` nodes for the Moscow-Yaroslavl corridor offline (Overpass query, run once locally, result committed as a small static file if it is compact enough).
- Add an optional toggle in the Datakam QA viewer to show or hide the OSM crossing layer.
- Display crossings with a distinct icon (not conflated with Datakam candidates).
- Include available sub-tags in the popup (barrier, lights, bell).
- No runtime Overpass dependency in the viewer.
- Scope: OSM crossing layer only — do not expand to maxspeed or camera layers in the same issue.
- Attribution: display `© OpenStreetMap contributors` on the map when the OSM layer is active.

This follow-up should be a Research/Implementation issue scoped to the viewer only, not a production integration.

## Non-meaning

- This review does not verify any OSM object against the real world.
- OSM data is community-contributed and carries no official verification.
- OSM maxspeed tags are not official road authority data.
- OSM `railway=level_crossing` presence does not mean the crossing is currently open, safe, or unchanged since the last OSM edit.
- This review does not approve runtime production OSM integration.
- OSM data must not be used to automatically promote Datakam candidates to `VerifiedRoadEvent`.
- This document is not legal advice on ODbL licensing.

## Related

- #9 — Research OSM road metadata and compare against Datakam candidates
- `docs/research/datakam-speedcam-format-and-route-qa.md`
- `docs/research/datakam-manual-visual-validation.md`
- `docs/research/datakam-manual-qa-status-semantics.md`
- `docs/research/datakam-road-bump-direction-semantics.md`
- `docs/research/driver-helper-gibdd-camera-map-source-review.md`
- `web/datakam-viewer/`
