const { send, handleOptions, bearerToken, deleteSession } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });

  const token = bearerToken(req);
  if (!token) return send(res, 200, { ok: true });

  try {
    await deleteSession(token);
    return send(res, 200, { ok: true });
  } catch (err) {
    console.error('[api/auth/logout]', err);
    return send(res, 500, { error: 'logout failed' });
  }
};
