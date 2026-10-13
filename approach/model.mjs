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

// Reproducción de una fase a su ritmo: el scroll elige la fase y la figura avanza
// hacia ella a PHASE_RATE pasos por segundo (también hacia atrás), sin pasarse.
export const PHASE_RATE = 0.75;
export function advance(shown, target, dt, rate = PHASE_RATE) {
  const delta = target - shown;
  const most = rate * (Number.isFinite(dt) ? Math.max(0, dt) : 0);
  if (Math.abs(delta) <= most) return target;
  return shown + Math.sign(delta) * most;
}

// Estímulos: eventos de una sola vez que se disparan cuando la acción de una
// estación cruza su umbral hacia delante. Cada uno vive `life` segundos y se
// dibuja con `particlesOf(name, age)` en coordenadas del mundo.
export const EVENTS = {
  lamp: { station: 0, at: 0.9, life: 0.9 },
  glint: { station: 1, at: 0.9, life: 0.55 },
  motes: { station: 2, at: 0.6, life: 1.1 },
  sparks: { station: 3, at: 0.9, life: 0.6 },
  gauge: { station: 3, at: 0.98, life: 0.7 },
  confetti: { station: 4, at: 0.9, life: 1.6 },
  pulse: { station: 5, at: 0.9, life: 1.0 },
  finale: { station: 5, at: 0.97, life: 1.8 },
};
const CONFETTI_PIECES = 22;
export function eventsAt(before, after) {
  return Object.keys(EVENTS).filter((name) => {
    const { station, at } = EVENTS[name];
    return before[station] < at && after[station] >= at;
  });
}
// Puntos del mundo donde ocurre cada estímulo (derivados de la geometría de las estaciones).
const LAMP = [STATION_X[0] + 23, -96, 56];
const LENS = [STATION_X[1], 0, 32.5];
const SHEET_AT = [STATION_X[2] - 10, -2, 32.8];
const PISTON = [STATION_X[3], 0, 22];
const GAUGE_AT = [STATION_X[3] + 30, -56, 18.3];
const CRATE = [STATION_X[4], 0, 18];
const GLOW = [STATION_X[5], 0, 11.4];
const RAIL = { y: -60, z: 80.6, from: STATION_X[5], to: STATION_X[0] };

// PRNG determinista (mulberry32) para que cada partícula sea estable entre frames.
const random = (seed) => {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const fadeOut = (u, from = 0.7) => 1 - smoothstep(from, 1, u);

export function particlesOf(name, age) {
  const spec = EVENTS[name];
  if (!spec || !(age >= 0) || age > spec.life) return [];
  const u = age / spec.life;
  const out = [];
  if (name === "lamp") {
    out.push({ kind: "ring", at: LAMP, r: 2 + 12 * easeInOut(u), alpha: 0.9 * fadeOut(u, 0.3), tone: "lit" });
  } else if (name === "glint") {
    out.push({ kind: "ring", at: LENS, r: 1 + 7 * easeInOut(u), alpha: 0.8 * fadeOut(u, 0.2), tone: "hi" });
  } else if (name === "motes") {
    for (let i = 0; i < 3; i++) {
      const rnd = random(11 + i);
      const x = SHEET_AT[0] - 18 + 36 * rnd(), y = SHEET_AT[1] - 6 + 12 * rnd();
      const delay = 0.12 * i;
      const v = clamp((u - delay) / (1 - delay), 0, 1);
      out.push({ kind: "dot", at: [x + 3 * Math.sin(v * 6 + i), y, SHEET_AT[2] + 14 * v], r: 0.7, alpha: 0.9 * smoothstep(0, 0.15, v) * fadeOut(v, 0.5), tone: "hi" });
    }
  } else if (name === "sparks") {
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + 0.4;
      const dist = 2 + 10 * (1 - Math.pow(1 - u, 2));
      const dir = [Math.cos(angle), Math.sin(angle), 0];
      out.push({ kind: "seg", at: [PISTON[0] + dir[0] * dist, PISTON[1] + dir[1] * dist, PISTON[2] + 1.5 - 4 * u * u], dir, len: 2.2 * (1 - 0.5 * u), alpha: fadeOut(u, 0.4), tone: "lit" });
    }
  } else if (name === "gauge") {
    out.push({ kind: "ring", at: GAUGE_AT, r: 9.6 + 4 * easeInOut(u), alpha: 0.8 * fadeOut(u, 0.3), tone: "lit" });
  } else if (name === "confetti" || name === "finale") {
    // Confeti sobre la caja sellada (y, como cierre, sobre el punto luminoso): sale
    // hacia arriba, cae con gravedad hasta la tapa, deriva y gira.
    const origin = name === "confetti" ? CRATE : [GLOW[0], GLOW[1], GLOW[2] + 1];
    for (let i = 0; i < CONFETTI_PIECES; i++) {
      const rnd = random(101 + i);
      const x0 = origin[0] - 9 + 18 * rnd(), y0 = origin[1] - 7 + 14 * rnd();
      const vz = 12 + 18 * rnd(), drift = -5 + 10 * rnd(), spin = 2 + 5 * rnd();
      const t = age;
      const z = Math.max(origin[2], origin[2] + 20 + vz * t - 40 * t * t);
      const a = spin * t + i;
      out.push({ kind: "seg", at: [x0 + drift * t, y0 + 2 * Math.sin(a), z], dir: [Math.cos(a), Math.sin(a), 0.3 * Math.sin(a * 1.3)], len: 3.2, alpha: fadeOut(u, 0.6), tone: ["lit", "hi", "mid"][i % 3] });
    }
  } else if (name === "pulse") {
    const beat = Math.pow(Math.sin(u * Math.PI * 2), 2);
    out.push({ kind: "ring", at: GLOW, r: 5 + 9 * u, alpha: 0.9 * beat * fadeOut(u, 0.5), tone: "lit" });
  }
  return out;
}
// Estela detrás del punto de retorno mientras recorre el riel (en ambos sentidos).
export function trailOf(returnT) {
  if (!(returnT > 0 && returnT < 1)) return [];
  const out = [];
  for (let k = 1; k <= 6; k++) {
    const t = returnT - k * 0.035;
    if (t < 0) break;
    out.push({ kind: "dot", at: [RAIL.from + (RAIL.to - RAIL.from) * t, RAIL.y, RAIL.z], r: 0.8 - k * 0.08, alpha: 0.7 * (1 - k / 7), tone: "hi" });
  }
  return out;
}

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
