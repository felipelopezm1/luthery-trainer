/* StatsViz — WebGL utilization dashboard (general + per section/level) */

const StatsViz = (() => {
  const SECS = [
    { id: 'lect', label: 'Lectura' },
    { id: 'ac', label: 'Acordes' },
    { id: 'rt', label: 'Ritmo' },
    { id: 'err', label: 'Errores' },
    { id: 'teo', label: 'Teoría' },
  ];
  const MOD_SEC = { ritmo: 'rt', errores: 'err', acordes: 'ac', lectura: 'lect', teoria: 'teo' };
  const LEVELS = ['easy', 'medium', 'hard'];
  const MOD_LABEL = {
    inicio: 'General', historial: 'General', ritmo: 'Ritmo', errores: 'Errores',
    acordes: 'Acordes', lectura: 'Lectura', teoria: 'Teoría',
  };
  const DIFF = { easy: 'Fácil', medium: 'Medio', hard: 'Difícil' };

  let getProgress = () => ({ log: [], scores: {}, byLevel: {}, streak: 0, best: 0 });
  let getContext = () => ({ mod: 'inicio', level: 'medium' });
  let glMain = null, glDetail = null;

  const VS = `
    attribute vec2 a_pos;
    uniform vec2 u_res;
    void main() {
      vec2 p = a_pos / u_res;
      gl_Position = vec4(p.x * 2.0 - 1.0, 1.0 - p.y * 2.0, 0.0, 1.0);
    }`;
  const FS = `
    precision mediump float;
    uniform vec4 u_color;
    void main() { gl_FragColor = u_color; }`;

  function mkGL(canvas) {
    if (!canvas) return null;
    const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
    if (!gl) return null;
    const vs = compile(gl, gl.VERTEX_SHADER, VS);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FS);
    const prog = link(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    return { gl, prog, buf, loc: {
      pos: gl.getAttribLocation(prog, 'a_pos'),
      res: gl.getUniformLocation(prog, 'u_res'),
      col: gl.getUniformLocation(prog, 'u_color'),
    }};
  }

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }

  function link(gl, vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    return p;
  }

  function theme() {
    const s = getComputedStyle(document.documentElement);
    const pick = k => s.getPropertyValue(k).trim();
    return {
      fg: rgba(pick('--display')),
      muted: rgba(pick('--muted')),
      accent: rgba(pick('--accent')),
      success: rgba(pick('--success')),
      error: rgba(pick('--error')),
      line: rgba(pick('--line-2')),
      surface: rgba(pick('--surface')),
    };
  }

  function rgba(css) {
    const d = document.createElement('div');
    d.style.color = css || '#fff';
    document.body.appendChild(d);
    const m = getComputedStyle(d).color.match(/[\d.]+/g) || ['255', '255', '255'];
    document.body.removeChild(d);
    return [m[0] / 255, m[1] / 255, m[2] / 255, 1];
  }

  function mix(a, b, t) {
    return a.map((v, i) => v + (b[i] - v) * t);
  }

  function pct(c, t) { return t ? Math.round(c / t * 100) : 0; }

  function sessions(log) {
    if (!log.length) return [];
    const out = [];
    let cur = [log[0]];
    for (let i = 1; i < log.length; i++) {
      if (log[i - 1].ts - log[i].ts > 25 * 60 * 1000) { out.push(cur); cur = [log[i]]; }
      else cur.push(log[i]);
    }
    out.push(cur);
    return out.reverse();
  }

  function sessionStats(sess) {
    const t = sess.length;
    const c = sess.filter(x => x.ok).length;
    return { t, c, p: pct(c, t) };
  }

  function filterLog(log, sec, lvl) {
    return log.filter(e => (!sec || e.sec === sec) && (!lvl || e.lvl === lvl));
  }

  function rolling(log, n = 20) {
    const slice = log.slice(0, n).reverse();
    if (!slice.length) return [];
    let hits = 0;
    return slice.map((e, i) => {
      if (e.ok) hits++;
      return (hits / (i + 1)) * 100;
    });
  }

  function improvement(log, sec) {
    const L = filterLog(log, sec).slice(0, 24);
    if (L.length < 6) return null;
    const mid = Math.floor(L.length / 2);
    const recent = L.slice(0, mid);
    const older = L.slice(mid);
    const pr = pct(recent.filter(x => x.ok).length, recent.length);
    const po = pct(older.filter(x => x.ok).length, older.length);
    return pr - po;
  }

  function triRect(x, y, w, h) {
    return [x, y, x + w, y, x, y + h, x, y + h, x + w, y, x + w, y + h];
  }

  function drawTris(ctx, tris, color, W, H) {
    const { gl, prog, buf, loc } = ctx;
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(prog);
    gl.uniform2f(loc.res, W, H);
    gl.uniform4fv(loc.col, color);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tris), gl.STREAM_DRAW);
    gl.enableVertexAttribArray(loc.pos);
    gl.vertexAttribPointer(loc.pos, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, tris.length / 2);
  }

  function drawRect(ctx, x, y, w, h, color, W, H) {
    drawTris(ctx, triRect(x, y, w, h), color, W, H);
  }

  function drawArc(ctx, cx, cy, r, thick, start, end, color, W, H) {
    const segs = 48;
    const tris = [];
    for (let i = 0; i < segs; i++) {
      const a0 = start + (end - start) * (i / segs);
      const a1 = start + (end - start) * ((i + 1) / segs);
      const x0o = cx + Math.cos(a0) * r, y0o = cy + Math.sin(a0) * r;
      const x1o = cx + Math.cos(a1) * r, y1o = cy + Math.sin(a1) * r;
      const ri = r - thick;
      const x0i = cx + Math.cos(a0) * ri, y0i = cy + Math.sin(a0) * ri;
      const x1i = cx + Math.cos(a1) * ri, y1i = cy + Math.sin(a1) * ri;
      tris.push(x0o, y0o, x1o, y1o, x0i, y0i, x0i, y0i, x1o, y1o, x1i, y1i);
    }
    drawTris(ctx, tris, color, W, H);
  }

  function drawLine(ctx, pts, color, W, H, w = 2) {
    if (pts.length < 4) return;
    const tris = [];
    for (let i = 0; i < pts.length - 2; i += 2) {
      const x0 = pts[i], y0 = pts[i + 1], x1 = pts[i + 2], y1 = pts[i + 3];
      const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
      const nx = (-dy / len) * w * 0.5, ny = (dx / len) * w * 0.5;
      tris.push(x0 + nx, y0 + ny, x1 + nx, y1 + ny, x0 - nx, y0 - ny);
      tris.push(x0 - nx, y0 - ny, x1 + nx, y1 + ny, x1 - nx, y1 - ny);
    }
    drawTris(ctx, tris, color, W, H);
  }

  function sizeCanvas(canvas) {
    const dpr = devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    return { W: canvas.width, H: canvas.height, w, h };
  }

  function renderMain(data, ctx, sec, lvl) {
    const canvas = document.getElementById('util-gl-main');
    if (!canvas || !glMain) return;
    const { W, H, w, h } = sizeCanvas(canvas);
    const T = theme();
    const pad = 12 * devicePixelRatio;

    glMain.gl.clearColor(T.surface[0], T.surface[1], T.surface[2], 1);
    drawRect(glMain, 0, 0, W, H, T.surface, W, H);

    const logs = filterLog(data.log, sec, lvl);
    const total = logs.length;
    const correct = logs.filter(x => x.ok).length;
    const acc = pct(correct, total);

    const cx = W * 0.28, cy = H * 0.52, r = Math.min(W, H) * 0.22;
    drawArc(glMain, cx, cy, r, r * 0.18, 0, Math.PI * 2, mix(T.line, T.line, 0), W, H);
    if (total) {
      const end = -Math.PI / 2 + (Math.PI * 2 * acc) / 100;
      drawArc(glMain, cx, cy, r, r * 0.18, -Math.PI / 2, end, acc >= 60 ? T.success : acc >= 40 ? T.accent : T.error, W, H);
    }

    const bars = sec
      ? LEVELS.map(l => {
          const L = filterLog(data.log, sec, l);
          return { label: DIFF[l], v: pct(L.filter(x => x.ok).length, L.length) };
        })
      : SECS.map(s => ({ label: s.label, v: pct(data.scores[s.id]?.c || 0, data.scores[s.id]?.t || 0) }));

    const bx = W * 0.52, by = pad, bw = W * 0.42, bh = H - pad * 2;
    const gap = bh / bars.length;
    bars.forEach((b, i) => {
      const y = by + i * gap + gap * 0.18;
      const barH = gap * 0.38;
      drawRect(glMain, bx, y, bw, barH, mix(T.line, T.line, 0), W, H);
      const fw = (bw - 4) * (b.v / 100);
      if (fw > 2) drawRect(glMain, bx + 2, y + 2, fw, barH - 4, mix(T.fg, T.fg, 0), W, H);
    });

    const cap = document.getElementById('util-ring-label');
    if (cap) cap.textContent = total ? `${acc}%` : '—';
  }

  function renderDetail(data, ctx, sec) {
    const canvas = document.getElementById('util-gl-detail');
    if (!canvas || !glDetail) return;
    const { W, H } = sizeCanvas(canvas);
    const T = theme();
    drawRect(glDetail, 0, 0, W, H, T.surface, W, H);

    const logs = filterLog(data.log, sec);
    const roll = rolling(logs, 24);
    const sess = sessions(data.log);
    const sessP = sess.slice(-8).map(sessionStats);

    const pad = 14 * devicePixelRatio;
    const gw = W - pad * 2, gh = H * 0.46, gx = pad, gy = pad;

    if (roll.length > 1) {
      const pts = [];
      roll.forEach((v, i) => {
        pts.push(gx + (i / (roll.length - 1)) * gw, gy + gh - (v / 100) * gh);
      });
      drawLine(glDetail, pts, mix(T.muted, T.muted, 0.35), W, H, 1.5 * devicePixelRatio);
      drawLine(glDetail, pts, T.accent, W, H, 2.5 * devicePixelRatio);
    }

    const gy2 = gy + gh + pad * 0.6;
    const gh2 = H - gy2 - pad;
    if (sessP.length) {
      const bw = gw / sessP.length - 4;
      sessP.forEach((s, i) => {
        const x = gx + i * (bw + 4);
        const bh = (s.p / 100) * gh2;
        drawRect(glDetail, x, gy2 + gh2 - bh, bw, bh, s.p >= 50 ? T.success : T.fg, W, H);
      });
    }
  }

  function renderKPIs(data, ctx, sec, lvl) {
    const el = document.getElementById('util-kpis');
    if (!el) return;
    const T = window.t || (k => k);
    const logs = filterLog(data.log, sec, lvl);
    const total = logs.length;
    const acc = pct(logs.filter(x => x.ok).length, total);
    const sess = sessions(data.log);
    const imp = improvement(data.log, sec);
    const mod = ctx.mod;
    const modLabel = sec ? T('sec_' + (MOD_SEC[mod] || 'rt')) : T('util_general');
    const diffLabel = sec ? T('diff_' + lvl) : '';
    const title = sec ? `${modLabel} · ${diffLabel}` : T('util_general');
    const impTxt = imp == null ? '—' : `${imp >= 0 ? '+' : ''}${imp}%`;

    el.innerHTML = `
      <div class="util-kpi"><span class="k">${T('util_kpi_acc')}</span><b>${total ? acc + '%' : '—'}</b></div>
      <div class="util-kpi"><span class="k">${T('util_kpi_ans')}</span><b>${total}</b></div>
      <div class="util-kpi"><span class="k">${T('util_kpi_sess')}</span><b>${sess.length || 0}</b></div>
      <div class="util-kpi"><span class="k">${T('util_kpi_imp')}</span><b class="${imp > 0 ? 'up' : imp < 0 ? 'dn' : ''}">${impTxt}</b></div>`;

    const cap = document.getElementById('util-caption');
    if (cap) {
      cap.textContent = sec
        ? T('util_usage_sec', { mod: T('sec_' + MOD_SEC[mod]), diff: diffLabel, s: data.streak, b: data.best })
        : T('util_usage_global', { n: data.log.length });
    }
    const head = document.getElementById('util-context-label');
    if (head) head.textContent = title;
  }

  function refresh() {
    const data = getProgress();
    const ctx = getContext();
    const sec = MOD_SEC[ctx.mod] || null;
    const lvl = sec ? ctx.level : null;
    if (!glMain) glMain = mkGL(document.getElementById('util-gl-main'));
    if (!glDetail) glDetail = mkGL(document.getElementById('util-gl-detail'));
    renderMain(data, ctx, sec, lvl);
    renderDetail(data, ctx, sec);
    renderKPIs(data, ctx, sec, lvl);
  }

  function init(opts = {}) {
    getProgress = opts.getProgress || getProgress;
    getContext = opts.getContext || getContext;
    refresh();
    window.addEventListener('resize', refresh);
    document.querySelectorAll('.fab button').forEach(b => b.addEventListener('click', () => setTimeout(refresh, 30)));
  }

  return { init, refresh };
})();

window.StatsViz = StatsViz;
