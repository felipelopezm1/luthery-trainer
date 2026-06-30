const crypto = require('crypto');
const { getRedis } = require('./redis');

const SESSION_TTL = 60 * 60 * 24 * 30;
const MIN_PASSWORD = 8;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function send(res, status, body) {
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
  res.setHeader('Content-Type', 'application/json');
  return res.status(status).json(body);
}

function handleOptions(res) {
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
  return res.status(200).end();
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validPassword(password) {
  return typeof password === 'string' && password.length >= MIN_PASSWORD;
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function createPasswordRecord(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return { salt, hash: hashPassword(password, salt) };
}

function verifyPassword(password, salt, hash) {
  try {
    const attempt = hashPassword(password, salt);
    return crypto.timingSafeEqual(Buffer.from(attempt, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

function bearerToken(req) {
  const h = req.headers.authorization || req.headers.Authorization || '';
  const m = String(h).match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : '';
}

function validAnonUid(uid) {
  return typeof uid === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uid);
}

async function getSession(token) {
  if (!token) return null;
  const redis = getRedis();
  return redis.get(`bele:auth:session:${token}`);
}

async function createSession(userId) {
  const redis = getRedis();
  const token = crypto.randomBytes(32).toString('hex');
  const createdAt = Date.now();
  await redis.set(`bele:auth:session:${token}`, { userId, createdAt }, { ex: SESSION_TTL });
  return { token, createdAt };
}

async function deleteSession(token) {
  if (!token) return;
  const redis = getRedis();
  await redis.del(`bele:auth:session:${token}`);
}

async function getUserById(userId) {
  const redis = getRedis();
  return redis.get(`bele:auth:user:${userId}`);
}

async function getUserIdByEmail(email) {
  const redis = getRedis();
  return redis.get(`bele:auth:email:${normalizeEmail(email)}`);
}

async function mergeAnonProgress(anonUid, userId) {
  if (!validAnonUid(anonUid) || !userId || anonUid === userId) return;
  const redis = getRedis();
  const fromKey = `bele:progress:${anonUid}`;
  const toKey = `bele:progress:${userId}`;
  const fromUserKey = `bele:user:${anonUid}`;
  const toUserKey = `bele:user:${userId}`;
  const [fromProgress, toProgress, fromUser, toUser] = await redis.mget(fromKey, toKey, fromUserKey, toUserKey);

  if (fromProgress) {
    const useRemote = !toProgress
      || (fromProgress.updatedAt || 0) > (toProgress.updatedAt || 0);
    if (useRemote) await redis.set(toKey, fromProgress);
  }

  if (fromUser) {
    const merged = {
      ...(toUser || {}),
      ...(fromUser.name && !toUser?.name ? { name: fromUser.name } : {}),
      updatedAt: Date.now(),
      createdAt: toUser?.createdAt || fromUser.createdAt || Date.now(),
    };
    await redis.set(toUserKey, merged);
  }
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}

module.exports = {
  SESSION_TTL,
  MIN_PASSWORD,
  cors,
  send,
  handleOptions,
  normalizeEmail,
  validEmail,
  validPassword,
  createPasswordRecord,
  verifyPassword,
  bearerToken,
  validAnonUid,
  getSession,
  createSession,
  deleteSession,
  getUserById,
  getUserIdByEmail,
  mergeAnonProgress,
  publicUser,
  getRedis,
};
