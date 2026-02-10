import { authCallback } from '../../../server/routes/auth.js';

export default async function handler(req, res) {
  return authCallback(req, res);
}
