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

// La paleta del sitio sobre las variables del kit (solo tema oscuro).
const CSS = `
.approach-figure.iso{
  --anatomy-paper:#0c0c14;--anatomy-face:#15151f;--anatomy-top:#181824;
  --anatomy-shade-0:#0a0a11;--anatomy-shade-1:#0e0e16;--anatomy-shade-2:#12121b;--anatomy-shade-3:#161620;
  --anatomy-lit-top:#2a2f2a;--anatomy-lit-shade:#1f241f;
  --anatomy-hi:#d8d2c6;--anatomy-mid:#7a7784;--anatomy-lo:#4a4854;--anatomy-faint:#35333e;--anatomy-lit:#b6f09c;
  --anatomy-halo:#000000;--anatomy-halo-opacity:.8;--anatomy-dot:#f3eadb;--anatomy-green:#b6f09c;
}
.approach-figure{overflow:hidden}
.approach-figure .iso-svg{display:block;width:100%;height:100%;overflow:hidden}
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
const CSS = ${JSON.stringify(CSS)};
const WINDOW = { wide: 0.66, narrow: 0.42 };

// mountApproachFigure(host, { narrow }) → { update({ progress, paused }), setNarrow(bool), dispose() }
// update fija un objetivo 0..6; un loop sigue el objetivo con follow exponencial y
// se detiene al asentarse. paused salta al objetivo sin animar. El host recibe
// data-step con el paso activo.
export function mountApproachFigure(host, { narrow = false } = {}) {
  if (!host || !host.ownerDocument) throw new TypeError("mountApproachFigure requires a host element.");
  const doc = host.ownerDocument;
  if (!doc.getElementById("approach-figure-css")) {
    const style = doc.createElement("style");
    style.id = "approach-figure-css";
    style.textContent = ISO_CSS + CSS;
    doc.head.append(style);
  }
  host.classList.add("iso");
  host.innerHTML = SVG;
  const svg = host.querySelector("svg");
  const q = (sel) => svg.querySelector(sel);
  const parts = {
    piece: q('[data-part="piece"]'), forms: [...svg.querySelectorAll("[data-form]")],
    lamp: q('[data-part="lamp"]'), lens: q('[data-part="lens"]'), sheet: q('[data-part="sheet"]'),
    press: q('[data-part="press"]'), needle: q('[data-part="needle"]'), door: q('[data-part="door"]'),
    led: q('[data-part="led"]'), meter: q('[data-part="meter"]'), runner: q('[data-part="runner"]'),
  };
  const screenXOf = (worldX) => iso([worldX, 0, BELT_TOP], P)[0];
  let target = 0, shown = 0, paused = false, isNarrow = narrow;
  let frame = 0, last = 0, visible = true, lastStep = -1, lastSheet = -1, lastBox = "";

  function viewBoxFor(progress) {
    const state = stateAt(progress);
    // En pausa (sin movimiento) la figura es una ilustración estática: se ve la línea entera.
    const share = paused ? 1 : isNarrow ? WINDOW.narrow : WINDOW.wide;
    const w = WIDTH * share, h = HEIGHT * (isNarrow && !paused ? 0.78 : 1);
    const cx = Math.min(WIDTH - w / 2, Math.max(w / 2, screenXOf(state.viewX)));
    return { cx, w, h };
  }

  function draw(progress) {
    const s = stateAt(progress);
    parts.piece.setAttribute("transform", translateAlong(P, [s.pieceX - STATIONS[0], 0, 0]));
    parts.forms.forEach((g, f) => {
      const o = f === s.form ? s.formBlend : f === s.form - 1 ? 1 - s.formBlend : 0;
      g.setAttribute("opacity", o.toFixed(3));
    });
    const a = s.actions;
    parts.lamp.setAttribute("opacity", (0.25 + 0.75 * a[0]).toFixed(3));
    parts.lens.setAttribute("transform", translateAlong(P, [0, 0, -14 * a[1]]));
    const sheetKey = Math.round(a[2] * 200);
    if (sheetKey !== lastSheet) { parts.sheet.innerHTML = sheetAt(a[2]); lastSheet = sheetKey; }
    parts.press.setAttribute("transform", translateAlong(P, [0, 0, -16 * a[3]]));
    parts.needle.setAttribute("d", needleAt(a[3]));
    parts.door.setAttribute("transform", translateAlong(P, [-30 * a[4], 0, 0]));
    parts.led.setAttribute("opacity", a[4].toFixed(3));
    parts.meter.setAttribute("d", meterAt(a[5]));
    parts.runner.setAttribute("transform", translateAlong(P, [-(STATIONS[5] - STATIONS[0]) * s.returnT, 0, 0]));
    if (s.step !== lastStep) { host.dataset.step = String(s.step); lastStep = s.step; }
    const box = viewBoxFor(progress);
    const value = (box.cx - box.w / 2).toFixed(1) + " " + ((HEIGHT - box.h) / 2).toFixed(1) + " " + box.w.toFixed(1) + " " + box.h.toFixed(1);
    if (value !== lastBox) { svg.setAttribute("viewBox", value); lastBox = value; }
  }

  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    shown = paused ? target : shown + (target - shown) * (1 - Math.exp(-dt / 0.22));
    if (Math.abs(target - shown) < 0.0005) shown = target;
    draw(shown);
    frame = visible && shown !== target ? requestAnimationFrame(tick) : 0;
  }
  const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
  const observer = typeof IntersectionObserver === "function"
    ? new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" })
    : null;
  observer?.observe(host);

  draw(0);
  return {
    update({ progress, paused: nextPaused } = {}) {
      if (typeof nextPaused === "boolean") paused = nextPaused;
      if (Number.isFinite(progress)) target = Math.min(STEPS, Math.max(0, progress));
      if (paused) { shown = target; lastBox = ""; draw(shown); if (frame) { cancelAnimationFrame(frame); frame = 0; } return; }
      lastBox = "";
      run();
    },
    setNarrow(value) { isNarrow = Boolean(value); lastBox = ""; draw(shown); },
    dispose() { if (frame) cancelAnimationFrame(frame); observer?.disconnect(); host.innerHTML = ""; delete host.dataset.step; },
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
