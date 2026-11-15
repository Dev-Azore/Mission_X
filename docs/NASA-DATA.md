# NASA observations in MissionX

MissionX uses the Space Weather Database Of Notifications, Knowledge, Information (DONKI), maintained by NASA's Community Coordinated Modeling Center. The observations come from NASA; all spacecraft hardware, incident scheduling, scoring, and recovery effects are simplified game models.

## Request and fields

`src/space-weather.js` requests this public endpoint without an API key:

```text
https://ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

The date window is the previous 30 days through today, in UTC. MissionX uses `flrID` as the record identifier, `beginTime` as the observation time, `classType` as the flare classification, and `link` to open NASA's original record. Invalid records are discarded. A six-second timeout keeps the feed from blocking play.

The design screen distinguishes recent records from saved historical examples. “Recent” means the observation was returned for that date window; it does not mean a flare is happening now or heading toward the player's satellite. The simulated flight compresses years into minutes and replays a historical observation.

## How observations affect play

The flight seed chooses one record from the loaded observations. If the normal random scheduler selects a solar flare incident, that record supplies its class, date, identifier, and source link. NASA data never forces a fixed incident count or interrupts the existing quiet intervals. Guided flights still begin with the battery lesson.

| Recorded class | Science lost in safe mode | Observing risk parameter |
| --- | --- | --- |
| X | 16% | 0.32 |
| M | 12% | 0.24 |
| A, B, C | 8% | 0.16 |

These numbers are MissionX balancing choices. The risk parameter feeds the existing engine and is not a NASA probability of failure. A flare classification measures electromagnetic emission; it does not establish a particle event, an Earth impact, or damage to a particular spacecraft. MissionX combines these topics into an explicitly simplified space weather challenge.

## Offline examples and replay

`data/nasa-flares.json` contains two actual records retrieved from DONKI for 10 May 2024: X3.9 (`2024-05-10T06:27:00-FLR-001`) and M5.9 (`2024-05-10T13:58:00-FLR-001`). Each includes the original NASA link. They are labelled archived examples, never live alerts. This file and the data loader are included in the service worker's offline cache.

A flight snapshots its observations at launch. Recent flight saves and JSON exports include that snapshot; exports also include the generated events. Replaying a saved flight restores its observations alongside the seed. The same responses and operating-mode timing are still required to reproduce the result.

## Attribution

Data: NASA/CCMC DONKI, including observations and analyses from the Moon to Mars Space Weather Analysis Office. We acknowledge their work making these records available for education.

- [NASA DONKI overview, API access, and usage guidance](https://ccmc.gsfc.nasa.gov/tools/DONKI/)
- [DONKI API reference](https://ccmc.gsfc.nasa.gov/DONKI/api/)
- [X3.9 example record](https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30666/-1)
- [M5.9 example record](https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30680/-1)

[Back to the README](../README.md)
