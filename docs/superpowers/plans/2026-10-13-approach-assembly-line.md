# Línea de ensamble "Cómo trabajo" — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la lista de 3 pasos de `#approach` en `index.html` por una figura isométrica (banda transportadora con 6 estaciones) animada por scroll pinneado, con cuadros explicativos ES/EN por paso, responsive y respetando el toggle de movimiento.

**Architecture:** Un script Node (`approach/build.mjs`) usa el kit de `anatomy` para generar `approach-figure.js`, un ES module que inyecta el SVG estático + CSS y expone `mountApproachFigure(host)` con el contrato `{ update({ progress, paused }), dispose() }` (igual que `scene.js`). `index.html` añade la sección pinneada, el CSS, los textos i18n, calcula el progreso en el `updateScroll()` existente y carga el módulo dinámicamente con fallback a lista estática. La verdad del proceso (pasos, fases, posiciones) vive en `approach/model.mjs`, puro y testeado con `node --test`.

**Tech Stack:** HTML/CSS/JS vanilla (ES modules), Node 20+ (`node --test`), kit `anatomy` (`iso-kit.mjs`), headless Chrome vía `scripts/capture.mjs` / `scripts/lines.mjs` del skill, Playwright MCP para pruebas manuales.

**Spec:** `docs/superpowers/specs/2026-10-13-approach-assembly-line-design.md`

**Skill `anatomy`:** `C:\Users\JeanPierreOrtizArang\.claude\skills\anatomy` (en los comandos, `$ANAT`).

## Global Constraints

- Nada se escribe en `openspec/` (instrucción explícita del usuario para esta sesión).
- Tema oscuro únicamente; paleta del sitio: `--paper #f3eadb`, `--muted #b4b0bc`, `--line #35333e`, `--lilac #b6f09c`, fondo `#090910`.
- Alturas de viewport siempre en `svh`, nunca `vh`.
- No se añade un segundo listener de `scroll`; el progreso se calcula en `updateScroll()` existente.
- No se intercepta ningún evento de rueda/touch/teclado (pin por `position: sticky`).
- `prefers-reduced-motion: reduce` y el toggle de movimiento (`motionOff()`) equivalen: sin pin, figura en estado final, 6 cuadros visibles.
- Todos los textos visibles pasan por el diccionario i18n con `data-i18n`.
- Los commits son locales; no se hace `push`.
- La figura es un **Hero** de `anatomy`: 100–150 piezas; cada pieza se apoya en otra; toda línea termina en algo; exactamente un elemento `lit` (la pieza que viaja).

## Review Focus

1. **Progreso fuera de rango** (scroll por encima de la sección, o más allá, o `span ≤ 0` en ventanas muy altas): `stateAt` debe fijar `progress` a `[0, 6]` y nunca producir `NaN`. → test en Task 1.
2. **Cambio de tamaño a mitad de la sección** (barra de URL móvil, giro de pantalla): el `viewBox` cambia de modo escritorio/móvil sin salto y `measure()` recalcula `stageTop`/`span`. → prueba manual en Task 7.
3. **Cambio de idioma estando pinneado**: `setLanguage()` reescribe los `textContent`; el cuadro activo debe seguir siendo el mismo índice. → prueba manual en Task 7.
4. **Toggle de movimiento estando pinneado**: la stage pasa de 600svh a auto; el scroll salta; `measure()` debe correr y el canvas del JO no debe quedarse en un capítulo incorrecto. → prueba manual en Task 7.
5. **Fallo al cargar `approach-figure.js`** (red, error de sintaxis): la sección muestra la lista de 6 pasos sin sticky y sin espacio en blanco de 600svh. → test en Task 6 (clase `approach-static`).

---

### Task 1: Modelo del proceso (`approach/model.mjs`)

**Files:**
- Create: `approach/model.mjs`
- Test: `approach/model.test.mjs`

**Interfaces:**
- Produces:
  - `STEPS = 6`
  - `STATION_X: number[6]` — centro x (mundo) de cada estación: `[60, 180, 300, 420, 540, 660]`
  - `TRAVEL = 0.6` — fracción de cada paso dedicada al viaje
  - `stateAt(progress: number) → { p, step, local, pieceX, actions: number[6], form, formBlend, returnT, viewX }`
    - `p` progreso fijado a `[0, 6]`; `step` ∈ 0..5 = `min(5, floor(p))`; `local` ∈ [0, 1]
    - `pieceX`: x de la pieza; `actions[n]` ∈ [0, 1] cuánto se ha accionado el mecanismo de la estación n
    - `form`: índice de forma visible de la pieza (0 ticket … 5 punto); `formBlend` ∈ [0,1] opacidad de la forma `form` frente a `form − 1`
    - `returnT` ∈ [0,1]: avance del punto por la línea de retorno (solo paso 5)
    - `viewX`: x que la cámara debe centrar (= `pieceX`)
  - `smoothstep(a, b, x)`, `clamp(v, lo, hi)`, `easeInOut(t)`

- [ ] **Step 1: Escribir los tests que fallan**

```js
// approach/model.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { STEPS, STATION_X, TRAVEL, stateAt } from "./model.mjs";

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test("constantes", () => {
  assert.equal(STEPS, 6);
  assert.deepEqual(STATION_X, [60, 180, 300, 420, 540, 660]);
  assert.equal(TRAVEL, 0.6);
});

test("fija el progreso a [0, 6] y nunca devuelve NaN", () => {
  for (const bad of [-3, 9, NaN, Infinity, -Infinity]) {
    const s = stateAt(bad);
    assert.ok(s.p >= 0 && s.p <= 6, `p=${s.p}`);
    for (const key of ["pieceX", "formBlend", "returnT", "viewX"]) assert.ok(Number.isFinite(s[key]), `${key} NaN con ${bad}`);
    s.actions.forEach((a) => assert.ok(Number.isFinite(a)));
  }
  assert.equal(stateAt(-3).p, 0);
  assert.equal(stateAt(9).p, 6);
});

test("paso 0: la pieza está en la estación 0 y solo actúa la estación 0", () => {
  const s = stateAt(0.5);
  assert.equal(s.step, 0);
  near(s.pieceX, STATION_X[0]);
  assert.ok(s.actions[0] > 0 && s.actions[0] < 1);
  s.actions.slice(1).forEach((a) => assert.equal(a, 0));
  assert.equal(s.form, 0);
  near(s.formBlend, s.actions[0]);
});

test("paso n: viaja de n-1 a n durante TRAVEL y luego acciona la estación n", () => {
  const start = stateAt(2);
  near(start.pieceX, STATION_X[1]);
  const mid = stateAt(2.3);
  assert.ok(mid.pieceX > STATION_X[1] && mid.pieceX < STATION_X[2]);
  assert.equal(mid.actions[2], 0);
  assert.equal(mid.actions[1], 1, "la estación anterior queda accionada");
  assert.equal(mid.form, 2);
  assert.equal(mid.formBlend, 0, "durante el viaje se ve la forma anterior");
  const arrived = stateAt(2.6);
  near(arrived.pieceX, STATION_X[2]);
  const acting = stateAt(2.8);
  assert.ok(acting.actions[2] > 0 && acting.actions[2] < 1);
  near(acting.formBlend, acting.actions[2]);
  assert.equal(stateAt(2.999).actions[2] > 0.99, true);
});

test("paso 5: retorno avanza con la acción y p=6 es el estado final", () => {
  assert.equal(stateAt(5.3).returnT, 0);
  const end = stateAt(6);
  assert.equal(end.step, 5);
  near(end.pieceX, STATION_X[5]);
  end.actions.forEach((a) => assert.equal(a, 1));
  assert.equal(end.returnT, 1);
  assert.equal(end.form, 5);
  assert.equal(end.formBlend, 1);
});

test("la cámara sigue a la pieza", () => {
  const s = stateAt(3.2);
  near(s.viewX, s.pieceX);
});

test("el viaje es monótono y suave", () => {
  let last = STATION_X[0];
  for (let p = 1; p <= 1.6; p += 0.01) {
    const x = stateAt(p).pieceX;
    assert.ok(x >= last - 1e-9, `retrocede en p=${p}`);
    last = x;
  }
});
```

- [ ] **Step 2: Ejecutar los tests para verificar que fallan**

Run: `node --test approach/model.test.mjs`
Expected: FAIL con `Cannot find module` para `./model.mjs`.

- [ ] **Step 3: Implementar el modelo**

```js
// approach/model.mjs
// Verdad del proceso: 6 pasos, de campo operacional a software en uso.
// Paso 0: la pieza (un ticket) nace en el campo. Paso n ≥ 1: viaja de la
// estación n-1 a la n durante TRAVEL del paso y luego acciona la estación n.
export const STEPS = 6;
export const STATION_X = [60, 180, 300, 420, 540, 660];
export const TRAVEL = 0.6;

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const easeInOut = (t) => smoothstep(0, 1, t);

export function stateAt(progress) {
  const p = Number.isFinite(progress) ? clamp(progress, 0, STEPS) : 0;
  const step = Math.min(STEPS - 1, Math.floor(p));
  const local = clamp(p - step, 0, 1);
  const actions = new Array(STEPS).fill(0);
  for (let n = 0; n < step; n++) actions[n] = 1;
  let pieceX;
  if (step === 0) {
    pieceX = STATION_X[0];
    actions[0] = smoothstep(0.2, 0.9, local);
  } else {
    const t = clamp(local / TRAVEL, 0, 1);
    pieceX = STATION_X[step - 1] + (STATION_X[step] - STATION_X[step - 1]) * easeInOut(t);
    actions[step] = smoothstep(0, 1, clamp((local - TRAVEL) / (1 - TRAVEL), 0, 1));
  }
  const form = step;
  const formBlend = actions[step];
  const returnT = step === STEPS - 1 ? actions[STEPS - 1] : 0;
  return { p, step, local, pieceX, actions, form, formBlend, returnT, viewX: pieceX };
}
```

- [ ] **Step 4: Ejecutar los tests para verificar que pasan**

Run: `node --test approach/model.test.mjs`
Expected: `# pass 7`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add approach/model.mjs approach/model.test.mjs
git commit -m "feat(approach): process model for the assembly-line figure"
```

---

### Task 2: Kit, cámara, base y banda (`approach/geometry.mjs`, `approach/build.mjs`)

**Files:**
- Create: `approach/kit/iso-kit.mjs` (copia de `$ANAT/kit/iso-kit.mjs`, sin cambios)
- Create: `approach/geometry.mjs`
- Create: `approach/build.mjs`
- Test: `approach/build.test.mjs`

**Interfaces:**
- Consumes: `STATION_X`, `STEPS` de `approach/model.mjs`.
- Produces (`geometry.mjs`):
  - `WIDTH = 1240`, `HEIGHT = 520`, `P` (proyección), `BELT_TOP = 10` (z de la superficie de la banda), `RAIL_Z = 78` (línea de retorno), `DECK = { y: -118, d: 76 }` (franja de las estaciones, detrás de la banda)
  - helpers `S(paths, style)`, `L(d, style)`, `D(points, style)`, `at(point)`
  - `base() → string`, `belt() → string`, `deck(n) → string` (plataforma de la estación n con tornillos y placa)
  - `svgBody(parts: string[]) → string` (el `<svg>` vía `figureSvg`)
- Produces (`build.mjs`): escribe `approach-figure.js` y `approach/preview.html`; exporta nada. Acepta `--check` (solo construye en memoria y escribe nada).

- [ ] **Step 1: Copiar el kit**

```powershell
New-Item -ItemType Directory -Force approach\kit | Out-Null
Copy-Item "$env:USERPROFILE\.claude\skills\anatomy\kit\iso-kit.mjs" approach\kit\iso-kit.mjs
```

- [ ] **Step 2: Escribir el test de build que falla**

```js
// approach/build.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

test("build genera el módulo y la preview con las 6 estaciones y partes móviles", () => {
  execFileSync(process.execPath, ["approach/build.mjs"], { stdio: "pipe" });
  assert.ok(existsSync("approach-figure.js"));
  assert.ok(existsSync("approach/preview.html"));
  const js = readFileSync("approach-figure.js", "utf8");
  assert.match(js, /export function mountApproachFigure/);
  for (let n = 0; n < 6; n++) assert.match(js, new RegExp(`data-station="${n}"`), `falta estación ${n}`);
  for (const part of ["piece", "lamp", "lens", "sheet", "press", "needle", "door", "led", "meter", "runner"]) {
    assert.match(js, new RegExp(`data-part="${part}"`), `falta parte móvil ${part}`);
  }
  for (let f = 0; f < 6; f++) assert.match(js, new RegExp(`data-form="${f}"`), `falta forma ${f}`);
  assert.equal((js.match(/data-lit/g) || []).length >= 1, true);
  assert.ok(js.length < 900_000, `módulo demasiado grande: ${js.length}`);
});
```

- [ ] **Step 3: Ejecutar el test para verificar que falla**

Run: `node --test approach/build.test.mjs`
Expected: FAIL (`approach/build.mjs` no existe).

- [ ] **Step 4: Escribir `geometry.mjs` con cámara, base, banda y plataformas**

```js
// approach/geometry.mjs
// Mundo: x a lo largo de la banda, y hacia el espectador, z arriba. ~1 unidad = 1 px.
// Las estaciones están DETRÁS de la banda (y negativo): con azimut 32° el
// espectador está hacia +x,+y, así que se pintan antes que la banda y la pieza.
import * as k from "./kit/iso-kit.mjs";
import { STATION_X, STEPS } from "./model.mjs";

export const WIDTH = 1240;
export const HEIGHT = 520;
export const BELT = { x: -10, y: -18, w: 760, d: 36, r: 2 };
export const BELT_TOP = 10;
export const DECK = { y: -118, d: 76 };
export const RAIL_Z = 78;
export const BASE = { x: -60, y: -150, w: 860, d: 230, r: 12 };
export const BASE_H = 12;
export const FOOT_H = 6;

export const P = k.fitProjection(
  [...k.boxCorners(BASE, -BASE_H - FOOT_H, 0), [STATION_X[5] + 40, -60, 110], [STATION_X[0] - 40, -60, RAIL_Z + 12]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 32, elevation: 30 },
);

export const at = (point) => k.iso(point, P);
export const S = (paths, style) => k.solidSvg(paths, style);
export const L = (d, style) => k.lineSvg(d, style);
export const D = (points, style) => k.dotsSvg(points, style);
export const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

// Placa base con patas, ranura, tornillos y regla de ticks en el borde cercano.
export function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(BASE, 26))) {
    out.push(S(k.cylinder(x, y, 8, -BASE_H - FOOT_H, 2, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 6.2, -BASE_H - FOOT_H + 2, FOOT_H - 2, P, 28), { tone: "lo" }));
  }
  out.push(S(k.slabOf(BASE, -BASE_H, BASE_H, P, 10, 1.6), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(BASE, 6), 0, P, 10), { tone: "faint" }));
  const screws = k.corners(BASE, 12);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  const strip = { x: BASE.x + 30, y: BASE.y + BASE.d - 18, w: BASE.w - 60, d: 8, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 6, strip.x + strip.w - 6, 5, 5, strip.y + 1, 0.8, [2.2, 4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 3, strip.y + 4, 0.8]), at([strip.x + strip.w - 3, strip.y + 4, 0.8])], { size: 0.45 }));
  // Placa de identificación con tres líneas de texto grabado (free: representan texto).
  const label = { x: BASE.x + BASE.w - 120, y: BASE.y + 14, w: 80, d: 22, r: 1.5 };
  out.push(S(k.slabOf(label, 0, 1, P, 3, 0.4), { tone: "mid" }));
  for (const dy of [6, 11, 16]) out.push(L(k.lineOnTop([label.x + 8, label.y + dy], [label.x + label.w - 8 - (dy === 16 ? 24 : 0), label.y + dy], 1, P), { tone: "lo", free: true }));
  out.push(D(k.corners(label, 3).map(([x, y]) => at([x, y, 1])), { size: 0.4, tone: "lo" }));
  return out.join("");
}

// Banda: bastidor, dos largueros con tornillos, superficie, ticks de posición
// en el larguero cercano y topes en ambos extremos.
export function belt() {
  const out = [];
  const frame = { x: BELT.x, y: BELT.y, w: BELT.w, d: BELT.d, r: 2 };
  out.push(S(k.slabOf(frame, 0, 6, P, 3, 0.5), { tone: "mid" }));
  for (const y of [BELT.y - 3, BELT.y + BELT.d]) {
    out.push(S(k.slabOf({ x: BELT.x - 2, y, w: BELT.w + 4, d: 3, r: 0.8 }, 0, BELT_TOP + 1.5, P, 3, 0.4), { tone: "mid" }));
    const xs = [];
    for (let x = BELT.x + 12; x < BELT.x + BELT.w - 6; x += 60) xs.push(x);
    out.push(D(xs.map((x) => at([x, y + 1.5, BELT_TOP + 1.5])), { size: 0.42, tone: "lo" }));
  }
  out.push(S(k.slabOf({ x: BELT.x + 2, y: BELT.y + 1, w: BELT.w - 4, d: BELT.d - 2, r: 1 }, 6, BELT_TOP - 6, P, 3), { tone: "hi", crease: "lo" }));
  for (let x = BELT.x + 10; x < BELT.x + BELT.w - 6; x += 20) {
    out.push(L(k.lineOnTop([x, BELT.y + 2], [x, BELT.y + BELT.d - 2], BELT_TOP, P), { tone: "faint" }));
  }
  const ticks = k.topTicks(BELT.x + 10, BELT.x + BELT.w - 10, 10, 6, BELT.y + BELT.d + 0.5, BELT_TOP + 1.5, [1.4, 2.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  for (const x of [BELT.x - 8, BELT.x + BELT.w]) {
    out.push(S(k.slabOf({ x, y: BELT.y - 5, w: 8, d: BELT.d + 10, r: 1.5 }, 0, BELT_TOP + 6, P, 3, 0.5), { tone: "mid" }));
    out.push(D([at([x + 4, BELT.y - 2, BELT_TOP + 6]), at([x + 4, BELT.y + BELT.d + 2, BELT_TOP + 6])], { size: 0.45 }));
  }
  return out.join("");
}

// Plataforma de la estación n detrás de la banda: losa, tornillos, ranura y una
// pequeña placa con el número grabado en el frente.
export function deck(n) {
  const plan = { x: STATION_X[n] - 46, y: DECK.y, w: 92, d: DECK.d, r: 3 };
  const out = [];
  out.push(S(k.slabOf(plan, 0, 8, P, 4, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(plan, 4), 8, P, 4), { tone: "faint" }));
  const screws = k.corners(plan, 7);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 1.6, 8, P, 12)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 8])), { size: 0.42 }));
  out.push(k.faceTextSvg(k.sideMatrix([plan.x + plan.w / 2, plan.y + plan.d], 4, P, "right"), `0${n + 1}`, { size: 3, tone: "lo", anchor: "middle" }));
  return `<g data-station="${n}">${out.join("")}</g>`;
}

export function svgBody(parts, label) {
  return k.figureSvg({ width: WIDTH, height: HEIGHT, label, body: parts, className: "approach-svg" });
}
```

- [ ] **Step 5: Escribir `build.mjs` mínimo (base + banda + plataformas) con preview**

```js
// approach/build.mjs
// node approach/build.mjs        → escribe approach-figure.js y approach/preview.html
// node approach/build.mjs --check → construye y no escribe nada
import { writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./kit/iso-kit.mjs";
import * as G from "./geometry.mjs";
import { STATION_X, STEPS } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const check = process.argv.includes("--check");

const LABEL = "Una línea de ensamble isométrica con seis estaciones: un piso de operación, un atril de entrevista, una mesa de dibujo, un banco con prensa, un muelle con un rack, y una sala de control. Una pieza viaja por la banda y cambia de forma en cada estación; una línea de retorno la devuelve al inicio.";

const decks = [];
for (let n = 0; n < STEPS; n++) decks.push({ depth: k.depthOf([STATION_X[n], G.DECK.y, 0], G.P), svg: G.deck(n) });
decks.sort((a, b) => a.depth - b.depth);

const svg = G.svgBody([G.base(), ...decks.map((d) => d.svg), G.belt()], LABEL);

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
```

Nota: `pageHtml` ya inlinea `ISO_CSS`, así que la preview es un entorno fiel para `capture.mjs` y `lines.mjs`. El módulo real recibe el CSS en Task 5.

- [ ] **Step 6: Construir y ver**

Run: `node approach/build.mjs && node "$env:USERPROFILE\.claude\skills\anatomy\scripts\capture.mjs" approach/preview.html --out shots/t2-base.png --select .approach-figure`
Expected: `wrote approach-figure.js …`; `shots/t2-base.png` muestra la placa, seis plataformas numeradas y la banda con ticks y topes. Leer el PNG (Read) y corregir cualquier parte flotante o solapamiento antes de seguir. El test de Task 2 Step 2 aún falla por las partes móviles (se completa en Task 4).

- [ ] **Step 7: Commit**

```bash
git add approach/kit/iso-kit.mjs approach/geometry.mjs approach/build.mjs approach/build.test.mjs
git commit -m "feat(approach): kit, camera, base, belt and station decks"
```

---

### Task 3: Las seis estaciones (estático)

**Files:**
- Create: `approach/stations.mjs`
- Modify: `approach/build.mjs` (lista de partes)

**Interfaces:**
- Consumes: `G.*` de `geometry.mjs`, `STATION_X`.
- Produces: `stations(): { back: string[], front: string[] }` — `back` son las piezas estáticas que se pintan antes de la banda (una entrada por estación, ya ordenadas por profundidad), `front` las que sobrevuelan la banda y se pintan después de la pieza (brazo de la lupa, pórtico de la prensa, etc., también ordenadas). Cada estación está envuelta en `<g data-station="n">` (en `back`).
- Produces: funciones de piezas móviles usadas por Task 4, todas con la pieza construida en reposo: `lamp()`, `lens()`, `sheetAt(t)`, `press()`, `needleAt(t)`, `door()`, `led()`, `meterAt(t)`, `runner()`.

Convención de coordenadas por estación `n`: `cx = STATION_X[n]`, la plataforma ocupa `y ∈ [-118, -42]`, su superficie está en `z = 8`. Todo lo que sobrevuela la banda tiene `y ∈ [-18, 18]` y `z ≥ BELT_TOP + 22`.

- [ ] **Step 1: Escribir `stations.mjs` con la estación 0 completa (campo operacional)**

```js
// approach/stations.mjs
import * as k from "./kit/iso-kit.mjs";
import * as G from "./geometry.mjs";
import { STATION_X } from "./model.mjs";

const { S, L, D, at, P, BELT_TOP } = G;
const Z = 8; // superficie de la plataforma

// ---------- Estación 0: campo operacional ----------
// Un mostrador con una persona detrás (tablilla en mano), una máquina con una
// lámpara de estado, y un dispositivo portátil sobre el mostrador. De aquí sale
// el ticket a la banda por una rampa.
const S0 = STATION_X[0];
const COUNTER = { x: S0 - 40, y: -82, w: 46, d: 16, r: 1.5 };
const MACHINE = { x: S0 + 8, y: -108, w: 30, d: 24, r: 2 };
export const LAMP_AT = [MACHINE.x + MACHINE.w / 2, MACHINE.y + MACHINE.d / 2, Z + 46];

export function station0Back() {
  const out = [];
  // Mostrador: cuerpo, tapa, zócalo y una ranura frontal.
  out.push(S(k.slabOf(COUNTER, Z, 22, P, 3, 0.6), { tone: "mid" }));
  out.push(S(k.slabOf(k.insetPlan(COUNTER, -1.5), Z + 22, 2, P, 3, 0.5), { tone: "hi" }));
  out.push(L(k.sideSeam(COUNTER, Z + 4, P, 3), { tone: "faint" }));
  // Dispositivo portátil sobre el mostrador: carcasa, pantalla, botón.
  const device = { x: COUNTER.x + 6, y: COUNTER.y + 4, w: 12, d: 8, r: 1 };
  out.push(S(k.slabOf(device, Z + 24, 1.6, P, 3, 0.3), { tone: "hi" }));
  out.push(L(k.planOutline(k.insetPlan(device, 1.2), Z + 25.6, P, 3), { tone: "lo" }));
  out.push(D([at([device.x + device.w - 2, device.y + device.d / 2, Z + 25.6])], { size: 0.4 }));
  // Persona detrás del mostrador: cuerpo (prisma), cabeza (cilindro), tablilla.
  const person = [COUNTER.x + 30, COUNTER.y - 10];
  out.push(S(k.cylinder(person[0], person[1], 5, Z, 26, P, 20), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(person[0], person[1], 3.4, Z + 28, 7, P, 20), { tone: "hi" }));
  out.push(S(k.slabOf({ x: person[0] - 9, y: person[1] + 4, w: 7, d: 1.4, r: 0.3 }, Z + 18, 9, P, 2), { tone: "hi", crease: "lo" }));
  for (const dz of [21, 23.5]) out.push(L(k.segment([person[0] - 8, person[1] + 5.5, Z + dz], [person[0] - 3, person[1] + 5.5, Z + dz], P), { tone: "lo", free: true }));
  // Máquina: cuerpo, panel con dos diales, rejilla de ventilación (ranuras cerradas), mástil de la lámpara.
  out.push(S(k.slabOf(MACHINE, Z, 36, P, 3, 0.8), { tone: "mid" }));
  out.push(L(k.sideSeam(MACHINE, Z + 30, P, 3), { tone: "faint" }));
  for (const dx of [8, 20]) {
    out.push(L(k.sideRing([MACHINE.x + dx, MACHINE.y + MACHINE.d, Z + 22], 3, "y", P, 16), { tone: "lo" }));
    out.push(D([at([MACHINE.x + dx, MACHINE.y + MACHINE.d, Z + 22])], { size: 0.4 }));
  }
  for (const dz of [8, 11, 14]) {
    out.push(L(k.segment([MACHINE.x + 6, MACHINE.y + MACHINE.d, Z + dz], [MACHINE.x + MACHINE.w - 6, MACHINE.y + MACHINE.d, Z + dz], P) +
      k.segment([MACHINE.x + 6, MACHINE.y + MACHINE.d, Z + dz], [MACHINE.x + 6, MACHINE.y + MACHINE.d, Z + dz + 1.2], P) +
      k.segment([MACHINE.x + MACHINE.w - 6, MACHINE.y + MACHINE.d, Z + dz], [MACHINE.x + MACHINE.w - 6, MACHINE.y + MACHINE.d, Z + dz + 1.2], P) +
      k.segment([MACHINE.x + 6, MACHINE.y + MACHINE.d, Z + dz + 1.2], [MACHINE.x + MACHINE.w - 6, MACHINE.y + MACHINE.d, Z + dz + 1.2], P), { tone: "faint" }));
  }
  out.push(S(k.cylinder(LAMP_AT[0], LAMP_AT[1], 1.4, Z + 36, 8, P, 12), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(LAMP_AT[0], LAMP_AT[1], 3.2, Z + 44, 1.6, P, 16), { tone: "mid" }));
  // Rampa del mostrador a la banda: una lámina inclinada construida como extrude de un paralelogramo plano, apoyada en el mostrador y en el larguero.
  const ramp = [[COUNTER.x + 10, COUNTER.y + COUNTER.d], [COUNTER.x + 22, COUNTER.y + COUNTER.d], [COUNTER.x + 22, G.BELT.y - 3], [COUNTER.x + 10, G.BELT.y - 3]];
  out.push(S(k.extrude(ramp, Z + 2, 1.6, P), { tone: "mid", crease: "none" }));
  out.push(L(k.onTop([[COUNTER.x + 11.5, COUNTER.y + COUNTER.d], [COUNTER.x + 11.5, G.BELT.y - 3]], Z + 3.6, P) + k.onTop([[COUNTER.x + 20.5, COUNTER.y + COUNTER.d], [COUNTER.x + 20.5, G.BELT.y - 3]], Z + 3.6, P), { tone: "lo" }));
  return out.join("");
}

// La lámpara de estado (móvil: solo cambia la opacidad del domo encendido).
export function lamp() {
  return S(k.cylinder(LAMP_AT[0], LAMP_AT[1], 2.4, Z + 45.6, 3.2, P, 16), { tone: "hi", lit: true, crease: "none" });
}
```

- [ ] **Step 2: Añadir las estaciones 1–5 en `stations.mjs`**

Cada una sigue el mismo patrón que la estación 0: una función `stationNBack()` para lo estático y funciones pequeñas para la parte móvil construida en reposo. Partes mínimas (todas apoyadas en la plataforma `Z = 8` o en otra pieza; usar `slabOf`, `cylinder`, `extrude`, `sideSeam`, `ring`, `knurl`, `topTicks`, `radialTicks`, `faceTextSvg`):

| Estación | Estático (`back`) | Sobre la banda (`front`) | Móvil |
|---|---|---|---|
| 1 Entender (`cx=180`) | Atril: columna `cylinder(cx-18, -80, 4, Z, 30)`, tablero inclinado (`extrude` de paralelogramo a z 38, grosor 2) con 4 líneas de texto `free`; grabadora `slabOf({x:cx+6,y:-96,w:14,d:9}, Z, 5)` con dos `ring` (carretes) y una ranura `sideSeam`; cuaderno abierto sobre la plataforma `slabOf({x:cx+2,y:-70,w:16,d:12}, Z, 1.2)` con línea central `lineOnTop` y 3 rayas `free` por página | Brazo de la lupa: poste `cylinder(cx+28, -22, 2.2, 0, 56)` apoyado en la placa base (está fuera de la banda, y=-22), brazo horizontal `slabOf({x:cx-6,y:-23.5,w:34,d:3}, 56, 3)` hasta encima de la banda, tornillo en el codo | `lens()`: aro `ring(cx, 0, 7, 46, P, 32)` + cristal `cylinder(cx, 0, 6.2, 44.5, 1.2, P, 32)` tono `hi` + mango `slabOf({x:cx+6,y:-1.2,w:9,d:2.4}, 45, 1.6)`. Baja con `translateAlong(P,[0,0,-14*a])`. |
| 2 Diseñar (`cx=300`) | Mesa de dibujo: tablero `slabOf({x:cx-40,y:-104,w:80,d:50,r:2}, Z+22, 3)` sobre 4 patas `cylinder(…,2.2,Z,22)`; 3 planos enrollados `cylinder` horizontal **no existe en el kit** → usar tres `slabOf` finos de 2 de alto con `sideSeam` para sugerir el rollo, en `y=-100`, separados 12; escuadra: `extrude` de triángulo plano a Z+25; lámpara de brazo: poste `cylinder` + cabeza `slabOf` inclinada | Pórtico ligero: dos postes `cylinder(cx±14, -22, 2, 0, 50)` en la placa base y un travesaño `slabOf({x:cx-16,y:-23.5,w:32,d:3}, 50, 3)` con un carrete `cylinder(cx, -22, 4, 53, 4)` + `knurl` | `sheetAt(t)`: una lámina `slabOf({x:cx-4-26*t, y:-9, w:8+52*t, d:18, r:0.6}, BELT_TOP+30, 0.8)` que se desenrolla desde el carrete (crece en w con `t`); con 3 líneas `lineOnTop` `free` que aparecen cuando `t>0.5`. Se **reconstruye** cada frame. |
| 3 Construir (`cx=420`) | Banco: `slabOf({x:cx-42,y:-110,w:84,d:40,r:2}, Z, 24)` con cajón (`planOutline` inset + tirador `cylinder`), tornillo de banco (dos `slabOf` + husillo `cylinder` + `knurl`), medidor de pruebas: carcasa `cylinder(cx+24, -70, 11, Z, 10, P, 56)`, bisel `ring`, `radialTicks(cx+24,-70, 8.5, 30, 5, Z+10, [1,2])`, zona verde: `lineSvg` arco en `tone:"green"` de 3 ticks, texto `faceTextSvg` "OK" | Prensa: dos columnas `cylinder(cx±18, -22, 3, 0, 64)`, cabezal `slabOf({x:cx-22,y:-26,w:44,d:8,r:2}, 64, 10)`, 4 tornillos, husillo `cylinder(cx, -22, 2, 74, 8)` con volante `cylinder` + `knurl` | `press()`: el pistón `slabOf({x:cx-10,y:-8,w:20,d:16,r:1.5}, BELT_TOP+28, 6)` + vástago `cylinder(cx, 0, 2.2, BELT_TOP+34, 30)`; baja con `translateAlong(P,[0,0,-16*a])`. `needleAt(t)`: aguja `lineOnTop` desde el centro del medidor con ángulo `-120° + 150°·t` (patrón `needleAt` del ejemplo dial-indicator), `data-free="start"`, tono `lit`→ **no**: tono `hi` (la pieza es el único `lit`). |
| 4 Desplegar (`cx=540`) | Rack: gabinete `slabOf({x:cx-20,y:-112,w:40,d:30,r:2}, Z, 54)` con 6 unidades (`sideSeam` cada 7 de alto) y 2 LEDs apagados `D`; teléfono de pie `slabOf({x:cx+28,y:-84,w:7,d:12,r:1}, Z, 14)` con pantalla `planOutline` en cara lateral (`sideRing` no; usar `segment` rectángulo); monitor: base `cylinder`, cuello, pantalla `slabOf({x:cx-44,y:-80,w:2,d:22}, Z+10, 16)` con bisel; cables: `wireSvg` del rack al teléfono y al monitor con `via` por el suelo de la plataforma (`z=Z`), extremos en `D` | Marco de despacho: arco `slabOf({x:cx-16,y:-23.5,w:32,d:3}, 44, 4)` sobre dos postes `cylinder(cx±14,-22,2,0,44)` con sensor `cylinder(cx,-22,2.5,48,2)` | `door()`: puerta corrediza del rack `slabOf({x:cx-20,y:-81.5,w:40,d:1.5,r:0.4}, Z, 54)` construida ABIERTA desplazada `+30` en x; cierra con `translateAlong(P,[-30*a,0,0])`; tirador `cylinder`. `led()`: `D` de 2 puntos `tone:"green"` con opacidad = `a`. |
| 5 Operar y mejorar (`cx=660`) | Sala de control: consola `slabOf({x:cx-44,y:-100,w:88,d:30,r:2}, Z, 18)` con panel inclinado (`extrude` paralelogramo), 3 pantallas (`slabOf` finos verticales, `planOutline` inset), fila de 6 botones `cylinder r=1.6`, dial de métricas `cylinder(cx+30,-74,12, Z+18, 4, P, 56)` con `radialTicks(…, 40, 5, …)` y bisel `knurl`; silla: asiento `slabOf`, respaldo `slabOf`, columna `cylinder`, base `cylinder` | Tablero elevado sobre la banda: dos postes `cylinder(cx±16,-22,2,0,58)`, pantalla `slabOf({x:cx-20,y:-24,w:40,d:2,r:1}, 58, 22)` con bisel `planOutline` y 3 barras `segment` `free` | `meterAt(t)`: aguja del dial `lineOnTop` ángulo `-130° + 200°·t`, tono `hi`, `data-free="start"`. `runner()`: el punto que vuelve por la línea de retorno (`D` tamaño 0.9, tono `hi`) construido en `[STATION_X[5], -60, RAIL_Z+2]`; se mueve con `translateAlong(P,[-(STATION_X[5]-STATION_X[0])*t,0,0])`. |

Línea de retorno (parte de `back`, después de las estaciones): riel `slabOf({x: STATION_X[0]-6, y:-61.5, w: STATION_X[5]-STATION_X[0]+12, d:3, r:0.8}, RAIL_Z, 2.4)` sobre 4 postes `cylinder(x, -60, 1.8, Z, RAIL_Z-Z)` en `x = STATION_X[0], STATION_X[2]-10, STATION_X[3]+10, STATION_X[5]` (los postes se apoyan en la plataforma de su estación: en `x = STATION_X[2]-10` y `STATION_X[3]+10` siguen dentro de la plataforma, `|x-cx| ≤ 46`), con una ménsula `slabOf` en cada poste y un tornillo `D`.

Función de ensamblado:

```js
export function stations() {
  const backParts = [
    { x: STATION_X[0], svg: `<g data-station="0">${station0Back()}</g>` },
    { x: STATION_X[1], svg: `<g data-station="1">${station1Back()}</g>` },
    { x: STATION_X[2], svg: `<g data-station="2">${station2Back()}</g>` },
    { x: STATION_X[3], svg: `<g data-station="3">${station3Back()}</g>` },
    { x: STATION_X[4], svg: `<g data-station="4">${station4Back()}</g>` },
    { x: STATION_X[5], svg: `<g data-station="5">${station5Back()}</g>` },
  ].sort((a, b) => k.depthOf([a.x, G.DECK.y, 0], P) - k.depthOf([b.x, G.DECK.y, 0], P));
  const frontParts = [
    { x: STATION_X[1], svg: station1Front() },
    { x: STATION_X[2], svg: station2Front() },
    { x: STATION_X[3], svg: station3Front() },
    { x: STATION_X[4], svg: station4Front() },
    { x: STATION_X[5], svg: station5Front() },
  ].sort((a, b) => k.depthOf([a.x, -22, 0], P) - k.depthOf([b.x, -22, 0], P));
  return { back: [...backParts.map((p) => p.svg), returnRail()], front: frontParts.map((p) => p.svg) };
}
```

- [ ] **Step 3: Conectar en `build.mjs`**

Sustituir la construcción del `svg` por:

```js
import { stations } from "./stations.mjs";
const { back, front } = stations();
const svg = G.svgBody([G.base(), ...decks.map((d) => d.svg), ...back, G.belt(), ...front], LABEL);
```

(`decks` ya está ordenado; las plataformas van antes que su mobiliario.)

- [ ] **Step 4: Construir, capturar y revisar a 4×**

Run:
```powershell
node approach/build.mjs
$ANAT = "$env:USERPROFILE\.claude\skills\anatomy"
node "$ANAT\scripts\capture.mjs" approach/preview.html --out shots/t3-all.png --select .approach-figure
foreach ($n in 0..5) { node "$ANAT\scripts\capture.mjs" approach/preview.html --out "shots/t3-st$n.png" --select .approach-figure --zoom "$(60 + 190*$n),120,260,300" }
node "$ANAT\scripts\lines.mjs" approach/preview.html --out shots/t3-lines.png --select .approach-figure
```
Expected: cada PNG leído con Read; cada estación se reconoce como lo que es; ninguna pieza flota; `lines.mjs` imprime `line ends: 0`. Si no, corregir geometría (no la tolerancia) y repetir. Ajustar las coordenadas `--zoom` a lo que muestre el PNG completo.

- [ ] **Step 5: Commit**

```bash
git add approach/stations.mjs approach/build.mjs
git commit -m "feat(approach): six stations and return rail"
```

---

### Task 4: La pieza que viaja y las partes móviles

**Files:**
- Create: `approach/piece.mjs`
- Modify: `approach/build.mjs`
- Test: `approach/build.test.mjs` (ya escrito en Task 2; ahora debe pasar)

**Interfaces:**
- Produces (`piece.mjs`): `pieceForms(): string` — un `<g data-part="piece">` con 6 subgrupos `<g data-form="f" opacity="0">` construidos en `STATION_X[0]` sobre la banda. Todas las formas son `lit`.
- Produces (`build.mjs`): el SVG final con todos los `data-part`, y los datos que el runtime necesita: `P`, `STATION_X`, `RAIL_Z`, `BELT_TOP`, centros del medidor y del dial.

- [ ] **Step 1: Escribir `piece.mjs`**

```js
// approach/piece.mjs
// La pieza que viaja: seis formas, todas construidas en la estación 0 sobre la
// banda, en un grupo que el runtime traslada. Es el único elemento `lit`.
import * as k from "./kit/iso-kit.mjs";
import * as G from "./geometry.mjs";
import { STATION_X } from "./model.mjs";

const { S, L, D, at, P, BELT_TOP } = G;
const X = STATION_X[0];
const lit = (paths, extra = {}) => S(paths, { tone: "hi", lit: true, ...extra });

function ticket() {
  const plan = { x: X - 7, y: -5, w: 14, d: 10, r: 0.8 };
  return lit(k.slabOf(plan, BELT_TOP, 0.8, P, 3)) +
    L([3, 5.5].map((dy) => k.lineOnTop([plan.x + 2, plan.y + dy], [plan.x + plan.w - 2 - (dy > 4 ? 4 : 0), plan.y + dy], BELT_TOP + 0.8, P)).join(""), { tone: "lo", free: true }) +
    L(k.ring(plan.x + plan.w - 2.5, plan.y + plan.d - 2.5, 0.9, BELT_TOP + 0.8, P, 10), { tone: "lo" });
}
function notebook() {
  const plan = { x: X - 8, y: -6, w: 16, d: 12, r: 0.6 };
  return lit(k.slabOf(plan, BELT_TOP, 2, P, 3, 0.3)) +
    L(k.lineOnTop([X, plan.y + 1], [X, plan.y + plan.d - 1], BELT_TOP + 2, P), { tone: "lo" }) +
    L([3, 5.5, 8].map((dy) => k.lineOnTop([plan.x + 2, plan.y + dy], [X - 1.5, plan.y + dy], BELT_TOP + 2, P) + k.lineOnTop([X + 1.5, plan.y + dy], [plan.x + plan.w - 2, plan.y + dy], BELT_TOP + 2, P)).join(""), { tone: "lo", free: true });
}
function blueprint() {
  const plan = { x: X - 10, y: -7, w: 20, d: 14, r: 0.5 };
  const out = [lit(k.slabOf(plan, BELT_TOP, 0.6, P, 3))];
  out.push(L(k.planOutline(k.insetPlan(plan, 1.5), BELT_TOP + 0.6, P, 3), { tone: "lo" }));
  // tres cajas (datos, API, pantallas) unidas por dos segmentos
  const boxes = [[X - 6, -2], [X, -2], [X + 6, -2]].map(([bx, by]) => ({ x: bx - 2, y: by - 1.5, w: 4, d: 3, r: 0.3 }));
  for (const b of boxes) out.push(L(k.planOutline(b, BELT_TOP + 0.6, P, 2), { tone: "mid" }));
  out.push(L(k.lineOnTop([X - 4, -2], [X - 2, -2], BELT_TOP + 0.6, P) + k.lineOnTop([X + 2, -2], [X + 4, -2], BELT_TOP + 0.6, P), { tone: "mid" }));
  out.push(L(k.lineOnTop([X - 6, 2], [X + 6, 2], BELT_TOP + 0.6, P), { tone: "lo", free: true }));
  return out.join("");
}
function modules() {
  const crate = { x: X - 9, y: -7, w: 18, d: 14, r: 0.8 };
  const out = [lit(k.slabOf(crate, BELT_TOP, 4, P, 3, 0.4), { crease: "lo" })];
  [[-5, -3], [0, -3], [5, -3], [-5, 3], [0, 3], [5, 3]].forEach(([dx, dy]) => {
    out.push(lit(k.slabOf({ x: X + dx - 1.8, y: dy - 1.8, w: 3.6, d: 3.6, r: 0.4 }, BELT_TOP + 4, 2.4, P, 2), { crease: "lo" }));
  });
  return out.join("");
}
function sealed() {
  const crate = { x: X - 9, y: -7, w: 18, d: 14, r: 0.8 };
  return lit(k.slabOf(crate, BELT_TOP, 8, P, 3, 0.5), { crease: "lo" }) +
    L(k.sideSeam(crate, BELT_TOP + 4, P, 3), { tone: "lo" }) +
    L(k.lineOnTop([X, crate.y + 1], [X, crate.y + crate.d - 1], BELT_TOP + 8, P), { tone: "lo" }) +
    D([at([X, 0, BELT_TOP + 8])], { size: 0.5 });
}
function glow() {
  return lit(k.cylinder(X, 0, 4, BELT_TOP, 1.2, P, 24), { crease: "none" }) +
    L(k.ring(X, 0, 6.5, BELT_TOP + 0.2, P, 32), { tone: "mid" }) +
    D([at([X, 0, BELT_TOP + 1.2])], { size: 0.8, tone: "hi" });
}

export function pieceForms() {
  const forms = [ticket(), notebook(), blueprint(), modules(), sealed(), glow()];
  return `<g data-part="piece">${forms.map((svg, f) => `<g data-form="${f}" opacity="0">${svg}</g>`).join("")}</g>`;
}
```

- [ ] **Step 2: Ensamblar las partes móviles en `build.mjs`**

Orden de pintura final (de atrás hacia delante): base → plataformas → `back` (estaciones + riel de retorno) → `runner` (va sobre el riel, detrás de todo lo de la banda) → `door` (en el rack, detrás de la banda) → `led` → `lamp` → `needle` → `meter` → banda → pieza → `front` → `lens`, `press`, `sheet` (ordenadas por estación). Las partes móviles se envuelven así:

```js
import { pieceForms } from "./piece.mjs";
import * as ST from "./stations.mjs";

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
```

y exportar para el runtime (en la cadena `runtime`, antes de `mountApproachFigure`):

```js
const STATIONS = ${JSON.stringify(STATION_X)};
const RAIL_Z = ${G.RAIL_Z}, BELT_TOP = ${G.BELT_TOP};
const SHEET = ${JSON.stringify({ cx: STATION_X[2], z: G.BELT_TOP + 30 })};
const GAUGE = ${JSON.stringify(ST.GAUGE)};   // { cx, cy, z, r } del medidor de pruebas
const DIAL = ${JSON.stringify(ST.DIAL)};     // { cx, cy, z, r } del dial de métricas
const sheetAt = ${ST.sheetAt.toString().replace(/G\.|k\./g, "")};
const needleAt = ${ST.needleAt.toString().replace(/G\.|k\./g, "")};
const meterAt = ${ST.meterAt.toString().replace(/G\.|k\./g, "")};
```

Para que esas tres funciones sean serializables, en `stations.mjs` deben usar solo `k.*`/`G.*` con nombres que existan sin prefijo en el módulo generado (`slabOf`, `lineOnTop`, `solidSvg`, `lineSvg`, `P`, `BELT_TOP`) y las constantes `SHEET`, `GAUGE`, `DIAL` exportadas como objetos planos. Escribirlas así:

```js
export const GAUGE = { cx: STATION_X[3] + 24, cy: -70, z: 8 + 10, r: 8.5 };
export const DIAL = { cx: STATION_X[5] + 30, cy: -74, z: 8 + 18 + 4, r: 10 };
export const SHEET = { cx: STATION_X[2], z: BELT_TOP + 30 };
export function sheetAt(t) {
  const w = 8 + 52 * t;
  const plan = { x: SHEET.cx + 4 - w, y: -9, w, d: 18, r: 0.6 };
  let out = solidSvg(slabOf(plan, SHEET.z, 0.8, P, 3), { tone: "hi", crease: "lo" });
  if (t > 0.5) for (const dy of [5, 9, 13]) out += lineSvg(lineOnTop([plan.x + 3, plan.y + dy], [plan.x + plan.w - 3, plan.y + dy], SHEET.z + 0.8, P), { tone: "lo", free: true });
  return out;
}
export function needleAt(t) {
  const a = (-120 + 150 * t) * Math.PI / 180;
  return lineOnTop([GAUGE.cx - Math.sin(a) * 1.5, GAUGE.cy + Math.cos(a) * 1.5], [GAUGE.cx + Math.sin(a) * (GAUGE.r - 1), GAUGE.cy - Math.cos(a) * (GAUGE.r - 1)], GAUGE.z + 0.2, P);
}
export function meterAt(t) {
  const a = (-130 + 200 * t) * Math.PI / 180;
  return lineOnTop([DIAL.cx - Math.sin(a) * 2, DIAL.cy + Math.cos(a) * 2], [DIAL.cx + Math.sin(a) * (DIAL.r - 1.5), DIAL.cy - Math.cos(a) * (DIAL.r - 1.5)], DIAL.z + 0.2, P);
}
```

con, en la cabecera de `stations.mjs`: `const { solidSvg, lineSvg, slabOf, lineOnTop } = k;` (así el `.toString()` no lleva prefijo y el `replace` queda inofensivo).

- [ ] **Step 3: Construir y ejecutar el test de build**

Run: `node --test approach/build.test.mjs`
Expected: `# pass 1`.

- [ ] **Step 4: Capturar y revisar las formas de la pieza**

Para verlas sin runtime, en la preview las formas tienen `opacity="0"`; añadir temporalmente en el `script` de la preview `document.querySelectorAll('[data-form]').forEach((g,i)=>g.setAttribute('opacity', i===Number(new URLSearchParams(location.search).get('f')||0)?1:0))` y capturar `approach/preview.html?f=0` … `?f=5` con `--zoom` sobre la estación 0 a 4×. Leer cada PNG: cada forma debe reconocerse (ticket, cuaderno, plano, caja con módulos, caja sellada, punto). Dejar ese código de depuración en la preview (no afecta al módulo).

- [ ] **Step 5: Commit**

```bash
git add approach/piece.mjs approach/stations.mjs approach/build.mjs
git commit -m "feat(approach): travelling piece forms and moving parts"
```

---

### Task 5: Runtime del módulo (`mountApproachFigure`)

**Files:**
- Modify: `approach/build.mjs` (cadenas `CSS` y `runtime`)
- Test: `approach/runtime.test.mjs` (jsdom no está disponible: el test ejecuta la preview en Chrome vía `drive.mjs` y comprueba atributos)

**Interfaces:**
- Produces: `mountApproachFigure(host, { narrow? }) → { update({ progress, paused }), setNarrow(boolean), dispose() }`.
  - `update` fija un objetivo; un loop `requestAnimationFrame` sigue el objetivo con follow exponencial (τ = 0.22 s) y se detiene al asentarse. Con `paused: true` salta al objetivo y no anima.
  - `setNarrow(true)` activa el modo móvil del `viewBox` (ventana del 42 % del ancho centrada en la pieza); `false` el de escritorio (82 %).
  - El host recibe `data-step="n"` con el paso activo (para los cuadros en `index.html`).

- [ ] **Step 1: Escribir el test (Chrome headless vía drive.mjs)**

```js
// approach/runtime.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const ANAT = join(process.env.USERPROFILE || process.env.HOME, ".claude", "skills", "anatomy");
const drive = (actions) => execFileSync(process.execPath, [join(ANAT, "scripts", "drive.mjs"), "approach/preview.html", JSON.stringify(actions), "--no-shots"], { encoding: "utf8" });

test("update mueve la pieza, acciona mecanismos y expone data-step", () => {
  const out = drive([
    ["wait", 800],
    ["eval", "window.__approach.update({ progress: 0, paused: true }); document.querySelector('[data-part=piece]').getAttribute('transform')"],
    ["eval", "window.__approach.update({ progress: 3.9, paused: true }); document.querySelector('[data-part=piece]').getAttribute('transform')"],
    ["eval", "document.querySelector('.approach-figure').dataset.step"],
    ["eval", "Number(document.querySelector('[data-form=\"3\"]').getAttribute('opacity')) > 0.9"],
    ["eval", "document.querySelector('[data-part=press]').getAttribute('transform') !== null"],
    ["eval", "window.__approach.update({ progress: 6, paused: true }); document.querySelector('[data-part=runner]').getAttribute('transform')"],
    ["eval", "window.__approach.setNarrow(true); window.__approach.update({ progress: 2, paused: true }); document.querySelector('svg').getAttribute('viewBox')"],
  ]);
  assert.match(out, /translate\(0 0\)|null/, "en p=0 la pieza está en reposo");
  assert.match(out, /"3"/, "data-step=3 en p=3.9");
  assert.match(out, /true/);
  const boxes = out.match(/\d+(\.\d+)? \d+(\.\d+)? \d+(\.\d+)? \d+(\.\d+)?/g) || [];
  assert.ok(boxes.length >= 1, "viewBox escrito");
  const w = Number(boxes[boxes.length - 1].split(" ")[2]);
  assert.ok(w < 1240 * 0.5, `viewBox estrecho en modo narrow: ${w}`);
});
```

Si `drive.mjs` no admite `--no-shots`, omitir el flag (ver `node "$ANAT/scripts/drive.mjs" --help`) y ajustar la lectura de la salida a lo que imprime `eval`.

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Run: `node --test approach/runtime.test.mjs`
Expected: FAIL (`update` no hace nada; no hay `data-step`).

- [ ] **Step 3: Escribir el runtime en `build.mjs`**

Sustituir la cadena `runtime` por:

```js
const runtime = `
const SVG = ${JSON.stringify(svg)};
const CSS = ${JSON.stringify(CSS)};
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
const WINDOW = { wide: 0.82, narrow: 0.42 };

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
  // Posición en pantalla del centro de la pieza, para centrar la ventana de la cámara.
  const screenXOf = (worldX) => iso([worldX, 0, BELT_TOP], P)[0];
  let target = 0, shown = 0, paused = false, isNarrow = narrow;
  let frame = 0, last = 0, visible = true, lastStep = -1, lastSheet = -1, lastBox = "";
  let view = { x: screenXOf(STATIONS[0]) };

  function viewBoxFor(progress) {
    const state = stateAt(progress);
    const share = isNarrow ? WINDOW.narrow : WINDOW.wide;
    const w = WIDTH * share, h = HEIGHT * (isNarrow ? 0.78 : 1);
    const cx = Math.min(WIDTH - w / 2, Math.max(w / 2, screenXOf(state.viewX)));
    return { cx, w, h };
  }

  function draw(progress) {
    const s = stateAt(progress);
    const dx = s.pieceX - STATIONS[0];
    parts.piece.setAttribute("transform", translateAlong(P, [dx, 0, 0]));
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
    const value = \`\${(box.cx - box.w / 2).toFixed(1)} \${((HEIGHT - box.h) / 2).toFixed(1)} \${box.w.toFixed(1)} \${box.h.toFixed(1)}\`;
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
      if (paused) { shown = target; draw(shown); if (frame) { cancelAnimationFrame(frame); frame = 0; } return; }
      run();
    },
    setNarrow(value) { isNarrow = Boolean(value); lastBox = ""; draw(shown); },
    dispose() { if (frame) cancelAnimationFrame(frame); observer?.disconnect(); host.innerHTML = ""; delete host.dataset.step; },
  };
}
`;
```

Nota: `ISO_CSS`, `iso`, `translateAlong`, `stateAt`, `STEPS`, `slabOf`, `lineOnTop`, `solidSvg`, `lineSvg` están en el mismo módulo porque `kitSource` y `modelSource` se concatenan antes con `export` eliminado. En la preview, el `script` concatenado no puede tener `export`: ya se elimina con el `replace` existente.

El CSS del módulo (cadena `CSS`) mapea la paleta del sitio sobre las variables del kit:

```js
const CSS = `
.approach-figure.iso{
  --anatomy-paper:#0c0c14;--anatomy-face:#15151f;--anatomy-top:#181824;
  --anatomy-shade-0:#0a0a11;--anatomy-shade-1:#0e0e16;--anatomy-shade-2:#12121b;--anatomy-shade-3:#161620;
  --anatomy-lit-top:#2a2f2a;--anatomy-lit-shade:#1f241f;
  --anatomy-hi:#d8d2c6;--anatomy-mid:#7a7784;--anatomy-lo:#4a4854;--anatomy-faint:#35333e;--anatomy-lit:#b6f09c;
  --anatomy-halo:#000000;--anatomy-halo-opacity:.8;--anatomy-dot:#f3eadb;--anatomy-green:#b6f09c;
}
.approach-figure .iso-svg{display:block;width:100%;height:100%;overflow:visible}
.approach-figure [data-form],.approach-figure [data-part="lamp"],.approach-figure [data-part="led"]{transition:none}
`;
```

- [ ] **Step 4: Construir y ejecutar los tests**

Run: `node approach/build.mjs && node --test approach/`
Expected: `# pass 9` (7 modelo + 1 build + 1 runtime), `# fail 0`.

- [ ] **Step 5: Hoja de contacto del movimiento**

Run:
```powershell
$ANAT = "$env:USERPROFILE\.claude\skills\anatomy"
node "$ANAT\scripts\drive.mjs" approach/preview.html '[["wait",800],["eval","window.__approach.update({progress:0})"],["shot","shots/t5-p0.png"],["eval","window.__approach.update({progress:1.3})"],["wait",900],["shot","shots/t5-p1.3.png"],["eval","window.__approach.update({progress:2.9})"],["wait",900],["shot","shots/t5-p2.9.png"],["eval","window.__approach.update({progress:3.95})"],["wait",900],["shot","shots/t5-p3.95.png"],["eval","window.__approach.update({progress:4.9})"],["wait",900],["shot","shots/t5-p4.9.png"],["eval","window.__approach.update({progress:6})"],["wait",1200],["shot","shots/t5-p6.png"]]' --select .approach-figure
```
Expected: leer los 6 PNG. La pieza viaja y cambia de forma; la lupa baja; el plano se desenrolla; la prensa baja y la aguja marca; la puerta cierra y el LED enciende; el dial sube y el punto vuelve por el riel. Si algo salta (pop) o atraviesa otra pieza, corregir en `stations.mjs`/`piece.mjs` y repetir.

- [ ] **Step 6: Commit**

```bash
git add approach/build.mjs approach/runtime.test.mjs approach-figure.js approach/preview.html
git commit -m "feat(approach): runtime with scroll-driven progress and camera window"
```

---

### Task 6: Integración en `index.html` (HTML, CSS, i18n, scroll, carga)

**Files:**
- Modify: `index.html:278-289` (sección `#approach`)
- Modify: `index.html:114-118` (CSS `.approach-list`) y bloque `@media (max-width: 767px)`
- Modify: `index.html` diccionario `es`/`en` (claves `stepOne…stepSix`, `stepOneBody…stepSixBody`, `approachHint`, `approachFig`, `approachLabel`)
- Modify: `index.html` `measure()`, `updateScroll()`, `updateMotion()`, bloque `try { … mountIdentityScene … }`

**Interfaces:**
- Consumes: `mountApproachFigure(host, { narrow })` → `{ update, setNarrow, dispose }` de `./approach-figure.js`.

- [ ] **Step 1: HTML de la sección**

Sustituir el `<ol class="approach-list">…</ol>` (líneas 284–288) por:

```html
      <div class="approach-stage" id="approach-stage">
        <div class="approach-pin">
          <ol class="approach-captions" aria-live="polite">
            <li data-step="0"><span class="number">01</span><h3 data-i18n="stepOne">Campo operacional</h3><p data-i18n="stepOneBody">Todo empieza donde pasa el trabajo: personas, máquinas y una necesidad concreta que hoy se resuelve a mano.</p></li>
            <li data-step="1"><span class="number">02</span><h3 data-i18n="stepTwo">Entender</h3><p data-i18n="stepTwoBody">Preguntar, observar y levantar el proceso real. Una buena solución empieza por escuchar.</p></li>
            <li data-step="2"><span class="number">03</span><h3 data-i18n="stepThree">Diseñar</h3><p data-i18n="stepThreeBody">Datos, API y pantallas como partes de una misma experiencia. También cuando hay hardware de por medio.</p></li>
            <li data-step="3"><span class="number">04</span><h3 data-i18n="stepFour">Construir</h3><p data-i18n="stepFourBody">Código simple que aguanta producción, probado antes de salir del banco.</p></li>
            <li data-step="4"><span class="number">05</span><h3 data-i18n="stepFive">Desplegar</h3><p data-i18n="stepFiveBody">Nube, dispositivos y la gente que lo va a usar. El producto llega a donde vive el trabajo.</p></li>
            <li data-step="5"><span class="number">06</span><h3 data-i18n="stepSix">Operar y mejorar</h3><p data-i18n="stepSixBody">Medir, cuidar el rendimiento y volver al campo con lo aprendido. No termina en el último commit.</p></li>
          </ol>
          <figure class="approach-card">
            <div class="approach-meta"><span data-i18n="approachFig">Fig 2</span><span class="approach-readout" data-readout>01 / 06</span></div>
            <div class="approach-figure" aria-hidden="true"></div>
            <figcaption class="approach-hint" data-i18n="approachHint">Desplázate para avanzar</figcaption>
          </figure>
        </div>
      </div>
```

- [ ] **Step 2: CSS**

Sustituir las 5 reglas `.approach-list…` (líneas 114–118) por:

```css
    .approach-stage { position: relative; z-index: 4; height: calc(6 * 100svh); margin-top: 36px; }
    .approach-pin { position: sticky; top: 0; height: 100svh; display: grid; grid-template-columns: minmax(260px, 38%) 1fr; gap: 32px; align-items: center; padding-bottom: 24px; }
    .approach-captions { position: relative; margin: 0; padding: 0; list-style: none; min-height: 180px; }
    .approach-captions li { display: grid; grid-template-columns: 36px 1fr; gap: 20px; border-top: 1px solid var(--line); padding: 28px 0; }
    .approach-captions .number { font-size: .75rem; color: var(--coral); }
    .approach-captions h3 { font-size: 1.3rem; letter-spacing: -.03em; }
    .approach-captions p { margin-top: 10px; font-size: .95rem; grid-column: 2; }
    html.approach-live .approach-captions li { position: absolute; inset: 0 auto auto 0; width: 100%; opacity: 0; pointer-events: none; }
    html.approach-live .approach-captions li[data-active] { opacity: 1; pointer-events: auto; }
    .approach-card { margin: 0; position: relative; border: 1px solid var(--line); border-radius: 20px; padding: 18px 18px 14px; background: #0c0c14; min-height: 0; }
    .scene-ready .approach-card::after { content: ''; position: absolute; inset: -18px; z-index: -1; border-radius: 32px; background: var(--bg); filter: blur(20px); }
    .approach-meta, .approach-hint { display: flex; justify-content: space-between; font-size: .7rem; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
    .approach-readout { font-variant-numeric: tabular-nums; color: var(--lilac); }
    .approach-figure { height: min(62svh, 520px); margin: 12px 0; }
    .approach-hint { margin-top: 8px; }
    /* Sin movimiento o sin módulo: sin pin, figura en estado final y los seis cuadros como lista. */
    html.approach-static .approach-stage, html[data-motion="off"] .approach-stage { height: auto; }
    html.approach-static .approach-pin, html[data-motion="off"] .approach-pin { position: static; height: auto; display: block; }
    html.approach-static .approach-captions li, html[data-motion="off"] .approach-captions li { position: static; opacity: 1; pointer-events: auto; }
    html.approach-static .approach-card { display: none; }
    html[data-motion="off"] .approach-card { margin-top: 36px; }
    html[data-motion="off"] .approach-hint { display: none; }
```

Y dentro de `@media (max-width: 767px)` añadir:

```css
      .approach-pin { grid-template-columns: 1fr; grid-template-rows: auto 1fr; gap: 12px; align-items: start; padding-top: calc(16px + env(safe-area-inset-top)); }
      .approach-card { order: -1; padding: 12px 12px 10px; }
      .approach-figure { height: min(50svh, 380px); margin: 8px 0; }
      .approach-captions { min-height: 150px; }
      .approach-captions li { padding: 18px 0; }
      .approach-captions h3 { font-size: 1.15rem; }
      .approach-captions p { font-size: .9rem; }
```

En `@media (max-width: 1100px)` cambiar `.copy, .history, .approach-list { max-width: 52vw; }` por `.copy, .history { max-width: 52vw; }`, y en el bloque móvil `.copy, .history, .approach-list { max-width: 100%; }` por `.copy, .history { max-width: 100%; }`. En la lista de selectores `z-index: 4` (líneas 68–69 y 70–71) sustituir `.approach-list` por `.approach-stage` (en las dos listas).

Comprobar que `updateMotion()` escribe `data-motion="off"` en `<html>` cuando `motionOff()` (grep `data-motion`); si lo escribe en otro elemento, ajustar los selectores de arriba a ese elemento.

- [ ] **Step 3: Diccionario i18n**

En `es` (junto a `stepOne`…): reemplazar las 6 claves existentes y añadir:

```js
        stepOne: 'Campo operacional', stepOneBody: 'Todo empieza donde pasa el trabajo: personas, máquinas y una necesidad concreta que hoy se resuelve a mano.',
        stepTwo: 'Entender', stepTwoBody: 'Preguntar, observar y levantar el proceso real. Una buena solución empieza por escuchar.',
        stepThree: 'Diseñar', stepThreeBody: 'Datos, API y pantallas como partes de una misma experiencia. También cuando hay hardware de por medio.',
        stepFour: 'Construir', stepFourBody: 'Código simple que aguanta producción, probado antes de salir del banco.',
        stepFive: 'Desplegar', stepFiveBody: 'Nube, dispositivos y la gente que lo va a usar. El producto llega a donde vive el trabajo.',
        stepSix: 'Operar y mejorar', stepSixBody: 'Medir, cuidar el rendimiento y volver al campo con lo aprendido. No termina en el último commit.',
        approachFig: 'Fig 2', approachHint: 'Desplázate para avanzar',
        approachLabel: 'Línea de ensamble: de un campo operacional a software en uso, en seis estaciones.',
```

En `en`:

```js
        stepOne: 'The field', stepOneBody: 'It starts where the work happens: people, machines and a concrete need that is solved by hand today.',
        stepTwo: 'Understand', stepTwoBody: 'Ask, observe and map the real process. A good solution starts by listening.',
        stepThree: 'Design', stepThreeBody: 'Data, API and screens as parts of one experience. Hardware included when it is in the loop.',
        stepFour: 'Build', stepFourBody: 'Simple code that survives production, tested before it leaves the bench.',
        stepFive: 'Deploy', stepFiveBody: 'Cloud, devices and the people who will use it. The product reaches where the work lives.',
        stepSix: 'Run and improve', stepSixBody: 'Measure, keep it fast and bring what you learn back to the field. It does not end at the last commit.',
        approachFig: 'Fig 2', approachHint: 'Scroll to advance',
        approachLabel: 'Assembly line: from an operational field to software in use, in six stations.',
```

En `setLanguage()`, tras aplicar `data-i18n`, añadir: `document.querySelector('.approach-figure svg')?.setAttribute('aria-label', dictionary.approachLabel);`.

- [ ] **Step 4: Scroll, medición, movimiento y carga**

Variables (junto a `let scene = null` o donde se declaren `positions`, `scrollFrame`):

```js
    let figure = null, stageTop = 0, stageSpan = 1;
    const stage = document.getElementById('approach-stage');
    const pin = stage.querySelector('.approach-pin');
    const captions = [...stage.querySelectorAll('.approach-captions li')];
    const readout = stage.querySelector('[data-readout]');
    const narrowQuery = matchMedia('(max-width: 767px)');
    function showStep(step) {
      captions.forEach((li, index) => { if (index === step) li.setAttribute('data-active', ''); else li.removeAttribute('data-active'); });
      readout.textContent = `0${step + 1} / 06`;
    }
```

En `measure()`, antes de `updateScroll()`:

```js
      stageTop = stage.getBoundingClientRect().top + scrollY;
      stageSpan = Math.max(1, stage.offsetHeight - pin.offsetHeight);
```

En `updateScroll()`, después de `scene?.update(...)`:

```js
      if (figure) {
        const progress = motionOff() ? 6 : 6 * Math.max(0, Math.min(1, (y - stageTop) / stageSpan));
        figure.update({ progress, paused: motionOff() });
        const step = Math.min(5, Math.floor(progress));
        if (!captions[step].hasAttribute('data-active')) showStep(step);
      }
```

En `updateMotion()` (al final): `scheduleMeasure();` si no está ya, y `figure?.update({ paused: motionOff(), progress: motionOff() ? 6 : undefined });`.

`narrowQuery.addEventListener('change', () => { figure?.setNarrow(narrowQuery.matches); scheduleMeasure(); });`

Carga, dentro del `try` existente **después** de `root.classList.remove('scene-loading')` — en su propio `try` para que un fallo de la figura no tumbe la escena:

```js
    try {
      const { mountApproachFigure } = await import('./approach-figure.js');
      figure = mountApproachFigure(stage.querySelector('.approach-figure'), { narrow: narrowQuery.matches });
      root.classList.add('approach-live');
      showStep(0);
      measure();
    } catch (error) {
      root.classList.add('approach-static');
      console.warn('Approach figure unavailable; the step list remains.', error);
    }
```

Y `dispose` en `pagehide` junto al de `scene`: `figure?.dispose();`.

Como `.approach-pin` usa `display: grid` y en `approach-static` la tarjeta se oculta, el fallback es exactamente la lista de 6 pasos.

- [ ] **Step 5: Prueba del fallback (Review Focus 5)**

Run (PowerShell, servidor estático de prueba):
```powershell
Start-Process -NoNewWindow -FilePath npx -ArgumentList "serve . -l 4173" ; Start-Sleep 2
```
Luego con Playwright MCP (`browser_navigate` a `http://localhost:4173/`, `browser_evaluate`):
1. Con el módulo presente: `document.documentElement.classList.contains('approach-live')` → `true`; `getComputedStyle(document.querySelector('.approach-stage')).height` → ≈ `6 × innerHeight` px.
2. Renombrar temporalmente `approach-figure.js` → `approach-figure.js.bak`, recargar: `classList.contains('approach-static')` → `true`; `document.querySelectorAll('.approach-captions li').length` → 6 todos visibles (`getComputedStyle(li).opacity === '1'`); `.approach-stage` height ≈ altura de la lista (< 2 × innerHeight). Restaurar el nombre.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat(approach): pinned scroll section with captions, i18n and figure loader"
```

---

### Task 7: Verificación en navegador, responsive y pulido 4×

**Files:**
- Modify (solo si la revisión lo exige): `approach/stations.mjs`, `approach/piece.mjs`, `approach/geometry.mjs`, `index.html`

- [ ] **Step 1: Recorrido con scroll en escritorio (Playwright MCP, 1440×900)**

`browser_navigate` `http://localhost:4173/#approach`; luego `browser_evaluate` en secuencia: `scrollTo(0, stageTop + k * stageSpan / 6)` para `k = 0.2, 1.3, 2.9, 3.95, 4.9, 6` (leer `stageTop`/`stageSpan` recomputándolos: `const s=document.getElementById('approach-stage'); s.getBoundingClientRect().top+scrollY` y `s.offsetHeight-s.querySelector('.approach-pin').offsetHeight`), esperar 800 ms, `browser_take_screenshot`. Comprobar: el pin no se mueve, el cuadro activo coincide con el paso, el readout dice `0n / 06`, la figura avanza, y el canvas del JO sigue visible detrás.

- [ ] **Step 2: Móvil (390×844)**

`browser_resize` 390×844, repetir el recorrido. Comprobar: figura arriba, cuadro abajo, `viewBox` estrecho (ventana de ~2 estaciones), sin scroll horizontal (`document.documentElement.scrollWidth === innerWidth`), gutters 24 px.

- [ ] **Step 3: Review Focus 2–4**

- (2) A mitad de sección, `browser_resize` 390×700 → 390×844: el pin sigue fijo, el cuadro activo no cambia y `viewBox` sigue centrado en la pieza.
- (3) A mitad de sección, click en el botón `data-lang="en"`: textos en inglés, mismo `data-active`, `aria-label` del SVG en inglés.
- (4) Click en `#motion-toggle`: `.approach-stage` colapsa, los 6 cuadros se ven, la figura muestra el estado final (`[data-form="5"]` opacidad 1), el rail de capítulos marca el capítulo correcto tras `measure()`. Volver a activar: pin de nuevo y el progreso corresponde al scroll actual.
- Reduced motion: `browser_emulate_media` `reducedMotion: reduce`, recargar: igual que (4).
- Teclado: `browser_press_key` `PageDown` × 3 desde el inicio de la sección: el progreso avanza (el `data-step` cambia).

- [ ] **Step 4: 4× sobre cada estación y línea a cero**

Run:
```powershell
$ANAT = "$env:USERPROFILE\.claude\skills\anatomy"
node approach/build.mjs
node "$ANAT\scripts\lines.mjs" approach/preview.html --out shots/t7-lines.png --select .approach-figure
node "$ANAT\scripts\drive.mjs" approach/preview.html '[["wait",800],["eval","window.__approach.update({progress:6,paused:true})"],["wait",300],["lines","shots/t7-lines-end.png",".approach-figure",{"tolerance":1}]]'
foreach ($n in 0..5) { node "$ANAT\scripts\capture.mjs" approach/preview.html --out "shots/t7-4x-st$n.png" --select .approach-figure --zoom "$(60 + 190*$n),100,280,330" --zoom-scale 4 }
```
Expected: `line ends: 0` en reposo y en estado final. En cada 4×: ninguna cara vacía, cada textura termina en un borde, tornillos en las esquinas de cada placa, ninguna pieza flotando. Añadir las piezas reales que falten donde una región esté desnuda (tornillos, ranuras, seams, ticks), reconstruir y repetir hasta cumplir.

- [ ] **Step 5: Verificación final y commit**

Run: `node --test approach/ && node approach/build.mjs`
Expected: `# fail 0`; módulo regenerado idéntico (`git status` solo muestra cambios intencionales).

```bash
git add approach/ approach-figure.js index.html
git commit -m "polish(approach): 4x pass, responsive and browser verification"
```

---

## Self-review

- **Cobertura del spec:** objeto (T3/T4), pieza `lit` única (T4), scroll pin y progreso en `updateScroll` (T6), follow exponencial y loop que se detiene (T5), pausa/reduced-motion (T6 CSS + `paused`), cuadros i18n + `aria-live` (T6), marco Fig/readout/hint (T6), responsive y `viewBox` (T5 `setNarrow`, T6 CSS, T7), accesibilidad `role="img"`+`aria-label` i18n (T6), fallback (T6 Step 5), verificación con capture/lines/Playwright (T3, T5, T7), nada en `openspec/` (ningún task lo toca).
- **Placeholders:** ninguno; la tabla de estaciones 1–5 da coordenadas y funciones concretas, y el runtime, el modelo y la integración están completos.
- **Consistencia de nombres:** `stateAt`, `STATION_X`, `STEPS`, `TRAVEL`, `BELT_TOP`, `RAIL_Z`, `GAUGE`, `DIAL`, `SHEET`, `sheetAt`, `needleAt`, `meterAt`, `pieceForms`, `stations`, `mountApproachFigure`, `update`, `setNarrow`, `dispose`, `data-part` (`piece, lamp, lens, sheet, press, needle, door, led, meter, runner`), `data-form`, `data-station`, `data-step`, clases `approach-live`/`approach-static` — iguales en todos los tasks y en el test de build.
- **Review Focus:** (1) T1 test de clamp/NaN; (2)(3)(4) T7 Step 3; (5) T6 Step 5.
