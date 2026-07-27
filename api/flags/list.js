const { applyCors } = require('../_lib/cors');
const { db } = require('../_lib/firebase');
const { authenticate } = require('../_lib/auth');
const { isAdmin } = require('../_lib/admin');

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await authenticate(req, res, async () => {
    if (!(await isAdmin(req.userId))) {
      return res.status(403).json({ error: 'Admin only' });
    }

    try {
      const snapshot = await db.collection('flags')
        .where('status', '==', 'open')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

      const flags = [];
      snapshot.forEach(doc => flags.push({ id: doc.id, ...doc.data() }));

      res.status(200).json({ flags });
    } catch (error) {
      console.error('Flags list error:', error);
      res.status(500).json({ error: 'Failed to load flags' });
    }
  });
};
