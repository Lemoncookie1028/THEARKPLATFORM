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
      if (code.startsWith('EMAIL_NOT_FOUND') || code.startsWith('INVALID_PASSWORD') || code.startsWith('INVALID_LOGIN_CREDENTIALS')) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      console.error('Signin verify error:', verifyData);
      return res.status(500).json({ error: 'Failed to sign in' });
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
    res.status(500).json({ error: 'Failed to sign in: ' + error.message });
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
    return res.status(400).json({ error: 'Invalid email format' });
  }
  if (!validatePassword(password)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters with letters and numbers' });
  }
  if (!validateDisplayName(displayName)) {
    return res.status(400).json({ error: 'Display name must be 2-50 characters' });
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
      return res.status(400).json({ error: 'Email already in use' });
    }
    res.status(500).json({ error: 'Failed to create account: ' + error.message });
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

  try {
    await auth.generatePasswordResetLink(email);
    res.status(200).json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Failed to send reset email' });
  }
}

module.exports = { signin, signup, signout, verify, resetPassword };
