# Developer guide

Start with `src/engine.js` to understand the rules, or `src/app.js` to follow the interface. The app uses JavaScript modules without a framework or bundler.


## Which file owns what?

| File | Responsibility |
| --- | --- |
| `index.html` | Page metadata, stylesheets, app mount, and script entry point. |
| `src/app.js` | Application state, event handlers, screen transitions, flight timing, and connecting the modules. |
| `src/engine.js` | Design checks, resource calculations, incident scheduling, response effects, and scoring. No DOM or browser-storage access. |
| `src/game.js` | Tutorial text, term explanations, advisor-facing incident explanations, stars, and rank progression. |
| `src/storage.js` | Reading and writing browser saves, legacy-key migration, and recovery from storage errors. |
| `src/ui/parts.js` | Markup for the Orbit, Rocket, Systems, and Science controls. |
| `src/ui/flight.js` | Markup for flight telemetry, pace buttons, and operating-mode controls. |
| `src/ui/icons.js` | Shared inline SVG icons. |
| `src/orbit.js` | Procedural globe and design-screen orbital animation. |
| `src/flight-view.js` | Rocket ascent, orbital flight, incident visuals, and paused scenes. |
| `src/audio.js` | Rocket, ambience, warning, repair, and outcome sounds using Web Audio. |
| `data/*.json` | Mission briefs, orbits, launchers, instruments, advisors, and incident choices. |
| `styles.css` | Shared console layout and responsive styles. |
| `assets/game.css` | Introduction, tutorial, progression, and debrief styles. |
| `assets/flight.css` | Flight viewer and live operating controls. |
| `sw.js` | Offline asset list and network-first cache. |
| `scripts/serve.js` | Local static HTTP server. |

Keep new code beside the feature it belongs to. Pure view functions return markup; event handlers and DOM changes belong in the controller. Simulation calculations belong in the engine, so the UI and reports use the same rules.

## The game loop in code

1. `init()` loads the JSON catalogs and restores valid browser saves.
2. A design control changes `state.design`.
3. `evaluate()` calculates the gauges and pre-flight issues.
4. `createFlight()` captures the design and starts a seeded flight.
5. `advanceFlight()` advances the clock up to the next incident or mission end. It stops while an incident is active.
6. `resolveEvent()` applies a response and schedules the next risk check.
7. `flightStatus()` supplies live forecasts and choice previews. `flightReport()` uses the same calculations for the result.

Engine functions return new flight state instead of changing the caller's flight object. The controller owns animation timers and passes the updated state to the canvas renderer. Playback speed changes time advancement; it does not replace the incident rules.

## The teaching model

Solar flare observations come from NASA DONKI. `src/space-weather.js` validates the feed and maps recorded classes to game effects; `data/nasa-flares.json` provides verified offline examples. Flights, archive saves, and exports retain the observation snapshot. See [NASA data and game rules](NASA-DATA.md) for attribution, API fields, and the distinction between observations and simulated consequences.

Hardware and launchers are fictional. The calculations are deliberately simplified:

- Mass adds the bus, instruments, panels, battery, antenna, and computer. Orbit changes the rocket's available capacity.
- Solar area and sunlight fraction determine generation. Instrument observing time determines demand; batteries must cover a simplified eclipse.
- Instruments generate data, while antenna size and contact time limit the downlink.
- Cost includes hardware, launch, operating years, and incident spending.
- Fuel, battery reserve, and radiation tolerance limit lifetime.
- Returned science accounts for observing time, communication, hardware health, power, operating life, and incident losses.

During flight, Conserve, Survey, and Push limits change observation yield, power demand, and risk. The engine records time spent in each mode. Incident probability also depends on reserves, health, difficulty, and previous responses. A seeded generator makes runs reproducible when the inputs and decisions match.

Scores reward science returned, completion, health, resource efficiency, and engineering margins. Improving the previous result in the same mission can add a learning bonus. See `flightReport()` for the current weights and `earnedStars()` for star thresholds.

The globe and flight paths are illustrations. They do not calculate precise contact geometry or real trajectories. Advisor trust measures engineering margins; the advisors use scripted rules.

## Editing content and code

- Change mission targets and hardware values in `data/`, then verify the mission still has a winning design.
- Add a new instrument's values in `data/parts.json`. Check its effects on mass, power, data, and budget.
- A new incident needs both its JSON choices and its risk/explanation handling in `src/engine.js` and `src/game.js`.
- When adding a browser module or asset, add its URL to `sw.js` and change the cache version. Otherwise offline play may miss it.
- Keep `eslint.config.js` rules intact. Run `npm run lint:fix`, review the diff, then run `npm run lint`.

## Saves and replay

The browser stores saved designs, recent flights, progression, sound preference, and the current design/tutorial step. The storage adapter can read the previous `missionforge-` keys and migrate them to `missionx-` keys. Invalid JSON or the wrong collection type falls back to a safe default. Designs are checked before their resource values are calculated.

Closing the viewer can resume a flight in memory. Reloading the page starts a new application session; it restores the design, not the running flight.

An archived flight restores its seed, design, difficulty, and training flag. Reproducing the exact result also requires the same responses and operating-mode changes at the same times. Flight-record exports include those mode changes. Engine updates can change results from older seeds.

## Testing

```sh
npm run lint
npm test
```

The Node tests cover trade-offs, compatibility checks, incident timing and counts, seeded replay, operating modes, progression, sound lifecycle, and storage recovery. Add tests for meaningful behavior changes rather than for each markup fragment.

Browser checks are optional and require an available Playwright installation and Chromium browser. With the local server running:

```sh
node tests/browser.js
node tests/onboarding.js
node tests/nasa-browser.js
```

If these dependencies are installed outside this project, set `PLAYWRIGHT_MODULE` to that Playwright package and `CHROME_PATH` to the browser executable. They are not included in the normal `npm ci` dependencies. Screenshots are written to ignored `tmp/screenshots/`.

[Back to the README](../README.md)
