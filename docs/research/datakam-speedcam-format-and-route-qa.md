# Datakam / OpenSpeedcam format and Moscow-Yaroslavl route QA

## Status

Research note for the current RoadAhead bootstrap/data QA iteration.

This document captures observed facts from the local Datakam/OpenSpeedcam `speedcam.txt` file and the first route-shaped QA pass for the Moscow-Yaroslavl corridor.

This is **Research**, not Canon.

External data is treated as candidate input only. Nothing in this file promotes Datakam/OpenSpeedcam data to verified RoadAhead truth.

## Source file

Local ignored file path:

```text
data/raw/datakam/speedcam.txt
```

The file is not committed to git and should remain local by default.

Observed source header:

```text
IDX,X,Y,TYPE,SPEED,DIRTYPE,DIRECTION // OpenSpeedcam 10-03-2026 11:33
```

Example rows:

```text
177,27.826138,54.185782,101,60,1,207
178,27.823847,54.205898,101,60,1,318
179,27.852096,54.207138,102,40,2,171
```

## Parsed field assumptions

Current parser assumptions:

| Field | Meaning |
|---|---|
| `IDX` | Source row/object id |
| `X` | Longitude |
| `Y` | Latitude |
| `TYPE` | Source event type |
| `SPEED` | Source speed value |
| `DIRTYPE` | Direction mode |
| `DIRECTION` | Direction angle in degrees |

Important: `X` is treated as longitude and `Y` as latitude.

## Full-file inspection summary

Local command used:

```bash
python3 tools/datakam/inspect_speedcam.py
```

Observed summary:

| Metric | Value |
|---|---:|
| Total physical lines | 244,608 |
| Parsed valid rows | 244,607 |
| Skipped / invalid rows | 1 |
| Longitude min | 19.902451 |
| Longitude max | 177.511500 |
| Latitude min | 39.388506 |
| Latitude max | 69.540090 |
| Distinct TYPE values | 11 |
| Known TYPE values | 11 |
| Unknown TYPE values | 0 |

The only skipped/invalid row is the header line.

## TYPE mapping used by the inspector

| TYPE | Normalized meaning |
|---:|---|
| 1 | static_camera |
| 2 | traffic_light_camera |
| 3 | red_light_camera |
| 4 | average_speed_camera |
| 5 | mobile_camera |
| 100 | pedestrian_crossing |
| 101 | speed_limit |
| 102 | speed_bump |
| 103 | bad_road |
| 104 | dangerous_turn |
| 105 | dangerous_intersection |
| 106 | other_danger |

## Full-file TYPE summary

Percentages are shares of the 244,607 parsed valid rows.

| TYPE | Meaning | Count | Percent |
|---:|---|---:|---:|
| 1 | static_camera | 66,188 | 27.06% |
| 3 | red_light_camera | 12,739 | 5.21% |
| 4 | average_speed_camera | 143 | 0.06% |
| 5 | mobile_camera | 2 | 0.00% |
| 100 | pedestrian_crossing | 16,884 | 6.90% |
| 101 | speed_limit | 47,938 | 19.60% |
| 102 | speed_bump | 56,267 | 23.00% |
| 103 | bad_road | 9,066 | 3.71% |
| 104 | dangerous_turn | 17,745 | 7.25% |
| 105 | dangerous_intersection | 3,926 | 1.61% |
| 106 | other_danger | 13,709 | 5.60% |

Derived high-level grouping:

| Group | TYPEs | Count | Approx. share |
|---|---|---:|---:|
| Camera / enforcement-like | 1, 3, 4, 5 | 79,072 | 32.33% |
| Road-ahead / caution-like | 100, 101, 102, 103, 104, 105, 106 | 165,535 | 67.67% |

Initial interpretation: the file is not only a camera database. It contains a large road-ahead/caution layer that may be useful for RoadAhead candidate-event workflows.

## Moscow-Yaroslavl route-shaped QA filter

A rotated ellipse filter was added to inspect a route-shaped region around the frequently driven Moscow-Yaroslavl corridor.

Command used:

```bash
python3 tools/datakam/inspect_speedcam.py --ellipse 38.75,56.70,300,80,35
```

Ellipse parameters:

| Parameter | Value |
|---|---:|
| centerLon | 38.75 |
| centerLat | 56.70 |
| majorAxisKm | 300 |
| minorAxisKm | 80 |
| bearingDeg | 35 |

Interpretation:

- `majorAxisKm` and `minorAxisKm` are full axis lengths.
- Semi-axes are half of those values.
- `bearingDeg` is clockwise from north.
- The filter uses an approximate equirectangular local projection around `centerLat`.
- This is a QA approximation, not exact route matching.

Combined bbox + ellipse command also tested:

```bash
python3 tools/datakam/inspect_speedcam.py --bbox 37.0,55.4,40.5,58.0 --ellipse 38.75,56.70,300,80,35
```

Observed result:

| Filter | Rows |
|---|---:|
| bbox only | 27,373 |
| ellipse only | 16,484 |
| bbox ∩ ellipse | 16,484 |

For these parameters, the ellipse is fully inside the tested bbox.

## Moscow-Yaroslavl ellipse TYPE summary

Percentages are shares of the 16,484 filtered rows.

| TYPE | Meaning | Count | Percent |
|---:|---|---:|---:|
| 1 | static_camera | 5,627 | 34.14% |
| 3 | red_light_camera | 877 | 5.32% |
| 100 | pedestrian_crossing | 945 | 5.73% |
| 101 | speed_limit | 1,018 | 6.18% |
| 102 | speed_bump | 6,532 | 39.63% |
| 103 | bad_road | 257 | 1.56% |
| 104 | dangerous_turn | 602 | 3.65% |
| 105 | dangerous_intersection | 189 | 1.15% |
| 106 | other_danger | 437 | 2.65% |

Unknown TYPE values inside the ellipse: none.

## Initial observations

1. The Moscow-Yaroslavl ellipse contains 16,484 candidate events, enough to justify visual QA.
2. The source has a substantial number of road-ahead event types, not only cameras.
3. `TYPE=102` / `speed_bump` is very dense in the ellipse: 6,532 rows, or 39.63% of filtered rows. This may be accurate in settlements, may indicate a broad type interpretation, or may be source noise.
4. `TYPE=101` / `speed_limit` appears in the route-shaped region: 1,018 rows. This is especially relevant to RoadAhead’s early product hypothesis.
5. Directional fields are present in the source and must be treated carefully before being used for warning behavior.
6. The route-shaped ellipse is better than a broad bbox for first-pass QA, but it is not a replacement for a precise route corridor or GPS-track corridor.

## Open questions

1. What exactly does `DIRECTION` mean in this source: vehicle travel direction, camera facing direction, or source-specific convention?
2. Does `DIRTYPE=1` mean one-direction applicability and `DIRTYPE=2` mean bidirectional applicability in this specific file?
3. Is `TYPE=102` always a speed bump, or does the source use it for a broader class of physical slowdown objects?
4. How accurate are `TYPE=101` speed-limit points against real signs on the Moscow-Yaroslavl route?
5. What are the license and redistribution constraints for Datakam/OpenSpeedcam-derived data?
6. Should the first web viewer display all candidate types or start with a limited set: cameras, speed limits, hazards?
7. Should future filtering use a user-recorded GPS track corridor rather than an ellipse?

## Recommendation

Proceed to a local web viewer for visual QA, but keep all Datakam/OpenSpeedcam rows as `ExternalObservation` / candidate data only.

Suggested next implementation slice:

- Load local `speedcam.txt` or a generated filtered subset.
- Apply bbox and/or ellipse filtering.
- Render candidate points on a map.
- Color by normalized TYPE.
- Show raw fields in popup.
- Show direction indicators where `DIRTYPE` / `DIRECTION` are present.
- Do not create verified RoadEvents from this source automatically.

## Canonical data posture

Current posture remains:

```text
ExternalSource
  -> ExternalObservation
  -> manual / visual / field verification
  -> VerifiedRoadEvent
  -> warning layer
```

This document supports the `ExternalSource -> ExternalObservation` part only.
