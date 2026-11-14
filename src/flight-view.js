import { makePlanet } from "./orbit.js";

// A visual companion to the teaching model, not a physical trajectory solver.
// Position comes from mission progress, so a crisis freezes the exact same scene.
const planets = new Map();

function planet(moon) {
    if (!planets.has(moon)) {
        planets.set(moon, makePlanet(moon));
    }

    return planets.get(moon);
}

export function createFlightScene(canvas, getPlayback) {
    const context = canvas.getContext("2d");
    const reducedMotion = matchMedia(
        "(prefers-reduced-motion: reduce)",
    ).matches;
    const stars = Array.from({ length: 145 }, (_, index) => {
        return {
            x: ((index * 137.508) % 997) / 997,
            y: ((index * 73.71) % 991) / 991,
            radius: index % 7 === 0 ? 1.3 : 0.6,
            alpha: 0.2 + (index % 5) * 0.12,
        };
    });
    let width = 800;
    let height = 400;
    let frame;
    let lastTime = 0;
    let animationTime = 0;
    const resize = new ResizeObserver(([entry]) => {
        width = entry.contentRect.width;
        height = entry.contentRect.height;
        const scale = Math.min(devicePixelRatio, 2);

        canvas.width = width * scale;
        canvas.height = height * scale;
        context.setTransform(scale, 0, 0, scale, 0, 0);
    });

    resize.observe(canvas);

    function circle(x, y, radius, fill) {
        context.beginPath();
        context.arc(x, y, Math.max(0, radius), 0, Math.PI * 2);
        context.fillStyle = fill;
        context.fill();
    }

    function drawStars(progress, opacity = 1) {
        for (const star of stars) {
            const x = ((star.x - progress * 0.14 + 1) % 1) * width;

            circle(
                x,
                star.y * height,
                star.radius,
                `rgba(206,231,230,${star.alpha * opacity})`,
            );
        }
    }

    function drawRocket(x, y, angle, scale, thrust, boosters = false) {
        const ctx = context;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.scale(scale, scale);
        if (thrust) {
            const flicker = reducedMotion
                ? 1
                : 1 + Math.sin(animationTime * 0.06) * 0.15;
            const flame = ctx.createLinearGradient(0, 39, 0, 150);

            flame.addColorStop(0, "#fff3cc");
            flame.addColorStop(0.28, "#f8c576");
            flame.addColorStop(0.6, "#ee896950");
            flame.addColorStop(1, "#ee896900");
            ctx.fillStyle = flame;
            ctx.beginPath();
            ctx.moveTo(-10, 37);
            ctx.quadraticCurveTo(-24, 80, 0, 145 * flicker);
            ctx.quadraticCurveTo(24, 80, 10, 37);
            ctx.fill();
            ctx.fillStyle = "#fff6da";
            ctx.beginPath();
            ctx.moveTo(-5, 39);
            ctx.lineTo(0, 83 * flicker);
            ctx.lineTo(5, 39);
            ctx.fill();
        }

        if (boosters) {
            for (const side of [-1, 1]) {
                ctx.fillStyle = "#9ba8a5";
                ctx.fillRect(side * 20 - 5, -3, 10, 45);
                ctx.fillStyle = "#263c43";
                ctx.fillRect(side * 20 - 5, 31, 10, 7);
            }
        }

        const body = ctx.createLinearGradient(-15, 0, 15, 0);

        body.addColorStop(0, "#859e9e");
        body.addColorStop(0.4, "#edf1df");
        body.addColorStop(1, "#8ca7a6");
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.moveTo(0, -61);
        ctx.bezierCurveTo(8, -51, 14, -35, 14, -21);
        ctx.lineTo(14, 36);
        ctx.lineTo(-14, 36);
        ctx.lineTo(-14, -21);
        ctx.bezierCurveTo(-14, -35, -8, -51, 0, -61);
        ctx.fill();
        ctx.fillStyle = "#203d4c";
        ctx.beginPath();
        ctx.ellipse(0, -29, 5, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#87d6b1";
        ctx.fillRect(-14, -3, 28, 7);
        ctx.fillStyle = "#586d70";
        ctx.fillRect(-14, 21, 28, 4);
        ctx.fillStyle = "#b7cdc7";
        ctx.beginPath();
        ctx.moveTo(-12, 12);
        ctx.lineTo(-27, 39);
        ctx.lineTo(-12, 31);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(12, 12);
        ctx.lineTo(27, 39);
        ctx.lineTo(12, 31);
        ctx.fill();
        ctx.fillStyle = "#304a49";
        ctx.font = "7px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText("MX", 0, 16);
        ctx.restore();
    }

    function drawAscent(playback) {
        const ctx = context;
        const progress = playback.ascent;
        const sky = ctx.createLinearGradient(0, 0, 0, height);

        sky.addColorStop(0, "#06131f");
        sky.addColorStop(0.5, progress < 0.5 ? "#143d55" : "#0a1e2b");
        sky.addColorStop(1, progress < 0.4 ? "#54817e" : "#153b4b");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, width, height);
        drawStars(progress, Math.min(1, progress * 2));
        const groundY = height * 0.9 + progress * height * 0.65;
        const glow = ctx.createRadialGradient(
            width * 0.42,
            groundY,
            0,
            width * 0.42,
            groundY,
            width * 0.8,
        );

        glow.addColorStop(0, "#99c2ac35");
        glow.addColorStop(1, "#99c2ac00");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = "#123a44";
        ctx.beginPath();
        ctx.ellipse(
            width * 0.42,
            groundY + height * 0.65,
            width * 1.4,
            height * 0.76,
            0,
            0,
            Math.PI * 2,
        );
        ctx.fill();
        ctx.strokeStyle = "#92d8d054";
        ctx.lineWidth = 3;
        ctx.stroke();
        if (progress < 0.44) {
            ctx.fillStyle = "#172e35";
            ctx.fillRect(width * 0.3, groundY - 70, 7, 92);
            ctx.fillRect(width * 0.3 - 14, groundY + 9, 100, 9);
            ctx.strokeStyle = "#4e7377";
            ctx.lineWidth = 1;
            for (let i = 0; i < 5; i++) {
                ctx.beginPath();
                ctx.moveTo(width * 0.3, groundY - i * 14);
                ctx.lineTo(width * 0.3 + 7, groundY - i * 14 - 14);
                ctx.stroke();
            }
        }

        // Exhaust clouds stay near the pad as the rocket climbs away from them.
        for (let i = 0; i < 13; i++) {
            const spread = (i - 6) * 19;

            circle(
                width * 0.34 + spread,
                groundY + 10 + Math.abs(spread) * 0.08,
                16 + progress * 37 + (i % 3) * 7,
                `rgba(164,187,175,${Math.max(0, 0.15 - progress * 0.2)})`,
            );
        }

        const x = width * (0.34 + progress * progress * 0.32);
        const y = height * (0.77 - progress * 0.51);
        const scale = Math.max(0.6, Math.min(1.05, width / 900));
        const angle = progress * 0.8;

        if (progress > 0.58 && progress < 0.9) {
            const fall = (progress - 0.58) * 320;

            ctx.save();
            ctx.translate(x - 35 - fall * 0.3, y + 35 + fall);
            ctx.rotate(-progress);
            ctx.fillStyle = "#859691";
            ctx.fillRect(-5, -15, 10, 38);
            ctx.restore();
        }

        drawRocket(x, y, angle, scale, !playback.paused, progress < 0.58);
        ctx.strokeStyle = "#b1edd036";
        ctx.setLineDash([3, 7]);
        ctx.beginPath();
        ctx.moveTo(x + 43, y);
        ctx.lineTo(width - 35, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#c6e2d3";
        ctx.font = `${width < 500 ? 9 : 11}px ui-monospace, monospace`;
        ctx.textAlign = "right";
        ctx.fillText(`${Math.round(progress * 160)} KM`, width - 35, y - 10);
        ctx.fillStyle = "#779b9d";
        ctx.font = "8px ui-monospace, monospace";
        ctx.fillText(
            progress < 0.58 ? "BOOSTERS FIRING" : "UPPER STAGE · CLIMBING",
            width - 35,
            y + 14,
        );
        ctx.textAlign = "left";
    }

    function drawSatellite(x, y, angle, playback) {
        const ctx = context;
        const broken = playback.event === "array";

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        const scale = Math.max(0.8, Math.min(1.25, width / 850));

        ctx.scale(scale, scale);
        for (const side of [-1, 1]) {
            ctx.fillStyle = broken && side > 0 ? "#604b43" : "#295c73";
            ctx.strokeStyle = broken && side > 0 ? "#c28c6b" : "#88b8c2";
            ctx.lineWidth = 1;
            ctx.fillRect(side < 0 ? -61 : 17, -14, 44, 28);
            ctx.strokeRect(side < 0 ? -61 : 17, -14, 44, 28);
            for (let i = 1; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo((side < 0 ? -61 : 17) + i * 11, -14);
                ctx.lineTo((side < 0 ? -61 : 17) + i * 11, 14);
                ctx.stroke();
            }
        }

        ctx.fillStyle = "#dce6cf";
        ctx.fillRect(-13, -21, 26, 42);
        ctx.fillStyle = "#6a9582";
        ctx.fillRect(-13, -4, 26, 7);
        ctx.strokeStyle = "#a9efd0";
        ctx.beginPath();
        ctx.moveTo(0, -21);
        ctx.lineTo(0, -40);
        ctx.stroke();
        circle(0, -41, 2, "#c7e6ce");
        if (playback.event === "battery") {
            ctx.fillStyle =
                playback.mode === "crisis"
                    ? "#ef9d70"
                    : playback.batteryFactor < 1
                        ? "#465b51"
                        : "#a9efd0";
            ctx.fillRect(-7, 8, 14, 7);
            if (playback.mode === "crisis") {
                ctx.shadowColor = "#ef9d70";
                ctx.shadowBlur = 20;
                circle(0, 11, 4, "#ef9d70");
                ctx.shadowBlur = 0;
            }
        }

        ctx.restore();
    }

    function drawOrbit(playback) {
        const ctx = context;

        ctx.fillStyle = "#08141e";
        ctx.fillRect(0, 0, width, height);
        const progress = playback.day / Math.max(1, playback.durationDays);

        drawStars(progress);
        const cx = width * (width < 500 ? 0.5 : 0.39);
        const cy = height * 0.55;
        const radius = Math.min(width * 0.205, height * 0.34);
        const orbitX = radius * 1.7;
        const orbitY = radius * 0.61;
        const tilt = -0.3;
        const angle = progress * Math.PI * 8 - 1.15;
        const ox = Math.cos(angle) * orbitX;
        const oy = Math.sin(angle) * orbitY;
        const x = cx + ox * Math.cos(tilt) - oy * Math.sin(tilt);
        const y = cy + ox * Math.sin(tilt) + oy * Math.cos(tilt);
        const aura = ctx.createRadialGradient(
            cx,
            cy,
            radius * 0.8,
            cx,
            cy,
            radius * 1.4,
        );

        aura.addColorStop(0, "#8ccad018");
        aura.addColorStop(1, "#8ccad000");
        circle(cx, cy, radius * 1.4, aura);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(tilt);
        ctx.strokeStyle = "#a9efd02a";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 6]);
        ctx.beginPath();
        ctx.ellipse(0, 0, orbitX, orbitY, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        ctx.drawImage(
            planet(playback.world === "moon"),
            cx - radius,
            cy - radius,
            radius * 2,
            radius * 2,
        );
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(tilt);
        ctx.strokeStyle = "#a9efd05a";
        ctx.beginPath();
        ctx.ellipse(0, 0, orbitX, orbitY, 0, 0, Math.PI);
        ctx.stroke();
        ctx.restore();
        const targetX = cx - radius * 0.24;
        const targetY = cy + radius * 0.4;

        if (playback.event !== "station" || playback.mode === "recovery") {
            ctx.strokeStyle = "#a9efd046";
            ctx.setLineDash([3, 7]);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(targetX, targetY);
            ctx.stroke();
            ctx.setLineDash([]);
            circle(targetX, targetY, 3, "#a9efd0");
        } else {
            circle(targetX, targetY, 4, "#e89977");
        }

        if (playback.event === "flare" && playback.mode === "crisis") {
            ctx.strokeStyle = "#e8a57555";
            ctx.lineWidth = 2;
            for (let i = 0; i < 5; i++) {
                ctx.beginPath();
                ctx.moveTo(width - 20, 30 + i * 37);
                ctx.bezierCurveTo(
                    width * 0.8,
                    20 + i * 50,
                    x + 60,
                    y - 80,
                    x + i * 6,
                    y,
                );
                ctx.stroke();
            }
        }

        if (playback.event === "debris" && playback.mode === "crisis") {
            for (let i = 0; i < 6; i++) {
                ctx.save();
                ctx.translate(x + 70 + i * 14, y - 35 + i * 13);
                ctx.rotate(i);
                ctx.fillStyle = "#ad9e8d";
                ctx.fillRect(-3, -2, 7, 5);
                ctx.restore();
            }
        }

        if (playback.mode === "crisis") {
            ctx.strokeStyle = "#edaa7755";
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 5]);
            ctx.beginPath();
            ctx.arc(x, y, 54, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        drawSatellite(x, y, -0.18, playback);
        ctx.fillStyle = playback.mode === "crisis" ? "#eab18c" : "#a9efd0";
        ctx.font = "9px ui-monospace, monospace";
        ctx.textAlign = "left";
        const labelX = Math.min(width - 145, x + 65);

        ctx.fillText(
            playback.mode === "crisis"
                ? "MX–01 / ATTENTION"
                : "MX–01 / OPERATIONAL",
            Math.max(15, labelX),
            y - 30,
        );
        if (width > 520) {
            ctx.fillStyle = "#607f8c";
            ctx.font = "8px ui-monospace, monospace";
            ctx.fillText(
                playback.world === "moon"
                    ? "LUNAR POLAR ORBIT"
                    : "EARTH OBSERVATION ORBIT",
                25,
                height - 24,
            );
            ctx.textAlign = "right";
            ctx.fillText(
                "ILLUSTRATIVE TRAJECTORY · TIME ACCELERATED",
                width - 25,
                height - 24,
            );
            ctx.textAlign = "left";
        }

        // Passing dust makes ongoing motion visible without moving the scientific gauges.
        if (!playback.paused && !reducedMotion) {
            ctx.strokeStyle = "#b6dacf16";
            for (let i = 0; i < 7; i++) {
                const px = (animationTime * 0.025 + i * 129) % width;

                ctx.beginPath();
                ctx.moveTo(width - px, (i * 59) % height);
                ctx.lineTo(width - px - 12, (i * 59) % height);
                ctx.stroke();
            }
        }
    }

    function draw(time) {
        const playback = getPlayback();
        const delta = Math.min(100, time - lastTime || 0);

        lastTime = time;
        if (!playback.paused) {
            animationTime += delta * playback.speed;
        }

        if (width > 10 && height > 10) {
            context.clearRect(0, 0, width, height);
            if (playback.mode === "ascent") {
                drawAscent(playback);
            } else {
                drawOrbit(playback);
            }

            canvas.dataset.phase = playback.mode;
            canvas.dataset.progress = (
                playback.mode === "ascent"
                    ? playback.ascent
                    : playback.day / playback.durationDays
            ).toFixed(6);
        }

        frame = requestAnimationFrame(draw);
    }

    frame = requestAnimationFrame(draw);

    return {
        destroy() {
            cancelAnimationFrame(frame);
            resize.disconnect();
        },
    };
}
