import { startAuth } from '../../../server/routes/auth.js';

export default async function handler(req, res) {
  return startAuth(req, res);
}
