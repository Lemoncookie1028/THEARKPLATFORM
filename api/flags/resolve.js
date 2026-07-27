const { applyCors } = require('../_lib/cors');
const { db, admin } = require('../_lib/firebase');
const { authenticate } = require('../_lib/auth');
const { isAdmin } = require('../_lib/admin');

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await authenticate(req, res, async () => {
    if (!(await isAdmin(req.userId))) {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { flagId, action } = req.body;
    if (!flagId || !['dismiss', 'remove'].includes(action)) {
      return res.status(400).json({ error: 'flagId and a valid action are required' });
    }

    try {
      const flagRef = db.collection('flags').doc(flagId);
      const flagDoc = await flagRef.get();
      if (!flagDoc.exists) {
        return res.status(404).json({ error: 'Flag not found' });
      }

      if (action === 'remove') {
        const { postId } = flagDoc.data();
        if (postId) {
          await db.collection('posts').doc(postId).delete();
          // Close out any other open flags against the same post — no
          // point leaving duplicates in the queue for content that's gone.
          const otherFlags = await db.collection('flags')
            .where('postId', '==', postId)
            .where('status', '==', 'open')
            .get();
          const batch = db.batch();
          otherFlags.forEach(doc => {
            batch.update(doc.ref, {
              status: 'resolved',
              resolution: 'removed',
              resolvedBy: req.userId,
              resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          });
          await batch.commit();
        }
      } else {
        await flagRef.update({
          status: 'resolved',
          resolution: 'dismissed',
          resolvedBy: req.userId,
          resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Flag resolve error:', error);
      res.status(500).json({ error: 'Failed to resolve flag' });
    }
  });
};
