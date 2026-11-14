# MissionX

**Design it. Launch it. Find out why it burned.**

A solo spacecraft-design game about systems thinking. A camera is never just a camera: it adds mass, consumes power, produces data, and changes what your rocket and antenna need to do.

Built from the supplied project brief in **plain JavaScript, HTML, and CSS**. No TypeScript, framework, backend, API keys, external fonts, or runtime packages. ESLint and `globals` are development dependencies.

## Run

Use Node.js 20.19+, 22.13+, or 24+ to match ESLint's supported versions. The game server needs no runtime packages; install the development tooling with:

```sh
npm ci
```

```sh
npm run dev
```

Open **http://127.0.0.1:4173**. Use a local server rather than opening `index.html` directly: ES modules, JSON loading, and offline caching require HTTP.

```sh
npm test       # 29 simulation, gameplay, and audio tests
npm run lint  # check JavaScript against eslint.config.js
npm run lint:fix # apply fixes that ESLint can safely automate
npm run build # publishable static files in dist/
```

## What is playable

- A new-player start screen with a clear story, objective, and **Play your first mission** button.
- A five-step guided build: choose a flight path, choose a rocket, add battery reserve, increase camera observing time, and run the launch checklist. Guidance saves across reloads and can be skipped.
- Plain-language explanations beside each design tab. 
- A visible science target and Build → Launch → Survive → Debrief progress tracker.
- Crisis choices show actual predicted effects using the same engine as the final report. A separate consequence screen connects each decision to battery, science, health, and spending changes.
- Mission completion stars, persistent best scores and ranks, clear win/loss goals, and a **Next challenge** action. All scenarios remain available to experiment with.
- Four mission briefs: Hello, Orbit; Lunar Ice Hunter; Against the Odds (Apollo-13 mode); Open Cosmos (sandbox).
- Cadet, Engineer, and Flight Director difficulty. All use variable incident timing and counts. Cadet reduces penalties and risk; Flight Director raises them.
- Orbit → launcher → spacecraft bus → payload design sequence.
- Six linked gauges, animated change indicators, and live advice from Maya, Dr. Kofi, and Chief Okoye.
- Original canvas globe, animated orbit, sun/eclipse context, and ground-contact visualization.
- Pre-flight checks for mass, orbit compatibility, power, eclipse battery reserve, downlink, funding, lifetime, and required instruments.
- Countdown, launch sequence, accelerated mission clock, returned-data telemetry, and one to three unpredictable, seeded incidents.
- An animated rocket ascent with exhaust and booster separation, followed by a moving satellite in orbit. The flight pauses automatically when a crisis occurs. Apply a response, review the consequence, and click **Resume flight** to continue from that point. A flight ends when its mission clock is complete, rather than after a predetermined incident count.
- Manual **Pause flight / Resume flight** controls and 0.5×, 1×, 2×, 4×, and 8× playback speeds. These adjust the accelerated visual simulation, not real-world trajectory physics. Closing a flight pauses it; the console's **Resume mission** button restores the current ascent, travel segment, or crisis.
- Guaranteed solar-array damage in the Apollo scenario.
- Scored debrief, causal failure explanations, redesign suggestions, and a learning bonus for improving a previous run.
- Three recent flights compared side by side, three saved designs, automatic session restore, and JSON flight-record export.
- Downloadable SVG mission patch, opt-in synthesized sound, reduced-motion support, keyboard controls, and responsive mobile layouts.
- Offline play after the first complete online load and successful service-worker installation.

## How to play

For your first flight, click **Play your first mission** on the start screen. Maya guides you through five real design decisions in Cadet difficulty. Follow the highlighted controls and use **Continue guided mission** below the parts or the coach's button above them. Add at least 400 Wh of battery storage and set the camera's **Time spent observing** to 100%. Your first crisis is a battery fault, so the extra storage has an immediate, visible purpose.

The guided flight teaches a battery fault first, at a random time. Other incidents remain unpredictable. Isolating a faulty section reduces future risk; cycling the battery increases hardware stress. There is no fixed three-event itinerary. The Apollo rescue similarly guarantees a damaged array, with random timing.

Normal-speed orbital play lasts 120 seconds. A quiet interval usually lasts 15–40 seconds or longer. The first incident is guaranteed; later checks may produce no incident. Flights therefore have one, two, or three incidents, with no duplicates. Risk depends on power and battery reserves, communication load, health, difficulty, operating mode, and previous responses. New launches get fresh random seeds; loading an archived flight restores its seed.

The live **Conserve / Survey / Push limits** controls trade science return for risk and power demand. Science accounts for time spent in each mode, so switching modes at the end cannot erase earlier costs. Playback speed changes how quickly the mission unfolds and how quickly the satellite moves; it does not change the underlying seeded risk calculation. Use **Space** to pause, **[ / ]** to slow down or speed up, and **M** to toggle sound while the flight viewer is open.

Sound begins muted and has a control inside the viewer as well as in the header. It includes rocket rumble, quiet orbital ambience, telemetry pings, incident alerts, response confirmation, and win/loss effects. Pausing stops the background audio; muting silences every effect. These sounds are original Web Audio synthesis, with no downloaded files.

Click the MissionX logo to return to the start screen, or **Guided mission** above the console to start the lesson again. **Explore on my own** exits guidance. In free play, read the science target as well as the budget and lifetime. The initial Hello, Orbit payload has only 75% observing time: increase it in **Science**, then leave capacity for emergencies.

The pre-flight review checks whether the spacecraft can operate. It deliberately allows a physically valid but scientifically underpowered design to launch, so the player can learn from the debrief. The launch status explicitly warns about insufficient projected science.

Use the tabs or **Next** to configure the spacecraft. Sliders update all affected systems immediately. **Enter** opens launch when focus is outside a control. The orbit animation and audio have independent controls. A flight closed during a crisis can be resumed with **Launch mission**; changing the design starts a new flight.

**Flight archive** is where you reload saved designs or replay a completed flight. Loading a completed flight restores its seed, difficulty, and design so it can be repeated. Only the latest three flights are retained. Local browser storage can be cleared by the browser; export a record if you need a portable copy.

## Code map

```text
index.html             Document and application entry point
styles.css             Console design, dialogs, responsive layouts, motion rules
src/app.js             UI rendering, user actions, flights, storage, exports
src/engine.js          Pure calculations, shared flight forecasts, events, scoring
src/game.js            Tutorial steps, plain-language explanations, stars, ranks
src/orbit.js           Procedural planet and canvas orbital visualization
src/flight-view.js     Animated ascent, orbital travel, frozen crises, and repairs
src/audio.js           Synthesized rocket, ambience, warning, and outcome sounds
data/                  Missions, orbits, launchers, parts, advisors, crisis content
assets/mark.svg        Original MissionX mark
assets/game.css        Start screen, coaching, mission progression, consequences
assets/flight.css      Flight viewer, telemetry, playback controls, mobile layouts
sw.js                  Network-first offline cache
scripts/serve.js       Local static server using Node's standard library
scripts/build.js       Static production packaging
tests/engine.test.js   Causal trade-offs, compatibility, replay, and winning paths
tests/random-flight.test.js  Variable timing, counts, risk, decisions, and flight modes
tests/audio.test.js    Muting, background lifecycle, warnings, and repair effects
tests/browser.js       Optional end-to-end browser verification
tests/onboarding.js    Optional complete first-player journey verification
docs/DEMO.md           Three-minute pitch and a verified demonstration design
```

Mission content and hardware values live in JSON. The engine takes a design and content catalog; it does not import the UI, mutate inputs, or access browser state. Crisis effects are shown before the player commits. Event selection is seeded; responses have deterministic consequences, making redesigns comparable.

## Model and scoring

These are **educational approximations with fictional hardware**, not real flight specifications.

- **Mass:** dry bus + solar area + battery + antenna + computer + instruments, checked against orbit-adjusted launcher capacity.
- **Power:** solar area × 110 W/m² × orbit sunlight fraction, compared with bus and duty-weighted instrument consumption.
- **Eclipse:** storage must support instrument and bus demand throughout the simplified eclipse interval.
- **Data:** instrument rates × observing duty. Antenna aperture × orbit contact factor determines daily return capacity.
- **Budget:** launcher + hardware + operating years. Emergency ground-station rental also counts in the final budget.
- **Lifetime:** the minimum of fuel, battery reserve, and radiation tolerance. Crisis fuel use reduces it.
- **Returned science:** instrument value × duty × downlink × target compatibility, adjusted during flight by power, battery availability, health, operating life, and crisis decisions.
- **Score:** up to 500 science points, 180 for meeting every mission objective, 100 for health, 100 for engineering margins/advisor trust, and 100 for resource efficiency. Improving the last flight in the same scenario adds 25, capped at 1,000 total.

Advisor trust measures engineering margins behind the crew's warnings. It is a rule-based score, not a conversational AI evaluation. Orbit positions and contact animation illustrate the concept; they do not feed precise geometry into the simplified contact-time model. The Moon is an illustrative shaded sphere rather than a terrain model.

Mission stars require a successful outcome: one for completion, two for a score of at least 750, and three for at least 900. Campaign progress stores each mission's best result independently of the three-flight comparison history, so a weaker later flight does not erase stars. Ranks advance with the number of different missions achieved. Training replays retain a `guided` flag as well as the seed and difficulty. Exact replay also requires the same responses and operating-mode changes at the same mission times. Exported records include those mode changes. Older archived flights use the current engine rules when replayed.

## Verification

`npm test` covers causal subsystem changes, invalid launches, eclipse reserve, target compatibility, sandbox limits, seeded replay, immutable event resolution, Apollo's forced failure, successful solutions in every scenario, power-margin consequences, and learning bonuses.

The optional browser suite requires Playwright and an installed Chromium browser. With the local server running:

```sh
node tests/browser.js
node tests/onboarding.js
```

You can set `PLAYWRIGHT_MODULE` to an existing Playwright installation and `CHROME_PATH` to an existing Chrome executable. Browser checks cover the complete launch-to-report loop, launch scrubbing, patch download, design persistence, scenario changes, responsive widths, and offline reload. Screenshots go to ignored `tmp/screenshots/`.


See `docs/DEMO.md` for the pitch and demo sequence
