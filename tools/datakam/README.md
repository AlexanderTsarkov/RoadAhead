# Datakam tooling

Small read-only helpers for local Datakam / OpenSpeedcam text exports.

## `inspect_speedcam.py`

Summarizes `IDX,X,Y,TYPE,SPEED,DIRTYPE,DIRECTION` rows. Inline text after `//` on any line is ignored.

**Default input (run from repo root):** `data/raw/datakam/speedcam.txt`

```bash
python3 tools/datakam/inspect_speedcam.py
python3 tools/datakam/inspect_speedcam.py path/to/other.txt
python3 tools/datakam/inspect_speedcam.py --bbox 23.5,51.9,32.8,56.2
```

The script prints statistics only; it does not write files.

### TYPE column (normalized meanings)

The inspector maps numeric `TYPE` codes to short labels (best-effort). Any code not listed below is reported with meaning **`unknown`** and called out under **unknown TYPE codes**.

| TYPE | Meaning |
|-----:|---------|
| 1 | `static_camera` |
| 2 | `traffic_light_camera` |
| 3 | `red_light_camera` |
| 4 | `average_speed_camera` |
| 5 | `mobile_camera` |
| 100 | `pedestrian_crossing` |
| 101 | `speed_limit` |
| 102 | `speed_bump` |
| 103 | `bad_road` |
| 104 | `dangerous_turn` |
| 105 | `dangerous_intersection` |
| 106 | `other_danger` |

### Output: TYPE summary

After basic line counts, the script prints a **TYPE summary** section:

- **distinct TYPE values** — how many different `TYPE` codes appear in valid rows.
- **known TYPE values** — how many of those codes have a mapping above.
- **unknown TYPE values** — how many distinct codes are unmapped; if any, **unknown TYPE codes** lists them.
- A **table** (sorted numerically by `TYPE`): `TYPE | meaning | count | percent` where `percent` is share of valid rows.

Other sections (SPEED, DIRTYPE, sample rows, optional bbox) follow for deeper QA.

Raw speedcam exports are git-ignored — do not commit them.
