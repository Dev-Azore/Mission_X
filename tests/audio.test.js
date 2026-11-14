import test from "node:test";
import assert from "node:assert/strict";
import { createMissionAudio } from "../src/audio.js";

function audioEnvironment() {
    const records = { contexts: 0, nodes: [], gains: [] };
    const parameter = (value) => {
        return {
            value,
            setValueAtTime() {},
            linearRampToValueAtTime() {},
            exponentialRampToValueAtTime() {},
        };
    };

    const node = () => {
        const result = {
            connect() {},
            disconnect() {
                this.disconnected = true;
            },
            start() {
                this.started = true;
            },
            stop() {
                this.stopped = true;
            },
            frequency: parameter(0),
        };

        records.nodes.push(result);

        return result;
    };

    class AudioContext {
        constructor() {
            records.contexts++;
            this.currentTime = 0;
            this.sampleRate = 100;
            this.destination = {};
        }
        resume() {
            return Promise.resolve();
        }
        createGain() {
            const gain = node();

            gain.gain = parameter(1);
            records.gains.push(gain);

            return gain;
        }
        createOscillator() {
            const oscillator = node();

            oscillator.kind = "oscillator";

            return oscillator;
        }
        createBufferSource() {
            const source = node();

            source.kind = "noise";

            return source;
        }
        createBiquadFilter() {
            return node();
        }
        createBuffer(_channels, length) {
            return {
                getChannelData: () => {
                    return new Float32Array(length);
                },
            };
        }
    }
    const previous = globalThis.window;

    globalThis.window = { AudioContext };

    return {
        records,
        restore() {
            globalThis.window = previous;
        },
    };
}

test("sound starts muted and creates no audio context until enabled", () => {
    const environment = audioEnvironment();

    try {
        const audio = createMissionAudio();

        audio.tone();
        audio.effect("alert");
        audio.setScene("ascent");
        assert.equal(environment.records.contexts, 0);
        audio.setEnabled(true);
        assert.equal(environment.records.contexts, 1);
        assert.ok(
            environment.records.nodes.some((node) => {
                return node.kind === "noise" && node.started;
            }),
        );
        audio.setEnabled(false);
    } finally {
        environment.restore();
    }
});

test("pausing and muting stop background sources and mute the master gain", () => {
    const environment = audioEnvironment();

    try {
        const audio = createMissionAudio();

        audio.setEnabled(true);
        audio.setScene("ascent");
        const rocket = environment.records.nodes.find((node) => {
            return node.kind === "noise";
        });

        audio.setScene("ascent", true);
        assert.ok(rocket.stopped && rocket.disconnected);
        audio.setScene("cruise");
        const ambience = environment.records.nodes.filter((node) => {
            return node.kind === "oscillator";
        });

        assert.equal(ambience.length, 2);
        audio.setEnabled(false);
        assert.ok(
            ambience.every((node) => {
                return node.stopped && node.disconnected;
            }),
        );
        assert.equal(environment.records.gains[0].gain.value, 0);
    } finally {
        environment.restore();
    }
});

test("alerts and repair effects generate notes, and muted effects stay silent", () => {
    const environment = audioEnvironment();

    try {
        const audio = createMissionAudio();

        audio.setEnabled(true);
        audio.setScene("crisis", true);
        audio.setScene("recovery", true);
        assert.equal(
            environment.records.nodes.filter((node) => {
                return node.kind === "oscillator";
            }).length,
            5,
        );
        audio.setEnabled(false);
        const count = environment.records.nodes.length;

        audio.effect("success");
        audio.tone();
        assert.equal(environment.records.nodes.length, count);
    } finally {
        environment.restore();
    }
});
