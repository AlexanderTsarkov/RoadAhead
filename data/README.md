# Data directory

This directory is for local input data, generated data, and private driving data used by RoadAhead experiments.

## Policy

Raw external datasets, generated processed datasets, and private GPS/trip data must stay local by default and must not be committed unless explicitly approved.

The repository tracks only `.gitkeep` placeholders and documentation.

## Layout

```text
data/
  raw/         local source files from external providers; ignored by git
  processed/   generated outputs such as filtered GeoJSON; ignored by git
  private/     personal GPS tracks, trip logs, notes; ignored by git
```

## Datakam / OpenSpeedcam input

Put the downloaded Datakam/OpenSpeedcam text file here locally:

```text
data/raw/datakam/speedcam.txt
```

Expected format:

```text
IDX,X,Y,TYPE,SPEED,DIRTYPE,DIRECTION // OpenSpeedcam <date>
177,27.826138,54.185782,101,60,1,207
```

Field notes:

- `X` is longitude.
- `Y` is latitude.
- `TYPE` is the source event type.
- `SPEED` is the source speed value.
- `DIRTYPE` is the direction mode.
- `DIRECTION` is the direction angle in degrees.

The raw file should remain untracked. Use a small sample file under `sample-data/` if a committed example is needed.
