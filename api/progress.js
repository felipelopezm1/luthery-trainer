const { Redis } = require('@upstash/redis');
const {
  send, handleOptions, bearerToken, getSession, validAnonUid,
} = require('./_lib/auth');

const redis = Redis.fromEnv();

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

async function resolveUid(req) {
  const token = bearerToken(req);
  if (token) {
    const session = await getSession(token);
    if (session?.userId) return session.userId;
  }
  const uid = req.method === 'GET' ? req.query.uid : req.body?.uid;
  if (validAnonUid(uid)) return uid;
  return null;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(res);

  const uid = await resolveUid(req);
  if (!uid) return send(res, 401, { error: 'unauthorized' });

  const progressKey = `bele:progress:${uid}`;
  const userKey = `bele:user:${uid}`;

  try {
    if (req.method === 'GET') {
      const [progress, user] = await redis.mget(progressKey, userKey);
      return send(res, 200, { progress, user, uid });
    }

    if (req.method === 'PUT') {
      const { progress, level, name } = req.body || {};
      if (!progress || typeof progress !== 'object') {
        return send(res, 400, { error: 'progress required' });
      }
      const updatedAt = Date.now();
      await redis.set(progressKey, { progress, level: level || 'medium', updatedAt });

      const existingUser = await redis.get(userKey);
      const userPayload = {
        ...(existingUser || {}),
        updatedAt,
        createdAt: existingUser?.createdAt || updatedAt,
      };
      if (typeof name === 'string' && name.trim()) {
        userPayload.name = name.trim().slice(0, 64);
      }
      await redis.set(userKey, userPayload);

      return send(res, 200, { ok: true, updatedAt, uid });
    }

    if (req.method === 'DELETE') {
      await redis.del(progressKey, userKey);
      return send(res, 200, { ok: true });
    }

    return send(res, 405, { error: 'method not allowed' });
  } catch (err) {
    console.error('[api/progress]', err);
    return send(res, 500, { error: 'storage error' });
  }
};
