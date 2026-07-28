const { db, admin } = require('../firebase');
const { authenticate } = require('../auth');
const { isAdmin } = require('../admin');

const VALID_REASONS = ['misleading', 'spam', 'harassment', 'other'];

async function create(req, res) {
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
}

async function list(req, res) {
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
}

async function resolve(req, res) {
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
}

module.exports = { create, list, resolve };
