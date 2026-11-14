// Browser saves use a separate adapter so storage failures never stop a mission.
export function createStorage(getStorage, onWriteError) {
    function matchesFallback(value, fallback) {
        if (value === null) {
            return false;
        }

        if (fallback === null) {
            return true;
        }

        if (Array.isArray(fallback)) {
            return Array.isArray(value);
        }

        return typeof value === typeof fallback && !Array.isArray(value);
    }

    function read(key, fallback) {
        try {
            const storage = getStorage();
            const stored = storage.getItem(key);

            if (stored !== null) {
                const value = JSON.parse(stored);

                return matchesFallback(value, fallback) ? value : fallback;
            }

            // Keep saves made before MissionForge was renamed to MissionX.
            const legacyKey = key.replace(/^missionx-/, "missionforge-");
            const legacyValue = storage.getItem(legacyKey);

            if (legacyValue === null) {
                return fallback;
            }

            const value = JSON.parse(legacyValue);

            if (!matchesFallback(value, fallback)) {
                return fallback;
            }

            try {
                storage.setItem(key, JSON.stringify(value));
            } catch {
                // Reading a legacy save should still work when storage is full.
            }

            return value;
        } catch {
            return fallback;
        }
    }

    function write(key, value) {
        try {
            getStorage().setItem(key, JSON.stringify(value));
        } catch {
            if (typeof onWriteError === "function") {
                onWriteError();
            }
        }
    }

    return { read, write };
}
