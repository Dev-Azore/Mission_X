// DONKI supplies observations. The consequences below are MissionX game rules.
export const DONKI_URL = "https://ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR";

export function normalizeFlares(records) {
    if (!Array.isArray(records)) {
        return [];
    }

    return records.filter((record) => {
        return record && typeof record.flrID === "string"
            && typeof record.classType === "string"
            && /^[ABCMX]\d+(\.\d+)?$/.test(record.classType)
            && Number.isFinite(Date.parse(record.beginTime))
            && typeof record.link === "string"
            && record.link.startsWith("https://ccmc.gsfc.nasa.gov/DONKI/");
    }).map((record) => {
        return {
            id: record.flrID,
            classType: record.classType,
            beginTime: record.beginTime,
            link: record.link,
        };
    }).sort((a, b) => {
        return Date.parse(b.beginTime) - Date.parse(a.beginTime);
    });
}

export async function loadSpaceWeather(fallback, fetcher = fetch, now = new Date()) {
    const end = now.toISOString().slice(0, 10);
    const start = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
    const controller = new AbortController();
    const timeout = setTimeout(() => {
        controller.abort();
    }, 6000);

    try {
        const response = await fetcher(`${DONKI_URL}?startDate=${start}&endDate=${end}`, {
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error("NASA is unavailable");
        }

        const events = normalizeFlares(await response.json()).filter((event) => {
            const date = new Date(event.beginTime).toISOString().slice(0, 10);

            return date >= start && date <= end;
        });

        if (events.length) {
            return { mode: "recent", events };
        }
    } catch {
        // An unavailable feed must never prevent a launch.
    } finally {
        clearTimeout(timeout);
    }

    return { mode: "archive", events: normalizeFlares(fallback) };
}

export function applySpaceWeather(event, weather, seed) {
    if (event.id !== "flare" || !weather || !weather.events.length) {
        return structuredClone(event);
    }

    const observation = weather.events[(seed >>> 0) % weather.events.length];
    const severe = observation.classType.startsWith("X");
    const moderate = observation.classType.startsWith("M");
    const scienceLoss = severe ? 0.16 : moderate ? 0.12 : 0.08;
    const risk = severe ? 0.32 : moderate ? 0.24 : 0.16;
    const challenge = structuredClone(event);

    challenge.name = `${observation.classType} solar flare`;
    challenge.description = "A recorded NASA flare sets the conditions for this simulated space weather challenge.";
    challenge.nasa = { ...observation, mode: weather.mode };
    challenge.choices[0].science = -scienceLoss;
    challenge.choices[0].detail = `Protect hardware; lose ${Math.round(scienceLoss * 100)}% science.`;
    challenge.choices[1].risk = risk;

    return challenge;
}
