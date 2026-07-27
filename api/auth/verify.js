const { authenticate } = require('../_lib/auth');
const { applyCors } = require('../_lib/cors');

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await authenticate(req, res, () => {
    res.status(200).json({ valid: true, userId: req.userId });
  });
};
