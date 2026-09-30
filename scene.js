/**
 * JO / one continuous idea, six precision-cut surfaces.
 * Browser module; one pinned dependency, no models, HDR downloads or overlays.
 * update({chapter, progress, paused}): 0 hero, 1 about, 2 approach, 3 stack,
 * 4 projects, 5 contact. Progress is local to the NEXT chapter; omitted fields
 * retain their values. The caller owns layout, scroll and error fallback.
 *
 * The very same six meshes unfold, traverse the viewport, reveal their axial
 * construction, retreat, then reunite. No replacement foreground geometry.
 * Geometry is a rounded-rectangle ribbon sweep, not a tube/torus/font: six
 * bevel samples per corner, continuous analytic frames, individually capped.
 * The J crosses ABOVE the O at its crown and BELOW it at its returning hook.
 */
export async function mountIdentityScene(canvas) {
  const view = canvas?.ownerDocument?.defaultView;
  if (!view || !(canvas instanceof view.HTMLCanvasElement)) {
    throw new TypeError('mountIdentityScene requires an HTMLCanvasElement.');
  }
  const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.180.0/+esm');
  const doc = canvas.ownerDocument;
  const reducedQuery = view.matchMedia('(prefers-reduced-motion: reduce)');
  const fineQuery = view.matchMedia('(pointer: fine) and (hover: hover)');
  const coarseQuery = view.matchMedia('(pointer: coarse)');
  const geometries = new Set();
  const materials = new Set();
  const removers = [];
  const pieces = [];
  const clamp = THREE.MathUtils.clamp;
  const mix = THREE.MathUtils.lerp;
  const ease = (v) => THREE.MathUtils.smootherstep(v, 0, 1);
  const ramp = (v, a, b) => ease(clamp((v - a) / (b - a), 0, 1));
  const trackGeometry = (g) => { geometries.add(g); return g; };
  const trackMaterial = (m) => { materials.add(m); return m; };
  const CAMERA_Z = 10;
  const TAN = 0.3;
  const rig = new THREE.Object3D();
  const scratch = new THREE.Vector3();
  const extents = new THREE.Vector3();
  const flightQ = new THREE.Quaternion();
  const euler = new THREE.Euler();
  let renderer, scene, camera, environment, resizeObserver, intersectionObserver;
  let disposed = false, lost = false, restoring = false, ready = false;
  let pageHidden = false, intersecting = true, sizeDirty = true;
  let reduced = reducedQuery.matches, paused = false, initialized = false;
  let chapter = 0, progress = 0, target = 0, displayedChapter = 0;
  let raf = null, previousTime = null, introTime = 0;
  let width = 0, height = 0, left = 0, top = 0, mobile = false;
  let pointerX = 0, pointerY = 0, tiltX = 0, tiltY = 0;

  function listen(target_, type, callback, options) {
    target_.addEventListener(type, callback, options);
    removers.push(() => target_.removeEventListener(type, callback, options));
  }
  function stop() {
    if (raf !== null) view.cancelAnimationFrame(raf);
    raf = null;
    previousTime = null;
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    ready = false;
    stop();
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    removers.forEach((remove) => remove());
    removers.length = 0;
    environment?.dispose();
    environment = null;
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    geometries.clear();
    materials.clear();
    pieces.length = 0;
    scene?.clear();
    renderer?.dispose();
  }
  function fail() {
    dispose();
    canvas.dispatchEvent(new view.CustomEvent('identity-scene-error'));
  }
  function safely(action) {
    if (disposed) return;
    try { action(); } catch { fail(); }
  }
  function drawable() {
    return ready && !disposed && !lost && !restoring && !pageHidden && !doc.hidden
      && intersecting && canvas.isConnected && width > 0 && height > 0;
  }
  function moving() { return drawable() && !reduced && !paused; }
  function unsettled() {
    return Math.abs(target - displayedChapter) > 0.0005
      || (displayedChapter < 0.45 && (introTime < 1.2
        || Math.abs(pointerX - tiltX) > 0.0001 || Math.abs(pointerY - tiltY) > 0.0001));
  }
  function measure() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    left = rect.left;
    top = rect.top;
    mobile = width < 768;
    if (!width || !height || lost) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    renderer.setPixelRatio(Math.min(view.devicePixelRatio || 1, coarseQuery.matches ? 1.25 : 1.75));
    renderer.setSize(Math.round(width), Math.round(height), false);
    buildTracks();
    sizeDirty = false;
  }

  // Studio radiance: broad softboxes separated by deliberately dark walls.
  // These meshes exist ONLY while baking PMREM, never in the visible scene.
  function bakeStudio() {
    const studio = new THREE.Scene();
    const owned = [];
    const makePanel = (w, h, position, color, energy) => {
      const g = new THREE.PlaneGeometry(w, h);
      const m = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color).multiplyScalar(energy), side: THREE.DoubleSide,
      });
      const panel = new THREE.Mesh(g, m);
      panel.position.fromArray(position);
      panel.lookAt(0, 0, 0);
      studio.add(panel);
      owned.push(g, m);
    };
    const roomGeometry = new THREE.BoxGeometry(24, 18, 24);
    const roomMaterial = new THREE.MeshBasicMaterial({ color: 0x12131a, side: THREE.BackSide });
    studio.add(new THREE.Mesh(roomGeometry, roomMaterial));
    owned.push(roomGeometry, roomMaterial);
    makePanel(7, 11, [-6, 3, 6], 0xf4f5ff, 3.6);
    makePanel(3, 10, [7, 1, 4], 0xe1e8f2, 2.6);
    makePanel(8, 3, [0, 7, 1], 0xffffff, 4.2);
    makePanel(5, 6, [-3, -4, -6], 0xadb0d2, 1.3);
    // One narrow primary-color softbox catches the bevel; silver stays neutral.
    makePanel(2, 8, [6, 2, -3], 0xb6f09c, 0.85);
    makePanel(2, 7, [1, 0, 8], 0x070810, 1);
    const generator = new THREE.PMREMGenerator(renderer);
    try {
      const next = generator.fromScene(studio, 0.04, 0.1, 40);
      environment?.dispose();
      environment = next;
      scene.environment = next.texture;
    } finally {
      generator.dispose();
      owned.forEach((asset) => asset.dispose());
      studio.clear();
    }
  }

  // A flat jewelry band with a convex face and six-segment rolled edges.
  // All points are authored in the monogram's shared coordinate system.
  function ribbon(curve, bandWidth, depth, start, end) {
    const section = [];
    const bevel = 0.065;
    for (let corner = 0; corner < 4; corner++) {
      const angle = corner * Math.PI / 2;
      const cx = (corner === 0 || corner === 3 ? 1 : -1) * (bandWidth / 2 - bevel);
      const cy = (corner < 2 ? 1 : -1) * (depth / 2 - bevel);
      for (let j = 0; j <= 6; j++) {
        const a = angle + j / 6 * Math.PI / 2;
        section.push([cx + bevel * Math.cos(a), cy + bevel * Math.sin(a)]);
      }
    }
    const count = section.length;
    const steps = 112;
    const vertices = [], indices = [];
    const p = new THREE.Vector3(), tangent = new THREE.Vector3();
    const across = new THREE.Vector3(), normal = new THREE.Vector3();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      curve.getPointAt(mix(start, end, t), p);
      curve.getTangentAt(mix(start, end, t), tangent);
      across.set(-tangent.y, tangent.x, 0).normalize();
      normal.crossVectors(tangent, across).normalize();
      // Restrained taper at cut ends, not a pointed tube or toy noodle.
      const taper = 0.93 + 0.07 * Math.sin(Math.PI * t);
      for (const [u, v] of section) {
        vertices.push(p.x + across.x * u * taper + normal.x * v,
          p.y + across.y * u * taper + normal.y * v,
          p.z + across.z * u * taper + normal.z * v);
      }
      if (i === steps) continue;
      for (let j = 0; j < count; j++) {
        const a = i * count + j, b = i * count + (j + 1) % count;
        indices.push(a, b, a + count, b, b + count, a + count);
      }
    }
    // Duplicate cap vertices so their planar normals cannot crease the bevel.
    for (const cap of [0, steps]) {
      const base = vertices.length / 3;
      curve.getPointAt(cap === 0 ? start : end, p);
      vertices.push(p.x, p.y, p.z);
      for (let j = 0; j < count; j++) {
        const k = (cap * count + j) * 3;
        vertices.push(vertices[k], vertices[k + 1], vertices[k + 2]);
      }
      for (let j = 0; j < count; j++) {
        const a = base + 1 + j, b = base + 1 + (j + 1) % count;
        if (cap === 0) indices.push(base, b, a);
        else indices.push(base, a, b);
      }
    }
    const g = trackGeometry(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    g.computeBoundingBox();
    const center = g.boundingBox.getCenter(new THREE.Vector3());
    g.translate(-center.x, -center.y, -center.z);
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return { geometry: g, center };
  }

  function addBand(name, curve, bandWidth, material, fan, index, start, end) {
    const { geometry, center } = ribbon(curve, bandWidth, 0.30, start, end);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    scene.add(mesh);
    const box = geometry.boundingBox;
    const corners = [];
    for (let i = 0; i < 8; i++) corners.push(new THREE.Vector3(
      i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z,
    ));
    pieces.push({ mesh, center, corners, fan, index, track: [], clearance: 0, coverageX: 0, coverageY: 0 });
  }

  // Author once per resize, not per frame. Screen-space anchors keep the reading
  // side clear; z remains a world-space distance. Quaternion slerp takes short
  // arcs, and smootherstep gives every join zero first AND second derivative.
  function buildTracks() {
    const aspect = camera.aspect;
    const fit = Math.min(6 * aspect * (mobile ? 0.76 : 0.38) / 2.85,
      6 * (mobile ? (height < 700 ? 0.26 : 0.34) : 0.65) / 3.45);
    const anchorX = mobile ? 0 : 0.48;
    const anchorY = mobile ? (height < 700 ? -0.52 : -0.44) : 0;
    for (const piece of pieces) {
      const { index: i, fan, track } = piece;
      track.length = 0;
      const key = (at, x, y, z, size, rx, ry, rz) => {
        const q = new THREE.Quaternion().setFromEuler(euler.set(rx, ry, rz));
        track.push({ at, x, y, z, scale: fit * size, q });
      };
      // A common axis, not six independent spins. Separating along its local z
      // reveals the construction while preserving each band's assembly center.
      const assembly = (at, x, y, z, size, rx, ry, rz, separation = 0) => {
        const q = new THREE.Quaternion().setFromEuler(euler.set(rx, ry, rz));
        scratch.copy(piece.center);
        scratch.z += (i - 2.5) * separation;
        scratch.multiplyScalar(fit * size).applyQuaternion(q);
        const depth = z + scratch.z;
        const halfHeight = (CAMERA_Z - depth) * TAN;
        track.push({ at, x: (x * (CAMERA_Z - z) * TAN * aspect + scratch.x) / (halfHeight * aspect),
          y: (y * (CAMERA_Z - z) * TAN + scratch.y) / halfHeight,
          z: depth, scale: fit * size, q });
      };
      assembly(0, anchorX, anchorY, 0, 1, 0.12, -0.22, -0.12);
      assembly(0.45, anchorX, anchorY, 0, 1, 0.10, 0.02, -0.08);

      const fx = mobile ? (fan[0] - 0.5) * 1.9 : fan[0];
      const fy = mobile ? fan[1] * 0.5 - 0.42 : fan[1];
      key(1.00, fx, fy, fan[2], 0.92, fan[3], fan[4], fan[5]);
      if (i === 3 || i === 4) {
        // Only the mint bridge and short stroke cross the lens. Their passes
        // are staggered, diagonal and edge-on; the other four stay back/right.
        const lag = i === 3 ? 0 : 0.08;
        key(1.34 + lag, mobile ? -0.32 : 0.22, mobile ? -0.05 : 0.48,
          6.1, 0.95, i === 3 ? 0.12 : 1.35, i === 3 ? 1.35 : 0.2, -0.38);
        key(1.68 + lag, 1.18, mobile ? -0.88 : -0.48,
          6.8, 0.95, i === 3 ? 0.3 : 1.48, i === 3 ? 1.48 : 0.32, -0.65);
      } else {
        key(1.40, mix(fx, mobile ? 0.28 : 0.62, 0.45), fy * 0.8,
          -1.2 - i * 0.35, 0.86, 0.18, 0.48, fan[5] * 0.45);
        key(1.65, mobile ? 0.2 : 0.62, mobile ? -0.42 : (2 - i) * 0.12,
          -1.8 - i * 0.25, 0.86, 0.18, 0.62, -0.12);
      }
      assembly(2.10, mobile ? 0.04 : 0.57, mobile ? -0.44 : 0.02,
        -1.2, 0.90, 0.18, 0.70, -0.10, 0.48);
      assembly(2.45, mobile ? 0.04 : 0.57, mobile ? -0.44 : 0.02,
        -0.5, 0.96, 0.22, 1.12, -0.10, 0.58);
      assembly(2.80, mobile ? 0.10 : 0.64, mobile ? -0.46 : 0.16,
        -1.4, 0.75, 0.16, 1.43, -0.06, 0.30);
      const compact = (at) => assembly(at, mobile ? 0.34 : 0.80,
        mobile ? -0.62 : 0.55, -3.8, 0.38, 0.12, 1.50, -0.04, 0.10);
      compact(3.15);
      // Finish the inspection before projects enter the viewport. The small
      // resting signature is assembled and frontal, not a lingering side view.
      const frontal = (at) => assembly(at, mobile ? 0.34 : 0.86,
        mobile ? -0.62 : 0.55, -3.8, 0.38, 0, 0, -0.04);
      frontal(3.55);
      // O establishes the silhouette; the J docks last, mint bridge included.
      // Delayed inward arrivals from depth, never a third outward burst.
      const order = i < 3 ? i : i === 5 ? 3 : i === 4 ? 4 : 5;
      frontal(4.00 + order * 0.035);
      assembly(4.45 + order * 0.035, anchorX, mobile ? -0.76 : anchorY, -2.6, mobile ? 0.50 : 0.85,
        0.12, -0.22, -0.12);
      assembly(4.80 + order * 0.035, anchorX, mobile ? -0.76 : anchorY, 0, mobile ? 0.55 : 1,
        0.12, -0.22, -0.12);
      assembly(5, anchorX, mobile ? -0.76 : anchorY, 0, mobile ? 0.55 : 1, 0.12, -0.22, -0.12);
    }
  }

  // Rotate a precomputed box, including the complete depth of the rolled edge.
  // The off-axis term bounds perspective at screen edges, not just at center.
  function rotatedExtents(piece, scale) {
    extents.set(0, 0, 0);
    for (const corner of piece.corners) {
      scratch.copy(corner).multiplyScalar(scale).applyQuaternion(piece.mesh.quaternion);
      extents.x = Math.max(extents.x, Math.abs(scratch.x));
      extents.y = Math.max(extents.y, Math.abs(scratch.y));
      extents.z = Math.max(extents.z, Math.abs(scratch.z));
    }
  }
  function pose() {
    const staticPose = reduced || paused;
    const cursor = reduced ? 0 : displayedChapter;
    const aspect = camera.aspect;
    const quiet = staticPose ? 0 : 1 - ramp(cursor, 0, 0.45);
    const intro = (1 - ramp(introTime, 0, 1.2)) * quiet;
    rig.position.set(mobile ? 0 : 6 * aspect * 0.24, mobile ? (height < 700 ? -1.56 : -1.32) : 0, 0);
    const tiltWeight = reduced ? 0 : 1 - ramp(cursor, 0, 0.45);
    flightQ.setFromEuler(euler.set(tiltY * tiltWeight,
      tiltX * tiltWeight + (paused ? (1 - ramp(introTime, 0, 1.2)) * tiltWeight : intro) * 0.08, 0));
    for (const piece of pieces) {
      const { mesh, track } = piece;
      let k = 0;
      while (k < track.length - 2 && cursor > track[k + 1].at) k++;
      const a = track[k], b = track[k + 1];
      const t = ramp(cursor, a.at, b.at);
      const scale = mix(a.scale, b.scale, t);
      let nx = mix(a.x, b.x, t), ny = mix(a.y, b.y, t);
      let z = mix(a.z, b.z, t);
      mesh.quaternion.slerpQuaternions(a.q, b.q, t);
      mesh.scale.setScalar(scale);
      if (tiltWeight > 0) {
        const halfHeight = (CAMERA_Z - z) * TAN;
        mesh.position.set(nx * halfHeight * aspect, ny * halfHeight, z);
        mesh.position.sub(rig.position).applyQuaternion(flightQ).add(rig.position);
        mesh.quaternion.premultiply(flightQ);
        z = mesh.position.z;
        nx = mesh.position.x / ((CAMERA_Z - z) * TAN * aspect);
        ny = mesh.position.y / ((CAMERA_Z - z) * TAN);
      }
      rotatedExtents(piece, scale);
      // Recompute the analytic envelope AFTER interpolation and pointer tilt.
      // Endpoint-safe rotations alone do not bound a quaternion's middle arc.
      // Moving back along this screen ray preserves the authored x/y trajectory.
      const safeDistance = extents.z + Math.max(camera.near + 0.22,
        (extents.x / (TAN * aspect) + Math.abs(nx) * extents.z) / (mobile ? 0.66 : 0.48),
        (extents.y / TAN + Math.abs(ny) * extents.z) / (mobile ? 0.36 : 0.68));
      z = Math.min(z, 7.9, CAMERA_Z - safeDistance);
      mesh.position.set(nx * (CAMERA_Z - z) * TAN * aspect, ny * (CAMERA_Z - z) * TAN, z);
      const distance = CAMERA_Z - mesh.position.z;
      piece.clearance = distance - extents.z - camera.near;
      // Conservative diagnostic bounds; evaluated without allocating per frame.
      piece.coverageX = (extents.x / (TAN * aspect) + Math.abs(nx) * extents.z) / (distance - extents.z);
      piece.coverageY = (extents.y / TAN + Math.abs(ny) * extents.z) / (distance - extents.z);
    }
  }

  function draw() {
    if (sizeDirty) measure();
    if (!drawable()) return;
    pose();
    renderer.render(scene, camera);
  }
  function schedule() { if (moving() && unsettled() && raf === null) raf = view.requestAnimationFrame(frame); }
  function frame(timestamp) {
    raf = null;
    if (!moving()) { stop(); return; }
    try {
      const dt = previousTime === null ? 1 / 60 : Math.max(0, (timestamp - previousTime) / 1000);
      previousTime = timestamp;
      // Exact exponential response: 100ms time constant, 98.2% settled at 400ms.
      // Reversals retarget immediately; no accumulated velocity or wheel queue.
      const damping = -Math.expm1(-dt / 0.10);
      displayedChapter += (target - displayedChapter) * damping;
      if (Math.abs(target - displayedChapter) < 0.0005) displayedChapter = target;
      tiltX += (pointerX - tiltX) * damping;
      tiltY += (pointerY - tiltY) * damping;
      introTime += dt;
      draw();
      if (unsettled()) schedule();
      else stop();
    } catch { fail(); }
  }
  function refresh() {
    if (sizeDirty) measure();
    if (!drawable()) { stop(); return; }
    if (reduced || paused) stop();
    draw();
    schedule();
  }
  function update(state = {}) {
    if (disposed || !state || typeof state !== 'object') return;
    safely(() => {
      if (Number.isFinite(state.chapter)) {
        const next = clamp(Math.trunc(state.chapter), 0, 5);
        if (next !== chapter && !Number.isFinite(state.progress)) progress = 0;
        chapter = next;
      }
      if (Number.isFinite(state.progress)) progress = clamp(state.progress, 0, 1);
      const wasPaused = paused;
      if (typeof state.paused === 'boolean') paused = state.paused;
      const next = Math.min(chapter + progress, 5);
      const changed = next !== target;
      if (!paused && (!initialized || Math.abs(next - target) > 1.2 || Math.abs(next - displayedChapter) > 1.2
        || reduced || !drawable())) {
        displayedChapter = next;
        if (next > 0.35) introTime = 1.2;
      }
      if (Number.isFinite(state.chapter) || Number.isFinite(state.progress)) initialized = true;
      target = next;
      // Parent scroll observers may call every frame: do not render twice.
      if (raf === null || paused !== wasPaused) refresh();
      else if (changed) schedule();
    });
  }
  // Read-only, on-demand instrumentation for lifecycle and camera safety tests.
  // No exported globals, logging, timers, or per-frame diagnostic allocations.
  function getDiagnostics() {
    return { ready, disposed, lost, running: raf !== null, reduced, paused,
      target, displayedChapter, meshCount: pieces.length,
      pieces: pieces.map((p) => ({ name: p.mesh.name, z: p.mesh.position.z,
        position: p.mesh.position.toArray(), quaternion: p.mesh.quaternion.toArray(), scale: p.mesh.scale.x,
        clearance: p.clearance, coverageX: p.coverageX, coverageY: p.coverageY })) };
  }

  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true,
      powerPreference: 'low-power', premultipliedAlpha: true });
    renderer.setClearColor(0x090910, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.debug.onShaderError = () => { throw new Error('Identity scene shader compilation failed.'); };
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(2 * Math.atan(TAN) * 180 / Math.PI, 1, 0.10, 50);
    camera.position.z = CAMERA_Z;
    camera.updateMatrixWorld();
    const silver = trackMaterial(new THREE.MeshStandardMaterial({
      color: 0xcbd0d6, metalness: 0.92, roughness: 0.24, envMapIntensity: 1.15,
    }));
    const mint = trackMaterial(new THREE.MeshStandardMaterial({
      color: 0xb6f09c, metalness: 0.82, roughness: 0.27, envMapIntensity: 1.05,
    }));
    // O: intentionally open, asymmetric squircle. These three surfaces carry
    // the outer silhouette, not an enclosure around separate typeset letters.
    const path = (points) => new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
    const oPath = path([[-0.94, 0.18, 0], [-0.89, 0.86, 0], [-0.56, 1.28, 0.02],
      [0.12, 1.43, 0.05], [0.73, 1.32, 0.08], [1.12, 0.98, 0.10],
      [1.24, 0.36, 0.12], [1.17, -0.36, 0.16], [0.93, -0.80, 0.20],
      [0.48, -1.09, 0.24], [-0.13, -1.13, 0.24], [-0.66, -0.94, 0.20], [-0.91, -0.53, 0.14]]);
    // Shared parent curves make the cut tangents match exactly at each joint.
    addBand('O / rising shoulder', oPath, 0.35, silver,
      [0.30, 0.54, -0.4, 0.15, -0.38, 0.24], 0, 0, 0.36);
    addBand('O / falling arc', oPath, 0.35, silver,
      [0.82, 0.23, -0.1, 0.24, 0.45, -0.28], 1, 0.362, 0.70);
    addBand('O / returning bowl', oPath, 0.35, silver,
      [0.57, -0.57, -0.7, -0.32, 0.12, 0.12], 2, 0.702, 1);
    // J crown bridges the O's upper shoulder in front; the lower hook ducks
    // behind its bowl with a physical air gap, then resurfaces at the open cut.
    const jPath = path([[-1.17, 0.91, 0.53], [-0.79, 1.02, 0.56], [-0.35, 1.04, 0.55],
      [0.08, 0.94, 0.50], [0.20, 0.68, 0.38], [0.21, 0.32, 0.18],
      [0.19, -0.06, -0.12], [0.13, -0.46, -0.39], [0.02, -0.79, -0.42],
      [-0.28, -1.32, -0.40], [-0.72, -1.51, -0.30], [-1.13, -1.33, -0.07], [-1.29, -0.92, 0.25]]);
    addBand('J / mint bridge', jPath, 0.32, mint,
      [0.55, 0.64, 0.5, -0.18, 0.20, -0.18], 3, 0, 0.30);
    addBand('J / descending stroke', jPath, 0.32, silver,
      [0.70, -0.08, 0.3, 0.22, -0.32, -0.42], 4, 0.302, 0.65);
    addBand('J / undercut hook', jPath, 0.32, silver,
      [0.25, -0.35, -0.3, 0.34, 0.30, 0.35], 5, 0.652, 1);
    scene.add(new THREE.HemisphereLight(0xdce2ef, 0x17151c, 0.35));
    const key = new THREE.DirectionalLight(0xf4f7ff, 1.8);
    key.position.set(-3, 5, 7);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xb6f09c, 0.55);
    rim.position.set(5, 2, -3);
    scene.add(rim);
    bakeStudio();

    const resetPointer = () => { pointerX = pointerY = 0; schedule(); };
    const onResize = () => safely(() => { sizeDirty = true; refresh(); });
    listen(view, 'resize', onResize, { passive: true });
    if (view.visualViewport) listen(view.visualViewport, 'resize', onResize, { passive: true });
    listen(doc, 'visibilitychange', () => safely(() => { resetPointer(); refresh(); }));
    listen(view, 'pagehide', () => { pageHidden = true; stop(); });
    listen(view, 'pageshow', () => safely(() => { pageHidden = false; sizeDirty = true; refresh(); }));
    listen(view, 'blur', resetPointer);
    listen(doc, 'pointerleave', resetPointer);
    listen(view, 'pointermove', (event) => {
      if (!moving() || !fineQuery.matches || event.pointerType !== 'mouse') return;
      pointerX = clamp((event.clientX - left) / width * 2 - 1, -1, 1) * 0.10;
      pointerY = clamp((event.clientY - top) / height * 2 - 1, -1, 1) * 0.06;
      schedule();
    }, { passive: true });
    listen(reducedQuery, 'change', () => safely(() => {
      reduced = reducedQuery.matches;
      resetPointer();
      tiltX = tiltY = 0;
      displayedChapter = target;
      introTime = 1.2;
      refresh();
    }));
    listen(fineQuery, 'change', () => safely(() => { resetPointer(); tiltX = tiltY = 0; refresh(); }));
    listen(coarseQuery, 'change', onResize);
    listen(canvas, 'webglcontextlost', (event) => {
      event.preventDefault();
      lost = true;
      ready = false;
      stop();
    });
    listen(canvas, 'webglcontextrestored', () => {
      if (disposed) return;
      lost = false;
      restoring = true;
      // Three restores its caches first. PMREM's old GPU pixels cannot be
      // reuploaded: rebake from the local studio, then compile before drawing.
      restore().catch(() => { if (!disposed) fail(); });
    });
    async function restore() {
      bakeStudio();
      sizeDirty = true;
      measure();
      pose();
      await renderer.compileAsync(scene, camera);
      if (disposed || lost) return;
      restoring = false;
      ready = true;
      refresh();
    }
    if (view.ResizeObserver) {
      resizeObserver = new view.ResizeObserver(onResize);
      resizeObserver.observe(canvas);
    }
    if (view.IntersectionObserver) {
      intersectionObserver = new view.IntersectionObserver((entries) => safely(() => {
        for (const entry of entries) if (entry.target === canvas) intersecting = entry.isIntersecting;
        refresh();
      }));
      intersectionObserver.observe(canvas);
    }
    measure();
    pose();
    await renderer.compileAsync(scene, camera);
    if (disposed || renderer.getContext().isContextLost()) throw new Error('Identity scene WebGL context is unavailable.');
    // Return only after programs are compiled AND the first real render exists.
    renderer.render(scene, camera);
    ready = true;
    refresh();
    return { update, dispose, getDiagnostics };
  } catch (error) {
    dispose();
    throw error;
  }
}
