// Mundo: x a lo largo de la banda, y hacia el espectador, z arriba. ~1 unidad = 1 px.
// Las estaciones están DETRÁS de la banda (y negativo): con azimut 64° el
// espectador está sobre todo hacia +y (screen x = x·sinA − y·cosA, así que la
// banda corre casi horizontal), y se pintan antes que la banda y la pieza.
import * as k from "./kit/iso-kit.mjs";
import { STATION_X } from "./model.mjs";

export const WIDTH = 1240;
export const HEIGHT = 520;
export const BELT = { x: -10, y: -18, w: 760, d: 36, r: 2 };
export const BELT_TOP = 10;
export const DECK = { y: -118, d: 76 };
export const RAIL_Z = 78;
export const BASE = { x: -60, y: -150, w: 860, d: 200, r: 12 };
export const BASE_H = 12;
export const FOOT_H = 6;

export const P = k.fitProjection(
  [...k.boxCorners(BASE, -BASE_H - FOOT_H, 0), [STATION_X[5] + 40, -60, 110], [STATION_X[0] - 40, -60, RAIL_Z + 12]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 64, elevation: 30 },
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
