import { advanceFlight, resolveEvent } from "../src/engine.js";

export function finishSimulation(
    initial,
    catalog,
    choose = () => {
        return 0;
    },
) {
    let flight = initial;

    for (let step = 0; step < 30 && !flight.complete; step++) {
        flight = advanceFlight(flight, flight.durationSeconds, catalog);
        if (flight.activeEvent) {
            flight = resolveEvent(flight, choose(flight));
        }
    }

    if (!flight.complete) {
        throw new Error("Simulation did not reach mission end.");
    }

    return flight;
}
