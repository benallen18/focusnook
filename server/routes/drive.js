import { json, sendJson } from '../http.js';
import { getSessionUserId } from '../session.js';
import { loadDriveData, saveDriveData } from '../driveService.js';

export const getDriveData = async (req, res) => {
  try {
    const userId = getSessionUserId(req);
    if (!userId) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    const data = await loadDriveData(userId);
    sendJson(res, 200, data || {});
  } catch (err) {
    console.error('Drive load failed:', err);
    if (err?.code === 'AUTH_REQUIRED') {
      sendJson(res, 401, { error: 'Drive authorization expired' });
      return;
    }
    sendJson(res, 500, { error: 'Drive load failed' });
  }
};

export const saveDriveDataRoute = async (req, res) => {
  try {
    const userId = getSessionUserId(req);
    if (!userId) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    const body = await json(req);
    const payload = body?.data ?? body;
    await saveDriveData(userId, payload || {});
    sendJson(res, 200, { ok: true });
  } catch (err) {
    console.error('Drive save failed:', err);
    if (err?.code === 'AUTH_REQUIRED') {
      sendJson(res, 401, { error: 'Drive authorization expired' });
      return;
    }
    sendJson(res, 500, { error: 'Drive save failed' });
  }
};
