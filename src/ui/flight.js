import { flightStatus, FLIGHT_MODES } from "../engine.js";
import { icon } from "./icons.js";

function playbackControls(flight, playback, soundEnabled) {
    const speeds = [0.5, 1, 2, 4, 8].map((speed) => {
        const selected = playback.speed === speed;

        return `<button data-speed="${speed}" aria-label="Orbit speed ${speed} times" aria-pressed="${selected}" class="${selected ? "active" : ""}">${speed}×</button>`;
    });

    return `
        <div class="travel-controls">
            <button class="outline-button" data-action="travel-pause" aria-pressed="false">
                ${icon("pause")} Pause flight
            </button>
            <div class="travel-speeds" role="group" aria-label="Orbit playback speed">
                <span>ORBIT SPEED</span>
                ${speeds.join("")}
            </div>
            <button class="outline-button travel-sound" data-action="sound" aria-pressed="${soundEnabled}">
                ${icon("sound")} Sound ${soundEnabled ? "on" : "off"}
            </button>
            <span class="travel-hint">Space: pause · [ / ]: slower / faster · M: sound</span>
        </div>
        ${operationControls(flight, playback.phase === "ascent")}`;
}

function operationControls(flight, hidden) {
    const descriptions = {
        conserve: "Lower risk · less science",
        survey: "Balanced observations",
        boost: "More science · higher risk",
    };
    const modes = Object.entries(FLIGHT_MODES).map(([id, mode]) => {
        const selected = flight.operationMode === id;

        return `
            <button data-operation="${id}" aria-pressed="${selected}" class="${selected ? "active" : ""}">
                <strong>${mode.label}</strong>
                <small>${descriptions[id]}</small>
            </button>`;
    });

    return `
        <div class="flight-operations" ${hidden ? "hidden" : ""}>
            <div class="operation-heading">
                <span>YOU’RE IN COMMAND</span>
                <span id="risk-label"></span>
            </div>
            <div class="operation-buttons" role="group" aria-label="Satellite operating mode">
                ${modes.join("")}
            </div>
            <div class="risk-track"><i id="risk-fill"></i></div>
            <p id="operation-description">
                Choose how hard to work your satellite. Slowing playback gives you more time to watch;
                operating mode changes the engineering risk.
            </p>
        </div>`;
}

function telemetry(flight, mission, ascent) {
    const forecast = flightStatus(flight, mission);

    return `
        <div class="travel-telemetry">
            <div>
                <span>${ascent ? "ALTITUDE" : "DATA RETURNED"}</span>
                <strong id="travel-data">0 <small>${ascent ? "km" : "TB"}</small></strong>
            </div>
            <div>
                <span>SATELLITE HEALTH</span>
                <strong>${Math.round(flight.health * 100)}<small>%</small></strong>
            </div>
            <div>
                <span>BATTERY AVAILABLE</span>
                <strong>${Math.round(forecast.battery)}<small>Wh</small></strong>
            </div>
            <div>
                <span>SCIENCE FORECAST</span>
                <strong id="travel-science">${Math.floor(forecast.science)}<small>/ ${mission.science}</small></strong>
            </div>
        </div>`;
}

export function renderTravelScreen(flight, mission, playback, soundEnabled, ascent) {
    const title = ascent ? "We have liftoff." : flight.decisions.length ? "Back on course." : "Your satellite is on its way.";
    const sceneDescription = ascent
        ? "Rocket launching from Earth, climbing through the atmosphere and separating its boosters"
        : "Your satellite moving along its orbit and transmitting observations";

    return `
        <div class="travel-screen ${ascent ? "is-ascent" : "is-orbit"}">
            <div class="travel-header">
                <div>
                    <span class="dialog-eyebrow">${mission.patch} / FLIGHT SIMULATION</span>
                    <h2 id="dialog-title">${title}</h2>
                </div>
                <span class="travel-live" id="travel-status"><i></i> FLIGHT RUNNING</span>
            </div>
            <div class="flight-visual">
                <canvas id="flight-scene" role="img" aria-label="${sceneDescription}"></canvas>
                <div class="travel-clock">
                    <small>${ascent ? "FLIGHT TIME" : "MISSION DAY"}</small>
                    <strong id="travel-clock">${ascent ? "T+00:00" : Math.floor(flight.day)}</strong>
                </div>
                <div class="travel-caption">
                    <span id="travel-phase">${ascent ? "ENGINE IGNITION" : "SATELLITE DEPLOYED"}</span>
                    <p id="travel-caption">${ascent ? "Watch the rocket carry your satellite above the atmosphere." : "The rocket delivered your satellite. It is now collecting observations."}</p>
                </div>
            </div>
            ${telemetry(flight, mission, ascent)}
            <div class="travel-route" aria-label="Flight progress">
                <span class="passed"><i></i>Liftoff</span>
                <span class="passed"><i></i>Explore & observe</span>
                <span><i></i>Bring the science home</span>
            </div>
            <div class="travel-progress"><i id="travel-progress"></i></div>
            ${playbackControls(flight, playback, soundEnabled)}
        </div>`;
}
