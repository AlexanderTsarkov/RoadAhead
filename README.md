# RoadAhead

RoadAhead is an early-stage product and engineering prototype for an overlay assistant for anticipatory road understanding.

It is **not a navigator** and **not an anti-radar**. The goal is to help a driver understand what is coming ahead on the road before the situation changes: speed-limit changes, settlements, cameras, hazardous road segments, poor road surface, and hard-to-see signs.

## Core idea

Modern navigation apps usually show the current speed limit and warn about cameras, but they often do not warn early enough about upcoming speed-regime changes. On many Russian highways, especially roads passing through settlements, the driving pattern can quickly shift between limits such as:

```text
110 -> 90 -> 60 -> 90 -> 70 -> 60 -> 70 -> 90 -> 110
```

RoadAhead focuses on the road ahead, not only the current point. It should help the driver plan speed changes smoothly instead of reacting late or braking sharply.

## Product positioning

> Not a navigator. Not an anti-radar. An overlay assistant for anticipatory road understanding.

Russian positioning:

> Не навигатор. Не антирадар. Overlay-ассистент упреждающего понимания дороги.

## Initial product direction

The first useful version is expected to be a personal Android overlay assistant that can run on top of existing navigation apps such as Yandex Navigator or Yandex Maps.

The app should eventually support:

- recording GPS tracks during a drive;
- placing quick raw road markers while driving;
- reviewing and correcting those markers later on a map;
- building a personal verified road-event layer;
- warning the driver in advance about upcoming road events.

## Road-event layer

RoadAhead treats external and personal road information as road events, for example:

- speed-limit change;
- settlement start or end;
- speed camera;
- average-speed control zone;
- dangerous road segment;
- poor road surface;
- hard-to-see sign;
- manually recommended safe speed where the formal limit is too high for actual road conditions.

Important distinction:

- **Formal speed limit**: what the sign legally says.
- **Recommended safe speed**: what is reasonable for the specific road segment.
- **Camera**: enforcement object.
- **Hazard**: road condition or situation requiring caution.

These are related, but they are not the same thing.

## First technical milestone

The first milestone is deliberately small:

**MVP-001: Datakam regional web viewer**

Goal:

> Load a Datakam/OpenSpeedcam-style `speedcam` file, filter it to a familiar region, and visualize road-event candidates on a web map for manual visual QA.

This milestone is about evaluating whether external road-event data can accelerate creation of a personal verified road-event layer.

It is not yet about Android overlay development, routing, navigation, accounts, backend, or crowdsourcing.

## Data policy

External data sources are treated as **candidates**, not truth.

Canonical pipeline:

```text
External source
  -> ExternalObservation
  -> manual / visual / field verification
  -> VerifiedRoadEvent
  -> warning layer
```

Full external datasets and private GPS tracks should not be committed to the repository unless explicitly approved. Raw data should remain local/private by default.

## Current status

Project bootstrap phase.

The immediate next steps are:

1. Add AI/Cursor operating instructions in `CLAUDE.md`.
2. Add `.gitignore` for local/private data.
3. Add initial documentation structure.
4. Build the first Datakam regional web viewer.
