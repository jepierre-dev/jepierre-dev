// Las seis estaciones. Cada una vive en su plataforma (y ∈ [-118, -42], superficie
// z = 8) detrás de la banda. Lo que sobrevuela la banda (brazos, prensa, carrete)
// cuelga de postes plantados en la placa base en y = -30, entre la plataforma y
// el larguero trasero de la banda: los postes se pintan ANTES de la banda (back)
// y los brazos DESPUÉS de la pieza (front).
import * as k from "./kit/iso-kit.mjs";
import * as G from "./geometry.mjs";
import { STATION_X } from "./model.mjs";

const { S, L, D, at, P, BELT_TOP, RAIL_Z } = G;
// Sin prefijo: sheetAt/needleAt/meterAt se serializan con toString() al módulo generado.
const { solidSvg, lineSvg, slabOf, lineOnTop } = k;
const Z = 8; // superficie de la plataforma
const POST_Y = -30;

// Un rectángulo sobre una cara vertical que mira a +y (pantallas, cajones).
const faceRectY = (x0, x1, y, z0, z1) => k.pathOf([at([x0, y, z0]), at([x1, y, z0]), at([x1, y, z1]), at([x0, y, z1])], true);
// Un poste vertical en la placa base, con pie y tornillo.
function post(x, y, r, top) {
  return S(k.cylinder(x, y, r + 1.6, 0, 1.4, P, 20), { tone: "lo" }) +
    S(k.cylinder(x, y, r, 1.4, top - 1.4, P, 20), { tone: "mid", crease: "none" }) +
    L(k.sideArc(x, y, r, top - 6, P, 12), { tone: "faint" });
}

// ---------- Estación 0: campo operacional ----------
// Un mostrador con una persona detrás (tablilla en mano), una máquina con una
// lámpara de estado, y un dispositivo portátil sobre el mostrador. De aquí sale
// el ticket a la banda por una rampa.
const S0 = STATION_X[0];
const COUNTER = { x: S0 - 40, y: -82, w: 46, d: 16, r: 1.5 };
const MACHINE = { x: S0 + 8, y: -108, w: 30, d: 24, r: 2 };
export const LAMP_AT = [MACHINE.x + MACHINE.w / 2, MACHINE.y + MACHINE.d / 2, Z + 46];

function station0Back() {
  const out = [];
  // Mostrador: cuerpo, tapa, zócalo y una ranura frontal.
  out.push(S(k.slabOf(COUNTER, Z, 22, P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(COUNTER, Z + 4, P, 3), { tone: "faint" }) }));
  out.push(S(k.slabOf(k.insetPlan(COUNTER, -1.5), Z + 22, 2, P, 3, 0.5), { tone: "hi" }));
  // Dispositivo portátil sobre el mostrador: carcasa, pantalla, botón.
  const device = { x: COUNTER.x + 6, y: COUNTER.y + 4, w: 12, d: 8, r: 1 };
  out.push(S(k.slabOf(device, Z + 24, 1.6, P, 3, 0.3), { tone: "hi" }));
  out.push(L(k.planOutline(k.insetPlan(device, 1.2), Z + 25.6, P, 3), { tone: "lo" }));
  out.push(D([at([device.x + device.w - 2, device.y + device.d / 2, Z + 25.6])], { size: 0.4 }));
  // Persona detrás del mostrador: cuerpo, cabeza, tablilla con dos renglones.
  const person = [COUNTER.x + 30, COUNTER.y - 10];
  out.push(S(k.cylinder(person[0], person[1], 5, Z, 26, P, 20), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(person[0], person[1], 3.4, Z + 28, 7, P, 20), { tone: "hi" }));
  const board = { x: person[0] - 9, y: person[1] + 4, w: 7, d: 1.4, r: 0.3 };
  out.push(S(k.slabOf(board, Z + 18, 9, P, 2), { tone: "hi", crease: "lo" }));
  for (const dz of [21, 23.5]) out.push(L(k.segment([board.x + 1, board.y + board.d, Z + dz], [board.x + board.w - 1, board.y + board.d, Z + dz], P), { tone: "lo", free: true }));
  // Máquina: cuerpo, seam de la tapa, dos diales en el frente, rejilla de tres ranuras cerradas, mástil y domo de la lámpara.
  out.push(S(k.slabOf(MACHINE, Z, 36, P, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(MACHINE, Z + 30, P, 3), { tone: "faint" }) }));
  const front = MACHINE.y + MACHINE.d;
  for (const dx of [8, 20]) {
    out.push(L(k.sideRing([MACHINE.x + dx, front, Z + 22], 3, "y", P, 16), { tone: "lo" }));
    out.push(D([at([MACHINE.x + dx, front, Z + 22])], { size: 0.4 }));
  }
  for (const dz of [8, 11, 14]) out.push(L(faceRectY(MACHINE.x + 6, MACHINE.x + MACHINE.w - 6, front, Z + dz, Z + dz + 1.2), { tone: "faint" }));
  out.push(S(k.cylinder(LAMP_AT[0], LAMP_AT[1], 1.4, Z + 36, 8, P, 12), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(LAMP_AT[0], LAMP_AT[1], 3.2, Z + 44, 1.6, P, 16), { tone: "mid" }));
  out.push(S(k.cylinder(LAMP_AT[0], LAMP_AT[1], 2.4, Z + 45.6, 3.2, P, 16), { tone: "hi", crease: "none" }));
  // Rampa del mostrador a la banda: lámina apoyada en el mostrador y en el larguero trasero, con dos guías.
  const ramp = [[COUNTER.x + 10, COUNTER.y + COUNTER.d], [COUNTER.x + 22, COUNTER.y + COUNTER.d], [COUNTER.x + 22, G.BELT.y - 3], [COUNTER.x + 10, G.BELT.y - 3]];
  out.push(S(k.extrude(ramp, Z + 2, 1.6, P), { tone: "mid", crease: "none" }));
  out.push(L(k.onTop([[COUNTER.x + 11.5, COUNTER.y + COUNTER.d], [COUNTER.x + 11.5, G.BELT.y - 3]], Z + 3.6, P) + k.onTop([[COUNTER.x + 20.5, COUNTER.y + COUNTER.d], [COUNTER.x + 20.5, G.BELT.y - 3]], Z + 3.6, P), { tone: "lo" }));
  return out.join("");
}
// La lámpara de estado: el punto que se enciende sobre el domo (móvil: opacidad).
export function lamp() {
  return D([at([LAMP_AT[0], LAMP_AT[1], Z + 48.8])], { size: 1.5, tone: "green" });
}

// ---------- Estación 1: entender ----------
// Un atril con un pupitre de lectura, una grabadora, un cuaderno abierto y un
// taburete. Sobre la banda, una lupa cuelga de un brazo y baja sobre la pieza.
const S1 = STATION_X[1];
function station1Back() {
  const out = [];
  const col = [S1 - 18, -80];
  out.push(S(k.cylinder(col[0], col[1], 8, Z, 1.5, P, 24), { tone: "lo" }));
  out.push(S(k.cylinder(col[0], col[1], 4, Z + 1.5, 28.5, P, 20), { tone: "mid", crease: "none" }));
  out.push(L(k.sideArc(col[0], col[1], 4, Z + 20, P, 12), { tone: "faint" }));
  const desk = { x: S1 - 30, y: -90, w: 24, d: 18, r: 1 };
  out.push(S(k.slabOf(desk, Z + 30, 2, P, 3, 0.4), { tone: "hi" }));
  out.push(L(k.planOutline(k.insetPlan(desk, 2), Z + 32, P, 3), { tone: "lo" }));
  for (const dy of [5.5, 8.5, 11.5]) out.push(L(k.lineOnTop([desk.x + 2, desk.y + dy], [desk.x + desk.w - 2, desk.y + dy], Z + 32, P), { tone: "faint" }));
  // Grabadora: caja, seam, dos carretes y un botón.
  const rec = { x: S1 + 6, y: -96, w: 14, d: 9, r: 1 };
  out.push(S(k.slabOf(rec, Z, 5, P, 3, 0.4), { tone: "mid", inner: L(k.sideSeam(rec, Z + 1.5, P, 3), { tone: "faint" }) }));
  for (const dx of [4, 10]) {
    out.push(L(k.ring(rec.x + dx, rec.y + 4.5, 2, Z + 5, P, 14), { tone: "lo" }));
    out.push(D([at([rec.x + dx, rec.y + 4.5, Z + 5])], { size: 0.4 }));
  }
  out.push(S(k.cylinder(rec.x + 7, rec.y + 1.8, 0.8, Z + 5, 0.8, P, 10), { tone: "hi", crease: "none" }));
  // Cuaderno abierto: dos páginas con lomo y tres renglones cada una.
  const book = { x: S1 + 2, y: -76, w: 16, d: 12, r: 0.6 };
  out.push(S(k.slabOf(book, Z, 1.2, P, 3), { tone: "hi", crease: "lo" }));
  out.push(L(k.lineOnTop([book.x + 8, book.y + 1], [book.x + 8, book.y + book.d - 1], Z + 1.2, P), { tone: "lo" }));
  for (const dy of [3, 5.5, 8]) out.push(L(k.lineOnTop([book.x + 2, book.y + dy], [book.x + 6.5, book.y + dy], Z + 1.2, P) + k.lineOnTop([book.x + 9.5, book.y + dy], [book.x + 14, book.y + dy], Z + 1.2, P), { tone: "lo", free: true }));
  // Taburete: base, columna, asiento.
  const stool = [S1 + 30, -66];
  out.push(S(k.cylinder(stool[0], stool[1], 6, Z, 1.2, P, 24), { tone: "lo" }));
  out.push(S(k.cylinder(stool[0], stool[1], 1.6, Z + 1.2, 12, P, 12), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(stool[0], stool[1], 6, Z + 13.2, 2.2, P, 24), { tone: "mid" }));
  // Poste del brazo de la lupa.
  out.push(post(S1, POST_Y, 2.2, 56));
  return out.join("");
}
function station1Front() {
  const out = [];
  const beam = { x: S1 - 1.5, y: POST_Y - 1.5, w: 3, d: 24.5, r: 0.8 };
  out.push(S(k.slabOf(beam, 56, 3, P, 2, 0.3), { tone: "mid" }));
  out.push(D([at([S1, POST_Y, 59]), at([S1, -9, 59])], { size: 0.45 }));
  // Varilla fija por la que desliza la lupa (de 32 a 56).
  out.push(S(k.cylinder(S1, -10, 1.2, 32, 24, P, 12), { tone: "mid", crease: "none" }));
  return out.join("");
}
// La lupa: aro, cristal, mango y collar sobre la varilla. Baja con translateAlong [0,0,-14·a].
export function lens() {
  return S(k.cylinder(S1, -10, 2.2, 44.5, 3, P, 14), { tone: "mid" }) +
    S(k.slabOf({ x: S1 - 1.2, y: -11.5, w: 2.4, d: 5, r: 0.6 }, 45, 1.6, P, 2), { tone: "mid", crease: "none" }) +
    S(k.cylinder(S1, 0, 7, 44, 2, P, 32), { tone: "mid" }) +
    S(k.cylinder(S1, 0, 5.6, 46, 0.6, P, 32), { tone: "hi", crease: "none" });
}

// ---------- Estación 2: diseñar ----------
// Una mesa de dibujo con tres planos enrollados, una hoja abierta con cuadrícula,
// una escuadra y una lámpara de brazo. Sobre la banda, un carrete desenrolla un plano.
const S2 = STATION_X[2];
export const SHEET = { cx: S2, z: BELT_TOP + 30 };
function station2Back() {
  const out = [];
  const top = { x: S2 - 36, y: -104, w: 76, d: 48, r: 2 };
  for (const [x, y] of G.byDepth([[top.x + 5, top.y + 5], [top.x + top.w - 5, top.y + 5], [top.x + 5, top.y + top.d - 5], [top.x + top.w - 5, top.y + top.d - 5]])) {
    out.push(S(k.cylinder(x, y, 2.2, Z, 22, P, 14), { tone: "mid", crease: "none" }));
  }
  out.push(S(k.slabOf(top, Z + 22, 3, P, 3, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(top, 3), Z + 25, P, 3), { tone: "faint" }));
  // Tres planos enrollados.
  for (let i = 0; i < 3; i++) {
    const roll = { x: S2 - 30 + i * 12, y: -100, w: 9, d: 20, r: 2 };
    out.push(S(k.slabOf(roll, Z + 25, 4, P, 4), { tone: "hi", crease: "lo", inner: L(k.sideSeam(roll, Z + 27, P, 4), { tone: "faint" }) }));
  }
  // Hoja abierta con marco y cuadrícula (las líneas terminan en el marco).
  const sheet = { x: S2 - 28, y: -78, w: 30, d: 20, r: 0.5 };
  out.push(S(k.slabOf(sheet, Z + 25, 0.6, P, 3), { tone: "hi", crease: "lo" }));
  const frame = k.insetPlan(sheet, 2);
  out.push(L(k.planOutline(frame, Z + 25.6, P, 2), { tone: "lo" }));
  for (const dy of [5.5, 11]) out.push(L(k.lineOnTop([frame.x, frame.y + dy], [frame.x + frame.w, frame.y + dy], Z + 25.6, P), { tone: "faint" }));
  for (const dx of [8.5, 17]) out.push(L(k.lineOnTop([frame.x + dx, frame.y], [frame.x + dx, frame.y + frame.d], Z + 25.6, P), { tone: "faint" }));
  // Escuadra.
  out.push(S(k.extrude([[S2 + 6, -72], [S2 + 26, -72], [S2 + 6, -58]], Z + 25, 0.8, P), { tone: "mid", crease: "none" }));
  out.push(L(k.onTop([[S2 + 9, -69.5], [S2 + 20, -69.5], [S2 + 9, -61.5]], Z + 25.8, P, true), { tone: "lo" }));
  // Lámpara de brazo.
  const lamp = [S2 + 32, -98];
  out.push(S(k.cylinder(lamp[0], lamp[1], 4, Z + 25, 1.5, P, 20), { tone: "lo" }));
  out.push(S(k.cylinder(lamp[0], lamp[1], 1, Z + 26.5, 18, P, 10), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf({ x: lamp[0] - 10, y: lamp[1] - 4, w: 12, d: 8, r: 2 }, Z + 44.5, 3, P, 4, 0.4), { tone: "mid" }));
  // Poste del carrete.
  out.push(post(S2, POST_Y, 2, 50));
  return out.join("");
}
function station2Front() {
  const out = [];
  const beam = { x: S2 - 1.5, y: POST_Y - 1.5, w: 3, d: 36, r: 0.8 };
  out.push(S(k.slabOf(beam, 50, 3, P, 2, 0.3), { tone: "mid" }));
  out.push(D([at([S2, POST_Y, 53]), at([S2, 2, 53])], { size: 0.45 }));
  // Soporte y carrete colgando del brazo, sobre la banda.
  out.push(S(k.slabOf({ x: S2 - 1.5, y: -3.5, w: 3, d: 3, r: 0.5 }, 45, 5, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(S2, -2, 4, 41, 4, P, 24), { tone: "mid" }));
  out.push(L(k.knurl(S2, -2, 4, 41, 45, 20, P), { tone: "lo" }));
  return out.join("");
}
// El plano que se desenrolla desde el carrete hacia la pieza (se reconstruye por frame).
export function sheetAt(t) {
  const w = 8 + 52 * t;
  const plan = { x: SHEET.cx + 4 - w, y: -9, w, d: 18, r: 0.6 };
  let out = solidSvg(slabOf(plan, SHEET.z, 0.8, P, 3), { tone: "hi", crease: "lo" });
  if (t > 0.5) for (const dy of [5, 9, 13]) out += lineSvg(lineOnTop([plan.x + 3, plan.y + dy], [plan.x + plan.w - 3, plan.y + dy], SHEET.z + 0.8, P), { tone: "lo", free: true });
  return out;
}

// ---------- Estación 3: construir ----------
// Un banco con cajón y tornillo de banco, y un medidor de pruebas con zona verde.
// Sobre la banda, una prensa de dos columnas baja un pistón sobre la pieza.
const S3 = STATION_X[3];
export const GAUGE = { cx: S3 + 30, cy: -56, z: Z + 10, r: 8.5 };
function station3Back() {
  const out = [];
  const bench = { x: S3 - 42, y: -110, w: 84, d: 40, r: 2 };
  out.push(S(k.slabOf(bench, Z, 24, P, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(bench, Z + 20, P, 3), { tone: "faint" }) }));
  const front = bench.y + bench.d;
  out.push(L(faceRectY(S3 - 30, S3 - 6, front, Z + 6, Z + 16), { tone: "lo" }));
  out.push(S(k.slabOf({ x: S3 - 21, y: front, w: 6, d: 1.5, r: 0.5 }, Z + 10.5, 1.5, P, 2), { tone: "hi", crease: "none" }));
  out.push(D(k.corners(bench, 4).map(([x, y]) => at([x, y, Z + 24])), { size: 0.42 }));
  // Tornillo de banco: dos mordazas, husillo con mango moleteado.
  for (const dx of [-36, -28]) out.push(S(k.slabOf({ x: S3 + dx, y: -96, w: 5, d: 10, r: 0.6 }, Z + 24, 8, P, 2, 0.3), { tone: "hi", crease: "lo" }));
  out.push(S(k.cylinder(S3 - 25, -91, 1.4, Z + 32, 6, P, 12), { tone: "mid", crease: "none" }));
  out.push(L(k.knurl(S3 - 25, -91, 1.4, Z + 32, Z + 38, 10, P), { tone: "lo" }));
  // Medidor de pruebas: carcasa, bisel, ticks, zona verde, texto.
  const g = GAUGE;
  out.push(S(k.cylinder(g.cx, g.cy, 11, Z, 10, P, 56, 0.6), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(g.cx, g.cy, 11, Z + 7, Z + 10, 60, P, 0.3), { tone: "lo" }));
  out.push(L(k.ring(g.cx, g.cy, 9.6, g.z, P, 56), { tone: "lo" }));
  const ticks = k.radialTicks(g.cx, g.cy, g.r, 30, 5, g.z, [1, 2], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  const green = k.radialTicks(g.cx, g.cy, g.r, 4, 1, g.z + 0.1, [2.4, 2.4], P, 0, Math.PI / 6);
  out.push(L(green.major, { tone: "green" }));
  out.push(L(k.ring(g.cx, g.cy, 1.4, g.z, P, 12), { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([g.cx, g.cy + 5.5], g.z, P, "x"), "OK", { size: 2.2, tone: "lo", anchor: "middle" }));
  // Columnas de la prensa.
  out.push(post(S3 - 18, POST_Y, 3, 64), post(S3 + 18, POST_Y, 3, 64));
  return out.join("");
}
function station3Front() {
  const out = [];
  out.push(S(k.slabOf({ x: S3 - 22, y: POST_Y - 4, w: 44, d: 8, r: 2 }, 64, 10, P, 3, 0.6), { tone: "mid" }));
  out.push(D([[-18, -2], [18, -2], [-18, 2], [18, 2]].map(([dx, dy]) => at([S3 + dx, POST_Y + dy, 74])), { size: 0.45 }));
  // Voladizo sobre la banda, con volante y husillo encima.
  out.push(S(k.slabOf({ x: S3 - 6, y: POST_Y - 1, w: 12, d: 39, r: 1.5 }, 66, 6, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(S3, 0, 5, 72, 2.5, P, 28), { tone: "mid" }));
  out.push(L(k.knurl(S3, 0, 5, 72, 74.5, 30, P), { tone: "lo" }));
  out.push(S(k.cylinder(S3, 0, 2, 74.5, 6, P, 14), { tone: "mid", crease: "none" }));
  // Vástago fijo bajo el voladizo (44 → 66); el pistón lleva su propio tramo.
  out.push(S(k.cylinder(S3, 0, 2.2, 44, 22, P, 14), { tone: "mid", crease: "none" }));
  return out.join("");
}
// El pistón con su tramo de vástago. Baja con translateAlong [0,0,-16·a].
export function press() {
  return S(k.cylinder(S3, 0, 2.2, 44, 16, P, 14), { tone: "mid", crease: "none" }) +
    S(k.slabOf({ x: S3 - 10, y: -8, w: 20, d: 16, r: 1.5 }, 38, 6, P, 3, 0.5), { tone: "mid", crease: "lo" }) +
    L(k.planOutline({ x: S3 - 7, y: -5, w: 14, d: 10, r: 1 }, 44, P, 3), { tone: "faint" });
}
export function needleAt(t) {
  const a = (-120 + 150 * t) * Math.PI / 180;
  return lineOnTop([GAUGE.cx - Math.sin(a) * 1.5, GAUGE.cy + Math.cos(a) * 1.5], [GAUGE.cx + Math.sin(a) * (GAUGE.r - 1), GAUGE.cy - Math.cos(a) * (GAUGE.r - 1)], GAUGE.z + 0.2, P);
}

// ---------- Estación 4: desplegar ----------
// Un rack con puerta corrediza, un monitor y un teléfono conectados por cable.
// Sobre la banda, un arco de despacho con un sensor.
const S4 = STATION_X[4];
const RACK = { x: S4 - 20, y: -112, w: 40, d: 30, r: 2 };
const RACK_FRONT = RACK.y + RACK.d;
const LEDS = [[S4 - 14, RACK_FRONT, Z + 50], [S4 - 10, RACK_FRONT, Z + 50]];
function station4Back() {
  const out = [];
  out.push(S(k.slabOf(RACK, Z, 54, P, 3, 0.8), { tone: "mid", inner: [8, 16, 24, 32, 40, 48].map((dz) => L(k.sideSeam(RACK, Z + dz, P, 3), { tone: "faint" })).join("") }));
  out.push(D(LEDS.map((p) => at(p)), { size: 0.45, tone: "lo" }));
  // Riel superior de la puerta corrediza.
  out.push(S(k.slabOf({ x: RACK.x, y: RACK_FRONT - 0.5, w: 72, d: 2.5, r: 0.5 }, Z + 54, 1.5, P, 2), { tone: "mid", crease: "none" }));
  // Monitor: base, cuello, pantalla con bisel.
  const mon = { x: S4 - 38, y: -67, w: 20, d: 2, r: 0.5 };
  out.push(S(k.cylinder(S4 - 28, -66, 4, Z, 1.5, P, 20), { tone: "lo" }));
  out.push(S(k.cylinder(S4 - 28, -66, 1.2, Z + 1.5, 8, P, 10), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf(mon, Z + 9.5, 14, P, 2, 0.3), { tone: "hi" }));
  out.push(L(faceRectY(mon.x + 1.5, mon.x + mon.w - 1.5, mon.y + mon.d, Z + 11, Z + 22), { tone: "lo" }));
  // Teléfono de pie con pantalla y botón.
  const phone = { x: S4 + 28, y: -84, w: 7, d: 12, r: 1 };
  out.push(S(k.slabOf(phone, Z, 14, P, 3, 0.3), { tone: "hi" }));
  out.push(L(faceRectY(phone.x + 1, phone.x + phone.w - 1, phone.y + phone.d, Z + 2.5, Z + 12), { tone: "lo" }));
  out.push(D([at([phone.x + 3.5, phone.y + phone.d, Z + 1.3])], { size: 0.35 }));
  // Cables por el suelo de la plataforma: del rack al monitor y al teléfono.
  out.push(k.wireSvg(at([S4 - 16, RACK_FRONT, Z + 2]), at([S4 - 30, -70, Z + 1]), { via: [at([S4 - 16, -76, Z]), at([S4 - 30, -76, Z])], tone: "lo", size: 1 }));
  out.push(k.wireSvg(at([S4 + 16, RACK_FRONT, Z + 2]), at([phone.x, -78, Z + 1]), { via: [at([S4 + 16, -78, Z])], tone: "lo", size: 1 }));
  // Postes del arco.
  out.push(post(S4 - 14, POST_Y, 2, 44), post(S4 + 14, POST_Y, 2, 44));
  return out.join("");
}
function station4Front() {
  const out = [];
  out.push(S(k.slabOf({ x: S4 - 16, y: POST_Y - 1.5, w: 32, d: 3, r: 0.8 }, 44, 4, P, 2, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: S4 - 1.5, y: POST_Y - 1.5, w: 3, d: 35, r: 0.8 }, 44, 4, P, 2, 0.3), { tone: "mid" }));
  out.push(D([at([S4 - 14, POST_Y, 48]), at([S4 + 14, POST_Y, 48])], { size: 0.45 }));
  out.push(S(k.cylinder(S4, 0, 2.5, 40, 4, P, 14), { tone: "mid" }));
  out.push(L(k.ring(S4, 0, 1.4, 48, P, 10), { tone: "lo" }));
  return out.join("");
}
// La puerta corrediza, construida ABIERTA (desplazada +30 en x). Cierra con translateAlong [-30·a,0,0].
export function door() {
  const panel = { x: RACK.x + 30, y: RACK_FRONT - 0.5, w: 40, d: 1.5, r: 0.4 };
  return S(k.slabOf(panel, Z, 54, P, 2, 0.3), { tone: "mid", inner: L(k.sideSeam(panel, Z + 27, P, 2), { tone: "faint" }) }) +
    S(k.slabOf({ x: panel.x + 2.5, y: panel.y + panel.d, w: 1.6, d: 1.4, r: 0.3 }, Z + 22, 10, P, 2), { tone: "hi", crease: "none" });
}
// Los LEDs encendidos (móvil: opacidad).
export function led() {
  return D(LEDS.map(([x, y, z]) => at([x, y + 0.2, z])), { size: 0.55, tone: "green" });
}

// ---------- Estación 5: operar y mejorar ----------
// Una sala de control: consola con panel de tres pantallas y botones, un dial de
// métricas y una silla. Sobre los postes, un tablero elevado con tres barras.
const S5 = STATION_X[5];
export const DIAL = { cx: S5 + 30, cy: -56, z: Z + 4, r: 10 };
function station5Back() {
  const out = [];
  const console_ = { x: S5 - 44, y: -100, w: 88, d: 30, r: 2 };
  out.push(S(k.slabOf(console_, Z, 18, P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(console_, Z + 3, P, 3), { tone: "faint" }) }));
  const panel = { x: S5 - 40, y: -100, w: 80, d: 8, r: 1 };
  out.push(S(k.slabOf(panel, Z + 18, 10, P, 3, 0.4), { tone: "mid" }));
  const pf = panel.y + panel.d;
  for (const [x0, x1] of [[S5 - 36, S5 - 16], [S5 - 10, S5 + 10], [S5 + 16, S5 + 36]]) {
    out.push(L(faceRectY(x0, x1, pf, Z + 20, Z + 26), { tone: "lo" }));
    out.push(L(k.segment([x0, pf, Z + 23], [x1, pf, Z + 23], P), { tone: "faint" }));
  }
  for (let i = 0; i < 6; i++) out.push(S(k.cylinder(S5 - 30 + i * 8, -76, 1.6, Z + 18, 1.2, P, 10), { tone: "hi", crease: "none" }));
  // Dial de métricas.
  const d = DIAL;
  out.push(S(k.cylinder(d.cx, d.cy, 12, Z, 4, P, 56, 0.6), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(d.cx, d.cy, 12, Z + 2, Z + 4, 60, P, 0.3), { tone: "lo" }));
  out.push(L(k.ring(d.cx, d.cy, 10.8, d.z, P, 56), { tone: "lo" }));
  const ticks = k.radialTicks(d.cx, d.cy, d.r, 40, 5, d.z, [1, 2], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.ring(d.cx, d.cy, 1.6, d.z, P, 12), { tone: "mid" }));
  // Silla: base, columna, asiento, respaldo.
  const chair = [S5 - 10, -56];
  out.push(S(k.cylinder(chair[0], chair[1], 6, Z, 1.2, P, 24), { tone: "lo" }));
  out.push(S(k.cylinder(chair[0], chair[1], 1.6, Z + 1.2, 10, P, 12), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(chair[0], chair[1], 6, Z + 11.2, 2.5, P, 24), { tone: "mid" }));
  out.push(S(k.slabOf({ x: chair[0] - 6, y: chair[1] + 4, w: 12, d: 2, r: 0.8 }, Z + 13.7, 10, P, 3, 0.3), { tone: "mid" }));
  // Postes del tablero.
  out.push(post(S5 - 16, POST_Y, 2, 58), post(S5 + 16, POST_Y, 2, 58));
  return out.join("");
}
function station5Front() {
  const out = [];
  const board = { x: S5 - 20, y: POST_Y - 1, w: 40, d: 2, r: 1 };
  out.push(S(k.slabOf(board, 58, 22, P, 3, 0.4), { tone: "mid" }));
  const bf = board.y + board.d;
  out.push(L(faceRectY(board.x + 2, board.x + board.w - 2, bf, 60, 78), { tone: "lo" }));
  for (const dz of [65, 70, 75]) out.push(L(k.segment([board.x + 2, bf, dz], [board.x + board.w - 2, bf, dz], P), { tone: "faint" }));
  out.push(D([at([S5 - 16, POST_Y, 80]), at([S5 + 16, POST_Y, 80])], { size: 0.45 }));
  return out.join("");
}
export function meterAt(t) {
  const a = (-130 + 200 * t) * Math.PI / 180;
  return lineOnTop([DIAL.cx - Math.sin(a) * 2, DIAL.cy + Math.cos(a) * 2], [DIAL.cx + Math.sin(a) * (DIAL.r - 1.5), DIAL.cy - Math.cos(a) * (DIAL.r - 1.5)], DIAL.z + 0.2, P);
}

// ---------- Línea de retorno ----------
// Un riel elevado sobre las plataformas, de la sala de control al campo, sobre
// cuatro postes con ménsula. El punto que vuelve recorre su cara superior.
const RAIL_Y = -60;
const RAIL_POSTS = [STATION_X[0] - 44, STATION_X[2] - 44, STATION_X[4] - 44, STATION_X[5] + 44];
function returnRail() {
  const out = [];
  for (const x of RAIL_POSTS) {
    out.push(S(k.cylinder(x, RAIL_Y, 3.2, Z, 1.2, P, 16), { tone: "lo" }));
    out.push(S(k.cylinder(x, RAIL_Y, 1.8, Z + 1.2, RAIL_Z - 4 - Z - 1.2, P, 12), { tone: "mid", crease: "none" }));
    out.push(S(k.slabOf({ x: x - 3, y: RAIL_Y - 3, w: 6, d: 6, r: 1 }, RAIL_Z - 4, 4, P, 2, 0.3), { tone: "mid" }));
  }
  out.push(S(k.slabOf({ x: RAIL_POSTS[0] - 6, y: RAIL_Y - 1.5, w: RAIL_POSTS[3] - RAIL_POSTS[0] + 12, d: 3, r: 0.8 }, RAIL_Z, 2.4, P, 2, 0.3), { tone: "mid" }));
  out.push(L(k.lineOnTop([RAIL_POSTS[0] - 6, RAIL_Y], [RAIL_POSTS[3] + 6, RAIL_Y], RAIL_Z + 2.4, P), { tone: "faint" }));
  out.push(D(RAIL_POSTS.map((x) => at([x, RAIL_Y, RAIL_Z + 2.4])), { size: 0.45 }));
  return out.join("");
}
// El punto que vuelve por el riel. Se mueve con translateAlong [-(X5-X0)·t,0,0].
export function runner() {
  return D([at([STATION_X[5], RAIL_Y, RAIL_Z + 2.6])], { size: 1, tone: "hi" });
}

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
  ].sort((a, b) => k.depthOf([a.x, POST_Y, 0], P) - k.depthOf([b.x, POST_Y, 0], P));
  return { back: [...backParts.map((p) => p.svg), returnRail()], front: frontParts.map((p) => p.svg) };
}
