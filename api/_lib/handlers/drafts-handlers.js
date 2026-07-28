const { db, admin } = require('../firebase');
const { authenticate } = require('../auth');
const { isAdmin } = require('../admin');
const { draftCardFromNews, draftOriginalCard } = require('../ai');

const TOPICS = ['Monetary Policy', 'Space', 'Health'];

async function list(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await authenticate(req, res, async () => {
    if (!(await isAdmin(req.userId))) {
      return res.status(403).json({ error: 'Admin only' });
    }

    try {
      const snapshot = await db.collection('drafts')
        .where('status', '==', 'pending')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

      const drafts = [];
      snapshot.forEach(doc => drafts.push({ id: doc.id, ...doc.data() }));

      res.status(200).json({ drafts });
    } catch (error) {
      console.error('Drafts list error:', error);
      res.status(500).json({ error: 'Failed to load drafts' });
    }
  });
}

async function approve(req, res) {
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
}

async function reject(req, res) {
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
}

async function generateDaily(req, res) {
  // Cron-only — same pattern as news ingest.
  const authHeader = req.headers.authorization;
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const results = { drafted: 0, errors: [] };

  for (const topic of TOPICS) {
    try {
      const draft = await draftOriginalCard(topic);

      await db.collection('drafts').add({
        type: 'card',
        headline: draft.headline,
        slides: draft.slides,
        sourceName: null,
        sourceUrl: null,
        origin: 'daily-generated',
        topicId: topic,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      results.drafted += 1;
    } catch (err) {
      results.errors.push(`${topic}: ${err.message}`);
    }
  }

  res.status(200).json(results);
}

module.exports = { list, approve, reject, generateDaily };
