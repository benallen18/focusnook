import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const isVercel = process.env.VERCEL === '1';
const dataDir = isVercel ? os.tmpdir() : path.join(process.cwd(), 'server', 'data');
const storeFile = path.join(dataDir, 'tokens.json');
const useKv = Boolean(
  (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
  (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
);
let kvClient = null;

const getKv = async () => {
  if (!useKv) return null;
  if (kvClient) return kvClient;
  const mod = await import('@vercel/kv');

  if (process.env.KV_REST_API_URL) {
    kvClient = mod.kv;
  } else {
    kvClient = mod.createClient({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  return kvClient;
};

const readFileStore = async () => {
  try {
    const raw = await fs.readFile(storeFile, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    throw err;
  }
};

const writeFileStore = async (data) => {
  await fs.mkdir(path.dirname(storeFile), { recursive: true });
  await fs.writeFile(storeFile, JSON.stringify(data, null, 2), 'utf8');
};

export const getUser = async (userId) => {
  if (!userId) return null;

  if (useKv) {
    const kv = await getKv();
    return (await kv.get(`gdrive:${userId}`)) || null;
  }

  const data = await readFileStore();
  return data[userId] || null;
};

export const setUser = async (userId, userData) => {
  if (!userId) return;

  if (useKv) {
    const kv = await getKv();
    await kv.set(`gdrive:${userId}`, userData);
    return;
  }

  const data = await readFileStore();
  data[userId] = userData;
  await writeFileStore(data);
};

export const deleteUser = async (userId) => {
  if (!userId) return;

  if (useKv) {
    const kv = await getKv();
    await kv.del(`gdrive:${userId}`);
    return;
  }

  const data = await readFileStore();
  delete data[userId];
  await writeFileStore(data);
};
