# Datakam manual QA status semantics

## Status

Research / WIP note for the local Datakam QA Viewer.

This note defines lightweight manual QA statuses for individual Datakam/OpenSpeedcam candidate rows.

This is **not Canon** and does not define trusted product road-event data.

## Scope

The statuses in this note apply to Datakam/OpenSpeedcam rows treated as `ExternalObservation` candidates.

They are intended for small manual visual checks of representative points, especially along familiar routes such as Yaroslavl-Moscow.

They are not statistical validation, field verification, or product-ready driver-facing confirmation UX.

## Visual QA status

`unknown`

No visual judgement has been recorded.

`looks_correct`

The candidate object appears plausible during visual inspection. This can mean that the marker is near a remembered sign, camera, road bump, railway crossing-like hazard, or other expected road object.

This does not mean the object is verified.

`wrong`

The candidate object appears wrong during visual inspection. Examples: the type looks incorrect, the location is clearly off, or the object appears absent where the source claims it exists.

`needs_drive`

Visual inspection is insufficient. The point should be checked during a future drive or with better evidence.

`missing_here`

Reserved for a later manual marker workflow where the user records that a known object is missing from the source near this area.

For the current viewer slice, this value can exist as a status option, but it is not yet a full missing-point capture workflow.

## Direction-semantics status

`unknown`

No interpretation has been recorded.

`likely_vehicle_travel_direction`

The source `DIRECTION` value appears to represent the direction of vehicle travel for which the observation applies.

`likely_camera_or_sign_facing_direction`

The source `DIRECTION` value appears to represent the direction the camera or sign is facing, not necessarily the direction of applicable vehicle travel.

`opposite_of_vehicle_direction`

The source `DIRECTION` value appears to be opposite of the applicable vehicle travel direction.

`unclear_or_wrong`

The source direction is unclear, inconsistent, or appears wrong.

## Direction-semantics observation note

Based on manual inspection of a small number of examples along the Yaroslavl-Moscow route, the source `DIRECTION` field appears to represent the direction the camera or sign faces, which is often opposite to the applicable vehicle travel direction.

This is **not a proven global rule** — it is a working hypothesis based on a limited sample. Every point should be evaluated individually using the direction-semantics status field. Do not assume this pattern holds globally without further validation.

The per-marker popup in the viewer includes a hint reflecting this observation.

## Direction-arrow display

The viewer visualizes raw source direction fields only:

- `DIRTYPE=1` displays one arrow using `DIRECTION`.
- `DIRTYPE=2` displays two opposite arrows using `DIRECTION` and `DIRECTION + 180°`.

The arrow visualization does not prove what the source direction means. It exists to help the user compare source direction against road geometry and known objects.

## Data posture

Manual QA records exported by the viewer should be read as:

```text
Datakam/OpenSpeedcam row
  -> ExternalObservation candidate
  -> manual visual QA note
  -> future field/manual review
  -> VerifiedRoadEvent only after explicit promotion in a later workflow
```

Do not use these statuses to automatically promote external rows to `VerifiedRoadEvent`.

## Persistence

For the current implementation, manual QA records are local to the browser:

- saved in `localStorage` under key `roadahead.datakamViewer.manualQa.v1`;
- exportable as JSON via the Export QA JSON button in the sidebar;
- records persist across page reloads; reopening the same marker after reload shows previously saved selections;
- not synced;
- not committed with raw source data.

Raw Datakam files remain local and ignored by git.

## Default view

The viewer defaults to showing only points inside the Moscow-Yaroslavl ellipse on load. The "Show all parsed points" option is available but not the default, to avoid rendering tens of thousands of points globally at startup.
