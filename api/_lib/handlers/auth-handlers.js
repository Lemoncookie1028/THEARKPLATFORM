const { admin, db, auth } = require('../firebase');
const { validateEmail, validatePassword, validateDisplayName } = require('../validation');
const { generateToken } = require('../auth');
const { authenticate } = require('../auth');

async function signin(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (!process.env.FIREBASE_API_KEY) {
    console.error('FIREBASE_API_KEY is not set — cannot verify passwords');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  try {
    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );

    const verifyData = await verifyRes.json();

    if (!verifyRes.ok) {
      const code = verifyData.error?.message || '';
      // Deliberately the same message for "no such account" and "wrong
      // password" — telling them apart would let anyone probe which emails
      // are registered (Firebase itself returns one combined code for the
      // same reason). The UI explains this to the user instead.
      if (code.startsWith('EMAIL_NOT_FOUND') || code.startsWith('INVALID_PASSWORD') || code.startsWith('INVALID_LOGIN_CREDENTIALS')) {
        return res.status(401).json({ error: 'Incorrect email or password', code: 'invalid-credentials' });
      }
      if (code.startsWith('TOO_MANY_ATTEMPTS_TRY_LATER')) {
        return res.status(429).json({ error: 'Too many failed attempts. Wait a few minutes, or reset your password.', code: 'too-many-attempts' });
      }
      if (code.startsWith('USER_DISABLED')) {
        return res.status(403).json({ error: 'This account has been disabled.', code: 'user-disabled' });
      }
      console.error('Signin verify error:', verifyData);
      return res.status(500).json({ error: 'Something went wrong on our end. Please try again.', code: 'server-error' });
    }

    const userRecord = await auth.getUser(verifyData.localId);
    const token = generateToken(userRecord.uid, email);

    res.status(200).json({
      success: true,
      user: { id: userRecord.uid, email: userRecord.email, displayName: userRecord.displayName },
      token,
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Something went wrong on our end. Please try again.', code: 'server-error' });
  }
}

async function signup(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, displayName } = req.body;

  if (!email || !password || !displayName) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'That doesn\'t look like a valid email address', code: 'invalid-email' });
  }
  if (!validatePassword(password)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters and include both letters and numbers', code: 'weak-password' });
  }
  if (!validateDisplayName(displayName)) {
    return res.status(400).json({ error: 'Display name must be 2–50 characters', code: 'invalid-name' });
  }

  try {
    const userRecord = await auth.createUser({ email, password, displayName, emailVerified: false });

    await db.collection('users').doc(userRecord.uid).set({
      id: userRecord.uid,
      email,
      displayName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isAdmin: false,
      isVerifier: false,
      reputation: 0,
      savedPosts: [],
      followersCount: 0,
    });

    await db.collection('creators').doc(userRecord.uid).set({
      id: userRecord.uid,
      name: displayName,
      initials: displayName.substring(0, 2).toUpperCase(),
      handle: '@' + displayName.toLowerCase().replace(/\s/g, ''),
      role: 'creator',
      bio: 'Passionate about sharing knowledge',
      followers: 0,
      isVerified: false,
      isVerifier: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const token = generateToken(userRecord.uid, email);

    res.status(201).json({
      success: true,
      user: { id: userRecord.uid, email: userRecord.email, displayName: userRecord.displayName },
      token,
    });
  } catch (error) {
    console.error('Signup error:', error);
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ error: 'An account with this email already exists. Try signing in instead.', code: 'email-in-use' });
    }
    res.status(500).json({ error: 'Something went wrong on our end. Please try again.', code: 'server-error' });
  }
}

async function signout(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.status(200).json({ success: true, message: 'Signed out successfully' });
}

async function verify(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  await authenticate(req, res, () => {
    res.status(200).json({ valid: true, userId: req.userId });
  });
}

async function resetPassword(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;
  if (!email || !validateEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (!process.env.FIREBASE_API_KEY) {
    console.error('FIREBASE_API_KEY is not set — cannot send reset emails');
    return res.status(500).json({ error: 'Something went wrong on our end. Please try again.', code: 'server-error' });
  }

  try {
    // auth.generatePasswordResetLink() only *creates* a link — it never
    // sends anything, so the old version reported success while no email
    // ever went out. sendOobCode is the call that actually sends Firebase's
    // built-in reset email.
    const sendRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${process.env.FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestType: 'PASSWORD_RESET', email }),
      }
    );

    if (!sendRes.ok) {
      const data = await sendRes.json().catch(() => ({}));
      const code = data.error?.message || '';
      // Unknown email: answer exactly like success, so this endpoint can't
      // be used to find out which emails have accounts.
      if (!code.startsWith('EMAIL_NOT_FOUND')) {
        if (code.startsWith('TOO_MANY_ATTEMPTS_TRY_LATER')) {
          return res.status(429).json({ error: 'Too many requests. Please wait a few minutes and try again.', code: 'too-many-attempts' });
        }
        console.error('Password reset error:', data);
        return res.status(500).json({ error: 'Something went wrong on our end. Please try again.', code: 'server-error' });
      }
    }

    res.status(200).json({ success: true, message: 'If an account exists for that email, a reset link is on its way.' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Something went wrong on our end. Please try again.', code: 'server-error' });
  }
}

module.exports = { signin, signup, signout, verify, resetPassword };
