# Datakam road_bump direction and coordinate-overlap audit

## Status

Research note. Source-level validation. Not Canon.

## Context

During manual QA for issues #10 and #11, `TYPE=102` road_bump points displayed bidirectional arrows in the viewer. This raised the question of whether the bidirectional visual behaviour is explained primarily by:

1. `DIRTYPE=2` — a single observation encoded as bidirectional in the source; or
2. multiple `TYPE=102` rows sharing identical or near-identical coordinates (stacked markers that appear as one combined icon); or
3. both.

This note records the results of a structured numerical audit of the local raw source file.

## Data source

- Local ignored file: `data/raw/datakam/speedcam.txt`
- Raw data is not committed; it remains local-only per repo policy
- Source header: `IDX,X,Y,TYPE,SPEED,DIRTYPE,DIRECTION // OpenSpeedcam 10-03-2026 11:33`
- Audit date: 2026-05-15
- Parser assumptions: `X` = longitude, `Y` = latitude; fields must parse as `int,float,float,int,int,int,int`; header and malformed lines are skipped

## Method

**TYPE=102 filtering**
All rows where `TYPE=102` were extracted. Rows where parsing failed or the header line were excluded.

**DIRTYPE distribution**
Counted `DIRTYPE` values across all `TYPE=102` rows and across the ellipse subset.

**DIRECTION distribution**
Counted distinct `DIRECTION` values and top repeated values across all `TYPE=102` rows and the `DIRTYPE=2` subset. Checked whether `DIRTYPE=2` rows carry specific non-trivial `DIRECTION` values or default ones.

**Exact coordinate grouping**
Grouped `TYPE=102` rows by exact `(lon, lat)` float equality. Reported unique pair count, duplicate group count, size distribution, and representative examples.

**Near-coordinate grouping**
Grouped `TYPE=102` rows by `(round(lon, N), round(lat, N))` for N = 6 and N = 5 decimal places.

- 6 decimal places ≈ ±0.11 m positional tolerance at equator (sub-meter; effectively the same point)
- 5 decimal places ≈ ±1.1 m positional tolerance at equator

**Ellipse subset**
Used the same rotated-ellipse formula as `web/datakam-viewer/src/ellipseFilter.ts` and `tools/datakam/inspect_speedcam.py`:

- centerLon: 38.75, centerLat: 56.70
- majorAxisKm: 300, minorAxisKm: 80
- bearingDeg: 35° (clockwise from north)
- Equirectangular local km projection at center latitude; semi-axes = full axis / 2

The Python audit script was run locally as a temporary untracked scratch file (`/tmp/road_bump_audit.py`). It is not committed.

## Results

### Basic counts

| Metric | Value |
|---|---:|
| Total physical lines | 244,608 |
| Total parsed valid rows | 244,607 |
| TYPE=102 road\_bump rows | 56,267 |
| road\_bump % of all rows | 23.00% |

### DIRTYPE distribution (all TYPE=102)

| DIRTYPE | Count | % of road\_bump |
|---:|---:|---:|
| 0 | 20 | 0.04% |
| 1 | 23,563 | 41.88% |
| 2 | 32,684 | 58.09% |

`DIRTYPE=2` is the majority form of road\_bump encoding: **58.09%** of all road\_bump rows are bidirectional by source definition. `DIRTYPE=0` is anomalous (20 rows; meaning unclear).

### DIRECTION distribution (all TYPE=102)

All 360 integer degree values appear in the data. No single dominant direction; values are distributed across all headings, consistent with real road geometry. Top 10:

| DIRECTION | Count | % |
|---:|---:|---:|
| 1 | 605 | 1.08% |
| 90 | 366 | 0.65% |
| 270 | 320 | 0.57% |
| 89 | 302 | 0.54% |
| 180 | 278 | 0.49% |
| 271 | 263 | 0.47% |
| 88 | 259 | 0.46% |
| 105 | 244 | 0.43% |
| 91 | 238 | 0.42% |
| 87 | 220 | 0.39% |

**DIRTYPE=2 rows carry specific, non-trivial DIRECTION values** (all 360 degrees appear among the 32,684 DIRTYPE=2 rows). This is consistent with single bidirectional observations pointing in a meaningful geographic direction, not a default or null value.

SPEED distribution across TYPE=102:

| SPEED | Count | % |
|---:|---:|---:|
| 10 | 1,559 | 2.77% |
| 20 | 38,951 | 69.23% |
| 30 | 7,312 | 13.00% |
| 40 | 7,771 | 13.81% |
| 50–100 | 674 | 1.19% |

### Exact coordinate duplicate groups (all TYPE=102)

| Metric | Value |
|---|---:|
| Unique (lon, lat) pairs | 56,260 |
| Coordinate pairs with exactly 1 row | 56,253 |
| Coordinate pairs with >1 row (dup groups) | **7** |
| Total rows in duplicate groups | **14** |
| % of road\_bump rows in dup groups | **0.02%** |

All 7 exact duplicate groups have exactly 2 rows each. Representative examples:

| lon | lat | IDX A | DIRTYPE A | DIR A | IDX B | DIRTYPE B | DIR B |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 51.458220 | 51.235850 | 306091 | 1 | 276 | 316977 | 1 | 96 |
| 69.267330 | 53.325930 | 310374 | 1 | 25 | 317289 | 1 | 205 |
| 71.377010 | 42.890860 | 310437 | 1 | 66 | 310446 | 1 | 246 |
| 71.373060 | 42.889590 | 310438 | 1 | 65 | 310445 | 1 | 245 |
| 71.370950 | 42.888820 | 310439 | 1 | 62 | 310444 | 1 | 242 |

Notably, in all 7 exact-dup pairs both rows use `DIRTYPE=1`, not `DIRTYPE=2`. The two rows per pair carry roughly opposite `DIRECTION` values, suggesting these may be bidirectional road bumps represented as two `DIRTYPE=1` records rather than one `DIRTYPE=2` record. This is a rare encoding pattern (14 rows total, 0.02%).

### Near-coordinate duplicate groups (all TYPE=102)

| Tolerance | Near-dup groups | Rows in groups | % of road\_bump |
|---|---:|---:|---:|
| 6 decimal places (≈ 0.11 m) | 7 | 14 | 0.02% |
| 5 decimal places (≈ 1.1 m) | 12 | 24 | 0.04% |

At 6 decimal places, results are identical to exact matching. At 5 decimal places, 5 additional near-duplicate pairs appear (10 additional rows beyond the 14 exact matches). These are distinct (lon, lat) values within ~1 m of each other. This is negligibly rare.

### Ellipse subset (Moscow-Yaroslavl, TYPE=102)

Ellipse parameters: centerLon=38.75, centerLat=56.70, major=300 km, minor=80 km, bearing=35°.

| Metric | Value |
|---|---:|
| TYPE=102 rows inside ellipse | 6,532 |
| DIRTYPE=1 | 2,716 (41.58%) |
| DIRTYPE=2 | 3,816 (58.42%) |
| Exact coordinate dup groups | **0** |
| Exact dup rows | **0** |
| 6-decimal near-dup groups | 0 |
| 5-decimal near-dup groups | 1 |
| 5-decimal near-dup rows | 2 (0.03%) |

Inside the Moscow-Yaroslavl ellipse there are **zero exact coordinate duplicates** and effectively zero near-coordinate duplicates (one pair at 1.1 m tolerance; 0.03%). All bidirectional road\_bump display in this region is explained entirely by `DIRTYPE=2`.

Sample rows from inside ellipse (first 10, file order):

```
IDX=107  lon=37.764274 lat=55.664768 SPEED=20 DIRTYPE=1 DIRECTION=55
IDX=108  lon=37.763921 lat=55.664568 SPEED=60 DIRTYPE=1 DIRECTION=236
IDX=109  lon=37.760975 lat=55.664090 SPEED=20 DIRTYPE=1 DIRECTION=55
IDX=110  lon=37.758707 lat=55.663201 SPEED=20 DIRTYPE=1 DIRECTION=55
IDX=127  lon=37.350806 lat=55.844080 SPEED=20 DIRTYPE=1 DIRECTION=133
IDX=128  lon=37.350447 lat=55.844164 SPEED=20 DIRTYPE=1 DIRECTION=311
IDX=162  lon=37.772584 lat=55.656050 SPEED=20 DIRTYPE=1 DIRECTION=146
IDX=164  lon=37.771624 lat=55.656850 SPEED=20 DIRTYPE=1 DIRECTION=145
IDX=165  lon=37.771549 lat=55.656817 SPEED=20 DIRTYPE=1 DIRECTION=326
IDX=167  lon=37.772493 lat=55.656013 SPEED=20 DIRTYPE=1 DIRECTION=326
```

## Interpretation

**Is bidirectional road\_bump behaviour mainly explained by DIRTYPE=2?**

Yes. **58.09%** of all `TYPE=102` rows globally and **58.42%** in the Moscow-Yaroslavl ellipse carry `DIRTYPE=2`. The viewer correctly renders two opposite arrows for these rows (`DIRECTION` and `DIRECTION + 180°`). This single source encoding is the complete explanation for bidirectional arrow display in the QA viewer.

**Are exact same-coordinate duplicate rows common?**

No. Only 7 exact duplicate coordinate pairs exist across the entire file (14 rows, 0.02% of road\_bump). These are a minor edge case. Inside the Moscow-Yaroslavl ellipse there are zero.

**Are near-coordinate duplicates materially different from exact duplicates?**

No. Near-coordinate grouping at 6 decimal places (≈ 0.11 m) produces the same 7 groups as exact matching. At 5 decimal places (≈ 1.1 m), 5 additional pairs appear (0.04% total). These are negligible in scale and do not change the interpretation.

**Is stacked-marker viewer UX needed now?**

No. The observed bidirectional arrows are semantically correct source behaviour (`DIRTYPE=2`), not a rendering artefact of overlapping separate rows. The current viewer correctly visualises them.

## Product / viewer implication

`DIRTYPE=2` fully explains bidirectional road\_bump display in the viewer. The current rendering logic (`DIRTYPE=1` → one arrow, `DIRTYPE=2` → two opposite arrows) is semantically correct and requires no change.

The 7 globally exact-duplicate pairs (all outside the Moscow-Yaroslavl ellipse) represent a minor anomaly — bidirectional bumps encoded as two `DIRTYPE=1` records with opposite directions rather than one `DIRTYPE=2` record. This encoding inconsistency is a source-level curiosity and does not affect viewer correctness or require a follow-up issue.

No stacked/overlapping-marker UX issue is needed based on this audit.

## Non-meaning

- This audit is not field verification of individual road\_bump locations.
- These findings are specific to the local `speedcam.txt` file audited. They are not a global proof for all future Datakam files.
- Road\_bump rows remain `ExternalObservation` candidates. They are not promoted to `VerifiedRoadEvent`.
- The `DIRTYPE=0` anomaly (20 rows, 0.04%) is noted but not investigated further here.

## Related

- Issue #10
- Issue #11
- Issue #12 — Investigate Datakam road\_bump coordinate overlap and bidirectional semantics
- `docs/research/datakam-speedcam-format-and-route-qa.md`
- `docs/research/datakam-manual-qa-status-semantics.md`
- `web/datakam-viewer/`
