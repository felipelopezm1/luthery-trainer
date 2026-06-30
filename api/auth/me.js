const {
  send, handleOptions, bearerToken, getSession, getUserById, publicUser, getRedis,
} = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' });

  const token = bearerToken(req);
  if (!token) return send(res, 401, { error: 'unauthorized' });

  try {
    const session = await getSession(token);
    if (!session?.userId) return send(res, 401, { error: 'unauthorized' });

    const user = await getUserById(session.userId);
    if (!user) return send(res, 401, { error: 'unauthorized' });

    const redis = getRedis();
    const count = await redis.get('bele:auth:count');

    return send(res, 200, {
      user: publicUser(user),
      registeredUsers: typeof count === 'number' ? count : parseInt(count || '0', 10) || 0,
    });
  } catch (err) {
    console.error('[api/auth/me]', err);
    return send(res, 500, { error: 'session error' });
  }
};
