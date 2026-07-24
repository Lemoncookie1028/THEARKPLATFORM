// Main app initialization
document.addEventListener('DOMContentLoaded', function() {
  // Setup auth UI
  setupAuthUI();
  
  // Initialize feed after auth
  onAuthStateChanged((user) => {
    if (user) {
      initFeed();
      setupProfileUI();
    }
  });
  
  // Handle auth errors
  auth.onAuthStateChanged((user) => {
    // Auth state is handled in auth.js
  });
});

// Additional UI setup
function setupProfileUI() {
  // Profile button
  const profileBtn = document.getElementById('profileBtn');
  if (profileBtn) {
    profileBtn.addEventListener('click', async function() {
      if (!currentUser) return;
      const profile = await loadUserProfile(currentUser.uid);
      if (profile) {
        showToast('Viewing profile: ' + profile.displayName);
        // Open profile modal or navigate
      }
    });
  }
}
