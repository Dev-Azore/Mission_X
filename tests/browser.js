// Optional UI checks: PLAYWRIGHT_MODULE may point to a local Playwright install.
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { respondUntilReport } from "./browser-helpers.js";
import { defaultDesign } from "../src/engine.js";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH
        ? { executablePath: process.env.CHROME_PATH }
        : {}),
});
const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
});
const page = await context.newPage();
const errors = [];

page.on("pageerror", (error) => {
    return errors.push(error.message);
});
await mkdir("tmp/screenshots", { recursive: true });
try {
    await page.goto("http://127.0.0.1:4173");
    await page.waitForSelector("#gauges .gauge");
    assert.match(await page.title(), /^MissionX/);
    assert.match(await page.locator(".brand").innerText(), /MissionX/);
    await page.waitForSelector(".welcome-dialog[open]");
    await page.screenshot({
        animations: "disabled",
        path: "tmp/screenshots/game-welcome.png",
    });
    await page.click('#dialog [data-action="free-play"]');
    assert.equal(await page.locator("#gauges .gauge").count(), 6);
    await page.screenshot({
        animations: "disabled",
        path: "tmp/screenshots/desktop.png",
        fullPage: true,
    });
    await page.click('[data-tab="payload"]');
    await page.check('[data-instrument="radar"]');
    assert.ok((await page.locator(".gauge.danger").count()) > 0);
    await page.click('[data-action="launch"]');
    await page.waitForSelector("#dialog[open] .fix-list");
    assert.match(await page.locator("#dialog").innerText(), /flight-ready/);
    await page.screenshot({
        animations: "disabled",
        path: "tmp/screenshots/scrubbed.png",
        fullPage: true,
    });
    await page.click('#dialog [data-action="close"]');
    await page.click('[data-action="reset"]');
    await page.click('[data-tab="payload"]');
    await page.locator('[data-duty="camera"]').focus();
    await page.keyboard.press("End");
    await page.click('[data-action="save"]');
    await page.click('[data-action="launch"]');
    await page.waitForSelector('#flight-scene[data-phase="ascent"]', {
        timeout: 15000,
    });
    await page.click('[data-speed="8"]');
    await page.waitForSelector('[data-choice="0"]', { timeout: 15000 });
    await page.screenshot({
        animations: "disabled",
        path: "tmp/screenshots/crisis.png",
        fullPage: true,
    });
    await respondUntilReport(page);
    await page.waitForSelector(".report-stats");
    await page.screenshot({
        animations: "disabled",
        path: "tmp/screenshots/report.png",
        fullPage: true,
    });
    const downloadPromise = page.waitForEvent("download");

    await page.click('[data-action="export-patch"]');
    assert.match((await downloadPromise).suggestedFilename(), /patch.svg$/);
    await page.click('#dialog [data-action="compare"]');
    assert.equal(await page.locator(".comparison tbody tr").count(), 7);
    await page.click('[data-attempt="0"]');
    await page.reload();
    await page.waitForSelector("#gauges .gauge");
    await page.click('[data-tab="payload"]');
    assert.equal(
        await page.locator('[data-duty="camera"]').inputValue(),
        "100",
    );
    await page.click('[data-action="missions"]');
    await page.click('[data-mission="lunar"]');
    await page.click('#dialog [data-action="free-play"]');
    assert.equal(
        await page.locator("#mission-name").innerText(),
        "Lunar Ice Hunter",
    );
    assert.equal(await page.locator("#altitude").innerText(), "100 km");
    await page.click('[data-action="missions"]');
    await page.click('[data-mission="hello"]');
    await page.click('#dialog [data-action="free-play"]');
    for (const width of [390, 768, 1024]) {
        await page.setViewportSize({ width, height: 900 });
        await page.screenshot({
            animations: "disabled",
            path: `tmp/screenshots/viewport-${width}.png`,
            fullPage: true,
        });
        assert.ok(
            await page.evaluate(() => {
                return document.documentElement.scrollWidth <= innerWidth;
            }),
            `No horizontal overflow at ${width}px`,
        );
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.click('[data-action="guide"]');
    await page.screenshot({
        animations: "disabled",
        path: "tmp/screenshots/mobile-guide.png",
        fullPage: true,
    });
    await page.keyboard.press("Escape");
    await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
    });
    await page.reload();
    await page.waitForSelector("#gauges .gauge");
    await context.setOffline(true);
    await page.reload();
    await page.waitForSelector("#gauges .gauge");
    await context.setOffline(false);
    await page.goto("http://127.0.0.1:4173/dist/");
    await page.waitForSelector("#gauges .gauge");
    assert.equal(await page.locator("#gauges .gauge").count(), 6);
    await page.screenshot({
        animations: "disabled",
        path: "tmp/screenshots/production-mobile.png",
        fullPage: true,
    });
    const migrationContext = await browser.newContext();

    await migrationContext.addInitScript(
        ({ design }) => {
            if (location.origin !== "http://127.0.0.1:4173") {
                return;
            }

            localStorage.setItem(
                "missionforge-progress",
                JSON.stringify({
                    hello: { flights: 3, wins: 1, best: 812, stars: 2 },
                }),
            );
            localStorage.setItem(
                "missionforge-session",
                JSON.stringify({
                    missionId: "hello",
                    difficulty: "engineer",
                    design,
                }),
            );
        },
        { design: defaultDesign() },
    );
    const migrationPage = await migrationContext.newPage();

    migrationPage.on("pageerror", (error) => {
        errors.push(error.message);
    });
    await migrationPage.goto("http://127.0.0.1:4173");
    await migrationPage.waitForSelector("#gauges .gauge");
    assert.equal(
        await migrationPage.locator(".player-rank strong").innerText(),
        "Mission pilot",
    );
    assert.equal(
        await migrationPage.evaluate(() => {
            return JSON.parse(localStorage.getItem("missionx-progress")).hello
                .best;
        }),
        812,
    );
    await migrationContext.close();
    assert.equal(errors.length, 0, errors.join("\n"));
    console.log(
        "Browser checks passed: ripple, launch scrub, unpredictable crises, report, downloads, persistence, missions, 3 responsive widths, offline reload, and production build under /dist/.",
    );
} finally {
    await browser.close();
}
