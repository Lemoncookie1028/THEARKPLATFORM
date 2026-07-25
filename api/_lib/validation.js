// Validation functions
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validatePassword(password) {
  // Minimum 8 characters, at least one letter and one number
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
}

function validateDisplayName(name) {
  return name && name.length >= 2 && name.length <= 50;
}

function validatePost(data) {
  const { type, headline, content, videoUrl, slides } = data;
  if (!type || !['clip', 'card', 'article', 'news'].includes(type)) {
    return { valid: false, error: 'Invalid post type' };
  }
  if (!headline || headline.length < 3) {
    return { valid: false, error: 'Headline must be at least 3 characters' };
  }
  if (type === 'article' && (!content || content.length < 10)) {
    return { valid: false, error: 'Article content must be at least 10 characters' };
  }
  if (type === 'clip' && (!videoUrl || !videoUrl.trim())) {
    return { valid: false, error: 'Clips need a video URL' };
  }
  if (type === 'card' && (!Array.isArray(slides) || slides.length < 1)) {
    return { valid: false, error: 'Cards need at least one slide' };
  }
  return { valid: true };
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .trim();
}

module.exports = {
  validateEmail,
  validatePassword,
  validateDisplayName,
  validatePost,
  sanitizeInput
};