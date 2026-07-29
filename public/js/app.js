// Main app initialization
// API_URL comes from config.js, loaded earlier — do not redeclare it here.

// Check if user is authenticated
async function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) return false;

  try {
    // Verify token with backend
    const response = await fetch(`${API_URL}/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) {
      // Token is invalid/expired (e.g. JWT_SECRET rotated on a deploy) —
      // clear it instead of leaving a dead token sitting in localStorage,
      // which would otherwise keep failing silently on every future load.
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return response.ok;
  } catch {
    return false;
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', async function() {
  const isAuthenticated = await checkAuth();
  
  if (isAuthenticated) {
    try {
      currentUser = JSON.parse(localStorage.getItem('user'));
    } catch {
      currentUser = null;
    }
    showApp();
    initFeed();
  } else {
    showAuth();
  }
  
  setupAuthUI();
  setupFeedUI();
});

function showApp() {
  document.getElementById('authContainer').style.display = 'none';
  document.getElementById('appContainer').style.display = 'block';
}

function showAuth() {
  document.getElementById('authContainer').style.display = 'flex';
  document.getElementById('appContainer').style.display = 'none';
}

// Sign out
async function handleSignOut() {
  try {
    await fetch(`${API_URL}/auth/signout`, { method: 'POST' });
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showAuth();
    showToast('Signed out successfully');
  } catch (error) {
    showToast('Sign out failed: ' + error.message);
  }
}

// Setup sign out button
document.addEventListener('DOMContentLoaded', function() {
  const signOutBtn = document.getElementById('signOutBtn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', handleSignOut);
  }
});