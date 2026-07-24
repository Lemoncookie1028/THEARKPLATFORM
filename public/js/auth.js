// Auth state management
let currentUser = null;
let authListeners = [];

function onAuthStateChanged(callback) {
  authListeners.push(callback);
}

// Sign up with email and password
async function signUp(email, password, displayName) {
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // Update profile with display name
    if (displayName) {
      await user.updateProfile({ displayName });
    }
    
    showToast('Account created successfully!');
    return user;
  } catch (error) {
    console.error('Sign up error:', error);
    showToast('Sign up failed: ' + error.message);
    throw error;
  }
}

// Sign in with email and password
async function signIn(email, password) {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    showToast('Welcome back!');
    return userCredential.user;
  } catch (error) {
    console.error('Sign in error:', error);
    showToast('Sign in failed: ' + error.message);
    throw error;
  }
}

// Sign out
async function signOut() {
  try {
    await auth.signOut();
    showToast('Signed out successfully');
  } catch (error) {
    console.error('Sign out error:', error);
    showToast('Sign out failed: ' + error.message);
  }
}

// Reset password
async function resetPassword(email) {
  try {
    await auth.sendPasswordResetEmail(email);
    showToast('Password reset email sent to ' + email);
  } catch (error) {
    console.error('Password reset error:', error);
    showToast('Reset failed: ' + error.message);
  }
}

// Auth UI handlers
function setupAuthUI() {
  const authContainer = document.getElementById('authContainer');
  const appContainer = document.getElementById('appContainer');
  const authForm = document.getElementById('authForm');
  const authSubmit = document.getElementById('authSubmit');
  const authToggle = document.getElementById('authToggle');
  const resetPasswordLink = document.getElementById('resetPasswordLink');
  const signOutBtn = document.getElementById('signOutBtn');
  
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
    } else {
      await signIn(email, password);
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
  
  // Sign out
  signOutBtn.addEventListener('click', async () => {
    await signOut();
  });
}

// Auth state observer
auth.onAuthStateChanged(user => {
  currentUser = user;
  
  const authContainer = document.getElementById('authContainer');
  const appContainer = document.getElementById('appContainer');
  
  if (user) {
    authContainer.style.display = 'none';
    appContainer.style.display = 'block';
    // Notify listeners
    authListeners.forEach(callback => callback(user));
  } else {
    authContainer.style.display = 'flex';
    appContainer.style.display = 'none';
  }
});