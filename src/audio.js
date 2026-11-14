// Original, quiet Web Audio effects. No downloads or autoplay dependency.
export function createMissionAudio() {
    let context;
    let master;
    let enabled = false;
    let scene = "idle";
    let loopNodes = [];
    let pingTimer;

    function ensureContext() {
        if (!context) {
            const AudioContext =
                window.AudioContext || window.webkitAudioContext;

            if (!AudioContext) {
                return false;
            }

            context = new AudioContext();
            master = context.createGain();
            master.gain.value = 0.22;
            master.connect(context.destination);
        }

        context.resume().catch(() => {});

        return true;
    }

    function stopLoop() {
        clearInterval(pingTimer);
        for (const node of loopNodes) {
            try {
                if (typeof node.stop === "function") {
                    node.stop();
                }

                node.disconnect();
            } catch {
                /* Already stopped. */
            }
        }

        loopNodes = [];
    }

    function tone(
        frequency = 550,
        duration = 0.12,
        offset = 0,
        type = "sine",
        volume = 0.11,
    ) {
        if (!enabled || !ensureContext()) {
            return;
        }

        const start = context.currentTime + offset;
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = type;
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(volume, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(gain);
        gain.connect(master);
        oscillator.start(start);
        oscillator.stop(start + duration + 0.02);
        oscillator.onended = () => {
            oscillator.disconnect();
            gain.disconnect();
        };
    }

    function effect(name) {
        if (name === "alert") {
            tone(440, 0.18, 0, "triangle");
            tone(330, 0.2, 0.23, "triangle");
            tone(440, 0.22, 0.5, "triangle");
        }

        if (name === "repair") {
            tone(520, 0.15);
            tone(780, 0.24, 0.17);
        }

        if (name === "success") {
            [523, 659, 784, 1047].forEach((frequency, index) => {
                return tone(frequency, 0.4, index * 0.12);
            });
        }

        if (name === "failure") {
            tone(330, 0.35);
            tone(220, 0.45, 0.25);
        }
    }

    function startLoop(mode) {
        if (!enabled || !ensureContext()) {
            return;
        }

        if (mode === "ascent") {
            const buffer = context.createBuffer(
                1,
                context.sampleRate * 2,
                context.sampleRate,
            );
            const samples = buffer.getChannelData(0);

            for (let i = 0; i < samples.length; i++) {
                samples[i] = Math.random() * 2 - 1;
            }

            const source = context.createBufferSource();
            const filter = context.createBiquadFilter();
            const gain = context.createGain();

            source.buffer = buffer;
            source.loop = true;
            filter.type = "lowpass";
            filter.frequency.value = 240;
            gain.gain.value = 0.25;
            source.connect(filter);
            filter.connect(gain);
            gain.connect(master);
            source.start();
            loopNodes.push(source, filter, gain);
        } else if (mode === "cruise") {
            for (const frequency of [54, 81]) {
                const oscillator = context.createOscillator();
                const gain = context.createGain();

                oscillator.frequency.value = frequency;
                gain.gain.value = 0.025;
                oscillator.connect(gain);
                gain.connect(master);
                oscillator.start();
                loopNodes.push(oscillator, gain);
            }

            pingTimer = setInterval(() => {
                return tone(1100, 0.065, 0, "sine", 0.035);
            }, 4200);
        }
    }

    return {
        tone,
        effect,
        setEnabled(value) {
            enabled = Boolean(value);
            stopLoop();
            if (enabled && ensureContext()) {
                startLoop(scene);
            }

            if (master) {
                master.gain.value = enabled ? 0.22 : 0;
            }
        },
        setScene(mode, paused = false) {
            stopLoop();
            const changed = scene !== mode;

            scene =
                paused && !["crisis", "recovery"].includes(mode)
                    ? "idle"
                    : mode;
            if (changed && mode === "crisis") {
                effect("alert");
            } else if (changed && mode === "recovery") {
                effect("repair");
            } else if (!paused) {
                startLoop(mode);
            }
        },
        suspend() {
            stopLoop();
            scene = "idle";
        },
        get enabled() {
            return enabled;
        },
    };
}
