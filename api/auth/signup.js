const { admin, db, auth } = require('../_lib/firebase');
const { validateEmail, validatePassword, validateDisplayName } = require('../_lib/validation');
const { generateToken } = require('../_lib/auth');
const { applyCors } = require('../_lib/cors');

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, displayName } = req.body;

  // Validation
  if (!email || !password || !displayName) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (!validatePassword(password)) {
    return res.status(400).json({ 
      error: 'Password must be at least 8 characters with letters and numbers' 
    });
  }

  if (!validateDisplayName(displayName)) {
    return res.status(400).json({ error: 'Display name must be 2-50 characters' });
  }

  try {
    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
      emailVerified: false
    });

    // Create user document in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      id: userRecord.uid,
      email: email,
      displayName: displayName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isAdmin: false,
      isVerifier: false,
      reputation: 0,
      savedPosts: [],
      followersCount: 0
    });

    // Create creator profile
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
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Generate JWT token
    const token = generateToken(userRecord.uid, email);

    res.status(201).json({
      success: true,
      user: {
        id: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName
      },
      token
    });

  } catch (error) {
    console.error('Signup error:', error);
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ error: 'Email already in use' });
    }
    res.status(500).json({ error: 'Failed to create account: ' + error.message });
  }
};