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
  // Índice de pasos: todos los títulos visibles, solo el párrafo activo desplegado.
  assert.match(html, /html\.approach-live \.approach-captions li:not\(\[data-active\]\) p \{[^}]*display:\s*none/);
});

test("la tarjeta lleva título, barra de progreso de seis segmentos y la pista se desvanece tras el primer paso", () => {
  assert.match(html, /approachFigTitle: 'Línea de ensamble'/);
  assert.match(html, /approachFigTitle: 'Assembly line'/);
  const bar = html.match(/<span class="approach-progress"[^>]*>([\s\S]*?)<\/span>/);
  assert.ok(bar, "falta .approach-progress");
  assert.equal((bar[1].match(/<i>/g) || []).length, 6);
  assert.match(html, /\.approach-figure:not\(\[data-step="0"\]\) ~ \.approach-hint \{[^}]*opacity:\s*0/);
  assert.match(html, /class="approach-rail-fill"/);
});

test("la región viva anuncia el paso y el SVG con role=img no queda oculto", () => {
  assert.doesNotMatch(html, /class="approach-figure" aria-hidden="true"/);
  assert.doesNotMatch(html, /<ol class="approach-captions" aria-live/);
  assert.match(html, /id="approach-status"[^>]*aria-live="polite"/);
  assert.match(html, /approachStatus:/, "texto i18n del anuncio");
});
