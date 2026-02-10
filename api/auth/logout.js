import { authLogout } from '../../server/routes/auth.js';

export default async function handler(req, res) {
  return authLogout(req, res);
}
