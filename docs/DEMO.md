# MissionX — three-minute demo

## The opening 

“Space missions fail at the connections. An extra camera needs electricity, a bigger antenna, and sometimes a bigger rocket. MissionX lets students play those decisions and see the consequences.”

Open the game and choose **Play your first mission**. Introduce the flood-monitoring objective: 55 science points, $95M, two years, and at least 50% satellite health.

Point out the NASA space weather panel: “MissionX uses real NASA DONKI solar flare observations. The observation class changes the challenge's trade-off, and every sourced alert links to its original record. Our spacecraft consequences are an educational simulation.” Open **View source** to show provenance even if the random flight does not encounter a flare. If the connection is unavailable, identify the saved May 2024 examples as historical data.

## Build with purpose

Follow Usama's highlighted instructions. Confirm the sun-synchronous path and Atlas rocket, increase the battery to 400 Wh, and set camera observing time to 100%.

“The rocket carries the satellite. The support systems keep it alive. The camera does the research. We are packing spare battery capacity because we cannot predict everything that will happen.”

Show the linked gauges and the readiness checklist, then launch.

## Play the flight

Watch the rocket climb and separate its boosters. Enable sound if appropriate for the room: rocket rumble becomes quiet orbital ambience after deployment.

Start at 1× briefly, then use 2× or 4× to fit the presentation. Use 0.5× to demonstrate slowing the orbit. **Space** pauses, **[ / ]** changes pace, and **M** toggles audio while the flight viewer is open.

Point out the live operating modes:

- **Conserve:** lower risk and fewer observations.
- **Survey:** balanced operation.
- **Push limits:** more observations with higher power demand and risk.

Show the risk indicator changing, then return to Survey for the teaching flight. A normal-speed flight lasts 120 seconds; quiet intervals are usually 15–40 seconds or longer. Incident timing is hidden, and the flight may contain one, two, or three incidents.

“We control how hard the satellite works. The timeline is not a list of scheduled disasters.”

## Respond, recover, resume

The guided mission guarantees a battery fault as its first teaching incident, but its time is random. The flight freezes and an alert sounds.

Read Usama's explanation: a module is one section of the battery. Choose **Isolate the module**. Show battery storage falling from 400 to 300 Wh while science remains protected. Connect that result to the reserve the player deliberately built.

Click **Resume flight**. The same spacecraft continues from the same mission position with its updated condition.

Additional incidents are not guaranteed. If another appears, read the trade-off and respond. Safe responses can lower later risk; stressed or damaged hardware can make later problems more likely. Renting a partner station preserves data at a cost; safe mode protects electronics at the cost of observations.

Do not promise an exact incident order or count. If presentation time is short, switch to 8×. Speeding playback does not change the underlying seeded risk schedule.

## Show the learning loop

When the mission clock ends, show the four goals, score, stars, and causal debrief. Export the mission patch and open the archive to compare flights. Point out that best scores and earned stars survive later failed attempts.

“MissionX makes a choice visible, a consequence explainable, and the next design better. Space is a system. Now students can play it.”

## A stronger free-play design

Use this design for a more resilient Hello, Orbit flight. It costs $86.7M before incidents and has room for an $8M emergency station rental.

| Setting | Value |
| --- | --- |
| Orbit | Sun-synchronous |
| Rocket | Atlas / Medium lift |
| Solar array | 2.5 m² |
| Battery | 150 Wh |
| Antenna | 1.5 m |
| Computer | Standard |
| Multispectral camera | Enabled, 100% observing time |
| Thermal imager | Enabled, 100% observing time |
| Radar and spectrometer | Disabled |

Keep Survey mode and make protective responses for a dependable demonstration. The exact score depends on the incidents and decisions. Reloading a completed flight restores its seed, design, difficulty, and training flag. Repeat the same choices and mode changes to reproduce the same run under the current engine rules.

For a longer presentation, try **Against the Odds**. It guarantees array damage at an unpredictable time. Compare a design with thin power reserve against one with spare capacity.

## Before presenting

- Run `npm test`
- Save the demonstration design before launching.
- Enable sound through its visible control; it starts muted.
- Keep an archived flight as a fallback, while allowing for the current engine's rules.

## Submission description

MissionX is a spacecraft strategy game built in plain JavaScript. Players design an orbit, rocket, support systems, and science payload, then operate the satellite through an unpredictable flight. Quiet stretches give way to one to three incidents, with risk affected by engineering reserves, live operating modes, and previous responses. 

The simulation pauses for decisions and resumes with their consequences. Six linked gauges, scripted advisors, original flight animation, sound, causal debriefs, mission patches, and saved-flight comparisons turn engineering trade-offs into playable learning. 

Four missions include lunar exploration, an Apollo-style rescue, and a sandbox. No backend or external runtime dependencies are required.
