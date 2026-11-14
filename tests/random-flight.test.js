import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { defaultDesign, createFlight, advanceFlight, resolveEvent, setFlightMode, flightRisk, flightStatus } from '../src/engine.js';
import { finishSimulation } from './flight-helpers.js';

const catalog = Object.fromEntries(['missions', 'orbits', 'launchers', 'parts', 'events'].map(name => {
    return [name, JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url)))];
}));
const mission = catalog.missions[0];

function start(seed) {
    const design = defaultDesign();

    design.instruments[0].dutyCycle = 1;

    return createFlight(design, mission, catalog, seed, 'engineer'); 
}

test('quiet windows are measured in seconds, not predetermined mission quarters', () => {
    const times = new Set();

    for (let seed = 0; seed < 60; seed++) {
        const flight = start(seed);

        assert.ok(flight.nextCheckSeconds >= 15 && flight.nextCheckSeconds <= 45);
        assert.equal(advanceFlight(flight, 14, catalog).events.length, 0);
        const incident = advanceFlight(flight, 120, catalog);

        assert.equal(incident.elapsedSeconds, flight.nextCheckSeconds);
        times.add(incident.elapsedSeconds);
        const frozen = advanceFlight(incident, 120, catalog);

        assert.strictEqual(frozen, incident, 'An unresolved incident stops all flight time');
    }

    assert.ok(times.size > 50);
});

test('different runs produce one, two, or three incidents; safer operations reduce their frequency', () => {
    const counts = new Set();
    let quietIncidents = 0; let riskyIncidents = 0;

    for (let seed = 0; seed < 160; seed++) {
        const quiet = finishSimulation(setFlightMode(start(seed), 'conserve'), catalog);
        const risky = finishSimulation(setFlightMode(start(seed), 'boost'), catalog);

        quietIncidents += quiet.events.length;
        riskyIncidents += risky.events.length;
        counts.add(quiet.events.length); counts.add(risky.events.length);
        assert.equal(quiet.elapsedSeconds, 120);
        assert.equal(risky.elapsedSeconds, 120);
        assert.equal(new Set(risky.events.map(event => {
            return event.id;
        })).size, risky.events.length);
    }

    assert.deepEqual([...counts].sort(), [1, 2, 3]);
    assert.ok(quietIncidents < riskyIncidents);
});

test('a response changes future incident risk and leaves another quiet stretch', () => {
    let initial = createFlight(defaultDesign(), mission, catalog, 51, 'engineer', {guided: true});

    initial = advanceFlight(initial, 120, catalog);
    const safe = resolveEvent(initial, 0); const stressed = resolveEvent(initial, 1);

    assert.ok(flightRisk(safe) < flightRisk(stressed));
    assert.ok(safe.nextCheckSeconds - safe.elapsedSeconds >= 15);
    assert.ok(stressed.nextCheckSeconds - stressed.elapsedSeconds >= 15);
    assert.equal(initial.decisions.length, 0);
});

test('protective decisions reduce later incident counts across the same flight seeds', () => {
    let protectedIncidents = 0; let stressedIncidents = 0;

    for (let seed = 0; seed < 160; seed++) {
        protectedIncidents += finishSimulation(start(seed), catalog, () => {
            return 0;
        }).events.length;
        stressedIncidents += finishSimulation(start(seed), catalog, () => {
            return 1;
        }).events.length;
    }

    assert.ok(protectedIncidents < stressedIncidents);
});

test('frame size and playback speed do not change the seeded incident schedule', () => {
    const flight = start(42);
    const large = advanceFlight(flight, 100, catalog);
    let small = flight;

    while (!small.activeEvent) {
        small = advanceFlight(small, .1, catalog);
    }

    assert.equal(small.events[0].id, large.events[0].id);
    assert.equal(small.elapsedSeconds, large.elapsedSeconds);
    assert.ok(Math.abs(small.observingSeconds - large.observingSeconds) < 1e-8);
    assert.equal(small.randomDraws, large.randomDraws);
});

test('operating choices trade observation yield against risk and account for time already flown', () => {
    const flight = start(81);
    const quiet = setFlightMode(flight, 'conserve'); const boost = setFlightMode(flight, 'boost');

    assert.ok(flightStatus(quiet, mission).science < flightStatus(boost, mission).science);
    assert.ok(flightRisk(quiet) < flightRisk(boost));
    const flown = advanceFlight(quiet, 10, catalog);
    const changed = setFlightMode(flown, 'boost');

    assert.ok(flightStatus(changed, mission).science < flightStatus(boost, mission).science, 'Switching modes cannot erase earlier observing time');
    assert.throws(() => {
        return setFlightMode(flight, 'invalid');
    }, /Unknown/);
    assert.throws(() => {
        return advanceFlight(flight, -1, catalog);
    }, /Invalid/);
});
