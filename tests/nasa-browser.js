// Optional: use the same Playwright and Chrome settings as tests/browser.js.
import { createRequire } from "node:module";
import { readFileSync, mkdirSync } from "node:fs";
import assert from "node:assert/strict";
import { createFlight, advanceFlight, defaultDesign } from "../src/engine.js";
import { normalizeFlares } from "../src/space-weather.js";
import { respondUntilReport } from "./browser-helpers.js";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
});
const url = process.env.MISSIONX_URL || "http://127.0.0.1:4173";
const records = JSON.parse(readFileSync(new URL("../data/nasa-flares.json", import.meta.url)));
const catalog = Object.fromEntries(["missions", "orbits", "launchers", "parts", "events"].map((name) => {
    return [name, JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url)))];
}));
const design = defaultDesign("sandbox");
const mission = catalog.missions.find((item) => { return item.id === "sandbox"; });
const weather = { mode: "archive", events: normalizeFlares(records) };
let seed = 0;

while (advanceFlight(createFlight(design, mission, catalog, seed, "engineer"), 120, catalog).events[0].id !== "flare") {
    seed++;
}

try {
    const context = await browser.newContext({ serviceWorkers: "block" });
    const page = await context.newPage();
    const errors = [];

    await page.clock.setFixedTime(new Date("2024-05-11T12:00:00Z"));
    page.on("pageerror", (error) => { errors.push(error.message); });
    await page.route("https://ccmc.gsfc.nasa.gov/**", (route) => {
        return route.fulfill({ json: records });
    });
    await page.addInitScript(({ design, seed, weather }) => {
        localStorage.setItem("missionx-intro-v2", "true");
        localStorage.setItem("missionx-attempts", JSON.stringify([{
            missionId: "sandbox", missionName: "Open Cosmos", design, seed,
            difficulty: "engineer", spaceWeather: weather,
            report: { score: 500, science: 40, cost: 50, lifetime: 1, trust: 80 },
        }]));
    }, { design, seed, weather });
    await page.goto(url);
    await page.waitForSelector("#nasa-weather summary");
    await page.waitForFunction(() => {
        return document.querySelector("#nasa-weather").textContent.includes("Recent NASA records loaded");
    });
    await page.click("#nasa-weather summary");
    assert.match(await page.locator("#nasa-weather").innerText(), /M5.9/);
    for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        assert.equal(await page.evaluate(() => {
            return document.documentElement.scrollWidth <= innerWidth;
        }), true);
    }

    mkdirSync("tmp/screenshots", { recursive: true });
    await page.screenshot({ path: "tmp/screenshots/nasa-design.png", fullPage: true });
    await page.click('[data-action="compare"]');
    await page.click('[data-attempt="0"]');
    await page.click('[data-action="launch"]');
    await page.waitForSelector('#flight-scene[data-phase="ascent"]', { timeout: 15000 });
    await page.click('[data-speed="8"]');
    await page.waitForSelector(".flight-main .nasa-observation", { timeout: 20000 });
    assert.match(await page.locator(".flight-main .nasa-observation").innerText(), /Archived NASA example/);
    await page.screenshot({ path: "tmp/screenshots/nasa-crisis.png", fullPage: true });
    await respondUntilReport(page);
    const saved = await page.evaluate(() => {
        return JSON.parse(localStorage.getItem("missionx-attempts"))[0];
    });

    assert.deepEqual(saved.spaceWeather, weather);
    assert.equal(errors.length, 0, errors.join("\n"));
    await context.close();

    const offline = await browser.newContext();
    const offlinePage = await offline.newPage();

    await offlinePage.route("https://ccmc.gsfc.nasa.gov/**", (route) => { return route.abort(); });
    await offlinePage.goto(url);
    await offlinePage.waitForSelector("#nasa-weather summary");
    assert.match(await offlinePage.locator("#nasa-weather").innerText(), /Using saved NASA examples/);
    await offlinePage.evaluate(async () => { await navigator.serviceWorker.ready; });
    await offlinePage.reload();
    await offlinePage.waitForSelector("#gauges .gauge");
    await offline.setOffline(true);
    await offlinePage.reload();
    await offlinePage.waitForSelector("#gauges .gauge");
    assert.match(await offlinePage.locator("#nasa-weather").innerText(), /Using saved NASA examples/);
    await offline.close();
    console.log("NASA browser checks passed: recent feed, mobile layout, archived replay, incident source, recovery, report, saved observations and offline reload.");
} finally {
    await browser.close();
}
