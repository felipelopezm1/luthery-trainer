const { Redis } = require('@upstash/redis');

const redis = Redis.fromEnv();

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function send(res, status, body) {
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
  res.setHeader('Content-Type', 'application/json');
  return res.status(status).json(body);
}

function validUid(uid) {
  return typeof uid === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uid);
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).end();
  }

  const uid = req.method === 'GET' ? req.query.uid : req.body?.uid;
  if (!validUid(uid)) return send(res, 400, { error: 'invalid uid' });

  const progressKey = `bele:progress:${uid}`;
  const userKey = `bele:user:${uid}`;

  try {
    if (req.method === 'GET') {
      const [progress, user] = await redis.mget(progressKey, userKey);
      return send(res, 200, { progress, user });
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

      return send(res, 200, { ok: true, updatedAt });
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
