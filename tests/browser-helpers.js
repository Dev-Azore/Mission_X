import assert from "node:assert/strict";

export async function respondUntilReport(page, choice = 0) {
    for (let step = 0; step < 5; step++) {
        await page.waitForFunction(
            () => {
                return (
                    document.querySelector(".event-choice") ||
                    document.querySelector(".report-stats")
                );
            },
            undefined,
            { timeout: 30000 },
        );
        if (await page.locator(".report-stats").count()) {
            return;
        }

        await page.click(`[data-choice="${choice}"]`);
        await page.waitForSelector(".decision-feedback");
        await page.click('[data-action="continue-flight"]');
    }

    assert.fail("Flight exceeded the supported incident count.");
}
