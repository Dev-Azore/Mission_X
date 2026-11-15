import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeFlares, loadSpaceWeather, applySpaceWeather } from "../src/space-weather.js";
import { createFlight, advanceFlight, defaultDesign } from "../src/engine.js";

const fallback = JSON.parse(readFileSync(new URL("../data/nasa-flares.json", import.meta.url)));
const events = JSON.parse(readFileSync(new URL("../data/events.json", import.meta.url)));
const flare = events.find((event) => {
    return event.id === "flare";
});

test("NASA records reject invalid dates, classifications and untrusted source links", () => {
    const records = normalizeFlares([
        ...fallback,
        null,
        { ...fallback[0], beginTime: "invalid" },
        { ...fallback[0], classType: "<script>" },
        { ...fallback[0], link: "javascript:alert(1)" },
    ]);

    assert.equal(records.length, 2);
    assert.equal(records[0].classType, "M5.9");
    assert.deepEqual(normalizeFlares({ error: "unavailable" }), []);
});

test("feed requests the UTC date window and uses recent observations", async () => {
    let requested;
    const weather = await loadSpaceWeather(fallback, async (url) => {
        requested = url;

        return { ok: true, json: async () => {
            return [fallback[0]];
        } };
    }, new Date("2024-05-11T12:00:00Z"));

    assert.match(requested, /startDate=2024-04-11&endDate=2024-05-11$/);
    assert.equal(weather.mode, "recent");
    assert.equal(weather.events[0].classType, "X3.9");
});

test("network failures, HTTP errors and empty or malformed feeds use labelled archives", async () => {
    const fetchers = [
        async () => { throw new Error("offline"); },
        async () => { return { ok: false }; },
        async () => { return { ok: true, json: async () => { return []; } }; },
        async () => { return { ok: true, json: async () => { return { error: "bad data" }; } }; },
    ];

    for (const fetcher of fetchers) {
        const weather = await loadSpaceWeather(fallback, fetcher);

        assert.equal(weather.mode, "archive");
        assert.equal(weather.events.length, 2);
    }
});

test("recorded flare class changes consequences without mutating the source content", () => {
    const weather = { mode: "archive", events: normalizeFlares(fallback) };
    const moderate = applySpaceWeather(flare, weather, 0);
    const severe = applySpaceWeather(flare, weather, 1);

    assert.equal(moderate.nasa.classType, "M5.9");
    assert.equal(severe.nasa.classType, "X3.9");
    assert.ok(severe.choices[0].science < moderate.choices[0].science);
    assert.ok(severe.choices[1].risk > moderate.choices[1].risk);
    assert.equal(flare.choices[0].science, -0.12);
    assert.deepEqual(applySpaceWeather(events[1], weather, 1), events[1]);
});

test("flight snapshots survive feed changes and the scheduler attaches NASA provenance", () => {
    const catalog = Object.fromEntries(["missions", "orbits", "launchers", "parts", "events"].map((name) => {
        return [name, JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url)))];
    }));
    const weather = { mode: "archive", events: normalizeFlares(fallback) };
    const design = defaultDesign("sandbox");
    const mission = catalog.missions.find((item) => { return item.id === "sandbox"; });
    let found = false;

    for (let seed = 0; seed < 100; seed++) {
        const flight = createFlight(design, mission, catalog, seed, "engineer", { spaceWeather: weather });
        const next = advanceFlight(flight, 120, catalog);

        if (next.events[0].id === "flare") {
            assert.ok(next.events[0].nasa.link.startsWith("https://ccmc.gsfc.nasa.gov/"));
            weather.events[0].classType = "C1.0";
            assert.notEqual(flight.spaceWeather.events[0].classType, "C1.0");
            found = true;
            break;
        }
    }

    assert.equal(found, true);
});
