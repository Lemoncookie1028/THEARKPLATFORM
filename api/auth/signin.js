const { auth } = require('../_lib/firebase');
const { generateToken } = require('../_lib/auth');
const { validateEmail } = require('../_lib/validation');

module.exports = async (req, res) => {
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
    // The Admin SDK deliberately has no "verify this password" method — that's
    // only exposed through the Identity Toolkit REST API (the same one the
    // Firebase Client SDK calls under the hood). This is the real check that
    // was missing before: previously any email with no matching password
    // would still sign in successfully.
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

    // Password confirmed — now fetch the canonical user record and issue
    // our own JWT, same as before.
    const userRecord = await auth.getUser(verifyData.localId);
    const token = generateToken(userRecord.uid, email);

    res.status(200).json({
      success: true,
      user: {
        id: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
      },
      token,
    });

  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Failed to sign in: ' + error.message });
  }
};
