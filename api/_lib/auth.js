const jwt = require('jsonwebtoken');
const { auth } = require('./firebase');

// Verify JWT token
async function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// Generate JWT token
function generateToken(userId, email) {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Verify Firebase ID token
async function verifyFirebaseToken(idToken) {
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    throw new Error('Invalid Firebase token');
  }
}

// Middleware to authenticate requests
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    // Try Firebase token first
    const decoded = await verifyFirebaseToken(token);
    req.user = decoded;
    req.userId = decoded.uid;
    next();
  } catch (error) {
    // Try JWT token
    try {
      const decoded = await verifyToken(token);
      req.user = decoded;
      req.userId = decoded.userId;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }
}

module.exports = { 
  verifyToken, 
  generateToken, 
  verifyFirebaseToken, 
  authenticate 
};