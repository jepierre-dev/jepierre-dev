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
