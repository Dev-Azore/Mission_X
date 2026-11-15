import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = resolve(projectRoot, "dist");
const publishEntries = ["index.html", "styles.css", "sw.js", "assets", "data", "src"];

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const entry of publishEntries) {
    await cp(
        resolve(projectRoot, entry),
        resolve(outputDirectory, entry),
        { recursive: true },
    );
}

console.log(`Built MissionX in ${outputDirectory}`);
