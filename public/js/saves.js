// Save/unsave posts, and the Saved panel. Uses the same direct-Firestore
// pattern as followCreator() in profile.js — a per-user subcollection
// (users/{uid}/saved/{postId}), owner-only per firestore.rules.

async function toggleSave(postId, buttonEl) {
  if (!currentUser) {
    showToast('Please sign in to save posts');
    return;
  }

  const saveRef = db.collection('users').doc(currentUser.id).collection('saved').doc(postId);

  try {
    const doc = await saveRef.get();
    if (doc.exists) {
      await saveRef.delete();
      if (buttonEl) buttonEl.classList.remove('saved');
      showToast('Removed from saved');
    } else {
      await saveRef.set({ savedAt: firebase.firestore.FieldValue.serverTimestamp() });
      if (buttonEl) buttonEl.classList.add('saved');
      showToast('Saved');
    }
  } catch (error) {
    showToast('Could not update saved posts');
  }
}

async function loadSavedPosts() {
  const list = document.getElementById('savedList');
  if (!currentUser) { showToast('Please sign in first'); return; }

  list.innerHTML = '<p style="color:#6f6d66; font-size:12px;">Loading…</p>';

  try {
    const savedSnap = await db.collection('users').doc(currentUser.id).collection('saved')
      .orderBy('savedAt', 'desc')
      .get();

    if (savedSnap.empty) {
      list.innerHTML = '<p style="color:#6f6d66; font-size:12px;">Nothing saved yet — tap the bookmark icon on any post.</p>';
      return;
    }

    // Posts are public-read, so these are plain client-side gets — no API
    // round trip needed. Firestore doesn't batch-get with a single client
    // call across arbitrary IDs cleanly, so this is a get() per saved post;
    // fine at the scale of "someone's personal saved list."
    const postDocs = await Promise.all(
      savedSnap.docs.map(d => db.collection('posts').doc(d.id).get())
    );

    list.innerHTML = '';
    postDocs.forEach(doc => {
      if (!doc.exists) return; // post was since removed/moderated
      list.appendChild(buildCardEl({ id: doc.id, ...doc.data() }));
    });

    if (!list.children.length) {
      list.innerHTML = '<p style="color:#6f6d66; font-size:12px;">Everything you saved has since been removed.</p>';
    }
  } catch (error) {
    list.innerHTML = '<p style="color:#6f6d66; font-size:12px;">Could not load saved posts.</p>';
  }
}

function openSavedPanel() {
  if (!currentUser) { showToast('Please sign in first'); return; }
  document.getElementById('savedPanel').classList.add('open');
  loadSavedPosts();
}

function closeSavedPanel() {
  document.getElementById('savedPanel').classList.remove('open');
}

function setupSavesUI() {
  const toggleBtn = document.getElementById('savedToggleBtn');
  if (toggleBtn) toggleBtn.addEventListener('click', openSavedPanel);

  const closeBtn = document.getElementById('closeSavedPanel');
  if (closeBtn) closeBtn.addEventListener('click', closeSavedPanel);
}
