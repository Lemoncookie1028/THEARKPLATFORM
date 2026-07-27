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
// --- Profile panel UI ---

function initials(name) {
  if (!name) return '--';
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

async function openProfile(userId) {
  if (!userId) return;
  const panel = document.getElementById('profilePanel');
  const isOwnProfile = currentUser && currentUser.id === userId;

  document.getElementById('profileView').style.display = 'block';
  document.getElementById('profileEditForm').style.display = 'none';

  // Own profile lives in `users`; other people's public info lives in `creators`.
  const profile = isOwnProfile
    ? await loadUserProfile(userId)
    : await loadCreatorProfile(userId);

  if (!profile) {
    showToast("Couldn't load that profile");
    return;
  }

  const name = profile.displayName || profile.name || 'Unnamed';
  document.getElementById('profileAvatar').textContent = initials(name);
  document.getElementById('profileName').textContent = name;
  document.getElementById('profileHandle').textContent = '@' + (profile.handle || userId.slice(0, 8));
  document.getElementById('profileBio').textContent = profile.bio || (isOwnProfile ? 'No bio yet — add one with Edit Profile.' : 'No bio yet.');
  document.getElementById('profileFollowers').textContent = profile.followers || 0;
  document.getElementById('profileRole').textContent = profile.role || 'reader';

  const followBtn = document.getElementById('profileFollowBtn');
  const editBtn = document.getElementById('profileEditBtn');
  const signOutBtn = document.getElementById('signOutBtn');

  if (isOwnProfile) {
    followBtn.style.display = 'none';
    editBtn.style.display = 'block';
    if (signOutBtn) signOutBtn.style.display = 'block';
    editBtn.onclick = () => {
      document.getElementById('editDisplayName').value = name;
      document.getElementById('editBio').value = profile.bio || '';
      document.getElementById('profileView').style.display = 'none';
      document.getElementById('profileEditForm').style.display = 'block';
    };
  } else {
    editBtn.style.display = 'none';
    if (signOutBtn) signOutBtn.style.display = 'none';
    followBtn.style.display = 'block';
    // We don't track per-viewer follow state locally, so just reflect the
    // action taken rather than pre-computing "already following."
    followBtn.textContent = 'Follow';
    followBtn.onclick = async () => {
      const nowFollowing = await followCreator(userId);
      followBtn.textContent = nowFollowing ? 'Following' : 'Follow';
    };
  }

  panel.dataset.userId = userId;
  panel.classList.add('open');
}

function closeProfilePanel() {
  const panel = document.getElementById('profilePanel');
  if (panel) panel.classList.remove('open');
}

function setupProfileUI() {
  const closeBtn = document.getElementById('closeProfilePanel');
  if (closeBtn) closeBtn.addEventListener('click', closeProfilePanel);

  const form = document.getElementById('profileEditForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentUser) return;
      const displayName = document.getElementById('editDisplayName').value.trim();
      const bio = document.getElementById('editBio').value.trim();
      const ok = await updateProfile(currentUser.id, { displayName, bio });
      if (ok) openProfile(currentUser.id);
    });
  }
}
