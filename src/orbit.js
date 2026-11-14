// An original, procedural globe: no image requests, keys, or network dependency.
const continents = [
    [
        [-168, 67],
        [-145, 71],
        [-129, 69],
        [-123, 59],
        [-132, 54],
        [-124, 48],
        [-124, 39],
        [-117, 32],
        [-109, 29],
        [-104, 23],
        [-97, 18],
        [-89, 20],
        [-85, 15],
        [-80, 9],
        [-77, 9],
        [-84, 23],
        [-81, 26],
        [-80, 32],
        [-74, 41],
        [-65, 44],
        [-60, 53],
        [-72, 59],
        [-83, 64],
        [-95, 68],
        [-110, 72],
        [-130, 74],
    ],
    [
        [-81, 12],
        [-71, 12],
        [-62, 10],
        [-54, 4],
        [-49, -1],
        [-35, -6],
        [-40, -21],
        [-48, -28],
        [-53, -34],
        [-65, -55],
        [-72, -50],
        [-75, -34],
        [-70, -18],
        [-80, -5],
    ],
    [
        [-17, 35],
        [-6, 36],
        [10, 37],
        [23, 32],
        [34, 31],
        [35, 24],
        [43, 12],
        [51, 11],
        [44, -1],
        [40, -12],
        [34, -25],
        [27, -34],
        [18, -35],
        [11, -18],
        [8, -3],
        [-1, 5],
        [-10, 5],
        [-17, 15],
    ],
    [
        [-10, 36],
        [-9, 43],
        [-1, 45],
        [-5, 50],
        [7, 55],
        [6, 61],
        [18, 71],
        [30, 70],
        [40, 60],
        [56, 65],
        [75, 73],
        [103, 77],
        [130, 69],
        [164, 65],
        [179, 54],
        [150, 46],
        [140, 36],
        [128, 34],
        [124, 21],
        [109, 19],
        [104, 2],
        [97, 10],
        [88, 22],
        [79, 8],
        [69, 24],
        [56, 26],
        [43, 31],
        [36, 42],
        [28, 40],
        [22, 36],
        [14, 45],
        [4, 43],
    ],
    [
        [112, -11],
        [129, -12],
        [137, -10],
        [146, -18],
        [154, -26],
        [147, -39],
        [134, -35],
        [123, -35],
        [114, -29],
    ],
    [
        [-53, 60],
        [-43, 59],
        [-22, 70],
        [-20, 80],
        [-45, 83],
        [-62, 76],
    ],
    [
        [46, -13],
        [51, -16],
        [48, -25],
        [44, -24],
    ],
    [
        [130, 32],
        [142, 45],
        [145, 43],
        [140, 34],
    ],
    [
        [-8, 50],
        [-3, 59],
        [1, 55],
        [0, 51],
    ],
];

function inside(x, y, polygon) {
    let hit = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const a = polygon[i];
        const b = polygon[j];

        if (
            a[1] > y !== b[1] > y &&
            x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
        ) {
            hit = !hit;
        }
    }

    return hit;
}

export function makePlanet(moon = false) {
    const size = 560;
    const canvas = document.createElement("canvas");

    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    const data = ctx.createImageData(size, size);

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const nx = (x - size / 2) / (size / 2 - 4);
            const ny = (y - size / 2) / (size / 2 - 4);
            const distance = nx * nx + ny * ny;

            if (distance > 1) {
                continue;
            }

            const nz = Math.sqrt(1 - distance);
            const lat = (Math.asin(-ny) * 180) / Math.PI;
            const lon = (Math.atan2(nx, nz) * 180) / Math.PI - 22;
            const land = continents.some((polygon) => {
                return inside(lon, lat, polygon);
            });
            const noise =
                (Math.sin(x * 0.39 + Math.cos(y * 0.21) * 4) *
                    Math.cos(y * 0.48) +
                    Math.sin(x * 0.1 + y * 0.17)) *
                0.5;
            const light = Math.max(0.055, nx * -0.55 + ny * -0.45 + nz * 0.75);
            const clouds =
                Math.sin(lon * 0.18 + Math.sin(lat * 0.12) * 3) *
                    Math.cos(lat * 0.3 + lon * 0.06) >
                0.69;
            const polar = Math.abs(lat) > 73;
            let color = moon
                ? [130 + noise * 22, 140 + noise * 22, 147 + noise * 22]
                : polar
                    ? [161, 200, 206]
                    : land
                        ? [62 + noise * 13, 124 + noise * 17, 110 + noise * 10]
                        : [21 + noise * 3, 65 + noise * 6, 96 + noise * 8];

            if (clouds && !moon) {
                color = color.map((value, i) => {
                    return value * 0.65 + [187, 213, 217][i] * 0.35;
                });
            }

            const rim = Math.pow(1 - nz, 3) * 0.7;
            const index = (y * size + x) * 4;

            data.data[index] = color[0] * light + rim * 25;
            data.data[index + 1] = color[1] * light + rim * 77;
            data.data[index + 2] = color[2] * light + rim * 105;
            data.data[index + 3] = Math.min(255, (1 - distance) * 50000);
        }
    }

    ctx.putImageData(data, 0, 0);

    return canvas;
}

export function createOrbit(canvas, getState) {
    const ctx = canvas.getContext("2d");
    const earth = makePlanet();
    const moon = makePlanet(true);
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame;
    let width = 600;
    let height = 420;
    let paused = false;
    const stars = Array.from({ length: 115 }, (_, i) => {
        return {
            x: ((i * 137.508) % 997) / 997,
            y: ((i * 73.71) % 991) / 991,
            size: i % 5 === 0 ? 1.1 : 0.55,
            alpha: 0.13 + (i % 4) * 0.08,
        };
    });
    const resize = new ResizeObserver((entries) => {
        const box = entries[0].contentRect;

        width = box.width;
        height = box.height;
        canvas.width = width * Math.min(devicePixelRatio, 2);
        canvas.height = height * Math.min(devicePixelRatio, 2);
        ctx.setTransform(
            Math.min(devicePixelRatio, 2),
            0,
            0,
            Math.min(devicePixelRatio, 2),
            0,
            0,
        );
    });

    resize.observe(canvas);

    function draw(time) {
        // Layout can briefly report a zero-size canvas during resize or navigation.
        if (width < 10 || height < 10) {
            frame = requestAnimationFrame(draw);

            return;
        }

        const state = getState();
        const cx = width * 0.5;
        const cy = height * 0.49;
        const radius = Math.min(width * 0.255, height * 0.32);
        const orbitX = radius * 1.7;
        const orbitY = radius * 0.52;
        const rotation =
            state.orbitId === "lunar"
                ? -0.85
                : state.orbitId === "sso"
                    ? -0.55
                    : -0.23;
        const angle = reduceMotion || paused ? 0.8 : time * 0.00016;

        ctx.clearRect(0, 0, width, height);
        for (const star of stars) {
            ctx.fillStyle = `rgba(189,214,228,${star.alpha})`;
            ctx.beginPath();
            ctx.arc(star.x * width, star.y * height, star.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Fine orbital reference grid.
        ctx.strokeStyle = "rgba(124,174,185,.065)";
        ctx.lineWidth = 1;
        for (let i = 1; i <= 3; i++) {
            ctx.beginPath();
            ctx.arc(cx, cy, radius * (1 + i * 0.32), 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.setLineDash([2, 7]);
        ctx.beginPath();
        ctx.moveTo(cx, 25);
        ctx.lineTo(cx, height - 25);
        ctx.moveTo(25, cy);
        ctx.lineTo(width - 25, cy);
        ctx.stroke();
        ctx.setLineDash([]);

        function ring(start, end, front) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(rotation);
            ctx.strokeStyle = front
                ? "rgba(169,239,208,.7)"
                : "rgba(169,239,208,.18)";
            ctx.lineWidth = front ? 1.5 : 1;
            ctx.beginPath();
            ctx.ellipse(0, 0, orbitX, orbitY, 0, start, end);
            ctx.stroke();
            ctx.restore();
        }

        ring(Math.PI, Math.PI * 2, false);
        const glow = ctx.createRadialGradient(
            cx,
            cy,
            radius * 0.7,
            cx,
            cy,
            radius * 1.22,
        );

        glow.addColorStop(0, "rgba(65,152,186,0)");
        glow.addColorStop(0.72, "rgba(65,152,186,.07)");
        glow.addColorStop(1, "rgba(65,152,186,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 1.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.drawImage(
            state.orbitId === "lunar" ? moon : earth,
            cx - radius,
            cy - radius,
            radius * 2,
            radius * 2,
        );
        ctx.strokeStyle = "rgba(145,204,221,.22)";
        ctx.beginPath();
        ctx.arc(cx, cy, radius - 1.5, 0, Math.PI * 2);
        ctx.stroke();
        ring(0, Math.PI, true);
        const x = Math.cos(angle) * orbitX;
        const y = Math.sin(angle) * orbitY;
        const sx = cx + x * Math.cos(rotation) - y * Math.sin(rotation);
        const sy = cy + x * Math.sin(rotation) + y * Math.cos(rotation);
        const contact = Math.sin(angle) > 0.4;

        if (contact) {
            ctx.fillStyle = "rgba(169,239,208,.045)";
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(cx - radius * 0.38, cy + radius * 0.38);
            ctx.lineTo(cx + radius * 0.16, cy + radius * 0.6);
            ctx.closePath();
            ctx.fill();
            ctx.setLineDash([3, 5]);
            ctx.strokeStyle = "rgba(169,239,208,.3)";
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(cx - radius * 0.15, cy + radius * 0.5);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(-0.35);
        ctx.shadowColor = "#a9efd0";
        ctx.shadowBlur = 12;
        ctx.fillStyle = "#7facc0";
        ctx.fillRect(-22, -6, 15, 12);
        ctx.fillRect(7, -6, 15, 12);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#203b4c";
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            ctx.strokeRect(-22 + i * 5, -6, 5, 12);
            ctx.strokeRect(7 + i * 5, -6, 5, 12);
        }

        ctx.fillStyle = "#e4eae3";
        ctx.fillRect(-5, -8, 10, 16);
        ctx.strokeStyle = "#a9efd0";
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(0, -15);
        ctx.stroke();
        ctx.restore();
        const labelX = sx > width - 160 ? Math.max(12, sx - 151) : sx + 30;

        ctx.font = "10px ui-monospace, monospace";
        ctx.fillStyle = "#a9efd0";
        ctx.fillText("MX–01", labelX, sy - 8);
        ctx.fillStyle = "#71808b";
        ctx.font = "8px ui-monospace, monospace";
        ctx.fillText(
            contact ? "↓ DOWNLINK ACTIVE" : "○ TELEMETRY NOMINAL",
            labelX,
            sy + 9,
        );
        ctx.fillStyle = contact ? "#a9efd0" : "#687b88";
        ctx.beginPath();
        ctx.arc(cx - radius * 0.15, cy + radius * 0.5, 3, 0, Math.PI * 2);
        ctx.fill();
        frame = requestAnimationFrame(draw);
    }

    frame = requestAnimationFrame(draw);

    return {
        toggle() {
            paused = !paused;

            return paused;
        },
        destroy() {
            cancelAnimationFrame(frame);
            resize.disconnect();
        },
    };
}
