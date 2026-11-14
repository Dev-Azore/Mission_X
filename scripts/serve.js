import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const root = resolve(process.cwd());
const types = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".webmanifest": "application/manifest+json",
};
const server = http.createServer(async (request, response) => {
    try {
        const pathname = decodeURIComponent(
            new URL(request.url, "http://localhost").pathname,
        );
        const file = resolve(
            root,
            "." + (pathname.endsWith("/") ? `${pathname}index.html` : pathname),
        );

        if (
            !file.startsWith(root + sep) ||
            pathname.split("/").some((segment) => {
                return segment.startsWith(".");
            })
        ) {
            response.writeHead(403).end("Forbidden");

            return;
        }

        const content = await readFile(file);

        response.writeHead(200, {
            "Content-Type": types[extname(file)] || "application/octet-stream",
            "Cache-Control": "no-cache",
        });
        response.end(content);
    } catch {
        response.writeHead(404).end("Not found");
    }
});
const port = Number(process.env.PORT) || 4173;

server.listen(port, "127.0.0.1", () => {
    return console.log(`MissionX ready at http://127.0.0.1:${port}`);
});
