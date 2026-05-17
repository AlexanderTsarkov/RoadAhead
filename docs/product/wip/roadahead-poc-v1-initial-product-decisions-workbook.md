# **RoadAhead POC V1 — Initial Product Decisions Workbook**

## **Status**

Working decision document.

This document is not Canon.

Purpose: collect accepted working decisions and technical/research questions required to evolve the RoadAhead POC V1 WIP spec before Canon or implementation planning.

## **Related WIP docs**

- Main POC V1 WIP spec (reader-facing product WIP): [`roadahead-poc-v1-three-circle-assistant.md`](roadahead-poc-v1-three-circle-assistant.md)
- This workbook (decision/input document): `roadahead-poc-v1-initial-product-decisions-workbook.md`

A WIP index may be introduced later if the POC V1 documentation splits into multiple area-specific files. For now, these two files cross-link to each other directly.

Related existing issue:

\#17 — Planning tracker for RoadAhead POC V1 WIP revision, decisions, and later implementation slices

---

# **1\. Purpose of This Document**

The WIP spec defines the RoadAhead POC V1 concept:

A compact overlay-style three-circle anticipatory speed assistant based primarily on Datakam/OpenSpeedcam candidate data.

Before this WIP can be promoted toward Canon or implementation planning, accepted working decisions and remaining technical/research questions must be explicit, so Cursor can revise the WIP spec without guessing product intent.

This document exists to:

1. list the unresolved questions;  
2. propose reasonable initial answers;  
3. expose decision forks;  
4. identify which decisions are required before WIP-to-Canon promotion or implementation slicing;  
5. separate POC defaults from long-term product truth.

---

# **2\. Decision Principle**

POC V1 should optimize for:

fast practical validation of the core UX idea

not for:

complete legal correctness  
complete map/navigation integration  
perfect event semantics  
production-grade driver alerting

**The central POC question remains:**

**Does the three-circle anticipatory UI help the driver understand what speed-related or caution-related action is needed next?**

---

# **3\. Summary of Recommended Direction**

Recommended POC V1 direction:

Start with an interactive web route emulator before Android overlay implementation.

NOTE: The first prototype should use explicit route geometry, not free-map movement.

UPDATED DECISION — Interactive web route emulator

This supersedes the earlier generic “web replay prototype” wording.

POC V1 should start with an interactive web route emulator. The emulator is an important product/testing component, not a throwaway toy. It should move a simulated vehicle along explicit road geometry, not over a free map background.

The emulator should let the user:  
\- choose start and finish points on a map;  
\- build a road-following route through a route geometry provider;  
\- render the route polyline;  
\- move a simulated vehicle along that route;  
\- manually control simulated speed with simple controls such as ±1 / ±5 / ±10 km/h, play/pause, and reset;  
\- react to RoadAhead indications during the simulation by slowing down, accelerating, braking late, or passing too fast.

The route provider is used only to obtain route geometry for the emulator. Provider speed, ETA speed, traffic speed, or segment speed is not required for POC V1 and must not be treated as RoadAhead speed truth. Simulated vehicle speed is controlled manually by the user.

Route geometry provider options:  
\- Yandex route geometry provider — primary candidate for the first Russia-focused POC if integration is straightforward;  
\- OSM-based provider such as OSRM or GraphHopper — fallback / future provider;  
\- imported GPX / KML / GeoJSON track;  
\- recorded GPS track;  
\- manually defined polyline fallback.

Architecture boundary:

Route Geometry Provider  
  \-\> returns route polyline only

Vehicle Simulator  
  \-\> moves along route polyline  
  \-\> derives heading from route geometry  
  \-\> uses manually controlled speed

RoadAhead Engine  
  \-\> receives simulated position / heading / speed  
  \-\> selects Datakam candidate events  
  \-\> updates three-circle UI

Datakam candidate events should eventually be projected onto the route polyline, not selected only by straight-line distance. For each candidate event near the route, the emulator/event-selection layer should compute:

vehicle\_route\_position\_m  
event\_route\_position\_m  
distance\_ahead\_m \= event\_route\_position\_m \- vehicle\_route\_position\_m

This projection belongs to the emulator and event-selection layer. It does not make the route provider part of RoadAhead product logic.

Updated validation path:

Phase 0: Interactive web route emulator  
Phase 1: Standalone Android prototype  
Phase 2: Android overlay on top of existing navigator

Updated default:

Validation target \= interactive web route emulator first.  
Route provider \= Yandex first if straightforward; OSM/OSRM/GraphHopper and GPX/manual route input as fallback.  
Speed source \= manual user-controlled simulated speed; provider speed ignored for RoadAhead logic.

Why:

* we can test event selection, visual states, chain behavior, and speed-reference logic without driving every iteration;  
* Android overlay permissions and platform details are a distraction before validating behavior;  
* emulator mode allows controlled testing against known Datakam routes;  
* once behavior is stable, Android overlay becomes a later technical execution topic rather than a product exploration.

---

# **4\. Working Questions for WIP Revision**

The following questions should be resolved or explicitly carried as open items before asking Cursor to produce the next fuller WIP revision.

| ID | Question | Required before WIP revision? | Recommended default |
| ----- | ----- | ----- | ----- |
| Q1 | First validation target | Yes | Interactive web route emulator first |
| Q2 | Initial event types | Yes | `speed_limit`, `static_camera`, `road_bump`; defer `TYPE=106` unless manually scoped |
| Q3 | Camera type scope | Yes | Start with `static_camera` only |
| Q4 | Preview / active thresholds | Yes | Dynamic speed/deceleration thresholds with distance guardrails |
| Q5 | Event priority / conflict handling | Yes | Route order; nearest applicable event becomes primary |
| Q6 | Chain logic | Yes | Route-order secondary context with dynamic visibility |
| Q7 | Speed reference model | Yes | unknown / approach\_target; provisional\_limit deferred |
| Q8 | Provisional limit validity | Yes | deferred; no active provisional\_limit UI in POC V1 |
| Q9 | Approach urgency model | Yes | Continuous live required-deceleration urgency ring |
| Q10 | `TYPE=106` inclusion | Yes | Defer by default; allow manually familiar corridor mode |
| Q11 | Testing strategy | Yes | Interactive route-emulator simulation required |
| Q12 | Layout | No | Horizontal only for POC |
| Q13 | Pass feedback visual | Can tune | pass\_feedback\_hold |
| Q14 | Camera-risk feedback | Can tune | pass\_feedback\_hold camera-risk variant Q15 Data preparation Yes prepared local geo-indexed event store; raw text is import-only Q16 Direction applicability Needs technical recommendation conservative route-path applicability; tune via emulator/field tests  |

---

# **5\. Decision Q1 — First Validation Target**

## **Question**

What should be the first validation target?

Options:

1. Android overlay immediately.  
2. Standalone Android prototype.  
3. Interactive web route emulator.  
4. Extend current Datakam viewer into an interactive route emulator mode.  
5. Hybrid: web route emulator first, Android later.  
6. 

## **Recommended decision**

Start with an interactive web route emulator.

## **Reasoning**

The hardest product questions are not Android-specific:

* which event is selected as primary;  
* when preview becomes active;  
* how the left speed circle reacts;  
* how chained events appear;  
* how speed reference changes after passing events;  
* whether the UI feels useful or noisy.

These can be tested faster in the interactive web route emulator.

## **Proposed validation path**

1\. Build an interactive web route emulator.  
2\. Simulate vehicle position, speed, and heading.  
3\. Render three-circle UI from simulated state.  
4\. Test against Datakam subset for known Yaroslavl–Moscow corridor.  
5\. Only after behavior feels right, move to Android.

## **Decision fork**

### **If Android overlay first**

Pros:

* closer to final product experience;  
* validates overlay feasibility early.

Cons:

* Android permissions and overlay lifecycle slow down product validation;  
* harder to test repeatedly;  
* harder to debug event logic while driving.

### **If interactive web route emulator first**

Pros:

* fastest iteration;  
* deterministic testing;  
* easier screenshots/video review;  
* easier Cursor-assisted WIP/spec review.

Cons:

* does not validate real Android overlay constraints yet.

## **Suggested answer**

POC V1 starts as an interactive web route emulator, with Android overlay deferred until behavior is validated.

---

# **6\. Decision Q2 — Initial Event Types**

## **Question**

Which Datakam event types should be included in the first POC?

Candidate types:

* `TYPE=101 speed_limit`  
* `TYPE=1 static_camera`  
* `TYPE=102 road_bump`  
* `TYPE=106 other_danger`  
* other camera types  
* dangerous turns  
* bad road  
* pedestrian crossings

## **Recommended decision**

Start with:

TYPE=101 speed\_limit  
TYPE=1 static\_camera  
TYPE=102 road\_bump

Defer by default:

TYPE=106 other\_danger  
dangerous\_turn  
bad\_road  
pedestrian\_crossing  
average\_speed\_camera  
red\_light\_camera  
mobile\_camera  
dangerous\_intersection

## **Reasoning**

The first POC should validate the core UI with a small set of high-signal events.

### **`speed_limit`**

Needed because it tests speed-regime behavior, approach\_target logic, and future speed-reference hooks.

### **`static_camera`**

Needed because it is a high-value driver use case.

### **`road_bump`**

Needed because it tests local hazard / target-speed behavior.

### **`TYPE=106 other_danger`**

Useful, but semantically risky. It often appears railway-crossing-like in familiar inspected areas, but should not be globally renamed.

## **Decision fork**

### **Include `TYPE=106` immediately**

Pros:

* railway-like danger is valuable;  
* tests non-camera/non-speed-limit caution events.

Cons:

* semantics are not globally proven;  
* risks confusing POC if false positives appear.

### **Defer `TYPE=106`**

Pros:

* cleaner initial test;  
* fewer ambiguous warnings.

Cons:

* loses a potentially useful safety case.

## **Suggested answer**

POC V1 initial scope includes speed\_limit, static\_camera, and road\_bump.  
TYPE=106 is excluded by default, but may be enabled in a manually familiar corridor test mode.

---

# **7\. Decision Q3 — Camera Type Scope**

## **Question**

Which Datakam camera types are included initially?

Known camera-related categories may include:

* static camera;  
* traffic-light camera;  
* red-light camera;  
* average-speed camera;  
* mobile camera.

## **Recommended decision**

Start with static\_camera only.

## **Reasoning**

Static cameras are the simplest enforcement event:

target speed at point  
distance to point  
direction applicability  
pass feedback

Other camera types may have different semantics:

* red-light camera is intersection-specific;  
* average-speed camera is segment-based, not point-based;  
* mobile camera may be less reliable or temporary.

## **Decision fork**

### **Static cameras only**

Pros:

* clean semantics;  
* narrow initial scope;  
* enough to test camera-risk feedback.

Cons:

* misses some real-world cameras.

### **Include all camera-like Datakam types**

Pros:

* more coverage.

Cons:

* may mix incompatible semantics too early.

## **Suggested answer**

Initial POC includes static\_camera only.  
Other camera types are deferred unless later analysis proves they can reuse identical point-event logic safely.

---

# **8\. Decision Q4 — Preview / Active Thresholds**

Question

When should an upcoming event become visible, and when should the driver-facing UI indicate that speed change is actually needed?

Recommended decision

Do not use fixed distance-only preview/active thresholds as the primary rule.

Primary model: dynamic action-horizon thresholds based on speed, target speed, route-projected distance, reaction time, and required deceleration.

Distance thresholds remain useful, but only as guardrails:

\- maximum lookahead caps

\- minimum display distance

\- fallback when target speed is unknown

\- event-type tuning caps

\- debugging / explainability constants in the emulator

Core computed values

For each next applicable speed-relevant event, compute:

vehicle\_route\_position\_m

event\_route\_position\_m

distance\_ahead\_m \= event\_route\_position\_m \- vehicle\_route\_position\_m

time\_to\_event\_s

current\_speed\_kmh

target\_speed\_kmh

required\_deceleration\_mps2

needed\_distance\_smooth\_m

needed\_distance\_normal\_m

needed\_distance\_strong\_m

needed\_distance\_emergency\_m

Conceptual formula

needed\_distance\_m \= current\_speed\_mps \* reaction\_time\_s \+ ((current\_speed\_mps^2 \- target\_speed\_mps^2) / (2 \* deceleration\_mps2)) \+ margin\_m

Initial deceleration profiles for POC tuning

smooth\_deceleration \= 1.0 m/s²

normal\_deceleration \= 1.5 m/s²

strong\_deceleration \= 2.5 m/s²

emergency/design\_deceleration \= 3.4 m/s²

Initial reaction defaults

ordinary\_road\_reaction\_time \= 2.0 s

high\_speed\_road\_reaction\_time \= 2.5 s

optional\_ui\_margin \= 1.0 s

UI state model

hidden

No relevant upcoming event inside the effective lookahead window.

awareness

The event is relevant and close enough to enter visual awareness. Driver still has enough room for reaction time plus smooth slowdown. The event sign/card may be shown, and the current-speed ring can show a weak awareness state if speed is above target.

smooth\_required

Smooth deceleration should begin now to reach target comfortably.

normal\_required

Normal deceleration is required. Still acceptable, but no longer relaxed.

strong\_required

Strong deceleration is required. The warning is materially urgent.

emergency\_required

Only emergency/design-level deceleration is likely to reach target speed by the event.

unsafe\_likely

Reaching enforcement\_threshold\_speed safely is unlikely. The system should indicate likely excessive-speed pass risk.

Current-speed ring rule

The current-speed element should use a red urgency ring whose alpha/intensity reflects the urgency of slowing down for the next speed-relevant event.

Use alpha, not “transparency”, to avoid ambiguity:

\- alpha 0.2 \= weak visible red ring

\- alpha 0.4 \= smooth slowdown should begin

\- alpha 0.6 \= normal slowdown required

\- alpha 0.8 \= strong slowdown required

\- alpha 1.0 \= emergency/design slowdown required toward target\_speed

\- blinking alpha 1.0 \= unsafe\_likely / likely excessive-speed pass above enforcement threshold

Neutral-at-target rule

If current\_speed \<= target\_speed \+ display\_hysteresis\_kmh:

\- the current-speed circle remains neutral

\- the default black outline is shown

\- no red urgency ring is displayed

\- the upcoming event sign/card remains visible nearby as context

Live recalculation rule

The urgency indicator is continuously recomputed from the moment the next speed-relevant event enters the active lookahead/awareness window until the vehicle passes or clears that event.

This is required because driver behavior can change while approaching the same event:

\- driver starts braking and becomes safe

\- driver stops braking too early

\- driver accelerates again before the event

\- driver is already at/below target speed, then accelerates above target

The indicator must therefore reflect the current live situation, not the state captured when the event first appeared.

Interactive web route emulator requirement

The emulator is the correct place to tune these parameters. It should expose debug values and controls, including:

\- current speed

\- target speed

\- distance ahead

\- time to event

\- required deceleration

\- selected urgency state

\- red ring alpha/intensity

\- braking profile thresholds

\- reaction time

\- UI margin

The emulator should also provide brake-to-target controls:

\- brake to target: smooth

\- brake to target: normal

\- brake to target: strong

\- brake to target: emergency

These controls do not imply future automatic braking. They are a product/testing tool for checking whether warnings appear early enough for realistic human driving behavior.

Reasoning

A fixed distance can be too early at low speed and too late at high speed. RoadAhead should warn early enough for normal human anticipation, not merely early enough for physical emergency braking.

Suggested answer

Use dynamic time/deceleration-based thresholds as the primary model. Keep type-specific distance values only as fallback guardrails and tuning caps.

# 

# **9\. Decision Q5 — Event Priority / Conflict Handling**

Question  
If multiple events are ahead, which one becomes the primary middle circle?

Recommended decision  
Do not implement special event-type conflict-resolution priority rules in POC V1.

Use a route-order event model:  
primary\_event \= nearest applicable event ahead along the route

The next applicable event may be shown as secondary context through chain logic, but it must not override the primary event.

Minimal filters  
The event selector should only apply basic eligibility rules:  
\- ignore events behind the vehicle  
\- ignore direction-inapplicable events  
\- ignore disabled event types  
\- optionally suppress near-duplicate same-location/same-type events if needed

No special priority resolver in POC V1  
Do not implement rules such as:  
\- camera outranks speed\_limit  
\- road\_bump outranks camera  
\- lower target speed outranks nearer event  
\- active hazard outranks nearer route-order event

Rationale  
Road events are normally intended to be consumed in route order. A stronger restriction or local hazard is usually preceded by weaker warning or speed-regime context. For POC V1, special priority rules may create confusing behavior by letting a farther event steal attention from the next immediate event.

The first version should be predictable:  
\- the nearest applicable event is primary  
\- the following applicable event can be secondary context  
\- current-speed urgency is driven only by the primary event

Deferred future work  
If real data later shows repeated cases where route-order handling is insufficient, introduce explicit conflict-resolution rules as a separate decision. Do not bake that complexity into POC V1.

Suggested answer  
Use route order first. The nearest applicable event ahead becomes primary. No event-type override priority in POC V1.

---

# **10\. Decision Q6 — Chain Logic**

Question  
When should the third circle appear, and how should the second/next event be selected?

Recommended decision  
Use route-order secondary context.

The secondary event is the next applicable event after the primary event along the route. It provides forward context only. It does not override the primary event and does not affect the current-speed urgency indicator until it becomes primary.

Selection model  
primary\_event \= nearest applicable event ahead on the route  
secondary\_event \= next applicable event after primary\_event

Applicability filters still apply:  
\- event must be ahead of the vehicle  
\- event must be direction-applicable  
\- event type must be enabled  
\- near-duplicate events may be suppressed if needed

Secondary visibility model  
Do not use a fixed chain window as the primary rule.

Show the secondary/third-circle event when it enters the same general dynamic visibility/action-horizon model used for primary events, but calculated under the simplifying assumption that the vehicle continues at current speed.

This means secondary visibility is based on:  
current\_speed  
secondary\_distance\_ahead\_m  
secondary target speed / event type  
reaction/action horizon  
fallback distance guardrails if needed

The system does not try to predict how much the driver will slow down for the primary event. It uses current speed as the conservative assumption. As the driver actually slows down or accelerates, the secondary visibility is recomputed continuously.

Visual behavior  
The secondary event may:  
\- appear faint/small at first  
\- increase size/alpha/visibility as the vehicle approaches  
\- decrease or grow more slowly if the vehicle slows down  
\- become the new primary only after the current primary event is passed or cleared

Critical boundary  
Until the primary event is passed or cleared, the secondary event:  
\- does not affect the current-speed urgency ring  
\- does not change the current target speed  
\- does not trigger red speed urgency  
\- does not override the primary event

Example  
If the vehicle approaches:  
primary: speed\_limit 60  
secondary: road\_bump 20

Before passing speed\_limit 60:  
\- current-speed urgency is computed only against 60  
\- road\_bump 20 may be shown as secondary context  
\- road\_bump 20 does not drive the speed ring yet

After passing speed\_limit 60:  
\- road\_bump 20 becomes primary  
\- current-speed urgency is then computed against 20  
\- the next applicable event, if any, becomes secondary

Suggested answer  
Use route-order secondary context. Show the second event using the same dynamic visibility/action-horizon idea as the first event, assuming current speed continues. Do not let the secondary event affect the speed urgency indicator until it becomes primary.

---

# **11\. Decision Q7 — Speed Reference Model**

Question

What states should the current speed reference have?

Recommended decision

For POC V1, use two active speed-reference modes plus one temporary pass-feedback visual state.

Active POC V1 modes:

unknown

approach\_target

Temporary visual state:

pass\_feedback\_hold

Deferred/future mode:

provisional\_limit

Important scope decision

Do not remove provisional\_limit as a concept. It is an important future product mode. However, POC V1 does not have a reliable source of current road-segment speed truth, so provisional\_limit is not supported as an active UI/compliance mode in POC V1.

Future provisional\_limit definition

provisional\_limit means the system has enough trusted information to treat a speed as the current road-segment speed reference for some period or road segment.

This may require one or more future sources:

\- reliable map/road-segment maxspeed data

\- confirmed sign pass plus valid zone/segment interpretation

\- settlement boundary / cancellation / intersection handling

\- explicit validity distance or validity rule

\- other trusted speed-regime source

Until that exists, RoadAhead must not imply that it knows the current legal speed limit after passing a sign.

State definitions

unknown

The system does not claim to know the current valid speed reference.

Current-speed circle:

\- shows current speed only

\- uses neutral black outline

\- no red urgency ring

\- no legal-speed compliance indication

approach\_target

An upcoming speed-relevant primary event is active.

Current-speed circle:

\- shows current speed

\- compares current speed against the target speed of the primary event

\- uses the required-deceleration urgency ring if slowing is needed

\- remains neutral if current\_speed \<= target\_speed \+ display\_hysteresis\_kmh

pass\_feedback\_hold

A just-passed primary event entered one of the pass-feedback tiers defined in Q13.

This is not a speed-reference mode. It is a temporary visual confirmation that the previous event was passed above the target speed, with severity defined by Q13.

Visual behavior is tiered:

\- Tier 1, above target but within enforcement\_tolerance: keep the just-passed event visible and show a stable red outer ring / outline reminder; do not fill the inner speed-circle area red and do not reverse digits.

\- Tier 2, above enforcement\_threshold\_speed: keep the just-passed event visible, fill the inner white speed-circle area with solid red, and reverse speed digits to white.

\- Camera events use the Q14 camera-risk variant when above enforcement\_threshold\_speed.

Shared timing:

\- hold the state long enough to be understood, not as an instant flash

\- suggested default: pass\_feedback\_hold\_s \= 4 seconds

\- acceptable tuning range: 3–5 seconds

Transition after pass\_feedback\_hold

If another applicable event is already active:

\- previous primary is cleared

\- next event becomes the new primary

\- current-speed indicator enters approach\_target for the new primary

\- urgency is recomputed from the new current speed, new target speed, and new distance ahead

If no next active event exists:

\- current-speed circle returns to unknown

\- the just-passed speed may be stored as recent\_passed\_speed\_candidate for short-term context only

Recent passed speed candidate

After passing a speed\_limit-like event, POC V1 may store:

recent\_passed\_speed\_candidate

recent\_passed\_speed\_candidate\_ttl\_s \= 30–60 seconds

But in POC V1 this memory does not drive current-speed compliance UI. It does not turn into provisional\_limit. It is context only and preserves the concept for future work.

Passed correctly

If pass\_speed is within the non-feedback / passed-at-target band defined in Q13:

\- no pass\_feedback\_hold is required

\- clear the primary event

\- transition to the next primary if one is active

\- otherwise return to unknown

State machine

unknown \-\> approach\_target

when a primary speed-relevant event enters the action horizon

approach\_target \-\> pass\_feedback\_hold

when the primary event enters pass\_feedback\_hold under Q13 rules

approach\_target \-\> approach\_target(next\_event)

when the primary event is passed correctly and another event is already active

approach\_target \-\> unknown

when the primary event is passed correctly and no next event is active

pass\_feedback\_hold \-\> approach\_target(next\_event)

after hold duration if another applicable event is active

pass\_feedback\_hold \-\> unknown

after hold duration if no next applicable event is active

Suggested answer

POC V1 active speed-reference modes are unknown and approach\_target. Add pass\_feedback\_hold as a temporary visual state for too-fast event passing. Keep provisional\_limit in the document as a future mode, but explicitly mark it as unsupported in POC V1 until reliable road-segment speed truth is available.

---

# **12\. Decision Q8 — Provisional Limit Validity**

Question  
Should a passed speed\_limit-like event become a provisional current speed limit in POC V1, and if not, what should be remembered after passing it?

Recommended decision  
Do not support provisional\_limit as an active UI/compliance mode in POC V1.

POC V1 may store a recent\_passed\_speed\_candidate for short-term context only, but this memory must not drive current-speed compliance indication.

Reasoning  
After passing a speed\_limit-like event, the system still does not know the full current road-segment speed truth. It does not know cancellation signs, settlement boundaries, intersection effects, validity distance, zone validity, or authoritative segment maxspeed. Therefore POC V1 must not behave as if it knows the current legal speed limit.

POC V1 behavior  
After passing a speed\_limit-like event:  
\- if the event was passed too fast, enter pass\_feedback\_hold  
\- if a next active event exists after pass\_feedback\_hold, it becomes the new primary and the speed circle enters approach\_target  
\- if no next active event exists, the speed circle returns to unknown  
\- the passed speed may be stored as recent\_passed\_speed\_candidate for context only

Recent candidate memory  
recent\_passed\_speed\_candidate\_ttl\_s \= 30–60 seconds

This memory is not a speed-reference mode. It is not shown as current legal speed. It is not used for red/green compliance of current speed. It exists only to preserve context for debugging, future product logic, or later experiments.

Future provisional\_limit  
provisional\_limit remains a future mode. It should be introduced only when RoadAhead has a trusted source or rule set that can justify treating a speed as the current road-segment speed reference.

Possible future requirements:  
\- reliable road-segment maxspeed source  
\- sign validity/cancellation handling  
\- settlement boundary handling  
\- intersection validity handling  
\- explicit validity distance/time/zone rules

Suggested answer  
For POC V1, defer provisional\_limit. Store recent\_passed\_speed\_candidate for 30–60 seconds as context only. The current-speed indicator returns to unknown when no next active event exists.

---

# **13\. Decision Q9 — Active Approach Urgency Model**

Question  
How should the left/current-speed circle decide whether speed is okay while approaching the next speed-relevant event?

Recommended decision  
Use a continuously recomputed required-deceleration urgency model.

The left speed circle does not primarily indicate that an event exists. The event itself is shown by the event circle/card. The speed circle indicates whether the driver currently needs to change speed for the next speed-relevant event.

Core inputs:  
current\_speed  
 target\_speed  
 distance\_ahead\_m  
 reaction\_time\_s  
 deceleration\_profile thresholds  
 display\_hysteresis\_kmh

Neutral-at-target rule  
If current\_speed \<= target\_speed \+ display\_hysteresis\_kmh:  
\- current-speed circle remains neutral  
\- default black outline is shown  
\- no red urgency ring is displayed  
\- the upcoming event remains visible nearby as context

If the driver later accelerates above target\_speed \+ display\_hysteresis\_kmh before passing the same event, the red urgency ring reappears and is recalculated from the live speed and live remaining distance.

Live recalculation rule  
The urgency state is not latched when an event first appears. It is recomputed continuously from event activation until event pass/clear.

Examples:  
\- driver starts above target speed: ring appears according to required deceleration  
\- driver brakes smoothly: ring intensity decreases  
\- driver reaches target speed: ring disappears and the speed circle becomes neutral  
\- driver accelerates again before the event: ring reappears  
\- driver accelerates late: ring may jump directly to strong / emergency / blinking

Initial urgency states and ring alpha  
Use alpha/intensity rather than “transparency” wording:  
\- alpha 0.2 \= weak visible ring  
\- alpha 1.0 \= fully opaque ring

States:  
hidden — no relevant upcoming speed/action event; no red ring  
awareness — event is close enough for perception/reaction \+ smooth slowdown; alpha 0.2  
smooth\_required — smooth deceleration should begin; alpha 0.4  
normal\_required — normal deceleration is required; alpha 0.6  
strong\_required — strong deceleration is required; alpha 0.8  
emergency\_required — emergency/design-level deceleration is required; alpha 1.0  
unsafe\_likely — reaching enforcement\_threshold\_speed safely is unlikely; blinking alpha 1.0

Suggested WIP logic  
1\. Select the next applicable speed-relevant event.  
2\. If no event is selected, use neutral speed circle.  
3\. If current\_speed \<= target\_speed \+ display\_hysteresis\_kmh, use neutral speed circle.  
4\. Otherwise compute required\_deceleration\_mps2 from current\_speed, target\_speed, and distance\_ahead\_m.  
5\. Map required\_deceleration\_mps2 to smooth / normal / strong / emergency / unsafe bands.  
6\. Smooth alpha changes slightly to avoid visual jitter near thresholds.

Suggested POC tuning fields:  
display\_hysteresis\_kmh \= 1–2  
clear\_hysteresis\_kmh \= 2 or 3  
alpha\_smoothing\_ms \= 500–1000

Emulator requirement  
The interactive web route emulator should expose:  
current\_speed\_kmh  
target\_speed\_kmh  
distance\_ahead\_m  
time\_to\_event\_s  
required\_deceleration\_mps2  
selected urgency state  
red\_ring\_alpha  
braking profile thresholds

Suggested answer  
Use continuous live required-deceleration bands for the left/current-speed indicator. Keep the indicator neutral whenever the driver is already at or below target speed plus display hysteresis. The ring intensity must be derived from the current live situation until the event is passed.

---

# **14\. Decision Q10 — `TYPE=106 other_danger`**

## **Question**

Should railway-like `TYPE=106` be included in POC V1?

## **Context**

Manual QA suggested many `other_danger` points may correspond to railway crossings in familiar areas.

OSM research suggests `railway=level_crossing` is a useful future validation layer.

But Datakam `TYPE=106` is not globally proven to mean railway crossing.

## **Recommended decision**

Exclude TYPE=106 from default POC V1.  
Allow an optional manually familiar corridor mode later.

## **Decision fork**

### **Include now**

Pros:

* tests safety/caution use case;  
* useful on familiar routes.

Cons:

* semantic ambiguity;  
* risk of false warning type.

### **Exclude now**

Pros:

* cleaner POC;  
* fewer false semantics.

Cons:

* loses potentially useful railway-crossing warnings.

## **Suggested answer**

Default POC V1 excludes TYPE=106.  
A later experiment may include TYPE=106 only as "railway-like danger candidate" in known/familiar regions.

---

# **15\. Decision Q11 — Testing / Simulation Strategy**

## **Question**

How do we test without driving every iteration?

## **Recommended decision**

Interactive route-emulator simulation is mandatory for POC V1 development.

Minimum simulation system:

simulated position  
simulated speed  
simulated heading/course  
Datakam candidate subset  
three-circle UI state output

## **Suggested answer**

The WIP spec should require the interactive web route emulator / simulation harness before Android overlay work.

---

# **16\. Decision Q12 — Layout**

## **Question**

Should POC V1 support horizontal and vertical layouts?

## **Recommended decision**

Horizontal layout only for POC V1.

## **Reasoning**

The product idea is easier to validate with one layout. Horizontal layout best represents sequence along movement.

Vertical layout can be deferred.

## **Suggested answer**

Horizontal only in POC V1. Vertical layout deferred to V2 or Android overlay adaptation.

---

# **17\. Decision Q13 — Pass Feedback**

Question  
What happens visually if the vehicle passes a speed-relevant event too fast, and how should country-specific enforcement tolerance affect critical feedback?

Recommended decision  
Introduce enforcement\_tolerance as a first-class product parameter, separate from target\_speed and separate from small UI/display hysteresis.

Definitions  
target\_speed  
The required/recommended speed from the event itself, for example speed\_limit 60 or road\_bump target 20\.

display\_hysteresis\_kmh  
A small UI smoothing value used only to avoid jitter around the exact target speed. It must not represent legal/enforcement tolerance.

enforcement\_tolerance  
A jurisdiction/profile-specific tolerance used only for critical/unrecoverable states and pass feedback severity.

resolved\_enforcement\_tolerance may be:  
\- absolute km/h, for example \+10 km/h or \+20 km/h  
\- percentage, for example \+5%  
\- hybrid / country-specific rule, if needed later

enforcement\_threshold\_speed \= target\_speed \+ resolved\_enforcement\_tolerance

Scope rule  
Normal guidance remains based on target\_speed.

The following states are calculated against the actual event target, not against target \+ enforcement tolerance:  
\- awareness  
\- smooth\_required  
\- normal\_required  
\- strong\_required  
\- emergency\_required

Reasoning: RoadAhead should recommend correct driving behavior, not teach the driver to consume the legal tolerance buffer as normal driving speed.

Only the following use enforcement\_tolerance:  
\- unsafe\_likely blinking threshold  
\- committed-too-fast / red-inner-circle pass feedback  
\- camera-risk feedback in Q14

Pre-pass critical behavior  
The outer red urgency ring still grows according to required deceleration toward target\_speed.

However, blinking unsafe\_likely means a stricter condition:  
the vehicle can no longer realistically pass the event at or below enforcement\_threshold\_speed without unsafe/emergency braking.

In other words, blinking means: even after considering the configured enforcement tolerance, the remaining distance and current speed are no longer recoverable safely.

Post-pass feedback tiers  
When the event is passed, compare pass\_speed against target\_speed and enforcement\_threshold\_speed.

Tier 0 — passed at/below target  
Condition:  
pass\_speed \<= target\_speed

Behavior:  
\- no pass feedback needed  
\- speed circle remains/returns neutral  
\- clear primary event  
\- transition to next primary if one is active

Tier 1 — above target, within enforcement tolerance  
Condition:  
target\_speed \< pass\_speed \<= enforcement\_threshold\_speed

Behavior:  
\- show non-critical over-target pass feedback  
\- keep the just-passed event/sign visible for pass\_feedback\_hold\_s  
\- show a red outer ring / red outline state as a stable reminder  
\- do not fill the inner white speed-circle area red  
\- do not reverse speed digits to white  
\- do not blink

Meaning:  
The driver passed above the recommended/posted target, but still within the configured enforcement tolerance. This is not treated as critical pass failure.

Tier 2 — above enforcement threshold  
Condition:  
pass\_speed \> enforcement\_threshold\_speed

Behavior:  
\- enter critical pass\_feedback\_hold  
\- keep the just-passed event/sign visible  
\- fill the inner white area of the speed circle with solid red  
\- reverse speed digits to white  
\- hold the visual state for pass\_feedback\_hold\_s

Meaning:  
The event was passed above target plus the configured enforcement tolerance. This is the clear too-fast / likely-enforcement-risk tier.

Unrecoverable-distance trigger  
Before the actual pass point, the system may also enter the critical feedback path when:  
distance\_ahead\_m \<= minimum\_unrecoverable\_distance\_m  
and current\_speed \> enforcement\_threshold\_speed

For POC V1, minimum\_unrecoverable\_distance\_m can be derived from the emergency/design deceleration profile plus a small margin, or implemented as a tunable guardrail in the emulator.

Do not transfer blinking  
Do not transfer blinking to the whole sign or to the full speed circle after pass/commit.

Blinking belongs to the pre-pass unsafe\_likely urgency ring only. Post-pass feedback should be stable and readable.

Suggested defaults  
pass\_feedback\_hold\_s \= 4 seconds  
acceptable tuning range \= 3–5 seconds

display\_hysteresis\_kmh \= 1–2  
This is for UI stability only.

enforcement\_tolerance\_profile \= configurable  
Do not hardcode one global legal tolerance.

Example profiles to verify before production:  
\- absolute \+20 km/h style profile  
\- absolute \+10 km/h style profile  
\- percentage-based profile, for example \+5%

Emulator requirement  
The interactive web route emulator should expose:  
\- target\_speed  
\- display\_hysteresis\_kmh  
\- enforcement\_tolerance profile  
\- resolved\_enforcement\_tolerance  
\- enforcement\_threshold\_speed  
\- pass feedback tier  
\- minimum\_unrecoverable\_distance\_m

Suggested answer  
Keep normal guidance based on the event target speed. Add jurisdiction-configurable enforcement\_tolerance only for unsafe\_likely blinking and pass-feedback severity. Passing above target but within tolerance gets a stable red outline hold; passing above enforcement threshold gets solid red inner circle with white digits.

---

# **18\. Decision Q14 — Camera Risk Feedback**

Question  
How should camera-risk feedback differ from normal too-fast speed-limit / speed-target feedback?

Recommended decision  
Use the same pass feedback tier model as Q13, but use a camera-risk visual variant only when the camera is passed above the enforcement threshold.

Camera risk should be a semantic variant of pass\_feedback\_hold, not a completely separate state machine.

State meaning  
For static\_camera events, the system must not claim:  
\- violation  
\- fine  
\- confirmed capture  
\- guaranteed enforcement

It should communicate only:  
possible camera risk

Trigger model  
Use the same threshold model as Q13:  
\- target\_speed is the required speed from the event  
\- enforcement\_threshold\_speed \= target\_speed \+ resolved enforcement\_tolerance

Camera feedback tiers  
If pass\_speed \<= target\_speed:  
\- no special feedback  
\- clear event / proceed to next event

If target\_speed \< pass\_speed \<= enforcement\_threshold\_speed:  
\- show non-critical over-target pass feedback  
\- keep the camera event visible briefly  
\- keep the speed circle inner area normal  
\- do not show camera-risk icon  
\- do not imply enforcement risk

If pass\_speed \> enforcement\_threshold\_speed, or the vehicle reaches an unrecoverable distance while still unable to get below enforcement\_threshold\_speed:  
\- enter pass\_feedback\_hold / camera\_risk variant  
\- keep the just-passed camera event visible  
\- fill the inner white area of the speed circle with solid red  
\- show a camera symbol/icon instead of speed digits  
\- optionally pulse/blink the camera symbol 2–3 times for extra noticeability  
\- do not blink the entire speed circle or whole sign  
\- hold the feedback state for pass\_feedback\_hold\_s

Suggested defaults  
pass\_feedback\_hold\_s \= 4 seconds  
camera\_icon\_pulse\_count \= 2–3

Pulse/blink rule  
The optional camera icon pulse is a short emphasis inside the stable hold state. It should not become an aggressive alarm. The red inner circle remains stable; only the camera symbol/icon may pulse briefly.

Reasoning  
Camera-risk feedback should feel related to too-fast pass feedback, because the underlying cause is the same: the vehicle passed a target point too fast. The difference is semantic: for a camera, the user cares that the too-fast pass may have enforcement consequences. Showing a camera icon inside the same red hold state makes that distinction without adding a second warning system.

Suggested answer  
Reuse pass\_feedback\_hold for static\_camera risk, but trigger the camera-risk visual only above the jurisdiction-specific enforcement threshold. Within tolerance, show only non-critical over-target pass feedback.

---

# **19\. Decision Q15 — Data Preparation**

Question  
Should POC V1 use raw speedcam.txt directly, or a prepared event store with geo-indexing and richer metadata?

Recommended decision  
Do not use raw speedcam.txt / raw CSV-like text as the runtime event source.

POC V1 should include an explicit data-preparation step that converts raw Datakam/OpenSpeedcam input into a prepared local event store.

The prepared store should support:  
\- normalized event schema  
\- event type mapping  
\- geo filtering / spatial lookup  
\- route-proximity candidate selection  
\- direction applicability fields  
\- source metadata  
\- future user validation / confirmation fields

Storage direction  
For POC V1, the exact engine can remain technically tunable, but the product decision is:  
raw text input is import/source material only, not runtime product data.

Candidate storage formats / engines:

1\. SQLite event store with spatial index  
Good default for POC and Android-oriented work.  
The app can store normalized events in ordinary SQLite tables and use a spatial index strategy for bounding-box / nearby-event lookup.

2\. GeoPackage-style store  
GeoPackage is attractive as a future-compatible option because it is a geospatial data container built on SQLite and supports vector features, attributes, metadata, and extensions.

3\. Plain JSON / GeoJSON  
Acceptable only as an interchange/debug artifact or tiny deterministic test fixture.  
Not preferred as the real runtime store once geo lookup and validation metadata matter.

4\. Server-side spatial database later  
For production backend, a server-side spatial database may eventually be useful for aggregation, updates, validation, moderation, and syncing. This is future work and should not block POC V1.

Suggested POC path  
\- importer reads local raw speedcam.txt  
\- importer normalizes events into prepared local store  
\- web emulator reads prepared store or generated subset  
\- raw Datakam file remains local/ignored  
\- generated full data store is not committed unless explicitly approved  
\- small synthetic or manually curated fixtures may be committed for tests

Minimum normalized event fields  
\- event\_id  
\- source  
\- source\_event\_id / source\_idx  
\- raw\_type  
\- normalized\_type  
\- lat  
\- lon  
\- route\_projection fields when computed  
\- target\_speed\_kmh, nullable  
\- direction\_type  
\- source\_direction\_deg  
\- vehicle\_applicable\_direction\_deg  
\- confidence / source\_confidence  
\- enabled\_for\_poc  
\- created\_at / imported\_at  
\- source\_dataset\_version

Future validation fields  
The data model should reserve space for user/community validation, even if the POC V1 UI does not fully implement it.

Potential future fields:  
\- validation\_status: unknown / unconfirmed / confirmed / disputed / removed\_candidate  
\- confirmations\_count  
\- rejections\_count  
\- last\_confirmed\_at  
\- last\_rejected\_at  
\- last\_seen\_by\_user\_at  
\- confirmation\_score  
\- confirmation\_expires\_at  
\- user\_added  
\- user\_added\_at  
\- user\_added\_by, if accounts exist later  
\- superseded\_by\_event\_id  
\- source\_revision

User validation product concept  
RoadAhead should eventually support:  
\- user-added events  
\- lightweight user confirmation of shown events  
\- lightweight user rejection / “not present” feedback  
\- periodic validation prompts  
\- freshness/expiry of confirmations

Prompting policy idea  
Do not ask on every event.

Possible future default:  
\- ask about roughly every 10th eligible event  
\- ask only for events with insufficient validation  
\- do not ask while driving if it would create distraction  
\- allow delayed post-drive confirmation where safer

Example confirmation rule  
An event may be treated as confirmed if:  
\- confirmations\_count \>= 5  
\- last\_confirmed\_at is not older than 3 months  
\- recent rejections do not exceed a defined threshold

This rule is only a future product heuristic, not a POC V1 hard requirement.

POC V1 scope boundary  
POC V1 should implement the data-preparation path and normalized schema.

POC V1 does not need to implement full community validation, accounts, moderation, or production sync.

However, the schema should not be a dead-end CSV mirror. It must be rich enough that validation and freshness can be added later without redesigning the event model from scratch.

Suggested answer  
Prepare the data before runtime. Raw speedcam.txt is import material only. Use a normalized local geo-indexed event store for POC V1, preferably SQLite/GeoPackage-style, and reserve schema fields for future user-added events and validation lifecycle.

20\. Decision Q16 — Direction Applicability / Route-Path Applicability  
Question  
How do we decide that a candidate sign/event really applies to the path the vehicle is taking?

Recommended decision  
Treat direction applicability as a separate WIP decision, not as a one-line default.

POC V1 should use a conservative route-path applicability model. A candidate event should be selected only when there is enough evidence that it applies to the vehicle's current or assumed path.

Core principle  
The system should not show a sign merely because it is geographically near the vehicle.

The event should be applicable to:  
\- the same road/path branch the vehicle is currently following;  
\- a future point ahead on that path;  
\- the direction from which the vehicle will approach the sign/event.

Route-path rule  
If explicit route geometry exists, candidate events should be projected onto that route/polyline and evaluated by route position, not only by straight-line distance.

Required checks:  
\- event projects near the current route/path;  
\- event\_route\_position\_m is ahead of vehicle\_route\_position\_m;  
\- no unresolved branch ambiguity exists between the vehicle and the event;  
\- event direction is compatible with the route approach direction near the event.

Direction field interpretation  
Current working assumption:  
Datakam/OpenSpeedcam DIRECTION likely represents the direction the sign/camera is facing.

Therefore approximate vehicle applicable direction is:  
vehicle\_applicable\_direction\_deg ≈ (DIRECTION \+ 180\) mod 360

But this must not be the only check.

Curved-road rule  
On curved roads, comparing the sign direction only to the vehicle's current heading may be wrong. The vehicle may currently be approaching through a large curve, and the sign may be correctly oriented toward the road segment immediately before the event.

For direction applicability, compare sign/camera direction against local route geometry near the event:  
\- route approach tangent before the event;  
\- or average route bearing over a short approach window before the event;  
\- not just straight-line bearing from the vehicle's current position to the event.

Suggested debug fields:  
\- source\_direction\_deg  
\- vehicle\_applicable\_direction\_deg  
\- route\_approach\_tangent\_deg  
\- direction\_delta\_deg  
\- event\_route\_position\_m  
\- vehicle\_route\_position\_m  
\- branch\_ambiguity\_state  
\- applicability\_decision  
\- applicability\_reason

Intersection / branch ambiguity rule  
If the vehicle is approaching a T-junction, fork, or intersection and the system does not know which way the vehicle will go, events beyond the unresolved branch should not be shown as primary/secondary.

Behavior:  
\- keep showing events that are clearly on the current approach path;  
\- suppress events beyond an ambiguous branch until route choice is known;  
\- once the vehicle turns or the route path is explicit, recompute primary and secondary events for the new path.

Assumed-main-road rule  
If the route/path indicates that the vehicle continues along the main road, the system may select events along that path.

If no route is available and the road geometry is ambiguous, do not pretend to know the future branch. Conservative suppression is better than showing a wrong sign.

Turn/deviation rule  
If the vehicle turns away from the previously assumed path:  
\- clear or re-evaluate current primary/secondary events;  
\- reproject the vehicle onto the new path;  
\- select new events from that new route context.

POC V1 scope  
POC V1 should not try to solve all real navigation ambiguity.

But the WIP spec should explicitly state that event selection is route/path applicability, not pure nearest-point lookup.

Minimum for the web emulator:  
\- explicit route geometry preferred;  
\- route-projected candidate selection;  
\- direction compatibility check using local route approach tangent;  
\- conservative suppression at unresolved branches.

Open tuning questions  
\- initial direction\_delta\_deg threshold;  
\- route approach window length near the event;  
\- how to detect branch ambiguity in the first web emulator;  
\- how to handle visually correct Datakam points whose DIRECTION field conflicts with route geometry.

Suggested answer  
Use conservative route-path applicability. A candidate event is eligible only if it projects ahead on the current/assumed route path and its sign/camera direction is compatible with the local approach direction near the event. Suppress events beyond unresolved branches until the path is known.

21\. Working Decision Snapshot for Cursor WIP Revision  
Purpose  
This section is not Canon and not an implementation plan.

It is a compact snapshot of the current working answers that Cursor should use to produce the next fuller WIP spec revision.

Process state  
Current phase:  
WIP clarification / product decision workbook.

Not current phase:  
\- Canon decision record;  
\- implementation slicing;  
\- implementation issues;  
\- code implementation;  
\- current-state doc.

Validation target  
Interactive web route emulator first.

The emulator should use explicit route geometry and move a simulated vehicle along the route. Route provider speed/ETA/traffic speed must not be treated as RoadAhead speed truth. Simulated speed is manually controlled.

Initial event types  
Include by default:  
\- TYPE=101 speed\_limit  
\- TYPE=1 static\_camera  
\- TYPE=102 road\_bump

Exclude by default:  
\- TYPE=106 other\_danger  
\- other camera types  
\- dangerous\_turn  
\- bad\_road  
\- pedestrian\_crossing

Camera scope  
Start with static\_camera only. Other camera types are deferred unless they can safely reuse identical point-event semantics.

Event visibility / threshold model  
Primary rule:  
dynamic action-horizon threshold based on current speed, target speed, route-projected distance, reaction time, and required deceleration.

Distance values are fallback guardrails / max lookahead caps, not the primary trigger.

Initial braking profiles for tuning:  
\- smooth\_deceleration: 1.0 m/s²  
\- normal\_deceleration: 1.5 m/s²  
\- strong\_deceleration: 2.5 m/s²  
\- emergency/design\_deceleration: 3.4 m/s²

Event priority / conflict handling  
Use route order.

Primary event \= nearest applicable event ahead on the current route/path.

Do not implement event-type override priority in POC V1.

Chain logic  
Secondary event \= next applicable event after primary.

Secondary visibility uses the same dynamic action-horizon idea, assuming current speed continues.

Secondary does not affect the speed urgency ring until it becomes primary.

Speed reference model  
Active POC V1 modes:  
\- unknown  
\- approach\_target

Temporary visual state:  
\- pass\_feedback\_hold

Future/deferred mode:  
\- provisional\_limit

POC V1 must not imply current legal speed-limit knowledge after a sign is passed.

Provisional limit validity  
No active provisional\_limit UI/compliance logic in POC V1.

Optional recent\_passed\_speed\_candidate memory may live for 30–60 seconds as context only.

Approach urgency  
The left/current-speed circle uses continuous live required-deceleration bands.

Normal guidance is based on target\_speed, not target\_speed \+ enforcement\_tolerance.

Neutral when:  
current\_speed \<= target\_speed \+ display\_hysteresis\_kmh

Initial UI fields:  
\- red\_ring\_alpha  
\- selected urgency state  
\- required\_deceleration\_mps2  
\- time\_to\_event\_s  
\- distance\_ahead\_m

TYPE=106  
Excluded by default. May later be enabled only as railway-like danger candidate in manually familiar regions.

Testing strategy  
Interactive route-emulator simulation is mandatory for POC V1 development. The emulator should expose enough debug state to tune and review behavior without driving.

Layout  
Horizontal three-circle layout only for POC V1. Vertical layout deferred.

Pass feedback  
Add display\_hysteresis\_kmh separately from enforcement\_tolerance.

Defaults:  
\- display\_hysteresis\_kmh: 1–2 km/h  
\- pass\_feedback\_hold\_s: 4 seconds  
\- enforcement\_tolerance\_profile: configurable

Pass feedback tiers:  
\- Tier 0: pass\_speed \<= target\_speed; no pass feedback  
\- Tier 1: target\_speed \< pass\_speed \<= enforcement\_threshold\_speed; stable red outer ring / outline hold  
\- Tier 2: pass\_speed \> enforcement\_threshold\_speed; solid red inner speed circle with white digits

Unsafe blinking  
Blinking is pre-pass only and means the vehicle can no longer realistically pass at or below enforcement\_threshold\_speed without unsafe/emergency braking.

Camera risk  
Camera risk reuses pass feedback tiers.

Camera-risk icon variant appears only above enforcement threshold. Optional camera icon pulse count: 2–3. Do not blink the whole speed circle or whole sign.

Data preparation  
Raw speedcam.txt is import/source material only.

Runtime source should be a prepared normalized local geo-indexed event store.

Candidate formats:  
\- SQLite spatial-indexed event store  
\- GeoPackage-style store  
\- JSON/GeoJSON only for tiny fixtures/debug/interchange

Schema should reserve fields for future user-added events and validation/confirmation lifecycle.

Direction applicability  
Direction applicability is not finalized as a one-line formula.

Working direction:  
\- use route/path projection;  
\- require event to be ahead on the current/assumed path;  
\- compare direction against local route approach tangent near the event;  
\- suppress events beyond unresolved branch ambiguity.

22\. Technical / Research Questions for Cursor Recommendation  
Status  
The items below are not all product/vision decisions. Several require technical recommendation, empirical tuning, or staged validation in the web emulator and later on a moving device.

Cursor should not ask the product owner to guess exact thresholds where an engineering proposal is more appropriate. Cursor should propose reasonable defaults, explain tradeoffs, and mark what must be validated experimentally.

Direction applicability  
Preliminary product answer:  
The product requirement is conservative route-path applicability. The exact thresholds are technical/tuning questions.

Cursor should propose an initial solution for:  
\- direction\_delta\_deg threshold;  
\- route approach window near the event;  
\- branch ambiguity handling at T-junctions/forks/intersections;  
\- behavior when Datakam DIRECTION conflicts with route geometry but visual QA suggests the point is correct.

Expected approach:  
\- use route/path projection;  
\- compare sign/camera direction to local route approach tangent near the event;  
\- suppress events beyond unresolved branches;  
\- expose debug fields in the emulator;  
\- tune with WEB experiments first, then with real-device movement tests.

Route geometry provider  
Preliminary product answer:  
Yandex remains the first working assumption for a Russia-focused POC if it is the simplest technically feasible route-geometry provider.

Cursor should verify:  
\- whether Yandex can provide the needed route polyline/geometry cleanly;  
\- API/key/pricing/terms constraints relevant to a local POC;  
\- whether integration complexity is lower than OSRM/GraphHopper for the first Russia-focused emulator.

Working fallback expectation:  
\- GPX/KML/GeoJSON imported route should be treated as an important fallback for the first emulator;  
\- manually defined polyline can remain a debug fallback;  
\- OSRM/GraphHopper should likely be deferred until after the basic emulator works, unless Cursor finds Yandex impractical.

Prepared event store  
Preliminary product answer:  
The product requirement is prepared normalized data, not raw speedcam.txt at runtime. Exact storage engine is open to technical recommendation for the current stage.

Cursor should propose a staged data path.

Acceptable direction:  
\- WIP should preserve SQLite/GeoPackage-style geo-indexed store as the intended product/Android-friendly direction;  
\- the very first repo step may use a normalized JSON/GeoJSON fixture if that is materially simpler for WIP/emulator iteration;  
\- raw speedcam.txt remains import-only and uncommitted;  
\- any committed fixture must be small, synthetic or manually curated, and safe to keep in the repo.

Cursor should recommend whether to start with:  
\- SQLite \+ spatial index immediately; or  
\- normalized JSON/GeoJSON fixture first, with explicit migration path to SQLite/GeoPackage.

Validation lifecycle  
Preliminary product answer:  
User validation is out of scope for POC V1 and should not become a first-version implementation requirement.

Keep only the data-model extensibility:  
\- reserve fields for future validation/confirmation lifecycle;  
\- do not implement validation prompts;  
\- do not implement accounts, moderation, sync, or community validation;  
\- do not decide exact confirmation heuristics now.

The previously discussed ideas, such as 5 confirmations and last confirmation not older than 3 months, should be treated as future product notes only.

Enforcement profiles  
Preliminary product answer:  
For POC Russia-focused emulator, use Russia \+20 km/h as the initial default enforcement profile.

But the system should be modeled as configurable from the start.

Future product direction:  
\- generic default may be percentage-based, for example 5%;  
\- known jurisdiction overrides should be supported, for example Russia \+20 km/h and Belarus \+10 km/h;  
\- user may eventually add custom exceptions if they know local rules and want RoadAhead to account for them.

POC requirement:  
\- emulator should expose enforcement\_tolerance\_profile;  
\- default profile for the first Russia-focused POC \= Russia \+20 km/h;  
\- allow switching profile in the emulator if cheap to implement, otherwise keep as a visible config field.

23\. Cursor Handoff Instructions  
Cursor should use this document as input to revise the WIP spec, not to implement code.

Expected Cursor task  
Produce a fuller updated WIP spec from:  
\- baseline WIP spec: docs/product/wip/roadahead-poc-v1-three-circle-assistant.md  
\- this decision workbook

Cursor should:  
\- preserve the WIP status;  
\- integrate accepted working decisions into the WIP spec;  
\- explicitly mark unresolved questions as open items;  
\- remove or avoid outdated fixed-distance / fixed-priority assumptions;  
\- include direction applicability as a dedicated WIP section;  
\- include data preparation / event store as a dedicated WIP section;  
\- avoid creating Canon language unless specifically instructed;  
\- avoid implementation slices/issues unless separately instructed.

Cursor should not:  
\- create a decision record yet;  
\- create implementation issues yet;  
\- implement code yet;  
\- commit raw Datakam data;  
\- treat this document as Canon.

24\. Intended Process After WIP Revision  
Process order:  
WIP \-\> Canon \-\> Implementation slicing \-\> Implementation issues \-\> Implementation \-\> Current state doc.

Near-term next artifact  
The next repo artifact should be an updated WIP spec, or a PR containing only the WIP/documentation update, not implementation issues.

After the updated WIP is reviewed:  
\- decide which parts are stable enough for Canon;  
\- create decision record(s) under docs/decisions/;  
\- update issue \#17 with accepted decisions;  
\- only then create implementation slice issues.

