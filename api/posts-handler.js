const { applyCors } = require('./_lib/cors');
const handlers = require('./_lib/handlers/posts-handlers');

const ROUTES = {
  create: handlers.create,
  feed: handlers.feed,
};

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;

  const action = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action;
  const handler = ROUTES[action];

  if (!handler) {
    return res.status(404).json({ error: 'Not found' });
  }

  return handler(req, res);
};
