import crypto from 'node:crypto';

const SESSION_COOKIE = 'focusnook_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

const getSecret = () => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('Missing SESSION_SECRET env var');
  }
  return secret;
};

const base64url = (input) => {
  return Buffer.from(input).toString('base64url');
};

const sign = (payload) => {
  const secret = getSecret();
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
};

const parseCookies = (cookieHeader = '') => {
  return cookieHeader.split(';').reduce((acc, part) => {
    const [key, ...rest] = part.trim().split('=');
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
};

export const createSessionToken = (userId) => {
  const payload = {
    userId,
    iat: Date.now(),
    exp: Date.now() + SESSION_TTL_MS,
  };
  const encoded = base64url(JSON.stringify(payload));
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
};

export const verifySessionToken = (token) => {
  if (!token) return null;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;
  const expected = sign(encoded);
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!payload?.userId || payload.exp < Date.now()) return null;
    return payload.userId;
  } catch {
    return null;
  }
};

export const getSessionUserId = (req) => {
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies[SESSION_COOKIE];
  return verifySessionToken(token);
};

export const setSessionCookie = (res, token) => {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const cookie = `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(
    SESSION_TTL_MS / 1000
  )}${secure}`;
  res.setHeader('Set-Cookie', cookie);
};

export const clearSessionCookie = (res) => {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
  );
};

export const setOAuthStateCookie = (res, state) => {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const cookie = `focusnook_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure}`;
  res.setHeader('Set-Cookie', cookie);
};

export const readOAuthStateCookie = (req) => {
  const cookies = parseCookies(req.headers.cookie || '');
  return cookies.focusnook_oauth_state || null;
};

export const clearOAuthStateCookie = (res) => {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `focusnook_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
  );
};
