import {
    defaultDesign,
    evaluate,
    isValidDesign,
    advisorMessages,
    createFlight,
    resolveEvent,
    flightReport,
    flightStatus,
    flightRisk,
    advanceFlight,
    setFlightMode,
    clamp,
} from "./engine.js";
import { createOrbit, makePlanet } from "./orbit.js";
import { createFlightScene } from "./flight-view.js";
import { createMissionAudio } from "./audio.js";
import {
    concepts,
    tutorialSteps,
    earnedStars,
    recordProgress,
    restoreProgress,
    playerRank,
    crisisExplanation,
} from "./game.js";

import { renderTravelScreen } from "./ui/flight.js";
import { icon } from "./ui/icons.js";
import { renderPartsContent } from "./ui/parts.js";
import { createStorage } from "./storage.js";

const $ = (selector) => {
    return document.querySelector(selector);
};

const escapeHtml = (value) => {
    return String(value).replace(/[&<>"']/g, (char) => {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        }[char];
    });
};

const catalog = {};
const state = {
    missionId: "hello",
    difficulty: "engineer",
    design: defaultDesign(),
    tab: "orbit",
    sound: false,
    flight: null,
    report: null,
    attempts: [],
    seed: 481516,
    busy: false,
    tutorial: null,
    progress: {},
    replayGuided: false,
    replaySeed: null,
};
let gauges;
let orbitView;
let toastTimer;
let flightTimer;
let flightScene;
const missionAudio = createMissionAudio();
const travel = {
    phase: "ascent",
    ascent: 0,
    speed: 1,
    paused: false,
    lastDecision: null,
};

const { read: readStorage, write: writeStorage } = createStorage(
    () => {
        return localStorage;
    },
    () => {
        toast(
            "Browser storage is unavailable. You can still play and export your mission.",
        );
    },
);

function mission() {
    return catalog.missions.find((item) => {
        return item.id === state.missionId;
    });
}

function currentOrbit() {
    return catalog.orbits.find((item) => {
        return item.id === state.design.orbitId;
    });
}

function toast(message) {
    $("#toast").textContent = message;
    $("#toast").classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        return $("#toast").classList.remove("visible");
    }, 3500);
}

function beep(frequency = 550, duration = 0.1) {
    missionAudio.tone(frequency, duration);
}

function renderSoundButtons() {
    document.querySelectorAll('[data-action="sound"]').forEach((button) => {
        button.classList.toggle("enabled", state.sound);
        button.setAttribute("aria-pressed", state.sound);
        button.setAttribute(
            "aria-label",
            state.sound ? "Mute mission sound" : "Enable mission sound",
        );
        button.innerHTML = `${icon("sound")}${button.classList.contains("travel-sound") ? `<span>Sound ${state.sound ? "on" : "off"}</span>` : ""}`;
    });
}

function shell() {
    $("#app").innerHTML = `
    <header class="topbar">
      <button class="brand" data-action="home" aria-label="MissionX start screen"><img src="./assets/mark.svg" alt="" width="36" height="36"><span>Mission<span class="brand-light">X</span><small>SPACE IS A SYSTEM.</small></span></button>
      <nav aria-label="Main navigation"><button class="nav-item active" data-action="design">Mission control</button><button class="nav-item" data-action="missions">The missions <span class="tiny-count">04</span></button><button class="nav-item" data-action="compare">Flight archive <span class="tiny-count" id="archive-count">0</span></button></nav>
      <div class="header-tools"><span class="connection"><i></i> SYSTEMS ONLINE</span><button class="icon-button" data-action="sound" aria-label="Enable sound" aria-pressed="false">${icon("sound")}</button><button class="icon-button" data-action="guide" aria-label="How to play">${icon("help")}</button></div>
    </header>
    <main>
      <section class="mission-heading"><div><div class="eyebrow"><span class="live-dot"></span> FLIGHT OPERATIONS <span class="slash">/</span> <span id="mission-type">EARTH OBSERVATION</span></div><h1>Make the mission possible<span>.</span></h1><p>One spacecraft. A thousand trade-offs. Every decision is connected.</p></div><button class="outline-button mission-switch" data-action="missions"><span class="mission-number" id="mission-number">01</span><span><small>YOUR MISSION</small><strong id="mission-name">Hello, Orbit</strong></span>${icon("chevron")}</button></section>
      <section class="brief-bar" aria-label="Mission brief"><span class="brief-icon">${icon("flag")}</span><div><span class="micro">THE OBJECTIVE</span><p id="objective"></p></div><div class="brief-target"><span class="micro">BUDGET</span><strong id="budget-target"></strong></div><div class="brief-target"><span class="micro">LIFETIME</span><strong id="life-target"></strong></div><label class="difficulty"><span class="micro">YOUR SEAT</span><select id="difficulty" aria-label="Difficulty"><option value="cadet">Cadet</option><option value="engineer" selected>Engineer</option><option value="director">Flight Director</option></select></label></section>
      <section id="mission-objectives" class="mission-objectives" aria-label="Your goals and game progress"></section>
      <div class="workspace-top"><div class="workspace-title"><span class="section-index">01</span><h2>Build your satellite</h2><span class="pill">DESIGN PHASE</span></div><div class="workspace-actions"><button class="text-button" data-action="tutorial" title="Learn by building and flying your first satellite">${icon("help")} Guided mission</button>
        <button class="text-button" data-action="reset" title="Restore this mission’s starting design. Your saved designs and flight archive stay.">${icon("reset")} Reset</button>
        <button class="text-button" data-action="save" title="Keep this design in the Flight archive on this browser. This does not launch it.">${icon("save")} Save design</button></div></div>
      <section id="tutorial-guide" aria-label="Guided first mission" hidden></section>
      <section class="console-grid" aria-label="Spacecraft design console">
        <aside class="panel config-panel"><div class="panel-heading"><h3>Build your spacecraft</h3><span class="micro" id="step-label">STEP 1 OF 4</span></div><div class="build-tabs" role="tablist" aria-label="Design subsystem">${[
            ["orbit", "Orbit"],
            ["rocket", "Rocket"],
            ["chip", "Systems"],
            ["payload", "Science"],
        ]
            .map(([id, label], i) => {
                return `<button id="tab-${id}" role="tab" aria-controls="parts-content" aria-selected="${i === 0}" data-tab="${id}" class="build-tab ${i === 0 ? "active" : ""}">${icon(id)}<span>${label}</span></button>`;
            })
            .join(
                "",
            )}</div><div id="parts-content" role="tabpanel" aria-labelledby="tab-orbit"></div><div class="config-footer"><span>${icon("link")} Everything is connected.</span><button class="text-button" id="next-step" data-action="next-tab">Next ${icon("arrow")}</button></div></aside>
        <section class="panel orbit-panel" aria-label="Live orbit visualization"><div class="orbit-top"><div><span class="micro">ORBITAL TWIN</span><span class="live-label"><i></i> LIVE SIMULATION</span></div><button class="icon-button" data-action="pause" aria-label="Pause orbit animation" aria-pressed="false">${icon("pause")}</button>
        </div>
        <div class="orbital-coordinates">INC <span id="inclination">97.6°</span> <span class="coordinate-separator">/</span> ECC 0.0012</div>
        <canvas id="orbit-canvas" role="img" aria-label="Animated spacecraft orbiting a procedural globe, with a ground station and downlink windows">
        </canvas>
        <div class="orbit-corner left"><span class="crosshair">+</span><span>TRACKING MX–01<br><b id="orbit-world">EARTH / SOL SYSTEM</b></span>
        </div>
        <div class="orbit-corner right"><span class="legend-dot"></span> ORBIT PATH<br><span class="legend-dot blue"></span> GROUND CONTACT</div>
        <div class="orbit-stats">
        <div><span class="micro">ALTITUDE</span><strong id="altitude"></strong>
        </div>
        <div><span class="micro">ORBITAL PERIOD</span><strong id="period"></strong>
        </div>
        <div><span class="micro">SUNLIGHT</span><strong id="sunlight"></strong>
        </div>
        </div>
        <div class="orbit-foot"><span>${icon("sun")} Sunlit arc</span><span>${icon("moon")} Eclipse passage</span><span>ILLUSTRATIVE · NOT TO SCALE</span></div></section>
        <aside class="panel gauges-panel"><div class="panel-heading"><h3>Mission health</h3><span class="live-label"><i></i> LIVE</span></div><p class="panel-intro">Six systems. One delicate balance.</p><div id="gauges" aria-live="polite" aria-atomic="true"></div><div class="ripple-note" id="ripple-note">${icon("link")} Change a part. Watch the ripple.</div></aside>
      </section>
      <section class="advisors-section"><div class="advisors-heading"><h2>Your crew, on the ground.</h2><span>THREE PERSPECTIVES. YOUR CALL.</span></div><div id="advisors" class="advisors-grid"></div></section>
      <section class="launch-bar"><div class="launch-status" id="launch-status"></div><div class="launch-actions"><button class="outline-button" data-action="preflight">Pre-flight checklist ${icon("arrow")}</button><button class="primary-button" data-action="launch">${icon("rocket")} Launch mission <kbd>↵</kbd></button></div></section>
      <footer><span>MISSIONX <span class="footer-divider">/</span> DESIGN. LAUNCH. LEARN.</span><button class="text-button" data-action="about">A small simulation of very big decisions ${icon("arrow")}</button><span class="footer-version">FLIGHT SOFTWARE v1.0</span></footer>
    </main>`;
    orbitView = createOrbit($("#orbit-canvas"), () => {
        return state.design;
    });
    renderMission();
    renderParts();
    updateGauges();
    renderSoundButtons();
}

function renderMission() {
    const m = mission();

    $("#mission-name").textContent = m.name;
    $("#mission-number").textContent = m.number;
    $("#mission-type").textContent = m.eyebrow;
    $("#objective").innerHTML =
        `${m.objective} <span class="objective-target">${m.science} science points required</span>`;
    $("#budget-target").textContent =
        m.id === "sandbox" ? "Unlimited" : `$${m.budget}M`;
    $("#life-target").textContent = `${m.years} years`;
    $("#difficulty").value = state.difficulty;
    $("#archive-count").textContent = state.attempts.length;
}

function renderParts() {
    const tab = state.tab;
    const tabs = ["orbit", "rocket", "chip", "payload"];

    document.querySelectorAll(".build-tab").forEach((button) => {
        button.classList.toggle("active", button.dataset.tab === tab);
        button.setAttribute("aria-selected", button.dataset.tab === tab);
    });
    $("#parts-content").setAttribute("aria-labelledby", `tab-${tab}`);
    $("#step-label").textContent = `STEP ${tabs.indexOf(tab) + 1} OF 4`;
    $("#next-step").innerHTML =
        tab === "payload" ? `Review ${icon("check")}` : `Next ${icon("arrow")}`;
    $("#parts-content").innerHTML = renderPartsContent(
        tab,
        state.design,
        mission(),
        catalog,
    );
    renderTutorial();
}

function updateGauges(changed = "") {
    const old = gauges;

    gauges = evaluate(state.design, mission(), catalog);
    const g = gauges;
    const previous = old || g;
    const gaugeList = [
        {
            id: "mass",
            label: "Mass",
            value: Math.round(g.mass),
            unit: "kg",
            sub: `of ${Math.round(g.capacity)} kg capacity`,
            ratio: g.mass / g.capacity,
            color: "blue",
            bad: g.mass > g.capacity,
            delta: g.mass - previous.mass,
        },
        {
            id: "power",
            label: "Power",
            value: Math.round(g.supply - g.demand),
            prefix: g.supply >= g.demand ? "+" : "",
            unit: "W",
            sub: `${Math.round(g.supply)} generated / ${Math.round(g.demand)} used`,
            ratio: g.demand / g.supply,
            color: "yellow",
            bad: g.supply < g.demand || g.battery < g.eclipseNeed,
            delta: g.supply - g.demand - (previous.supply - previous.demand),
        },
        {
            id: "data",
            label: "Science data",
            value: g.generated.toFixed(0),
            unit: "GB/day",
            sub: `${g.returned.toFixed(0)} GB/day downlink capacity`,
            ratio: g.generated / Math.max(g.returned, 1),
            color: "violet",
            bad: g.generated > g.returned,
            delta: g.generated - previous.generated,
        },
        {
            id: "comms",
            label: "Comms coverage",
            value: Math.min(999, Math.round(g.comms * 100)),
            unit: "%",
            sub:
                g.comms >= 1
                    ? "Every observation has a way home"
                    : "Some observations will be lost",
            ratio: Math.min(1, g.comms),
            color: "mint",
            bad: g.comms < 0.98,
            delta: (g.comms - previous.comms) * 100,
        },
        {
            id: "budget",
            label: "Budget",
            value: g.cost.toFixed(1),
            prefix: "$",
            unit: "M",
            sub: `${mission().id === "sandbox" ? "No budget limit" : `of $${mission().budget}M allocated`}`,
            ratio: mission().id === "sandbox" ? 0.1 : g.cost / mission().budget,
            color: "orange",
            bad: mission().id !== "sandbox" && g.cost > mission().budget,
            delta: g.cost - previous.cost,
        },
        {
            id: "clock",
            label: "Mission lifetime",
            value: g.lifetime.toFixed(1),
            unit: "yr",
            sub: `${mission().years}-year mission target`,
            ratio: Math.min(1, g.lifetime / (mission().years * 2)),
            color: "pink",
            bad: g.lifetime < mission().years,
            delta: g.lifetime - previous.lifetime,
        },
    ];

    $("#gauges").innerHTML = gaugeList
        .map((item) => {
            return `<div class="gauge ${item.color} ${item.bad ? "danger" : ""} ${changed && Math.abs(item.delta) > 0.01 ? "rippling" : ""}"><div class="gauge-label">${icon(item.id)}<span>${item.label}</span><span class="gauge-value">${item.prefix || ""}${item.value}<small>${item.unit}</small></span></div><div class="gauge-track"><span style="width:${clamp(item.ratio * 100, 3, 100)}%"></span><i style="left:80%"></i></div><div class="gauge-caption"><span>${item.sub}</span>${changed && Math.abs(item.delta) > 0.01 ? `<b class="gauge-delta">${item.delta > 0 ? "+" : ""}${Math.abs(item.delta) >= 10 ? item.delta.toFixed(0) : item.delta.toFixed(1)}</b>` : `<span class="gauge-indicator">${item.bad ? "!" : "↗"}</span>`}</div></div>`;
        })
        .join("");
    const messages = advisorMessages(g, mission());

    $("#advisors").innerHTML = catalog.advisors
        .map((advisor, index) => {
            return `<article class="advisor-card"><div class="advisor-avatar ${advisor.color}">${advisor.initials}<i></i></div><div><div class="advisor-name">${advisor.name}<span>${advisor.role}</span></div><p>“${messages[index]}”</p></div></article>`;
        })
        .join("");
    const orbit = currentOrbit();

    $("#altitude").textContent = orbit.altitude;
    $("#period").innerHTML = `${orbit.period} <small>min</small>`;
    $("#sunlight").innerHTML =
        `${Math.round(orbit.sunlight * 100)}<small>%</small>`;
    $("#inclination").textContent =
        orbit.id === "sso" ? "97.6°" : orbit.id === "lunar" ? "90.0°" : "51.6°";
    $("#orbit-world").textContent =
        orbit.world === "moon" ? "MOON / SOL SYSTEM" : "EARTH / SOL SYSTEM";
    const scienceReady = g.science >= mission().science;

    $("#launch-status").innerHTML =
        `<span class="status-symbol ${g.preflight.pass && scienceReady ? "ready" : "warning"}">${icon(g.preflight.pass && scienceReady ? "check" : "help")}</span><div><strong>${g.preflight.pass ? (scienceReady ? "Your mission is ready for the pad." : "Flight-ready. Give the science a second look.") : `${g.preflight.issues.length} ${g.preflight.issues.length === 1 ? "system needs" : "systems need"} your attention.`}</strong><span>${g.preflight.pass ? (scienceReady ? "All pre-flight systems green. The next move is yours." : `${Math.round(g.science)} / ${mission().science} science points projected. Increase observing duty or add a payload.`) : "Open the checklist to see what needs a second look."}</span></div>`;
    if (changed) {
        $("#ripple-note").innerHTML =
            `${icon("link")} <span><b>${escapeHtml(changed)}</b> → systems updated</span>`;
        $("#ripple-note").classList.remove("flash");
        void $("#ripple-note").offsetWidth;
        $("#ripple-note").classList.add("flash");
        beep(440, 0.06);
    }

    renderObjectives();
    renderTutorial();
    writeStorage("missionx-session", {
        missionId: state.missionId,
        difficulty: state.difficulty,
        design: state.design,
        tutorial: state.tutorial,
    });
}

function stars(count, className = "") {
    return `<span class="mission-stars ${className}" role="img" aria-label="${count} out of 3 stars">${[
        1, 2, 3,
    ]
        .map((number) => {
            return `<span class="${number <= count ? "earned" : ""}">★</span>`;
        })
        .join("")}</span>`;
}

function renderObjectives() {
    const m = mission();
    const live = state.flight
        ? flightStatus(state.flight, m)
        : { science: gauges.science, cost: gauges.cost };
    const phase = !state.flight
        ? 0
        : state.flight.complete
          ? 3
          : travel.phase === "ascent"
            ? 1
            : 2;
    const launchButton = $('.launch-actions [data-action="launch"]');
    const paused = state.flight && !state.report;

    launchButton.innerHTML = `${icon(paused ? "play" : "rocket")} ${paused ? "Resume mission" : "Launch mission"} <kbd>↵</kbd>`;
    $("#mission-objectives").innerHTML = `
    <div class="player-rank">${icon("flag")}<span><small>YOUR JOURNEY</small><strong>${playerRank(state.progress)}</strong></span>${stars((state.progress[m.id] == null ? 0 : state.progress[m.id].stars) || 0)}</div>
    <div class="objective-science"><div><span>${state.flight ? "SCIENCE PROTECTED" : "SCIENCE YOU CAN COLLECT"}</span><strong>${Math.floor(live.science)} <small>/ ${m.science} points</small></strong></div><div class="goal-track"><i style="width:${clamp((live.science / m.science) * 100, 0, 100)}%"></i></div><p>${live.science >= m.science ? "Target reached. Keep some spare capacity for surprises." : `Collect ${Math.ceil(m.science - live.science)} more points to reach the mission goal.`}</p></div>
    <ol class="game-phases" aria-label="Game stages">${[
        "Build",
        "Launch",
        "Survive",
        "Debrief",
    ]
        .map((name, index) => {
            return `<li class="${index === phase ? "current" : index < phase ? "done" : ""}" ${index === phase ? 'aria-current="step"' : ""}><span>${index < phase ? "✓" : index + 1}</span>${name}</li>`;
        })
        .join("")}</ol>`;
}

function renderTutorial() {
    const mount = $("#tutorial-guide");

    if (!mount) {
        return;
    }

    const nextButton = $("#next-step");

    nextButton.dataset.action = "next-tab";
    nextButton.disabled = false;
    nextButton.innerHTML =
        state.tab === "payload"
            ? `Review ${icon("check")}`
            : `Next ${icon("arrow")}`;
    $(".console-grid").classList.toggle(
        "tutorial-mode",
        state.tutorial !== null && !state.flight,
    );
    document.querySelectorAll(".tutorial-target").forEach((element) => {
        return element.classList.remove("tutorial-target");
    });
    if (state.tutorial === null || state.flight) {
        mount.hidden = true;

        return;
    }

    const step = tutorialSteps[state.tutorial];

    if (!step || !gauges) {
        return;
    }

    mount.hidden = false;
    mount.className = "tutorial-guide";
    const ready = step.check(state.design, gauges);
    const inRightTab = state.tab === step.tab;

    nextButton.dataset.action = inRightTab
        ? "tutorial-next"
        : "tutorial-return";
    nextButton.disabled = inRightTab && !ready;
    nextButton.innerHTML = `${inRightTab ? "Continue guided mission" : "Return to guided step"} ${icon("arrow")}`;
    mount.innerHTML = `<div class="tutorial-mentor">U<span>USAMA · YOUR ENGINEER</span></div><div class="tutorial-instruction"><span class="micro">FIRST FLIGHT · STEP ${state.tutorial + 1} OF ${tutorialSteps.length}</span><h2>${step.title}</h2><p>${step.instruction}</p><div class="tutorial-dots">${tutorialSteps
        .map((_, i) => {
            return `<i class="${i <= state.tutorial ? "complete" : ""}"></i>`;
        })
        .join(
            "",
        )}</div></div><div class="tutorial-controls"><button class="primary-button" data-action="${inRightTab ? "tutorial-next" : "tutorial-return"}" ${inRightTab && !ready ? "disabled" : ""}>${inRightTab ? step.action : "Show me the control"} ${icon("arrow")}</button><span class="tutorial-hint">${inRightTab && !ready ? step.hint : "You make the choices. Usama explains why."}</span><button class="text-button" data-action="skip-tutorial">Explore on my own</button></div>`;
    if (inRightTab) {
        const selectors = [
            'input[name="orbit"][value="sso"]',
            'input[name="launcher"][value="atlas"]',
            "#battery",
            '[data-duty="camera"]',
            null,
        ];
        const target =
            selectors[state.tutorial] && $(selectors[state.tutorial]);

        if (target != null) {
            const container = target.closest(
                ".option-card, .slider-control, .instrument-card",
            );

            if (container !== null) {
                container.classList.add("tutorial-target");
            }
        }
    }
}

function showWelcome() {
    const victories = Object.values(state.progress).reduce((sum, item) => {
        return sum + Number(item.wins > 0);
    }, 0);

    openDialog(
        `<div class="welcome-layout">
        <div class="welcome-copy">
        <div class="dialog-eyebrow">A PLAYABLE SPACE-MISSION GAME</div>
        <h2 id="dialog-title">Small satellite.<br>Big responsibility<span>.</span>
        </h2>
        <p class="welcome-premise">Floods are rising. Communities need a view from space.<br><strong>Can you build a satellite and bring the observations home?</strong>
        </p>
        <div class="welcome-loop">${[
            ["payload", "BUILD", "Choose your equipment."],
            ["rocket", "LAUNCH", "Send your satellite into orbit."],
            ["power", "SURVIVE", "Make the calls when things break."],
        ]
            .map(([symbol, title, text]) => {
                return `<div>${icon(symbol)}<strong>${title}</strong><span>${text}</span></div>`;
            })
            .join(
                "",
            )}</div><button class="primary-button welcome-play" data-action="tutorial">${icon("play")} Play your first mission <span>GUIDED · ABOUT 3 MIN</span></button><div class="welcome-secondary"><button class="text-button" data-action="free-play">${state.tutorial !== null ? "Continue guided build" : "Continue to mission control"} ${icon("arrow")}</button><button class="text-button" data-action="welcome-missions">Choose a challenge ${icon("arrow")}</button>
        </div>
        <p class="welcome-reassurance">No space knowledge needed. Your engineer explains every step.</p>
        </div>
        <div class="welcome-world">
        <div class="welcome-grid">
        </div>
        <div class="welcome-globe">
        </div>
        <div class="welcome-orbit"><span>${icon("payload")}</span>
        </div><span class="welcome-signal"><i></i> EARTH NEEDS A BETTER PERSPECTIVE</span>
        <div class="welcome-mission"><span>YOUR FIRST OBJECTIVE</span>
        <h3>HELLO, ORBIT</h3>
        <p>Return <b>55 science points</b>.<br>Stay within <b>$95M</b>.<br>Keep your satellite alive for <b>2 years</b>.</p>
        </div>
        <div class="welcome-profile"><span>${playerRank(state.progress)}</span><span>${victories} / 4 MISSIONS ACHIEVED</span></div></div></div>`,
        "welcome-dialog",
    );
    const globe = makePlanet();

    globe.className = "welcome-globe";
    globe.setAttribute("role", "img");
    globe.setAttribute("aria-label", "Earth, the home of your first mission");
    $(".welcome-globe").replaceWith(globe);
}

function startTutorial() {
    if (state.flight && !state.report) {
        resumeFlightOrLaunch();

        return;
    }

    loadDesign("hello", defaultDesign("hello"), "cadet", true);
    state.tutorial = 0;
    state.tab = "orbit";
    writeStorage("missionx-intro-v2", true);
    renderParts();
    updateGauges();
    $("#tutorial-guide").scrollIntoView({ behavior: "smooth", block: "start" });
}

function advanceTutorial() {
    if (state.tutorial === null) {
        return;
    }

    const step = tutorialSteps[state.tutorial];

    if (!step.check(state.design, gauges)) {
        toast(step.hint);

        return;
    }

    if (state.tutorial === tutorialSteps.length - 1) {
        showChecklist();

        return;
    }

    state.tutorial++;
    state.tab = tutorialSteps[state.tutorial].tab;
    renderParts();
    updateGauges();
    $("#parts-content").scrollIntoView({ behavior: "smooth", block: "center" });
}

function openDialog(content, className = "") {
    stopFlightScene();
    const dialog = $("#dialog");

    dialog.className = className;
    dialog.innerHTML = `<button class="dialog-close icon-button" data-action="close" aria-label="Close dialog">${icon("close")}</button>${content}`;
    if (!dialog.open) {
        dialog.showModal();
    }
}

function stopFlightScene() {
    if (flightScene != null) {
        flightScene.destroy();
    }

    flightScene = null;
    missionAudio.suspend();
}

function closeDialog() {
    stopFlightScene();
    $("#dialog").close();
}

function showMissions() {
    openDialog(
        `<div class="dialog-eyebrow">CHOOSE YOUR NEXT CHALLENGE</div>
        <h2 id="dialog-title">Four missions.<br>A universe of decisions.</h2>
        <p class="dialog-description">Start with Hello, Orbit if this is your first flight. Complete missions to earn stars and grow your rank. Every challenge is available to try.</p>
        <div class="campaign-status">${icon("flag")} ${playerRank(state.progress)} <span>${
            Object.values(state.progress).filter((item) => {
                return item.wins > 0;
            }).length
        } / 4 missions achieved</span></div><div class="missions-grid">${catalog.missions
            .map((m) => {
                const progress = state.progress[m.id];
                const summary = {
                    hello: "Learn to build a satellite that watches floods on Earth.",
                    lunar: "Search for water ice around the Moon. Distance makes power and communication harder.",
                    apollo: "A solar panel will break mid-flight. Build enough reserve to save the mission.",
                    sandbox:
                        "Experiment without a money limit. Discover what each part changes.",
                }[m.id];

                return `<button class="mission-card ${m.id === state.missionId ? "selected" : ""}" data-mission="${m.id}"><div class="mission-art ${m.world === "moon" ? "lunar" : m.id === "apollo" ? "apollo" : m.id === "sandbox" ? "sandbox" : ""}"><span class="mini-planet"></span><span class="mini-orbit"></span><span class="mission-art-number">${m.number} / MX</span><span class="mission-level">${m.id === "hello" ? "START HERE" : m.id === "sandbox" ? "FREE EXPERIMENT" : m.id === "apollo" ? "SURVIVAL CHALLENGE" : "DEEP-SPACE CHALLENGE"}</span></div><span class="micro">${m.eyebrow}</span><h3>${m.name} ${icon("arrow")}</h3><p>${summary}</p><span class="mission-card-meta">${m.id === "sandbox" ? "NO MONEY LIMIT" : `$${m.budget}M BUDGET`} <span>·</span> ${m.science} SCIENCE TO WIN</span><span class="mission-card-progress">${stars((progress == null ? 0 : progress.stars) || 0)}<span>${progress ? `Best: ${progress.best} · ${progress.flights} flight${progress.flights === 1 ? "" : "s"}` : "Not flown yet"}</span></span></button>`;
            })
            .join("")}</div>`,
        "wide-dialog",
    );
}

function showMissionBrief() {
    const m = mission();
    const research =
        m.world === "moon"
            ? "an infrared spectrometer to detect water ice"
            : "a camera to map floods";

    openDialog(
        `<div class="mission-briefing"><div class="dialog-eyebrow">MISSION ${m.number} / YOUR ASSIGNMENT</div><h2 id="dialog-title">${m.name}<span>.</span></h2><p class="briefing-story">${m.description}</p><div class="briefing-win"><span class="micro">HOW TO WIN THIS MISSION</span><ul><li>${icon("check")}Return at least <strong>${m.science} science points</strong>.</li><li>${icon("check")}Operate for <strong>${m.years} years</strong>.</li><li>${icon("check")}${m.id === "sandbox" ? "Experiment with no financial limit." : `Keep total spending within <strong>$${m.budget} million</strong>.`}</li><li>${icon("check")}Finish with at least <strong>50% satellite health</strong>.</li></ul></div><div class="briefing-explainer">${icon(m.world === "moon" ? "moon" : "payload")}<p>${m.id === "sandbox" ? "Try different parts and watch the gauges. Power, weight, communication, and lifetime still matter." : `You will need ${research}. The rocket carries it; the support systems keep it running.`}${m.id === "apollo" ? " A solar array WILL fail during this rescue challenge. Bring extra power." : ""}</p>
        </div>
        <p class="briefing-note">You build the satellite first. Then unexpected events test your design. Each response costs something.</p>
        <div class="briefing-actions">${m.id === "hello" ? `<button class="primary-button" data-action="tutorial">${icon("play")} Play with guidance</button>` : ""}<button class="${m.id === "hello" ? "outline-button" : "primary-button"}" data-action="free-play">Start designing ${icon("arrow")}</button></div></div>`,
    );
}

function showChecklist() {
    const rows = [
        [
            "Launch mass",
            gauges.mass <= gauges.capacity,
            `${Math.round(gauges.mass)} / ${Math.round(gauges.capacity)} kg`,
        ],
        [
            "Power balance",
            gauges.supply >= gauges.demand,
            `${Math.round(gauges.supply - gauges.demand)} W margin`,
        ],
        [
            "Eclipse reserve",
            gauges.battery >= gauges.eclipseNeed,
            `${Math.round(gauges.battery)} / ${Math.ceil(gauges.eclipseNeed)} Wh required`,
        ],
        [
            "Downlink capacity",
            gauges.comms >= 0.98,
            `${Math.round(gauges.comms * 100)}% coverage`,
        ],
        [
            "Mission funding",
            mission().id === "sandbox" || gauges.cost <= mission().budget,
            `$${gauges.cost.toFixed(1)}M`,
        ],
        [
            "Operating lifetime",
            gauges.lifetime >= mission().years,
            `${gauges.lifetime.toFixed(1)} / ${mission().years} years`,
        ],
        [
            "Target orbit",
            mission().id === "sandbox" ||
                currentOrbit().world === mission().world,
            currentOrbit().name,
        ],
        [
            "Science payload",
            !gauges.preflight.issues.some((issue) => {
                return issue.key === "science";
            }),
            `${state.design.instruments.length} instruments`,
        ],
    ];

    openDialog(
        `<div class="dialog-eyebrow">FLIGHT READINESS REVIEW</div><h2 id="dialog-title">${gauges.preflight.pass ? "You have a go for launch." : "Let’s get this flight-ready."}</h2><p class="dialog-description">Good missions begin with honest margins.</p><div class="checklist">${rows
            .map(([label, pass, value]) => {
                return `<div class="check-row"><span class="check-symbol ${pass ? "ready" : "warning"}">${pass ? icon("check") : "!"}</span><strong>${label}</strong><span>${value}</span></div>`;
            })
            .join("")}</div>${
            gauges.preflight.issues.length
                ? `<div class="fix-list">${gauges.preflight.issues
                      .map((issue) => {
                          return `<p><strong>${issue.message}</strong><br>${issue.fix}</p>`;
                      })
                      .join("")}</div>`
                : ""
        }<button class="primary-button full" data-action="${gauges.preflight.pass ? "launch" : "close"}">${gauges.preflight.pass ? `${icon("rocket")} Launch mission` : "Back to the drawing board"}</button>`,
    );
}

function readSavedDesigns() {
    return readStorage("missionx-designs", []).filter((saved) => {
        return (
            saved !== null &&
            typeof saved === "object" &&
            catalog.missions.some((mission) => {
                return mission.id === saved.missionId;
            }) &&
            isValidDesign(saved.design, catalog) &&
            typeof saved.date === "string" &&
            Number.isFinite(Date.parse(saved.date))
        );
    });
}

function saveDesign() {
    const saved = readSavedDesigns();

    saved.unshift({
        id: Date.now(),
        missionId: state.missionId,
        design: structuredClone(state.design),
        date: new Date().toISOString(),
    });
    writeStorage("missionx-designs", saved.slice(0, 3));
    toast("Design saved to the flight archive.");
}

function showArchive() {
    const saved = readSavedDesigns();

    openDialog(
        `<div class="dialog-eyebrow">THE FLIGHT ARCHIVE</div>
        <h2 id="dialog-title">Every flight teaches you.</h2>
        <p class="dialog-description">Your last three flights, side by side. Keep the lessons. Improve the design.</p>${
            state.attempts.length
                ? `<div class="comparison-scroll"><table class="comparison"><thead><tr><th>MISSION</th>${state.attempts
                      .map((attempt, i) => {
                          return `<th>FLIGHT ${state.attempts.length - i}<span>${escapeHtml(attempt.missionName)}</span></th>`;
                      })
                      .join("")}</tr></thead><tbody>${[
                      ["Score", "score", " / 1000"],
                      ["Science returned", "science", " pts"],
                      ["Total cost", "cost", "M"],
                      ["Lifetime", "lifetime", " yr"],
                      ["Advisor trust", "trust", "%"],
                  ]
                      .map(([label, key, unit]) => {
                          return `<tr><th>${label}</th>${state.attempts
                              .map((attempt) => {
                                  return `<td>${key === "cost" ? "$" : ""}${Number(attempt.report[key]).toFixed(["science", "cost", "lifetime"].includes(key) ? 1 : 0)}<small>${unit}</small></td>`;
                              })
                              .join("")}</tr>`;
                      })
                      .join("")}<tr><th>Outcome</th>${state.attempts
                      .map((attempt) => {
                          return `<td><span class="outcome ${attempt.report.success ? "success" : ""}">${attempt.report.success ? "Mission achieved" : "Lessons learned"}</span></td>`;
                      })
                      .join("")}</tr><tr><th>Fly again</th>${state.attempts
                      .map((_, i) => {
                          return `<td><button class="outline-button" data-attempt="${i}">Load design ${icon("arrow")}</button></td>`;
                      })
                      .join("")}</tr></tbody></table></div>`
                : `<div class="empty-state">${icon("orbit")}<h3>The next chapter is yours.</h3>
        <p>Launch your first mission to start comparing flights.</p>
        <button class="primary-button" data-action="close">Back to mission control ${icon("arrow")}</button></div>`
        }${
            saved.length
                ? `<h3 class="saved-heading">Saved on the drawing board</h3><div class="saved-designs">${saved
                      .map((save, i) => {
                          return `<button class="saved-design" data-saved="${i}">${icon("save")}<span>${escapeHtml(
                              (
                                  catalog.missions.find((m) => {
                                      return m.id === save.missionId;
                                  }) || { name: "Mission" }
                              ).name,
                          )}<small>${new Date(save.date).toLocaleDateString()}</small></span>${icon("arrow")}</button>`;
                      })
                      .join("")}</div>`
                : ""
        }`,
        "wide-dialog",
    );
}

function startLaunch() {
    if (state.busy) {
        return;
    }

    if (state.tutorial !== null && state.tutorial < tutorialSteps.length - 1) {
        closeDialog();
        $("#tutorial-guide").scrollIntoView({
            behavior: "smooth",
            block: "center",
        });
        toast(
            "Follow Usama’s highlighted step first, or choose Explore on my own.",
        );

        return;
    }

    if (!gauges.preflight.pass) {
        beep(180, 0.2);
        showChecklist();
        toast("Launch scrubbed. Resolve the pre-flight issues and try again.");

        return;
    }

    state.busy = true;
    state.seed =
        state.replaySeed ?? crypto.getRandomValues(new Uint32Array(1))[0];
    state.replaySeed = null;
    missionAudio.setEnabled(state.sound);
    state.report = null;
    Object.assign(travel, {
        phase: "ascent",
        ascent: 0,
        speed: 1,
        paused: false,
        lastDecision: null,
    });
    state.flight = createFlight(
        state.design,
        mission(),
        catalog,
        state.seed,
        state.difficulty,
        { guided: state.tutorial !== null || state.replayGuided },
    );
    renderObjectives();
    renderTutorial();
    let countdown = 3;
    const renderCountdown = () => {
        openDialog(
            `<div class="launch-cinematic"><div class="dialog-eyebrow">${mission().patch} / LAUNCH OPERATIONS</div>
        <h2 id="dialog-title">The sky is just the start.</h2>
        <div class="launch-scene">
        <div class="launch-stars">
        </div>
        <div class="rocket-craft">${icon("rocket")}<span class="exhaust"></span></div><div class="countdown">${countdown > 0 ? `T−0${countdown}` : "LIFTOFF"}</div></div><p>All stations report go. Make it count.</p></div>`,
            "launch-dialog",
        );
        beep(countdown > 0 ? 500 : 900, 0.15);
    };

    renderCountdown();
    flightTimer = setInterval(() => {
        countdown--;
        renderCountdown();
        if (countdown === 0) {
            clearInterval(flightTimer);
            flightTimer = setTimeout(showAscent, 400);
        }
    }, 900);
}

function resumeFlightOrLaunch() {
    if (state.busy) {
        return;
    }

    if (!state.flight || state.report) {
        startLaunch();

        return;
    }

    if (travel.phase === "ascent") {
        showAscent();
    } else if (travel.phase === "cruise") {
        showCruise();
    } else if (travel.phase === "recovery" && travel.lastDecision) {
        showDecisionFeedback(travel.lastDecision, state.flight);
    } else if (state.flight.activeEvent) {
        showFlight();
    } else {
        showCruise();
    }
}

function mountFlightScene(mode, event = "") {
    flightScene = createFlightScene($("#flight-scene"), () => {
        return {
            mode,
            ascent: travel.ascent,
            day: state.flight.day,
            durationDays: state.flight.durationDays,
            world: currentOrbit().world,
            paused: ["crisis", "recovery"].includes(mode) || travel.paused,
            speed: travel.speed,
            event: event || (state.flight.solarFactor < 1 ? "array" : ""),
            batteryFactor: state.flight.batteryFactor,
        };
    });
    missionAudio.setScene(
        mode,
        ["crisis", "recovery"].includes(mode) || travel.paused,
    );
    renderSoundButtons();
}

function travelScreen(ascent) {
    return renderTravelScreen(
        state.flight,
        mission(),
        travel,
        state.sound,
        ascent,
    );
}

function runTravel(update, arrive) {
    clearInterval(flightTimer);
    let previous = performance.now();

    flightTimer = setInterval(() => {
        const now = performance.now();
        const elapsed = Math.min(150, now - previous);

        previous = now;
        if (travel.paused) {
            return;
        }

        const arrived = update(elapsed * travel.speed);

        if (arrived) {
            clearInterval(flightTimer);
            state.busy = false;
            arrive();
        }
    }, 50);
}

function showAscent() {
    state.busy = true;
    travel.phase = "ascent";
    travel.paused = false;
    openDialog(travelScreen(true), "travel-dialog");
    mountFlightScene("ascent");
    runTravel((elapsed) => {
        travel.ascent = Math.min(1, travel.ascent + elapsed / 5500);
        const seconds = Math.floor(travel.ascent * 160);

        $("#travel-clock").textContent =
            `T+${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
        $("#travel-data").innerHTML =
            `${Math.round(travel.ascent * 160)} <small>km</small>`;
        $("#travel-progress").style.width = `${travel.ascent * 100}%`;
        $("#travel-phase").textContent =
            travel.ascent < 0.25
                ? "LIFTOFF · CLEARING THE TOWER"
                : travel.ascent < 0.58
                  ? "CLIMBING THROUGH THE ATMOSPHERE"
                  : travel.ascent < 0.85
                    ? "BOOSTER SEPARATION"
                    : "UPPER STAGE · PREPARING SATELLITE DEPLOYMENT";

        return travel.ascent >= 1;
    }, showCruise);
}

function updateOperationReadout() {
    if (!$("#risk-label")) {
        return;
    }

    const risk = flightRisk(state.flight);

    $("#risk-label").textContent =
        `${risk < 0.25 ? "LOW" : risk < 0.5 ? "GUARDED" : "HIGH"} SYSTEM RISK`;
    $("#risk-fill").style.width = `${risk * 100}%`;
    $("#risk-fill").classList.toggle("high", risk >= 0.5);
    const science = $("#travel-science");

    if (science) {
        science.innerHTML = `${Math.floor(flightStatus(state.flight, mission()).science)}<small>/ ${mission().science}</small>`;
    }
}

function showCruise() {
    state.busy = true;
    travel.phase = "cruise";
    travel.paused = false;
    openDialog(travelScreen(false), "travel-dialog");
    mountFlightScene("cruise");
    updateOperationReadout();
    runTravel(
        (elapsed) => {
            state.flight = advanceFlight(state.flight, elapsed / 1000, catalog);
            const flight = state.flight;

            $("#travel-clock").textContent = Math.floor(flight.day);
            const observingRatio = flight.elapsedSeconds
                ? flight.observingSeconds / flight.elapsedSeconds
                : 1;

            $("#travel-data").innerHTML =
                `${((Math.min(flight.gauges.generated, flight.gauges.returned) * flight.day * flight.scienceFactor * observingRatio) / 1000).toFixed(1)} <small>TB</small>`;
            $("#travel-progress").style.width =
                `${(flight.elapsedSeconds / flight.durationSeconds) * 100}%`;
            $("#travel-phase").textContent =
                "IN ORBIT · WATCH, EXPLORE, AND STAY READY";
            updateOperationReadout();

            return flight.activeEvent || flight.complete;
        },
        () => {
            return state.flight.activeEvent ? showFlight() : finishFlight();
        },
    );
}

function showFlight() {
    const flight = state.flight;
    const index = flight.decisions.length;

    if (!flight.activeEvent) {
        if (flight.complete) {
            finishFlight();
        } else {
            showCruise();
        }

        return;
    }

    const event = flight.events[index];
    const explanation = crisisExplanation(event, flight);
    const status = flightStatus(flight, mission());

    travel.phase = "crisis";
    travel.paused = true;
    renderObjectives();
    openDialog(
        `
    <div class="crisis-scene"><canvas id="flight-scene" role="img" aria-label="The satellite has stopped in the simulation while you respond to the problem"></canvas><span class="scene-paused">${icon("pause")} FLIGHT PAUSED · YOUR RESPONSE IS NEEDED</span></div><div class="flight-layout">
      <div class="flight-sidebar">
        <span class="micro">${mission().patch} / IN FLIGHT</span>
        <div class="flight-orb">${icon("orbit")}</div>
        <span class="flight-day">DAY <b>${Math.floor(flight.day)}</b></span>
        <div class="incident-history">${icon("check")} ${flight.decisions.length} INCIDENT${flight.decisions.length === 1 ? "" : "S"} HANDLED</div><p>FLIGHT PAUSED · TAKE YOUR TIME</p>
        <div class="flight-metric"><span>SATELLITE HEALTH</span><strong>${Math.round(flight.health * 100)}%</strong></div>
        <div class="flight-metric"><span>SCIENCE / TARGET</span><strong>${Math.floor(status.science)} / ${mission().science}</strong></div>
        <div class="flight-metric"><span>BATTERY LEFT</span><strong>${Math.round(status.battery)} Wh</strong></div>
        <div class="flight-metric"><span>MONEY LEFT</span><strong>${mission().id === "sandbox" ? "Unlimited" : `$${(mission().budget - status.cost).toFixed(1)}M`}</strong></div>
        <span class="seed-label">REPLAY SEED ${flight.seed}${flight.guided ? " / TRAINING" : ""}</span>
      </div>
      <div class="flight-main">
        <div class="event-label"><i></i> ${event.label}</div>
        <h2 id="dialog-title">${event.name}<span>.</span></h2>
        <p class="event-description">${explanation.meaning}</p>
        <div class="flight-advisor">${icon("comms")}<p><strong>USAMA EXPLAINS</strong>${explanation.advice}</p></div>
        <span class="micro">PICK A RESPONSE · SEE THE TRADE-OFF BEFORE YOU COMMIT</span>
        <div class="event-choices">${event.choices
            .map((choice, i) => {
                const preview = flightStatus(
                    resolveEvent(flight, i),
                    mission(),
                );
                const difference = preview.science - status.science;

                return `<button class="event-choice" data-choice="${i}"><span class="choice-number">0${i + 1}</span><span><strong>${choice.label}</strong><small>${explanation.choices[i]}</small><span class="choice-effects"><span>Science: ${Math.floor(preview.science)} / ${mission().science}</span><span>Health: ${Math.round(preview.health * 100)}%</span>${preview.battery !== status.battery ? `<span>Battery: ${Math.round(preview.battery)} Wh</span>` : ""}${preview.cost !== status.cost ? `<span>Cost: +$${(preview.cost - status.cost).toFixed(0)}M</span>` : ""}${preview.lifetime !== status.lifetime ? `<span>Life: ${preview.lifetime.toFixed(1)} yr</span>` : ""}</span>${difference < 0 ? `<em class="choice-warning">About ${Math.ceil(-difference)} science points at stake</em>` : "<em>Science protected with this response</em>"}</span>${icon("arrow")}</button>`;
            })
            .join("")}</div>
        ${
            flight.timeline.length
                ? `<details class="flight-log"><summary>Flight log · ${flight.timeline.length} decision${flight.timeline.length === 1 ? "" : "s"}</summary>${flight.timeline
                      .map((item) => {
                          return `<p>DAY ${item.day} — ${item.event}<br><strong>${item.response}</strong></p>`;
                      })
                      .join("")}</details>`
                : ""
        }
      </div>
    </div>`,
        "flight-dialog",
    );
    mountFlightScene("crisis", event.id);
    beep(event.id === "array" ? 170 : 330, 0.15);
}

function showDecisionFeedback(before, after) {
    travel.phase = "recovery";
    travel.paused = true;
    travel.lastDecision = before;
    const event = before.events[before.decisions.length];
    const choice = event.choices[after.decisions.at(-1)];
    const initial = flightStatus(before, mission());
    const current = flightStatus(after, mission());
    const batterySafe = current.battery >= current.eclipseNeed;
    const lessons = {
        battery: choice.battery
            ? `You disconnected the faulty battery section. ${Math.round(current.battery)} Wh remains; an eclipse needs about ${Math.ceil(current.eclipseNeed)} Wh. ${batterySafe ? "Your spare battery capacity absorbed the failure. That is the reserve you built in." : "The remaining battery is too small for an eclipse. Instruments will lose operating time."}`
            : "You kept the battery capacity by cycling it. The interrupted research and hardware stress reduced the science you can return.",
        flare: choice.risk
            ? "You continued observing through the flare. The health loss reduces how much useful science the mission can deliver."
            : "You paused research to protect the electronics. The spacecraft kept its health, at the cost of some observing time.",
        station: choice.cost
            ? "Your emergency budget paid for a partner ground station. The observations still have a way home."
            : "You saved money by sending fewer observations. The mission will return less science.",
        debris: choice.lifetime
            ? "The spacecraft moved safely out of the way. The fuel you spent reduces how long it can operate."
            : "You saved the fuel, but accepted a spacecraft-health penalty. Lower health reduces useful science.",
        array:
            current.powerRatio >= 1
                ? "The response restored a working power balance. Your spare power and operating changes kept the instruments running."
                : "The remaining panels cannot meet demand. The power shortfall causes instruments to switch off and lose science.",
    };
    const metrics = [
        [
            "BATTERY",
            `${Math.round(initial.battery)} Wh`,
            `${Math.round(current.battery)} Wh`,
        ],
        [
            "SCIENCE FORECAST",
            `${Math.floor(initial.science)} pts`,
            `${Math.floor(current.science)} pts`,
        ],
        [
            "SATELLITE HEALTH",
            `${Math.round(initial.health * 100)}%`,
            `${Math.round(current.health * 100)}%`,
        ],
        [
            "TOTAL SPENDING",
            `$${initial.cost.toFixed(1)}M`,
            `$${current.cost.toFixed(1)}M`,
        ],
    ];

    openDialog(
        `<div class="decision-feedback">
        <div class="dialog-eyebrow">YOUR DECISION HAD A CONSEQUENCE</div>
        <div class="recovery-scene">
        <canvas id="flight-scene" role="img" aria-label="Your satellite after the response, ready to resume its flight">
        </canvas><span class="scene-repaired">${icon("check")} RESPONSE APPLIED · READY TO RESUME</span></div><h2 id="dialog-title">${choice.label}.</h2><p class="decision-lesson">${lessons[event.id]}</p><div class="decision-metrics">${metrics
            .map(([label, from, to]) => {
                return `<div class="${from !== to ? "changed" : ""}"><span>${label}</span><strong><s>${from}</s>${icon("arrow")}<b>${to}</b></strong></div>`;
            })
            .join(
                "",
            )}</div><div class="decision-goal ${current.science >= mission().science ? "on-track" : ""}">${icon(current.science >= mission().science ? "check" : "help")}<span>${current.science >= mission().science ? `Science target is still within reach: ${Math.floor(current.science)} / ${mission().science} points.` : `Science forecast is below target: ${Math.floor(current.science)} / ${mission().science} points.`} Other systems and future decisions still matter.</span></div><button class="primary-button full" data-action="continue-flight">Resume flight ${icon("arrow")}</button></div>`,
        "decision-dialog",
    );
    mountFlightScene("recovery", event.id);
    renderObjectives();
    beep(current.health < initial.health ? 240 : 660, 0.12);
}

function reportGameSummary(report) {
    const m = mission();
    const checks = [
        [
            "Return enough science",
            report.science >= m.science,
            `${Math.floor(report.science)} / ${m.science} points`,
        ],
        [
            "Keep the satellite healthy",
            report.health >= 0.5,
            `${Math.round(report.health * 100)}% / 50% minimum`,
        ],
        [
            "Stay within budget",
            m.id === "sandbox" || report.cost <= m.budget,
            m.id === "sandbox"
                ? "No financial limit"
                : `$${report.cost.toFixed(1)}M / $${m.budget}M`,
        ],
        [
            "Last the full mission",
            report.lifetime >= m.years,
            `${report.lifetime.toFixed(1)} / ${m.years} years`,
        ],
    ];

    return `<div class="game-result ${report.success ? "victory" : "defeat"}"><span class="micro">${report.success ? "MISSION COMPLETE" : "MISSION LOST · TRY A NEW APPROACH"}</span>${stars(earnedStars(report), "result-stars")}<h3>${report.success ? `${m.patch}: you brought the science home.` : "Your satellite taught you something."}</h3><p>${report.success ? `Your rank: ${playerRank(state.progress)}. Earn a second star at 750 points and a third at 900.` : "Read the missed goals below. Change one thing, then see whether it helps on the next flight."}</p><div class="result-goals">${checks
        .map(([label, pass, value]) => {
            return `<div class="${pass ? "met" : "missed"}"><span>${pass ? icon("check") : "!"}</span><strong>${label}</strong><small>${value}</small></div>`;
        })
        .join("")}</div></div>`;
}

function finishFlight() {
    const previous = state.attempts.find((item) => {
        return item.missionId === state.missionId;
    });
    const report = flightReport(
        state.flight,
        mission(),
        previous == null ? undefined : previous.report.score,
    );

    state.report = report;
    state.progress = recordProgress(state.progress, state.missionId, report);
    writeStorage("missionx-progress", state.progress);
    if (state.tutorial !== null) {
        state.tutorial = null;
        writeStorage("missionx-tutorial-finished", true);
    }

    renderObjectives();
    renderTutorial();
    writeStorage("missionx-session", {
        missionId: state.missionId,
        difficulty: state.difficulty,
        design: state.design,
        tutorial: null,
    });
    state.attempts.unshift({
        id: Date.now(),
        missionId: state.missionId,
        missionName: mission().name,
        design: structuredClone(state.design),
        difficulty: state.difficulty,
        seed: state.flight.seed,
        guided: state.flight.guided,
        report,
    });
    state.attempts = state.attempts.slice(0, 3);
    writeStorage("missionx-attempts", state.attempts);
    $("#archive-count").textContent = state.attempts.length;
    openDialog(
        `${reportGameSummary(report)}<div class="report-top"><div class="mission-patch"><span>MISSIONX</span><div>${icon("orbit")}<b>${mission().patch}</b></div><span>DESIGN · LAUNCH · LEARN</span></div><div><div class="dialog-eyebrow">MISSION DEBRIEF / ${mission().patch}</div><h2 id="dialog-title">${report.success ? "You made it matter." : "Space is a tough teacher."}</h2><p class="dialog-description">${report.success ? "The mission delivered. Your margins made the difference." : "Every attempt is a better starting point. Here is what this one taught us."}</p><span class="outcome ${report.success ? "success" : ""}">${report.success ? "MISSION OBJECTIVES ACHIEVED" : "MISSION OBJECTIVES MISSED"}</span></div></div><div class="report-stats"><div class="score-stat"><span class="micro">MISSION SCORE</span><strong>${report.score}<small>/ 1000</small></strong></div><div><span class="micro">SCIENCE RETURNED</span><strong>${Math.round(report.science)}<small>/ ${mission().science} pts</small></strong></div><div><span class="micro">TOTAL COST</span><strong>$${report.cost.toFixed(1)}<small>M</small></strong></div><div><span class="micro">ADVISOR TRUST</span><strong>${report.trust}<small>%</small></strong></div></div>${report.learningBonus ? '<p class="learning-bonus">+25 learning bonus — you improved on your previous flight.</p>' : ""}<div class="report-sections"><section><h3>How one decision became another.</h3><div class="cause-chain">${report.causeChain
            .map((cause, i) => {
                return `<p><span>0${i + 1}</span>${cause}</p>`;
            })
            .join(
                "",
            )}</div><div class="next-lesson"><span class="micro">YOUR NEXT ITERATION</span><p>${report.hint}</p></div></section><section><h3>The flight recorder.</h3><div class="report-timeline">${state.flight.timeline
            .map((item) => {
                return `<div><span>DAY ${item.day}</span><strong>${item.event}</strong><p>${item.response}</p></div>`;
            })
            .join(
                "",
            )}</div></section></div><div class="report-actions">${report.success ? `<button class="primary-button" data-action="next-mission">Next challenge ${icon("arrow")}</button>` : ""}<button class="outline-button" data-action="export-patch">${icon("download")} Mission patch</button><button class="outline-button" data-action="export">${icon("download")} Flight record</button>
        <button class="outline-button" data-action="compare">Compare flights</button>
        <button class="primary-button" data-action="redesign">Redesign & fly again ${icon("arrow")}</button></div>`,
        "report-dialog",
    );
    missionAudio.effect(report.success ? "success" : "failure");
}

function showGuide() {
    openDialog(
        `<div class="dialog-eyebrow">THE FLIGHT MANUAL · NO SPACE KNOWLEDGE NEEDED</div>
        <h2 id="dialog-title">You make the decisions.<br>The satellite lives with them.</h2>
        <p class="dialog-description">This is a strategy game. Build a satellite, launch it, and respond when things go wrong. Win by meeting all four goals: science, money, lifetime, and satellite health.</p>
        <div class="guide-steps">${Object.values(concepts)
            .map((concept, i) => {
                return `<div class="guide-step"><span>0${i + 1}</span><div><h3>${concept.word}: ${concept.question}</h3><p>${concept.meaning}</p></div></div>`;
            })
            .join("")}</div>
        <div class="manual-extra">
        <h3>What the buttons do</h3>
        <p><b>Reset</b> restores this mission’s starting satellite. <b>Save design</b> keeps a copy in this browser’s Flight archive. <b>Pre-flight checklist</b> checks that the design can operate. <b>Launch mission</b> starts the flight.</p>
        <h3>What happens when something breaks?</h3>
        <p>You choose a response. For a battery fault, <b>Isolate the module</b> disconnects one broken battery section. <b>Cycle the battery</b> tries to recover capacity, but costs research time and health. Each choice shows the predicted numbers before you commit.</p>
        <h3>How do I control the flight?</h3>
        <p>Use <b>0.5×</b> to slow down or <b>2×–8×</b> to accelerate. <b>Conserve</b> reduces risk and science; <b>Push limits</b> increases both. Surprises arrive at unpredictable times. Safer responses can reduce later risk. Enable <b>Sound</b> for rocket rumble, orbital ambience, and alerts.</p>
        <h3>How do I improve?</h3>
        <p>The result shows which goals you met and what failed. Change the design, fly again, and compare the results. One star means a successful mission; earn more at 750 and 900 total score.</p>
        </div>
        <button class="primary-button full" data-action="tutorial">${icon("play")} Learn by playing the first mission</button>`,
    );
}

function loadDesign(
    missionId,
    design,
    difficulty = state.difficulty,
    quiet = false,
) {
    state.tutorial = null;
    state.replayGuided = false;
    state.replaySeed = null;
    state.missionId = missionId;
    state.design = structuredClone(design);
    state.difficulty = difficulty;
    state.flight = null;
    state.report = null;
    gauges = null;
    renderMission();
    renderParts();
    updateGauges();
    closeDialog();
    if (!quiet) {
        toast("Design loaded. Your next iteration starts here.");
    }
}

function exportFile(name, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a");

    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => {
        return URL.revokeObjectURL(url);
    }, 1000);
}

function exportPatch() {
    const name = mission().patch;
    const score = (state.report == null ? 0 : state.report.score) || 0;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800"><rect width="800" height="800" rx="60" fill="#0d171e"/><circle cx="400" cy="400" r="320" fill="#13262c" stroke="#a9efd0" stroke-width="6"/><circle cx="400" cy="400" r="295" fill="none" stroke="#a9efd0" stroke-width="1" stroke-dasharray="3 9"/><g fill="#d7e7dc" font-family="Arial,sans-serif" text-anchor="middle"><text x="400" y="210" font-size="28" letter-spacing="9">MISSIONX</text><text x="400" y="520" font-size="42" font-weight="bold" letter-spacing="5">${name}</text><text x="400" y="570" font-size="18" letter-spacing="5">DESIGN · LAUNCH · LEARN</text><text x="400" y="625" font-size="20">MISSION SCORE ${score} / 1000</text></g><circle cx="400" cy="350" r="91" fill="#315d67" stroke="#a9efd0" stroke-width="2"/><ellipse cx="400" cy="350" rx="175" ry="54" transform="rotate(-28 400 350)" fill="none" stroke="#a9efd0" stroke-width="3"/><path d="m350 290 60 15 35 60-29 55-31-31-39-25Z" fill="#78a58f"/><path d="m540 240 14 0 0 14-14 0Z" fill="#f6d08a"/><g fill="#e8f1eb"><circle cx="250" cy="272" r="3"/><circle cx="560" cy="430" r="3"/><circle cx="300" cy="440" r="2"/></g></svg>`;

    exportFile(
        `missionx-${name.toLowerCase()}-patch.svg`,
        svg,
        "image/svg+xml",
    );
}

document.addEventListener("click", (event) => {
    const speedButton = event.target.closest("[data-speed]");

    if (speedButton) {
        travel.speed = Number(speedButton.dataset.speed);
        document.querySelectorAll("[data-speed]").forEach((button) => {
            const selected = Number(button.dataset.speed) === travel.speed;

            button.classList.toggle("active", selected);
            button.setAttribute("aria-pressed", selected);
        });

        return;
    }

    const operation = event.target.closest("[data-operation]");

    if (
        operation &&
        state.flight &&
        !state.flight.activeEvent &&
        !state.flight.complete
    ) {
        state.flight = setFlightMode(state.flight, operation.dataset.operation);
        document.querySelectorAll("[data-operation]").forEach((button) => {
            const active =
                button.dataset.operation === state.flight.operationMode;

            button.classList.toggle("active", active);
            button.setAttribute("aria-pressed", active);
        });
        updateOperationReadout();
        beep(600, 0.06);

        return;
    }

    const tab = event.target.closest("[data-tab]");

    if (tab) {
        state.tab = tab.dataset.tab;
        renderParts();

        return;
    }

    const missionButton = event.target.closest("[data-mission]");

    if (missionButton) {
        const id = missionButton.dataset.mission;

        loadDesign(id, defaultDesign(id));
        showMissionBrief();

        return;
    }

    const choice = event.target.closest("[data-choice]");

    if (choice) {
        const before = state.flight;

        state.flight = resolveEvent(before, Number(choice.dataset.choice));
        showDecisionFeedback(before, state.flight);

        return;
    }

    const attempt = event.target.closest("[data-attempt]");

    if (attempt) {
        const item = state.attempts[Number(attempt.dataset.attempt)];

        loadDesign(item.missionId, item.design, item.difficulty);
        state.replaySeed = item.seed;
        state.replayGuided = Boolean(item.guided);

        return;
    }

    const saved = event.target.closest("[data-saved]");

    if (saved) {
        const item = readSavedDesigns()[Number(saved.dataset.saved)];

        loadDesign(item.missionId, item.design);

        return;
    }

    const actionElement = event.target.closest("[data-action]");
    const action = actionElement === null ? null : actionElement.dataset.action;

    if (!action) {
        return;
    }

    if (action === "close") {
        if (state.busy) {
            clearInterval(flightTimer);
            clearTimeout(flightTimer);
            state.busy = false;
        }

        if (state.flight && !state.report) {
            toast(
                "Flight paused. Resume mission continues from your last decision.",
            );
        }

        closeDialog();
    }

    if (action === "home") {
        showWelcome();
    }

    if (action === "tutorial") {
        startTutorial();
    }

    if (action === "tutorial-next") {
        advanceTutorial();
    }

    if (action === "tutorial-return" && state.tutorial !== null) {
        state.tab = tutorialSteps[state.tutorial].tab;
        renderParts();
        $("#parts-content").scrollIntoView({
            behavior: "smooth",
            block: "center",
        });
    }

    if (action === "skip-tutorial") {
        state.tutorial = null;
        updateGauges();
        toast(
            "Free design enabled. Guided mission is always available above the console.",
        );
    }

    if (action === "free-play") {
        writeStorage("missionx-intro-v2", true);
        closeDialog();
    }

    if (action === "welcome-missions") {
        writeStorage("missionx-intro-v2", true);
        showMissions();
    }

    if (action === "continue-flight") {
        showCruise();
    }

    if (action === "travel-pause") {
        travel.paused = !travel.paused;
        const button = event.target.closest("button");

        button.innerHTML = `${icon(travel.paused ? "play" : "pause")} ${travel.paused ? "Resume flight" : "Pause flight"}`;
        button.setAttribute("aria-pressed", travel.paused);
        $("#travel-status").innerHTML =
            `<i></i> ${travel.paused ? "FLIGHT PAUSED" : "FLIGHT RUNNING"}`;
        $("#travel-status").classList.toggle("paused", travel.paused);
        missionAudio.setScene(travel.phase, travel.paused);
    }

    if (action === "next-mission") {
        const ids = catalog.missions.map((item) => {
            return item.id;
        });
        const next = ids[(ids.indexOf(state.missionId) + 1) % ids.length];

        loadDesign(next, defaultDesign(next));
        showMissionBrief();
    }

    if (action === "missions") {
        showMissions();
    }

    if (action === "design") {
        closeDialog();
        $(".workspace-top").scrollIntoView({ behavior: "smooth" });
    }

    if (action === "guide") {
        showGuide();
    }

    if (action === "save") {
        saveDesign();
    }

    if (action === "compare") {
        showArchive();
    }

    if (action === "reset") {
        if (state.tutorial !== null) {
            state.tutorial = 0;
            state.tab = "orbit";
        }

        state.design = defaultDesign(state.missionId);
        state.flight = null;
        gauges = null;
        renderParts();
        updateGauges("Design reset");
        toast("Back to the starting design.");
    }

    if (action === "next-tab") {
        const tabs = ["orbit", "rocket", "chip", "payload"];

        if (state.tab === "payload") {
            showChecklist();
        } else {
            state.tab = tabs[tabs.indexOf(state.tab) + 1];
            renderParts();
        }
    }

    if (action === "preflight") {
        showChecklist();
    }

    if (action === "launch") {
        resumeFlightOrLaunch();
    }

    if (action === "redesign") {
        state.flight = null;
        closeDialog();
        state.tab = "chip";
        renderParts();
        toast("Keep the lesson. Improve the design.");
    }

    if (action === "pause") {
        const paused = orbitView.toggle();
        const button = event.target.closest("button");

        button.innerHTML = icon(paused ? "play" : "pause");
        button.setAttribute(
            "aria-label",
            paused ? "Resume orbit animation" : "Pause orbit animation",
        );
        button.setAttribute("aria-pressed", paused);
    }

    if (action === "sound") {
        state.sound = !state.sound;
        missionAudio.setEnabled(state.sound);
        writeStorage("missionx-sound", state.sound);
        renderSoundButtons();
        if (state.sound) {
            if (
                state.flight &&
                !state.report &&
                document.querySelector("#flight-scene")
            ) {
                missionAudio.setScene(travel.phase, travel.paused);
            } else {
                missionAudio.setScene("idle");
            }

            beep();
        }
    }

    if (action === "export-patch") {
        exportPatch();
    }

    if (action === "export") {
        exportFile(
            `missionx-${mission().patch.toLowerCase()}-flight.json`,
            JSON.stringify(
                {
                    mission: mission().name,
                    seed: state.flight.seed,
                    guided: state.flight.guided,
                    difficulty: state.difficulty,
                    design: state.flight.design,
                    operations: state.flight.controlLog,
                    engineVersion: 2,
                    timeline: state.flight.timeline,
                    report: state.report,
                },
                null,
                2,
            ),
            "application/json",
        );
    }

    if (action === "about") {
        openDialog(
            `<div class="dialog-eyebrow">BUILT FOR THE CURIOUS</div>
        <h2 id="dialog-title">Small choices.<br>Orbital consequences.</h2>
        <p class="dialog-description">MissionX makes spacecraft trade-offs visible. It is an educational model, not a real mission-planning tool.</p>
        <div class="about-copy">
        <p><strong>How it works.</strong> Solar area × orbit sunlight generates power. Instruments consume it. Batteries bridge eclipses. More instruments generate more data, so your antenna needs enough contact time to return it.</p>
        <p><strong>What the score rewards.</strong> Science returned, mission completion, hardware health, resource efficiency, healthy margins, and improvement over your previous flight.</p>
        <p><strong>Designed to work anywhere.</strong> Plain JavaScript, original procedural graphics, seeded crisis selection, and local browser storage. No account, AI service, tracking, or backend.</p>
        <p><strong>Model limits.</strong> Hardware and launchers are fictional. Contact windows, lifetime, and radiation are simplified for learning. The globe is original procedural artwork; the orbital view is illustrative.</p>
        </div>
        <button class="primary-button full" data-action="guide">Read the flight manual ${icon("arrow")}</button>`,
        );
    }
});

document.addEventListener("input", (event) => {
    const input = event.target;

    if (input.dataset.bus) {
        const key = input.dataset.bus;

        state.design.bus[key] = Number(input.value);
        const units = { solarArea: "m²", battery: "Wh", antenna: "m" };

        $(`#output-${key}`).innerHTML =
            `${input.value} <small>${units[key]}</small>`;
        state.flight = null;
        updateGauges(
            key === "solarArea"
                ? "Solar array"
                : key === "battery"
                  ? "Battery"
                  : "Antenna",
        );
    }

    if (input.dataset.duty) {
        const part = state.design.instruments.find((item) => {
            return item.id === input.dataset.duty;
        });

        part.dutyCycle = Number(input.value) / 100;
        $(`#duty-output-${part.id}`).textContent = `${input.value}%`;
        state.flight = null;
        updateGauges("Observing duty");
    }
});
document.addEventListener("change", (event) => {
    const input = event.target;

    if (input.name === "orbit") {
        state.design.orbitId = input.value;
        state.flight = null;
        renderParts();
        updateGauges("Orbit");
    }

    if (input.name === "launcher") {
        state.design.launcherId = input.value;
        state.flight = null;
        renderParts();
        updateGauges("Launch vehicle");
    }

    if (input.id === "computer") {
        state.design.bus.computer = input.value;
        state.flight = null;
        updateGauges("Flight computer");
    }

    if (input.dataset.instrument) {
        const id = input.dataset.instrument;

        if (input.checked) {
            state.design.instruments.push({ id, dutyCycle: 0.75 });
        } else {
            state.design.instruments = state.design.instruments.filter(
                (item) => {
                    return item.id !== id;
                },
            );
        }

        state.flight = null;
        renderParts();
        updateGauges(
            catalog.parts.instruments.find((item) => {
                return item.id === id;
            }).name,
        );
    }

    if (input.id === "difficulty") {
        state.difficulty = input.value;
        state.flight = null;
        updateGauges();
        toast(
            input.value === "cadet"
                ? "Cadet: advisor hints and lighter crisis penalties."
                : input.value === "director"
                  ? "Flight Director: crisis penalties increased. Bring margin."
                  : "Engineer: standard crisis penalties.",
        );
    }
});
document.addEventListener("keydown", (event) => {
    const typing = ["INPUT", "SELECT", "TEXTAREA"].includes(
        event.target.tagName,
    );

    if (
        !typing &&
        $("#dialog").open &&
        $("#dialog").classList.contains("travel-dialog")
    ) {
        if (event.key === " ") {
            event.preventDefault();
            const pauseButton = $('[data-action="travel-pause"]');

            if (pauseButton !== null) {
                pauseButton.click();
            }

            return;
        }

        if (event.key === "[" || event.key === "]") {
            event.preventDefault();
            const speeds = [0.5, 1, 2, 4, 8];
            const index = clamp(
                speeds.indexOf(travel.speed) + (event.key === "]" ? 1 : -1),
                0,
                speeds.length - 1,
            );

            const speedButton = $(`[data-speed="${speeds[index]}"]`);

            if (speedButton !== null) {
                speedButton.click();
            }

            return;
        }

        if (event.key.toLowerCase() === "m") {
            event.preventDefault();
            const soundButton = $(".travel-sound");

            if (soundButton !== null) {
                soundButton.click();
            }

            return;
        }
    }

    const activeTab = event.target.closest("[data-tab]");

    if (
        activeTab &&
        ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
    ) {
        event.preventDefault();
        const tabs = ["orbit", "rocket", "chip", "payload"];
        const next =
            event.key === "Home"
                ? 0
                : event.key === "End"
                  ? 3
                  : (tabs.indexOf(state.tab) +
                        (event.key === "ArrowRight" ? 1 : 3)) %
                    4;

        state.tab = tabs[next];
        renderParts();
        $(`#tab-${state.tab}`).focus();
    }

    if (
        event.key === "Enter" &&
        !$("#dialog").open &&
        !["INPUT", "SELECT", "BUTTON", "A"].includes(
            document.activeElement.tagName,
        )
    ) {
        event.preventDefault();
        resumeFlightOrLaunch();
    }
});
$("#dialog").addEventListener("cancel", (event) => {
    if (state.busy) {
        event.preventDefault();
    }
});
$("#dialog").addEventListener("close", () => {
    if (!$("#dialog").open) {
        stopFlightScene();
    }
});

async function init() {
    try {
        const names = [
            "missions",
            "orbits",
            "launchers",
            "parts",
            "advisors",
            "events",
        ];
        const entries = await Promise.all(
            names.map(async (name) => {
                const response = await fetch(`./data/${name}.json`);

                if (!response.ok) {
                    throw new Error(`Could not load ${name}`);
                }

                return [name, await response.json()];
            }),
        );

        Object.assign(catalog, Object.fromEntries(entries));
        const saved = readStorage("missionx-session", null);

        if (
            saved &&
            catalog.missions.some((item) => {
                return item.id === saved.missionId;
            })
        ) {
            try {
                evaluate(
                    saved.design,
                    catalog.missions.find((item) => {
                        return item.id === saved.missionId;
                    }),
                    catalog,
                );
                state.missionId = saved.missionId;
                state.design = saved.design;
                state.difficulty = ["cadet", "engineer", "director"].includes(
                    saved.difficulty,
                )
                    ? saved.difficulty
                    : "engineer";
            } catch {
                /* A stale saved design should never prevent play. */
            }
        }

        state.attempts = readStorage("missionx-attempts", [])
            .filter((item) => {
                return (
                    item !== null &&
                    typeof item === "object" &&
                    item.report &&
                    ["score", "science", "cost", "lifetime", "trust"].every(
                        (key) => {
                            return Number.isFinite(item.report[key]);
                        },
                    ) &&
                    isValidDesign(item.design, catalog) &&
                    catalog.missions.some((m) => {
                        return m.id === item.missionId;
                    })
                );
            })
            .slice(0, 3);
        state.progress = restoreProgress(
            readStorage("missionx-progress", {}),
            catalog.missions,
        );

        if (!Object.keys(state.progress).length) {
            for (const attempt of [...state.attempts].reverse()) {
                state.progress = recordProgress(
                    state.progress,
                    attempt.missionId,
                    attempt.report,
                );
            }
        }

        if (
            saved !== null &&
            saved.missionId === "hello" &&
            Number.isInteger(saved.tutorial) &&
            saved.tutorial >= 0 &&
            saved.tutorial < tutorialSteps.length
        ) {
            state.tutorial = saved.tutorial;
            state.tab = tutorialSteps[state.tutorial].tab;
        }

        state.sound = Boolean(readStorage("missionx-sound", false));
        shell();
        if (!readStorage("missionx-intro-v2", false)) {
            showWelcome();
        }

        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("./sw.js").catch(() => {});
        }
    } catch (error) {
        $("#app").innerHTML =
            `<main class="load-error"><h1>Mission control is reconnecting.</h1><p>${escapeHtml(error.message)}. Start the local server with <code>npm run dev</code>, then reload.</p>
        <button class="primary-button" onclick="location.reload()">Try again</button>
        </main>`;
    }
}

init();
