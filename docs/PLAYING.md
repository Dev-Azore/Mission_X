# How to play MissionX

You are the mission director. Build a satellite, launch it, and decide what to do when something breaks. Your choices determine whether the mission succeeds.

For a first game, select **Play your first mission**. Follow Usama's highlighted steps. You can choose **Explore on my own** to leave the tutorial, or **Guided mission** above the console to return to it.

## What does the NASA panel mean?

The space weather panel uses NASA's DONKI solar flare records. Open **View source** to see a real observation and its NASA link. **Recent NASA records loaded** means the game fetched observations from the past 30 days. **Using saved NASA examples** means it is using verified historical records

If a solar flare challenge occurs, its class and date appear beside your response choices. X-class examples create a harder trade-off than M-class examples. Choose a response, inspect the result, then press **Resume flight**. Incident timing and spacecraft damage are game rules; the NASA record does not mean your satellite faces a real warning today. Flare challenges remain random, so one might not occur on every flight.

## What are we trying to accomplish?

Each mission has four goals:

1. Return the required number of science points.
2. Stay within the budget, except in the sandbox.
3. Have enough operating life for the required number of years.
4. Finish with at least 50% satellite health.

Science points represent useful research in the game. They are separate from your overall mission score.

| Mission | Your job |
| --- | --- |
| **Hello, Orbit** | Monitor flooding on Earth. Start here and use the multispectral camera. |
| **Lunar Ice Hunter** | Look for water ice around the Moon using an infrared spectrometer. |
| **Against the Odds** | Survive a damaged solar array. Extra power capacity is especially useful. |
| **Open Cosmos** | Experiment without a money limit. Weight, power, communication, and lifetime still matter. |

Cadet offers more guidance and smaller penalties. Engineer is the standard difficulty. Flight Director increases risk and penalties. All missions are available from the start.

## The four design tabs

Think of the satellite as a small research station: the rocket delivers it, the support systems keep it running, and the instruments do the research.

| Tab | Meaning | Your decision |
| --- | --- | --- |
| **Orbit** | The path around Earth or the Moon. | Choose where the satellite travels. Sunlight, shadow, and contact time affect the design. |
| **Rocket** | The launch vehicle carrying the satellite. | Choose enough carrying capacity without overspending. |
| **Systems** | The spacecraft bus: its support equipment. | Choose solar panels, a battery, an antenna, and a computer. |
| **Science** | The payload: cameras and scientific sensors. | Choose the equipment that meets the mission's research goal. |

Solar panels generate electricity. Batteries provide it in shadow, called an **eclipse**. An antenna sends observations home; this is the **downlink**. A hardened computer tolerates radiation better.

Under Science, **Time spent observing** sets how often an instrument collects observations. More observing time earns more science, but uses more power and produces more data.

The starting Hello, Orbit design uses 75% camera observing time and projects 48 science points. Its target is 55. Raising the camera to 100% projects 64 points before flight losses.

## Reading the six gauges

| Gauge | What to watch |
| --- | --- |
| **Mass** | The rocket must carry the satellite's weight. `kg` means kilograms. |
| **Power** | Generation must cover demand. A positive number is spare electrical power, measured in watts (`W`). |
| **Science data** | How much information the instruments produce each day, measured in gigabytes (`GB/day`). |
| **Comms coverage** | Whether all those observations can reach home. Above 100% means spare transmission capacity. |
| **Budget** | Hardware, launch, and operating costs. `$95M` means 95 million game dollars. |
| **Mission lifetime** | Estimated operating life, measured in years (`yr`). |

Leave reserves. Enough power for normal operation may be too little after damage. More battery storage, measured in watt-hours (`Wh`), can help a satellite survive a failed battery section.

Usama explains engineering risks. Dr Danbaiwa watches the science target. Chief Okoye watches spending and reserves. Their advice comes from rules applied to your design.

## Buttons before launch

| Button | What it does |
| --- | --- |
| **Reset** | Restore this mission's starting design. Saved designs and results stay in the archive. |
| **Save design** | Keep a copy in this browser's Flight archive. This does not launch the satellite. |
| **Next / Review** | Move through the design tabs or open the checklist. |
| **Pre-flight checklist** | Check launch capacity, power, battery reserve, downlink, budget, lifetime, target orbit, and required instruments. |
| **Launch mission** | Begin the flight when the design passes those checks. |
| **Flight archive** | Load a saved design or compare the last three completed flights. |

The checklist checks whether the satellite can operate. It can allow a design that has too little science to win; the scientist and launch status warn about that. **Launch scrubbed** means a compatibility check failed. Read its suggested fix and adjust the design.

## Playing the flight

Watch the rocket climb and deploy the satellite. In orbit, you control pace and operating mode:

- **0.5×** slows the simulation. **1×** is normal pace; **2×, 4×, and 8×** accelerate it.
- **Conserve** lowers risk and observation yield.
- **Survey** balances observations and risk.
- **Push limits** increases observations, power demand, and risk.
- **Pause flight** stops movement and the mission clock.
- The **speaker button** enables sound. It starts muted on a new browser profile and remembers your preference.

While the flight viewer is open, **Space** pauses or resumes, **[** slows down, **]** speeds up, and **M** toggles sound.

Normal orbital play lasts 120 seconds, excluding launch, pauses, and time spent deciding. Quiet stretches are usually 15–40 seconds or longer at 1×. A flight has one to three incidents. The first is guaranteed; later incidents depend on risk and chance. A safer response can reduce later risk. The tutorial teaches a battery fault first, and the rescue mission guarantees array damage; their timing is still unpredictable.

## When a problem occurs

The flight pauses automatically. Read the explanation and predicted effects, choose a response, and review the result. Click **Resume flight** to continue with the updated spacecraft.

For example, a **battery module** is one section of its battery pack:

- **Isolate the module:** disconnect the faulty section. You lose 25% of storage, but healthy battery sections remain available.
- **Cycle the battery:** try to recover capacity. You keep the storage, but interrupt research and stress the hardware.

Your reserves determine which response makes sense. Other incidents may require fuel to avoid debris, money to rent a ground station, or observing time to protect electronics from a solar flare. The preview shows the actual consequences for the selected difficulty.

## Results and the next attempt

The report shows which goals you met and explains failures, such as power loss leading to fewer observations. Use **Redesign & fly again** to improve the design, or **Next challenge** after a success.

A successful mission earns one star. Scores of 750 and 900 earn a second and third star. Failed missions earn no stars. Best results and ranks persist even if a later attempt goes badly.

You can keep three saved designs and compare three recent flights. **Mission patch** downloads a commemorative SVG badge. **Flight record** downloads the design, seed, operating changes, decisions, and result as JSON.

[Back to the README](../README.md)
