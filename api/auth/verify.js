const { authenticate } = require('../_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await authenticate(req, res, () => {
    res.status(200).json({ valid: true, userId: req.userId });
  });
};
