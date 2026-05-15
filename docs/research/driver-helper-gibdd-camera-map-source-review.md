# Driver Helper GIBDD camera map source review

## Status

Research note. External source feasibility. Not Canon.

## Context

This note supports issue #8: Compare Datakam candidates against external GIBDD camera map source.

RoadAhead currently uses a local Datakam/OpenSpeedcam QA viewer to inspect `ExternalObservation` candidates from an ignored local `speedcam.txt` file. Existing Datakam validation notes treat external rows as candidate evidence only; they are not trusted `VerifiedRoadEvent` records.

This review asks whether the Driver Helper camera map can help with source-level QA, and especially whether a local-only overlay of RoadAhead's Datakam camera candidates on top of the external map page is feasible without copying or reading Driver Helper camera data.

## Source under review

- URL: <https://www.driver-helper.ru/kamery-gibdd>
- Site name / product: "Помощник водителя" / Driver Helper.
- Apparent operator: ИП Киселев Я.Л. The site's "О сайте" page lists ИП Киселев Я.Л., ОГРН 317366800049141, ИНН 366514478716, support email `help@driver-helper.ru`, and describes the site as online services for drivers.
- Apparent provenance: private/commercial driver-services site.
- Official / semi-official / community / commercial / unclear: commercial/private. The site uses GIBDD-related wording and offers fine-checking/payment services, but the camera map page reviewed did not establish that the camera map itself is an official GIBDD source.

The map page says it displays GIBDD cameras and radars and that "we try to keep the database up to date" ("Мы стараемся поддерживать состояние базы в актуальном состоянии..."). That wording suggests the site maintains its own database or presentation layer. It does not, by itself, prove official status, source provenance, completeness, or accuracy.

## Terms and licensing risk

Found:

- The site has an offer / user agreement at <https://www.driver-helper.ru/offerta>.
- The site has a privacy policy at <https://www.driver-helper.ru/policy>.
- The user agreement defines "Материалы Сервиса" as text and graphic materials, design, and layout, with exclusive rights belonging to the administration or rightsholders.
- The user agreement states that copying service materials without written permission creates liability under Russian law.
- The user agreement prohibits receiving or transferring information about unpaid fines using automated software or technical means, including parsing, except for use of the official widget. This clause is written for fine information rather than the camera map specifically, but it is still a strong signal that automated extraction is not welcome.
- `robots.txt` explicitly disallows `/kamery-gibdd-point/bybounds` and `/kamery-gibdd-point/bybounds*`, which appear to be the map's internal camera-point loading endpoint.
- `robots.txt` also disallows `/kamery-gibdd/embed?`, even though the page includes "add this map to your site" widget UI.

Not found:

- No camera-map-specific open data license.
- No documented public API terms for reusing camera coordinates.
- No explicit permission to copy, download, import, redistribute, or use the camera dataset inside RoadAhead.
- No official GIBDD provenance statement for the camera map dataset was found during this review.

Risk assessment:

Reuse risk is high/unknown. Driver Helper may be useful as a manually viewed external reference, but RoadAhead must not copy, import, bulk-download, scrape, cache, or redistribute Driver Helper camera data without explicit approval and legal/terms review.

Data from this source must not be copied or imported into RoadAhead without approval. It must not be used to promote Datakam candidates to `VerifiedRoadEvent`.

## Technical access method

The public page is a rendered web map, not a documented data source.

Observed technical facts from high-level page inspection:

- The page loads Yandex Maps API 2.1 from `https://api-maps.yandex.ru/2.1/?lang=ru_RU`.
- The page loads a Driver Helper JavaScript bundle named `radarPoint.js`.
- The map container uses classes/ids such as `radarPointMap`, `radarPointMap_map`, and related UI panels.
- The script exposes a `radarPoint` object with Yandex map-related fields such as `mapObj` and `mapObjectManager`.
- The script references internal paths including `/kamery-gibdd-point/bybounds`, `/kamery-gibdd-point/add`, and point comment/like/dislike paths.
- The by-bounds endpoint appears undocumented and is disallowed by `robots.txt`.
- The page includes an iframe-style embed URL, but this appears to be a map widget/display path rather than a documented data-export API.

Data export:

- No documented downloadable data export was found.
- No documented public API for camera coordinates was found.
- Internal map endpoints appear technically usable by the web page, but they are undocumented and should not be used by RoadAhead without explicit approval and legal review.

Integration feasibility:

- Technically, the page is a normal Yandex web map and can render a dense camera layer.
- A production RoadAhead comparison layer is not justified from the current evidence because no legitimate API/data license was found.
- Any integration that reads Driver Helper's internal camera data would be legally and ethically unclear and should be treated as out of scope.

## QA comparison workflow options

### 1. Side-by-side manual reference

This is the lowest-risk option.

Workflow:

- Open RoadAhead's local Datakam QA viewer.
- Load local ignored `data/raw/datakam/speedcam.txt` through the browser file picker.
- Open Driver Helper's camera map in another browser window.
- Compare a small number of familiar road sections visually.
- Record only qualitative QA notes in RoadAhead's local workflow.

Benefits:

- Does not copy Driver Helper camera data.
- Keeps Driver Helper as an external visual reference, not truth.
- Fits the current RoadAhead data posture: external sources are candidates/reference only.

Limitations:

- Manual and slow.
- Not statistical validation.
- Easy to over-trust a polished map unless the note explicitly records uncertainty.

### 2. Local-only overlay of Datakam camera candidates on the external map page

This appears technically feasible as a private local QA helper, but it is brittle and should remain local-only unless legal/terms review says otherwise.

Required constraints:

- It must use only local Datakam data selected by the user from the ignored `speedcam.txt` file or pasted/imported into local browser storage by the user.
- It must not call, read, copy, scrape, inspect, cache, or export Driver Helper camera endpoints or camera data.
- It must not persist Driver Helper-derived data.
- It must not be shipped as production integration.
- It should be treated as a private local QA tool only.

Feasibility:

- The page uses Yandex Maps, and the JavaScript exposes Yandex map-related objects. A bookmarklet/userscript could likely wait for the page map to initialize and add a separate local overlay layer with RoadAhead/Datakam points.
- The overlay would be conceptually similar to drawing custom `ymaps.Placemark` objects or a custom object manager for only local Datakam rows.
- The tool would need a user-mediated input path for local Datakam data. Browser security prevents arbitrary reading of a local file path; a file picker, localStorage, or pasted text would be needed.

Brittleness and risk:

- It depends on Driver Helper's page structure, JavaScript globals, Yandex Maps API usage, and map initialization timing.
- It may break when Driver Helper changes its page or Yandex Maps implementation.
- It could be confused with endorsement or data reuse if distributed publicly.
- It must be carefully written so it never reads the existing Driver Helper object manager or network responses.

This option is worth a follow-up issue only if RoadAhead wants a short-lived private QA accelerator. The follow-up should be explicit that the helper overlays local Datakam points on the page as a background map and reference only.

### 3. Proper RoadAhead comparison layer

This should be deferred unless one of the following becomes true:

- Driver Helper offers a documented API or export with clear permission for RoadAhead's use case.
- Written permission is obtained.
- Another legitimate open/reference source is identified with clear licensing and provenance.

Without that clarity, RoadAhead should not build a comparison layer that consumes Driver Helper data.

## Manual visual comparison

Performed:

- Region / section inspected: Moscow / Moscow-region view of the Driver Helper camera map, plus feasibility checks against RoadAhead's local Datakam QA viewer.
- Number of rough examples inspected: no reliable point-by-point examples were recorded. Browser automation could open the local viewer but could not complete the `speedcam.txt` file upload because file selection requires manual user interaction. The external map could be opened and navigated, but individual marker popup interaction was not reliable enough to record comparable point-level findings.
- Observed match quality: inconclusive for point-level match quality in this pass. Existing RoadAhead Datakam notes already record that cameras on familiar Yaroslavl-Moscow sections look plausible in the local viewer; this review did not add independent point-level Driver Helper matches.
- Camera type visibility: visible at category/legend level. The map page exposes categories such as tripod, stationary radar, traffic-light control, red-light camera, DPS post, and "all others"; page text also shows detailed labels including built-in camera, dummy, mobile DPS post, and DPS post.
- Direction visibility: unclear. No reliable direction metadata or direction arrows were observed from the page-level inspection. Direction may exist in marker details, but it was not established without interacting with or reading source data.

Qualitative conclusion:

Driver Helper is practical as a manual visual reference map, but this pass did not produce point-level validation. A human side-by-side session could inspect a small number of known cameras manually. A local-only overlay could make that workflow faster if it remains private, local, and carefully constrained to Datakam data only.

## Interpretation

Can this source help validate Datakam camera candidates?

Yes, but only as an external visual reference for manual QA. It can help a reviewer notice whether a Datakam camera candidate is near another public map's camera marker in a familiar area.

Is it independent enough to be useful?

Possibly, but independence is unclear. Driver Helper appears to maintain its own camera map/database, but the source provenance was not established. It could share upstream sources, user reports, official feeds, commercial inputs, or copied/derived data; this review did not prove which.

Is it trustworthy enough to treat as truth?

No. It is not official verification, does not provide clear provenance, and has no demonstrated license/API path for RoadAhead. It must not be treated as truth or used to promote Datakam rows to verified product data.

Is local Datakam-on-external-map overlay worth a follow-up issue?

Yes, as an optional private QA helper issue, if RoadAhead wants faster manual comparison. The follow-up should be explicitly local-only and should forbid reading Driver Helper camera objects, endpoints, or responses.

## Recommendation

RoadAhead should use Driver Helper only as a manual external reference for now.

Recommended posture:

- Use side-by-side manual reference when helpful.
- Create a future local-overlay QA helper issue only if the manual workflow becomes too slow.
- Keep any overlay private/local, using only local Datakam data.
- Do not scrape, bulk-fetch, cache, copy, import, or redistribute Driver Helper camera data.
- Do not create a proper RoadAhead comparison layer unless legal/API permission becomes clear.
- Do not treat Driver Helper as official or verified truth.

Issue #8 should close with a research conclusion, not production implementation.

## Non-meaning

- Not official verification.
- Not field verification.
- Not legal approval.
- Not permission to scrape.
- Not permission to copy Driver Helper camera data.
- Not permission to use undocumented Driver Helper endpoints.
- Not promotion to `VerifiedRoadEvent`.

## Related

- #8
- `docs/research/datakam-speedcam-format-and-route-qa.md`
- `docs/research/datakam-manual-visual-validation.md`
- `docs/research/datakam-manual-qa-status-semantics.md`
- `docs/research/datakam-road-bump-direction-semantics.md`
- `web/datakam-viewer/`
