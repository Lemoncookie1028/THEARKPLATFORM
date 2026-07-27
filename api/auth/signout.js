const { applyCors } = require('../_lib/cors');
module.exports = async (req, res) => {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Client-side signout is handled on the frontend
  // This endpoint is just for logging
  res.status(200).json({ success: true, message: 'Signed out successfully' });
};