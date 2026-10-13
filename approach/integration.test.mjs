// Forma de la integración en index.html que la revisión final exigió y que
// ningún test de comportamiento puede ver sin un navegador sin JS.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync("index.html", "utf8");

test("el módulo de la figura se pide antes de esperar a la escena 3D (no encadenado tras el CDN)", () => {
  const figureImport = html.indexOf("import('./approach-figure.js')");
  const sceneAwait = html.indexOf("await import('./scene.js')");
  assert.ok(figureImport > 0 && sceneAwait > 0);
  assert.ok(figureImport < sceneAwait, "import('./approach-figure.js') debe iniciarse antes del await de scene.js");
  assert.match(html, /<link rel="modulepreload" href="approach-figure\.js">/);
});

test("sin JavaScript la sección es la lista de seis pasos, no cinco pantallas vacías", () => {
  const noscript = html.match(/<noscript>\s*<style>([\s\S]*?)<\/style>\s*<\/noscript>/);
  assert.ok(noscript, "falta <noscript><style>");
  assert.match(noscript[1], /\.approach-stage\s*\{[^}]*height:\s*auto/);
  assert.match(noscript[1], /\.approach-pin\s*\{[^}]*position:\s*static/);
  assert.match(noscript[1], /\.approach-card\s*\{[^}]*display:\s*none/);
});

test("los cuadros entran con fade (WAAPI) y los inactivos salen del árbol de accesibilidad", () => {
  const showStep = html.match(/function showStep\(step\)\s*\{([\s\S]*?)\n    \}/);
  assert.ok(showStep, "falta showStep");
  assert.match(showStep[1], /\.animate\(/, "showStep debe animar la entrada del cuadro activo");
  assert.match(showStep[1], /animations\.add\(/, "la animación entra al Set para que motion-off la cancele");
  assert.match(html, /html\.approach-live \.approach-captions li \{[^}]*visibility:\s*hidden/);
  assert.match(html, /html\.approach-live \.approach-captions li\[data-active\] \{[^}]*visibility:\s*visible/);
});

test("la región viva anuncia el paso y el SVG con role=img no queda oculto", () => {
  assert.doesNotMatch(html, /class="approach-figure" aria-hidden="true"/);
  assert.doesNotMatch(html, /<ol class="approach-captions" aria-live/);
  assert.match(html, /id="approach-status"[^>]*aria-live="polite"/);
  assert.match(html, /approachStatus:/, "texto i18n del anuncio");
});
