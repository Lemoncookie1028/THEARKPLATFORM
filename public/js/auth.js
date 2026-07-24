// Auth functions
const API_URL = '/api';

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
}