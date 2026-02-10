import { buildAuthUrl, createState, exchangeCodeForTokens, getUserInfo } from '../googleAuth.js';
import { getBaseUrl, redirect, sendJson } from '../http.js';
import {
  clearOAuthStateCookie,
  clearSessionCookie,
  createSessionToken,
  getSessionUserId,
  readOAuthStateCookie,
  setOAuthStateCookie,
  setSessionCookie,
} from '../session.js';
import { getUser, setUser } from '../tokenStore.js';

export const startAuth = async (req, res) => {
  const state = createState();
  setOAuthStateCookie(res, state);
  const redirectUri = `${getBaseUrl(req)}/api/auth/google/callback`;
  const authUrl = buildAuthUrl({ redirectUri, state });
  redirect(res, authUrl);
};

export const authCallback = async (req, res) => {
  const url = new URL(req.url, getBaseUrl(req));
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const storedState = readOAuthStateCookie(req);

  if (!code || !state || !storedState || state !== storedState) {
    clearOAuthStateCookie(res);
    sendJson(res, 400, { error: 'Invalid OAuth state' });
    return;
  }

  clearOAuthStateCookie(res);

  try {
    const redirectUri = `${getBaseUrl(req)}/api/auth/google/callback`;
    const tokenData = await exchangeCodeForTokens({ code, redirectUri });

    const accessToken = tokenData.access_token;
    if (!accessToken) {
      sendJson(res, 400, { error: 'Missing access token from Google' });
      return;
    }

    const userInfo = await getUserInfo(accessToken);
    const userId = userInfo.sub;

    if (!userId) {
      sendJson(res, 400, { error: 'Missing user id from Google' });
      return;
    }

    const existing = await getUser(userId);
    const refreshToken = tokenData.refresh_token || existing?.refreshToken;

    if (!refreshToken) {
      sendJson(res, 400, { error: 'Missing refresh token from Google' });
      return;
    }

    await setUser(userId, {
      ...(existing || {}),
      refreshToken,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      updatedAt: Date.now(),
    });

    const sessionToken = createSessionToken(userId);
    setSessionCookie(res, sessionToken);
    const appBaseUrl = process.env.APP_BASE_URL || getBaseUrl(req);
    redirect(res, appBaseUrl);
  } catch (err) {
    console.error('OAuth callback failed:', err);
    sendJson(res, 500, { error: 'OAuth callback failed' });
  }
};

export const authSession = async (req, res) => {
  const userId = getSessionUserId(req);
  if (!userId) {
    sendJson(res, 200, { authenticated: false });
    return;
  }

  const user = await getUser(userId);
  if (!user) {
    sendJson(res, 200, { authenticated: false });
    return;
  }

  sendJson(res, 200, {
    authenticated: true,
    user: {
      id: userId,
      email: user.email,
      name: user.name,
      picture: user.picture,
    },
  });
};

export const authLogout = async (req, res) => {
  clearSessionCookie(res);
  sendJson(res, 200, { ok: true });
};
