// Auth functions
// API_URL comes from config.js, loaded earlier — do not redeclare it here.
// (Redeclaring a top-level const across <script> tags throws a SyntaxError
// that silently kills the whole file — this was the bug that made every
// button on the page unresponsive.)

// Our custom JWT (from /api/auth/signin|signup) is what actually gates API
// calls — but email verification is a Firebase Auth feature, so we also
// establish a parallel Firebase Auth client session purely so we can call
// sendEmailVerification()/read emailVerified. This uses Firebase's own
// built-in email sending — no external email provider needed.
async function ensureFirebaseSession(email, password) {
  try {
    await firebase.auth().signInWithEmailAndPassword(email, password);
  } catch (error) {
    // Non-fatal — our own JWT session still works even if this fails.
    console.error('Firebase client session error:', error);
  }
}

async function sendVerificationEmail() {
  const user = firebase.auth().currentUser;
  if (!user) {
    showToast('Please sign in first');
    return;
  }
  try {
    await user.sendEmailVerification({ url: window.location.origin });
    showToast('Verification email sent — check your inbox');
  } catch (error) {
    showToast('Could not send verification email: ' + error.message);
  }
}

// Shows/hides the "verify your email" banner based on live Firebase Auth
// state. Fires on every auth state change, including the automatic
// rehydration that happens on page load.
function watchEmailVerification() {
  firebase.auth().onAuthStateChanged((user) => {
    const banner = document.getElementById('verifyBanner');
    if (!banner) return;
    banner.style.display = user && !user.emailVerified ? 'flex' : 'none';
  });
}

// Sign up
async function signUp(email, password, displayName) {
  try {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password, displayName })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Sign up failed');
    }

    // Store token and user data
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    await ensureFirebaseSession(email, password);
    if (firebase.auth().currentUser && !firebase.auth().currentUser.emailVerified) {
      await sendVerificationEmail();
    }

    showToast('Account created successfully!');
    return data;
  } catch (error) {
    showToast(error.message);
    throw error;
  }
}

// Sign in
async function signIn(email, password) {
  try {
    const response = await fetch(`${API_URL}/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Sign in failed');
    }

    // Store token and user data
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    await ensureFirebaseSession(email, password);

    showToast('Welcome back!');
    return data;
  } catch (error) {
    showToast(error.message);
    throw error;
  }
}

// Reset password
async function resetPassword(email) {
  try {
    const response = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Reset failed');
    }

    showToast('Password reset email sent');
    return data;
  } catch (error) {
    showToast(error.message);
    throw error;
  }
}

// Setup auth UI
function setupAuthUI() {
  const authForm = document.getElementById('authForm');
  const authSubmit = document.getElementById('authSubmit');
  const authToggle = document.getElementById('authToggle');
  const resetPasswordLink = document.getElementById('resetPasswordLink');
  
  let currentMode = 'signin';
  
  // Toggle between sign in and sign up
  authToggle.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (!button) return;
    
    currentMode = button.dataset.mode;
    authToggle.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
    const nameGroup = document.getElementById('nameGroup');
    if (currentMode === 'signup') {
      nameGroup.style.display = 'block';
      authSubmit.textContent = 'Create Account';
    } else {
      nameGroup.style.display = 'none';
      authSubmit.textContent = 'Sign In';
    }
  });
  
  // Handle form submission
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
      showToast('Please fill in all fields');
      return;
    }
    
    if (currentMode === 'signup') {
      const displayName = document.getElementById('displayName').value;
      if (!displayName) {
        showToast('Please enter a display name');
        return;
      }
      await signUp(email, password, displayName);
      window.location.reload();
    } else {
      await signIn(email, password);
      window.location.reload();
    }
  });
  
  // Reset password
  resetPasswordLink.addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    if (!email) {
      showToast('Please enter your email address');
      return;
    }
    await resetPassword(email);
  });

  const resendBtn = document.getElementById('resendVerifyBtn');
  if (resendBtn) resendBtn.addEventListener('click', sendVerificationEmail);

  const refreshBtn = document.getElementById('refreshVerifyBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      const user = firebase.auth().currentUser;
      if (!user) return;
      await user.reload();
      if (user.emailVerified) {
        showToast("You're verified!");
        document.getElementById('verifyBanner').style.display = 'none';
      } else {
        showToast('Still not verified — check your inbox (and spam folder)');
      }
    });
  }

  watchEmailVerification();
}