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
