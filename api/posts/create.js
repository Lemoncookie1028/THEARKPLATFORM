const { db } = require('../_lib/firebase');
const { authenticate } = require('../_lib/auth');
const { validatePost, sanitizeInput } = require('../_lib/validation');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate user
  await authenticate(req, res, async () => {
    const { type, headline, content, videoUrl, duration, slides, sourceName, sourceUrl, snippet, topicId, sources } = req.body;
    const userId = req.userId;

    // Validate post
    const validation = validatePost({ type, headline, content });
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    try {
      // Get creator info
      const creatorDoc = await db.collection('creators').doc(userId).get();
      const creatorData = creatorDoc.exists ? creatorDoc.data() : null;

      const postData = {
        type: type,
        headline: sanitizeInput(headline),
        creatorId: userId,
        creatorName: creatorData?.name || 'Anonymous',
        creatorInitials: creatorData?.initials || 'AN',
        creatorRole: creatorData?.role || 'creator',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        sourceCount: sources?.length || 0,
        views: 0,
        saves: 0,
        shares: 0
      };

      // Add type-specific fields
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

      if (topicId) {
        postData.topicId = topicId;
      }

      // Create post
      const postRef = await db.collection('posts').add(postData);

      // Add sources if provided
      if (sources && sources.length > 0) {
        const batch = db.batch();
        sources.forEach(source => {
          const sourceRef = postRef.collection('sources').doc();
          batch.set(sourceRef, {
            ...source,
            addedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        });
        await batch.commit();
      }

      res.status(201).json({
        success: true,
        id: postRef.id,
        ...postData
      });

    } catch (error) {
      console.error('Create post error:', error);
      res.status(500).json({ error: 'Failed to create post' });
    }
  });
};