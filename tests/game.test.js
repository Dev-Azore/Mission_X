import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
    defaultDesign,
    evaluate,
    createFlight,
    flightStatus,
    flightReport,
    advanceFlight,
} from "../src/engine.js";
import {
    tutorialSteps,
    earnedStars,
    recordProgress,
    playerRank,
    crisisExplanation,
    restoreProgress,
} from "../src/game.js";

import { finishSimulation } from "./flight-helpers.js";

const catalog = Object.fromEntries(
    ["missions", "orbits", "launchers", "parts", "events"].map((name) => {
        return [
            name,
            JSON.parse(
                readFileSync(new URL(`../data/${name}.json`, import.meta.url)),
            ),
        ];
    }),
);
const mission = catalog.missions[0];

test("progress restoration skips broken records and keeps valid mission results", () => {
    const saved = {
        hello: { flights: 3, wins: 1, best: 812, stars: 2 },
        lunar: null,
        apollo: { flights: 1, wins: 5, best: "bad", stars: 8 },
        unknown: { flights: 1, wins: 1, best: 900, stars: 3 }
    };

    assert.deepEqual(restoreProgress(saved, catalog.missions), { hello: saved.hello });
    assert.deepEqual(restoreProgress([], catalog.missions), {});
});

test("the guided design meets its instructions and can survive the taught responses", () => {
    const design = defaultDesign();

    assert.ok(tutorialSteps[0].check(design));
    assert.ok(tutorialSteps[1].check(design));
    assert.equal(tutorialSteps[2].check(design), false);
    design.bus.battery = 400;
    assert.ok(tutorialSteps[2].check(design));
    assert.equal(tutorialSteps[3].check(design), false);
    design.instruments[0].dutyCycle = 1;
    assert.ok(tutorialSteps[3].check(design));
    assert.ok(
        tutorialSteps[4].check(design, evaluate(design, mission, catalog)),
    );
    let flight = createFlight(design, mission, catalog, 91, "cadet", {
        guided: true,
    });

    flight = advanceFlight(flight, 120, catalog);
    assert.equal(flight.events[0].id, "battery");
    assert.match(crisisExplanation(flight.events[0], flight).advice, /300 Wh/);
    flight = finishSimulation(flight, catalog);
    assert.equal(flightStatus(flight, mission).battery, 300);
    assert.ok(flightReport(flight, mission).success);
});

test("choice forecasts and final results agree for every taught decision path", () => {
    const design = defaultDesign();

    design.bus.battery = 400;
    design.instruments[0].dutyCycle = 1;
    for (let mask = 0; mask < 8; mask++) {
        let flight = createFlight(design, mission, catalog, 100, "cadet", {
            guided: true,
        });

        flight = finishSimulation(flight, catalog, (current) => {
            return (mask >> current.decisions.length) & 1;
        });
        const forecast = flightStatus(flight, mission);
        const report = flightReport(flight, mission);

        for (const key of [
            "science",
            "cost",
            "lifetime",
            "health",
            "success",
        ]) {
            assert.equal(forecast[key], report[key]);
        }
    }
});

test("a training replay preserves its event sequence, without changing other scenarios", () => {
    const design = defaultDesign();
    const first = createFlight(design, mission, catalog, 10, "cadet", {
        guided: true,
    });
    const second = createFlight(design, mission, catalog, 10, "cadet", {
        guided: true,
    });

    assert.deepEqual(first, second);
    const apollo = catalog.missions.find((item) => {
        return item.id === "apollo";
    });
    const rescue = createFlight(
        defaultDesign("apollo"),
        apollo,
        catalog,
        10,
        "cadet",
        { guided: true },
    );

    assert.equal(rescue.guided, false);
    assert.equal(advanceFlight(rescue, 120, catalog).events[0].id, "array");
});

test("stars require success and campaign records never downgrade a better result", () => {
    assert.equal(earnedStars({ success: false, score: 950 }), 0);
    assert.equal(earnedStars({ success: true, score: 749 }), 1);
    assert.equal(earnedStars({ success: true, score: 750 }), 2);
    assert.equal(earnedStars({ success: true, score: 900 }), 3);
    const first = recordProgress({}, "hello", { success: true, score: 920 });
    const next = recordProgress(first, "hello", { success: false, score: 350 });

    assert.equal(next.hello.stars, 3);
    assert.equal(next.hello.best, 920);
    assert.equal(next.hello.flights, 2);
    assert.equal(next.hello.wins, 1);
    assert.equal(first.hello.flights, 1);
    assert.equal(playerRank({}), "New recruit");
    assert.equal(playerRank(next), "Mission pilot");
});
