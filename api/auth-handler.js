const { applyCors } = require('./_lib/cors');
const handlers = require('./_lib/handlers/auth-handlers');

const ROUTES = {
  signin: handlers.signin,
  signup: handlers.signup,
  signout: handlers.signout,
  verify: handlers.verify,
  'reset-password': handlers.resetPassword,
};

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;

  // Reached via the rewrite in vercel.json: /api/auth/:action ->
  // /api/auth-handler?action=:action — action always arrives as a plain
  // query string value here (not an array), since it's a rewrite param,
  // not a Vercel catch-all-route segment array.
  const action = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action;
  const handler = ROUTES[action];

  if (!handler) {
    return res.status(404).json({ error: 'Not found' });
  }

  return handler(req, res);
};
