const { applyCors } = require('../_lib/cors');
const { db, admin } = require('../_lib/firebase');
const { authenticate } = require('../_lib/auth');

const VALID_REASONS = ['misleading', 'spam', 'harassment', 'other'];

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await authenticate(req, res, async () => {
    const { postId, reason } = req.body;

    if (!postId) return res.status(400).json({ error: 'postId is required' });
    if (!VALID_REASONS.includes(reason)) {
      return res.status(400).json({ error: 'Invalid reason' });
    }

    try {
      const postDoc = await db.collection('posts').doc(postId).get();
      if (!postDoc.exists) {
        return res.status(404).json({ error: 'Post not found' });
      }

      await db.collection('flags').add({
        postId,
        postHeadline: postDoc.data().headline || '',
        reason,
        reportedBy: req.userId,
        status: 'open',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Flag create error:', error);
      res.status(500).json({ error: 'Failed to file report' });
    }
  });
};
