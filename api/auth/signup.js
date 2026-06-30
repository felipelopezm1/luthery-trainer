const crypto = require('crypto');
const {
  send, handleOptions, normalizeEmail, validEmail, validPassword,
  createPasswordRecord, createSession, getUserIdByEmail, mergeAnonProgress,
  publicUser, validAnonUid, getRedis,
} = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });

  const { name, email, password, anonUid } = req.body || {};
  const normEmail = normalizeEmail(email);

  if (!validEmail(normEmail)) return send(res, 400, { error: 'invalid email' });
  if (!validPassword(password)) return send(res, 400, { error: 'password too short' });
  if (typeof name !== 'string' || !name.trim()) return send(res, 400, { error: 'name required' });

  try {
    const redis = getRedis();
    const existing = await getUserIdByEmail(normEmail);
    if (existing) return send(res, 409, { error: 'email taken' });

    const userId = crypto.randomUUID();
    const createdAt = Date.now();
    const { salt, hash } = createPasswordRecord(password);
    const user = {
      id: userId,
      email: normEmail,
      name: name.trim().slice(0, 64),
      salt,
      hash,
      createdAt,
    };

    await redis.set(`bele:auth:email:${normEmail}`, userId);
    await redis.set(`bele:auth:user:${userId}`, user);
    await redis.incr('bele:auth:count');

    if (validAnonUid(anonUid)) await mergeAnonProgress(anonUid, userId);

    const session = await createSession(userId);
    return send(res, 201, {
      token: session.token,
      user: publicUser(user),
      expiresIn: 60 * 60 * 24 * 30,
    });
  } catch (err) {
    console.error('[api/auth/signup]', err);
    return send(res, 500, { error: 'signup failed' });
  }
};
