import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
    defaultDesign,
    evaluate,
    createFlight,
    resolveEvent,
    flightReport,
    seededRandom,
    advanceFlight,
} from "../src/engine.js";

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
const mission = (id) => {
    return catalog.missions.find((item) => {
        return item.id === id;
    });
};

const flightReadyDesign = (id) => {
    const design = defaultDesign(id);

    design.instruments[0].dutyCycle = 1;
    if (id === "lunar") {
        design.bus.computer = "hardened";
    }

    if (id === "apollo") {
        design.instruments.push({ id: "thermal", dutyCycle: 1 });
        design.bus.antenna = 1.5;
    }

    return design;
};

test("invalid saved hardware and nonnumeric resource values cannot launch", () => {
    const invalid = defaultDesign();

    invalid.bus.battery = "not a number";
    assert.throws(() => {
        return evaluate(invalid, mission("hello"), catalog);
    }, /Invalid spacecraft design/);

    invalid.bus.battery = 300;
    invalid.instruments = [{ id: "missing-camera", dutyCycle: 1 }];
    assert.throws(() => {
        return createFlight(invalid, mission("sandbox"), catalog, 42, "engineer");
    }, /Invalid spacecraft design/);
});

test("a power shortfall without array damage gets an accurate debrief", () => {
    const flight = createFlight(flightReadyDesign("hello"), mission("hello"), catalog, 42, "engineer");

    flight.loadFactor = 3;
    const report = flightReport(flight, mission("hello"));

    assert.ok(report.causeChain.some((cause) => {
        return cause.includes("Power demand exceeded generation"); 
    }));
    assert.ok(!report.causeChain.some((cause) => {
        return cause.includes("Array damage"); 
    }));
});

test("adding a radar ripples into mass, demand, data, cost, and communication coverage", () => {
    const design = defaultDesign();
    const before = evaluate(design, mission("hello"), catalog);

    design.instruments.push({ id: "radar", dutyCycle: 1 });
    const after = evaluate(design, mission("hello"), catalog);

    for (const key of ["mass", "demand", "generated", "cost"]) {
        assert.ok(after[key] > before[key], key);
    }

    assert.ok(after.comms < before.comms);
    assert.ok(
        after.preflight.issues.some((issue) => {
            return issue.key === "comms";
        }),
    );
});

test("array and battery upgrades provide capacity at a mass and budget cost", () => {
    const design = defaultDesign();
    const before = evaluate(design, mission("hello"), catalog);

    design.bus.solarArea += 1;
    design.bus.battery += 200;
    const after = evaluate(design, mission("hello"), catalog);

    assert.ok(after.supply > before.supply);
    assert.ok(after.mass > before.mass);
    assert.ok(after.cost > before.cost);
});

test("the same launcher lifts less payload to the Moon", () => {
    const design = defaultDesign();
    const earth = evaluate(design, mission("hello"), catalog);

    design.orbitId = "lunar";
    assert.ok(
        evaluate(design, mission("lunar"), catalog).capacity < earth.capacity,
    );
});

test("pre-flight catches incompatible orbits and missing required instruments", () => {
    const design = defaultDesign();

    design.orbitId = "lunar";
    design.instruments = [];
    const issues = evaluate(design, mission("hello"), catalog).preflight.issues;

    assert.ok(
        issues.some((issue) => {
            return issue.key === "orbit";
        }),
    );
    assert.ok(
        issues.some((issue) => {
            return issue.key === "science";
        }),
    );
});

test("overloaded launchers and insufficient power scrub the launch", () => {
    const design = defaultDesign();

    design.launcherId = "swift";
    design.bus.solarArea = 1;
    design.instruments = catalog.parts.instruments.map((item) => {
        return { id: item.id, dutyCycle: 1 };
    });
    const issues = evaluate(design, mission("hello"), catalog).preflight.issues;

    assert.ok(
        issues.some((issue) => {
            return issue.key === "mass";
        }),
    );
    assert.ok(
        issues.some((issue) => {
            return issue.key === "power";
        }),
    );
    assert.throws(() => {
        return createFlight(design, mission("hello"), catalog, 12, "engineer");
    }, /Pre-flight/);
});

test("insufficient eclipse capacity is caught independently of solar generation", () => {
    const design = defaultDesign("lunar");

    design.bus.battery = 50;
    const result = evaluate(design, mission("lunar"), catalog);

    assert.ok(result.supply > result.demand);
    assert.ok(
        result.preflight.issues.some((issue) => {
            return issue.message.includes("eclipse");
        }),
    );
});

test("sandbox removes financial limits while retaining physical constraints", () => {
    const design = defaultDesign();

    design.launcherId = "titan";
    design.bus.solarArea = 8;
    const sandbox = { ...mission("sandbox"), budget: 1 };

    assert.ok(
        !evaluate(design, sandbox, catalog).preflight.issues.some((issue) => {
            return issue.key === "budget";
        }),
    );
    design.bus.solarArea = 0.1;
    assert.ok(!evaluate(design, sandbox, catalog).preflight.pass);
});

test("seeded flights replay incident types and timing without mutating content", () => {
    const before = JSON.stringify(catalog.events);
    const design = flightReadyDesign("hello");
    const first = createFlight(
        design,
        mission("hello"),
        catalog,
        42,
        "engineer",
    );
    const second = createFlight(
        design,
        mission("hello"),
        catalog,
        42,
        "engineer",
    );

    assert.deepEqual(first, second);
    const run = finishSimulation(first, catalog);

    assert.deepEqual(run, finishSimulation(second, catalog));
    assert.equal(
        new Set(
            run.events.map((item) => {
                return item.id;
            }),
        ).size,
        run.events.length,
    );
    assert.ok(run.events.length >= 1 && run.events.length <= 3);
    assert.equal(JSON.stringify(catalog.events), before);
    const randomA = seededRandom(16);
    const randomB = seededRandom(16);

    assert.deepEqual(
        Array.from({ length: 10 }, randomA),
        Array.from({ length: 10 }, randomB),
    );
});

test("event resolution returns a new state and rejects invalid choices", () => {
    const flight = advanceFlight(
        createFlight(
            flightReadyDesign("hello"),
            mission("hello"),
            catalog,
            42,
            "engineer",
        ),
        120,
        catalog,
    );
    const original = JSON.stringify(flight);
    const next = resolveEvent(flight, 0);

    assert.equal(JSON.stringify(flight), original);
    assert.equal(next.decisions.length, 1);
    assert.equal(next.timeline[0].day, Math.floor(flight.day));
    assert.equal(next.elapsedSeconds, flight.elapsedSeconds);
    assert.throws(() => {
        return resolveEvent(flight, 99);
    }, /Invalid/);
});

test("Apollo rescue guarantees array damage at an unpredictable time", () => {
    for (const seed of [1, 42, 918]) {
        const flight = advanceFlight(
            createFlight(
                flightReadyDesign("apollo"),
                mission("apollo"),
                catalog,
                seed,
                "engineer",
            ),
            120,
            catalog,
        );

        assert.equal(flight.events[0].id, "array");
    }
});

for (const id of ["hello", "lunar", "apollo", "sandbox"]) {
    test(`${id} has a winnable engineering solution`, () => {
        const design = flightReadyDesign(id);

        assert.ok(evaluate(design, mission(id), catalog).preflight.pass);
        let wins = 0;

        for (let mask = 0; mask < 8; mask++) {
            let flight = createFlight(
                design,
                mission(id),
                catalog,
                42,
                "engineer",
            );

            flight = finishSimulation(flight, catalog, (current) => {
                return (mask >> current.decisions.length) & 1;
            });
            const report = flightReport(flight, mission(id));

            if (report.success) {
                wins++;
            }

            for (const key of [
                "science",
                "score",
                "trust",
                "cost",
                "lifetime",
            ]) {
                assert.ok(Number.isFinite(report[key]), key);
            }

            assert.ok(report.score >= 0 && report.score <= 1000);
        }

        assert.ok(
            wins > 0,
            "At least one decision path should achieve the objective",
        );
    });
}

test("power margin changes the outcome of the same array failure", () => {
    const design = flightReadyDesign("apollo");
    const strong = advanceFlight(
        createFlight(design, mission("apollo"), catalog, 42, "engineer"),
        120,
        catalog,
    );
    const weak = structuredClone(strong);

    weak.gauges.supply = weak.gauges.demand * 1.02;
    let strongFlight = strong;
    let weakFlight = weak;

    strongFlight = resolveEvent(strongFlight, 0);
    weakFlight = resolveEvent(weakFlight, 0);
    assert.ok(
        flightReport(strongFlight, mission("apollo")).science >
            flightReport(weakFlight, mission("apollo")).science,
    );
    assert.ok(
        flightReport(weakFlight, mission("apollo")).causeChain.some((cause) => {
            return cause.includes("brownouts");
        }),
    );
});

test("improving a previous run earns the learning bonus", () => {
    let flight = createFlight(
        flightReadyDesign("hello"),
        mission("hello"),
        catalog,
        42,
        "engineer",
    );

    flight = finishSimulation(flight, catalog);
    const first = flightReport(flight, mission("hello"));
    const improved = flightReport(flight, mission("hello"), first.score - 30);

    assert.equal(improved.learningBonus, 25);
    assert.equal(improved.score, first.score + 25);
});
