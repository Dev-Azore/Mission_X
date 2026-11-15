# MissionX

Build a satellite, launch it, and make the decisions that bring its science home.

MissionX is a single-player strategy game about connected engineering choices. Adding a camera also changes power use, weight, communication needs, and cost. The game makes those trade-offs visible through six gauges, advisor feedback, and unexpected incidents during flight.

It uses JavaScript, HTML, and CSS. The simulation runs in the browser; no account, API key, or backend service is required.

## NASA data in the game

MissionX loads solar flare observations from [NASA's DONKI service](https://ccmc.gsfc.nasa.gov/tools/DONKI/). The design screen shows whether recent records or saved historical examples are being used. When a solar flare challenge occurs, its source panel shows the real flare class, observation date, and a link to NASA's record.

Flare class changes the game trade-off: X-class examples have a larger safe-mode science loss and greater risk when observing than M-class examples. These consequences and the random challenge timing are educational game rules, not NASA forecasts or measurements of spacecraft damage.

The game starts immediately using verified May 2024 examples, then attempts to load records from the past 30 days. If NASA is unreachable, returns no usable events, or takes longer than six seconds, those historical examples remain available. Each flight keeps its own data snapshot so a feed update cannot change a flight already in progress.

See [NASA data and game rules](docs/NASA-DATA.md) for the endpoint, attribution, and mapping.

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
