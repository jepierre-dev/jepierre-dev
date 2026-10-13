// node approach/build.mjs         → escribe approach-figure.js y approach/preview.html
// node approach/build.mjs --check → construye y no escribe nada
import { writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./kit/iso-kit.mjs";
import * as G from "./geometry.mjs";
import { STATION_X, STEPS } from "./model.mjs";
import * as ST from "./stations.mjs";
import { pieceForms } from "./piece.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const check = process.argv.includes("--check");

const LABEL = "Una línea de ensamble isométrica con seis estaciones: un piso de operación, un atril de entrevista, una mesa de dibujo, un banco con prensa, un muelle con un rack, y una sala de control. Una pieza viaja por la banda y cambia de forma en cada estación; una línea de retorno la devuelve al inicio.";

const decks = [];
for (let n = 0; n < STEPS; n++) decks.push({ depth: k.depthOf([STATION_X[n], G.DECK.y, 0], G.P), svg: G.deck(n) });
decks.sort((a, b) => a.depth - b.depth);

const { back, front } = ST.stations();
// Partes móviles, cada una envuelta en su grupo y construida en reposo. Orden de
// pintura: lo que está detrás de la banda antes que ella; la pieza justo después;
// lo que sobrevuela la banda al final, de atrás hacia delante.
const moving = {
  runner: `<g data-part="runner">${ST.runner()}</g>`,
  door: `<g data-part="door">${ST.door()}</g>`,
  led: `<g data-part="led" opacity="0">${ST.led()}</g>`,
  lamp: `<g data-part="lamp" opacity="0.25">${ST.lamp()}</g>`,
  needle: `<path data-part="needle" class="iso-line" data-tone="hi" data-free="start" d="${ST.needleAt(0)}" style="stroke-width:1"/>`,
  meter: `<path data-part="meter" class="iso-line" data-tone="hi" data-free="start" d="${ST.meterAt(0)}" style="stroke-width:1"/>`,
  lens: `<g data-part="lens">${ST.lens()}</g>`,
  press: `<g data-part="press">${ST.press()}</g>`,
  sheet: `<g data-part="sheet">${ST.sheetAt(0)}</g>`,
};
const svg = G.svgBody([
  G.base(), ...decks.map((d) => d.svg), ...back,
  moving.runner, moving.door, moving.led, moving.lamp, moving.needle, moving.meter,
  G.belt(), pieceForms(), ...front,
  moving.lens, moving.sheet, moving.press,
], LABEL);

const kitSource = readFileSync(join(HERE, "kit", "iso-kit.mjs"), "utf8").replace(/^export /gm, "");
const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");

const CSS = `
.approach-figure .iso-svg{display:block;width:100%;height:100%;overflow:visible}
`;

const runtime = `
const SVG = ${JSON.stringify(svg)};
const P = ${JSON.stringify(G.P)};
const WIDTH = ${G.WIDTH}, HEIGHT = ${G.HEIGHT};
const STATIONS = ${JSON.stringify(STATION_X)};
const RAIL_Z = ${G.RAIL_Z}, BELT_TOP = ${G.BELT_TOP};
const SHEET = ${JSON.stringify(ST.SHEET)};
const GAUGE = ${JSON.stringify(ST.GAUGE)};
const DIAL = ${JSON.stringify(ST.DIAL)};
const sheetAt = ${ST.sheetAt.toString()};
const needleAt = ${ST.needleAt.toString()};
const meterAt = ${ST.meterAt.toString()};
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
// Depuración: preview.html#f=N muestra la forma N de la pieza sin runtime.
const form = new URLSearchParams(location.hash.slice(1)).get("f");
if (form !== null) document.querySelectorAll("[data-form]").forEach((g, i) => g.setAttribute("opacity", i === Number(form) ? 1 : 0));
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
