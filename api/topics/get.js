const { db } = require('../_lib/firebase');
const { applyCors } = require('../_lib/cors');

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { limit = 10 } = req.query;

  try {
    const snapshot = await db.collection('topics')
      .orderBy('trending', 'desc')
      .limit(parseInt(limit))
      .get();

    const topics = [];
    snapshot.forEach(doc => {
      topics.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.status(200).json({ topics });

  } catch (error) {
    console.error('Topics error:', error);
    res.status(500).json({ error: 'Failed to load topics' });
  }
};