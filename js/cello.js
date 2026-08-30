/* Cello studio — standalone practice room (not an exam module) */
const Cello = (() => {
  const LISTEN_KEY = 'music_bele_cello_listen';
  const YT_KEY = 'music_bele_cello_yt';
  const EXAMPLE = {
    id: 'vivaldi-rv40-largo',
    url: 'scores/vivaldi-rv40-largo.xml',
    pdf: 'scores/vivaldi-op14-cello-sonatas.pdf',
    bpm: 50,
    ytQuery: 'Vivaldi RV 40 cello sonata Largo',
  };
  let catalog = [EXAMPLE];
  let pieceId = EXAMPLE.id;
  const YT_APIS = [
    q => `/api/youtube-search?q=${encodeURIComponent(q)}`,
    q => `https://api.piped.private.coffee/search?q=${encodeURIComponent(q)}&filter=videos`,
  ];

  let bound = false;
  let exampleLoaded = false;
  let following = false;
  let ytCurrent = null;
  let ytTitle = '';
  let ytBrowse = false;

  function listenOn() {
    return localStorage.getItem(LISTEN_KEY) === '1';
  }

  function setListen(on) {
    localStorage.setItem(LISTEN_KEY, on ? '1' : '0');
    window.PitchDetect?.setListenEnabled?.(on);
    if (on) startMic();
    else window.PitchDetect?.stop();
    syncListenUI();
  }

  function syncListenUI() {
    const btn = document.getElementById('cello-listen');
    if (btn) {
      btn.classList.toggle('on', listenOn());
      btn.setAttribute('aria-pressed', listenOn() ? 'true' : 'false');
    }
  }

  function setMode(on) {
    document.querySelector('.app-shell')?.classList.toggle('cello-mode', on);
  }

  function updateTuner(p) {
    const noteEl = document.getElementById('cello-tuner');
    const centsEl = document.getElementById('cello-cents');
    const st = document.getElementById('cello-status');
    if (p?.error === 'denied') {
      if (st) st.textContent = t('cello_mic_denied');
      return;
    }
    if (!p || p.hz == null) return;
    if (noteEl) noteEl.textContent = `${p.note} · ${Math.round(p.hz)} Hz`;
    if (centsEl) {
      const c = Math.max(-50, Math.min(50, p.cents || 0));
      centsEl.style.setProperty('--cents', `${c + 50}%`);
      centsEl.classList.toggle('hit', p.hit === true);
    }
    if (st && p.target != null) st.textContent = p.hit ? t('cello_hit') : t('cello_miss');
  }

  async function startMic() {
    if (!window.PitchDetect) return;
    await window.PitchDetect.start({ minHz: 65, maxHz: 880, onPitch: updateTuner });
  }

  function savedVideos() {
    try { return JSON.parse(localStorage.getItem(YT_KEY) || '[]'); } catch { return []; }
  }

  function saveVideos(list) {
    localStorage.setItem(YT_KEY, JSON.stringify(list.slice(0, 12)));
  }

  function parseVideoId(input) {
    if (!input) return '';
    const s = String(input).trim();
    if (/^[\w-]{11}$/.test(s)) return s;
    try {
      const u = new URL(s, 'https://youtube.com');
      if (u.hostname.includes('youtu.be')) return u.pathname.replace('/', '').slice(0, 11);
      const v = u.searchParams.get('v');
      if (v) return v;
      const m = u.pathname.match(/\/(?:embed|shorts|live)\/([\w-]{11})/);
      if (m) return m[1];
    } catch {}
    return '';
  }

  function setPlayer(id, title) {
    ytCurrent = id;
    ytTitle = title || ytTitle || id;
    ytBrowse = false;
    const frame = document.getElementById('cello-yt-frame');
    const empty = document.getElementById('cello-yt-empty');
    const now = document.getElementById('cello-yt-now-title');
    if (frame && id) {
      frame.src = `https://www.youtube-nocookie.com/embed/${id}`;
      frame.hidden = false;
      frame.title = ytTitle || 'YouTube';
    }
    if (empty) empty.hidden = !!id;
    if (now) now.textContent = ytTitle || '';
    syncFocus();
  }

  function addVideo(id, title) {
    if (!id) return;
    const list = savedVideos().filter(v => v.id !== id);
    list.unshift({ id, title: title || id });
    saveVideos(list);
    setPlayer(id, title);
    renderYtSaved();
  }

  function syncFocus() {
    const app = document.querySelector('.cello-app');
    if (!app) return;
    const focused = !!ytCurrent && !ytBrowse;
    app.classList.toggle('cello-app--focus', focused);
    app.classList.toggle('cello-app--following', following);
    const now = document.getElementById('cello-yt-now');
    const browse = document.getElementById('cello-yt-browse');
    if (now) now.hidden = !focused;
    if (browse) browse.hidden = focused;
  }

  function setFollowing(on) {
    following = on;
    document.querySelector('.cello-app')?.classList.toggle('cello-app--following', on);
    document.getElementById('cello-play')?.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  async function startFollow() {
    const host = document.getElementById('cello-score');
    const bar = document.getElementById('cello-pdf-bar');
    if (!window.ScoreFollow?.getNotes?.()?.length) return;
    if (bar) bar.hidden = true;
    if (host) {
      host.classList.remove('cello-score--pdf');
      host.classList.add('cello-score--follow');
      await window.ScoreFollow.render(host);
    }
    const range = document.getElementById('metro-bpm');
    const m = scoreMeta();
    const bpm = range ? +range.value : m.bpm;
    window.TrainerAudio?.setMetroMeter?.(m.beats, m.beatType);
    setFollowing(true);
    window.ScoreFollow.play({
      bpm,
      onTarget: midi => window.PitchDetect?.setTarget(midi),
      onCursor: (_i, note) => {
        const st = document.getElementById('cello-status');
        if (st) st.textContent = t('cello_following', { bar: note.measure || 1, m: m.beats, bt: m.beatType, bpm });
      },
      onEnd: () => { stopFollow(true); },
    });
    if (!window.TrainerAudio?.isMetroRunning?.()) window.TrainerAudio?.toggleMetro?.();
  }

  async function stopFollow(ended) {
    const wasOn = following || window.ScoreFollow?.isPlaying?.();
    window.ScoreFollow?.stop();
    if (wasOn && window.TrainerAudio?.isMetroRunning?.()) window.TrainerAudio.toggleMetro();
    setFollowing(false);
    const st = document.getElementById('cello-status');
    const m = scoreMeta();
    const pages = window.ScorePdf?.pageInfo()?.pages;
    if (st) {
      st.textContent = ended
        ? t('cello_done')
        : pages
          ? t('cello_pdf_ready', { n: pages, m: m.beats, bt: m.beatType, bpm: m.bpm })
          : t('cello_example_ready', { m: m.beats, bt: m.beatType, bpm: m.bpm });
    }
    const host = document.getElementById('cello-score');
    host?.classList.remove('cello-score--follow');
    if (window.ScorePdf?.hasPdf()) await showPdf();
  }

  function renderYtSaved() {
    const host = document.getElementById('cello-yt-saved');
    if (!host) return;
    const list = savedVideos();
    host.innerHTML = list.length
      ? list.map(v => `<button type="button" class="cello-yt-chip" data-yt-play="${v.id}" title="${esc(v.title)}">${esc(v.title)}</button>`).join('')
      : `<p class="cello-yt-hint">${t('cello_yt_none')}</p>`;
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function normalizeResults(data) {
    const rows = Array.isArray(data) ? data : (data.videos || data.items || []);
    if (!Array.isArray(rows)) return [];
    return rows.map(item => {
      const id = item.id || item.videoId || parseVideoId(item.url || item.link || '');
      const title = item.title || item.name || id;
      const thumb = item.thumb
        || item.thumbnail
        || item.videoThumbnails?.[0]?.url
        || (id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : '');
      return id ? { id, title, thumb } : null;
    }).filter(Boolean).slice(0, 8);
  }

  function paintHits(hits) {
    const box = document.getElementById('cello-yt-results');
    if (!box) return;
    box.innerHTML = hits.map(v => `
      <button type="button" class="cello-yt-hit" data-yt-add="${v.id}" data-yt-title="${esc(v.title)}">
        <img src="${esc(v.thumb)}" alt="" width="120" height="68">
        <span>${esc(v.title)}</span>
      </button>`).join('');
  }

  function addPasted() {
    const inp = document.getElementById('cello-yt-paste');
    const id = parseVideoId(inp?.value);
    if (id) {
      addVideo(id, inp.value);
      inp.value = '';
    }
  }

  async function searchYoutube(q) {
    const box = document.getElementById('cello-yt-results');
    const st = document.getElementById('cello-yt-status');
    if (box) box.innerHTML = '';
    if (st) st.textContent = t('cello_yt_searching');
    for (const make of YT_APIS) {
      try {
        const res = await fetch(make(q));
        if (!res.ok) continue;
        const hits = normalizeResults(await res.json());
        if (!hits.length) continue;
        if (st) st.textContent = '';
        paintHits(hits);
        return;
      } catch {}
    }
    const href = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
    if (st) st.innerHTML = `${t('cello_yt_fail')} <a href="${href}" target="_blank" rel="noopener">${t('cello_yt_open')}</a>`;
    window.open(href, '_blank', 'noopener');
  }

  function currentPiece() {
    return catalog.find(p => p.id === pieceId) || catalog[0] || EXAMPLE;
  }

  async function loadCatalog() {
    try {
      const res = await fetch('scores/catalog.json');
      if (!res.ok) return;
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length) {
        catalog = rows.map(p => ({
          id: p.id || p.xml,
          title: p.title || p.id,
          url: p.xml || p.url,
          pdf: p.pdf || '',
          bpm: p.bpm || EXAMPLE.bpm,
          ytQuery: p.ytQuery || '',
        })).filter(p => p.url);
      }
    } catch {}
    paintPieceSelect();
  }

  function paintPieceSelect() {
    const sel = document.getElementById('cello-piece');
    if (!sel) return;
    sel.innerHTML = catalog.map(p => `<option value="${esc(p.id)}"${p.id === pieceId ? ' selected' : ''}>${esc(p.title || p.id)}</option>`).join('');
  }

  function scoreMeta() {
    return window.ScoreFollow?.getMeta?.() || { bpm: EXAMPLE.bpm, beats: 3, beatType: 4 };
  }

  function applyScoreMetro() {
    const m = scoreMeta();
    window.TrainerAudio?.setMetroMeter?.(m.beats, m.beatType);
    if (window.TrainerAudio?.setMetroBpm) window.TrainerAudio.setMetroBpm(m.bpm);
    const bpm = document.getElementById('metro-bpm');
    if (bpm) {
      bpm.value = m.bpm;
      const val = document.getElementById('metro-bpm-val');
      if (val) val.textContent = String(m.bpm);
    }
  }

  async function showPdf() {
    const host = document.getElementById('cello-score');
    if (!host || !window.ScorePdf?.hasPdf()) return;
    host.classList.add('cello-score--pdf');
    await window.ScorePdf.render(host);
  }

  async function loadExample(id) {
    const piece = catalog.find(p => p.id === id) || currentPiece();
    pieceId = piece.id;
    paintPieceSelect();
    const q = document.getElementById('cello-yt-q');
    if (q && piece.ytQuery) q.value = piece.ytQuery;
    const st = document.getElementById('cello-status');
    try {
      if (piece.pdf && window.ScorePdf) {
        await window.ScorePdf.loadUrl(piece.pdf);
        await showPdf();
      } else {
        window.ScorePdf?.destroy?.();
        document.getElementById('cello-score')?.classList.remove('cello-score--pdf');
      }
      const res = await fetch(piece.url);
      if (res.ok && window.ScoreFollow) window.ScoreFollow.loadXml(await res.text());
      exampleLoaded = true;
      applyScoreMetro();
      const pages = window.ScorePdf?.pageInfo()?.pages;
      const m = scoreMeta();
      if (st) {
        st.textContent = pages
          ? t('cello_pdf_ready', { n: pages, m: m.beats, bt: m.beatType, bpm: m.bpm })
          : t('cello_example_ready', { m: m.beats, bt: m.beatType, bpm: m.bpm });
      }
    } catch {
      if (st) st.textContent = t('cello_example_err');
    }
  }

  function render() {
    const on = listenOn();
    return `<div class="cello-app" data-mod="cello">
      <header class="cello-head">
        <p class="cello-kicker">${t('cello_kicker')}</p>
        <h1 class="cello-title">${t('cello_piece')}</h1>
        <p class="cello-sub">${t('cello_piece_sub')}</p>
      </header>
      <div class="cello-studio">
        <aside class="cello-dock" aria-label="${t('cello_play')}">
          <button type="button" class="cello-btn cello-btn--play" id="cello-play" aria-pressed="false">${t('cello_play')}</button>
          <button type="button" class="cello-btn" id="cello-stop">${t('cello_stop')}</button>
          <button type="button" class="cello-btn cello-listen-btn${on ? ' on' : ''}" id="cello-listen" aria-pressed="${on}">${t('cello_listen')}</button>
          <label class="cello-btn cello-upload-btn">
            <input type="file" id="cello-upload" accept=".pdf,.xml,.musicxml,.mxl,.mid,.midi" hidden>
            ${t('cello_upload')}
          </label>
          <label class="cello-piece-wrap">
            <span>${t('cello_piece_pick')}</span>
            <select id="cello-piece" class="cello-piece" aria-label="${t('cello_piece_pick')}"></select>
          </label>
          <div class="cello-pdf-bar" id="cello-pdf-bar" hidden>
            <button type="button" class="cello-btn" id="cello-pdf-prev" aria-label="${t('cello_pdf_prev')}">‹</button>
            <span id="cello-pdf-info">—</span>
            <button type="button" class="cello-btn" id="cello-pdf-next" aria-label="${t('cello_pdf_next')}">›</button>
          </div>
          <p class="cello-status" id="cello-status" aria-live="polite">${t('cello_ready')}</p>
          <div class="cello-tuner-row">
            <b id="cello-tuner">—</b>
            <div class="cello-cents" id="cello-cents" aria-hidden="true"><i></i></div>
          </div>
        </aside>
        <div class="cello-score-wrap">
          <div class="cello-score" id="cello-score"></div>
        </div>
        <aside class="cello-yt" aria-label="${t('cello_yt_label')}">
          <div class="cello-yt-now" id="cello-yt-now" hidden>
            <h2 class="cello-yt-title">${t('cello_yt_label')}</h2>
            <p class="cello-yt-now-title" id="cello-yt-now-title"></p>
            <button type="button" class="cello-btn" id="cello-yt-change">${t('cello_yt_change')}</button>
          </div>
          <div class="cello-yt-browse" id="cello-yt-browse">
            <h2 class="cello-yt-title">${t('cello_yt_label')}</h2>
            <form class="cello-yt-form" id="cello-yt-form">
              <input type="search" class="cello-yt-input" id="cello-yt-q" value="${esc(EXAMPLE.ytQuery)}" placeholder="${t('cello_yt_ph')}" autocomplete="off">
              <button type="submit" class="cello-btn">${t('cello_yt_go')}</button>
            </form>
            <form class="cello-yt-form" id="cello-yt-paste-form">
              <input type="url" class="cello-yt-input" id="cello-yt-paste" placeholder="${t('cello_yt_paste')}" autocomplete="off">
              <button type="submit" class="cello-btn">${t('cello_yt_add')}</button>
            </form>
            <p class="cello-yt-status" id="cello-yt-status"></p>
            <div class="cello-yt-results" id="cello-yt-results"></div>
            <h3 class="cello-yt-saved-label">${t('cello_yt_saved')}</h3>
            <div class="cello-yt-saved" id="cello-yt-saved"></div>
          </div>
          <div class="cello-yt-player">
            <iframe id="cello-yt-frame" hidden title="YouTube" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe>
            <p class="cello-yt-hint" id="cello-yt-empty">${t('cello_yt_empty')}</p>
          </div>
        </aside>
      </div>
    </div>`;
  }

  function bindOnce() {
    if (bound) return;
    bound = true;
    document.addEventListener('change', async e => {
      if (e.target.id === 'cello-upload') {
        const file = e.target.files?.[0];
        if (!file) return;
        const st = document.getElementById('cello-status');
        const name = (file.name || '').toLowerCase();
        try {
          exampleLoaded = false;
          if (name.endsWith('.pdf') && window.ScorePdf) {
            const n = await window.ScorePdf.loadFile(file);
            await showPdf();
            if (st) st.textContent = t('cello_pdf_loaded', { n });
            return;
          }
          if (!window.ScoreFollow) return;
          window.ScorePdf?.destroy?.();
          document.getElementById('cello-score')?.classList.remove('cello-score--pdf');
          await window.ScoreFollow.loadFile(file);
          applyScoreMetro();
          await window.ScoreFollow.render(document.getElementById('cello-score'));
          const m = scoreMeta();
          if (st) st.textContent = t('cello_loaded', { n: window.ScoreFollow.getNotes().length, m: m.beats, bt: m.beatType, bpm: m.bpm });
        } catch {
          if (st) st.textContent = t('cello_load_err');
        }
        return;
      }
      if (e.target.id === 'cello-yt-paste') addPasted();
      if (e.target.id === 'cello-piece' && e.target.value) {
        if (following) stopFollow(false);
        exampleLoaded = false;
        loadExample(e.target.value);
      }
    });
    document.addEventListener('keydown', e => {
      if (!document.querySelector('.cello-app') || !window.ScorePdf?.hasPdf()) return;
      if (e.target.matches('input, textarea')) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); window.ScorePdf.go(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); window.ScorePdf.go(1); }
    });
    document.addEventListener('submit', e => {
      if (e.target.id === 'cello-yt-form') {
        e.preventDefault();
        const q = document.getElementById('cello-yt-q')?.value.trim();
        if (q) searchYoutube(q);
        return;
      }
      if (e.target.id === 'cello-yt-paste-form') {
        e.preventDefault();
        addPasted();
      }
    });
    document.addEventListener('click', e => {
      if (!document.querySelector('.cello-app')) return;
      const add = e.target.closest('[data-yt-add]');
      if (add) { addVideo(add.dataset.ytAdd, add.dataset.ytTitle); return; }
      const playVid = e.target.closest('[data-yt-play]');
      if (playVid) { setPlayer(playVid.dataset.ytPlay, playVid.textContent); return; }
      if (e.target.closest('#cello-pdf-prev')) { window.ScorePdf?.go(-1); return; }
      if (e.target.closest('#cello-pdf-next')) { window.ScorePdf?.go(1); return; }
      if (e.target.closest('#cello-yt-change')) {
        ytBrowse = true;
        syncFocus();
        const q = document.getElementById('cello-yt-q')?.value.trim();
        const box = document.getElementById('cello-yt-results');
        if (q && box && !box.children.length) searchYoutube(q);
        return;
      }
      if (e.target.closest('#cello-listen')) { setListen(!listenOn()); return; }
      if (e.target.closest('#cello-play')) { startFollow(); return; }
      if (e.target.closest('#cello-stop')) { stopFollow(false); }
    });
  }

  async function mount() {
    bindOnce();
    setMode(true);
    const stage = document.getElementById('page-stage');
    if (stage) stage.dataset.mod = 'cello';
    window.CelloEngine?.init();
    if (listenOn()) startMic();
    syncListenUI();
    await loadCatalog();
    renderYtSaved();
    if (ytCurrent) setPlayer(ytCurrent, ytTitle);
    else syncFocus();
    const q = document.getElementById('cello-yt-q')?.value.trim();
    const box = document.getElementById('cello-yt-results');
    if (!ytCurrent && q && box && !box.children.length && !box.dataset.searched) {
      box.dataset.searched = '1';
      searchYoutube(q);
    }
    if (window.ScorePdf?.hasPdf()) {
      await showPdf();
    } else if (window.ScoreFollow?.getNotes?.()?.length) {
      await window.ScoreFollow.render(document.getElementById('cello-score'));
    } else if (!exampleLoaded) {
      await loadExample();
    }
  }

  function leave() {
    window.PitchDetect?.stop();
    window.ScoreFollow?.stop?.();
    if (window.TrainerAudio?.isMetroRunning?.()) window.TrainerAudio.toggleMetro();
    window.TrainerAudio?.setMetroMeter?.(4, 4);
    following = false;
    exampleLoaded = false;
    setMode(false);
    const stage = document.getElementById('page-stage');
    if (stage) delete stage.dataset.mod;
  }

  return { render, mount, leave, onLangChange() { syncListenUI(); } };
})();

window.Cello = Cello;
