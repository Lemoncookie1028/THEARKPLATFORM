const { admin, db, auth } = require('../firebase');
const { authenticate } = require('../auth');
const { validatePost, sanitizeInput } = require('../validation');

async function create(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await authenticate(req, res, async () => {
    const { type, headline, content, videoUrl, duration, slides, sourceName, sourceUrl, snippet, topicId, sources } = req.body;
    const userId = req.userId;

    try {
      const userRecord = await auth.getUser(userId);
      if (!userRecord.emailVerified) {
        return res.status(403).json({ error: 'Please verify your email before posting' });
      }
    } catch (err) {
      return res.status(401).json({ error: 'Could not verify account status' });
    }

    const validation = validatePost({ type, headline, content, videoUrl, slides });
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    try {
      const creatorDoc = await db.collection('creators').doc(userId).get();
      const creatorData = creatorDoc.exists ? creatorDoc.data() : null;

      const postData = {
        type,
        headline: sanitizeInput(headline),
        creatorId: userId,
        creatorName: creatorData?.name || 'Anonymous',
        creatorInitials: creatorData?.initials || 'AN',
        creatorRole: creatorData?.role || 'creator',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        sourceCount: sources?.length || 0,
        views: 0,
        saves: 0,
        shares: 0,
      };

      if (type === 'clip') {
        postData.videoUrl = videoUrl;
        postData.duration = duration;
      } else if (type === 'card') {
        postData.slides = slides;
        postData.content = sanitizeInput(content);
      } else if (type === 'article') {
        postData.content = sanitizeInput(content);
      } else if (type === 'news') {
        postData.sourceName = sourceName;
        postData.sourceUrl = sourceUrl;
        postData.snippet = sanitizeInput(snippet);
      }

      if (topicId) postData.topicId = topicId;

      postData.sources = Array.isArray(sources)
        ? sources.map(s => ({ title: sanitizeInput(s.title || ''), url: s.url || '' }))
        : [];

      const postRef = await db.collection('posts').add(postData);

      res.status(201).json({ success: true, id: postRef.id, ...postData });
    } catch (error) {
      console.error('Create post error:', error);
      res.status(500).json({ error: 'Failed to create post' });
    }
  });
}

async function feed(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { limit = 20, topic, type } = req.query;

  try {
    let query = db.collection('posts').orderBy('timestamp', 'desc').limit(parseInt(limit));
    if (topic) query = query.where('topicId', '==', topic);
    if (type) query = query.where('type', '==', type);

    const snapshot = await query.get();
    const posts = [];
    snapshot.forEach(doc => posts.push({ id: doc.id, ...doc.data() }));

    res.status(200).json({ posts });
  } catch (error) {
    console.error('Feed error:', error);
    res.status(500).json({ error: 'Failed to load feed' });
  }
}

module.exports = { create, feed };
