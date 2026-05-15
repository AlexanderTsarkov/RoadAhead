# Datakam manual visual validation

## Status

Research note for source-level validation of Datakam/OpenSpeedcam candidate data.

This document records a manual visual comparison performed by the user on well-known road sections, primarily along the Yaroslavl-Moscow route and familiar local areas.

This is **Research**, not Canon.

This document does **not** verify individual points as trusted RoadAhead events. It only records the current confidence level in Datakam/OpenSpeedcam as an external candidate data source.

## Validation level

Validation level: **source-level visual plausibility check**.

Meaning:

- The user compared Datakam/OpenSpeedcam points against roads and places they know well.
- The comparison was performed visually in the local Datakam QA Viewer.
- The goal was to decide whether the source looks useful enough to continue using as an `ExternalObservation` candidate layer.

Non-meaning:

- This is not point-by-point verification.
- This is not field confirmation from a new drive.
- This does not promote Datakam/OpenSpeedcam data to `VerifiedRoadEvent` truth.
- This does not mean warnings may rely on the source without further validation.

## User observations

The user manually inspected the Datakam/OpenSpeedcam data on well-known sections of the Yaroslavl-Moscow route.

Observed:

- **Speed-limit signs / speed-limit points** look sufficiently close to reality. Where the user clearly remembers signs, corresponding points appear to be present.
- **Cameras** also look sufficiently close to reality. Known camera locations are represented in the data.
- **Road bumps** also look plausible and appear where expected.
- **Pedestrian crossings** appear to be present mostly in Moscow; in Yaroslavl they appear sparse or absent in the inspected areas.
- **Other danger** points often appear to correspond to railway crossings in the inspected areas.
- At higher zoom levels, many markers appear to be placed on the correct side of the road, which is important for future direction-aware warning logic.

## Interpretation

The current visual check materially increases confidence that Datakam/OpenSpeedcam can be used as a useful `ExternalObservation` source for RoadAhead.

The most promising candidate categories for the early product loop are:

- speed-limit changes / speed-limit points;
- cameras;
- road bumps / physical slowdown points;
- railway-crossing-like hazards represented as `other_danger` in the inspected area.

The source still remains candidate data. It should be used to accelerate visual QA and future field validation, not as a direct trusted warning layer.

## Practical implication for RoadAhead

Datakam/OpenSpeedcam is currently considered:

```text
usable as candidate data: yes
usable as verified truth: no
usable for visual QA workflow: yes
usable for automatic RoadEvent creation: no
```

Recommended next product/data posture:

```text
Datakam/OpenSpeedcam row
  -> ExternalObservation
  -> visual/manual/field validation
  -> VerifiedRoadEvent only after explicit verification
```

## Open questions

1. Does `TYPE=106` consistently map to railway crossings in the inspected region, or only in the examples checked so far?
2. Why are pedestrian crossings visible mostly in Moscow but sparse or absent in Yaroslavl?
3. Are marker coordinates intentionally placed on the applicable side of the road, or is this an artifact of the source/editor workflow?
4. Does the source `DIRECTION` value represent vehicle travel direction, camera facing direction, or another source-specific convention?
5. Which event types should be enabled by default in the QA viewer?
6. What is the right workflow for marking individual points as `looks_correct`, `wrong`, or `needs_drive` without pretending they are already verified RoadEvents?

## Suggested follow-up

A future viewer slice should support lightweight visual QA statuses, for example:

```text
unknown
looks_correct
wrong
needs_drive
missing_here
```

These statuses should apply to `ExternalObservation` records, not directly to trusted RoadAhead events.

A later field-validation workflow can then promote selected observations into verified product data.

## Related files

- `docs/research/datakam-speedcam-format-and-route-qa.md`
- `tools/datakam/inspect_speedcam.py`
- `web/datakam-viewer/`

## Related issue

- #6 — RA-0005: Record manual visual validation of Datakam candidate data
