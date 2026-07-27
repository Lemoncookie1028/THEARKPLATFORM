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

    const { draftId } = req.body;
    if (!draftId) {
      return res.status(400).json({ error: 'draftId is required' });
    }

    try {
      await db.collection('drafts').doc(draftId).update({
        status: 'rejected',
        reviewedBy: req.userId,
        reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Draft reject error:', error);
      res.status(500).json({ error: 'Failed to reject draft' });
    }
  });
};
