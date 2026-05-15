#!/usr/bin/env python3
"""Inspect Datakam / OpenSpeedcam-style text files (read-only, stdout only)."""

from __future__ import annotations

import argparse
import math
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path


DEFAULT_INPUT = Path("data/raw/datakam/speedcam.txt")
SAMPLE_VALID_ROWS = 5
SAMPLE_ELLIPSE_ROWS = 10
# Mean Earth radius (km); used for local equirectangular approximation around filter center.
EARTH_RADIUS_KM = 6371.0

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


@dataclass(frozen=True)
class EllipseParams:
    center_lon: float
    center_lat: float
    major_axis_km: float
    minor_axis_km: float
    bearing_deg: float

    @property
    def semi_major_km(self) -> float:
        return self.major_axis_km / 2.0

    @property
    def semi_minor_km(self) -> float:
        return self.minor_axis_km / 2.0


def parse_ellipse(spec: str) -> EllipseParams:
    parts = spec.split(",")
    if len(parts) != 5:
        raise argparse.ArgumentTypeError(
            "ellipse must be "
            "centerLon,centerLat,majorAxisKm,minorAxisKm,bearingDeg "
            "(five comma-separated numbers)"
        )
    try:
        c_lon, c_lat, major_km, minor_km, bearing = (
            float(p.strip()) for p in parts
        )
    except ValueError as exc:
        raise argparse.ArgumentTypeError("ellipse values must be numeric") from exc
    if major_km <= 0 or minor_km <= 0:
        raise argparse.ArgumentTypeError(
            "majorAxisKm and minorAxisKm must be positive (full axis lengths)"
        )
    return EllipseParams(c_lon, c_lat, major_km, minor_km, bearing)


def lonlat_to_local_km(
    lon: float,
    lat: float,
    center_lon: float,
    center_lat: float,
) -> tuple[float, float]:
    """East/north offsets in km (equirectangular approximation at center latitude)."""
    phi0 = math.radians(center_lat)
    lam0 = math.radians(center_lon)
    phi = math.radians(lat)
    lam = math.radians(lon)
    dx = EARTH_RADIUS_KM * math.cos(phi0) * (lam - lam0)
    dy = EARTH_RADIUS_KM * (phi - phi0)
    return dx, dy


def in_ellipse(lon: float, lat: float, ell: EllipseParams) -> bool:
    """
    Rotated ellipse: major axis along bearing_deg (clockwise from north).
    Local X = east km, Y = north km; (along/semiMajor)^2 + (across/semiMinor)^2 <= 1.
    """
    dx, dy = lonlat_to_local_km(lon, lat, ell.center_lon, ell.center_lat)
    b = math.radians(ell.bearing_deg)
    sin_b = math.sin(b)
    cos_b = math.cos(b)
    along = dx * sin_b + dy * cos_b
    across = dx * cos_b - dy * sin_b
    a = ell.semi_major_km
    c = ell.semi_minor_km
    return (along / a) ** 2 + (across / c) ** 2 <= 1.0


def row_matches_filters(
    lon: float,
    lat: float,
    bbox: tuple[float, float, float, float] | None,
    ellipse: EllipseParams | None,
) -> bool:
    if bbox is not None and not in_bbox(lon, lat, bbox):
        return False
    if ellipse is not None and not in_ellipse(lon, lat, ellipse):
        return False
    return True


def type_label(t: int) -> str:
    return TYPE_MEANINGS.get(t, "unknown")


def print_type_summary(
    by_type: Counter[int],
    parsed: int,
    *,
    title: str = "TYPE summary",
) -> None:
    if parsed == 0:
        print(f"{title}:")
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

    print(f"{title}:")
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


def print_bucket_summary(title: str, counter: Counter[int], total: int) -> None:
    """Sorted numeric key table: value | count | percent (share of *total*)."""
    print(f"{title}:")
    if total == 0:
        print("  (no rows in filtered region)")
        print()
        return

    keys = sorted(counter)
    col_v = max(len("value"), max(len(str(k)) for k in keys))
    col_c = max(len("count"), len(str(max(counter.values()))))

    header = (
        f"{'value':>{col_v}} | "
        f"{'count':>{col_c}} | "
        f"{'percent':>8}"
    )
    rule = (
        f"{'-' * col_v} | "
        f"{'-' * col_c} | "
        f"{'-' * 8}"
    )
    print(header)
    print(rule)
    for k in keys:
        n = counter[k]
        pct = 100.0 * n / total
        print(f"{k:>{col_v}} | {n:>{col_c}} | {pct:7.2f}%")
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
    parser.add_argument(
        "--ellipse",
        type=parse_ellipse,
        metavar="cLon,cLat,majorKm,minorKm,bearingDeg",
        help=(
            "optional rotated ellipse filter in approximate local km "
            "(major/minor = full axis lengths km; bearing deg clockwise from north)"
        ),
    )
    args = parser.parse_args()

    path: Path = args.input
    bbox: tuple[float, float, float, float] | None = args.bbox
    ellipse: EllipseParams | None = args.ellipse
    if not path.is_file():
        print(f"error: file not found: {path}", file=sys.stderr)
        return 1

    total_physical = 0
    parsed = 0
    skipped = 0
    by_type: Counter[int] = Counter()
    by_speed: Counter[int] = Counter()
    by_dirtype: Counter[int] = Counter()
    in_bbox_count = 0

    filt_type: Counter[int] = Counter()
    filt_speed: Counter[int] = Counter()
    filt_dirtype: Counter[int] = Counter()
    filt_count = 0
    filt_samples: list[tuple[int, float, float, int, int, int, int]] = []

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
            if ellipse is not None and row_matches_filters(lon, lat, bbox, ellipse):
                filt_count += 1
                filt_type[type_] += 1
                filt_speed[speed] += 1
                filt_dirtype[dirtype] += 1
                if len(filt_samples) < SAMPLE_ELLIPSE_ROWS:
                    filt_samples.append(row)
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

    if ellipse is not None:
        print("---")
        print("Ellipse filter: used")
        print("Ellipse parameters (equirectangular km offsets from center):")
        print(f"  centerLon, centerLat: {ellipse.center_lon:.6f}, {ellipse.center_lat:.6f}")
        print(f"  majorAxisKm (full): {ellipse.major_axis_km:g}")
        print(f"  minorAxisKm (full): {ellipse.minor_axis_km:g}")
        print(
            f"  bearingDeg: {ellipse.bearing_deg:g} "
            "(major axis clockwise from north)"
        )
        if bbox is not None:
            min_lo, min_la, max_lo, max_la = bbox
            print()
            print(
                "Both bbox and ellipse filters were applied "
                "(intersection: row must satisfy both)."
            )
            print(
                "Bbox (minLon, minLat — maxLon, maxLat): "
                f"[{min_lo}, {min_la}] — [{max_lo}, {max_la}]"
            )
            print(f"Rows inside bbox (all valid rows in box): {in_bbox_count}")
            print(f"Rows inside bbox ∩ ellipse: {filt_count}")
        else:
            print(f"Rows inside ellipse: {filt_count}")
        print()
        print(
            "Note: rotated ellipse is an approximate route-shaped QA window "
            "(local flat km + alignment to bearing); not exact road geometry."
        )
        print()
        print_type_summary(
            filt_type,
            filt_count,
            title="TYPE summary (filtered region)",
        )
        print_bucket_summary(
            "SPEED summary (filtered region)",
            filt_speed,
            filt_count,
        )
        print_bucket_summary(
            "DIRTYPE summary (filtered region)",
            filt_dirtype,
            filt_count,
        )
        print(
            f"Sample rows (first {len(filt_samples)} inside filtered region, "
            "file order):"
        )
        for row in filt_samples:
            rid, lon, lat, type_, speed, dirtype, direction = row
            print(
                f"  IDX={rid} lon={lon:.6f} lat={lat:.6f} "
                f"TYPE={type_} SPEED={speed} DIRTYPE={dirtype} DIRECTION={direction}"
            )
        print()
    elif bbox is not None:
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
