# MissionX

Build a satellite, launch it, and make the decisions that bring its science home.

MissionX is a single-player strategy game about connected engineering choices. Adding a camera also changes power use, weight, communication needs, and cost. The game makes those trade-offs visible through six gauges, advisor feedback, and unexpected incidents during flight.

It uses JavaScript, HTML, and CSS. The simulation runs in the browser; no account, API key, or backend service is required.

## Start the game

Use a Node.js version supported by `package.json`: Node 20.19 or newer in the 20.x line, 22.13 or newer in the 22.x line, or Node 24+.

From the project folder, run:

```sh
npm ci
npm run dev
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173), then click **Play your first mission**. Usama will guide you through building and flying a flood-monitoring satellite.

Keep the terminal running while you play. Press **Ctrl+C** in that terminal to stop the server. Refresh the browser after changing game files. Node's watch mode restarts the server when its own code changes; it does not automatically refresh the page.

## Where should I edit?

Edit the original files in the project folder. The `dist/` folder is a generated publishing copy; it appears after a build.

```text
index.html       Main page
styles.css       Shared styling
src/             Game logic, animation, sound, and interface code
assets/          Additional stylesheets and the logo
data/            Mission and hardware content in JSON
scripts/         Local server and build command
tests/           Automated checks
docs/            Player, developer, and presentation guides
dist/            Generated website; do not edit here
```


## Project commands

| Command | Purpose |
| --- | --- |
| `npm ci` | Install the development tools from the lockfile. |
| `npm run dev` | Start the local server with Node's watch mode. |
| `npm start` | Start the same server without watch mode. |
| `npm run lint` | Check JavaScript against `eslint.config.js`. |
| `npm run lint:fix` | Apply the fixes ESLint can automate. Review the changes afterward. |
| `npm test` | Check the simulation, progression, sound, and save handling. |

ESLint and `globals` are development dependencies. The published game has no runtime package dependencies.

## Read next

- [How to play](docs/PLAYING.md): space terms, missions, controls, incidents, and winning.
- [Developer guide](docs/DEVELOPMENT.md): which files own each feature, how the simulation works, and how to test or publish changes.
- [Demo script](docs/DEMO.md): a three-minute presentation and a sample spacecraft design.
