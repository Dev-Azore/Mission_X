// Optional browser test for the complete first-time player experience.
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { respondUntilReport } from "./browser-helpers.js";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH
        ? { executablePath: process.env.CHROME_PATH }
        : {}),
});
const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];

page.on("pageerror", (error) => {
    return errors.push(error.message);
});
await mkdir("tmp/screenshots", { recursive: true });
try {
    await page.goto("http://127.0.0.1:4173");
    await page.waitForSelector(".welcome-dialog[open]");
    await page.screenshot({
        animations: "disabled",
        path: "tmp/screenshots/first-screen.png",
    });
    await page.click('#dialog [data-action="tutorial"]');
    await page.waitForSelector("#tutorial-guide:not([hidden])");
    assert.match(
        await page.locator(".tutorial-instruction").innerText(),
        /STEP 1 OF 5/,
    );
    await page.click('#tutorial-guide [data-action="tutorial-next"]');
    await page.click('#tutorial-guide [data-action="tutorial-next"]');
    assert.ok(
        await page
            .locator('#tutorial-guide [data-action="tutorial-next"]')
            .isDisabled(),
    );
    await page.locator("#battery").focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.locator("#battery").inputValue(), "400");
    await page.screenshot({
        animations: "disabled",
        path: "tmp/screenshots/guided-battery.png",
        fullPage: true,
    });
    await page.click('#tutorial-guide [data-action="tutorial-next"]');
    await page.reload();
    await page.waitForSelector("#tutorial-guide:not([hidden])");
    assert.match(
        await page.locator(".tutorial-instruction").innerText(),
        /STEP 4 OF 5/,
    );
    await page.locator('[data-duty="camera"]').focus();
    await page.keyboard.press("End");
    await page.click('#tutorial-guide [data-action="tutorial-next"]');
    await page.click('#tutorial-guide [data-action="tutorial-next"]');
    await page.click('#dialog [data-action="launch"]');
    await page.waitForSelector('#flight-scene[data-phase="ascent"]', {
        timeout: 15000,
    });
    await page.waitForFunction(() => {
        return (
            document.querySelector("#flight-scene") !== null &&
            Number(document.querySelector("#flight-scene").dataset.progress) >
                0.2
        );
    });
    await page.screenshot({
        animations: "disabled",
        path: "tmp/screenshots/rocket-ascent.png",
    });
    await page.click('[data-action="travel-pause"]');
    await page.waitForTimeout(120);
    const stopped = await page
        .locator("#flight-scene")
        .getAttribute("data-progress");

    await page.waitForTimeout(250);
    assert.equal(
        await page.locator("#flight-scene").getAttribute("data-progress"),
        stopped,
        "Manual pause freezes rocket progress",
    );
    await page.click('[data-speed="8"]');
    await page.click('[data-action="travel-pause"]');
    await page.waitForSelector('#flight-scene[data-phase="cruise"]');
    await page.screenshot({
        animations: "disabled",
        path: "tmp/screenshots/orbital-flight.png",
    });
    await page.waitForSelector('[data-choice="0"]', { timeout: 15000 });
    await page.waitForSelector('#flight-scene[data-phase="crisis"]');
    const frozenScene = await page
        .locator("#flight-scene")
        .evaluate((canvas) => {
            return canvas.toDataURL();
        });

    await page.waitForTimeout(250);
    assert.ok(
        frozenScene ===
            (await page.locator("#flight-scene").evaluate((canvas) => {
                return canvas.toDataURL();
            })),
        "Crises freeze the visual simulation",
    );
    assert.match(
        await page.locator("#dialog-title").innerText(),
        /Battery cell fault/,
    );
    assert.match(await page.locator(".flight-advisor").innerText(), /400 Wh/);
    await page.screenshot({
        animations: "disabled",
        path: "tmp/screenshots/guided-crisis.png",
    });
    await page.click('[data-choice="0"]');
    await page.waitForSelector(".decision-feedback");
    assert.match(
        await page.locator(".decision-lesson").innerText(),
        /spare battery capacity absorbed the failure/,
    );
    assert.match(await page.locator(".decision-metrics").innerText(), /300 Wh/);
    await page.screenshot({
        animations: "disabled",
        path: "tmp/screenshots/decision-result.png",
    });
    await page.click("#dialog .dialog-close");
    await page.click('.launch-actions [data-action="launch"]');
    await page.waitForSelector(".decision-feedback");
    await page.click('[data-action="continue-flight"]');
    await page.waitForSelector('#flight-scene[data-phase="cruise"]');
    await page.click('[data-action="travel-pause"]');
    const normalRisk = await page.locator("#risk-fill").evaluate((node) => {
        return parseFloat(node.style.width);
    });

    await page.click('[data-operation="boost"]');
    const boostedRisk = await page.locator("#risk-fill").evaluate((node) => {
        return parseFloat(node.style.width);
    });

    assert.ok(boostedRisk > normalRisk);
    await page.click('[data-operation="survey"]');
    await page.click('[data-speed="0.5"]');
    assert.equal(
        await page.locator('[data-speed="0.5"]').getAttribute("aria-pressed"),
        "true",
    );
    await page.keyboard.press("]");
    assert.equal(
        await page.locator('[data-speed="1"]').getAttribute("aria-pressed"),
        "true",
    );
    await page.keyboard.press("[");
    assert.equal(
        await page.locator('[data-speed="0.5"]').getAttribute("aria-pressed"),
        "true",
    );
    await page.click(".travel-sound");
    assert.equal(
        await page.locator(".travel-sound").getAttribute("aria-pressed"),
        "true",
    );
    await page.click(".travel-sound");
    assert.equal(
        await page.locator(".travel-sound").getAttribute("aria-pressed"),
        "false",
    );
    await page.screenshot({
        animations: "disabled",
        path: "tmp/screenshots/live-operations.png",
    });
    assert.ok(
        !(await page.locator(".travel-route").innerText()).includes(
            "Problem 1",
        ),
    );
    await page.click('[data-speed="8"]');
    await page.click('[data-action="travel-pause"]');
    await respondUntilReport(page);
    await page.waitForSelector(".game-result.victory");
    assert.equal(await page.locator(".result-goals .met").count(), 4);
    assert.equal(await page.locator(".result-stars .earned").count(), 2);
    await page.screenshot({
        animations: "disabled",
        path: "tmp/screenshots/victory.png",
    });
    await page.click('[data-action="next-mission"]');
    assert.equal(
        await page.locator("#mission-name").innerText(),
        "Lunar Ice Hunter",
    );
    assert.match(
        await page.locator("#dialog").innerText(),
        /HOW TO WIN THIS MISSION/,
    );
    await page.click('#dialog [data-action="free-play"]');
    await page.reload();
    await page.waitForSelector("#gauges .gauge");
    assert.equal(
        await page.locator(".player-rank strong").innerText(),
        "Mission pilot",
    );
    assert.ok(await page.locator("#tutorial-guide").isHidden());
    await page.click('[data-action="missions"]');
    assert.match(
        await page
            .locator('[data-mission="hello"] .mission-card-progress')
            .innerText(),
        /Best:/,
    );
    await page.keyboard.press("Escape");
    for (const width of [390, 768]) {
        await page.setViewportSize({ width, height: 844 });
        await page.click('[data-action="home"]');
        await page.screenshot({
            animations: "disabled",
            path: `tmp/screenshots/welcome-${width}.png`,
        });
        assert.ok(
            await page.locator('[data-action="tutorial"]').last().isVisible(),
        );
        assert.ok(
            await page.evaluate(() => {
                return (
                    document.querySelector("#dialog").scrollWidth <=
                    document.querySelector("#dialog").clientWidth + 2
                );
            }),
        );
        await page.click('#dialog [data-action="free-play"]');
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.click('.workspace-actions [data-action="tutorial"]');
    await page.screenshot({
        animations: "disabled",
        path: "tmp/screenshots/guided-mobile.png",
        fullPage: true,
    });
    await page.click('[data-action="skip-tutorial"]');
    assert.ok(await page.locator("#tutorial-guide").isHidden());
    assert.ok(
        await page.evaluate(() => {
            return document.documentElement.scrollWidth <= innerWidth;
        }),
    );
    await page.click('[data-tab="payload"]');
    await page.locator('[data-duty="camera"]').focus();
    await page.keyboard.press("End");
    await page.click('.launch-actions [data-action="launch"]');
    await page.waitForSelector('#flight-scene[data-phase="ascent"]', {
        timeout: 15000,
    });
    await page.click('[data-action="travel-pause"]');
    const mobileAscent = Number(
        await page.locator("#flight-scene").getAttribute("data-progress"),
    );

    await page.screenshot({
        animations: "disabled",
        path: "tmp/screenshots/mobile-rocket.png",
    });
    assert.ok(
        await page.evaluate(() => {
            return (
                document.querySelector("#dialog").scrollWidth <=
                document.querySelector("#dialog").clientWidth + 2
            );
        }),
    );
    await page.click("#dialog .dialog-close");
    await page.click('.launch-actions [data-action="launch"]');
    await page.waitForSelector('#flight-scene[data-phase="ascent"]');
    assert.ok(
        Number(
            await page.locator("#flight-scene").getAttribute("data-progress"),
        ) >= mobileAscent,
        "Closing and resuming continues the ascent",
    );
    await page.click('[data-speed="8"]');
    await page.waitForSelector('[data-choice="0"]', { timeout: 15000 });
    await page.screenshot({
        animations: "disabled",
        path: "tmp/screenshots/mobile-flight-crisis.png",
    });
    await page.click('[data-choice="0"]');
    await page.click('[data-action="continue-flight"]');
    await page.waitForSelector('#flight-scene[data-phase="cruise"]');
    await page.click('[data-action="travel-pause"]');
    await page.screenshot({
        animations: "disabled",
        path: "tmp/screenshots/mobile-orbit.png",
    });
    await page.locator('[data-operation="conserve"]').scrollIntoViewIfNeeded();
    await page.click('[data-operation="conserve"]');
    assert.equal(
        await page
            .locator('[data-operation="conserve"]')
            .getAttribute("aria-pressed"),
        "true",
    );
    await page.screenshot({
        animations: "disabled",
        path: "tmp/screenshots/mobile-operating-controls.png",
    });
    assert.ok(
        await page.evaluate(() => {
            return (
                document.querySelector("#dialog").scrollWidth <=
                document.querySelector("#dialog").clientWidth + 2
            );
        }),
    );
    assert.equal(errors.length, 0, errors.join("\n"));
    console.log(
        "Onboarding passed: guided build, rocket ascent, pause/speed controls, orbital flight, frozen crisis scene, repair and resume, final flight leg, victory, persistent progression, and responsive entry.",
    );
} finally {
    await browser.close();
}
