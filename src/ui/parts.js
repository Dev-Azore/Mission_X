import { concepts } from "../game.js";
import { icon } from "./icons.js";

function introduction(eyebrow, title, description) {
    return `
        <div class="subsystem-intro">
            <span class="micro">${eyebrow}</span>
            <h4>${title}</h4>
            <p>${description}</p>
        </div>`;
}

function learningCard(symbol, title, description) {
    return `
        <div class="learning-card">
            ${icon(symbol)}
            <p><strong>${title}</strong> ${description}</p>
        </div>`;
}

function orbitOptions(design, catalog) {
    const options = catalog.orbits.map((orbit) => {
        const selected = design.orbitId === orbit.id;

        return `
            <label class="option-card ${selected ? "selected" : ""}">
                <input type="radio" name="orbit" value="${orbit.id}" ${selected ? "checked" : ""}>
                <span class="option-title">${orbit.name}<span class="radio-mark"></span></span>
                <span class="option-description">${orbit.description}</span>
                <span class="option-meta">
                    <b>${orbit.altitude}</b>
                    <span>${Math.round(orbit.sunlight * 100)}% sunlight</span>
                    <span class="orbit-code">${orbit.short}</span>
                </span>
            </label>`;
    });

    return introduction("FIRST, FIND YOUR PERSPECTIVE", "Choose your orbit.", "Where you fly changes everything below.")
        + `<div class="option-list">${options.join("")}</div>`
        + learningCard("sun", "A little more daylight.", "Sun-synchronous orbits give your panels more time in the Sun. More power, more possibilities.");
}

function rocketOptions(design, catalog) {
    const capacityFactor = design.orbitId === "lunar" ? 0.58 : design.orbitId === "sso" ? 0.9 : 1;
    const options = catalog.launchers.map((launcher) => {
        const selected = design.launcherId === launcher.id;

        return `
            <label class="option-card ${selected ? "selected" : ""}">
                <input type="radio" name="launcher" value="${launcher.id}" ${selected ? "checked" : ""}>
                <span class="option-title">${launcher.name}<span class="radio-mark"></span></span>
                <span class="option-description">${launcher.description}</span>
                <span class="option-meta">
                    <b>${Math.round(launcher.capacity * capacityFactor)} kg to orbit</b>
                    <span>$${launcher.cost}M</span>
                </span>
            </label>`;
    });

    return introduction("YOUR RIDE TO THE STARS", "Give ambition a lift.", "More capacity costs more. Leave a margin.")
        + `<div class="option-list">${options.join("")}</div>`
        + learningCard("mass", "Getting there is half the equation.", "The same rocket carries less mass to the Moon than to low Earth orbit.");
}

function slider(id, label, value, min, max, step, unit, hint) {
    return `
        <div class="slider-control">
            <label for="${id}">${label}<output id="output-${id}">${value} <small>${unit}</small></output></label>
            <input id="${id}" data-bus="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}">
            <p>${hint}</p>
        </div>`;
}

function supportSystems(design, catalog) {
    const bus = design.bus;
    const computers = catalog.parts.computers.map((computer) => {
        return `<option value="${computer.id}" ${bus.computer === computer.id ? "selected" : ""}>${computer.name} · $${computer.cost}M</option>`;
    });

    return `
        ${introduction("THE HARDWORKING ESSENTIALS", "Build in breathing room.", "Keep the lights on and the science flowing.")}
        <div class="sliders">
            ${slider("solarArea", "Solar array", bus.solarArea, 1, 8, 0.5, "m²", "More area → more power, mass, and cost.")}
            ${slider("battery", "Battery storage", bus.battery, 50, 1200, 50, "Wh", "Eclipse insurance. Batteries add mass.")}
            ${slider("antenna", "Antenna size", bus.antenna, 0.5, 4, 0.25, "m", "A wider antenna returns more science.")}
        </div>
        <label class="computer-label" for="computer">Flight computer</label>
        <select id="computer" class="wide-select">${computers.join("")}</select>
        ${learningCard("power", "Enough is rarely enough.", "A healthy power margin helps a mission survive array damage.")}`;
}

function observingControl(instrument) {
    return `
        <div class="duty-control">
            <label for="duty-${instrument.id}">
                Time spent observing
                <output id="duty-output-${instrument.id}">${Math.round(instrument.dutyCycle * 100)}%</output>
            </label>
            <input id="duty-${instrument.id}" data-duty="${instrument.id}" type="range" min="25" max="100" step="5" value="${instrument.dutyCycle * 100}">
        </div>`;
}

function sciencePayload(design, mission, catalog) {
    const instruments = catalog.parts.instruments.map((part) => {
        const selected = design.instruments.find((instrument) => {
            return instrument.id === part.id;
        });
        const required = mission.required === part.id;

        return `
            <div class="instrument-card ${selected ? "selected" : ""}">
                <label>
                    <span class="instrument-name">${part.name}</span>
                    <input type="checkbox" data-instrument="${part.id}" ${selected ? "checked" : ""}>
                    <span class="checkbox-mark">${icon("check")}</span>
                </label>
                <span class="instrument-tag">${part.tag}${required ? " · REQUIRED" : ""}</span>
                <p>${part.description}</p>
                <span class="instrument-specs">${part.mass} kg <span>·</span> ${part.power} W <span>·</span> $${part.cost}M</span>
                ${selected ? observingControl(selected) : ""}
            </div>`;
    });

    return introduction("MAKE THE JOURNEY MATTER", "Choose your research equipment.", "Cameras and sensors collect the science points you need.")
        + `<div class="instrument-list">${instruments.join("")}</div>`;
}

export function renderPartsContent(tab, design, mission, catalog) {
    const concept = concepts[tab];
    let content;

    switch (tab) {
    case "orbit": content = orbitOptions(design, catalog); break;
    case "rocket": content = rocketOptions(design, catalog); break;
    case "chip": content = supportSystems(design, catalog); break;
    case "payload": content = sciencePayload(design, mission, catalog); break;
    default: throw new Error(`Unknown design tab: ${tab}`);
    }

    return `
        <div class="concept-card">
            <span>${concept.word.toUpperCase()} · IN PLAIN WORDS</span>
            <p>${concept.meaning}</p>
        </div>
        ${content}`;
}
