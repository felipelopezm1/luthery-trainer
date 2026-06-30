/* Playground — free MIDI lab, multi-track record, score & save */
const Playground = (() => {
  const STORE_KEY = 'music_bele_playground';
  const TRACK_COLORS = ['var(--primary)', 'var(--muted)', '#888888'];
  const MAX_TRACKS = 3;

  let pg = freshState();
  let bound = false;

  function freshState() {
    return {
      tracks: Array.from({ length: MAX_TRACKS }, (_, i) => ({
        id: i,
        name: '',
        muted: false,
        notes: [],
      })),
      activeTrack: 0,
      recording: false,
      playing: false,
      recordT0: 0,
      pending: new Map(),
      bpm: 72,
      playEnd: 0,
      playTimers: [],
    };
  }

  function loadStore() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveStore(list) {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
  }

  function midiToVexKey(m) {
    const oct = Math.floor(m / 12) - 1;
    const chrom = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
    return `${chrom[((m % 12) + 12) % 12]}/${oct}`;
  }

  function quantizeTrack(notes, bpm) {
    const beat = 60 / bpm;
    const grid = beat / 2;
    return notes
      .map(n => {
        const s = Math.max(0, Math.round(n.start / grid) * grid);
        const e = Math.max(s + grid, Math.round(n.end / grid) * grid);
        const beats = (e - s) / beat;
        let dur = '16';
        if (beats >= 2) dur = 'h';
        else if (beats >= 1) dur = 'q';
        else if (beats >= 0.5) dur = '8';
        return { key: midiToVexKey(n.midi), dur, start: s };
      })
      .sort((a, b) => a.start - b.start);
  }

  function scoreWidth() {
    const el = document.getElementById('pg-score');
    const stage = document.getElementById('page-stage');
    return Math.min(Math.max((el?.clientWidth || stage?.clientWidth || 560) - 24, 280), 720);
  }

  function drawScore() {
    const host = document.getElementById('pg-score');
    if (!host || typeof Renderer === 'undefined') return;
    const w = scoreWidth();
    const visible = pg.tracks.filter(t => t.notes.length);
    const rows = visible.length || 1;
    const rowH = 88;
    const h = rows * rowH + 16;
    host.innerHTML = '';
    const r = new Renderer(host, Renderer.Backends.SVG);
    r.resize(w, h);
    const ctx = r.getContext();
    const drawTracks = visible.length ? visible : [pg.tracks[pg.activeTrack]];

    drawTracks.forEach((track, ti) => {
      const y = 8 + ti * rowH;
      const stave = new Stave(8, y, w - 20).addClef('treble').addTimeSignature('4/4');
      stave.setContext(ctx).draw();
      const qNotes = quantizeTrack(track.notes, pg.bpm);
      if (!qNotes.length) {
        const rest = new StaveNote({ clef: 'treble', keys: ['b/4'], duration: 'wr' });
        rest.setStyle({ fillStyle: '#555', strokeStyle: '#555' });
        const voice = new Voice({ num_beats: 4, beat_value: 4 }).setStrict(false);
        voice.addTickables([rest]);
        try { new Formatter().joinVoices([voice]).format([voice], w - 70); voice.draw(ctx, stave); } catch {}
        return;
      }
      const color = TRACK_COLORS[track.id] || 'var(--primary)';
      const vexNotes = qNotes.map(n => {
        const sn = new StaveNote({ clef: 'treble', keys: [n.key], duration: n.dur, stem_direction: 1 });
        sn.setStyle({ fillStyle: color, strokeStyle: color });
        return sn;
      });
      const voice = new Voice({ num_beats: 4, beat_value: 4 }).setStrict(false);
      voice.addTickables(vexNotes);
      try { new Formatter().joinVoices([voice]).format([voice], w - 70); voice.draw(ctx, stave); } catch {}
    });
  }

  function syncTransport() {
    const rec = document.getElementById('pg-rec');
    const play = document.getElementById('pg-play');
    const stop = document.getElementById('pg-stop');
    if (rec) {
      rec.classList.toggle('on', pg.recording);
      rec.setAttribute('aria-pressed', pg.recording ? 'true' : 'false');
    }
    if (play) play.disabled = pg.recording || pg.playing;
    if (stop) stop.disabled = !pg.recording && !pg.playing;
    document.querySelectorAll('[data-pg-track]').forEach(btn => {
      const i = +btn.dataset.pgTrack;
      btn.classList.toggle('on', i === pg.activeTrack);
      const track = pg.tracks[i];
      const count = track.notes.length;
      const lbl = btn.querySelector('.pg-track-count');
      if (lbl) lbl.textContent = String(count);
      btn.classList.toggle('muted', track.muted);
    });
    const status = document.getElementById('pg-status');
    if (status) {
      if (pg.recording) status.textContent = t('pg_recording', { n: pg.activeTrack + 1 });
      else if (pg.playing) status.textContent = t('pg_playing');
      else status.textContent = t('pg_ready');
    }
  }

  function stopPlayback() {
    pg.playTimers.forEach(id => clearTimeout(id));
    pg.playTimers = [];
    pg.playing = false;
    pg.playEnd = 0;
    syncTransport();
  }

  function stopRecording() {
    if (!pg.recording) return;
    pg.recording = false;
    pg.pending.forEach((p, midi) => {
      const end = (performance.now() - pg.recordT0) / 1000;
      if (end - p.start / 1000 > 0.05) {
        pg.tracks[pg.activeTrack].notes.push({
          midi, start: p.start / 1000, end, vel: p.vel,
        });
      }
    });
    pg.pending.clear();
    drawScore();
    syncTransport();
  }

  function startRecording() {
    stopPlayback();
    stopRecording();
    pg.recording = true;
    pg.recordT0 = performance.now();
    pg.pending.clear();
    syncTransport();
  }

  function toggleRecord() {
    if (pg.recording) stopRecording();
    else startRecording();
  }

  function playAll() {
    stopPlayback();
    const TA = window.TrainerAudio;
    if (!TA) return;
    const notes = [];
    pg.tracks.forEach(track => {
      if (track.muted) return;
      track.notes.forEach(n => notes.push(n));
    });
    if (!notes.length) return;
    pg.playing = true;
    pg.playEnd = Math.max(...notes.map(n => n.end)) + 0.2;
    syncTransport();
    notes.forEach(n => {
      const ms = Math.max(0, n.start * 1000);
      const id = setTimeout(() => TA.playMidi(n.midi, Math.max(0.12, n.end - n.start), 0, 0.62), ms);
      pg.playTimers.push(id);
    });
    const endId = setTimeout(() => {
      pg.playing = false;
      syncTransport();
    }, pg.playEnd * 1000);
    pg.playTimers.push(endId);
  }

  function clearActiveTrack() {
    pg.tracks[pg.activeTrack].notes = [];
    drawScore();
    syncTransport();
  }

  function exportSession() {
    return {
      tracks: pg.tracks.map(tr => ({
        id: tr.id,
        name: tr.name,
        muted: tr.muted,
        notes: tr.notes.map(n => ({ ...n })),
      })),
      bpm: pg.bpm,
      activeTrack: pg.activeTrack,
    };
  }

  function importSession(data) {
    if (!data || !data.tracks) return;
    stopRecording();
    stopPlayback();
    pg.tracks = data.tracks.slice(0, MAX_TRACKS).map((tr, i) => ({
      id: i,
      name: tr.name || '',
      muted: !!tr.muted,
      notes: (tr.notes || []).map(n => ({ ...n })),
    }));
    while (pg.tracks.length < MAX_TRACKS) {
      pg.tracks.push({ id: pg.tracks.length, name: '', muted: false, notes: [] });
    }
    pg.bpm = data.bpm || 72;
    pg.activeTrack = Math.min(MAX_TRACKS - 1, data.activeTrack || 0);
    const bpmEl = document.getElementById('pg-bpm');
    if (bpmEl) bpmEl.value = pg.bpm;
    drawScore();
    syncTransport();
    renderSavedList();
  }

  function saveSession(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) return false;
    const list = loadStore();
    const entry = {
      id: Date.now().toString(36),
      name: trimmed,
      date: new Date().toISOString(),
      data: exportSession(),
    };
    list.unshift(entry);
    saveStore(list.slice(0, 40));
    renderSavedList();
    return true;
  }

  function deleteSession(id) {
    saveStore(loadStore().filter(s => s.id !== id));
    renderSavedList();
  }

  function renderSavedList() {
    const el = document.getElementById('pg-saved-list');
    if (!el) return;
    const list = loadStore();
    if (!list.length) {
      el.innerHTML = `<p class="pg-empty">${t('pg_no_saves')}</p>`;
      return;
    }
    el.innerHTML = list.map(s => {
      const d = localeDate(s.date);
      const noteCount = (s.data?.tracks || []).reduce((a, tr) => a + (tr.notes?.length || 0), 0);
      return `<div class="pg-save-row">
        <button type="button" class="pg-save-load" data-pg-load="${s.id}">
          <b>${escapeHtml(s.name)}</b><span>${d} · ${noteCount} ${t('pg_notes')}</span>
        </button>
        <button type="button" class="pg-save-del" data-pg-del="${s.id}" title="${t('pg_delete')}" aria-label="${t('pg_delete')}">✕</button>
      </div>`;
    }).join('');
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function onUserNote(on, midi, vel) {
    if (!on) {
      if (!pg.recording || !pg.pending.has(midi)) return;
      const p = pg.pending.get(midi);
      pg.pending.delete(midi);
      const end = (performance.now() - pg.recordT0) / 1000;
      const start = p.start / 1000;
      if (end - start > 0.05) {
        pg.tracks[pg.activeTrack].notes.push({ midi, start, end, vel: p.vel });
        drawScore();
        syncTransport();
      }
      return;
    }
    if (!pg.recording) return;
    pg.pending.set(midi, { start: performance.now() - pg.recordT0, vel: vel || 0.75 });
    setTimeout(() => {
      if (pg.pending.has(midi)) onUserNote(false, midi, 0);
    }, 420);
  }

  function bindAudio() {
    const TA = window.TrainerAudio;
    if (!TA) return;
    TA.clearTarget();
    TA.setUserNoteHook(onUserNote);
  }

  function unbindAudio() {
    window.TrainerAudio?.setUserNoteHook(null);
  }

  function bindEventsOnce() {
    if (bound) return;
    bound = true;
    document.addEventListener('click', e => {
      if (document.getElementById('page-stage')?.dataset.mod !== 'playground') return;
      const rec = e.target.closest('[data-pg-action="rec"]');
      if (rec) { toggleRecord(); return; }
      const play = e.target.closest('[data-pg-action="play"]');
      if (play) { playAll(); return; }
      const stop = e.target.closest('[data-pg-action="stop"]');
      if (stop) { stopRecording(); stopPlayback(); return; }
      const clr = e.target.closest('[data-pg-action="clear"]');
      if (clr) { clearActiveTrack(); return; }
      const trackBtn = e.target.closest('[data-pg-track]');
      if (trackBtn) {
        const i = +trackBtn.dataset.pgTrack;
        if (e.target.closest('[data-pg-mute]')) {
          pg.tracks[i].muted = !pg.tracks[i].muted;
        } else {
          pg.activeTrack = i;
        }
        syncTransport();
        return;
      }
      const saveBtn = e.target.closest('[data-pg-action="save"]');
      if (saveBtn) {
        const inp = document.getElementById('pg-save-name');
        if (saveSession(inp?.value)) {
          if (inp) inp.value = '';
          const fb = document.getElementById('pg-save-fb');
          if (fb) { fb.textContent = t('pg_saved'); fb.classList.add('show'); setTimeout(() => fb.classList.remove('show'), 1800); }
        }
        return;
      }
      const loadBtn = e.target.closest('[data-pg-load]');
      if (loadBtn) {
        const hit = loadStore().find(s => s.id === loadBtn.dataset.pgLoad);
        if (hit) importSession(hit.data);
        return;
      }
      const delBtn = e.target.closest('[data-pg-del]');
      if (delBtn) { deleteSession(delBtn.dataset.pgDel); return; }
      const newBtn = e.target.closest('[data-pg-action="new"]');
      if (newBtn) {
        stopRecording();
        stopPlayback();
        pg = freshState();
        pg.bpm = +document.getElementById('pg-bpm')?.value || 72;
        drawScore();
        syncTransport();
        return;
      }
    });
    document.addEventListener('input', e => {
      if (e.target.id === 'pg-bpm') {
        pg.bpm = Math.max(40, Math.min(208, +e.target.value || 72));
        drawScore();
      }
    });
  }

  function render() {
    const trackBtns = pg.tracks.map((tr, i) =>
      `<button type="button" class="pg-track-tab${i === pg.activeTrack ? ' on' : ''}${tr.muted ? ' muted' : ''}" data-pg-track="${i}">
        <span class="pg-track-label">${t('pg_track')} ${i + 1}</span>
        <span class="pg-track-count">${tr.notes.length}</span>
        <span class="pg-track-mute" data-pg-mute title="${t('pg_mute')}">M</span>
      </button>`
    ).join('');

    return `<div class="pg-wrap" data-mod="playground">
      <div class="page-meta"><span class="seq-label">${t('pg_seq')}</span></div>
      <h1 class="page-title">${t('pg_title')}</h1>
      <p class="page-lead">${t('pg_lead')}</p>

      <div class="pg-toolbar">
        <div class="pg-tabs"><span class="pg-tab on">${t('pg_tab_score')}</span></div>
        <div class="pg-transport">
          <button type="button" class="pg-btn pg-btn--rec" id="pg-rec" data-pg-action="rec" aria-pressed="false" title="${t('pg_record')}">
            <span class="pg-rec-dot"></span>${t('pg_record')}
          </button>
          <button type="button" class="pg-btn" id="pg-stop" data-pg-action="stop" title="${t('pg_stop')}">${t('pg_stop')}</button>
          <button type="button" class="pg-btn pg-btn--play" id="pg-play" data-pg-action="play" title="${t('pg_play')}">
            <svg class="ico sm"><use href="#i-play"/></svg>${t('pg_play')}
          </button>
          <label class="pg-bpm"><span>BPM</span><input type="number" id="pg-bpm" min="40" max="208" value="${pg.bpm}"></label>
          <span class="pg-status" id="pg-status">${t('pg_ready')}</span>
        </div>
      </div>

      <div class="pg-tracks-bar">${trackBtns}</div>

      <div class="pg-score-panel">
        <div class="pg-score-head"><span>${t('pg_partiture')}</span>
          <button type="button" class="btn ghost sm" data-pg-action="clear">${t('pg_clear_track')}</button>
        </div>
        <div class="pg-score" id="pg-score"></div>
        <p class="pg-hint">${t('pg_hint')}</p>
      </div>

      <div class="pg-save-panel">
        <h4 class="sub">${t('pg_save_h')}</h4>
        <div class="pg-save-row pg-save-form">
          <input type="text" id="pg-save-name" class="pg-input" maxlength="48" placeholder="${t('pg_save_ph')}" data-i18n-placeholder="pg_save_ph">
          <button type="button" class="btn btn-primary" data-pg-action="save">${t('pg_save')}</button>
          <button type="button" class="btn ghost" data-pg-action="new">${t('pg_new')}</button>
        </div>
        <span class="pg-save-fb" id="pg-save-fb">${t('pg_saved')}</span>
        <div class="pg-saved-list" id="pg-saved-list"></div>
      </div>
    </div>`;
  }

  function mount() {
    bindEventsOnce();
    bindAudio();
    const stage = document.getElementById('page-stage');
    if (stage) stage.dataset.mod = 'playground';
    drawScore();
    syncTransport();
    renderSavedList();
    const paneLabel = document.querySelector('.pane-label');
    if (paneLabel) paneLabel.textContent = t('pg_pane');
  }

  function leave() {
    stopRecording();
    stopPlayback();
    unbindAudio();
    const stage = document.getElementById('page-stage');
    if (stage) delete stage.dataset.mod;
  }

  return { render, mount, leave, onLangChange() { renderSavedList(); syncTransport(); drawScore(); } };
})();

window.Playground = Playground;
