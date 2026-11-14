// Player-facing explanations live together so the console can stay concise.
export const concepts = {
    orbit: {
        word: "Orbit",
        meaning: "The path your satellite follows around Earth or the Moon.",
        question: "Where will your satellite travel?",
    },
    rocket: {
        word: "Launcher",
        meaning:
            "The rocket that carries your satellite into space. Bigger rockets carry more, but cost more.",
        question: "Which rocket will carry it?",
    },
    chip: {
        word: "Bus",
        meaning:
            "The equipment that keeps your satellite alive: solar panels, battery, antenna, and computer.",
        question: "How will you keep it running?",
    },
    payload: {
        word: "Payload",
        meaning:
            "The cameras and sensors that do the research. Choose your science means choose these instruments.",
        question: "What will your satellite discover?",
    },
};

export const tutorialSteps = [
    {
        tab: "orbit",
        title: "Choose a path around Earth.",
        instruction:
            "Select Sun-synchronous. This orbit gives our flood-watching satellite plenty of sunlight to make electricity.",
        action: "Confirm flight path",
        check: (design) => {
            return design.orbitId === "sso";
        },
        hint: "Select the Sun-synchronous orbit card.",
    },
    {
        tab: "rocket",
        title: "Choose the rocket that delivers it.",
        instruction:
            "Select Atlas / Medium lift. It has room for our satellite and leaves money for emergencies.",
        action: "Confirm rocket",
        check: (design) => {
            return design.launcherId === "atlas";
        },
        hint: "Select Atlas / Medium lift.",
    },
    {
        tab: "chip",
        title: "Pack a little extra battery.",
        instruction:
            "Move Battery storage to 400 Wh. Your satellite uses this stored electricity in shadow. Extra storage helps if part of the battery fails.",
        action: "Battery ready — continue",
        check: (design) => {
            return design.bus.battery >= 400;
        },
        hint: "Increase Battery storage to at least 400 Wh.",
    },
    {
        tab: "payload",
        title: "Give the camera more time to work.",
        instruction:
            "Keep the Multispectral camera selected and move Observing duty to 100%. You will collect 64 science points before flight losses; the mission needs 55.",
        action: "Review my satellite",
        check: (design) => {
            return design.instruments.some((item) => {
                return item.id === "camera" && item.dutyCycle === 1;
            });
        },
        hint: "Set the camera’s Observing duty slider to 100%.",
    },
    {
        tab: "payload",
        title: "Your first satellite is taking shape.",
        instruction:
            "Open the checklist. Green checks mean your design can operate. Then launch, choose your pace, and handle surprises when they appear.",
        action: "Open launch checklist",
        check: (_design, gauges) => {
            return gauges.preflight.pass && gauges.science >= 55;
        },
        hint: "Fix the red systems or increase science before launch.",
    },
];

export function earnedStars(report) {
    if (!report.success) {
        return 0;
    }

    return 1 + Number(report.score >= 750) + Number(report.score >= 900);
}

export function recordProgress(progress, missionId, report) {
    const previous = progress[missionId] || {
        flights: 0,
        wins: 0,
        best: 0,
        stars: 0,
    };

    return {
        ...progress,
        [missionId]: {
            flights: previous.flights + 1,
            wins: previous.wins + Number(report.success),
            best: Math.max(previous.best, report.score),
            stars: Math.max(previous.stars, earnedStars(report)),
        },
    };
}

export function playerRank(progress) {
    const completed = Object.values(progress).filter((item) => {
        return item.wins > 0;
    }).length;

    return [
        "New recruit",
        "Mission pilot",
        "Flight director",
        "Mission commander",
        "Cosmos explorer",
    ][Math.min(completed, 4)];
}

export function crisisExplanation(event, flight) {
    const batteryLeft = Math.round(
        flight.gauges.battery * flight.batteryFactor * 0.75,
    );
    const reserve = Math.round(flight.gauges.battery * flight.batteryFactor);
    const explanations = {
        battery: {
            meaning:
                "One section of your battery is overheating. A module is just one section of the battery pack.",
            advice: `You brought ${reserve} Wh of battery storage. Disconnecting the faulty section leaves ${batteryLeft} Wh. Your satellite currently needs about ${Math.ceil(flight.gauges.eclipseNeed * flight.loadFactor)} Wh to get through one eclipse (time in shadow).`,
            choices: [
                "Disconnect the broken battery section. Use the healthy sections that remain.",
                "Try a controlled battery cycle to recover capacity. This interrupts research and stresses the hardware.",
            ],
        },
        flare: {
            meaning:
                "A burst of charged particles from the Sun can damage the spacecraft’s electronics.",
            advice:
                flight.design.bus.computer === "hardened"
                    ? "Your hardened computer reduces the damage from continued observing. Safe mode still protects more hardware."
                    : "Safe mode means temporarily stopping research to protect the equipment. Your standard computer is more vulnerable if you keep observing.",
            choices: [
                "Pause research and protect the electronics until the flare passes.",
                "Keep collecting observations, accepting damage to the spacecraft.",
            ],
        },
        station: {
            meaning:
                "The facility on Earth that receives your observations has stopped working.",
            advice: "A partner station costs $8M. Check your remaining budget. Prioritizing means sending the most important observations and losing the rest.",
            choices: [
                "Pay another receiving station to bring all your observations home.",
                "Keep your money and return fewer observations.",
            ],
        },
        debris: {
            meaning:
                "A piece of space debris is predicted to pass close to your satellite.",
            advice: "An avoidance burn uses your engines to move out of the way. It spends fuel, so the satellite will have a shorter operating life.",
            choices: [
                "Use fuel to change the path and avoid the debris.",
                "Present a smaller surface to the debris and accept a spacecraft-health penalty.",
            ],
        },
        array: {
            meaning:
                "A solar-panel hinge has failed. Your satellite can no longer make as much electricity.",
            advice: "This is why spare power matters. Reduce research activity to use less electricity, or spend fuel turning the spacecraft to recover some sunlight.",
            choices: [
                "Turn instruments on less often, saving electricity but collecting less science.",
                "Turn the satellite to recover some power, spending fuel and observing time.",
            ],
        },
    };

    return explanations[event.id];
}
