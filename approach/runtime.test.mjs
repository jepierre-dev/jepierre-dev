import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ANAT = join(process.env.USERPROFILE || process.env.HOME, ".claude", "skills", "anatomy");
function drive(actions) {
  const file = join(mkdtempSync(join(tmpdir(), "approach-")), "actions.json");
  writeFileSync(file, JSON.stringify(actions));
  try {
    return execFileSync(process.execPath, [join(ANAT, "scripts", "drive.mjs"), "approach/preview.html", "--actions", file], { encoding: "utf8" });
  } catch (error) {
    return `${error.stdout || ""}\n${error.stderr || ""}`;
  }
}

test("update mueve la pieza, acciona mecanismos y expone data-step", () => {
  const out = drive([
    ["wait", 600],
    ["eval", "window.__approach.update({ progress: 0, paused: true }); 'A:' + document.querySelector('[data-part=piece]').getAttribute('transform')"],
    ["eval", "window.__approach.update({ progress: 3.9, paused: true }); 'B:' + document.querySelector('[data-part=piece]').getAttribute('transform')"],
    ["eval", "'C:' + document.querySelector('.approach-figure').dataset.step"],
    ["eval", "'D:' + (Number(document.querySelector('[data-form=\"3\"]').getAttribute('opacity')) > 0.8)"],
    ["eval", "'E:' + document.querySelector('[data-part=press]').getAttribute('transform')"],
    ["eval", "window.__approach.update({ progress: 6, paused: true }); 'F:' + document.querySelector('[data-part=runner]').getAttribute('transform')"],
    ["eval", "window.__approach.update({ progress: 6, paused: true }); 'H:' + document.querySelector('svg').getAttribute('viewBox')"],
    ["eval", "window.__approach.update({ progress: 2, paused: false }); window.__approach.setNarrow(true); 'G:' + document.querySelector('svg').getAttribute('viewBox')"],
    ["eval", "window.__approach.update({ progress: 6, paused: true }); window.__approach.update({ progress: 6, paused: false }); window.__approach.setNarrow(false); 'I:' + document.querySelector('svg').getAttribute('viewBox')"],
  ]);
  assert.match(out, /A:translate\(0 0\)/, `en p=0 la pieza está en reposo\n${out}`);
  const moved = out.match(/B:translate\((-?[\d.]+) (-?[\d.]+)\)/);
  assert.ok(moved && Number(moved[1]) > 100, `en p=3.9 la pieza se desplazó\n${out}`);
  assert.match(out, /C:3\b/, "data-step=3 en p=3.9");
  assert.match(out, /D:true/, "la forma 3 es visible al final del paso 3");
  const press = out.match(/E:translate\((-?[\d.]+) (-?[\d.]+)\)/);
  assert.ok(press && Number(press[2]) > 1, `la prensa bajó en p=3.9\n${out}`);
  const runner = out.match(/F:translate\((-?[\d.]+) (-?[\d.]+)\)/);
  assert.ok(runner && Number(runner[1]) < -100, `el punto volvió por el riel en p=6\n${out}`);
  const full = out.match(/H:(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+)/);
  assert.ok(full && Number(full[3]) === 1240, `en pausa se ve la línea entera\n${out}`);
  const box = out.match(/G:(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+)/);
  assert.ok(box, `viewBox escrito\n${out}`);
  assert.ok(Number(box[3]) < 1240 * 0.5, `viewBox estrecho en modo narrow: ${box[3]}`);
  // La cámara se centra en la pieza también en Y: al final de la línea (abajo a la
  // derecha del dibujo) la ventana baja y es más baja que el dibujo entero.
  const end = out.match(/I:(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+)/);
  assert.ok(end, `viewBox final escrito\n${out}`);
  assert.ok(Number(end[2]) > 20, `la ventana baja hacia la pieza en Y: y=${end[2]}`);
  assert.ok(Number(end[4]) < 520, `la ventana es más baja que el dibujo: h=${end[4]}`);
  assert.ok(Math.abs(Number(end[3]) / Number(end[4]) - 16 / 9) < 0.02, `ventana 16:9 en escritorio: ${end[3]}×${end[4]}`);
});
