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
      const draftRef = db.collection('drafts').doc(draftId);
      const draftDoc = await draftRef.get();

      if (!draftDoc.exists) {
        return res.status(404).json({ error: 'Draft not found' });
      }

      const draft = draftDoc.data();

      // Reviewer becomes the listed author, and the post is clearly marked
      // as AI-assisted — see Section 3 of the concept doc on why source
      // transparency matters more here than on a typical feed.
      const reviewerDoc = await db.collection('creators').doc(req.userId).get();
      const reviewerName = reviewerDoc.exists ? reviewerDoc.data().displayName : 'Editor';

      const postData = {
        type: draft.type,
        headline: draft.headline,
        slides: draft.slides || [],
        sourceName: draft.sourceName,
        sourceUrl: draft.sourceUrl,
        sources: draft.sourceUrl ? [{ title: draft.sourceName, url: draft.sourceUrl }] : [],
        sourceCount: draft.sourceUrl ? 1 : 0,
        topicId: draft.topicId || undefined,
        creatorId: req.userId,
        creatorName: reviewerName,
        aiAssisted: true,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        views: 0,
        saves: 0,
        shares: 0,
      };

      await db.collection('posts').add(postData);
      await draftRef.update({ status: 'approved', reviewedBy: req.userId, reviewedAt: admin.firestore.FieldValue.serverTimestamp() });

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Draft approve error:', error);
      res.status(500).json({ error: 'Failed to approve draft' });
    }
  });
};
