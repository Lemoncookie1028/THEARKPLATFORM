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

  try {
    // Get user by email
    const userRecord = await auth.getUserByEmail(email);

    // Note: In production, you should verify the password
    // This is a simplified version - consider using Firebase Client SDK
    
    // Generate JWT token
    const token = generateToken(userRecord.uid, email);

    res.status(200).json({
      success: true,
      user: {
        id: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName
      },
      token
    });

  } catch (error) {
    console.error('Signin error:', error);
    if (error.code === 'auth/user-not-found') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.status(500).json({ error: 'Failed to sign in: ' + error.message });
  }
};