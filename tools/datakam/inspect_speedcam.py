#!/usr/bin/env python3
"""Inspect Datakam / OpenSpeedcam-style text files (read-only, stdout only)."""

from __future__ import annotations

import argparse
import sys
from collections import Counter
from pathlib import Path


DEFAULT_INPUT = Path("data/raw/datakam/speedcam.txt")
SAMPLE_VALID_ROWS = 5

# Normalized meanings for Datakam/OpenSpeedcam TYPE codes (best-effort; unmapped → unknown).
TYPE_MEANINGS: dict[int, str] = {
    1: "static_camera",
    2: "traffic_light_camera",
    3: "red_light_camera",
    4: "average_speed_camera",
    5: "mobile_camera",
    100: "pedestrian_crossing",
    101: "speed_limit",
    102: "speed_bump",
    103: "bad_road",
    104: "dangerous_turn",
    105: "dangerous_intersection",
    106: "other_danger",
}


def strip_line_comment(line: str) -> str:
    idx = line.find("//")
    if idx != -1:
        line = line[:idx]
    return line.strip()


def parse_row(line: str) -> tuple[int, float, float, int, int, int, int] | None:
    parts = [p.strip() for p in line.split(",")]
    if len(parts) != 7:
        return None
    idx_s, x_s, y_s, type_s, speed_s, dirtype_s, direction_s = parts
    try:
        row_id = int(idx_s)
        lon = float(x_s)
        lat = float(y_s)
        type_ = int(type_s)
        speed = int(speed_s)
        dirtype = int(dirtype_s)
        direction = int(direction_s)
    except ValueError:
        return None
    return row_id, lon, lat, type_, speed, dirtype, direction


def parse_bbox(spec: str) -> tuple[float, float, float, float]:
    parts = spec.split(",")
    if len(parts) != 4:
        raise argparse.ArgumentTypeError(
            "bbox must be minLon,minLat,maxLon,maxLat (four comma-separated numbers)"
        )
    try:
        min_lon, min_lat, max_lon, max_lat = (float(p.strip()) for p in parts)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("bbox values must be numeric") from exc
    if min_lon > max_lon or min_lat > max_lat:
        raise argparse.ArgumentTypeError(
            "bbox requires minLon <= maxLon and minLat <= maxLat"
        )
    return min_lon, min_lat, max_lon, max_lat


def in_bbox(
    lon: float,
    lat: float,
    bbox: tuple[float, float, float, float],
) -> bool:
    min_lon, min_lat, max_lon, max_lat = bbox
    return min_lon <= lon <= max_lon and min_lat <= lat <= max_lat


def type_label(t: int) -> str:
    return TYPE_MEANINGS.get(t, "unknown")


def print_type_summary(by_type: Counter[int], parsed: int) -> None:
    if parsed == 0:
        print("TYPE summary:")
        print("  distinct TYPE values: 0")
        print("  known TYPE values: 0")
        print("  unknown TYPE values: 0")
        print()
        print(f"{'TYPE':>6} | {'meaning':<25} | {'count':>10} | {'percent':>8}")
        print(f"{'':->6} | {'':->25} | {'':->10} | {'':->8}")
        print()
        return

    distinct_codes = sorted(by_type)
    known_distinct = [t for t in distinct_codes if t in TYPE_MEANINGS]
    unknown_distinct = [t for t in distinct_codes if t not in TYPE_MEANINGS]

    print("TYPE summary:")
    print(f"  distinct TYPE values: {len(distinct_codes)}")
    print(f"  known TYPE values: {len(known_distinct)}")
    print(f"  unknown TYPE values: {len(unknown_distinct)}")
    if unknown_distinct:
        codes = ", ".join(str(t) for t in unknown_distinct)
        print(f"  unknown TYPE codes: {codes}")
    print()

    col_type_w = max(6, max(len(str(t)) for t in distinct_codes))
    meanings = [type_label(t) for t in distinct_codes]
    col_mean_w = max(len("meaning"), max(len(m) for m in meanings))
    col_count_w = max(len("count"), len(str(max(by_type.values(), default=0))))

    header = (
        f"{'TYPE':>{col_type_w}} | "
        f"{'meaning':<{col_mean_w}} | "
        f"{'count':>{col_count_w}} | "
        f"{'percent':>8}"
    )
    rule = (
        f"{'-' * col_type_w} | "
        f"{'-' * col_mean_w} | "
        f"{'-' * col_count_w} | "
        f"{'-' * 8}"
    )
    print(header)
    print(rule)

    for t in distinct_codes:
        count = by_type[t]
        pct = 100.0 * count / parsed
        meaning = type_label(t)
        print(
            f"{t:>{col_type_w}} | "
            f"{meaning:<{col_mean_w}} | "
            f"{count:>{col_count_w}} | "
            f"{pct:7.2f}%"
        )
    print()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Summarize a Datakam / OpenSpeedcam speedcam text file."
    )
    parser.add_argument(
        "input",
        nargs="?",
        type=Path,
        default=DEFAULT_INPUT,
        help=f"path to speedcam file (default: {DEFAULT_INPUT})",
    )
    parser.add_argument(
        "--bbox",
        type=parse_bbox,
        metavar="minLon,minLat,maxLon,maxLat",
        help="optional bounding box; count rows whose (lon, lat) fall inside",
    )
    args = parser.parse_args()

    path: Path = args.input
    if not path.is_file():
        print(f"error: file not found: {path}", file=sys.stderr)
        return 1

    total_physical = 0
    parsed = 0
    skipped = 0
    by_type: Counter[int] = Counter()
    by_speed: Counter[int] = Counter()
    by_dirtype: Counter[int] = Counter()
    bbox = args.bbox
    in_bbox_count = 0

    min_lon = min_lat = float("inf")
    max_lon = max_lat = float("-inf")

    samples: list[tuple[int, float, float, int, int, int, int]] = []

    with path.open(encoding="utf-8", errors="replace", newline="") as f:
        for raw in f:
            total_physical += 1
            line = strip_line_comment(raw)
            if not line:
                skipped += 1
                continue
            row = parse_row(line)
            if row is None:
                skipped += 1
                continue

            _rid, lon, lat, type_, speed, dirtype, direction = row
            parsed += 1
            by_type[type_] += 1
            by_speed[speed] += 1
            by_dirtype[dirtype] += 1
            min_lon = min(min_lon, lon)
            max_lon = max(max_lon, lon)
            min_lat = min(min_lat, lat)
            max_lat = max(max_lat, lat)
            if bbox is not None and in_bbox(lon, lat, bbox):
                in_bbox_count += 1
            if len(samples) < SAMPLE_VALID_ROWS:
                samples.append(row)

    print(f"File: {path.resolve()}")
    print(f"Total physical lines: {total_physical}")
    print(f"Parsed valid rows: {parsed}")
    print(f"Skipped / invalid rows: {skipped}")
    print()

    print_type_summary(by_type, parsed)

    if parsed:
        print(f"Longitude min/max: {min_lon:.6f} / {max_lon:.6f}")
        print(f"Latitude min/max: {min_lat:.6f} / {max_lat:.6f}")
    else:
        print("Longitude min/max: (no valid rows)")
        print("Latitude min/max: (no valid rows)")
    print()

    print("Count by SPEED:")
    for k in sorted(by_speed):
        print(f"  {k}: {by_speed[k]}")
    print()

    print("Count by DIRTYPE:")
    for k in sorted(by_dirtype):
        print(f"  {k}: {by_dirtype[k]}")
    print()

    print(f"Sample rows (first {len(samples)} valid):")
    for row in samples:
        rid, lon, lat, type_, speed, dirtype, direction = row
        print(
            f"  IDX={rid} lon={lon:.6f} lat={lat:.6f} "
            f"TYPE={type_} SPEED={speed} DIRTYPE={dirtype} DIRECTION={direction}"
        )
    print()

    if bbox is not None:
        min_lo, min_la, max_lo, max_la = bbox
        print(
            "Bbox filter: "
            f"[{min_lo}, {min_la}] — [{max_lo}, {max_la}] "
            f"(minLon, minLat — maxLon, maxLat)"
        )
        print(f"Rows inside bbox: {in_bbox_count}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
