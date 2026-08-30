/* Cello studio — standalone practice room (not an exam module) */
const Cello = (() => {
  const LISTEN_KEY = 'music_bele_cello_listen';
  const YT_KEY = 'music_bele_cello_yt';
  const EXAMPLE = {
    url: 'scores/vivaldi-rv40-largo.xml',
    bpm: 50,
    ytQuery: 'Vivaldi RV 40 cello sonata Largo',
  };
  const YT_APIS = [
    q => `/api/youtube-search?q=${encodeURIComponent(q)}`,
    q => `https://api.piped.private.coffee/search?q=${encodeURIComponent(q)}&filter=videos`,
  ];

  let bound = false;
  let exampleLoaded = false;
  let ytCurrent = null;

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
    const frame = document.getElementById('cello-yt-frame');
    const empty = document.getElementById('cello-yt-empty');
    if (frame && id) {
      frame.src = `https://www.youtube-nocookie.com/embed/${id}`;
      frame.hidden = false;
      frame.title = title || 'YouTube';
    }
    if (empty) empty.hidden = !!id;
  }

  function addVideo(id, title) {
    if (!id) return;
    const list = savedVideos().filter(v => v.id !== id);
    list.unshift({ id, title: title || id });
    saveVideos(list);
    setPlayer(id, title);
    renderYtSaved();
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

  async function loadExample() {
    const st = document.getElementById('cello-status');
    try {
      const res = await fetch(EXAMPLE.url);
      if (!res.ok) throw new Error('fetch');
      window.ScoreFollow.loadXml(await res.text());
      await window.ScoreFollow.render(document.getElementById('cello-score'));
      exampleLoaded = true;
      if (window.TrainerAudio?.setMetroBpm) window.TrainerAudio.setMetroBpm(EXAMPLE.bpm);
      const bpm = document.getElementById('metro-bpm');
      if (bpm) {
        bpm.value = EXAMPLE.bpm;
        const val = document.getElementById('metro-bpm-val');
        if (val) val.textContent = String(EXAMPLE.bpm);
      }
      if (st) st.textContent = t('cello_example_ready');
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
      <div class="cello-bar">
        <button type="button" class="cello-btn cello-btn--play" id="cello-play">${t('cello_play')}</button>
        <button type="button" class="cello-btn" id="cello-stop">${t('cello_stop')}</button>
        <button type="button" class="cello-btn cello-listen-btn${on ? ' on' : ''}" id="cello-listen" aria-pressed="${on}">${t('cello_listen')}</button>
        <label class="cello-btn cello-upload-btn">
          <input type="file" id="cello-upload" accept=".xml,.musicxml,.mxl,.mid,.midi" hidden>
          ${t('cello_upload')}
        </label>
      </div>
      <p class="cello-status" id="cello-status" aria-live="polite">${t('cello_ready')}</p>
      <div class="cello-tuner-row">
        <b id="cello-tuner">—</b>
        <div class="cello-cents" id="cello-cents" aria-hidden="true"><i></i></div>
      </div>
      <div class="cello-layout">
        <div class="cello-score" id="cello-score"></div>
        <aside class="cello-yt" aria-label="${t('cello_yt_label')}">
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
          <div class="cello-yt-player">
            <iframe id="cello-yt-frame" hidden title="YouTube" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe>
            <p class="cello-yt-hint" id="cello-yt-empty">${t('cello_yt_empty')}</p>
          </div>
          <h3 class="cello-yt-saved-label">${t('cello_yt_saved')}</h3>
          <div class="cello-yt-saved" id="cello-yt-saved"></div>
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
        if (!file || !window.ScoreFollow) return;
        const st = document.getElementById('cello-status');
        try {
          await window.ScoreFollow.loadFile(file);
          await window.ScoreFollow.render(document.getElementById('cello-score'));
          exampleLoaded = false;
          if (st) st.textContent = t('cello_loaded', { n: window.ScoreFollow.getNotes().length });
        } catch {
          if (st) st.textContent = t('cello_load_err');
        }
        return;
      }
      if (e.target.id === 'cello-yt-paste') addPasted();
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
      if (e.target.closest('#cello-listen')) { setListen(!listenOn()); return; }
      if (e.target.closest('#cello-play')) {
        const range = document.getElementById('metro-bpm');
        window.ScoreFollow?.play({
          bpm: range ? +range.value : EXAMPLE.bpm,
          onTarget: m => window.PitchDetect?.setTarget(m),
          onEnd: () => {
            const st = document.getElementById('cello-status');
            if (st) st.textContent = t('cello_done');
          },
        });
        if (!window.TrainerAudio?.isMetroRunning?.()) window.TrainerAudio?.toggleMetro?.();
        return;
      }
      if (e.target.closest('#cello-stop')) {
        window.ScoreFollow?.stop();
        if (window.TrainerAudio?.isMetroRunning?.()) window.TrainerAudio.toggleMetro();
      }
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
    renderYtSaved();
    if (ytCurrent) setPlayer(ytCurrent);
    const q = document.getElementById('cello-yt-q')?.value.trim();
    const box = document.getElementById('cello-yt-results');
    if (q && box && !box.children.length && !box.dataset.searched) {
      box.dataset.searched = '1';
      searchYoutube(q);
    }
    const hasNotes = window.ScoreFollow?.getNotes?.()?.length;
    if (hasNotes) {
      await window.ScoreFollow.render(document.getElementById('cello-score'));
    } else if (!exampleLoaded) {
      await loadExample();
    }
  }

  function leave() {
    window.PitchDetect?.stop();
    window.ScoreFollow?.stop?.();
    exampleLoaded = false;
    setMode(false);
    const stage = document.getElementById('page-stage');
    if (stage) delete stage.dataset.mod;
  }

  return { render, mount, leave, onLangChange() { syncListenUI(); } };
})();

window.Cello = Cello;
