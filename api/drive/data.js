import { getDriveData, saveDriveDataRoute } from '../../server/routes/drive.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return getDriveData(req, res);
  }
  if (req.method === 'POST') {
    return saveDriveDataRoute(req, res);
  }
  res.statusCode = 405;
  res.end('Method Not Allowed');
}
