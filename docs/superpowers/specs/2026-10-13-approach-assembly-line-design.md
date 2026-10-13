# Sección "Cómo trabajo": línea de ensamble de software

Fecha: 2026-10-13. Estado: diseño aprobado en conversación, pendiente de revisión escrita.

## Objetivo

Reemplazar la lista de 3 pasos de la sección `#approach` de `index.html` por una
figura isométrica animada que explica, paso a paso, cómo se crea un software
partiendo de un campo operacional real. La animación avanza con el scroll: la
sección queda fija (pinneada) hasta que el lector recorre los 6 pasos. En cada
paso aparece un cuadro breve que explica lo que se está viendo. Debe funcionar
en escritorio y en móvil (390 px), con el toggle de movimiento y con
`prefers-reduced-motion`, y en ambos idiomas (ES/EN).

Lo que dijo el usuario: software en general (no un tema minero ni otro
particular); 6 pasos de campo a software; sección pinneada, no bloqueo real del
scroll; se conservan título e intro, la figura reemplaza la lista.

Supuestos míos: tema oscuro únicamente (el sitio es oscuro); los textos de los
cuadros los redacto yo siguiendo el tono de la página y el usuario los ajusta.

## El objeto

Una banda transportadora isométrica (azimut 45°, elevación 30°) sobre una base
con patas, riel con regla de ticks, y 6 estaciones. Una pieza viaja por la banda
y cambia de forma en cada estación; es el único elemento `lit`.

| # | Paso | Estación | Lo que viaja | Mecanismo que se acciona |
|---|------|----------|--------------|--------------------------|
| 1 | Campo operacional | Piso de operación genérico: mostrador, máquina con luz de estado, persona con tablilla, dispositivo portátil | ticket | la luz de estado parpadea; el ticket sale del mostrador a la banda |
| 2 | Entender | Atril de entrevista: cuaderno, lupa en brazo, grabadora | cuaderno | la lupa baja sobre el cuaderno |
| 3 | Diseñar | Mesa de dibujo: tres planos enrollados (datos, API, pantallas), escuadra | plano | un plano se desenrolla |
| 4 | Construir | Banco con prensa que estampa módulos y medidor de pruebas | caja con módulos | la prensa baja; la aguja del medidor sube a la zona verde |
| 5 | Desplegar | Muelle de despacho: gabinete rack con puerta, cable a un teléfono y a un monitor | caja sellada | la puerta del rack se cierra; LED enciende |
| 6 | Operar y mejorar | Sala de control: tablero, dial de métricas, banda de retorno a la estación 1 | punto luminoso en el tablero | el dial sube; un punto recorre la banda de retorno hasta la estación 1 |

Tamaño `anatomy`: **Hero** (100–150 piezas, 2–4 h). Sin WebGL ni 3D.

Paleta: la del sitio (`--paper #f3eadb`, `--muted #b4b0bc`, `--line #35333e`,
acento `--lilac #b6f09c`). Tipografía Geist en el marco.

## Arquitectura

```
approach/                 # fuente de la figura; no se sirve
  kit/iso-kit.mjs         # copia del kit del skill anatomy
  model.mjs               # verdad del proceso: 6 pasos, fases por paso, estados de la pieza
  geometry.mjs            # todas las piezas estáticas, construidas una vez
  build.mjs               # node approach/build.mjs → escribe approach-figure.js
approach-figure.js        # generado: SVG inline + runtime (ES module)
index.html                # sección #approach, CSS del pin, textos i18n, carga del módulo
docs/superpowers/specs/   # este documento
```

- `approach-figure.js` exporta `mountApproachFigure(host)` y devuelve
  `{ update({ progress, paused }), dispose() }`, el mismo contrato que
  `scene.js`.
- `index.html` lo importa dinámicamente dentro del `try` existente, después del
  montaje de la escena 3D. Si falla, la sección muestra los 6 cuadros como lista
  estática (ya presentes en el HTML), sin pin.
- Ningún archivo nuevo dentro de `openspec/`.

## Scroll pinneado

- HTML de la sección: cabecera (`.copy` con eyebrow, `h2`, `p`) y debajo
  `.approach-stage` (altura `calc(6 * 100svh)`) que contiene `.approach-pin`
  (`position: sticky; top: 0; height: 100svh`). Dentro del pin: `.approach-captions`
  (los 6 cuadros) y `.approach-figure` (host del SVG).
- Progreso: `p = clamp((scrollY − stageTop) / (stageHeight − 100svh), 0, 1) * 6`.
  Se calcula en el `updateScroll()` existente; `stageTop` se mide en `measure()`.
  No se añade un segundo listener de scroll.
- Dentro de cada paso `n` (p en `[n, n+1)`): tramo 0–0.6 mueve la pieza de la
  estación `n` a la `n+1`; tramo 0.6–1 acciona el mecanismo de la estación de
  llegada. Paso 6 (p en `[5, 6]`) acciona la sala de control y el retorno.
- La figura sigue el progreso con follow exponencial (sin saltos). El loop de
  animación corre solo mientras el pin está en pantalla y hay movimiento
  pendiente; se detiene cuando el valor se asienta.
- Movimiento pausado (`motionOff()`): `.approach-stage` pasa a altura `auto` sin
  sticky; figura en el estado final (p = 6) sin loop; los 6 cuadros visibles como
  lista. El cambio se aplica en `updateMotion()` existente.
- El capítulo "approach" del canvas Three.js simplemente dura más scroll; no
  cambia `scene.js`.

## Cuadros de explicación

- 6 cuadros `<li>` con número `0n`, `h3` corto y 1–2 líneas; textos en el
  diccionario ES/EN de `index.html` (`stepOne…stepSix`, `stepOneBody…`), con
  `data-i18n` como el resto de la página. Los textos actuales de los 3 pasos se
  redistribuyen en los 6.
- Con movimiento activo, solo el cuadro del paso activo (`floor(p)`, tope 5)
  está visible: entra con fade + translateY vía Web Animations API (como
  `data-reveal`), el anterior sale. El contenedor tiene `aria-live="polite"`.
- Marco de la figura (`anatomy`): `Fig 2` arriba a la izquierda, título corto
  arriba a la derecha, pista abajo a la izquierda ("Desplázate" / "Scroll"),
  lectura viva abajo a la derecha (`03 / 06`). Estos textos también van por i18n.

## Responsive

- Escritorio (≥768 px): dentro del pin, dos columnas: cuadro a la izquierda
  (ancho de la columna de texto del sitio, ~38%), figura a la derecha (~62%). El
  `viewBox` hace un paneo suave que mantiene la estación activa centrada con la
  línea completa visible.
- Móvil (≤767 px): figura arriba (~55svh), cuadro abajo como tarjeta. El
  `viewBox` hace zoom a la estación activa (≈2 estaciones visibles) con el mismo
  follow exponencial. Gutters de 24 px; sin scroll horizontal.
- Se usa `svh` en todas las alturas de viewport.
- La figura es un SVG con `preserveAspectRatio="xMidYMid meet"`; el runtime solo
  escribe `viewBox` y atributos `transform`/`d` de las partes móviles.

## Accesibilidad

- El SVG lleva `role="img"` y `aria-label` i18n que resume el proceso; los
  cuadros son el contenido legible.
- Teclado: el scroll con PageDown/espacio/flechas avanza el progreso como
  cualquier scroll; no se intercepta ningún evento.
- `prefers-reduced-motion: reduce` equivale a movimiento pausado.

## Verificación

- `node approach/build.mjs` regenera `approach-figure.js` de forma reproducible.
- Capturas con `scripts/capture.mjs` del skill (1440 y 390 px) en p = 0, 2.5,
  4.8 y 6, y 4× sobre cada estación; `scripts/lines.mjs` termina en
  `line ends: 0`.
- Prueba manual en navegador (Playwright): recorrer la sección con scroll,
  pausar movimiento, cambiar idioma, navegar con teclado, emular
  `prefers-reduced-motion`, y comprobar que el canvas del JO y el rail de
  capítulos siguen funcionando.

## Ajustes tras la revisión de diseño (2026-10-13)

Aprobados por el usuario sobre la misma rama, sustituyen a lo anterior donde
difieren:

- Cámara: la ventana del `viewBox` se centra en el punto de pantalla de la pieza
  en X **e Y**, con proporción 16:9 en escritorio y 5:4 en móvil, sin salirse
  del dibujo; en pausa se ve la línea entera.
- Columna de texto: índice de los seis pasos (número y título siempre
  visibles; solo el párrafo del paso activo desplegado), con un riel de 1 px
  que se llena en `--lilac` hasta la fila activa. En móvil el mismo índice,
  compacto, bajo la tarjeta.
- Marco de la tarjeta: `Fig. 2 Línea de ensamble` a la izquierda y una barra de
  seis segmentos a la derecha (sustituye al readout `0n / 06`); la pista
  "Desplázate" se desvanece tras el primer paso.
- Paleta del módulo más luminosa (líneas `#e6e0d4 / #8f8b9a / #57545f`, caras
  `#1a1a26`), acento `--lilac` solo en la pieza.
- Accesibilidad: región viva `#approach-status` ("Paso n de 6: título", i18n);
  el SVG no está `aria-hidden`.

- Scroll por fases (aprobado después): la stage mide `100svh + 6 × 70svh` con
  siete anclas de `scroll-snap` (seis fases y una de salida) y
  `scroll-snap-stop: always`; `html.approach-snap` (`scroll-snap-type: y
  mandatory`) solo está activo mientras el scroll está dentro de la stage. El
  scroll elige la fase (parada más cercana) y la figura la reproduce a
  `PHASE_RATE = 0.75` pasos/s (`advance()` en el modelo), también hacia atrás,
  en lugar de ir atada a la posición del scroll.

- Estímulos (aprobados después): eventos de una sola vez al cruzar hacia
  delante el umbral de la acción de cada estación (`EVENTS`, `eventsAt`,
  `particlesOf` en el modelo; capa `data-part="fx"` en el SVG): onda en la
  lámpara, destello en la lupa, motas sobre el plano, chispas al golpear la
  prensa y pulso del medidor, confeti suave (14 piezas) sobre la caja sellada,
  latido del punto luminoso y estela del punto de retorno. Nunca en pausa,
  reduced-motion ni hacia atrás.

## Fuera de alcance

- WebGL, 3D, tema claro, cambios en `scene.js`, cambios en otras secciones,
  cualquier registro en `openspec/`.
