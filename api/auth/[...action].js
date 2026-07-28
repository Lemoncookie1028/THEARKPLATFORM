const { applyCors } = require('../_lib/cors');
const handlers = require('../_lib/handlers/auth-handlers');

const ROUTES = {
  signin: handlers.signin,
  signup: handlers.signup,
  signout: handlers.signout,
  verify: handlers.verify,
  'reset-password': handlers.resetPassword,
};

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;

  // Vercel's catch-all route (api/auth/[...action].js) gives us the path
  // segments after /api/auth/ as an array — e.g. /api/auth/signin -> ['signin']
  const action = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action;
  const handler = ROUTES[action];

  if (!handler) {
    return res.status(404).json({ error: 'Not found' });
  }

  return handler(req, res);
};
