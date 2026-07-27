const { auth } = require('../_lib/firebase');
const { validateEmail } = require('../_lib/validation');
const { applyCors } = require('../_lib/cors');

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email || !validateEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    // Send password reset email
    await auth.generatePasswordResetLink(email);
    
    res.status(200).json({ 
      success: true, 
      message: 'Password reset email sent' 
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Failed to send reset email' });
  }
};