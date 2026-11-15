import { applySpaceWeather } from "./space-weather.js";

// The engine has no browser dependencies. Values are educational approximations,
// not trajectory calculations or specifications for real flight hardware.
const FLIGHT_DURATION_SECONDS = 120;
const MAX_INCIDENTS = 3;
const MIN_QUIET_SECONDS = 15;
const QUIET_INTERVAL_RANGE = 25;

export const clamp = (value, min, max) => {
    return Math.min(max, Math.max(min, value));
};

export const defaultDesign = (missionId = "hello") => {
    return {
        orbitId: missionId === "lunar" ? "lunar" : "sso",
        launcherId: "atlas",
        bus: {
            solarArea: missionId === "lunar" ? 4 : 2.5,
            battery: missionId === "lunar" ? 600 : 300,
            antenna: missionId === "lunar" ? 2 : 1,
            computer: "standard",
        },
        instruments: [
            {
                id: missionId === "lunar" ? "spectrometer" : "camera",
                dutyCycle: 0.75,
            },
        ],
    };
};

export function isValidDesign(design, catalog) {
    if (!design || !design.bus || !Array.isArray(design.instruments)) {
        return false;
    }

    const bus = design.bus;
    const validHardware = catalog.orbits.some((orbit) => {
        return orbit.id === design.orbitId;
    }) && catalog.launchers.some((launcher) => {
        return launcher.id === design.launcherId;
    }) && catalog.parts.computers.some((computer) => {
        return computer.id === bus.computer;
    });
    const validResources = [bus.solarArea, bus.battery, bus.antenna].every((value) => {
        return Number.isFinite(value) && value >= 0;
    });
    const validInstruments = design.instruments.every((instrument) => {
        return instrument !== null && typeof instrument === "object"
            && catalog.parts.instruments.some((part) => {
                return part.id === instrument.id;
            })
            && Number.isFinite(instrument.dutyCycle)
            && instrument.dutyCycle >= 0 && instrument.dutyCycle <= 1;
    });
    const uniqueInstruments = new Set(design.instruments.map((instrument) => {
        return instrument === null || typeof instrument !== "object" ? null : instrument.id;
    })).size === design.instruments.length;

    return validHardware && validResources && validInstruments && uniqueInstruments;
}

export function evaluate(design, mission, catalog) {
    if (!isValidDesign(design, catalog)) {
        throw new Error("Invalid spacecraft design. Load a saved design or reset this mission.");
    }

    const orbit = catalog.orbits.find((item) => {
        return item.id === design.orbitId;
    });
    const launcher = catalog.launchers.find((item) => {
        return item.id === design.launcherId;
    });
    const computer = catalog.parts.computers.find((item) => {
        return item.id === design.bus.computer;
    });
    const instruments = design.instruments.map((item) => {
        return {
            ...catalog.parts.instruments.find((part) => {
                return part.id === item.id;
            }),
            dutyCycle: item.dutyCycle,
        };
    });
    const { solarArea, battery, antenna } = design.bus;
    const mass =
        65 +
        solarArea * 14 +
        battery * 0.12 +
        antenna * 18 +
        computer.mass +
        instruments.reduce((sum, item) => {
            return sum + item.mass;
        }, 0);
    const capacity =
        launcher.capacity *
        (orbit.id === "lunar" ? 0.58 : orbit.id === "sso" ? 0.9 : 1);
    const demand =
        30 +
        computer.power +
        instruments.reduce((sum, item) => {
            return sum + item.power * item.dutyCycle;
        }, 0);
    const supply = solarArea * 110 * orbit.sunlight;
    const eclipseNeed = ((demand * orbit.period) / 60) * (1 - orbit.sunlight);
    const generated = instruments.reduce((sum, item) => {
        return sum + item.data * item.dutyCycle;
    }, 0);
    const returned = antenna * 240 * orbit.contact;
    const comms = generated ? returned / generated : 1;
    const cost =
        launcher.cost +
        10 +
        solarArea * 3 +
        battery * 0.018 +
        antenna * 5 +
        computer.cost +
        instruments.reduce((sum, item) => {
            return sum + item.cost;
        }, 0) +
        mission.years * 4;
    const lifetime = Math.min(
        6 / orbit.fuel,
        (battery / Math.max(eclipseNeed, 1)) * 2.4,
        (4.5 * computer.shielding) / orbit.radiation,
    );
    const science =
        instruments.reduce((sum, item) => {
            return sum + item.science * item.dutyCycle;
        }, 0) *
        Math.min(1, comms) *
        (orbit.world === mission.world || mission.id === "sandbox" ? 1 : 0.2);
    const issues = [];

    if (mass > capacity) {
        issues.push({
            key: "mass",
            message: `Payload exceeds launch capacity by ${Math.ceil(mass - capacity)} kg.`,
            fix: "Choose a larger launcher or remove heavy instruments.",
        });
    }

    if (supply < demand) {
        issues.push({
            key: "power",
            message: `Power generation falls ${Math.ceil(demand - supply)} W short.`,
            fix: "Increase solar area or lower instrument duty cycles.",
        });
    }

    if (battery < eclipseNeed) {
        issues.push({
            key: "power",
            message: "The battery cannot sustain one eclipse.",
            fix: `Increase battery storage to at least ${Math.ceil(eclipseNeed)} Wh.`,
        });
    }

    if (comms < 0.98) {
        issues.push({
            key: "comms",
            message: `Only ${Math.round(comms * 100)}% of observations can reach home.`,
            fix: "Fit a larger antenna or reduce the data you generate.",
        });
    }

    if (mission.id !== "sandbox" && cost > mission.budget) {
        issues.push({
            key: "budget",
            message: `Design is $${(cost - mission.budget).toFixed(1)}M over budget.`,
            fix: "Try a smaller launcher or a more focused payload.",
        });
    }

    if (orbit.world !== mission.world && mission.id !== "sandbox") {
        issues.push({
            key: "orbit",
            message: "This orbit does not reach the mission target.",
            fix: `Choose ${mission.world === "moon" ? "lunar polar" : "an Earth"} orbit.`,
        });
    }

    if (
        mission.required &&
        !instruments.some((item) => {
            return item.id === mission.required && item.dutyCycle > 0;
        })
    ) {
        issues.push({
            key: "science",
            message: "The primary science instrument is missing.",
            fix: `Add the ${catalog.parts.instruments
                .find((item) => {
                    return item.id === mission.required;
                })
                .name.toLowerCase()}.`,
        });
    }

    if (
        !instruments.some((item) => {
            return item.dutyCycle > 0;
        })
    ) {
        issues.push({
            key: "science",
            message: "No active science payload.",
            fix: "Add an instrument and give it observing time.",
        });
    }

    if (lifetime < mission.years) {
        issues.push({
            key: "lifetime",
            message: "Estimated life is shorter than the mission.",
            fix: "Add battery reserve or a radiation-hardened computer.",
        });
    }

    const margins = [
        1 - mass / capacity,
        1 - demand / supply,
        1 - generated / Math.max(returned, 1),
        1 - cost / mission.budget,
        1 - mission.years / lifetime,
    ];

    return {
        mass,
        capacity,
        demand,
        supply,
        battery,
        eclipseNeed,
        generated,
        returned,
        comms,
        cost,
        lifetime,
        science,
        margins,
        preflight: { pass: issues.length === 0, issues },
    };
}

export function advisorMessages(gauges, mission) {
    return [
        gauges.comms < 1
            ? `We're collecting more than we can send. ${Math.round((1 - gauges.comms) * 100)}% of the science never gets home. Try a larger antenna.`
            : gauges.battery < gauges.eclipseNeed * 1.5
                ? "Eclipse reserve is thin. A bigger battery buys us breathing room."
                : `Power closes with ${Math.round(gauges.supply - gauges.demand)} W to spare. That's room to recover when something breaks.`,
        gauges.science < mission.science
            ? `We need ${mission.science} science points. We're at ${Math.round(gauges.science)}. More observing time could close that gap.`
            : `The payload meets our science target. Keep the data flowing and this mission will matter.`,
        gauges.cost > mission.budget
            ? `We're over budget. Ambition is good. An unfunded spacecraft stays on the ground.`
            : gauges.mass / gauges.capacity > 0.9
                ? "We are close to the mass limit. Every extra kilogram needs a reason."
                : `We have $${(mission.budget - gauges.cost).toFixed(1)}M in reserve. Keep some for the surprises.`,
    ];
}

export function seededRandom(seed) {
    let state = seed >>> 0;

    return () => {
        state += 0x6d2b79f5;
        let value = Math.imul(state ^ (state >>> 15), 1 | state);

        value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);

        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}

export const FLIGHT_MODES = {
    conserve: { label: "Conserve", science: 0.84, load: 0.78, risk: -0.16 },
    survey: { label: "Survey", science: 1, load: 1, risk: 0 },
    boost: { label: "Push limits", science: 1.15, load: 1.22, risk: 0.22 },
};

function flightRandom(flight) {
    // Keeping the draw count in the flight makes timing and decisions replayable.
    return seededRandom(
        (flight.seed + Math.imul(++flight.randomDraws, 0x9e3779b9)) >>> 0,
    )();
}

export function flightRisk(flight) {
    const gauges = flight.gauges;
    const powerUse =
        (gauges.demand * flight.loadFactor) /
        Math.max(1, gauges.supply * flight.solarFactor);
    const batteryUse =
        (gauges.eclipseNeed * flight.loadFactor) /
        Math.max(1, gauges.battery * flight.batteryFactor);
    const dataUse = gauges.generated / Math.max(1, gauges.returned);

    return clamp(
        0.12 +
            powerUse * 0.16 +
            batteryUse * 0.12 +
            dataUse * 0.1 +
            (1 - flight.health) * 0.28 +
            flight.riskAdjustment +
            FLIGHT_MODES[flight.operationMode].risk +
            (flight.difficulty === "director"
                ? 0.1
                : flight.difficulty === "cadet"
                    ? -0.06
                    : 0),
        0.08,
        0.9,
    );
}

function nextQuietInterval(flight) {
    return (
        MIN_QUIET_SECONDS +
        flightRandom(flight) * QUIET_INTERVAL_RANGE +
        Math.max(0, 0.35 - flightRisk(flight)) * 15
    );
}

export function createFlight(
    design,
    mission,
    catalog,
    seed,
    difficulty,
    options = {},
) {
    const gauges = evaluate(design, mission, catalog);

    if (!gauges.preflight.pass) {
        throw new Error("Pre-flight checks must pass before launch.");
    }

    const guided = Boolean(options.guided && mission.id === "hello");
    const flight = {
        seed,
        guided,
        spaceWeather: options.spaceWeather ? structuredClone(options.spaceWeather) : null,
        missionId: mission.id,
        difficulty,
        durationDays: Math.round(mission.years * 365),
        durationSeconds: FLIGHT_DURATION_SECONDS,
        elapsedSeconds: 0,
        nextCheckSeconds: 0,
        randomDraws: 0,
        operationMode: "survey",
        controlLog: [],
        observingSeconds: 0,
        loadSeconds: 0,
        riskAdjustment: 0,
        activeEvent: false,
        complete: false,
        design: structuredClone(design),
        gauges,
        events: [],
        decisions: [],
        health: 1,
        scienceFactor: 1,
        solarFactor: 1,
        loadFactor: 1,
        batteryFactor: 1,
        lifetimeFactor: 1,
        extraCost: 0,
        timeline: [],
        day: 0,
    };

    flight.nextCheckSeconds = nextQuietInterval(flight);

    return flight;
}

export function setFlightMode(flight, mode) {
    if (!FLIGHT_MODES[mode]) {
        throw new Error("Unknown flight mode.");
    }

    if (flight.operationMode === mode) {
        return flight;
    }

    return {
        ...flight,
        operationMode: mode,
        controlLog: [
            ...flight.controlLog,
            { atSeconds: flight.elapsedSeconds, mode },
        ],
    };
}

function incidentWeight(eventId, flight) {
    const gauges = flight.gauges;

    switch (eventId) {
    case "battery":
        return 1 + gauges.eclipseNeed / (gauges.battery * flight.batteryFactor) * 4;
    case "station":
        return 1 + gauges.generated / gauges.returned * 2;
    case "flare":
        return flight.design.bus.computer === "hardened" ? 0.6 : 2;
    default:
        return 1;
    }
}

function selectIncident(flight, catalog) {
    if (!flight.events.length && flight.guided) {
        return catalog.events.find((event) => {
            return event.id === "battery";
        });
    }

    if (!flight.events.length && flight.missionId === "apollo") {
        return catalog.events.find((event) => {
            return event.id === "array";
        });
    }

    const available = catalog.events.filter((event) => {
        return (
            event.id !== "array" &&
            !flight.events.some((previous) => {
                return previous.id === event.id;
            })
        );
    });
    const weights = available.map((event) => {
        return incidentWeight(event.id, flight);
    });
    let draw =
        flightRandom(flight) *
        weights.reduce((sum, weight) => {
            return sum + weight;
        }, 0);

    for (let i = 0; i < available.length; i++) {
        draw -= weights[i];
        if (draw <= 0) {
            return available[i];
        }
    }

    return available.at(-1);
}

// Advance only to the next incident, never past it. Chunked and single-step
// updates consume the same random draws and produce the same outcome.
export function advanceFlight(flight, seconds, catalog) {
    if (!Number.isFinite(seconds) || seconds < 0) {
        throw new Error("Invalid flight time.");
    }

    if (flight.activeEvent || flight.complete || seconds === 0) {
        return flight;
    }

    const next = structuredClone(flight);
    const target = Math.min(
        next.durationSeconds,
        next.elapsedSeconds + seconds,
    );

    while (next.elapsedSeconds < target) {
        const boundary = Math.min(
            target,
            next.nextCheckSeconds,
            next.durationSeconds,
        );
        const delta = boundary - next.elapsedSeconds;
        const mode = FLIGHT_MODES[next.operationMode];

        next.observingSeconds += delta * mode.science;
        next.loadSeconds += delta * mode.load;
        next.elapsedSeconds = boundary;
        next.day =
            (next.elapsedSeconds / next.durationSeconds) * next.durationDays;
        if (next.elapsedSeconds >= next.durationSeconds) {
            next.complete = true;
            break;
        }

        if (next.elapsedSeconds >= next.nextCheckSeconds) {
            const mustTeach = next.events.length === 0;
            const occurs =
                next.events.length < MAX_INCIDENTS &&
                (mustTeach ||
                    flightRandom(next) < 0.18 + flightRisk(next) * 0.78);

            if (occurs) {
                next.events.push(
                    applySpaceWeather(selectIncident(next, catalog), next.spaceWeather, next.seed),
                );
                next.activeEvent = true;
                break;
            }

            next.nextCheckSeconds =
                next.events.length >= MAX_INCIDENTS
                    ? Infinity
                    : next.elapsedSeconds + nextQuietInterval(next);
        }
    }

    return next;
}

export function resolveEvent(flight, choiceIndex) {
    const event = flight.events[flight.decisions.length];

    if (!event || !event.choices[choiceIndex]) {
        throw new Error("Invalid flight decision.");
    }

    const choice = event.choices[choiceIndex];
    const next = structuredClone(flight);
    const riskMultiplier = flight.design.bus.computer === "hardened" ? 0.35 : 1;
    const difficultyFactor =
        flight.difficulty === "cadet"
            ? 0.65
            : flight.difficulty === "director"
                ? 1.2
                : 1;

    next.health = clamp(
        next.health +
            (choice.health || 0) * difficultyFactor -
            (choice.risk || 0) * riskMultiplier * difficultyFactor,
        0,
        1,
    );
    next.scienceFactor = Math.max(
        0,
        next.scienceFactor + (choice.science || 0) * difficultyFactor,
    );
    next.solarFactor *= 1 + (choice.solar || 0);
    next.loadFactor *= 1 + (choice.load || 0);
    next.batteryFactor *= 1 + (choice.battery || 0);
    next.lifetimeFactor *= 1 + (choice.lifetime || 0);
    next.extraCost += choice.cost || 0;
    const responseRisk = {
        battery: [-0.1, 0.1],
        flare: [-0.12, 0.15],
        station: [-0.06, 0.04],
        debris: [-0.04, 0.1],
        array: [-0.12, -0.04],
    };

    next.riskAdjustment = clamp(
        next.riskAdjustment + responseRisk[event.id][choiceIndex],
        -0.3,
        0.4,
    );
    next.decisions.push(choiceIndex);
    next.activeEvent = false;
    next.nextCheckSeconds =
        next.events.length >= MAX_INCIDENTS
            ? Infinity
            : next.elapsedSeconds + nextQuietInterval(next);
    next.timeline.push({
        event: event.name,
        response: choice.label,
        detail: choice.detail,
        day: Math.floor(next.day),
        atSeconds: next.elapsedSeconds,
    });

    return next;
}

// Used during flight as well as in the debrief. Choice previews and the final
// outcome must use the same formulas, otherwise feedback can teach the wrong thing.
export function flightStatus(flight, mission) {
    const gauges = flight.gauges;
    const remaining = Math.max(
        0,
        flight.durationSeconds - flight.elapsedSeconds,
    );
    const mode = FLIGHT_MODES[flight.operationMode];
    const observingFactor =
        (flight.observingSeconds + remaining * mode.science) /
        flight.durationSeconds;
    const operatingLoad =
        (flight.loadSeconds + remaining * mode.load) / flight.durationSeconds;
    const powerRatio = Math.min(
        1,
        (gauges.supply * flight.solarFactor) /
            (gauges.demand * flight.loadFactor * operatingLoad),
    );
    const eclipseRatio = Math.min(
        1,
        (gauges.battery * flight.batteryFactor) /
            (gauges.eclipseNeed * flight.loadFactor * operatingLoad),
    );
    const lifetime = gauges.lifetime * flight.lifetimeFactor;
    const science =
        gauges.science *
        observingFactor *
        flight.scienceFactor *
        flight.health *
        powerRatio *
        eclipseRatio *
        Math.min(1, lifetime / mission.years);
    const cost = gauges.cost + flight.extraCost;
    const success =
        science >= mission.science &&
        flight.health >= 0.5 &&
        lifetime >= mission.years &&
        (cost <= mission.budget || mission.id === "sandbox");

    return {
        powerRatio,
        eclipseRatio,
        lifetime,
        science,
        cost,
        success,
        health: flight.health,
        battery: gauges.battery * flight.batteryFactor,
        supply: gauges.supply * flight.solarFactor,
        demand: gauges.demand * flight.loadFactor,
        eclipseNeed: gauges.eclipseNeed * flight.loadFactor,
    };
}

export function flightReport(flight, mission, previousScore = 0) {
    const gauges = flight.gauges;
    const { powerRatio, eclipseRatio, lifetime, science, cost, success } =
        flightStatus(flight, mission);
    const trust = Math.round(
        clamp(
            (gauges.margins.reduce((sum, margin) => {
                return sum + clamp(margin, 0, 0.4);
            }, 0) /
                2) *
                100,
            0,
            100,
        ),
    );
    const base = Math.round(
        clamp(science / mission.science, 0, 1.25) * 400 +
            (success ? 180 : 0) +
            flight.health * 100 +
            trust +
            clamp(1 - cost / mission.budget, 0, 1) * 100,
    );
    const learningBonus = previousScore > 0 && base > previousScore ? 25 : 0;
    const score = Math.min(1000, base + learningBonus);
    const causeChain = [];

    if (powerRatio < 1) {
        causeChain.push(
            flight.solarFactor < 1
                ? "Array damage exceeded the power margin → instrument brownouts → fewer observations."
                : "Power demand exceeded generation → instrument brownouts → fewer observations.",
        );
    }

    if (eclipseRatio < 1) {
        causeChain.push(
            "Battery reserve ran out in eclipse → instruments switched off → science was lost.",
        );
    }

    if (flight.health < 0.9) {
        causeChain.push(
            "Hardware took damage → reliability fell → fewer useful observations reached home.",
        );
    }

    if (lifetime < mission.years) {
        causeChain.push(
            "Fuel reserves were spent → operating life shortened → the mission ended early.",
        );
    }

    if (cost > mission.budget && mission.id !== "sandbox") {
        causeChain.push(
            "Crisis spending exceeded reserves → budget goal missed.",
        );
    }

    if (science < mission.science) {
        causeChain.push(
            "Returned science fell below the mission target. More observing capacity or safer decisions can close the gap.",
        );
    }

    if (!causeChain.length) {
        causeChain.push(
            "Healthy engineering margins → crises absorbed → the science made it home.",
        );
    }

    const hint =
        powerRatio < 1
            ? "Add solar area before the next flight."
            : eclipseRatio < 1
                ? "Increase battery capacity to survive a failed cell."
                : lifetime < mission.years
                    ? "Use a hardened computer or save fuel during crises."
                    : science < mission.science
                        ? "Increase primary-instrument duty and leave power headroom."
                        : cost > mission.budget
                            ? "Leave at least $8M in reserve for emergency ground support."
                            : "Try the same mission with a smaller launcher. Can you keep the science and spend less?";

    return {
        score,
        success,
        science,
        cost,
        lifetime,
        trust,
        learningBonus,
        causeChain,
        hint,
        health: flight.health,
    };
}
