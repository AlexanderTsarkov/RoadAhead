const EARTH_RADIUS_KM = 6371.0;

export interface EllipseParams {
  centerLon: number;
  centerLat: number;
  majorAxisKm: number;
  minorAxisKm: number;
  bearingDeg: number;
}

function lonlatToLocalKm(
  lon: number,
  lat: number,
  centerLon: number,
  centerLat: number
): [number, number] {
  const phi0 = (centerLat * Math.PI) / 180;
  const dLon = ((lon - centerLon) * Math.PI) / 180;
  const dLat = ((lat - centerLat) * Math.PI) / 180;
  const dx = EARTH_RADIUS_KM * Math.cos(phi0) * dLon;
  const dy = EARTH_RADIUS_KM * dLat;
  return [dx, dy];
}

export function inEllipse(
  lon: number,
  lat: number,
  params: EllipseParams
): boolean {
  const [dx, dy] = lonlatToLocalKm(
    lon,
    lat,
    params.centerLon,
    params.centerLat
  );
  const b = (params.bearingDeg * Math.PI) / 180;
  const sinB = Math.sin(b);
  const cosB = Math.cos(b);
  const along = dx * sinB + dy * cosB;
  const across = dx * cosB - dy * sinB;
  const a = params.majorAxisKm / 2;
  const c = params.minorAxisKm / 2;
  return (along / a) ** 2 + (across / c) ** 2 <= 1.0;
}
