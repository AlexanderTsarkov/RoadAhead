---
status: Product Canon
canon: true
area: ui-model
source:
  - ../product-boundary/product-boundary.md
  - ../validation-emulator/validation-emulator.md
  - ../route-geometry/route-geometry.md
  - ../event-data/event-data.md
  - ../event-applicability/event-applicability.md
  - ../speed-reference/speed-reference.md
  - ../feedback-and-enforcement/feedback-and-enforcement.md
  - ../../wip/roadahead-poc-v1-three-circle-assistant.md
  - ../../wip/roadahead-poc-v1-initial-product-decisions-workbook.md
  - ../../../research/roadahead-threshold-tuning-recommendation.md
  - ../../../research/roadahead-enforcement-profile-recommendation.md
  - https://github.com/AlexanderTsarkov/RoadAhead/issues/21
related_decisions: []
last_reviewed: 2026-05-20
---

# UI Model

## Purpose

This area defines RoadAhead's stable product boundary for the **POC V1 driver-facing UI model**: what information architecture the driver-facing surface uses, how driver attention is organized, what the three-circle model represents at the product level, and what semantic constraints the UI must preserve.

The UI model is about **driver-facing information architecture and visual semantics** — the product-level structure of what gets shown to the driver and why, not the exact visual implementation. POC V1 uses a compact, event-centered UI, not a full navigation interface. The three-circle model is a product-level representation of three distinct concerns: current speed / speed-reference context; the primary upcoming or active applicable event; and secondary context from the next applicable event.

The UI model must preserve the non-claims established by [`../product-boundary/product-boundary.md`](../product-boundary/product-boundary.md): RoadAhead is not a navigator, not an anti-radar, not a legal speed authority, and not safety-certified. These boundary commitments flow through the UI model: the driver-facing surface must not imply legal certainty, enforcement capture, or violation verdicts through any visual state, label, or behavior.

The emulator / debug UI may expose richer internal state than the driver-facing surface — debug visibility is a property of the validation artifact, not a license to promote debug fields to driver-facing eligibility.

This area deliberately stops short of Canonizing exact pixel layout, circle dimensions, colors, gradients, ring thicknesses, animation timing, icon artwork, typography, label wording, mobile overlay behavior, Android permissions, accessibility rules, production design system details, and implementation file / module layout. Those remain WIP / design / future Canon.

## Canon truths

The truths below are stable RoadAhead UI-model commitments. They are deliberately short and boundary-level; exact visual specifications, layout dimensions, icon sets, animation timings, debug panel field lists, and platform-specific behaviors are explicitly **not** part of this area (see [Non-goals](#non-goals) and [Still WIP / not Canon](#still-wip--not-canon)).

1. **POC V1 UI is event-centered, not route-navigation-centered.** The driver-facing surface is organized around upcoming applicable road events (speed-relevant events, camera-risk events, hazard events). It does not present turn-by-turn directions, lane guidance, route re-planning affordances, or navigation product copy. This is a direct extension of [`../product-boundary/product-boundary.md`](../product-boundary/product-boundary.md) truth 2 at the UI level.

2. **The UI must remain compatible with RoadAhead's non-navigator product boundary.** UI copy, visual framing, labels, affordances, and any debug or emulator surfaces must not describe or frame RoadAhead as a navigator, a navigation app, a route-planning product, or a turn-by-turn assistant. Consuming route geometry for route-known emulator validation does not make the UI a navigator UI.

3. **The three-circle model is the stable POC V1 driver-facing information architecture.** POC V1 driver-facing behavior is organized around three conceptual circles, each serving a distinct product role. This three-circle structure is the product-level information architecture for POC V1; it is not merely a visual preference or a layout option.

4. **One circle represents current speed / speed-reference context.** The left circle in POC V1 is a behavioral indicator — it communicates whether the driver's current speed is appropriate relative to what is happening now or what is about to happen. It is not merely a speedometer. It reflects the active speed-reference state ([`../speed-reference/speed-reference.md`](../speed-reference/speed-reference.md) truths 3 and 4) and the urgency model, not an independent data display.

5. **One circle represents the primary upcoming / active applicable event.** The middle circle represents the next relevant applicable road event, selected through the event-applicability gate ([`../event-applicability/event-applicability.md`](../event-applicability/event-applicability.md) truth 1). It provides the driver-facing representation of the primary event: event type context, target / advisory speed context, and distance context. The primary event drives the speed-reference state and the urgency ring on the left circle.

6. **One circle may represent secondary context such as the next event or relevant supporting state.** The right circle represents the next applicable event after the primary event along the route — forward context for driver planning. Secondary context is driven by the same route-order model as the primary event ([`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §8.2). Its presence is conditional and does not alter the primary event's urgency role.

7. **Primary event means the currently most relevant driver-facing applicable event, not necessarily the geographically nearest candidate.** The primary event is selected by route-order applicability ([`../event-applicability/event-applicability.md`](../event-applicability/event-applicability.md) truths 1–6), not by raw geographic proximity. A geographically nearer candidate that fails applicability checks must not be shown as the primary event driver-facing.

8. **Secondary event / context is subordinate and must not compete with the primary event for driver attention.** Until the primary event is passed or cleared, the secondary event does not drive the urgency ring, does not change the current target speed, and does not override the primary event. The secondary circle exists for forward planning context only. This is a stable attention-hierarchy rule, not merely a layout choice.

9. **Sign-like visual primitives are appropriate for event representation, but exact icons, colors, shapes, and typography are not Canon here.** Using circular sign-like elements to represent road events (imitating the visual language of road signs — circular border, center content, event symbol) is an appropriate product-level visual semantic. Exact artwork, icon set, color values, ring dimensions, and typography are implementation / design detail.

10. **UI visual states must preserve candidate / non-verified semantics and must not imply legal certainty.** Whatever visual state the left circle, middle circle, or right circle is in — awareness, approach, pass-feedback — it must not present the candidate event's target speed as a legally verified speed limit. Candidate / non-verified semantics flow from [`../event-data/event-data.md`](../event-data/event-data.md) truths 1, 5, 10 and [`../product-boundary/product-boundary.md`](../product-boundary/product-boundary.md) truths 4, 6 through the full stack into the driver-facing UI.

11. **Feedback severity visuals must preserve the non-claim semantics from `feedback-and-enforcement`.** Visual states that reflect pass-feedback tiers or `unsafe_likely` — including red fill, reversed digits, urgency ring intensity — are severity indicators, not legal violation or fine verdicts. They must not be framed, labeled, or animated in a way that implies the driver has been fined, ticketed, legally found in violation, or that a camera captured the vehicle. This is a direct extension of [`../feedback-and-enforcement/feedback-and-enforcement.md`](../feedback-and-enforcement/feedback-and-enforcement.md) truths 1, 8, 9 at the UI level.

12. **Camera-risk UI must not imply confirmed capture, ticket, fine, or enforcement certainty.** Any visual state associated with camera-class events (camera icon, pass-feedback variant for `static_camera`) must be bounded to "possible camera risk" semantics. This is a direct extension of [`../product-boundary/product-boundary.md`](../product-boundary/product-boundary.md) truth 3 and [`../feedback-and-enforcement/feedback-and-enforcement.md`](../feedback-and-enforcement/feedback-and-enforcement.md) truth 9 at the UI level.

13. **Driver-facing UI must not expose raw / debug-only ambiguity as if it were actionable truth.** Suppressed candidates, ambiguous applicability states, and debug fields that are visible in the emulator / QA surface must not be promoted to the driver-facing surface without a deliberate driver-facing eligibility decision. This is a direct extension of [`../validation-emulator/validation-emulator.md`](../validation-emulator/validation-emulator.md) truth 8 and [`../event-applicability/event-applicability.md`](../event-applicability/event-applicability.md) truth 12 at the UI level.

14. **Emulator / debug surfaces may expose richer internal state than the driver-facing UI, but debug visibility does not imply driver-facing eligibility.** The POC V1 emulator may include debug panels, suppression-reason fields, applicability state fields, enforcement-profile config panels, and tuning controls that have no place in any eventual driver-facing surface. The presence of a field or state in the emulator does not constitute a decision to show it to a driver.

15. **Exact layout, dimensions, colors, animations, labels, icons, overlay placement, and platform-specific behavior are implementation / design details, not Canon in this area.** POC V1 uses horizontal layout only; vertical layout is deferred. Beyond this, exact pixel geometry, color palette, animation timing, label wording, icon artwork, ring thickness, mobile overlay behavior, and accessibility rules are not Canonized here. They belong in WIP / design specs / future Canon once validated.

## Scope

This area covers:

- **Event-centered driver-facing UI model** — the principle that the driver-facing surface is organized around applicable events, not route navigation.
- **Three-circle information architecture at the principle level** — the product-level structure: current-speed/speed-reference circle, primary-event circle, secondary-context circle.
- **Current-speed / speed-reference circle at the principle level** — what it represents (behavioral indicator; speed-reference state; urgency model output) and what it is not (merely a speedometer; a legal limit display).
- **Primary-event circle at the principle level** — what it represents (the applicable primary event selected by route-order applicability) and the principle that it drives urgency.
- **Secondary-context circle at the principle level** — what it represents (forward context from the next applicable event) and the attention-hierarchy rule (subordinate; does not compete with primary).
- **Primary vs secondary attention hierarchy** — the stable rule that secondary context must not override or compete with the primary event for driver attention or urgency.
- **Sign-like event representation at the principle level** — appropriateness of sign-like visual primitives for event circles; exact artwork left to design.
- **Candidate / non-verified and non-claim semantics in UI** — the rule that all three circles must preserve non-verified candidate semantics and must not imply legal certainty.
- **Feedback / camera-risk non-claim semantics in UI** — the rule that feedback severity visuals and camera-risk visuals must not imply legal violation, fine, or confirmed capture.
- **Driver-facing vs emulator / debug distinction** — the rule that emulator debug fields and suppressed candidates are not automatically promoted to driver-facing eligibility.
- **Deferral of exact visual implementation** — the acknowledgment that horizontal-only POC V1 layout is the only layout-level Canon commitment; everything else is design / WIP.

## Non-goals

These topics are explicitly out of scope for this area. They belong in WIP / design specs / future implementation issues / future ADRs / future Canon areas:

- **Exact screen layout** — relative positions of circles, spacing, margins, screen region allocations.
- **Exact circle sizes / positions / ring widths** — pixel dimensions, relative sizing, ring thickness values, overlap amounts.
- **Exact colors / gradients / contrast values** — specific color codes, palette definitions, background colors, urgency-band color values.
- **Exact icons / sign drawings / typography** — specific icon assets, SVG paths, font choices, font sizes, number formatting.
- **Exact animation timing / pulse / blink rules** — duration, easing, pulse count, blink cadence, fade-in/fade-out curves.
- **Exact camera-risk visual behavior** — camera icon appearance, pulse count, blink rules, hold duration override.
- **Exact current-speed indicator styling** — how the speed number is rendered, how the urgency ring is drawn, ring alpha ramp values.
- **Exact Android overlay UI** — overlay window size, positioning, transparency, touch interaction, foreground-service notification appearance.
- **Exact mobile permissions / lifecycle** — Android permissions, overlay permission flow, foreground-service lifecycle, background / foreground transitions.
- **Exact route map rendering UI** — how the route polyline is drawn in the emulator, map tile integration, zoom, route styling.
- **Exact debug panel field list** — which fields the emulator debug surface exposes; exact field names, layout, and surface behavior.
- **Exact accessibility implementation** — contrast requirements, screen reader semantics, accessible labels, motion reduction.
- **Exact production UI design system** — component library choices, design tokens, theming, production-grade visual specifications.
- **Implementation file / module layout** — component file names, module boundaries, framework choices, ticket sequencing.

These belong in WIP / research, future design specs, future implementation issues, future ADRs, or future Canon updates once validated by emulator work.

## Product rules

These rules are normative. They follow from the Canon truths and constrain implementation, UX, product copy, and emulator design:

- **Do not turn RoadAhead UI into a turn-by-turn navigation UI.** The driver-facing surface must not include turn guidance, lane guidance, route re-planning affordances, ETA display, or any other navigator-framing copy or visual. (From truths 1, 2; consistent with [`../product-boundary/product-boundary.md`](../product-boundary/product-boundary.md) truth 2 and product rules.)

- **Do not present candidate event speed as legal speed-limit truth.** The target or advisory speed shown in the primary or secondary event circle is candidate guidance context sourced from a prepared candidate event. Product copy, UI labels, debug strings, and exports must not present it as the current legally valid speed limit. (From truths 10; consistent with [`../speed-reference/speed-reference.md`](../speed-reference/speed-reference.md) truths 5, 13 and [`../product-boundary/product-boundary.md`](../product-boundary/product-boundary.md) truth 4.)

- **Do not present feedback tiers as legal violation / fine / capture verdicts.** Visual states that reflect severity — red fill, reversed digits, urgency ring blink — must be framed as severity indicators, not as legal outcomes. Product copy and UI labels must not use "violation", "fine", "ticket", "confirmed", "captured", or equivalent language. (From truths 11; consistent with [`../feedback-and-enforcement/feedback-and-enforcement.md`](../feedback-and-enforcement/feedback-and-enforcement.md) truths 1, 8 and product rules.)

- **Do not present camera-risk feedback as confirmed camera capture.** The visual state for camera-class events must be bounded to "possible camera risk" semantics. Camera-icon visuals, labels, and any explanatory copy must not assert detection, capture, fine, or guaranteed enforcement. (From truth 12; consistent with [`../product-boundary/product-boundary.md`](../product-boundary/product-boundary.md) truth 3 and [`../feedback-and-enforcement/feedback-and-enforcement.md`](../feedback-and-enforcement/feedback-and-enforcement.md) truth 9.)

- **Driver-facing UI must privilege the primary applicable event over raw nearest candidate.** The middle circle must show the event selected by the route-order applicability gate, not merely the geographically nearest candidate in the event store. Non-applicable candidates must not appear in the driver-facing primary or secondary slot. (From truths 5, 7; consistent with [`../event-applicability/event-applicability.md`](../event-applicability/event-applicability.md) truths 1, 2.)

- **Secondary context must remain visually subordinate to the primary event.** Until the primary event is passed or cleared, the secondary circle must not drive the urgency ring, alter the target speed, or visually compete with the primary circle for urgency. (From truth 8.)

- **Debug-only suppressed / ambiguous candidates may be visible in emulator QA surfaces, but must not be presented as driver-facing actionable truth.** Suppressed candidates are first-class debug citizens; they are not first-class driver-facing citizens. The emulator may show them in a debug panel; the driver-facing surface must not. (From truths 13, 14; consistent with [`../validation-emulator/validation-emulator.md`](../validation-emulator/validation-emulator.md) truths 7, 8 and [`../product-boundary/product-boundary.md`](../product-boundary/product-boundary.md) implementation-facing implications.)

- **Sign-like primitives may be used to improve event recognition, but exact artwork remains design / implementation detail.** Using circular, sign-like visual elements to represent road events is a product-level affordance choice. It does not commit to specific colors, ring dimensions, icon assets, or typography — those remain design detail. (From truth 9.)

- **Exact visual values must remain WIP until validated.** No exact color, dimension, timing, alpha value, or label wording is Canonized by this area. Promotion of any such value requires emulator validation and a deliberate Canon / ADR PR per [`../../README.md`](../../README.md) "Promotion rule". (From truth 15; consistent with [`../validation-emulator/validation-emulator.md`](../validation-emulator/validation-emulator.md) truth 10.)

## Implementation-facing implications

These implications are intentionally high-level and stable. Exact visual specifications, component design, and UX detail belong to future implementation slices, design specs, or WIP:

- **UI implementation should consume outputs from `event-applicability`, `speed-reference`, and `feedback-and-enforcement` rather than raw source / provider data.** The driver-facing surface renders product states — applicable primary event, active speed-reference mode, feedback severity tier — not raw vendor source rows, provider-native objects, or unapplied candidate events. (Consistent with [`../speed-reference/speed-reference.md`](../speed-reference/speed-reference.md) implementation-facing implications and [`../feedback-and-enforcement/feedback-and-enforcement.md`](../feedback-and-enforcement/feedback-and-enforcement.md) implementation-facing implications.)

- **Driver-facing UI should present product states, not raw internal fields.** The left circle renders the active speed-reference state and urgency output. The middle circle renders the applicable primary event. The right circle renders the secondary event. Internal fields (projection distance, direction delta, suppression reasons, enforcement profile values, hysteresis values) are debug data, not driver-facing content.

- **Emulator UI may include debug panels and controls that do not belong in eventual driver-facing UI.** Speed-control widgets, brake-to-target controls, scenario-sweep controls, applicability debug panels, enforcement-profile config panels, and tuning-value displays are validation affordances. They do not constitute driver-facing UI design decisions. (Consistent with [`../validation-emulator/validation-emulator.md`](../validation-emulator/validation-emulator.md) product rules.)

- **UI design should keep current speed, primary event, and secondary context conceptually distinct.** The three-circle architecture is a product-level separation of concerns: the left circle is about the driver's current speed in context; the middle circle is about the next applicable event requiring action; the right circle is about what comes after. Collapsing these concerns into a single display would break the information-architecture separation this area Canonizes.

- **Any visual severity state must preserve `feedback-and-enforcement` non-claim wording.** UI copy, labels, and any explanatory text that surface feedback severity — pass-feedback tier state, camera-risk state, `unsafe_likely` state — must be framed as severity / advisory, not as legal outcome. (Consistent with [`../feedback-and-enforcement/feedback-and-enforcement.md`](../feedback-and-enforcement/feedback-and-enforcement.md) product rules.)

- **Implementation slices needing exact layout / visuals should cite WIP / design specs / future UI model updates, not infer pixel details from this Canon.** This area commits to UI-model principles, not to visual specifications. Slices that need exact colors, dimensions, animations, or icon artwork cite [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §5, §6, §15 as working WIP input, and defer to future design specs or future Canon updates for production-grade visual specifications.

## Still WIP / not Canon

The items below are deliberately **not promoted to Canon** in this PR. They remain WIP, design, or future-Canon candidates and are listed here so they cannot be mistaken for stable UI-model truth.

- **Exact layout** — relative positions of the three circles, spacing, margins, screen region allocations, responsive or adaptive layout rules.
- **Exact circle geometry / placement** — pixel dimensions, relative sizing rules, exact overlap amounts, circle border widths.
- **Exact colors / contrast / visual intensity** — specific color codes for neutral, awareness, approach, and pass-feedback states; exact background color; exact urgency-band color values; contrast ratios.
- **Exact ring thickness and animation behavior** — urgency ring width values, how ring intensity ramps with urgency state, exact alpha values per urgency band (the WIP spec proposes starting values in §11.3; these are tuning starting points, not Canon).
- **Exact sign-like artwork / icon set / typography** — specific icon assets, SVG paths or drawing rules for speed-limit signs, camera icons, road-bump symbols; font choices, font sizes, number formatting.
- **Exact primary / secondary switching animation** — how the transition from secondary to primary is animated when the primary event is passed or cleared.
- **Exact current-speed visual styling** — how the speed number is rendered, whether and how the circle transitions between idle / approach / pass-feedback states visually.
- **Exact pass-feedback visual styling** — red-fill behavior for Tier 2, reversed-digit behavior for Tier 2, stable red-ring behavior for Tier 1, exact hold duration (tuning item; see [`../feedback-and-enforcement/feedback-and-enforcement.md`](../feedback-and-enforcement/feedback-and-enforcement.md) Still WIP / not Canon).
- **Exact camera-risk visual styling** — camera icon appearance and placement, pulse count, blink rules, hold duration override, color treatment for camera-risk state.
- **Exact route / map rendering in emulator** — how the route polyline is drawn, map tile selection, zoom behavior, vehicle marker styling, route-planning UI affordances.
- **Exact debug panel field list** — which fields the emulator debug surface exposes, how they are laid out, what update cadence they have.
- **Exact mobile overlay behavior** — overlay window dimensions, positioning on the Android screen, transparency / touch passthrough behavior, interaction with other apps in overlay mode.
- **Exact Android permissions / lifecycle** — overlay permission request flow, foreground-service notification content, background / foreground transition behavior.
- **Exact accessibility rules** — contrast requirements for visual states, screen reader semantics, accessible labels per circle, motion reduction behavior.
- **Exact production design system** — component library, design tokens, theming system, dark / light mode, production visual specifications.
- **Implementation file / module layout** — component file names, module boundaries, language / framework choices, build / test wiring.

## Source traceability

Each Canon truth is supported by one or more sources. Links are relative to this file.

- **Truth 1 — POC V1 UI is event-centered, not route-navigation-centered.**
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §5 (Core UI concept — the main UI consists of up to three circular visual elements representing current speed conformity, primary upcoming event, secondary chained event; not navigation), §18 (Explicit non-goals — "a full route engine or navigation").
  - [`../product-boundary/product-boundary.md`](../product-boundary/product-boundary.md) truth 2 (RoadAhead is not a turn-by-turn navigator; any consumption of route geometry is a means to anticipatory road understanding, not a navigation product offering) and product rules ("Do not use navigator language for POC V1").

- **Truth 2 — The UI must remain compatible with RoadAhead's non-navigator product boundary.**
  - [`../product-boundary/product-boundary.md`](../product-boundary/product-boundary.md) truth 2 (not a navigator) and truth 3 (not an anti-radar or enforcement-avoidance product) and product rules ("Do not use navigator language for POC V1"; "Do not use anti-radar / fine-avoidance language").
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §1 (Purpose — not a navigator and not an anti-radar), §16 (POC V1 is not a navigator and not an anti-radar), §18 (Explicit non-goals — full route engine or navigation).

- **Truth 3 — The three-circle model is the stable POC V1 driver-facing information architecture.**
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §5 (Core UI concept — up to three circular visual elements representing the three product concerns), §22 (Current working POC V1 summary — one always-visible current-speed indicator, one primary upcoming event sign, one optional secondary chained event sign).
  - [`../../wip/roadahead-poc-v1-initial-product-decisions-workbook.md`](../../wip/roadahead-poc-v1-initial-product-decisions-workbook.md) §3 (Summary of Recommended Direction — "A compact overlay-style three-circle anticipatory speed assistant"), §5 (Decision Q1 — interactive web route emulator first; three-circle UI state rendered from simulated state).

- **Truth 4 — One circle represents current speed / speed-reference context.**
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §6.1 (Left circle — "It is not merely a speedometer. It is a behavioral indicator"), §11 (Required-deceleration urgency model — ring intensity reflects how urgently the driver needs to slow down).
  - [`../speed-reference/speed-reference.md`](../speed-reference/speed-reference.md) truths 3 (`unknown` is the honest state when no target applies) and 4 (`approach_target` is the active POC V1 state with an event-derived target).
  - [`../../wip/roadahead-poc-v1-initial-product-decisions-workbook.md`](../../wip/roadahead-poc-v1-initial-product-decisions-workbook.md) §11 (Decision Q7 — left circle compares current speed against the target speed of the primary event in `approach_target`).

- **Truth 5 — One circle represents the primary upcoming / active applicable event.**
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §6.2 (Middle circle — primary upcoming event; visually resembles a road sign; shows event target speed, event type symbol, distance to event), §8.1 (Route-order primary event).
  - [`../event-applicability/event-applicability.md`](../event-applicability/event-applicability.md) truth 1 (Candidate events must pass applicability checks before driver-facing display or feedback).

- **Truth 6 — One circle may represent secondary context.**
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §6.3 (Right circle — secondary chained event; same dynamic visibility model as primary but under conservative assumption current speed continues), §8.2 (Route-order secondary / chain logic).
  - [`../../wip/roadahead-poc-v1-initial-product-decisions-workbook.md`](../../wip/roadahead-poc-v1-initial-product-decisions-workbook.md) (Decision on secondary/chain logic — show the second event using the same dynamic visibility model; do not let secondary affect the speed urgency indicator until it becomes primary).

- **Truth 7 — Primary event means the currently most relevant driver-facing applicable event, not necessarily the geographically nearest candidate.**
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §8.1 (`primary_event = nearest applicable event ahead along the route`) and §8.3 ("The system should not show a sign merely because it is geographically near the vehicle").
  - [`../event-applicability/event-applicability.md`](../event-applicability/event-applicability.md) truth 2 (Geographic proximity alone is insufficient for driver-facing applicability).

- **Truth 8 — Secondary event / context is subordinate and must not compete with the primary event for driver attention.**
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §6.3 ("The secondary event does not drive the left-circle urgency ring. It only becomes the urgency reference once it becomes the primary event"), §8.2 ("until the primary event is passed or cleared, the secondary event does not affect the current-speed urgency ring, does not change the current target speed, does not trigger red speed urgency, and does not override the primary event").
  - [`../../wip/roadahead-poc-v1-initial-product-decisions-workbook.md`](../../wip/roadahead-poc-v1-initial-product-decisions-workbook.md) (secondary event does not override the primary event; does not drive current-speed urgency; becomes primary only after current primary is passed or cleared).

- **Truth 9 — Sign-like visual primitives are appropriate for event representation, but exact icons, colors, shapes, and typography are not Canon here.**
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §15 (Visual design principles — "The UI imitates the visual language of road signs rather than inventing an unrelated icon system"; circular sign-like elements, red border, recognizable symbols) and §15.1 (Visual primitive intent — drawable in code using simple vector/UI primitives; reference-image ideas are "visual guidance only, not a requirement").
  - [`../../wip/roadahead-poc-v1-initial-product-decisions-workbook.md`](../../wip/roadahead-poc-v1-initial-product-decisions-workbook.md) (visual design principles carry through from the WIP spec).

- **Truth 10 — UI visual states must preserve candidate / non-verified semantics and must not imply legal certainty.**
  - [`../event-data/event-data.md`](../event-data/event-data.md) truths 1, 5, 10 (external datasets are candidate inputs; prepared events are normalized candidate observations, not `VerifiedRoadEvent` truth; validation metadata is a candidate-quality signal, not legal or safety truth).
  - [`../product-boundary/product-boundary.md`](../product-boundary/product-boundary.md) truths 4 (no legal speed-limit correctness claim) and 6 (external datasets are candidate inputs, not verified product truth).
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §16 (system must not claim legal correctness; must not present candidate events as confirmed / verified).

- **Truth 11 — Feedback severity visuals must preserve the non-claim semantics from `feedback-and-enforcement`.**
  - [`../feedback-and-enforcement/feedback-and-enforcement.md`](../feedback-and-enforcement/feedback-and-enforcement.md) truths 1 (feedback and enforcement is advisory severity semantics, not legal enforcement truth), 8 (pass-feedback tiers are severity categories, not violation / fine / capture verdicts), 9 (camera-risk feedback is a cautious event-specific feedback variant, not a confirmed camera capture or legal risk claim).
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §12.4 (Post-pass tiers — Tier 0 / Tier 1 / Tier 2 defined as severity categories), §13.1 ("What camera-risk feedback must not say" — must not claim violation, fine, confirmed capture, guaranteed enforcement).

- **Truth 12 — Camera-risk UI must not imply confirmed capture, ticket, fine, or enforcement certainty.**
  - [`../product-boundary/product-boundary.md`](../product-boundary/product-boundary.md) truth 3 (RoadAhead is not an anti-radar or enforcement-avoidance product; camera-related feedback is anticipatory and advisory; must not assert violation / fine / ticket / confirmed capture / guaranteed enforcement).
  - [`../feedback-and-enforcement/feedback-and-enforcement.md`](../feedback-and-enforcement/feedback-and-enforcement.md) truth 9 (camera-risk feedback is bounded to "possible camera risk"; must not assert violation / fine / confirmed capture / guaranteed enforcement).
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §13.1 (what camera-risk feedback must not say) and §13.3 (camera-icon pulse "must not become an aggressive alarm").

- **Truth 13 — Driver-facing UI must not expose raw / debug-only ambiguity as if it were actionable truth.**
  - [`../validation-emulator/validation-emulator.md`](../validation-emulator/validation-emulator.md) truth 8 (Emulator-visible debug data does not imply driver-facing display).
  - [`../event-applicability/event-applicability.md`](../event-applicability/event-applicability.md) truth 12 (Suppressed and ambiguous candidates may remain visible in emulator debug / QA surfaces, but debug visibility does not imply driver-facing eligibility).
  - [`../product-boundary/product-boundary.md`](../product-boundary/product-boundary.md) implementation-facing implications ("Debug output may preserve suppressed or ambiguous candidates, but driver-facing UI must remain conservative").

- **Truth 14 — Emulator / debug surfaces may expose richer internal state than the driver-facing UI, but debug visibility does not imply driver-facing eligibility.**
  - [`../validation-emulator/validation-emulator.md`](../validation-emulator/validation-emulator.md) truths 7 (emulator may expose richer debug and tuning information than the future driver-facing surface) and 8 (emulator-visible debug data does not imply driver-facing display).
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §3 (inspect debug fields exposed by the engine), §11.6 (Emulator debug fields), §8.3 (web emulator should expose debug fields for direction applicability decisions).
  - [`../../../research/roadahead-threshold-tuning-recommendation.md`](../../../research/roadahead-threshold-tuning-recommendation.md) §1 (each tuning value visible in the emulator's debug / config surface), §13 (emulator debug / config surface).

- **Truth 15 — Exact layout, dimensions, colors, animations, labels, icons, overlay placement, and platform-specific behavior are implementation / design details, not Canon in this area.**
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §15 (Visual design principles and §15.1 are visual guidance, not Canon; reference-image ideas are "visual guidance only, not a requirement"), §18 (Explicit non-goals — "vertical layout (deferred)"; "Android overlay implementation"), §21 (Future / post-POC ideas — standalone Android prototype, Android overlay, vertical layout).
  - [`../../wip/roadahead-poc-v1-initial-product-decisions-workbook.md`](../../wip/roadahead-poc-v1-initial-product-decisions-workbook.md) (Decision on layout — "Horizontal only in POC V1. Vertical layout deferred to V2 or Android overlay adaptation").
  - [`../validation-emulator/validation-emulator.md`](../validation-emulator/validation-emulator.md) truth 10 (the emulator validates behavior and product assumptions; it does not itself Canonize tuning values, provider choices, event algorithms, or legal claims) and Still WIP / not Canon ("Exact emulator UI layout and controls").
  - [`../../../research/roadahead-threshold-tuning-recommendation.md`](../../../research/roadahead-threshold-tuning-recommendation.md) §1 (all numeric values are emulator tuning starting defaults, not Canon; not safety / legal / human-factors certified).
  - [`../../../research/roadahead-enforcement-profile-recommendation.md`](../../../research/roadahead-enforcement-profile-recommendation.md) §1 (exact UI labels / colors / icons remain WIP).

Umbrella issue and governance:

- Issue [#21 — Promote stable RoadAhead POC V1 WIP decisions to Canon / decision records](https://github.com/AlexanderTsarkov/RoadAhead/issues/21) — umbrella issue under which this Canon promotion lives.
- [`../README.md`](../README.md) — area-based Canon structure, area document template, and area split / merge / cross-link rules.
- [`../../README.md`](../../README.md) — product documentation map, status-layer rules, and Canon promotion rule.

## Related areas

- **[`product-boundary`](../product-boundary/product-boundary.md)** (existing Canon area) — what RoadAhead is and is not; non-navigator identity; non-anti-radar identity; legal / safety non-claims; external-data candidate boundary; conservative posture under ambiguity. This `ui-model` area refines, at the UI level, the boundary-level commitments in `product-boundary` truths 2 (not a navigator), 3 (not an anti-radar), 4 (no legal speed-limit correctness claim), and 9 (conservative posture under ambiguity). Every UI visual state and every piece of UI copy must stay consistent with those boundary-level commitments.

- **[`validation-emulator`](../validation-emulator/validation-emulator.md)** (existing Canon area) — interactive web route emulator as POC V1 validation surface; route-known mode as the primary validation mode; emulator debug visibility does not imply driver-facing display. This `ui-model` area inherits the emulator-debug-vs-driver-facing distinction (truths 7 and 8) as a product rule: emulator debug panels, suppression-reason fields, and tuning controls are validation affordances, not driver-facing design decisions.

- **[`route-geometry`](../route-geometry/route-geometry.md)** (existing Canon area) — route geometry as spatial reference; provider geometry-only boundary; provider speed / ETA / traffic / posted limits explicitly excluded. Route drawing in the emulator UI must not imply navigation product scope (`route-geometry` product rules); this constraint flows into `ui-model` for any route-polyline rendering.

- **[`event-data`](../event-data/event-data.md)** (existing Canon area) — external-source data policy; prepared normalized candidate events; candidate / non-verified semantics. The target or advisory speed shown in event circles originates from prepared candidate events (`event-data` truths 1, 5, 10); its candidate / non-verified status carries through to the UI and is preserved by truths 10 and 11 of this area.

- **[`event-applicability`](../event-applicability/event-applicability.md)** (existing Canon area) — route / path applicability gate; conservative suppression posture; debug vs driver-facing distinction. The primary and secondary event circles render only events that have passed the applicability gate (`event-applicability` truth 1). Suppressed / ambiguous candidates visible in emulator debug must not appear in the driver-facing circles (`event-applicability` truth 12, extended by `ui-model` truth 13).

- **[`speed-reference`](../speed-reference/speed-reference.md)** (existing Canon area) — active POC V1 speed modes (`unknown`, `approach_target`); target-speed semantics from the event itself; separation from enforcement tolerance, display hysteresis, and pass-feedback severity. The left circle renders the speed-reference state and the urgency model output. It must not conflate the target speed with enforcement tolerance (`speed-reference` truth 10) or display hysteresis (`speed-reference` truth 11), and must preserve candidate / non-verified semantics (`speed-reference` truth 13).

- **[`feedback-and-enforcement`](../feedback-and-enforcement/feedback-and-enforcement.md)** (existing Canon area) — pass-feedback tiers; camera-risk feedback variant; advisory severity semantics; non-claim posture for all feedback visuals. The UI's visual severity states (red fill, reversed digits, urgency ring blink, camera-icon pulse) are visual representations of feedback-and-enforcement outputs and must preserve all non-claim semantics from that area (truths 1, 8, 9). Exact visual behavior for these states — which this area explicitly defers — must ultimately be consistent with those non-claims.

- **`tuning-and-validation`** (planned; not yet a Canon area) — threshold tuning, scenario sweep methodology, validation evidence required before promoting a tuning value to Canon. Exact visual timing values (ring alpha ramp, animation durations, pass-feedback hold duration) and other UI-adjacent tuning values referenced in [Still WIP / not Canon](#still-wip--not-canon) will require emulator-based validation before any promotion, governed by the methodology this planned area will Canonize. See planning entry in [`../README.md`](../README.md).
