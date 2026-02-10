import { refreshAccessToken } from './googleAuth.js';
import { getUser, setUser } from './tokenStore.js';

const accessTokenCache = new Map();
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const CONFIG_FILENAME = 'focusnook-data.json';

const isAuthStatus = (status) => status === 401 || status === 403;

class DriveAuthRequiredError extends Error {
  constructor(message = 'Google Drive authorization is no longer valid') {
    super(message);
    this.name = 'DriveAuthRequiredError';
    this.code = 'AUTH_REQUIRED';
  }
}

const getCachedAccessToken = (userId) => {
  const cached = accessTokenCache.get(userId);
  if (!cached) return null;
  if (cached.expiry <= Date.now()) {
    accessTokenCache.delete(userId);
    return null;
  }
  return cached.token;
};

const setCachedAccessToken = (userId, token, expiresIn) => {
  const expiry = Date.now() + (Math.max(0, Number(expiresIn || 3600) - 60) * 1000);
  accessTokenCache.set(userId, { token, expiry });
};

const invalidateCachedAccessToken = (userId) => {
  accessTokenCache.delete(userId);
};

export const getAccessTokenForUser = async (userId) => {
  const cached = getCachedAccessToken(userId);
  if (cached) return cached;

  const user = await getUser(userId);
  if (!user?.refreshToken) {
    throw new DriveAuthRequiredError('Missing refresh token for user');
  }

  let refreshed;
  try {
    refreshed = await refreshAccessToken(user.refreshToken);
  } catch (error) {
    throw new DriveAuthRequiredError(error.message);
  }

  if (!refreshed?.access_token) {
    throw new DriveAuthRequiredError('Refresh token response missing access_token');
  }

  setCachedAccessToken(userId, refreshed.access_token, refreshed.expires_in);
  return refreshed.access_token;
};

const withDriveTokenRetry = async (userId, requestFactory) => {
  const execute = async () => {
    const accessToken = await getAccessTokenForUser(userId);
    return requestFactory(accessToken);
  };

  let res = await execute();
  if (!isAuthStatus(res.status)) {
    return res;
  }

  invalidateCachedAccessToken(userId);
  res = await execute();
  if (isAuthStatus(res.status)) {
    throw new DriveAuthRequiredError();
  }

  return res;
};

const findConfigFileId = async (userId) => {
  const q = `name = '${CONFIG_FILENAME}' and trashed = false`;
  const params = new URLSearchParams({
    q,
    fields: 'files(id, name)',
  });

  const res = await withDriveTokenRetry(userId, (accessToken) =>
    fetch(`${DRIVE_API}/files?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive list failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  const files = data.files || [];
  return files.length > 0 ? files[0].id : null;
};

const createConfigFile = async (userId) => {
  const metadata = {
    name: CONFIG_FILENAME,
    mimeType: 'application/json',
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([JSON.stringify({})], { type: 'application/json' }));

  const res = await withDriveTokenRetry(userId, (accessToken) =>
    fetch(`${DRIVE_UPLOAD}/files?uploadType=multipart`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    })
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive create failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.id;
};

export const getConfigFileIdForUser = async (userId) => {
  const user = await getUser(userId);
  if (user?.fileId) return user.fileId;

  let fileId = await findConfigFileId(userId);
  if (!fileId) {
    fileId = await createConfigFile(userId);
  }

  await setUser(userId, {
    ...(user || {}),
    fileId,
  });

  return fileId;
};

export const loadDriveData = async (userId) => {
  const fileId = await getConfigFileIdForUser(userId);

  const res = await withDriveTokenRetry(userId, (accessToken) =>
    fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive load failed: ${res.status} ${text}`);
  }

  return res.json();
};

export const saveDriveData = async (userId, data) => {
  const fileId = await getConfigFileIdForUser(userId);

  const res = await withDriveTokenRetry(userId, (accessToken) =>
    fetch(`${DRIVE_UPLOAD}/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data ?? {}),
    })
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive save failed: ${res.status} ${text}`);
  }

  return res.json();
};
