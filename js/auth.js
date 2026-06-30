/* Auth client — sessions via Upstash Redis API */
(function () {
  const TOKEN_KEY = 'music_bele_token';
  const USER_KEY = 'music_bele_user';
  const ANON_UID_KEY = 'music_bele_uid';
  const GUEST_KEY = 'music_bele_guest';

  let cachedUser = null;

  function loadStoredUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || '';
  }

  function getUser() {
    return cachedUser || loadStoredUser();
  }

  function getUserId() {
    return getUser()?.id || '';
  }

  function isLoggedIn() {
    return !!getToken() && !!getUserId();
  }

  function isGuest() {
    return localStorage.getItem(GUEST_KEY) === '1';
  }

  function getAnonUid() {
    let uid = localStorage.getItem(ANON_UID_KEY);
    if (!uid) {
      uid = crypto.randomUUID();
      localStorage.setItem(ANON_UID_KEY, uid);
    }
    return uid;
  }

  function persistSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.removeItem(GUEST_KEY);
    cachedUser = user;
    document.dispatchEvent(new CustomEvent('bele:auth', { detail: { user, guest: false } }));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    cachedUser = null;
    document.dispatchEvent(new CustomEvent('bele:auth', { detail: { user: null, guest: isGuest() } }));
  }

  function continueAsGuest() {
    clearSession();
    localStorage.setItem(GUEST_KEY, '1');
    document.dispatchEvent(new CustomEvent('bele:auth', { detail: { user: null, guest: true } }));
  }

  function clearGuest() {
    localStorage.removeItem(GUEST_KEY);
  }

  function authHeaders(extra) {
    const h = { ...(extra || {}) };
    const token = getToken();
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }

  async function signup(name, email, password) {
    const r = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, anonUid: getAnonUid() }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'signup failed');
    persistSession(data.token, data.user);
    return data;
  }

  async function login(email, password) {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, anonUid: getAnonUid() }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'login failed');
    persistSession(data.token, data.user);
    return data;
  }

  async function fetchMe() {
    const token = getToken();
    if (!token) return null;
    try {
      const r = await fetch('/api/auth/me', { headers: authHeaders() });
      if (!r.ok) {
        clearSession();
        return null;
      }
      const data = await r.json();
      if (data.user) {
        persistSession(token, data.user);
        return data;
      }
      clearSession();
      return null;
    } catch {
      return getUser();
    }
  }

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: authHeaders() });
    } catch {}
    clearSession();
    clearGuest();
  }

  function updateUserChip() {
    const chip = document.getElementById('user-chip');
    if (!chip) return;
    const user = getUser();
    if (user) {
      chip.innerHTML = `<span class="user-name" title="${user.email}">${user.name}</span>
        <button type="button" class="user-out" id="auth-logout" data-i18n="auth_sign_out">${t('auth_sign_out')}</button>`;
      return;
    }
    if (isGuest()) {
      chip.innerHTML = `<span class="user-guest">${t('auth_guest_mode')}</span>
        <a class="user-link" href="login.html">${t('auth_sign_in')}</a>`;
      return;
    }
    chip.innerHTML = `<a class="user-link" href="login.html">${t('auth_sign_in')}</a>`;
  }

  cachedUser = loadStoredUser();

  window.BeleAuth = {
    getToken,
    getUser,
    getUserId,
    getAnonUid,
    isLoggedIn,
    isGuest,
    authHeaders,
    signup,
    login,
    fetchMe,
    logout,
    continueAsGuest,
    updateUserChip,
  };
})();
