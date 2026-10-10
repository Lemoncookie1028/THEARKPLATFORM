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

// Builds an Error that carries a machine-readable code, so the form can show
// the right message in the right place instead of one generic toast.
function authError(message, code, status) {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  return err;
}

async function authRequest(path, body, fallbackMessage) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (networkError) {
    throw authError("Couldn't reach the server. Check your internet connection and try again.", 'network', 0);
  }

  let data = {};
  try {
    data = await response.json();
  } catch (e) {
    // Non-JSON response (e.g. a hosting error page) — fall through to the fallback message
  }

  if (!response.ok) {
    throw authError(data.error || fallbackMessage, data.code || 'unknown', response.status);
  }
  return data;
}

// Sign up. Errors are thrown for the form to display inline (not toasted here).
async function signUp(email, password, displayName) {
  const data = await authRequest('/auth/signup', { email, password, displayName }, 'Sign up failed. Please try again.');

  // Store token and user data
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));

  await ensureFirebaseSession(email, password);
  if (firebase.auth().currentUser && !firebase.auth().currentUser.emailVerified) {
    await sendVerificationEmail();
  }

  showToast('Account created successfully!');
  return data;
}

// Sign in. Errors are thrown for the form to display inline (not toasted here).
async function signIn(email, password) {
  const data = await authRequest('/auth/signin', { email, password }, 'Sign in failed. Please try again.');

  // Store token and user data
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));

  await ensureFirebaseSession(email, password);

  showToast('Welcome back!');
  return data;
}

// Reset password (also used from Settings, which relies on the toasts here)
async function resetPassword(email) {
  try {
    const data = await authRequest('/auth/reset-password', { email }, 'Could not send the reset email. Please try again.');
    showToast('If an account exists for that email, a reset link is on its way.', 4000);
    return data;
  } catch (error) {
    showToast(error.message, 4000);
    throw error;
  }
}

// ---- Login form feedback helpers ----

const AUTH_GROUPS = { email: 'emailGroup', password: 'passwordGroup', displayName: 'nameGroup' };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/; // mirrors validatePassword() on the server

function setFieldError(field, message) {
  document.getElementById(AUTH_GROUPS[field]).classList.add('has-error');
  document.getElementById(`${field}Error`).textContent = message || '';
}

function clearFieldError(field) {
  document.getElementById(AUTH_GROUPS[field]).classList.remove('has-error');
  document.getElementById(`${field}Error`).textContent = '';
}

function showAuthBanner(message, kind = 'error') {
  const banner = document.getElementById('authError');
  banner.textContent = message;
  banner.className = kind === 'info' ? 'auth-info' : 'auth-error';
  banner.style.display = 'block';
}

function clearAuthErrors() {
  Object.keys(AUTH_GROUPS).forEach(clearFieldError);
  const banner = document.getElementById('authError');
  banner.textContent = '';
  banner.style.display = 'none';
  document.getElementById('resetPasswordLink').classList.remove('attention');
}

// Decides which message goes where, based on what actually went wrong.
function showAuthFailure(error) {
  const passwordInput = document.getElementById('password');

  switch (error.code) {
    case 'invalid-credentials':
      // We can't (and deliberately don't) say which of the two was wrong —
      // telling "no such account" apart from "wrong password" would let
      // anyone check which emails are registered. Highlight both, say so
      // plainly, and give them the tools to check their own typing.
      setFieldError('email');
      setFieldError('password');
      showAuthBanner('Incorrect email or password. Check both and try again — tap "Show" to see what you typed.');
      document.getElementById('resetPasswordLink').classList.add('attention');
      passwordInput.focus();
      passwordInput.select();
      break;
    case 'too-many-attempts':
      showAuthBanner(error.message);
      document.getElementById('resetPasswordLink').classList.add('attention');
      break;
    case 'email-in-use':
    case 'invalid-email':
      setFieldError('email', error.message);
      document.getElementById('email').focus();
      break;
    case 'weak-password':
      setFieldError('password', error.message);
      passwordInput.focus();
      break;
    case 'invalid-name':
      setFieldError('displayName', error.message);
      document.getElementById('displayName').focus();
      break;
    default:
      // network, server-error, user-disabled, unknown
      showAuthBanner(error.message);
  }
}

// Setup auth UI
function setupAuthUI() {
  const authForm = document.getElementById('authForm');
  const authSubmit = document.getElementById('authSubmit');
  const authToggle = document.getElementById('authToggle');
  const resetPasswordLink = document.getElementById('resetPasswordLink');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const nameInput = document.getElementById('displayName');
  const passwordToggle = document.getElementById('passwordToggle');
  const capsHint = document.getElementById('capsLockHint');

  let currentMode = 'signin';

  function setSubmitting(isSubmitting) {
    authSubmit.disabled = isSubmitting;
    if (isSubmitting) {
      authSubmit.textContent = currentMode === 'signup' ? 'Creating account…' : 'Signing in…';
    } else {
      authSubmit.textContent = currentMode === 'signup' ? 'Create Account' : 'Sign In';
    }
  }

  // Toggle between sign in and sign up
  authToggle.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (!button) return;

    currentMode = button.dataset.mode;
    authToggle.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    clearAuthErrors();

    const nameGroup = document.getElementById('nameGroup');
    if (currentMode === 'signup') {
      nameGroup.style.display = 'block';
      passwordInput.setAttribute('autocomplete', 'new-password');
    } else {
      nameGroup.style.display = 'none';
      passwordInput.setAttribute('autocomplete', 'current-password');
    }
    setSubmitting(false);
  });

  // Editing a field clears its error (and the banner), so stale messages don't linger
  [['email', emailInput], ['password', passwordInput], ['displayName', nameInput]].forEach(([field, input]) => {
    input.addEventListener('input', () => {
      clearFieldError(field);
      const banner = document.getElementById('authError');
      banner.style.display = 'none';
      resetPasswordLink.classList.remove('attention');
    });
  });

  // Show / hide password — lets people check their own typing
  passwordToggle.addEventListener('click', () => {
    const wasShowing = passwordInput.type === 'text';
    passwordInput.type = wasShowing ? 'password' : 'text';
    passwordToggle.textContent = wasShowing ? 'Show' : 'Hide';
    passwordToggle.setAttribute('aria-label', wasShowing ? 'Show password' : 'Hide password');
    passwordInput.focus();
  });

  // Caps Lock is one of the most common reasons a correct password "fails"
  const updateCapsHint = (e) => {
    const on = e.getModifierState && e.getModifierState('CapsLock');
    capsHint.style.display = on ? 'block' : 'none';
  };
  passwordInput.addEventListener('keydown', updateCapsHint);
  passwordInput.addEventListener('keyup', updateCapsHint);
  passwordInput.addEventListener('blur', () => { capsHint.style.display = 'none'; });

  // Handle form submission
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (authSubmit.disabled) return;
    clearAuthErrors();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const displayName = nameInput.value.trim();

    // Catch obvious problems before making a network request, and say exactly what's wrong
    const problems = [];
    if (!email) {
      problems.push(['email', 'Enter your email address']);
    } else if (!EMAIL_PATTERN.test(email)) {
      problems.push(['email', "That doesn't look like a valid email address"]);
    }
    if (!password) {
      problems.push(['password', 'Enter your password']);
    } else if (currentMode === 'signup' && !PASSWORD_PATTERN.test(password)) {
      problems.push(['password', 'Use at least 8 characters, with both letters and numbers']);
    }
    if (currentMode === 'signup' && (displayName.length < 2 || displayName.length > 50)) {
      problems.push(['displayName', displayName ? 'Display name must be 2–50 characters' : 'Enter a display name']);
    }

    if (problems.length) {
      problems.forEach(([field, message]) => setFieldError(field, message));
      document.getElementById(problems[0][0]).focus();
      return;
    }

    setSubmitting(true);
    try {
      if (currentMode === 'signup') {
        await signUp(email, password, displayName);
      } else {
        await signIn(email, password);
      }
      window.location.reload();
    } catch (error) {
      showAuthFailure(error);
      setSubmitting(false);
    }
  });

  // Reset password
  resetPasswordLink.addEventListener('click', async () => {
    clearAuthErrors();
    const email = emailInput.value.trim();
    if (!email) {
      setFieldError('email', 'Enter your email above first, then tap "Forgot password?"');
      emailInput.focus();
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      setFieldError('email', "That doesn't look like a valid email address");
      emailInput.focus();
      return;
    }

    try {
      await authRequest('/auth/reset-password', { email }, 'Could not send the reset email. Please try again.');
      showAuthBanner(`If an account exists for ${email}, a reset link is on its way. Check your spam folder too.`, 'info');
    } catch (error) {
      showAuthBanner(error.message);
    }
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