const {
  send, handleOptions, normalizeEmail, validEmail, validPassword,
  verifyPassword, createSession, getUserIdByEmail, getUserById,
  mergeAnonProgress, publicUser, validAnonUid,
} = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });

  const { email, password, anonUid } = req.body || {};
  const normEmail = normalizeEmail(email);

  if (!validEmail(normEmail)) return send(res, 400, { error: 'invalid email' });
  if (!validPassword(password)) return send(res, 400, { error: 'invalid credentials' });

  try {
    const userId = await getUserIdByEmail(normEmail);
    if (!userId) return send(res, 401, { error: 'invalid credentials' });

    const user = await getUserById(userId);
    if (!user || !verifyPassword(password, user.salt, user.hash)) {
      return send(res, 401, { error: 'invalid credentials' });
    }

    if (validAnonUid(anonUid)) await mergeAnonProgress(anonUid, userId);

    const session = await createSession(userId);
    return send(res, 200, {
      token: session.token,
      user: publicUser(user),
      expiresIn: 60 * 60 * 24 * 30,
    });
  } catch (err) {
    console.error('[api/auth/login]', err);
    return send(res, 500, { error: 'login failed' });
  }
};
