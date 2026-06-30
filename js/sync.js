/* Cloud sync — Upstash Redis via /api/progress */
(function () {
  const UID_KEY = 'music_bele_uid';
  const SYNC_TS_KEY = 'music_bele_sync_ts';
  const NAME_KEY = 'music_bele_name';
  let syncTimer = null;
  let status = 'idle';

  function getUid() {
    let uid = localStorage.getItem(UID_KEY);
    if (!uid) {
      uid = crypto.randomUUID();
      localStorage.setItem(UID_KEY, uid);
    }
    return uid;
  }

  function getName() {
    return localStorage.getItem(NAME_KEY) || '';
  }

  function setName(name) {
    const v = (name || '').trim().slice(0, 64);
    if (v) localStorage.setItem(NAME_KEY, v);
    else localStorage.removeItem(NAME_KEY);
  }

  function getSyncTs() {
    return parseInt(localStorage.getItem(SYNC_TS_KEY) || '0', 10);
  }

  function setSyncTs(ts) {
    localStorage.setItem(SYNC_TS_KEY, String(ts));
  }

  function emitStatus() {
    document.dispatchEvent(new CustomEvent('bele:sync', {
      detail: { status, uid: getUid(), name: getName() },
    }));
  }

  async function pull() {
    if (!navigator.onLine) {
      status = 'offline';
      emitStatus();
      return null;
    }
    try {
      const r = await fetch(`/api/progress?uid=${encodeURIComponent(getUid())}`);
      if (!r.ok) throw new Error('pull failed');
      status = 'ok';
      emitStatus();
      return r.json();
    } catch {
      status = 'offline';
      emitStatus();
      return null;
    }
  }

  async function push(progress, level, name) {
    if (!navigator.onLine) {
      status = 'offline';
      emitStatus();
      return false;
    }
    status = 'syncing';
    emitStatus();
    try {
      const r = await fetch('/api/progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: getUid(),
          progress,
          level,
          name: name ?? getName(),
        }),
      });
      if (!r.ok) throw new Error('push failed');
      const data = await r.json();
      if (data.updatedAt) setSyncTs(data.updatedAt);
      status = 'ok';
      emitStatus();
      return true;
    } catch {
      status = 'err';
      emitStatus();
      return false;
    }
  }

  function schedulePush(getProgress, getLevel) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      push(getProgress(), getLevel(), getName());
    }, 800);
  }

  async function initMerge(getProgress, getLevel, applyRemote) {
    const remote = await pull();
    const local = getProgress();
    const localTs = getSyncTs();

    if (!remote?.progress) {
      if (local.log?.length) await push(local, getLevel(), getName());
      return;
    }

    const remoteTs = remote.progress.updatedAt || 0;
    const remoteLog = remote.progress.progress?.log?.length || 0;
    const localLog = local.log?.length || 0;

    if (remoteTs > localTs || (remoteTs === localTs && remoteLog > localLog)) {
      applyRemote(remote.progress.progress, remote.progress.level);
      if (remote.user?.name) setName(remote.user.name);
      setSyncTs(remoteTs);
    } else if (localTs > remoteTs || localLog > remoteLog) {
      await push(local, getLevel(), getName());
    }
  }

  window.BeleSync = {
    getUid,
    getName,
    setName,
    pull,
    push,
    schedulePush,
    initMerge,
    getStatus: () => status,
  };
})();
