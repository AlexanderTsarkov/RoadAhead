/**
 * Route registry contract — Stage 2 / Issue #93
 *
 * Defines the shape of the route registry (route-registry.json) consumed at
 * runtime by the emulator. The registry is the single load source for both
 * route geometry and route-scoped prepared event data.
 *
 * EMULATOR OPERATOR / QA USE ONLY — NOT THE DRIVER-FACING UI.
 * NOT Product Canon. No provider API, no network, no user account required.
 *
 * Canon authority: docs/product/areas/
 *
 * Product rule: route is the load unit.
 *   Selecting a route loads geometry + prepared_events (if configured)
 *   as a single atomic action — the user does not load them separately.
 *
 * WIP — field names and shape are subject to revision.
 */

/** Status values for a registry route entry. */
export type RouteRegistryEntryStatus = "active" | "inactive";

/**
 * A single route entry in the registry.
 *
 * One entry describes where to load route geometry (GeoJSON) and,
 * optionally, where to load the prepared route-scoped event dataset.
 */
export interface RouteRegistryEntry {
  /**
   * Stable lowercase kebab/alphanumeric identifier for the route.
   * Must be unique within the registry.
   */
  id: string;

  /** Human-readable display name. */
  name: string;

  /** Optional description for the Route/Data panel. */
  description?: string;

  /**
   * URL to the GeoJSON route geometry file.
   * Relative to the emulator's Vite public root (e.g. "./routes/Rostov1.geojson").
   * Must resolve to a GeoJSON LineString, Feature(LineString), or FeatureCollection.
   */
  route_geometry_url: string;

  /**
   * URL to the prepared route-scoped event dataset file, or null/absent if
   * no dataset has been prepared for this route yet.
   * Relative to the emulator's Vite public root.
   */
  prepared_events_url?: string | null;

  /**
   * WIP default playback speed multiplier to apply when this route is selected.
   * If absent, the current playback multiplier is preserved.
   * WIP emulator control — NOT Product Canon.
   */
  default_playback_multiplier?: number;

  /** Whether this route should appear in the selection UI. */
  status: RouteRegistryEntryStatus;
}

/** The top-level route registry document (route-registry.json). */
export interface RouteRegistry {
  /** Schema version — must be 1 for this contract revision. */
  schema_version: 1;

  /** Ordered list of registered routes. */
  routes: RouteRegistryEntry[];
}

// ---------------------------------------------------------------------------
// Runtime parser / validator
// ---------------------------------------------------------------------------

/**
 * Parse and validate raw JSON as a RouteRegistry.
 *
 * Enforces:
 *   - schema_version === 1
 *   - routes is a non-empty array
 *   - each entry has required string fields: id, name, route_geometry_url, status
 *   - id values are unique within the registry
 *
 * Throws a descriptive Error on validation failure.
 * Returns a typed RouteRegistry on success.
 *
 * WIP — NOT Product Canon. Stage 2 / Issue #93.
 */
export function parseRouteRegistry(raw: unknown): RouteRegistry {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Route registry: expected a JSON object");
  }
  const obj = raw as Record<string, unknown>;

  if (obj["schema_version"] !== 1) {
    throw new Error(
      `Route registry: schema_version must be 1, got ${String(obj["schema_version"])}`
    );
  }

  const rawRoutes = obj["routes"];
  if (!Array.isArray(rawRoutes)) {
    throw new Error("Route registry: routes must be an array");
  }
  if (rawRoutes.length === 0) {
    throw new Error("Route registry: routes array must not be empty");
  }

  const seenIds = new Set<string>();
  const routes: RouteRegistryEntry[] = rawRoutes.map(
    (r: unknown, i: number): RouteRegistryEntry => {
      if (typeof r !== "object" || r === null) {
        throw new Error(`Route registry routes[${i}]: expected an object`);
      }
      const entry = r as Record<string, unknown>;

      const id = entry["id"];
      if (typeof id !== "string" || id.trim() === "") {
        throw new Error(
          `Route registry routes[${i}]: id must be a non-empty string`
        );
      }
      if (seenIds.has(id)) {
        throw new Error(
          `Route registry routes[${i}]: duplicate route id "${id}"`
        );
      }
      seenIds.add(id);

      const name = entry["name"];
      if (typeof name !== "string" || name.trim() === "") {
        throw new Error(
          `Route registry routes[${i}] (id="${id}"): name must be a non-empty string`
        );
      }

      const routeGeometryUrl = entry["route_geometry_url"];
      if (
        typeof routeGeometryUrl !== "string" ||
        routeGeometryUrl.trim() === ""
      ) {
        throw new Error(
          `Route registry routes[${i}] (id="${id}"): route_geometry_url must be a non-empty string`
        );
      }

      const status = entry["status"];
      if (status !== "active" && status !== "inactive") {
        throw new Error(
          `Route registry routes[${i}] (id="${id}"): status must be "active" or "inactive", got "${String(status)}"`
        );
      }

      const description = entry["description"];
      const preparedEventsUrl = entry["prepared_events_url"];
      const defaultPlaybackMultiplier = entry["default_playback_multiplier"];

      return {
        id,
        name,
        description:
          typeof description === "string" ? description : undefined,
        route_geometry_url: routeGeometryUrl,
        prepared_events_url:
          typeof preparedEventsUrl === "string"
            ? preparedEventsUrl
            : undefined,
        default_playback_multiplier:
          typeof defaultPlaybackMultiplier === "number" &&
          isFinite(defaultPlaybackMultiplier) &&
          defaultPlaybackMultiplier > 0
            ? defaultPlaybackMultiplier
            : undefined,
        status,
      };
    }
  );

  return { schema_version: 1, routes };
}
