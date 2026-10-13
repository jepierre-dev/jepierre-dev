// La pieza que viaja: seis formas, todas construidas en la estación 0 sobre la
// banda, en un grupo que el runtime traslada. Es el único elemento `lit`.
import * as k from "./kit/iso-kit.mjs";
import * as G from "./geometry.mjs";
import { STATION_X } from "./model.mjs";

const { S, L, D, at, P, BELT_TOP } = G;
const X = STATION_X[0];
const lit = (paths, extra = {}) => S(paths, { tone: "hi", lit: true, ...extra });

// 0 · ticket: una hoja con dos renglones y un sello.
function ticket() {
  const plan = { x: X - 7, y: -5, w: 14, d: 10, r: 0.8 };
  return lit(k.slabOf(plan, BELT_TOP, 0.8, P, 3)) +
    L([3, 5.5].map((dy) => k.lineOnTop([plan.x + 2, plan.y + dy], [plan.x + plan.w - 2 - (dy > 4 ? 4 : 0), plan.y + dy], BELT_TOP + 0.8, P)).join(""), { tone: "lo", free: true }) +
    L(k.ring(plan.x + plan.w - 2.5, plan.y + plan.d - 2.5, 0.9, BELT_TOP + 0.8, P, 10), { tone: "lo" });
}
// 1 · cuaderno: dos páginas, lomo y tres renglones por página.
function notebook() {
  const plan = { x: X - 8, y: -6, w: 16, d: 12, r: 0.6 };
  return lit(k.slabOf(plan, BELT_TOP, 2, P, 3, 0.3)) +
    L(k.lineOnTop([X, plan.y + 1], [X, plan.y + plan.d - 1], BELT_TOP + 2, P), { tone: "lo" }) +
    L([3, 5.5, 8].map((dy) => k.lineOnTop([plan.x + 2, plan.y + dy], [X - 1.5, plan.y + dy], BELT_TOP + 2, P) + k.lineOnTop([X + 1.5, plan.y + dy], [plan.x + plan.w - 2, plan.y + dy], BELT_TOP + 2, P)).join(""), { tone: "lo", free: true });
}
// 2 · plano: marco y tres cajas (datos, API, pantallas) unidas por dos segmentos.
function blueprint() {
  const plan = { x: X - 10, y: -7, w: 20, d: 14, r: 0.5 };
  const out = [lit(k.slabOf(plan, BELT_TOP, 0.6, P, 3))];
  out.push(L(k.planOutline(k.insetPlan(plan, 1.5), BELT_TOP + 0.6, P, 3), { tone: "lo" }));
  const boxes = [[X - 6, -2], [X, -2], [X + 6, -2]].map(([bx, by]) => ({ x: bx - 2, y: by - 1.5, w: 4, d: 3, r: 0.3 }));
  for (const b of boxes) out.push(L(k.planOutline(b, BELT_TOP + 0.6, P, 2), { tone: "mid" }));
  out.push(L(k.lineOnTop([X - 4, -2], [X - 2, -2], BELT_TOP + 0.6, P) + k.lineOnTop([X + 2, -2], [X + 4, -2], BELT_TOP + 0.6, P), { tone: "mid" }));
  out.push(L(k.lineOnTop([X - 6, 2], [X + 6, 2], BELT_TOP + 0.6, P), { tone: "lo", free: true }));
  return out.join("");
}
// 3 · caja con seis módulos encajados.
function modules() {
  const crate = { x: X - 9, y: -7, w: 18, d: 14, r: 0.8 };
  const out = [lit(k.slabOf(crate, BELT_TOP, 4, P, 3, 0.4), { crease: "lo" })];
  [[-5, -3], [0, -3], [5, -3], [-5, 3], [0, 3], [5, 3]].forEach(([dx, dy]) => {
    out.push(lit(k.slabOf({ x: X + dx - 1.8, y: dy - 1.8, w: 3.6, d: 3.6, r: 0.4 }, BELT_TOP + 4, 2.4, P, 2), { crease: "lo" }));
  });
  return out.join("");
}
// 4 · caja sellada: seam a media altura, cinta y un sello.
function sealed() {
  const crate = { x: X - 9, y: -7, w: 18, d: 14, r: 0.8 };
  return lit(k.slabOf(crate, BELT_TOP, 8, P, 3, 0.5), { crease: "lo", inner: L(k.sideSeam(crate, BELT_TOP + 4, P, 3), { tone: "lo" }) }) +
    L(k.lineOnTop([X, crate.y + 1], [X, crate.y + crate.d - 1], BELT_TOP + 8, P), { tone: "lo" }) +
    D([at([X, 0, BELT_TOP + 8])], { size: 0.5 });
}
// 5 · punto luminoso con su halo sobre la banda.
function glow() {
  return lit(k.cylinder(X, 0, 4, BELT_TOP, 1.2, P, 24), { crease: "none" }) +
    L(k.ring(X, 0, 6.5, BELT_TOP + 0.2, P, 32), { tone: "mid" }) +
    D([at([X, 0, BELT_TOP + 1.2])], { size: 0.8, tone: "hi" });
}

export function pieceForms() {
  const forms = [ticket(), notebook(), blueprint(), modules(), sealed(), glow()];
  return `<g data-part="piece">${forms.map((svg, f) => `<g data-form="${f}" opacity="0">${svg}</g>`).join("")}</g>`;
}
