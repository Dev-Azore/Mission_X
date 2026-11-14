import test from "node:test";
import assert from "node:assert/strict";
import { createStorage } from "../src/storage.js";

function memoryStorage(entries = []) {
    const values = new Map(entries);

    return {
        getItem(key) {
            return values.has(key) ? values.get(key) : null; 
        },
        setItem(key, value) {
            values.set(key, value); 
        }
    };
}

test("saved collections recover from invalid JSON and unexpected data types", () => {
    const memory = memoryStorage([
        ["broken", "{"],
        ["wrong-list", "{}"],
        ["wrong-object", "[]"],
        ["wrong-setting", '"yes"']
    ]);
    const storage = createStorage(() => {
        return memory; 
    });

    assert.deepEqual(storage.read("broken", []), []);
    assert.deepEqual(storage.read("wrong-list", []), []);
    assert.deepEqual(storage.read("wrong-object", {}), {});
    assert.equal(storage.read("wrong-setting", false), false);
});

test("new saves take precedence and legacy saves migrate without losing data", () => {
    const memory = memoryStorage([
        ["missionforge-progress", '{"hello":{"best":812}}'],
        ["missionforge-sound", "true"],
        ["missionx-sound", "false"]
    ]);
    const storage = createStorage(() => {
        return memory; 
    });

    assert.deepEqual(storage.read("missionx-progress", {}), { hello: { best: 812 } });
    assert.equal(memory.getItem("missionx-progress"), '{"hello":{"best":812}}');
    assert.equal(storage.read("missionx-sound", true), false);
});

test("unavailable or full storage leaves the game usable and reports failed writes", () => {
    let writeErrors = 0;
    const unavailable = createStorage(() => {
        throw new Error("Blocked"); 
    }, () => {
        writeErrors++; 
    });

    assert.equal(unavailable.read("missionx-session", null), null);
    unavailable.write("missionx-session", {});
    assert.equal(writeErrors, 1);

    const full = createStorage(() => {
        return {
            getItem(key) {
                return key === "missionforge-progress" ? '{"hello":{"best":812}}' : null;
            },
            setItem() {
                throw new Error("Full"); 
            }
        };
    });

    assert.deepEqual(full.read("missionx-progress", {}), { hello: { best: 812 } });
});
