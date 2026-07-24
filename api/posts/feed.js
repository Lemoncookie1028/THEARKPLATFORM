const { db } = require('../_lib/firebase');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { limit = 20, topic, type } = req.query;

  try {
    let query = db.collection('posts')
      .orderBy('timestamp', 'desc')
      .limit(parseInt(limit));

    if (topic) {
      query = query.where('topicId', '==', topic);
    }

    if (type) {
      query = query.where('type', '==', type);
    }

    const snapshot = await query.get();
    const posts = [];

    snapshot.forEach(doc => {
      posts.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.status(200).json({ posts });

  } catch (error) {
    console.error('Feed error:', error);
    res.status(500).json({ error: 'Failed to load feed' });
  }
};