import { authSession } from '../../server/routes/auth.js';

export default async function handler(req, res) {
  return authSession(req, res);
}
