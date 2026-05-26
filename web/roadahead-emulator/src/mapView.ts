/**
 * RoadAhead Phase 0 — Web Route Emulator
 * Issue #88 / Stage 2: Real map baseline — OSM background, route line, vehicle marker.
 *
 * This module provides a Leaflet/OSM map surface for spatial evaluation of the
 * known route and vehicle position. It is a web-only debug / QA visualization
 * tool — not a navigator, not provider data, not routing, not the driver-facing UI.
 *
 * Map data © OpenStreetMap contributors (ODbL). Attribution is kept visible.
 *
 * EMULATOR DEBUG / QA UI — NOT THE DRIVER-FACING UI.
 * Not a navigator. Not an anti-radar. Not a legal speed-limit authority.
 * Not safety-certified. No provider speed, ETA, traffic, or routing.
 * Map is a spatial evaluation / debug surface only.
 * NOT Product Canon.
 */

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RouteGeometry } from "./contracts/routeGeometry.js";

// ---------------------------------------------------------------------------
// Mutable Leaflet instances
// ---------------------------------------------------------------------------

/** The Leaflet map instance. Null until initMap() is called. */
let map: L.Map | null = null;

/** The active route polyline layer. Null until the first route is set. */
let routePolyline: L.Polyline | null = null;

/**
 * The vehicle position marker — a vector CircleMarker.
 * No external image assets are loaded; the marker is drawn by Leaflet's
 * SVG/Canvas renderer. OSM tiles remain the only external map runtime resource.
 * Null until the first route is set.
 */
let vehicleMarker: L.CircleMarker | null = null;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize the Leaflet map inside the given container element.
 *
 * Creates an OSM tile layer with required attribution, a route polyline from
 * the initial route, and a vehicle marker at position 0. Fits the map to the
 * initial route bounds.
 *
 * Must be called once after the map container element exists in the DOM.
 * Calling again on the same container is a no-op (guard on `map` instance).
 *
 * EMULATOR DEBUG / QA ONLY — not driver-facing. Not navigation.
 * Map data © OpenStreetMap contributors (ODbL). Attribution kept visible.
 * Issue #88 / Stage 2.
 *
 * @param containerId - DOM element id of the map container div.
 * @param initialRoute - The initial route to render as a polyline.
 */
export function initMap(
  containerId: string,
  initialRoute: RouteGeometry
): void {
  if (map !== null) return;

  const el = document.getElementById(containerId);
  if (!el) return;

  map = L.map(el, {
    // Zoom controls on the left — keeps them visible alongside the emulator UI.
    zoomControl: true,
    // Attribution control is required for OSM compliance; kept always visible.
    attributionControl: true,
  });

  // OSM raster tiles — dev/POC background only, not provider data truth.
  // Attribution: © OpenStreetMap contributors (ODbL).
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
  }).addTo(map);

  // Render the initial route and vehicle marker, then fit the map.
  setMapRoute(initialRoute);
}

/**
 * Replace the route polyline with a new route and fit the map to it.
 *
 * Converts GeoJSON [lon, lat] coordinate pairs to Leaflet [lat, lon] LatLngs.
 * Fits the map viewport to the new route bounds with a small padding.
 *
 * Called whenever the active route changes (GeoJSON import, Rostov1 load,
 * synthetic reset, or scenario selection reset).
 *
 * EMULATOR DEBUG / QA ONLY — geometry display, not provider truth.
 * Not navigation. Not routing. NOT Product Canon. Issue #88 / Stage 2.
 */
export function setMapRoute(route: RouteGeometry): void {
  if (!map) return;

  const latLngs = coordsToLatLngs(route.coordinates);

  // Replace existing polyline or create a new one.
  if (routePolyline) {
    routePolyline.setLatLngs(latLngs);
  } else {
    routePolyline = L.polyline(latLngs, {
      color: "#2563eb",
      weight: 4,
      opacity: 0.85,
    }).addTo(map);
  }

  // Fit the map to the new route bounds.
  if (latLngs.length >= 2) {
    map.fitBounds(routePolyline.getBounds(), { padding: [24, 24] });
  }

  // Move the vehicle marker to the start of the new route.
  // Uses a vector CircleMarker — no external icon assets required.
  if (latLngs.length > 0) {
    const start = latLngs[0];
    if (vehicleMarker) {
      vehicleMarker.setLatLng(start);
    } else {
      vehicleMarker = L.circleMarker(start, {
        radius: 9,
        color: "#fff",
        weight: 2,
        fillColor: "#e63600",
        fillOpacity: 1,
      }).addTo(map);
    }
  }
}

/**
 * Move the vehicle marker to the given projected position.
 *
 * Called on every render() cycle with the current projected lat/lon from
 * SimulationState.vehicleRoutePosition. No-op if the map is not initialized
 * or the position is not finite.
 *
 * EMULATOR DEBUG / QA ONLY — position is projection-derived, per-session data.
 * Not provider GPS. Not navigation. NOT Product Canon. Issue #88 / Stage 2.
 */
export function updateVehicleMarker(lat: number, lon: number): void {
  if (!map || !vehicleMarker) return;
  if (!isFinite(lat) || !isFinite(lon)) return;
  vehicleMarker.setLatLng([lat, lon]);
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Convert a RouteGeometry coordinates array ([lon, lat] pairs) to Leaflet
 * LatLng tuples ([lat, lon]).
 *
 * GeoJSON uses longitude-first; Leaflet uses latitude-first.
 */
function coordsToLatLngs(
  coords: ReadonlyArray<readonly [number, number]>
): L.LatLngTuple[] {
  return coords.map(([lon, lat]) => [lat, lon] as L.LatLngTuple);
}
