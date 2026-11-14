const CACHE = "missionx-v4";
const FILES = [
    "./",
    "./index.html",
    "./styles.css",
    "./assets/game.css",
    "./assets/flight.css",
    "./src/app.js",
    "./src/engine.js",
    "./src/orbit.js",
    "./src/game.js",
    "./src/flight-view.js",
    "./src/audio.js",
    "./assets/mark.svg",
    ...["missions", "orbits", "launchers", "parts", "advisors", "events"].map(
        (name) => {
            return `./data/${name}.json`;
        },
    ),
].map((path) => {
    return new URL(path, self.registration.scope).href;
});

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(CACHE)
            .then((cache) => {
                return cache.addAll(FILES);
            })
            .then(() => {
                return self.skipWaiting();
            }),
    );
});
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => {
                return Promise.all(
                    keys
                        .filter((key) => {
                            return (
                                (key.startsWith("missionx-") ||
                                    key.startsWith("missionforge-")) &&
                                key !== CACHE
                            );
                        })
                        .map((key) => {
                            return caches.delete(key);
                        }),
                );
            })
            .then(() => {
                return self.clients.claim();
            }),
    );
});
self.addEventListener("fetch", (event) => {
    if (
        event.request.method !== "GET" ||
        new URL(event.request.url).origin !== self.location.origin
    ) {
        return;
    }

    // Network first keeps local development fresh; cached assets support demo-day offline use.
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response.ok && FILES.includes(event.request.url)) {
                    const copy = response.clone();

                    event.waitUntil(
                        caches.open(CACHE).then((cache) => {
                            return cache.put(event.request, copy);
                        }),
                    );
                }

                return response;
            })
            .catch(async () => {
                return (
                    (await caches.match(event.request)) ||
                    new Response("Reconnect once to cache this file.", {
                        status: 503,
                    })
                );
            }),
    );
});
