const { send, handleOptions } = require('./_lib/auth');

const ENDPOINTS = [
  q => `https://api.piped.private.coffee/search?q=${encodeURIComponent(q)}&filter=videos`,
  q => `https://pipedapi.adminforge.de/search?q=${encodeURIComponent(q)}&filter=videos`,
];

function videoIdFromUrl(url) {
  const m = String(url || '').match(/[?&]v=([\w-]{11})|\/watch\/([\w-]{11})|youtu\.be\/([\w-]{11})/);
  return m ? (m[1] || m[2] || m[3] || '') : '';
}

function normalize(data) {
  const rows = Array.isArray(data) ? data : (data.items || []);
  return rows.map(item => {
    const id = item.videoId || videoIdFromUrl(item.url || item.link || '');
    const title = item.title || item.name || id;
    const thumbs = item.videoThumbnails;
    const thumb = (thumbs && thumbs[0] && thumbs[0].url)
      || item.thumbnail
      || (id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : '');
    return id ? { id, title, thumb } : null;
  }).filter(Boolean).slice(0, 8);
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' });

  const q = String(req.query.q || '').trim().slice(0, 120);
  if (!q) return send(res, 400, { error: 'query required' });

  for (const make of ENDPOINTS) {
    try {
      const r = await fetch(make(q), {
        headers: { Accept: 'application/json', 'User-Agent': 'luthery-trainer' },
        signal: AbortSignal.timeout(6000),
      });
      if (!r.ok) continue;
      const videos = normalize(await r.json());
      if (videos.length) return send(res, 200, { videos });
    } catch {}
  }
  return send(res, 502, { error: 'search_failed' });
};
