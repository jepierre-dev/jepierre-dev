// node approach/build.mjs         → escribe approach-figure.js y approach/preview.html
// node approach/build.mjs --check → construye y no escribe nada
import { writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./kit/iso-kit.mjs";
import * as G from "./geometry.mjs";
import { STATION_X, STEPS } from "./model.mjs";
import { stations } from "./stations.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const check = process.argv.includes("--check");

const LABEL = "Una línea de ensamble isométrica con seis estaciones: un piso de operación, un atril de entrevista, una mesa de dibujo, un banco con prensa, un muelle con un rack, y una sala de control. Una pieza viaja por la banda y cambia de forma en cada estación; una línea de retorno la devuelve al inicio.";

const decks = [];
for (let n = 0; n < STEPS; n++) decks.push({ depth: k.depthOf([STATION_X[n], G.DECK.y, 0], G.P), svg: G.deck(n) });
decks.sort((a, b) => a.depth - b.depth);

const { back, front } = stations();
const svg = G.svgBody([G.base(), ...decks.map((d) => d.svg), ...back, G.belt(), ...front], LABEL);

const kitSource = readFileSync(join(HERE, "kit", "iso-kit.mjs"), "utf8").replace(/^export /gm, "");
const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");

const CSS = `
.approach-figure .iso-svg{display:block;width:100%;height:100%;overflow:visible}
`;

const runtime = `
const SVG = ${JSON.stringify(svg)};
const P = ${JSON.stringify(G.P)};
const WIDTH = ${G.WIDTH}, HEIGHT = ${G.HEIGHT};
export function mountApproachFigure(host) {
  if (!host) throw new TypeError("mountApproachFigure requires a host element.");
  host.innerHTML = SVG;
  const svg = host.querySelector("svg");
  return {
    update() {},
    dispose() { host.innerHTML = ""; },
  };
}
`;

const moduleSource = `/* Generado por approach/build.mjs. No editar a mano. */\n${kitSource}\n${modelSource}\n${runtime}`;

const preview = k.pageHtml({
  title: "Approach preview",
  theme: "dark",
  body: `<div class="approach-figure" style="max-width:1240px;margin:0 auto"></div>
<label style="display:block;margin:16px auto;max-width:1240px;font:12px monospace;color:#aaa">progress <input id="p" type="range" min="0" max="6" step="0.01" value="0" style="width:60%"> <span id="pv">0.00</span></label>`,
  script: `${moduleSource.replace(/^export /gm, "")}
const figure = mountApproachFigure(document.querySelector(".approach-figure"));
window.__approach = figure;
const range = document.getElementById("p"), pv = document.getElementById("pv");
range.addEventListener("input", () => { pv.textContent = Number(range.value).toFixed(2); figure.update({ progress: Number(range.value), paused: false }); });
figure.update({ progress: 0, paused: false });
`,
  width: 1300,
});

if (!check) {
  writeFileSync(join(ROOT, "approach-figure.js"), moduleSource);
  writeFileSync(join(HERE, "preview.html"), preview);
  console.log("wrote approach-figure.js", moduleSource.length, "bytes; approach/preview.html");
}
