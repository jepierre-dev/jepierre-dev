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

test("advance reproduce una fase a velocidad limitada, llega al objetivo y es simétrico", async () => {
  const { advance, PHASE_RATE } = await import("./model.mjs");
  assert.ok(PHASE_RATE > 0.5 && PHASE_RATE < 1.2, "una fase dura entre ~0.8 y 2 s");
  near(advance(0, 1, 0.1), PHASE_RATE * 0.1);
  near(advance(1, 0, 0.1), 1 - PHASE_RATE * 0.1);
  assert.equal(advance(0.9, 1, 10), 1, "no se pasa del objetivo");
  assert.equal(advance(3, 3, 0.016), 3);
  let shown = 0;
  for (let t = 0; t < 10; t += 1 / 60) shown = advance(shown, 4, 1 / 60);
  assert.equal(shown, 4, "llega en menos de 10 s");
  assert.ok(Number.isFinite(advance(0, 6, NaN)), "dt inválido no produce NaN");
});
