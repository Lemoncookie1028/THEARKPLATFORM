const { admin, db } = require('../_lib/firebase');
const { authenticate } = require('../_lib/auth');
const { applyCors } = require('../_lib/cors');

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await authenticate(req, res, async () => {
    const { creatorId } = req.body;
    const userId = req.userId;

    if (!creatorId) {
      return res.status(400).json({ error: 'Creator ID is required' });
    }

    if (userId === creatorId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    try {
      // Check if creator exists
      const creatorDoc = await db.collection('creators').doc(creatorId).get();
      if (!creatorDoc.exists) {
        return res.status(404).json({ error: 'Creator not found' });
      }

      // Check if already following
      const followRef = db.collection('users')
        .doc(userId)
        .collection('follows')
        .doc(creatorId);
      
      const followDoc = await followRef.get();

      if (followDoc.exists) {
        // Unfollow
        await followRef.delete();
        await db.collection('creators').doc(creatorId).update({
          followers: admin.firestore.FieldValue.increment(-1)
        });
        
        return res.status(200).json({ 
          success: true, 
          following: false,
          message: 'Unfollowed successfully'
        });
      } else {
        // Follow
        await followRef.set({
          followedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        await db.collection('creators').doc(creatorId).update({
          followers: admin.firestore.FieldValue.increment(1)
        });

        return res.status(200).json({ 
          success: true, 
          following: true,
          message: 'Followed successfully'
        });
      }

    } catch (error) {
      console.error('Follow error:', error);
      res.status(500).json({ error: 'Failed to follow/unfollow' });
    }
  });
};