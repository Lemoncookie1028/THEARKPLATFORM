// Profile management
async function loadUserProfile(userId) {
  try {
    const doc = await db.collection('users').doc(userId).get();
    if (doc.exists) {
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error loading profile:', error);
    return null;
  }
}

async function loadCreatorProfile(userId) {
  try {
    const doc = await db.collection('creators').doc(userId).get();
    if (doc.exists) {
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error loading creator:', error);
    return null;
  }
}

async function updateProfile(userId, updates) {
  try {
    await db.collection('users').doc(userId).update(updates);
    await db.collection('creators').doc(userId).update({
      name: updates.displayName || null,
      bio: updates.bio || null,
      role: updates.role || null
    });
    showToast('Profile updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating profile:', error);
    showToast('Update failed: ' + error.message);
    return false;
  }
}

async function followCreator(creatorId) {
  if (!currentUser) {
    showToast('Please sign in to follow');
    return false;
  }
  
  try {
    const followRef = db.collection('users')
      .doc(currentUser.id)
      .collection('follows')
      .doc(creatorId);
    
    const doc = await followRef.get();
    
    if (doc.exists) {
      // Unfollow
      await followRef.delete();
      await db.collection('creators').doc(creatorId).update({
        followers: firebase.firestore.FieldValue.increment(-1)
      });
      showToast('Unfollowed');
      return false;
    } else {
      // Follow
      await followRef.set({
        followedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await db.collection('creators').doc(creatorId).update({
        followers: firebase.firestore.FieldValue.increment(1)
      });
      showToast('Followed');
      return true;
    }
  } catch (error) {
    console.error('Error following:', error);
    showToast('Follow failed: ' + error.message);
    return false;
  }
}

async function loadTrendingTopics() {
  try {
    const snapshot = await db.collection('topics')
      .orderBy('trending', 'desc')
      .limit(5)
      .get();
    
    const topics = [];
    snapshot.forEach(doc => {
      topics.push({ id: doc.id, ...doc.data() });
    });
    return topics;
  } catch (error) {
    console.error('Error loading topics:', error);
    return [];
  }
}

async function loadTopCreators() {
  try {
    const snapshot = await db.collection('creators')
      .orderBy('followers', 'desc')
      .limit(5)
      .get();
    
    const creators = [];
    snapshot.forEach(doc => {
      creators.push({ id: doc.id, ...doc.data() });
    });
    return creators;
  } catch (error) {
    console.error('Error loading creators:', error);
    return [];
  }
}